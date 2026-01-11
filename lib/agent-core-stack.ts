import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';

export class AgentCoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM Role for Bedrock Agent
    const agentRole = new iam.Role(this, 'BedrockAgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock Agent to invoke models',
    });

    // Grant permissions to invoke Claude models
    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
      ],
    }));

    // Create Bedrock Agent
    const agent = new bedrock.CfnAgent(this, 'ArticleAgent', {
      agentName: 'article-reading-agent',
      agentResourceRoleArn: agentRole.roleArn,
      foundationModel: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
      instruction: `You are an AI assistant that helps analyze articles and generate social media content.

Your capabilities:
- Read and analyze article URLs
- Extract key insights and themes
- Generate engaging social media posts
- Provide research and context

When a user asks you to read an article, analyze it thoroughly and provide:
1. Main themes and key points
2. Notable statistics or quotes
3. Potential angles for social media content

Be conversational, insightful, and helpful.`,
      description: 'Agent for reading articles and generating social media content',
      idleSessionTtlInSeconds: 600,
    });

    // Create Agent Alias (required for invocation)
    const agentAlias = new bedrock.CfnAgentAlias(this, 'ArticleAgentAlias', {
      agentId: agent.attrAgentId,
      agentAliasName: 'production',
      description: 'Production alias for Article Agent',
    });

    // Firebase Auth Lambda Authorizer
    const authorizerFunction = new lambda.Function(this, 'FirebaseAuthorizer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/authorizer'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
      },
    });

    // WebSocket Lambda for streaming agent responses
    const wsAgentFunction = new lambda.Function(this, 'WebSocketAgentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/websocket-agent'),
      timeout: cdk.Duration.minutes(15), // WebSocket supports up to 15 min
      environment: {
        NODE_ENV: 'production',
        BEDROCK_AGENT_ID: agent.attrAgentId,
        BEDROCK_AGENT_ALIAS_ID: agentAlias.attrAgentAliasId,
      },
    });

    // Grant WebSocket Lambda permission to invoke Bedrock Agent
    wsAgentFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeAgent',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:agent-alias/${agent.attrAgentId}/${agentAlias.attrAgentAliasId}`,
      ],
    }));

    // WebSocket API for streaming
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'AgentWebSocketApi', {
      apiName: 'Agent WebSocket API',
      description: 'WebSocket API for streaming agent responses with Firebase auth',
      connectRouteOptions: {
        authorizer: new WebSocketLambdaAuthorizer('WebSocketAuthorizer', authorizerFunction, {
          identitySource: ['route.request.querystring.token'],
        }),
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          wsAgentFunction
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          wsAgentFunction
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DefaultIntegration',
          wsAgentFunction
        ),
      },
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant permissions for Lambda to manage WebSocket connections
    wsAgentFunction.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`,
      ],
    }));

    // Output the WebSocket URL
    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: webSocketStage.url,
      description: 'WebSocket URL for Agent API (supports streaming)',
    });

    // Output Bedrock Agent details
    new cdk.CfnOutput(this, 'BedrockAgentId', {
      value: agent.attrAgentId,
      description: 'Bedrock Agent ID',
    });

    new cdk.CfnOutput(this, 'BedrockAgentAliasId', {
      value: agentAlias.attrAgentAliasId,
      description: 'Bedrock Agent Alias ID',
    });
  }
}
