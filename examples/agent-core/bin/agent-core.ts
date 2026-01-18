#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { AgentCoreStack } from '../lib/agent-core-stack';
import { AgentCoreRuntimeStack } from '../lib/agentcore-runtime-stack';
import { AgentCoreProxyStack } from '../lib/agentcore-proxy-stack';
import * as path from 'path';

// Load environment variables from root .env file
config({ path: path.join(__dirname, '../../../.env') });

const app = new cdk.App();

// Original Lambda-based stack (Pattern 4 workaround - runs LangGraph directly)
new AgentCoreStack(app, 'BedrockAgentCoreStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Bedrock Agent Core - Lambda with LangGraph (WebSocket) - Direct Bedrock calls',
});

// Real AgentCore Runtime Stack (containerized)
new AgentCoreRuntimeStack(app, 'RealAgentCoreRuntimeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Real AWS Bedrock AgentCore Runtime with LangGraph container',
});

// NEW: Proxy Lambda Stack (invokes AgentCore Runtime for CloudWatch metrics)
new AgentCoreProxyStack(app, 'AgentCoreProxyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'WebSocket Lambda that proxies to AgentCore Runtime (for CloudWatch metrics)',
});
