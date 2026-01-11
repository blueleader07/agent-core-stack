# Active Context

## Current Focus
**Production deployment complete** - Hybrid Firebase + AWS architecture operational

## Recent Accomplishments (Jan 10-11, 2026)
- ✅ Created CDK project structure with TypeScript
- ✅ Configured AWS CLI with IAM user credentials (cdk-deploy-user)
- ✅ Bootstrapped CDK in AWS account 991551400024 (us-east-1)
- ✅ Resolved fsevents/node-gyp installation hang with `--no-optional --ignore-scripts`
- ✅ Implemented WebSocket API with 15-minute timeout
- ✅ Integrated Firebase Authentication via Lambda authorizer
- ✅ Created Bedrock Agent with Claude Sonnet 4.5
- ✅ Built React AgentChat component with streaming UI
- ✅ Fixed session ID sanitization for Bedrock validation
- ✅ Corrected model identifier to anthropic.claude-sonnet-4-5-20250929-v1:0
- ✅ Deployed full stack to production
- ✅ Published to GitHub: blueleader07/agent-core-stack
- ✅ Comprehensive README and memory bank documentation

## Active Decisions

### Technology Choices
- **CDK over CloudFormation**: TypeScript provides better IDE support and type safety
- **us-east-1**: Primary region for development (Bedrock Agent availability)
- **IAM User over SSO**: Simpler for single-developer setup
- **npm install flags**: Always use `--no-optional --ignore-scripts` to avoid node-gyp hang
- **Hybrid Architecture**: Firebase (auth + hosting) + AWS (AI + API)
- **WebSocket over REST**: 15-minute timeout vs 29-second limit for streaming
- **Claude Sonnet 4.5**: Latest model with best performance
- **Docker**: Required for bundling firebase-admin in Lambda layers

### Architecture Patterns
- **Authentication Flow**: Firebase JWT → Lambda authorizer → WebSocket connection
- **Streaming Pattern**: Bedrock Agent → Lambda → WebSocket → React UI
- **Session Management**: WebSocket connection ID (sanitized) as Bedrock session ID
- **Error Handling**: CloudWatch logs for debugging, user-friendly messages in UI
- **Security**: Firebase credentials in .env (gitignored), no secrets in code

## Production Environment

### Deployed Resources
```
Bedrock Agent:    LXSRZEOSMV (alias: BOA3402NJR)
Model:            anthropic.claude-sonnet-4-5-20250929-v1:0
WebSocket API:    wss://x7ptukdese.execute-api.us-east-1.amazonaws.com/prod
Frontend:         https://automation-station-e3361.web.app
Repository:       https://github.com/blueleader07/agent-core-stack
```

### Key Files
```
lib/agent-core-stack.ts              # Bedrock Agent + WebSocket API + Authorizer
lambda/authorizer/index.ts           # Firebase JWT validation
lambda/websocket-agent/index.ts      # Bedrock Agent invocation with streaming
web/src/components/AgentChat.tsx     # React chat interface
.env                                 # Firebase credentials (gitignored)
```

## Next Steps
1. **Monitor production** - Check CloudWatch logs for errors
2. **Enhance agent** - Add action groups for article reading
3. **Add knowledge base** - Implement RAG for article history
4. **Persistent storage** - DynamoDB for conversation history
5. **Testing** - Jest tests for Lambda functions
6. **CI/CD** - GitHub Actions for deployments

## Blockers
None currently. Stack is deployed and ready for resource addition.

## Important Context

### npm Install Issue
**Problem**: `fsevents@2.3.2` package hangs during `node-gyp rebuild` on macOS
**Solution**: Always use `npm install --no-optional --ignore-scripts`
**Impact**: Cannot use standard `npm install` command

### AWS Account Details
- **Account ID**: 991551400024
- **Region**: us-east-1
- **IAM User**: cdk-deploy-user (AdministratorAccess)
- **CDK Bootstrapped**: Yes (CDKToolkit stack deployed)

### Stack Details
- **Stack Name**: AgentCoreStack
- **ARN**: arn:aws:cloudformation:us-east-1:991551400024:stack/AgentCoreStack/...
- **Status**: Deployed (empty, just metadata)
- **Deployment Time**: ~13 seconds

## Related Projects
- **social-media-draft-agent**: Firebase-based article processing system
  - May migrate some functionality to AWS Lambda
  - Could benefit from AWS infrastructure (S3, DynamoDB, SQS)
