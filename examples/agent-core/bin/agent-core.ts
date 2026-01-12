#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { AgentCoreStack } from '../lib/agent-core-stack';
import * as path from 'path';

// Load environment variables from root .env file
config({ path: path.join(__dirname, '../../../.env') });

const app = new cdk.App();
new AgentCoreStack(app, 'BedrockAgentCoreStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Bedrock Agent Core - Full agent with action groups',
});
