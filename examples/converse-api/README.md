# Bedrock Converse API Example

Direct Bedrock Converse API calls with WebSocket streaming - the simplest possible pattern.

## What is This?

This example demonstrates **direct Bedrock Converse API usage** - the most straightforward way to use Claude Sonnet 4.5. You have:

- 🎯 **Direct API Calls** - No agents, no orchestration, just model calls
- ⚡ **Lowest Latency** - Direct to model, no intermediate layers
- 💰 **Lowest Cost** - Only pay for API calls
- 🤖 **Claude Sonnet 4.5** - Same model as other examples
- 🔐 **Firebase Auth** - Secure JWT authentication
- 📡 **WebSocket Streaming** - Real-time response streaming

## When to Use This Pattern

✅ **Use Converse API when you need:**
- Simple chat or Q&A functionality
- Lowest possible latency
- Maximum cost efficiency
- Direct control over prompts and parameters
- Rapid prototyping
- Learning Bedrock basics

❌ **Don't use if you need:**
- Tool/function calling (use inline-agents)
- Multi-step workflows (use agent-core or inline-agents)
- Built-in orchestration (use agent-core)

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
┌─────────────────┐
│ Converse Lambda │
│                 │
│  1. Receive msg │
│  2. Call Bedrock│
│  3. Stream back │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Bedrock         │
│ Converse API    │
│ (Claude 4.5)    │
└─────────────────┘
```

**That's it!** No agents, no tools, no complexity.

## Features

- ✅ **Direct Converse API** - Simplest Bedrock integration
- ✅ **Streaming Responses** - Real-time token streaming
- ✅ **Configurable Parameters** - Temperature, max tokens, system prompt
- ✅ **Token Usage Tracking** - See input/output token counts
- ✅ **Claude Sonnet 4.5** - Latest Anthropic model
- ✅ **Minimal Dependencies** - Just Bedrock Runtime SDK

## Prerequisites

1. **AWS Account** with Bedrock access
2. **Bedrock Model Access** - Claude Sonnet 4.5
3. **Firebase Project** - For authentication
4. **Node.js 20+**
5. **AWS CDK** - `npm install -g aws-cdk`

## Setup

### 1. Configure Firebase

Create `.env` file in **repository root**:

```bash
# Root: /agent-core-stack/.env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Deploy

```bash
npm run deploy
```

**Outputs:**
- `WebSocketUrl` - wss://xxx.execute-api.us-east-1.amazonaws.com/prod
- `ConverseFunctionName` - Lambda function name

## Usage

### Frontend Integration (React/TypeScript)

```typescript
const ws = new WebSocket(`${WS_URL}?token=${firebaseToken}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'stream':
      // Model response chunk
      appendToChat(data.chunk);
      break;
      
    case 'complete':
      console.log('Done!', {
        stopReason: data.stopReason,
        tokens: data.totalTokens
      });
      break;
      
    case 'error':
      console.error('Error:', data.error);
      break;
  }
};

// Send message with optional parameters
ws.send(JSON.stringify({ 
  action: 'chat', 
  message: 'Explain quantum computing in simple terms',
  systemPrompt: 'You are a physics teacher. Be clear and concise.',
  temperature: 0.7,
  maxTokens: 1024
}));
```

### Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c "wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod?token=YOUR_FIREBASE_TOKEN"

# Simple chat
> {"action": "chat", "message": "Hello! What can you help me with?"}

# Custom system prompt
> {"action": "chat", "message": "Write a haiku about AWS", "systemPrompt": "You are a poet"}

# Lower temperature for more focused responses
> {"action": "chat", "message": "Explain Bedrock", "temperature": 0.3, "maxTokens": 500}

# Higher temperature for creative responses
> {"action": "chat", "message": "Tell me a story", "temperature": 1.0}
```

## Message Format

### Request

```typescript
{
  action: 'chat',              // Required: 'chat' or 'ping'
  message: string,             // Required: User message
  systemPrompt?: string,       // Optional: Override default system prompt
  temperature?: number,        // Optional: 0.0-1.0 (default: 0.7)
  maxTokens?: number          // Optional: Max response tokens (default: 2048)
}
```

### Response Types

**Streaming chunk:**
```json
{
  "type": "stream",
  "chunk": "Hello! I'm",
  "timestamp": "2024-01-11T21:00:00.000Z"
}
```

**Completion:**
```json
{
  "type": "complete",
  "stopReason": "end_turn",
  "totalTokens": 523,
  "timestamp": "2024-01-11T21:00:05.000Z"
}
```

**Error:**
```json
{
  "type": "error",
  "error": "Rate limit exceeded"
}
```

## Project Structure

