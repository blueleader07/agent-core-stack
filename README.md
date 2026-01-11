# Agent Core Stack

AWS CDK Infrastructure for Agent Core services.

## Setup

Install dependencies (skip optional packages to avoid node-gyp hang):

```bash
npm install --no-optional
```

## Useful Commands

* `npm run build`   - Compile TypeScript to JavaScript
* `npm run watch`   - Watch for changes and compile
* `npm run cdk deploy` - Deploy this stack to your default AWS account/region
* `npm run cdk diff`   - Compare deployed stack with current state
* `npm run cdk synth`  - Emit the synthesized CloudFormation template

## Deploy

Make sure your AWS credentials are configured:

```bash
aws configure
```

Bootstrap CDK (first time only):

```bash
npx cdk bootstrap
```

Deploy the stack:

```bash
npm run build
npm run cdk deploy
```

## Stack Structure

- `bin/agent-core-stack.ts` - CDK app entry point
- `lib/agent-core-stack.ts` - Empty stack (add resources here)
