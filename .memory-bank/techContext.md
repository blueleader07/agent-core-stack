# Technical Context

## Technology Stack

### Infrastructure
- **AWS CDK**: 2.149.0
- **AWS CDK Lib**: 2.149.0
- **Constructs**: ^10.0.0

### Language & Runtime
- **TypeScript**: 5.2.2
- **Node.js**: 18+ (via Homebrew)
- **Target**: ES2020

### Build Tools
- **TypeScript Compiler**: tsc
- **ts-node**: ^10.9.1 (for running .ts files directly)
- **Jest**: ^29.7.0 (testing framework, not yet used)

### AWS Services (Deployed)
- **CloudFormation**: Stack management
- **S3**: CDK bootstrap bucket (cdk-*)
- **IAM**: CDK execution roles

### AWS Services (Planned)
- Lambda (compute)
- S3 (storage)
- DynamoDB (database)
- SQS (queuing)
- SNS (notifications)
- EventBridge (event routing)
- CloudWatch (logging/monitoring)

## Development Environment

### Local Setup
- **OS**: macOS (Apple Silicon M4)
- **Shell**: zsh
- **Package Manager**: npm (not yarn)
- **AWS CLI**: v2.32.32 (installed via Homebrew)

### AWS Configuration
- **Account ID**: 991551400024
- **Region**: us-east-1
- **IAM User**: cdk-deploy-user
- **Permissions**: AdministratorAccess (development only)
- **Credentials**: Stored in `~/.aws/credentials`

## Configuration Files

### package.json
```json
{
  "name": "agent-core-stack",
  "version": "0.1.0",
  "bin": {
    "agent-core-stack": "bin/agent-core-stack.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "cdk": "cdk",
    "deploy": "cdk deploy",
    "diff": "cdk diff",
    "synth": "cdk synth"
  }
}
```

### tsconfig.json
- **Target**: ES2020
- **Module**: commonjs
- **Strict mode**: enabled
- **esModuleInterop**: true
- **skipLibCheck**: true
- **resolveJsonModule**: true

### cdk.json
- **App**: `npx ts-node --prefer-ts-exts bin/agent-core-stack.ts`
- **Context**: Standard CDK feature flags for latest best practices

## Build Process

### Compilation
```bash
npm run build
# Compiles: bin/*.ts + lib/*.ts → bin/*.js + lib/*.js
# Output: JavaScript files alongside TypeScript sources
```

### Deployment
```bash
npm run cdk deploy
# 1. Runs TypeScript compiler (if needed)
# 2. Synthesizes CloudFormation template
# 3. Uploads assets to CDK bootstrap bucket
# 4. Creates/updates CloudFormation stack
# 5. Waits for completion
```

## Dependencies

### Production Dependencies
```json
{
  "aws-cdk-lib": "2.149.0",
  "constructs": "^10.0.0",
  "source-map-support": "^0.5.21"
}
```

### Development Dependencies
```json
{
  "@types/jest": "^29.5.5",
  "@types/node": "20.8.9",
  "jest": "^29.7.0",
  "ts-jest": "^29.1.1",
  "aws-cdk": "2.149.0",
  "ts-node": "^10.9.1",
  "typescript": "~5.2.2"
}
```

## Known Issues

### npm Install Hanging
**Problem**: `fsevents@2.3.2` package hangs during `node-gyp rebuild`
**Root Cause**: Optional macOS file system monitoring dependency
**Solution**: 
```bash
npm install --no-optional --ignore-scripts
```
**Impact**: No file watching features (acceptable for CDK project)

### CDK Version Notices
- CLI versions diverged from library versions (normal after CDK 2.179.0)
- Telemetry collection starting in 2.1100.0 (can opt-out)
- No action required, notices are informational

## Environment Variables

### Required
- `AWS_ACCESS_KEY_ID`: Set via `aws configure`
- `AWS_SECRET_ACCESS_KEY`: Set via `aws configure`
- `AWS_DEFAULT_REGION`: us-east-1

### Optional
- `CDK_DEFAULT_ACCOUNT`: Auto-detected from AWS credentials
- `CDK_DEFAULT_REGION`: Auto-detected from AWS config

## File Structure

```
agent-core-stack/
├── bin/
│   └── agent-core-stack.ts     # CDK app entry point
├── lib/
│   └── agent-core-stack.ts     # Stack definition
├── node_modules/               # Dependencies
├── .gitignore                  # Git ignore patterns
├── cdk.json                    # CDK configuration
├── package.json                # npm configuration
├── tsconfig.json               # TypeScript configuration
├── README.md                   # Project documentation
└── .memory-bank/               # Project context
    ├── projectBrief.md
    ├── productContext.md
    ├── activeContext.md
    ├── systemPatterns.md
    ├── techContext.md (this file)
    ├── progress.md
    └── developmentGuide.md
```

## Excluded Files (.gitignore)
```
*.js        # Compiled JavaScript
*.d.ts      # TypeScript declarations
node_modules/
cdk.out/    # CDK synth output
.env        # Secrets (not used yet)
```

## Deployment Artifacts

### CDK Bootstrap Stack
- **Stack Name**: CDKToolkit
- **S3 Bucket**: cdk-hnb659fds-assets-991551400024-us-east-1
- **IAM Roles**: CloudFormation execution role, file publishing role
- **Purpose**: Stores CDK assets (Lambda code, Docker images, large templates)

### Application Stack
- **Stack Name**: AgentCoreStack
- **Status**: Deployed (empty)
- **Resources**: CDKMetadata only (currently)
- **Purpose**: Application infrastructure (resources to be added)

## CI/CD (Future)
Not implemented yet. Manual deployment via `npm run cdk deploy`.

**Planned**:
- GitHub Actions workflow
- Automated tests on PR
- Auto-deploy on merge to main
- Separate dev/staging/prod environments