```
examples/converse-api/
├── bin/
│   └── converse-api.ts         # CDK app entry point
├── lib/
│   └── converse-api-stack.ts   # CDK stack (minimal!)
├── lambda/
│   └── converse/
│       ├── index.ts            # Simple handler (~150 lines)
│       └── package.json
├── package.json
├── cdk.json
├── tsconfig.json
└── README.md
```

**That's all the code you need!**

## Parameters Explained

### Temperature (0.0 - 1.0)
- **0.0-0.3**: Focused, deterministic, factual
- **0.4-0.7**: Balanced (default: 0.7)
- **0.8-1.0**: Creative, varied, exploratory

### Max Tokens
- Controls maximum response length
- Default: 2048
- Claude 4.5 supports up to 8192 output tokens

### System Prompt
- Sets the assistant's behavior and role
- Default: "You are a helpful AI assistant..."
- Customize for specific use cases

## Cost Estimates

**For 1,000 conversations (avg 1,000 tokens each):**

| Service | Cost |
|---------|------|
| Bedrock Converse API (Claude 4.5) | ~$5-7 |
| Lambda executions | ~$0.10 |
| API Gateway WebSocket | ~$0.03 |
| CloudWatch Logs | ~$0.50 |
| **Total** | **~$6-8/month** |

**Cheapest of all three patterns!**

## Performance

- **First token latency**: 1-2 seconds
- **Streaming**: Real-time, smooth
- **Concurrent connections**: 1,000 (default Lambda)
- **Max session**: 15 minutes (WebSocket limit)

**Fastest of all three patterns!**

## Conversation History

This example shows a **single-turn** conversation (stateless). For multi-turn:

### Option 1: Client-Side History
Client maintains history and sends full conversation:

```typescript
const history = [];

// User message
history.push({ role: 'user', content: [{ text: userMessage }] });

// Send to API...
// Get response, add to history
history.push({ role: 'assistant', content: [{ text: response }] });
```

### Option 2: DynamoDB
Store conversation history in DynamoDB:

```typescript
// In Lambda
const history = await getHistory(userId, conversationId);
history.push({ role: 'user', content: [{ text: message }] });

// Call Bedrock with full history
const response = await converse({ messages: history });

// Save updated history
await saveHistory(userId, conversationId, history);
```

## Adding Function Calling

To add tool/function calling, switch to **inline-agents** example. This example is intentionally simple and doesn't include tools.

## Troubleshooting

### Model not available

Request access in AWS Console:
```bash
aws bedrock list-foundation-models --region us-east-1
```

Go to: **AWS Console > Bedrock > Model access**

### High latency

- Check Lambda cold starts (view CloudWatch metrics)
- Consider provisioned concurrency for production
- Ensure Lambda is in same region as Bedrock

### Token limit exceeded

Reduce `maxTokens` or shorten input:
```json
{
  "action": "chat",
  "message": "Short question",
  "maxTokens": 500
}
```

### WebSocket disconnects

- WebSocket limit is 15 minutes
- Client must reconnect after disconnect
- Implement reconnection logic in client

## Comparison with Other Patterns

| Feature | **Converse API** | Inline Agents | Agent Core |
|---------|-----------------|---------------|------------|
| Complexity | **Lowest** | Medium | High |
| Latency | **1-2s** | 2-3s | 3-5s |
| Cost | **Lowest** | Low | Medium |
| Setup Time | **5 min** | 10 min | 15 min |
| Code Lines | **~150** | ~400 | ~600 |
| Best For | **Simple chat** | Custom logic | Production workflows |

## When to Graduate

Consider switching to another pattern when:

- **Need tools** → Use inline-agents
- **Need multiple tools** → Use agent-core
- **Need orchestration** → Use agent-core
- **Need session management** → Use agent-core

## Extending This Example

Easy additions:
- ✅ DynamoDB for conversation history
- ✅ Rate limiting per user
- ✅ Different models per user preference
- ✅ Conversation analytics
- ✅ Custom system prompts per conversation

Hard additions (consider other patterns):
- ❌ Tool/function calling → Use inline-agents
- ❌ Multi-agent orchestration → Use agent-core
- ❌ Action groups → Use agent-core

## Example Use Cases

Perfect for:
- ✅ Chat interfaces
- ✅ Q&A systems  
- ✅ Content generation
- ✅ Text summarization
- ✅ Code explanation
- ✅ Educational tutoring
- ✅ Creative writing assistance

Not ideal for:
- ❌ Multi-step workflows
- ❌ Tool-using agents
- ❌ Complex orchestration
- ❌ Production agent systems

## Next Steps

- Explore **inline-agents** for tool calling
- Explore **agent-core** for full agent capabilities
- Add DynamoDB for conversation persistence
- Implement rate limiting
- Add conversation analytics
- Deploy frontend (React/Next.js)

## License

MIT

---

**This is the simplest way to use Claude Sonnet 4.5 on AWS!** 🚀
