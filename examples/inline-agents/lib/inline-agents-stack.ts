import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';
import * as path from 'path';

export class InlineAgentsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Firebase Auth Lambda Authorizer (from shared)
    const authorizerFunction = new lambda.Function(this, 'FirebaseAuthorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../shared/auth/firebase-authorizer')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
      },
    });

    // Inline Agent Lambda with Bedrock Converse API
    const inlineAgentFunction = new NodejsFunction(this, 'InlineAgentFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/inline-agent/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      bundling: {
        minify: false,
        sourceMap: true,
      },
    });

    // Grant Bedrock permissions
    inlineAgentFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // WebSocket API for streaming
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'InlineAgentWebSocketApi', {
      apiName: 'Inline Agent WebSocket API',
      description: 'WebSocket API for inline agents with tool calling',
      connectRouteOptions: {
        authorizer: new WebSocketLambdaAuthorizer('WebSocketAuthorizer', authorizerFunction, {
          identitySource: ['route.request.querystring.token'],
        }),
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          inlineAgentFunction
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          inlineAgentFunction
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DefaultIntegration',
          inlineAgentFunction
        ),
      },
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant permissions for Lambda to manage WebSocket connections
    inlineAgentFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`,
      ],
    }));

    // Outputs
    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: webSocketStage.url,
      description: 'WebSocket URL for Inline Agent API',
    });

    new cdk.CfnOutput(this, 'InlineAgentFunctionName', {
      value: inlineAgentFunction.functionName,
      description: 'Inline Agent Lambda function name',
    });
  }
}
