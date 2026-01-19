# AWS Bedrock Integration Examples

Five patterns for integrating AWS Bedrock with Claude Sonnet 4.5 - from simplest to most sophisticated.

> **⚠️ DEMO PROJECT NOTICE**  
> This is a demonstration/educational project showcasing different AWS Bedrock integration patterns. Before deploying to production, please review the [SECURITY.md](./SECURITY.md) documentation and conduct a thorough security audit of authentication, authorization, and API security configurations.

## 🎯 Quick Start

Choose your pattern based on your needs:

| Pattern | Best For | Complexity | Setup Time |
|---------|----------|------------|------------|
| [**Converse API**](./examples/converse-api/) | Simple chat, Q&A, prototyping | ⭐ Low | 5 min |
| [**Inline Agents**](./examples/inline-agents/) | Tool calling, custom logic | ⭐⭐ Medium | 10 min |
| [**Bedrock Agents**](./examples/bedrock-agents/) | Infrastructure-based agents, CDK deployment | ⭐⭐⭐ High | 15 min |
| [**Lambda + LangGraph**](./examples/agent-core/) | Containerized Lambda with observability | ⭐⭐⭐ High | 15 min |
| [**AgentCore + LangGraph**](./examples/agent-core/) | Real AgentCore Runtime with CloudWatch metrics | ⭐⭐⭐⭐ Advanced | 20 min |

## 📚 What's Inside

This repository demonstrates **five different approaches** to building AI applications with AWS Bedrock:

### 1. [Converse API](./examples/converse-api/) - **Simplest Pattern**

Direct Bedrock Converse API calls with streaming responses.

```typescript
// One API call, direct streaming
const response = await bedrock.converse({
  modelId: 'claude-sonnet-4-5',
  messages: [{ role: 'user', content: [{ text: 'Hello!' }] }]
});
```

**When to use:**
- ✅ Simple chat interfaces
- ✅ Q&A systems
- ✅ Content generation
- ✅ Learning Bedrock
- ✅ Rapid prototyping

**[View Converse API Example →](./examples/converse-api/)**

---

### 2. [Inline Agents](./examples/inline-agents/) - **Custom Logic Pattern**

Agent logic in Lambda code using Converse API with tool calling.

```typescript
// Your code controls the agent loop
while (needsMoreTools) {
  const response = await bedrock.converse({ tools, messages });
  if (response.stopReason === 'tool_use') {
    const result = await executeTool(response.toolUse);
    messages.push({ toolResult: result });
  }
}
```

**When to use:**
- ✅ Custom tool integrations
- ✅ Fast iteration on agent logic
- ✅ Fine-grained control
- ✅ Cost optimization
- ✅ Multiple mini-agents

**[View Inline Agents Example →](./examples/inline-agents/)**

---

### 3. [Bedrock Agents](./examples/bedrock-agents/) - **Infrastructure Pattern**

Traditional Bedrock Agents deployed as infrastructure via CDK.

```typescript
// Infrastructure-as-code: agent defined at deploy time
const agent = new bedrock.CfnAgent({
  foundationModel: 'claude-sonnet-4-5',
  actionGroups: [urlFetcher, calculator, database],
  instructions: 'Set at deploy time',
  // AWS manages orchestration
});
```

**When to use:**
- ✅ Infrastructure-as-code approach
- ✅ Code-reviewed agent definitions
- ✅ CI/CD pipeline integration
- ✅ Built-in orchestration
- ✅ Multiple action groups
- ✅ Enterprise governance

**[View Bedrock Agents Example →](./examples/bedrock-agents/)**

---

### 4. [Lambda + LangGraph](./examples/agent-core/) - **Containerized Lambda Pattern**

LangGraph agent in containerized Lambda with ADOT observability.

```typescript
// LangGraph in container, Lambda runtime
const graph = new StateGraph(GraphState)
  .addNode('agent', callModel)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue);
```

**When to use:**
- ✅ LangGraph workflows
- ✅ ADOT/OpenTelemetry observability
- ✅ CloudWatch Application Signals
- ✅ Custom instrumentation
- ✅ Fast iteration (Lambda deployment)

**[View Lambda + LangGraph Example →](./examples/agent-core/)**

---

### 5. [AgentCore + LangGraph](./examples/agent-core/) - **AgentCore Runtime Pattern**

Real AWS Bedrock AgentCore Runtime with LangGraph agent in managed container.

