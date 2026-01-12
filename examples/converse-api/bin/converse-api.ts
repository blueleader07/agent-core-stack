#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { ConverseApiStack } from '../lib/converse-api-stack';
import * as path from 'path';

// Load environment variables from root .env file
config({ path: path.join(__dirname, '../../../.env') });

const app = new cdk.App();
new ConverseApiStack(app, 'BedrockConverseApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Bedrock Converse API - Direct model calls with streaming',
});
