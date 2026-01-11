# Bedrock Inline Agents Example

Agent logic implemented in Lambda code using Bedrock Converse API with tool calling - fast iteration and full control.

## What is This?

This example demonstrates the **inline agent pattern** where agent logic runs directly in your Lambda code rather than using AWS's managed Bedrock Agent service. You have:

- 🎯 **Direct Control** - Agent logic in your Lambda code
- 🔧 **Tool Calling** - Bedrock Converse API with function definitions
- ⚡ **Fast Iteration** - No CDK deploy needed for logic changes
- 🤖 **Claude Sonnet 4.5** - Same model as agent-core
- 🔐 **Firebase Auth** - Secure JWT authentication
- 📡 **WebSocket Streaming** - Real-time response streaming

## When to Use This Pattern

✅ **Use Inline Agents when you need:**
- Rapid iteration on agent logic
- Fine-grained control over tool execution
- Custom orchestration logic
- Cost optimization (no agent service overhead)
- Easier debugging and testing
- Multiple agents with different behaviors

❌ **Don't use if you need:**
- Built-in memory and session management (use agent-core)
- AWS-managed agent lifecycle (use agent-core)
- Simplest possible pattern (use converse-api)

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
┌─────────────────────────────────────────┐
│ Inline Agent Lambda                     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Agent Loop (your code!)         │   │
│  │  1. Call Bedrock Converse API   │   │
│  │  2. Check for tool_use          │   │
│  │  3. Execute tools locally       │   │
│  │  4. Return results to Bedrock   │   │
│  │  5. Get final response          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Tools:                                 │
│  ├─ fetch_url (Cheerio scraper)        │
│  ├─ calculate (Math eval)              │
│  └─ get_weather (Mock data)            │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│ Bedrock         │
│ Converse API    │
│ (Claude 4.5)    │
└─────────────────┘
```

## Features

- ✅ **Inline Agent Logic** - Full control over orchestration
- ✅ **Tool Calling** - URL fetcher, calculator, weather (mock)
- ✅ **Streaming Responses** - Real-time chunks sent to client
- ✅ **Tool Notifications** - Client sees which tools are being used
- ✅ **Conversation Loop** - Automatic multi-turn tool execution
- ✅ **Claude Sonnet 4.5** - Via Bedrock Converse API

## Available Tools

### 1. fetch_url
Fetches and extracts content from URLs using Cheerio.

```json
{
  "name": "fetch_url",
  "description": "Fetch and extract content from a URL",
  "input": {
    "url": "https://example.com"
  }
}
```

### 2. calculate
Performs mathematical calculations.

```json
{
  "name": "calculate",
  "description": "Perform mathematical calculations",
  "input": {
    "expression": "sqrt(16) + 2 * 3"
  }
}
```

### 3. get_weather
Returns mock weather data for demonstration.

```json
{
  "name": "get_weather",
  "description": "Get current weather (mock data)",
  "input": {
    "location": "San Francisco"
  }
}
```

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
- `InlineAgentFunctionName` - Lambda function name for logs

## Usage

### Frontend Integration (React/TypeScript)

```typescript
const ws = new WebSocket(`${WS_URL}?token=${firebaseToken}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'stream':
      // Agent response chunk
      console.log('Agent:', data.chunk);
      break;
      
    case 'tool':
      // Tool being executed
      console.log(`Tool: ${data.tool}`, data.input);
      console.log('Result:', data.output);
      break;
      
    case 'complete':
      console.log('Conversation complete');
      break;
      
    case 'error':
      console.error('Error:', data.error);
      break;
  }
};

// Send message (note: action is "chat" not "invoke-agent")
ws.send(JSON.stringify({ 
  action: 'chat', 
  message: 'Calculate 15 * 23 + 100' 
}));
```

### Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c "wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod?token=YOUR_FIREBASE_TOKEN"

# Test calculator
> {"action": "chat", "message": "What is 25 * 4?"}

# Test URL fetcher
> {"action": "chat", "message": "Fetch https://aws.amazon.com/bedrock/ and summarize it"}

# Test weather
> {"action": "chat", "message": "What's the weather in Seattle?"}

# Test multi-tool
> {"action": "chat", "message": "Fetch https://example.com and count the words"}
```

## Project Structure

```
examples/inline-agents/
├── bin/
│   └── inline-agents.ts        # CDK app entry point
├── lib/
│   └── inline-agents-stack.ts  # CDK stack definition
├── lambda/
│   └── inline-agent/
│       ├── index.ts            # Inline agent logic
│       └── package.json
├── package.json
├── cdk.json
├── tsconfig.json
└── README.md
```

## How It Works

### Agent Loop

The inline agent implements a **conversation loop**:

1. **User sends message** → Lambda receives via WebSocket
2. **Call Bedrock Converse API** with tool definitions
3. **Bedrock responds** with either:
   - Text response → Stream to client, done
   - Tool use request → Execute tool locally
4. **Execute tool** (fetch_url, calculate, get_weather)
5. **Return tool result** to Bedrock in next API call
6. **Bedrock processes result** and responds with final answer
7. **Stream final response** to client

### Tool Execution

Tools run **in your Lambda code**, giving you full control:

```typescript
async function executeTool(toolName: string, input: any) {
  switch (toolName) {
    case 'fetch_url':
      return await fetchUrl(input.url);
    case 'calculate':
      return calculate(input.expression);
    case 'get_weather':
      return getWeather(input.location);
  }
}
```

You can add custom logic, error handling, retries, caching, etc.

## Adding New Tools

1. **Define tool schema** in `tools` array:
```typescript
{
  toolSpec: {
    name: 'my_custom_tool',
    description: 'What this tool does',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: '...' }
        },
        required: ['param1']
      }
    }
  }
}
```

2. **Implement tool function**:
```typescript
async function myCustomTool(param1: string) {
  // Your implementation
  return { result: 'data' };
}
```

3. **Add to executeTool switch**:
```typescript
case 'my_custom_tool':
  return await myCustomTool(input.param1);
