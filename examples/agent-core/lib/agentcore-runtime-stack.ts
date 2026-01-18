/**
 * AWS Bedrock AgentCore Runtime CDK Stack
 * 
 * Deploys a real AgentCore Runtime with:
 * - ECR repository for container images
 * - Docker image build and push
 * - AWS::BedrockAgentCore::Runtime resource
 * - AWS::BedrockAgentCore::RuntimeEndpoint resource
 * 
 * This is the REAL AgentCore service, not a Lambda workaround.
 */

import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import * as path from 'path';

export class AgentCoreRuntimeStack extends cdk.Stack {
  public readonly runtimeArn: string;
  public readonly endpointUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================================================
    // ECR Repository for AgentCore Container
    // ==========================================================================
    
    const repository = new ecr.Repository(this, 'AgentCoreRepository', {
      repositoryName: 'agentcore-langgraph-runtime',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 5,
          description: 'Keep only 5 images',
        },
      ],
    });

    // ==========================================================================
    // Docker Image Asset (builds and pushes to ECR)
    // ==========================================================================
    
    const dockerImage = new ecr_assets.DockerImageAsset(this, 'AgentCoreImage', {
      directory: path.join(__dirname, '../container'),
      platform: ecr_assets.Platform.LINUX_ARM64,
      buildArgs: {
        NODE_ENV: 'production',
      },
    });

    // ==========================================================================
    // IAM Role for AgentCore Runtime
    // ==========================================================================
    
    const agentCoreRole = new iam.Role(this, 'AgentCoreRuntimeRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      ),
      description: 'IAM role for AgentCore Runtime to access AWS services',
      // Inline policy to ensure it's created with the role
      inlinePolicies: {
        'AgentCoreRuntimePolicy': new iam.PolicyDocument({
          statements: [
            // Allow AgentCore to invoke Bedrock models
            new iam.PolicyStatement({
              sid: 'BedrockModelInvocation',
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: [
                'arn:aws:bedrock:*::foundation-model/*',
                `arn:aws:bedrock:${this.region}:${this.account}:*`,
              ],
            }),
            // Workload Identity - CRITICAL for container to get credentials
            new iam.PolicyStatement({
              sid: 'GetAgentAccessToken',
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock-agentcore:GetWorkloadAccessToken',
                'bedrock-agentcore:GetWorkloadAccessTokenForJwt',
                'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
              ],
              resources: [
                `arn:aws:bedrock-agentcore:${this.region}:${this.account}:workload-identity-directory/default`,
                `arn:aws:bedrock-agentcore:${this.region}:${this.account}:workload-identity-directory/default/workload-identity/*`,
              ],
            }),
            // Allow AgentCore to pull container images from ANY ECR repository
            new iam.PolicyStatement({
              sid: 'ECRImageAccess',
              effect: iam.Effect.ALLOW,
              actions: [
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:BatchCheckLayerAvailability',
              ],
              resources: [`arn:aws:ecr:${this.region}:${this.account}:repository/*`],
            }),
            new iam.PolicyStatement({
              sid: 'ECRTokenAccess',
              effect: iam.Effect.ALLOW,
              actions: ['ecr:GetAuthorizationToken'],
              resources: ['*'],
            }),
            // Allow CloudWatch Logs
            new iam.PolicyStatement({
              sid: 'CloudWatchLogs',
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:DescribeLogStreams',
                'logs:CreateLogGroup',
                'logs:DescribeLogGroups',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/bedrock-agentcore/runtimes/*`],
            }),
            // X-Ray tracing
            new iam.PolicyStatement({
              sid: 'XRayTracing',
              effect: iam.Effect.ALLOW,
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
                'xray:GetSamplingRules',
                'xray:GetSamplingTargets',
              ],
              resources: ['*'],
            }),
            // CloudWatch Metrics
            new iam.PolicyStatement({
              sid: 'CloudWatchMetrics',
              effect: iam.Effect.ALLOW,
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*'],
              conditions: {
                'StringEquals': {
                  'cloudwatch:namespace': 'bedrock-agentcore',
                },
              },
            }),
          ],
        }),
      },
    });

    // ==========================================================================
    // AWS::BedrockAgentCore::Runtime (using CfnResource)
    // ==========================================================================
    
    const agentCoreRuntime = new cdk.CfnResource(this, 'AgentCoreRuntime', {
      type: 'AWS::BedrockAgentCore::Runtime',
      properties: {
        AgentRuntimeName: 'langgraph_agent_runtime',
        Description: 'LangGraph agent runtime with read_article tool deployed on real AgentCore service',
        RoleArn: agentCoreRole.roleArn,
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: dockerImage.imageUri,
          },
        },
        NetworkConfiguration: {
          NetworkMode: 'PUBLIC',
        },
        ProtocolConfiguration: 'HTTP',
        EnvironmentVariables: {
          MODEL_ID: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
          AWS_REGION: this.region,
        },
      },
    });

    // Ensure role is created before runtime
    agentCoreRuntime.addDependency(agentCoreRole.node.defaultChild as cdk.CfnResource);

    // ==========================================================================
    // AWS::BedrockAgentCore::RuntimeEndpoint (using CfnResource)
    // ==========================================================================
    
    const agentCoreEndpoint = new cdk.CfnResource(this, 'AgentCoreRuntimeEndpoint', {
      type: 'AWS::BedrockAgentCore::RuntimeEndpoint',
      properties: {
        AgentRuntimeId: agentCoreRuntime.getAtt('AgentRuntimeId'),
        Name: 'langgraph_agent_endpoint',
        Description: 'HTTP endpoint for LangGraph agent runtime',
      },
    });

    // Ensure runtime is created before endpoint
    agentCoreEndpoint.addDependency(agentCoreRuntime);

    // ==========================================================================
    // Outputs
    // ==========================================================================
    
    new cdk.CfnOutput(this, 'AgentCoreRuntimeArn', {
      value: agentCoreRuntime.getAtt('AgentRuntimeArn').toString(),
      description: 'ARN of the AgentCore Runtime',
      exportName: 'AgentCoreRuntimeArn',
    });

    new cdk.CfnOutput(this, 'AgentCoreRuntimeId', {
      value: agentCoreRuntime.getAtt('AgentRuntimeId').toString(),
      description: 'ID of the AgentCore Runtime',
      exportName: 'AgentCoreRuntimeId',
    });

    new cdk.CfnOutput(this, 'AgentCoreRuntimeStatus', {
      value: agentCoreRuntime.getAtt('Status').toString(),
      description: 'Status of the AgentCore Runtime',
    });

    new cdk.CfnOutput(this, 'ECRRepositoryUri', {
      value: dockerImage.imageUri,
      description: 'ECR image URI for the AgentCore container',
    });

    new cdk.CfnOutput(this, 'AgentCoreRoleArn', {
      value: agentCoreRole.roleArn,
      description: 'IAM Role ARN for AgentCore Runtime',
    });
  }
}
