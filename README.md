# AWS Bedrock Integration Examples

Four patterns for integrating AWS Bedrock with Claude Sonnet 4.5 - from simplest to most sophisticated.

> **⚠️ DEMO PROJECT NOTICE**  
> This is a demonstration/educational project showcasing different AWS Bedrock integration patterns. Before deploying to production, please review the [SECURITY.md](./SECURITY.md) documentation and conduct a thorough security audit of authentication, authorization, and API security configurations.

## 🎯 Quick Start

Choose your pattern based on your needs:

| Pattern | Best For | Complexity | Setup Time |
|---------|----------|------------|------------|
| [**Converse API**](./examples/converse-api/) | Simple chat, Q&A, prototyping | ⭐ Low | 5 min |
| [**Inline Agents**](./examples/inline-agents/) | Tool calling, custom logic | ⭐⭐ Medium | 10 min |
| [**Bedrock Agents**](./examples/bedrock-agents/) | Infrastructure-based agents, CDK deployment | ⭐⭐⭐ High | 15 min |
| [**AgentCore Runtime**](./examples/agent-core/) | Containerized agents, ADOT observability | ⭐⭐⭐⭐ Advanced | 20 min |

## 📚 What's Inside

This repository demonstrates **four different approaches** to building AI applications with AWS Bedrock:

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

### 4. [AgentCore Runtime](./examples/agent-core/) - **Advanced Pattern**

New AgentCore service with containerized agents and full observability.

```typescript
// Runtime agent with ADOT instrumentation
import { AgentCore } from '@aws/bedrock-agentcore-sdk-typescript';

const agent = new AgentCore({
  // Agent code runs in managed container
  // Full ADOT observability
  // Dynamic configuration at runtime
});
```

**When to use:**
- ✅ Advanced observability (ADOT/CloudWatch)
- ✅ Containerized agent workflows
- ✅ Runtime configuration changes
- ✅ Complex trace analysis
- ✅ Custom instrumentation
- ✅ Multi-framework support

**[View AgentCore Runtime Example →](./examples/agent-core/)**

---

## 📊 Pattern Comparison

| Feature | Converse API | Inline Agents | Bedrock Agents | AgentCore Runtime |
|---------|--------------|---------------|----------------|-------------------|
| **Complexity** | Low | Medium | High | Advanced |
| **First Token Latency** | 1-2s | 2-3s | 3-5s | 3-5s |
| **Monthly Cost (1K convos)*** | $6-8 | $7-9 | $15-25 | $20-35 |
| **Setup Time** | 5 min | 10 min | 15 min | 20 min |
| **Code to Write** | High | Medium | Low | Medium |
| **Tool Calling** | Manual | Manual | Built-in | Built-in |
| **Multi-Agent** | Manual | Manual | Built-in | Built-in |
| **Session Management** | Manual | Manual | Built-in | Built-in |
| **Iteration Speed** | Fastest | Fast | Slow | Medium |
| **Control Level** | Highest | High | Medium | High |
| **AWS Management** | None | Minimal | Full | Full |
| **Observability** | Basic | Basic | CloudWatch Metrics | Full ADOT/Traces |
| **Deployment Type** | Lambda | Lambda | CDK Infrastructure | Container Runtime |
| **Config Changes** | Instant | Instant | Requires Redeploy | Runtime |

**\* Cost estimates:** Actual costs depend heavily on conversation length, tool usage, and session frequency. 

**Cost Breakdown by Pattern:**
- **Converse API & Inline Agents**: Pay only for LLM tokens + minimal Lambda costs (~$0.20/1M requests)
- **Bedrock Agents**: Pay for LLM tokens **+ Runtime compute** (CPU: $0.0895/vCPU-hour, Memory: $0.00945/GB-hour). Runtime charges apply for entire session duration, making it 2-3x more expensive than Converse/Inline patterns.
- **AgentCore Runtime**: Pay for LLM tokens **+ Container runtime** + ADOT ingestion costs. Most expensive but offers full observability and flexibility.

**Cost Tracking:**
- **Converse API & Inline Agents**: Real-time token usage displayed in the UI
- **Bedrock Agents**: Token usage available via [CloudWatch Metrics](./examples/bedrock-agents/README.md#tracking-actual-usage) (5-15 min delay)
- **AgentCore Runtime**: Full ADOT traces, spans, and metrics with CloudWatch Application Signals

## 🏗️ Architecture Overview

All three examples share:
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
4. **Node.js 20+** - [Download](https://nodejs.org/)
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
- **AWS Lambda** - Serverless compute (Node.js 20)
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
