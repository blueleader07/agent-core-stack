import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { Construct } from 'constructs';
import * as path from 'path';

export class BedrockAgentsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM Role for Bedrock Agent
    const agentRole = new iam.Role(this, 'BedrockAgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock Agent to invoke models',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
    });

    // Add AWS Marketplace permissions for Claude Sonnet 4.5
    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'aws-marketplace:ViewSubscriptions',
        'aws-marketplace:Subscribe',
      ],
      resources: ['*'],
    }));

    // Lambda function for URL fetching Action Group  
    const urlFetcherFunction = new NodejsFunction(this, 'UrlFetcherFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/url-fetcher/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      bundling: {
        minify: false,
        sourceMap: true,
      },
    });

    // Grant agent role permission to invoke the URL fetcher Lambda
    urlFetcherFunction.grantInvoke(agentRole);

    // Also grant bedrock service permission with source conditions
    urlFetcherFunction.grantInvoke(new iam.ServicePrincipal('bedrock.amazonaws.com', {
      conditions: {
        StringEquals: {
          'aws:SourceAccount': this.account,
        },
        ArnLike: {
          'aws:SourceArn': `arn:aws:bedrock:${this.region}:${this.account}:agent/*`,
        },
      },
    }));

    // Create Bedrock Agent (Traditional Infrastructure Pattern)
    const agent = new bedrock.CfnAgent(this, 'ArticleAgent', {
      agentName: 'bedrock-agents-article-reader',
      agentResourceRoleArn: agentRole.roleArn,
      foundationModel: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      instruction: `You are an AI assistant that helps analyze articles and generate social media content.

When a user provides a URL, use the fetch_url tool to retrieve the article content, then analyze it.

Your capabilities:
- Read and analyze article URLs using the fetch_url tool
- Extract key insights and themes
- Generate engaging social media posts
- Provide research and context

When analyzing articles, provide:
1. Main themes and key points
2. Notable statistics or quotes
3. Potential angles for social media content

Be conversational, insightful, and helpful.`,
      description: 'Agent for reading articles and generating social media content',
      idleSessionTtlInSeconds: 600,
      actionGroups: [{
        actionGroupName: 'url-fetcher',
        description: 'Fetches and extracts content from article URLs',
        actionGroupExecutor: {
          lambda: urlFetcherFunction.functionArn,
        },
        apiSchema: {
          payload: JSON.stringify({
            openapi: '3.0.0',
            info: {
              title: 'URL Fetcher API',
              version: '1.0.0',
              description: 'API for fetching article content from URLs',
            },
            paths: {
              '/fetch-url': {
                post: {
                  summary: 'Fetch article content from a URL',
                  description: 'Downloads and extracts readable article content from the provided URL',
                  operationId: 'fetchUrl',
                  requestBody: {
                    required: true,
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            url: {
                              type: 'string',
                              description: 'The URL of the article to fetch',
                            },
                          },
                          required: ['url'],
                        },
                      },
                    },
                  },
                  responses: {
                    '200': {
                      description: 'Article content successfully retrieved',
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              url: { type: 'string' },
                              title: { type: 'string' },
                              byline: { type: 'string' },
                              excerpt: { type: 'string' },
                              content: { type: 'string' },
                              publishedTime: { type: 'string' },
                              siteName: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
      }],
    });

    // Create Agent Alias (required for invocation)
    const agentAlias = new bedrock.CfnAgentAlias(this, 'ArticleAgentAlias', {
      agentId: agent.attrAgentId,
      agentAliasName: 'production-v9',
      description: 'Production alias for Article Agent with Claude 4.5 Sonnet',
    });

    // Import shared Cognito authorizer function from CloudFormation exports
    const authorizerFunctionArn = cdk.Fn.importValue('SharedAuthorizerFunctionArn');
    const authorizerFunction = lambda.Function.fromFunctionArn(
      this,
      'SharedAuthorizerFunction',
      authorizerFunctionArn
    );

    // Agent Lambda
    const wsAgentFunction = new lambda.Function(this, 'WebSocketAgentFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/websocket-agent')),
      timeout: cdk.Duration.minutes(15),
      environment: {
        NODE_ENV: 'production',
        BEDROCK_AGENT_ID: agent.attrAgentId,
        BEDROCK_AGENT_ALIAS_ID: agentAlias.attrAgentAliasId,
      },
    });

    // Grant WebSocket Lambda permission to invoke Bedrock Agent
    wsAgentFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock-agent-runtime:InvokeAgent',
        'bedrock:InvokeAgent',
      ],
      resources: ['*'],
    }));

    // WebSocket API for streaming
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'AgentWebSocketApi', {
      apiName: 'Agent Core WebSocket',
      description: 'WebSocket API for streaming agent responses with Cognito auth',
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