```typescript
// Lambda proxy → Real AgentCore Runtime → Container
const response = await agentCoreClient.send(
  new InvokeAgentRuntimeCommand({
    agentRuntimeArn: 'arn:aws:bedrock-agentcore:...',
    payload: { prompt: 'Hello!' }
  })
);
// Populates CloudWatch AgentCore metrics
```

**When to use:**
- ✅ CloudWatch AgentCore metrics needed
- ✅ Production AgentCore deployment
- ✅ Managed container orchestration
- ✅ Runtime session management
- ✅ Multi-endpoint support

**[View AgentCore + LangGraph Example →](./examples/agent-core/)**

---

## 📊 Pattern Comparison

| Feature | Converse API | Inline Agents | Bedrock Agents | Lambda + LangGraph | AgentCore + LangGraph |
|---------|--------------|---------------|----------------|--------------------|----------------------|
| **Complexity** | Low | Medium | High | High | Advanced |
| **First Token Latency** | 1-2s | 2-3s | 3-5s | 2-3s | 3-5s |
| **Monthly Cost (1K convos)*** | $6-8 | $7-9 | $15-25 | $10-15 | $20-35 |
| **Setup Time** | 5 min | 10 min | 15 min | 15 min | 20 min |
| **Code to Write** | High | Medium | Low | Medium | Medium |
| **Tool Calling** | Manual | Manual | Built-in | Built-in | Built-in |
| **Multi-Agent** | Manual | Manual | Built-in | Built-in | Built-in |
| **Session Management** | Manual | Manual | Built-in | Manual | Built-in |
| **Iteration Speed** | Fastest | Fast | Slow | Fast | Medium |
| **Control Level** | Highest | High | Medium | Highest | High |
| **AWS Management** | None | Minimal | Full | Minimal | Full |
| **Observability** | Basic | Basic | CloudWatch Metrics | Full ADOT/Traces | Full ADOT + AgentCore Metrics |
| **Deployment Type** | Lambda | Lambda | CDK Infrastructure | Containerized Lambda | AgentCore Runtime |
| **Config Changes** | Instant | Instant | Requires Redeploy | Instant | Runtime |
| **Token Usage Tracking** | Real-time | Real-time | CloudWatch (delayed) | Real-time | Real-time |

**\* Cost estimates:** Actual costs depend heavily on conversation length, tool usage, and session frequency. 

**Cost Breakdown by Pattern:**
- **Converse API & Inline Agents**: Pay only for LLM tokens + minimal Lambda costs (~$0.20/1M requests)
- **Bedrock Agents**: Pay for LLM tokens **+ Runtime compute** (CPU: $0.0895/vCPU-hour, Memory: $0.00945/GB-hour). Runtime charges apply for entire session duration, making it 2-3x more expensive than Converse/Inline patterns.
- **Lambda + LangGraph**: Pay for LLM tokens + containerized Lambda runtime (~$0.20/1M requests + container overhead)
- **AgentCore + LangGraph**: Pay for LLM tokens **+ AgentCore Runtime** + ADOT ingestion costs. Most expensive but offers full observability and CloudWatch AgentCore metrics.

