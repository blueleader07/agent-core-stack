#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebUIStack } from './web-ui-stack';

const app = new cdk.App();

new WebUIStack(app, 'BedrockExamplesWebUI', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
