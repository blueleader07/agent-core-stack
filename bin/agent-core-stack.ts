#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { AgentCoreStack } from '../lib/agent-core-stack';

// Load environment variables from .env file
config();

const app = new cdk.App();
new AgentCoreStack(app, 'AgentCoreStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Agent Core Infrastructure Stack',
});
