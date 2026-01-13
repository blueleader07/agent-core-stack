# Bedrock Agent Core Example

Full AWS Bedrock Agent implementation with action groups, WebSocket streaming, and Firebase authentication.

## What is This?

This example demonstrates a **production-ready Bedrock Agent** using AWS's managed agent service. The agent has:
- 🤖 **Claude Sonnet 4.5** as the foundation model
- 🔧 **Action Groups** for custom tool integrations (URL fetcher)
- 🔐 **Firebase Authentication** for secure access
- ⚡ **WebSocket Streaming** for real-time responses
- 📊 **Built-in memory** and session management

## When to Use This Pattern

✅ **Use Bedrock Agent Core when you need:**
- Multi-step reasoning and orchestration
- Built-in session and memory management
- Multiple action groups/tools working together
- Production-ready agent infrastructure
- AWS-managed agent lifecycle

❌ **Don't use if you need:**
- Rapid iteration on agent logic (use inline-agents)
- Lowest possible latency (use converse-api)
- Fine-grained control over prompts (use inline-agents or converse-api)
- Cost optimization for simple use cases (use converse-api)

## Architecture

```
┌─────────────┐
│ React App   │
│ (Firebase)  │
└──────┬──────┘
       │ JWT Token
       ↓
┌─────────────────┐      ┌──────────────────┐
│ WebSocket API   │─────→│ Lambda           │
│ Gateway         │      │ Authorizer       │
└────────┬────────┘      │ (Firebase)       │
         │               └──────────────────┘
         ↓
┌─────────────────┐      ┌──────────────────┐
│ WebSocket       │─────→│ Bedrock Agent    │
│ Lambda Handler  │      │ Service          │
└─────────────────┘      └────────┬─────────┘
                                  │
                         ┌────────┴─────────┐
                         │                  │
                    ┌────▼────┐      ┌─────▼──────┐
                    │ Claude  │      │ Action     │
                    │ Sonnet  │      │ Group      │
                    │ 4.5     │      │ Lambda     │
                    └─────────┘      └────┬───────┘
                                          │
                                    ┌─────▼──────┐
                                    │ URL        │
                                    │ Fetcher    │
                                    └────────────┘
```

## Features

- ✅ **Full Bedrock Agent** - Managed agent service with orchestration
- ✅ **URL Fetcher Action Group** - Extract article content using Cheerio
- ✅ **WebSocket Streaming** - Real-time response streaming (up to 15 minutes)
- ✅ **Firebase Auth** - Secure JWT-based authentication
- ✅ **Session Management** - Built-in conversation memory
- ✅ **Claude Sonnet 4.5** - Latest Anthropic model via inference profile

## Prerequisites

1. **AWS Account** with Bedrock access
2. **Bedrock Model Access** - Request access to Claude Sonnet 4.5
3. **Firebase Project** - For authentication
4. **Node.js 20+**
5. **AWS CDK** - `npm install -g aws-cdk`

## Setup

### 1. Configure Firebase

Create a `.env` file in the **repository root** (not in this directory):

```bash
# Root: /agent-core-stack/.env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----"
```

Get these credentials from: **Firebase Console > Project Settings > Service Accounts > Generate New Private Key**

### 2. Install Dependencies

```bash
npm install
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Bootstrap CDK (first time only)

```bash
npx cdk bootstrap
```

### 5. Deploy

```bash
npm run deploy
```

**Outputs:**
- `WebSocketUrl` - wss://xxx.execute-api.us-east-1.amazonaws.com/prod
- `BedrockAgentId` - Agent ID for reference
- `BedrockAgentAliasId` - Agent alias ID

## Usage

### Frontend Integration (React/TypeScript)

```typescript
import { auth } from './firebase';

// Get Firebase ID token
const token = await auth.currentUser?.getIdToken();

