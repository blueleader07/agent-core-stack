/**
 * AgentCore Proxy Stack
 * 
 * Deploys a WebSocket Lambda that PROXIES to the real AgentCore Runtime.
 * This ensures CloudWatch AgentCore metrics are populated.
 * 
 * Flow: WebSocket → Proxy Lambda → AgentCore Runtime → Container → Response
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';
import * as path from 'path';

interface AgentCoreProxyStackProps extends cdk.StackProps {
  /**
   * The ARN of the AgentCore Runtime to proxy to.
   * If not provided, will import from 'AgentCoreRuntimeArn' export.
   */
  agentCoreRuntimeArn?: string;
}

export class AgentCoreProxyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AgentCoreProxyStackProps) {
    super(scope, id, props);

    // Get AgentCore Runtime ARN from props or import from other stack
    const agentCoreRuntimeArn = props?.agentCoreRuntimeArn 
      || cdk.Fn.importValue('AgentCoreRuntimeArn');

    // Import shared Cognito authorizer function
    const authorizerFunctionArn = cdk.Fn.importValue('SharedAuthorizerFunctionArn');
    const authorizerFunction = lambda.Function.fromFunctionArn(
      this,
      'SharedAuthorizerFunction',
      authorizerFunctionArn
    );

    // ==========================================================================
    // Proxy Lambda - Invokes Real AgentCore Runtime
    // ==========================================================================
    
    const proxyFunction = new NodejsFunction(this, 'AgentCoreProxyFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/agentcore-handler/index-proxy.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: [
          // Don't externalize AWS SDK - we need @aws-sdk/client-bedrock-agentcore
          // which may not be in Lambda runtime yet
        ],
      },
      environment: {
        NODE_ENV: 'production',
        AGENTCORE_RUNTIME_ARN: agentCoreRuntimeArn.toString(),
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ==========================================================================
    // IAM Permissions for Proxy Lambda
    // ==========================================================================

    // Permission to invoke AgentCore Runtime
    proxyFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock-agentcore:InvokeAgentRuntime',
      ],
      resources: [
        // Allow invoking any AgentCore runtime in this account
        `arn:aws:bedrock-agentcore:${this.region}:${this.account}:runtime/*`,
      ],
    }));

    // CloudWatch Logs and X-Ray
    proxyFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords',
      ],
      resources: ['*'],
    }));

    // ==========================================================================
    // WebSocket API for Proxy
    // ==========================================================================

    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'AgentCoreProxyWebSocketApi', {
      apiName: 'AgentCore Proxy WebSocket',
      description: 'WebSocket API that proxies to real AgentCore Runtime (for CloudWatch metrics)',
      connectRouteOptions: {
        authorizer: new WebSocketLambdaAuthorizer('WebSocketAuthorizer', authorizerFunction, {
          identitySource: ['route.request.querystring.token'],
        }),
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          proxyFunction
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          proxyFunction
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DefaultIntegration',
          proxyFunction
        ),
      },
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant permissions for Lambda to manage WebSocket connections
    proxyFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`,
      ],
    }));

    // ==========================================================================
    // Outputs
    // ==========================================================================

    new cdk.CfnOutput(this, 'AgentCoreProxyWebSocketUrl', {
      value: webSocketStage.url,
      description: 'WebSocket URL for AgentCore Proxy (invokes real AgentCore Runtime)',
      exportName: 'AgentCoreProxyWebSocketUrl',
    });

    new cdk.CfnOutput(this, 'AgentCoreProxyFunctionArn', {
      value: proxyFunction.functionArn,
      description: 'AgentCore Proxy Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'TargetAgentCoreRuntimeArn', {
      value: agentCoreRuntimeArn.toString(),
      description: 'The AgentCore Runtime ARN being proxied to',
    });
  }
}
