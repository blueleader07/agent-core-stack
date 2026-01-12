#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../stacks/cognito-stack';
import { config } from 'dotenv';
import * as path from 'path';

// Load .env from project root
config({ path: path.join(__dirname, '../../.env') });

const app = new cdk.App();

new CognitoStack(app, 'BedrockSharedCognitoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