```

4. **No CDK deploy needed!** Just update Lambda code.

## Cost Estimates

**For 1,000 conversations (avg 1,000 tokens each):**

| Service | Cost |
|---------|------|
| Bedrock Converse API (Claude 4.5) | ~$6-8 |
| Lambda executions | ~$0.20 |
| API Gateway WebSocket | ~$0.03 |
| CloudWatch Logs | ~$0.50 |
| **Total** | **~$7-9/month** |

**Cheaper than agent-core** due to no Bedrock Agent service overhead.

## Performance

- **First token latency**: 2-3 seconds
- **Tool execution**: +1-2 seconds per tool
- **Total (with 1 tool)**: ~3-5 seconds
- **Faster than agent-core** (no agent service overhead)

## Troubleshooting

### Lambda timeout

Increase timeout in CDK stack:
```typescript
timeout: cdk.Duration.minutes(15)
```

### Tool not executing

Check Lambda logs:
```bash
aws logs tail /aws/lambda/BedrockInlineAgentsStack-InlineAgentFunction --follow
```

Look for "Executing tool: [name]" messages.

### Bedrock permission denied

Ensure Lambda has these permissions:
```typescript
'bedrock:InvokeModel',
'bedrock:InvokeModelWithResponseStream'
```

### Tool execution error

Tools return `{ error: "message" }` on failure. Check:
- URL accessibility (for fetch_url)
- Expression syntax (for calculate)
- Network connectivity

## Comparison with Other Patterns

| Feature | Agent Core | **Inline Agents** | Converse API |
|---------|-----------|------------------|--------------|
| Complexity | High | **Medium** | Low |
| Latency | 3-5s | **2-3s** | 1-2s |
| Cost | Medium | **Low** | Lowest |
| Flexibility | Medium | **High** | Highest |
| Iteration Speed | Slow | **Fast** | Fastest |
| Best For | Production workflows | **Custom logic** | Simple chat |

## Advantages Over Agent Core

✅ **Faster iteration** - No CDK deploy to change agent logic
✅ **Lower latency** - No Bedrock Agent service overhead  
✅ **Lower cost** - Only pay for Converse API calls
✅ **More control** - Tool execution in your code
✅ **Easier debugging** - Standard Lambda logging
✅ **Custom orchestration** - Implement any logic you want

## When to Graduate to Agent Core

Consider switching to agent-core when:
- You need built-in session/memory management
- You want AWS to manage agent lifecycle
- You need official action group integration
- You have complex multi-agent workflows

## Next Steps

- Explore **converse-api** example for simplest pattern
- Explore **agent-core** example for managed agents
- Add your own custom tools
- Implement DynamoDB for persistent conversation history
- Add tool result caching
- Implement parallel tool execution

## License

MIT
