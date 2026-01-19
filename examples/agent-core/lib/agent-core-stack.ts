import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';
import * as path from 'path';

export class AgentCoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import shared Cognito authorizer function
    const authorizerFunctionArn = cdk.Fn.importValue('SharedAuthorizerFunctionArn');
    const authorizerFunction = lambda.Function.fromFunctionArn(
      this,
      'SharedAuthorizerFunction',
      authorizerFunctionArn
    );

    // AgentCore Runtime Lambda (containerized approach with ADOT)
    const agentCoreFunction = new NodejsFunction(this, 'AgentCoreRuntimeFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../lambda/agentcore-handler/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048, // Higher memory for AgentCore runtime
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: [
          '@aws-sdk/*', // AWS SDK is available in Lambda runtime
        ],
      },
      environment: {
        NODE_ENV: 'production',
      },
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
    });

    // Grant AgentCore Lambda permissions for Bedrock model invocation
    agentCoreFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/us.anthropic.claude-sonnet-4-20250514-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
        `arn:aws:bedrock:*::foundation-model/*`,
        `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
      ],
    }));

    // Grant CloudWatch Logs and X-Ray permissions for ADOT observability
    agentCoreFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords',
      ],
      resources: ['*'],
    }));

    // WebSocket API for streaming AgentCore responses
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'AgentCoreWebSocketApi', {
      apiName: 'AgentCore Runtime WebSocket',
      description: 'WebSocket API for streaming AgentCore Runtime responses with ADOT observability',
      connectRouteOptions: {
        authorizer: new WebSocketLambdaAuthorizer('WebSocketAuthorizer', authorizerFunction, {
          identitySource: ['route.request.querystring.token'],
        }),
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          agentCoreFunction
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          agentCoreFunction
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DefaultIntegration',
          agentCoreFunction
        ),
      },
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant permissions for Lambda to manage WebSocket connections
    agentCoreFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`,
      ],
    }));

    // Output the WebSocket URL
    new cdk.CfnOutput(this, 'AgentCoreWebSocketUrl', {
      value: webSocketStage.url,
      description: 'WebSocket URL for AgentCore Runtime (supports streaming with ADOT observability)',
    });

    new cdk.CfnOutput(this, 'AgentCoreFunctionArn', {
      value: agentCoreFunction.functionArn,
      description: 'AgentCore Runtime Lambda Function ARN',
    });
  }
}
