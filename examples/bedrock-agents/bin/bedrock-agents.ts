#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { BedrockAgentsStack } from '../lib/bedrock-agents-stack';
import * as path from 'path';

// Load environment variables from root .env file
config({ path: path.join(__dirname, '../../../.env') });

const app = new cdk.App();
new BedrockAgentsStack(app, 'BedrockAgentsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Bedrock Agents - Traditional infrastructure-based agents with action groups',
});