**Cost Tracking:**
- **Converse API, Inline Agents, Lambda + LangGraph, AgentCore + LangGraph**: Real-time token usage displayed in the UI
- **Bedrock Agents**: Token usage available via [CloudWatch Metrics](./examples/bedrock-agents/README.md#tracking-actual-usage) (5-15 min delay)

## 🏗️ Architecture Overview

All examples share:
- 🤖 **Claude Sonnet 4.5** via Bedrock
- 🔐 **Firebase Authentication** (JWT tokens)
- ⚡ **WebSocket API** for streaming
- 📡 **Real-time responses** to React frontend

### Shared Components

```
shared/
├── auth/firebase-authorizer/    # Firebase JWT validation
├── websocket/                   # WebSocket utilities
├── types/                       # TypeScript definitions
└── constructs/                  # CDK constructs (future)
```

## 🚀 Getting Started

### Prerequisites

1. **AWS Account** with Bedrock access
2. **Bedrock Model Access** - Request Claude Sonnet 4.5 in AWS Console
3. **Firebase Project** - Create at [console.firebase.google.com](https://console.firebase.google.com)
4. **Node.js 22+** - [Download](https://nodejs.org/)
5. **AWS CDK** - `npm install -g aws-cdk`

### Quick Setup (Any Example)

1. **Clone repository**
   ```bash
   git clone https://github.com/blueleader07/agent-core-stack.git
   cd agent-core-stack
   ```

2. **Configure Firebase**
   
   Create `.env` in repository root:
   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKey\n-----END PRIVATE KEY-----"
   ```

3. **Choose your example**
   ```bash
   cd examples/converse-api/     # Simplest - Direct API calls
   # OR
   cd examples/inline-agents/    # Medium - Custom tool orchestration
   # OR
   cd examples/bedrock-agents/   # High - Infrastructure-based agents
   # OR
   cd examples/agent-core/       # Advanced - AgentCore Runtime with ADOT
   ```

4. **Deploy**
   ```bash
   npm install
   npm run build
   npm run deploy
   ```

5. **Get WebSocket URL** from CDK output
   ```
   ✅ BedrockConverseApiStack (deployed)
   
   Outputs:
   WebSocketUrl = wss://abc123.execute-api.us-east-1.amazonaws.com/prod
   ```

## 🧪 Testing

### With wscat (CLI)

```bash
# Install wscat
npm install -g wscat

# Get Firebase token (from browser console after Firebase login)
# In browser: await firebase.auth().currentUser.getIdToken()

# Connect to any example
wscat -c "wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod?token=YOUR_TOKEN"

# Send message (Converse API)
> {"action": "chat", "message": "Hello!"}

# Send message (Inline Agents)
> {"action": "chat", "message": "Calculate 25 * 4"}

# Send message (Bedrock Agents)
> {"action": "invoke-agent", "message": "Fetch https://aws.amazon.com/bedrock"}

# Send message (AgentCore Runtime)
> {"action": "invoke-runtime", "message": "Your message with full observability"}
```

### With Frontend (React)

```typescript
import { auth } from './firebase';

const token = await auth.currentUser?.getIdToken();
const ws = new WebSocket(`${WS_URL}?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'stream') {
    console.log('Chunk:', data.chunk);
  }
};

ws.send(JSON.stringify({ 
  action: 'chat',  // 'invoke-agent' for bedrock-agents, 'invoke-runtime' for agent-core
  message: 'Your message here' 
}));
```

## 🔍 Enabling AgentCore Observability

**AgentCore Runtime provides automatic observability** - but it requires a **one-time account-level setup** to enable CloudWatch Transaction Search.

### Prerequisites

You must enable Transaction Search in your AWS account before AgentCore metrics will appear in the dashboard.

### Setup Steps (One-Time Only)

**Option 1: AWS CLI (Recommended)**

```bash
# Step 1: Create CloudWatch Logs resource policy
aws logs put-resource-policy \
  --policy-name TransactionSearchPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "TransactionSearchXRayAccess",
      "Effect": "Allow",
      "Principal": {"Service": "xray.amazonaws.com"},
      "Action": "logs:PutLogEvents",
      "Resource": [
        "arn:aws:logs:us-east-1:YOUR_ACCOUNT_ID:log-group:aws/spans:*",
        "arn:aws:logs:us-east-1:YOUR_ACCOUNT_ID:log-group:/aws/application-signals/data:*"
      ],
      "Condition": {
        "ArnLike": {"aws:SourceArn": "arn:aws:xray:us-east-1:YOUR_ACCOUNT_ID:*"},
        "StringEquals": {"aws:SourceAccount": "YOUR_ACCOUNT_ID"}
      }
    }]
  }' \
  --region us-east-1 \
  --no-cli-pager

# Step 2: Configure X-Ray to send traces to CloudWatch Logs
aws xray update-trace-segment-destination \
  --destination CloudWatchLogs \
  --region us-east-1 \
  --no-cli-pager

# Step 3: Set sampling percentage (1% is free tier)
aws xray update-indexing-rule \
  --name "Default" \
  --rule '{"Probabilistic": {"DesiredSamplingPercentage": 1}}' \
  --region us-east-1 \
  --no-cli-pager

# Step 4: Enable Application Signals discovery (for observability dashboard)
aws application-signals start-discovery \
  --region us-east-1 \
  --no-cli-pager

# Step 5: Verify Transaction Search is active
aws xray get-trace-segment-destination \
  --region us-east-1 \
  --no-cli-pager
# Should return: {"Destination": "CloudWatchLogs", "Status": "ACTIVE"}
```

**Option 2: AWS Console**

1. Open [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Navigate to **Application Signals** → **Transaction Search**
3. Click **Enable Transaction Search**
4. Select **Ingest spans as structured logs**
5. Set **1% indexing** (free tier)
6. Click **Enable**
7. Navigate to **Application Signals** → **Services**
### What You Get (Automatically)

Once enabled, **every AgentCore Runtime** in your account automatically sends:

✅ **Runtime Metrics** (appears immediately)
- Sessions count
- Invocations count
- Error rates
- Throttle rates
- vCPU consumption (vCPU-hours)
- Memory consumption (GB-hours)

✅ **Observability Metrics** (requires Application Signals discovery)
- Agents/Endpoints tracking
- Sampled trace analysis
- Session-level details
- LLM invocation traces
- Tool execution traces

✅ **CloudWatch Logs**
- Application logs
- Debug information
- Error stack traces
- Debug information
- Error stack traces

### Viewing Metrics

After enabling Transaction Search and invoking your AgentCore Runtime:

1. Open [Bedrock AgentCore Observability Dashboard](https://console.aws.amazon.com/cloudwatch/home#gen-ai-observability/agent-core)
2. Wait **~10 minutes** for initial metrics to appear
3. View real-time metrics, traces, and logs

**No code changes needed** - observability is automatic for all deployed runtimes!

### Troubleshooting

**"I enabled Transaction Search but see 0/0 Agents"**
- Wait 10 minutes after first runtime invocation
- Verify Transaction Search status: `aws xray get-trace-segment-destination`
- Check that you invoked the runtime at least once

**"Metrics not appearing"**
- Ensure your IAM user/role has `CloudWatchReadOnlyAccess` policy
- Verify runtime is in `READY` state: `aws bedrock-agentcore-control get-agent-runtime`
- Check CloudWatch Logs for errors: `/aws/bedrock-agentcore/runtimes/YOUR_RUNTIME_ID`

### Cost

- **Transaction Search**: Free for 1% sampling (default)
- **CloudWatch Logs**: ~$0.50/GB ingested
- **X-Ray Traces**: First 100K traces/month free, then $5.00/million

For most development use cases, observability costs < $5/month.

---

## 📖 Documentation

Each example has comprehensive documentation:

- **[Converse API README](./examples/converse-api/README.md)** - Direct API usage
- **[Inline Agents README](./examples/inline-agents/README.md)** - Tool calling pattern
- **[Bedrock Agents README](./examples/bedrock-agents/README.md)** - Infrastructure-based agents
- **[AgentCore Runtime README](./examples/agent-core/README.md)** - Advanced runtime with ADOT observability

## 🎓 Learning Path

**Recommended progression:**

1. **Start with [Converse API](./examples/converse-api/)** 
   - Understand basic Bedrock integration
   - Learn streaming responses
   - Deploy in 5 minutes

2. **Move to [Inline Agents](./examples/inline-agents/)**
   - Add tool calling
   - Implement custom logic
   - Control orchestration

3. **Try [Bedrock Agents](./examples/bedrock-agents/)**
   - Infrastructure-as-code approach
   - Built-in orchestration
   - Enterprise governance

4. **Graduate to [AgentCore Runtime](./examples/agent-core/)**
   - Advanced observability
   - Container-based workflows
   - Full ADOT instrumentation

## 💰 Cost Breakdown

**Example: 1,000 conversations, avg 1,000 tokens each, 60-second sessions**

| Component | Converse | Inline | Bedrock Agents | AgentCore Runtime |
|-----------|----------|--------|----------------|-------------------|
| Bedrock LLM (tokens) | $5-7 | $6-8 | $8-10 | $8-10 |
| Runtime Compute (CPU+Memory) | — | — | $7-15* | $10-20** |
| ADOT/Observability | — | — | — | $2-5 |
| Lambda | $0.10 | $0.20 | $0.20 | $0.20 |
| API Gateway | $0.03 | $0.03 | $0.03 | $0.03 |
| Logs | $0.50 | $0.50 | $0.50 | $0.50 |
| **Total** | **$6-8** | **$7-9** | **$15-25** | **$20-35** |

**\* Bedrock Agents Runtime charges:**
- CPU: $0.0895/vCPU-hour (charged per second of active processing)
- Memory: $0.00945/GB-hour (charged continuously during session)
- Example: 60s session with 1vCPU, 2GB memory ≈ $0.015/session
- 1,000 sessions ≈ $15 in runtime costs alone

**\*\* AgentCore Runtime charges:**
- Container runtime costs (higher than traditional agents)
- ADOT span ingestion via CloudWatch Application Signals
- Additional observability storage costs
- Full tracing and metrics collection

💡 **Tip:** Start with Converse API for lowest cost while learning. Use Inline Agents for production with tools. Choose Bedrock Agents when you need infrastructure-as-code governance. Use AgentCore Runtime only when advanced observability justifies the 3-5x cost premium.

## 🔐 Security

All examples include:
- ✅ Firebase JWT authentication
- ✅ No hardcoded credentials (`.env` gitignored)
- ✅ IAM least-privilege policies
- ✅ WebSocket connection validation

**Never commit:**
- `.env` files
- Firebase service account JSON
- AWS credentials

## 🤝 Contributing

This repository is designed for learning and reference. Feel free to:
- ⭐ Star the repo
- 🍴 Fork and customize for your use case
- 📝 Submit issues for bugs or questions
- 💡 Share improvements via PRs

## 📦 Repository Structure

```
agent-core-stack/
├── examples/
│   ├── converse-api/      # Level 1: Direct API calls (simplest)
│   ├── inline-agents/     # Level 2: Tool calling in Lambda
│   ├── bedrock-agents/    # Level 3: Infrastructure-based agents (CDK)
│   └── agent-core/        # Level 4: AgentCore Runtime (advanced observability)
├── shared/
│   ├── auth/              # Firebase authorizer
│   ├── websocket/         # WebSocket utilities
│   └── types/             # TypeScript definitions
├── .specs/                # Design docs and requirements
├── README.md              # This file
├── BLOG.md                # Social media content
└── .env                   # Firebase credentials (gitignored)
```

## 🔧 Tech Stack

- **AWS CDK** - Infrastructure as Code
- **AWS Bedrock** - Claude Sonnet 4.5
- **AWS Lambda** - Serverless compute (Node.js 22)
- **API Gateway** - WebSocket API
- **Firebase** - Authentication
- **TypeScript** - Type-safe development
- **Cheerio** - HTML parsing (inline-agents, agent-core)

## 📚 Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [AWS CDK Guide](https://docs.aws.amazon.com/cdk/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

## 🎯 Use Cases

### Converse API Perfect For:
- Chat interfaces
- Q&A systems
- Content generation
- Code explanation
- Tutoring applications

### Inline Agents Perfect For:
- Multi-tool applications
- Custom workflows
- API integrations
- Data processing
- Research assistants

### Agent Core Perfect For:
- Production agent systems
- Complex orchestration
- Enterprise workflows
- Multi-agent coordination
- Managed infrastructure

## 📝 License

MIT - Feel free to use for learning, commercial projects, or anything else!

## 🙏 Acknowledgments

Built with:
- AWS Bedrock and Claude Sonnet 4.5
- Firebase for authentication
- AWS CDK for infrastructure
- Love for serverless architecture ❤️

---

## 🚦 Quick Decision Guide

**"I need..."**

- 🟢 **Simple chat** → [Converse API](./examples/converse-api/)
- 🟡 **Tools/functions** → [Inline Agents](./examples/inline-agents/)
- 🟠 **Infrastructure agents** → [Bedrock Agents](./examples/bedrock-agents/)
- 🔴 **Advanced observability** → [AgentCore Runtime](./examples/agent-core/)

**"I want..."**

- ⚡ **Fastest setup** → [Converse API](./examples/converse-api/) (5 min)
- 💰 **Lowest cost** → [Converse API](./examples/converse-api/) ($6-8/mo)
- 🎯 **Most control** → [Inline Agents](./examples/inline-agents/)
- 🏗️ **Infrastructure-as-code** → [Bedrock Agents](./examples/bedrock-agents/)
- 🔬 **Full observability** → [AgentCore Runtime](./examples/agent-core/)

**"I'm learning..."**

- 📖 **Bedrock basics** → Start with [Converse API](./examples/converse-api/)
- 🛠️ **Tool calling** → Move to [Inline Agents](./examples/inline-agents/)
- 🏢 **Managed agents** → Try [Bedrock Agents](./examples/bedrock-agents/)
- 🚀 **Advanced patterns** → Graduate to [AgentCore Runtime](./examples/agent-core/)

---

<div align="center">

**Happy Building! 🚀**

[Report Bug](https://github.com/blueleader07/agent-core-stack/issues) · 
[Request Feature](https://github.com/blueleader07/agent-core-stack/issues) · 
[Star Repository ⭐](https://github.com/blueleader07/agent-core-stack)

</div>
