# Active Context

## Current Focus
**AgentCore Runtime integration complete** - 5 working Bedrock integration patterns operational

## Recent Accomplishments (Jan 18, 2026)

### AgentCore Runtime Implementation
- ✅ Created Lambda proxy to invoke real AWS Bedrock AgentCore Runtime
- ✅ Deployed LangGraph agent in ARM64 Docker container to AgentCore
- ✅ Fixed critical Workload Identity IAM permissions issue for container authentication
- ✅ Resolved SDK response format issue (data in `response.response`, not `response.body`)
- ✅ Implemented token usage tracking in LangGraph container using `usage_metadata`
- ✅ Updated Lambda to forward token usage in Web UI compatible format (flat structure)
- ✅ Renamed UI tabs: "Lambda + LangGraph" and "AgentCore + LangGraph"
- ✅ Updated README to document all 5 integration patterns
- ✅ Documented Workload Identity requirement in troubleshooting guide
- ✅ All 5 patterns now working with real-time token usage tracking

### Infrastructure Updates
- ✅ Updated .gitignore to exclude build artifacts, package-lock.json, backup files
- ✅ Created agentcore-proxy-stack.ts for Lambda proxy + WebSocket integration
- ✅ Created agentcore-runtime-stack.ts for real AgentCore Runtime deployment
- ✅ Built container with debug logging for token metadata inspection

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
- **LangGraph**: Agent framework for containerized Lambda and AgentCore patterns
- **ARM64 containers**: For AgentCore Runtime compatibility

### Architecture Patterns
- **Authentication Flow**: Firebase JWT → Lambda authorizer → WebSocket connection
- **Streaming Pattern**: Bedrock Agent → Lambda → WebSocket → React UI
- **Session Management**: WebSocket connection ID (sanitized) as Bedrock session ID
- **Error Handling**: CloudWatch logs for debugging, user-friendly messages in UI
- **Security**: Firebase credentials in .env (gitignored), no secrets in code
- **AgentCore Proxy**: Lambda → InvokeAgentRuntimeCommand → AgentCore → Container → Response
- **Token Usage**: LangGraph captures usage_metadata, Lambda flattens for Web UI display

### Critical Learnings
- **Workload Identity**: AgentCore containers MUST have `bedrock-agentcore:GetWorkloadAccessToken*` permissions to authenticate with Bedrock
- **SDK Response Format**: AWS SDK returns data in `response.response` field, not `response.body`
- **Token Metadata**: LangChain stores usage in `usage_metadata` field on AIMessage, not `response_metadata.usage`
- **Web UI Format**: Token usage must be flat `{inputTokens, outputTokens, totalTokens}`, not nested under `usage`

## Production Environment

### Deployed Resources
```
Bedrock Agent:         LXSRZEOSMV (alias: BOA3402NJR)
Model:                 anthropic.claude-sonnet-4-5-20250929-v1:0
WebSocket API:         wss://x7ptukdese.execute-api.us-east-1.amazonaws.com/prod
AgentCore Proxy WS:    wss://cw2u29sd64.execute-api.us-east-1.amazonaws.com/prod
AgentCore Runtime:     langgraph_agent_runtime-TEUJecAs2z (READY)
Frontend:              https://automation-station-e3361.web.app
Repository:            https://github.com/blueleader07/agent-core-stack
```

### Five Working Patterns
1. **Converse API** - Direct Bedrock streaming
2. **Inline Agents** - Lambda-based tool calling
3. **Bedrock Agents** - Infrastructure-managed agents
4. **Lambda + LangGraph** - Containerized Lambda with ADOT
5. **AgentCore + LangGraph** - Real AgentCore Runtime with CloudWatch metrics
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
