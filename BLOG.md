# Building with AWS Bedrock: Three Patterns Compared

*A practical guide to choosing the right Bedrock integration pattern for your application*

## TL;DR

I built three different AWS Bedrock integrations with Claude Sonnet 4.5 and learned that **simpler is usually better**. Here's when to use each:

- 🟢 **Converse API** - Start here (5 min setup, $6/mo for 1K conversations)
- 🟡 **Inline Agents** - When you need tools (10 min setup, $7/mo)
- 🔴 **Agent Core** - For production multi-agent systems (15 min, $9/mo)

[**View Code →**](https://github.com/blueleader07/agent-core-stack)

---

## The Problem

When building with AWS Bedrock, you have three main approaches:

1. Direct Converse API calls
2. Inline agents (your code + Converse API)
3. Full Bedrock Agent service

But which one should you choose? I built all three to find out.

## Pattern 1: Converse API (Simplest)

**Setup time:** 5 minutes  
**Code:** ~150 lines  
**Latency:** 1-2 seconds  
**Cost:** $6-8/month (1K conversations)

```typescript
// That's literally it
const response = await bedrock.converse({
  modelId: 'claude-sonnet-4-5',
  messages: [{ role: 'user', content: [{ text: 'Hello!' }] }]
});
```

**What I learned:**
- This is all you need for 80% of use cases
- Lowest latency and cost
- Perfect for chat, Q&A, content generation
- Easy to understand and debug

**When to use:**
- Building a chat interface
- Q&A system
- Content generation
- Learning Bedrock
- MVPs and prototypes

**GitHub:** [examples/converse-api](https://github.com/blueleader07/agent-core-stack/tree/main/examples/converse-api)

---

## Pattern 2: Inline Agents (Sweet Spot)

**Setup time:** 10 minutes  
**Code:** ~400 lines  
**Latency:** 2-3 seconds  
**Cost:** $7-9/month (1K conversations)

```typescript
// You control the agent loop
while (needsMoreTools) {
  const response = await bedrock.converse({ tools, messages });
  
  if (response.stopReason === 'tool_use') {
    // Execute tool in your Lambda
    const result = await executeTool(response.toolUse);
    messages.push({ toolResult: result });
  }
}
```

**What I learned:**
- Perfect balance of control and simplicity
- Fast iteration (no CDK deploy for logic changes)
- Tools run in your code (full control)
- Great for custom workflows

**When to use:**
- Need tool/function calling
- Custom business logic
- API integrations
- Multi-step workflows
- Cost optimization

**Tools implemented:**
- URL fetcher (Cheerio scraper)
- Calculator (math expressions)
- Weather lookup (mock data)

**GitHub:** [examples/inline-agents](https://github.com/blueleader07/agent-core-stack/tree/main/examples/inline-agents)

---

## Pattern 3: Agent Core (Production)

**Setup time:** 15 minutes  
**Code:** ~600 lines  
**Latency:** 3-5 seconds  
**Cost:** $9-11/month (1K conversations)

```typescript
// AWS manages everything
const agent = new bedrock.CfnAgent({
  foundationModel: 'claude-sonnet-4-5',
  actionGroups: [urlFetcher, calculator, database],
  // AWS handles orchestration, memory, sessions
});
```

**What I learned:**
- Best for production multi-agent systems
- Built-in session and memory management
- AWS handles orchestration
- Slower iteration (need CDK deploy)
- Higher latency and cost

**When to use:**
- Production agent systems
- Complex multi-agent orchestration
- Need AWS-managed infrastructure
- Multiple action groups
- Enterprise workflows

**GitHub:** [examples/agent-core](https://github.com/blueleader07/agent-core-stack/tree/main/examples/agent-core)

---

## Side-by-Side Comparison

| Metric | Converse API | Inline Agents | Agent Core |
|--------|--------------|---------------|------------|
| **Complexity** | Low ⭐ | Medium ⭐⭐ | High ⭐⭐⭐ |
| **First Token** | 1-2s | 2-3s | 3-5s |
| **Cost (1K)** | $6-8 | $7-9 | $9-11 |
| **Setup** | 5 min | 10 min | 15 min |
| **Iteration** | Fastest | Fast | Slow |
| **Control** | Highest | High | Medium |

## My Recommendation

**Start with Converse API** for 95% of projects:
- Lowest cost
- Fastest to build
- Easiest to debug
- Sufficient for most use cases

**Graduate to Inline Agents** when you need:
- Tool/function calling
- Custom orchestration
- API integrations
- Fine-grained control

**Use Agent Core** only when you need:
- AWS-managed agent infrastructure
- Complex multi-agent systems
- Built-in memory/sessions at scale
- Enterprise production workflows

## Architecture Shared Across All Three

All patterns use:
- 🤖 **Claude Sonnet 4.5** (same model)
- 🔐 **Firebase Auth** (JWT tokens)
- ⚡ **WebSocket API** (streaming)
- 📡 **Lambda** (Node.js 20)

**Shared components:**
```
shared/
├── auth/firebase-authorizer/  # Firebase JWT validation
├── websocket/                 # WebSocket utilities
└── types/                     # TypeScript definitions
```

## Real-World Example: Chat with URL Fetching

### Converse API
❌ Can't do tool calling natively
- Would need to parse URLs from response, fetch separately

### Inline Agents
✅ Perfect fit
```typescript
tools: [{
  name: 'fetch_url',
  description: 'Fetch article content',
  inputSchema: { url: 'string' }
}]

// Claude calls tool → You fetch URL → Return to Claude
```

### Agent Core
✅ Also works, but overkill
```typescript
actionGroups: [{
  actionGroupName: 'url-fetcher',
  actionGroupExecutor: { lambda: urlFetcherFunction }
}]
// More setup, slower iteration, same result
```

**Winner:** Inline Agents for this use case

## Code Quality Observations

### Lines of Code
- Converse API: ~150 lines
- Inline Agents: ~400 lines  
- Agent Core: ~600 lines

### Debugging Ease
1. Converse API (just Lambda logs)
2. Inline Agents (Lambda logs + tool execution)
3. Agent Core (Lambda + Bedrock Agent + Action Group logs)

### Iteration Speed
1. Converse API (just update Lambda)
2. Inline Agents (update Lambda, tools in code)
3. Agent Core (CDK deploy for agent changes)

## Key Takeaways

1. **Start simple** - Converse API is sufficient for most use cases
2. **Add complexity only when needed** - Move to Inline Agents for tools
3. **Agent Core is for production scale** - Not for every project
4. **All three use the same model** - Performance differences are architectural
5. **Cost increases with complexity** - But not dramatically ($6 vs $11)

## Tech Stack

- **AWS CDK** - Infrastructure as Code
- **AWS Bedrock** - Claude Sonnet 4.5
- **AWS Lambda** - Node.js 20
- **API Gateway** - WebSocket streaming
- **Firebase** - Authentication
- **TypeScript** - Type safety
- **Cheerio** - HTML parsing

## Try It Yourself

All code is open source:

**Repository:** [github.com/blueleader07/agent-core-stack](https://github.com/blueleader07/agent-core-stack)

**Quick start:**
```bash
git clone https://github.com/blueleader07/agent-core-stack
cd agent-core-stack/examples/converse-api
npm install && npm run deploy
```

Each example has:
- ✅ Complete CDK stack
- ✅ WebSocket integration
- ✅ Firebase auth
- ✅ Comprehensive README
- ✅ Working code

## What I'd Do Differently

1. **Start with Converse API** - I built Agent Core first, wish I'd started simple
2. **Keep shared components minimal** - Only extract what's truly shared
3. **Document as you go** - Writing READMEs after the fact is harder
4. **Test each pattern thoroughly** - Before moving to the next

## Future Improvements

- [ ] Add DynamoDB for conversation history
- [ ] Implement rate limiting
- [ ] Add more tool examples (database, APIs)
- [ ] Create video walkthrough
- [ ] Add frontend React example
- [ ] Benchmark performance under load

## Questions I Had

**Q: Do I need Agent Core for tool calling?**  
A: No! Inline Agents give you tool calling with more control.

**Q: Which is fastest?**  
A: Converse API (1-2s) < Inline (2-3s) < Agent Core (3-5s)

**Q: Which is cheapest?**  
A: Converse API ($6-8) < Inline ($7-9) < Agent Core ($9-11)

**Q: Can I use all three in one project?**  
A: Yes! They're independent examples.

**Q: Which should I deploy first?**  
A: Converse API - fastest to understand and validate.

## Conclusion

After building all three patterns, my advice is simple:

**Start with Converse API.** It's fast, cheap, and sufficient for most use cases. Graduate to Inline Agents when you need tools. Only use Agent Core for production multi-agent systems.

Don't over-engineer. The simplest solution is usually the best.

---

## Connect

- GitHub: [@blueleader07](https://github.com/blueleader07)
- Repository: [agent-core-stack](https://github.com/blueleader07/agent-core-stack)

---

## Social Media Snippets

### Twitter/X Thread

🧵 I built AWS Bedrock integrations 3 different ways with Claude Sonnet 4.5

Here's what I learned about choosing the right pattern 👇

1/ Three patterns:
- Converse API (simplest)
- Inline Agents (tool calling)
- Agent Core (production)

All use Claude 4.5, but very different use cases.

2/ Converse API: The MVP
- 5 min setup
- ~150 lines
- $6/mo for 1K conversations
- Perfect for 80% of use cases

Start here 👇
[link to converse-api example]

3/ Inline Agents: The Sweet Spot
- 10 min setup
- ~400 lines
- $7/mo
- Tool calling in YOUR code

When you need:
- URL fetching
- Calculations
- API calls
- Custom logic

[link to inline-agents example]

4/ Agent Core: Production Scale
- 15 min setup
- ~600 lines
- $9/mo
- AWS-managed agents

Only when you need:
- Multi-agent systems
- Built-in sessions
- Enterprise scale

[link to agent-core example]

5/ Key insight:
Simpler is better.

Start with Converse API. Graduate to Inline Agents for tools. Use Agent Core only for production multi-agent systems.

Don't over-engineer.

6/ All code is open source:
[link to repo]

Each example has:
✅ Working code
✅ CDK stack
✅ WebSocket streaming
✅ Firebase auth
✅ Comprehensive README

Star ⭐ if this helps!

### LinkedIn Post

🚀 I spent 2 weeks building AWS Bedrock integrations to figure out which pattern is best.

Here's what I learned:

**Three patterns, three use cases:**

🟢 Converse API ($6/mo) - Start here for chat/Q&A
🟡 Inline Agents ($7/mo) - Add when you need tools
🔴 Agent Core ($9/mo) - Production multi-agent systems

**Key insight:** Don't over-engineer. The simplest solution is usually the best.

All examples use Claude Sonnet 4.5 with WebSocket streaming and Firebase auth.

**Full comparison:**
- Setup time: 5 min → 10 min → 15 min
- Code complexity: 150 → 400 → 600 lines
- Latency: 1-2s → 2-3s → 3-5s

**All code is open source** with working examples, CDK stacks, and comprehensive READMEs.

👉 [link to repository]

What Bedrock pattern are you using? Let me know in the comments!

#AWS #Bedrock #Serverless #AI #MachineLearning #CloudComputing

### Dev.to / Medium Post

[Use the full blog content above]

---

*Last updated: January 2024*
