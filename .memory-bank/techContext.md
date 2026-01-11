# Technical Context

## Technology Stack

### Infrastructure
- **AWS CDK**: 2.149.0
- **AWS CDK Lib**: 2.149.0
- **Constructs**: ^10.0.0
- **dotenv**: 17.2.3 (environment variable management)

### Language & Runtime
- **TypeScript**: 5.2.2
- **Node.js**: 18+ (Lambda runtime and local development)
- **Target**: ES2020

### Build Tools
- **TypeScript Compiler**: tsc
- **ts-node**: ^10.9.1 (for running .ts files directly)
- **Jest**: ^29.7.0 (testing framework, not yet used)
- **Docker Desktop**: Required for Lambda bundling with firebase-admin

### AWS Services (Deployed)
- **Bedrock**: Agent with Claude Sonnet 4.5 (LXSRZEOSMV, alias: BOA3402NJR)
- **API Gateway**: WebSocket API for real-time streaming
- **Lambda**: 2 functions (Firebase authorizer + WebSocket handler)
- **IAM**: Bedrock Agent role, Lambda execution roles
- **CloudFormation**: Stack management (AgentCoreStack)
- **CloudWatch**: Logs for Lambda functions and API Gateway

### Firebase Services (Integrated)
- **Firebase Authentication**: Google OAuth for user authentication
- **Firebase Admin SDK**: 12.0.0 (JWT validation in Lambda)
- **Firebase Hosting**: React app deployment
- **Firestore**: Available (not yet used for conversation history)

### Frontend Stack
- **React**: 19.x with TypeScript
- **Vite**: Build tool for React app
- **Firebase SDK**: 11.x for authentication
- **WebSocket API**: Native browser WebSocket for real-time communication

## Development Environment

### Local Setup
- **OS**: macOS (Apple Silicon M4)
- **Shell**: zsh
- **Package Manager**: npm (not yarn)
- **AWS CLI**: v2.32.32 (installed via Homebrew)
- **Docker Desktop**: For CDK Lambda bundling
- **Git**: Version control with GitHub remote

### AWS Configuration
- **Account ID**: 991551400024
- **Region**: us-east-1 (Bedrock Agent availability)
- **IAM User**: cdk-deploy-user
- **Permissions**: AdministratorAccess (development only)
- **Credentials**: Stored in `~/.aws/credentials`

### Firebase Configuration
- **Project**: automation-station-e3361
- **Service Account**: firebase-adminsdk-fbsvc@automation-station-e3361.iam.gserviceaccount.com
- **Credentials**: .env file (gitignored) with FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

## Configuration Files

### package.json (Root CDK Project)
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
  },
  "dependencies": {
    "aws-cdk-lib": "2.149.0",
    "constructs": "^10.0.0",
    "dotenv": "^17.2.3"
  }
}
```

### lambda/authorizer/package.json
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0"
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

### .env (Gitignored)
```bash
FIREBASE_PROJECT_ID=automation-station-e3361
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@automation-station-e3361.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

## Build Process

### Compilation
```bash
npm run build
# Compiles: bin/*.ts + lib/*.ts → bin/*.js + lib/*.js
# Output: JavaScript files alongside TypeScript sources
# dotenv loads .env file automatically via bin/agent-core-stack.ts
```

### Deployment
```bash
npm run cdk deploy
# 1. Loads .env via dotenv (injecting env (3) from .env)
# 2. Runs TypeScript compiler (if needed)
# 3. Bundles Lambda functions with Docker
#    - Authorizer: includes firebase-admin package
#    - WebSocket: includes @aws-sdk packages
# 4. Synthesizes CloudFormation template
# 5. Uploads assets to CDK bootstrap bucket
# 6. Creates/updates CloudFormation stack
#    - Bedrock Agent resources
#    - Lambda functions
#    - WebSocket API
# 7. Waits for completion (28-95 seconds)
# 8. Outputs: BedrockAgentId, BedrockAgentAliasId, WebSocketUrl
```

## Architecture Patterns

### Hybrid Firebase + AWS
```
[Firebase React App] ──JWT Token──> [API Gateway WebSocket]
                                            │
                                            ├─> [Lambda Authorizer] ──verify──> [Firebase Admin SDK]
                                            │
                                            └─> [WebSocket Lambda] ──invoke──> [Bedrock Agent]
                                                                                      │
                                                                                      └─> [Claude Sonnet 4.5]
```

### Authentication Flow
1. User signs in with Firebase (Google OAuth)
2. React app gets Firebase ID token
3. WebSocket connects with `?token=<firebase-jwt>`
4. Lambda authorizer validates token with Firebase Admin SDK
5. On success, connection is allowed
6. User context (uid, email, name) passed to WebSocket Lambda

### Streaming Flow
1. User sends message via WebSocket
2. Lambda sanitizes connection ID for Bedrock session ID
3. Lambda invokes Bedrock Agent with `InvokeAgentCommand`
4. Agent streams response chunks
5. Lambda forwards chunks to WebSocket connection via `PostToConnectionCommand`
6. React displays streaming text in real-time

### Session Management
- WebSocket connection ID (e.g., `abc123==`) sanitized to `abc123` for Bedrock
- Session ID pattern: `[0-9a-zA-Z._:-]+`
- 15-minute WebSocket timeout (vs 29-second REST API limit)

## API Contracts

### WebSocket Messages

#### Client → Server (invoke-agent)
```json
{
  "action": "invoke-agent",
  "message": "What is this article about?"
}
```

#### Server → Client (stream chunk)
```json
{
  "type": "stream",
  "chunk": "This article discusses...",
  "timestamp": "2026-01-11T12:34:56.789Z"
}
```

#### Server → Client (completion)
```json
{
  "type": "complete",
  "timestamp": "2026-01-11T12:34:58.123Z"
}
```

#### Server → Client (error)
```json
{
  "type": "error",
  "message": "Failed to invoke Bedrock Agent",
  "timestamp": "2026-01-11T12:34:56.789Z"
}
```

### Bedrock Agent Configuration
```typescript
{
  agentName: 'article-reading-agent',
  foundationModel: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  instruction: `You are an AI assistant that helps analyze articles and answer questions about them.
                Be helpful, concise, and accurate in your responses.`,
  idleSessionTTLInSeconds: 600 // 10 minutes
}
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