// Connect to WebSocket
const ws = new WebSocket(`${WS_URL}?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'stream':
      console.log('Agent chunk:', data.chunk);
      break;
    case 'complete':
      console.log('Agent finished');
      break;
    case 'error':
      console.error('Agent error:', data.error);
      break;
  }
};

// Send message to agent
ws.send(JSON.stringify({ 
  action: 'invoke-agent', 
  message: 'Fetch and summarize https://example.com/article' 
}));
```

### Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Get Firebase token (from browser console after login)
# In browser console: await firebase.auth().currentUser.getIdToken()

# Connect
wscat -c "wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod?token=YOUR_TOKEN"

# Send message
> {"action": "invoke-agent", "message": "Tell me about quantum computing"}

# Test URL fetcher
> {"action": "invoke-agent", "message": "Fetch https://aws.amazon.com/bedrock"}
```

## Project Structure

```
examples/agent-core/
├── bin/
│   └── agent-core.ts          # CDK app entry point
├── lib/
│   └── agent-core-stack.ts    # Main CDK stack
├── lambda/
│   ├── websocket-agent/       # WebSocket handler
│   │   └── index.ts
│   └── url-fetcher/           # Action group Lambda
│       ├── index.ts
│       └── package.json
├── package.json
├── cdk.json
├── tsconfig.json
└── README.md
```

## Stack Resources

### Bedrock Agent
- **Model**: `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (inference profile)
- **Instructions**: Article reading and social media content generation
- **Alias**: `production-v9`

### Lambda Functions
1. **FirebaseAuthorizer** - Validates Firebase JWT tokens (from shared)
2. **WebSocketAgentFunction** - Handles WebSocket connections and streams responses
3. **UrlFetcherFunction** - Action group for fetching article content

### API Gateway
- **Type**: WebSocket API
- **Routes**: `$connect`, `$disconnect`, `$default`
- **Authorizer**: Lambda authorizer (Firebase JWT in query string)

## Cost Estimates

**For 1,000 agent conversations (avg 1,000 tokens each):**

| Service | Cost |
|---------|------|
| Bedrock Agent (Claude Sonnet 4.5) | ~$8-10 |
| Lambda executions | ~$0.20 (within free tier) |
| API Gateway WebSocket | ~$0.03 |
| CloudWatch Logs | ~$0.50 |
| **Total** | **~$9-11/month** |

### Tracking Actual Usage

**Note**: The Agent Core API doesn't expose token usage in real-time like the Converse API does. To view actual costs and token usage:

#### Option 1: CloudWatch Metrics (Recommended)

View token usage metrics in the AWS Console:

1. Navigate to **CloudWatch > Metrics > All metrics**
2. Select **AWS/Bedrock** namespace
3. Choose **Agent** metrics
4. Filter by your Agent ID: `1XMKPZ1AMR` (found in stack outputs)
5. Select metrics:
   - `InputTokens` - Tokens sent to the model
   - `OutputTokens` - Tokens generated by the model
   - `Invocations` - Number of agent invocations

**Via AWS CLI:**
```bash
# Get Agent ID from stack outputs
aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack \
  --query 'Stacks[0].Outputs[?OutputKey==`BedrockAgentId`].OutputValue' \
  --output text

# View metrics for the last hour
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InputTokens \
  --dimensions Name=AgentId,Value=1XMKPZ1AMR \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Calculate cost
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name OutputTokens \
  --dimensions Name=AgentId,Value=1XMKPZ1AMR \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

**Cost Calculation:**
- Input tokens: `$3 per million` ($0.000003 per token)
- Output tokens: `$15 per million` ($0.000015 per token)
- Example: 1000 input + 500 output = (1000 × $0.000003) + (500 × $0.000015) = **$0.0105**

#### Option 2: AWS Cost Explorer

1. Go to **AWS Billing > Cost Explorer**
2. Filter by service: **Amazon Bedrock**
3. Group by: **Usage Type**
4. Look for entries containing your Agent ID

**Note**: Metrics may take 5-15 minutes to appear after agent usage.

## Performance

- **First token latency**: 3-5 seconds
- **Streaming**: Real-time chunks
- **Max session**: 15 minutes (WebSocket limit)
- **Concurrency**: Default Lambda limit (1,000 concurrent)

## Troubleshooting

### Agent not responding

Check Lambda logs:
```bash
aws logs tail /aws/lambda/BedrockAgentCoreStack-WebSocketAgentFunction --follow
```

### Authorizer fails

Verify Firebase credentials in CloudWatch:
```bash
aws logs tail /aws/lambda/BedrockAgentCoreStack-FirebaseAuthorizer --since 5m
```

### Model access denied

Request access to Claude Sonnet 4.5:
```bash
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?contains(modelId, `claude-sonnet-4-5`)]'
```

Go to: **AWS Console > Bedrock > Model access** and request access.

### URL fetcher fails

Check action group Lambda logs:
```bash
aws logs tail /aws/lambda/BedrockAgentCoreStack-UrlFetcherFunction --follow
```

## Comparison with Other Patterns

| Feature | Agent Core | Inline Agents | Converse API |
|---------|-----------|---------------|--------------|
| Complexity | High | Medium | Low |
| Latency | 3-5s | 2-3s | 1-2s |
| Cost | Medium | Low | Lowest |
| Flexibility | Medium | High | Highest |
| Setup Time | 15 min | 10 min | 5 min |
| Best For | Production multi-tool workflows | Custom agent logic | Simple chat/Q&A |

## Next Steps

- Explore **inline-agents** example for faster iteration
- Explore **converse-api** example for simplest implementation
- Add more action groups (database, APIs, etc.)
- Implement DynamoDB for persistent session storage
- Add CloudWatch metrics and alarms

## License

MIT
