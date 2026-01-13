# Three Ways to Build Production AI Agents with AWS Bedrock (And Why It Matters)

*A practical guide to choosing the right AWS Bedrock integration pattern for your AI application*

---

When I started exploring AWS Bedrock for building AI agents, I hit the same wall everyone does: **"Which API should I use?"**

The AWS documentation presents you with multiple paths — Converse API, Runtime API, Agents for Bedrock — but doesn't clearly explain *when* to use each one or *why* you'd choose one over another.

After building production systems with all three approaches, I've created a hands-on guide that shows exactly how each pattern works, what it costs, and when to use it.

## The Three Patterns (From Simple to Sophisticated)

Think of these as **three levels of a video game** — each unlocks new capabilities, but also adds complexity.

But here's the key distinction that matters: **Agent Core agents are infrastructure. The other patterns are runtime behavior.**

### The Infrastructure vs. Runtime Divide

**Agent Core agents** are defined and deployed with CDK (Infrastructure as Code), just like API Gateway or Lambda. Their instructions, tools, and permissions are set at deploy time, live in source control, and move through CI/CD pipelines. You cannot change an Agent Core agent's instructions at runtime — changes require a redeploy.

**Converse API and Inline Agents** let you supply instructions, tools, and behavior dynamically at runtime. Want to change the agent's personality? Update a database field. Need different tools? Pass them in the API call. No deployment required.

This isn't just a technical detail — it's a **fundamental architectural choice** that affects governance, flexibility, and operational complexity.

---

### Level 1: Converse API — The "Just Chat" Pattern
**Complexity:** ⭐ Low | **Setup:** 5 minutes | **Cost:** $6-8/1K conversations

This is your **direct line to Claude**. One API call, streaming responses, done.

```typescript
const response = await bedrock.converse({
  modelId: 'claude-sonnet-4-5',
  messages: [{ role: 'user', content: [{ text: 'Hello!' }] }]
});
```

**Architecture:** Runtime behavior wrapped in your application code. Instructions and model selection happen at runtime.

**When to use this:**
- Building a chat interface
- Q&A systems
- Content generation
- Learning Bedrock for the first time
- Prototyping ideas quickly
- Dynamic instructions (e.g., from a database)

**The catch:** No built-in tool calling. If your AI needs to fetch data, call APIs, or use functions, you'll need to handle that manually.

**Governance tradeoff:** Maximum flexibility, but you own all operational concerns — observability, monitoring, cost controls, and guardrails.

### Level 2: Inline Agents — The "Code Your Own Agent" Pattern
**Complexity:** ⭐⭐ Medium | **Setup:** 10 minutes | **Cost:** $7-9/1K conversations

This is where you **write the agent logic yourself** using Converse API's tool calling feature. You define tools, instructions, and orchestration at runtime.

```typescript
// YOU control the agent loop
while (needsMoreTools) {
  const response = await bedrock.converse({ tools, messages });
  
  if (response.stopReason === 'tool_use') {
    const result = await executeTool(response.toolUse);
    messages.push({ toolResult: result });
  }
}
```

**Architecture:** Runtime agent behavior. Tools, instructions, and orchestration logic supplied dynamically at runtime via a single API call.

**When to use this:**
- You need custom tool integrations
- Fast iteration on agent behavior
- Fine-grained control over orchestration
- Cost optimization (you control when to stop)
- Building multiple specialized mini-agents
- Dynamic agent configurations (different tools per user/session)

**The catch:** You're responsible for the agent loop, error handling, and orchestration logic.

**Governance tradeoff:** More structure than raw Converse API calls, but still runtime-configured. Great for experimentation and dynamic use cases without pre-deploying infrastructure.

### Level 3: Agent Core — The "AWS Manages Everything" Pattern
**Complexity:** ⭐⭐⭐ High | **Setup:** 15 minutes | **Cost:** $15-25/1K conversations

AWS Bedrock **manages the entire agent lifecycle** for you — orchestration, memory, sessions, everything. But here's the crucial difference: **Agent Core agents are infrastructure**, not runtime behavior.

```typescript
const agent = new bedrock.CfnAgent({
  foundationModel: 'claude-sonnet-4-5',
  actionGroups: [urlFetcher, calculator, database],
  instructions: 'You are a helpful assistant...',  // Set at deploy time
  // AWS handles the rest
});
```

**Architecture:** Deployed infrastructure (CDK/CloudFormation). Instructions, tools, and permissions are defined in code, versioned in Git, and deployed through CI/CD. Changes require a redeploy.

**When to use this:**
- Production multi-tool workflows
- You need consistency, reviewability, and governance
- Complex agent coordination
- Built-in memory and session management
- Multiple action groups working together
- Enterprise compliance requirements (audit trails, change controls)
- Agent appears in AWS Bedrock console dashboard

**The catch:** Higher cost (2-3x more), slower iteration (CDK deployments), less control over agent behavior, **cannot change instructions at runtime**.

**Governance tradeoff:** Maximum governance and AWS management, minimum runtime flexibility. Perfect when you want agents treated as reviewed, deployed infrastructure.

## The Real Cost Comparison (Not Just Tokens)

Here's where things get interesting. Most cost breakdowns only show you LLM token pricing. But there's a **hidden cost difference** that matters:

**For 1,000 conversations with 60-second sessions:**

| Component | Converse API | Inline Agents | Agent Core |
|-----------|--------------|---------------|------------|
| **LLM Tokens** | $5-7 | $6-8 | $8-10 |
| **Runtime Compute** | — | — | **$7-15** ⚠️ |
| Lambda | $0.10 | $0.20 | $0.20 |
| Gateway + Logs | $0.53 | $0.53 | $0.53 |
| **Total** | **$6-8** | **$7-9** | **$15-25** |

**Why is Agent Core 2-3x more expensive?**

Converse API and Inline Agents only charge you for:
- LLM tokens used
- Lambda execution time (milliseconds)

Agent Core charges you for:
- LLM tokens used
- **CPU:** $0.0895/vCPU-hour (charged per second)
- **Memory:** $0.00945/GB-hour (charged continuously)
- **Runtime:** The entire session duration, not just processing time

A 60-second Agent Core session costs ~$0.015 in runtime charges alone — that's **before** you even count the LLM tokens.

## When Cost Matters (And When It Doesn't)

**Start with Converse API** if you're:
- Learning Bedrock
- Prototyping
- Building simple chat interfaces
- Cost-conscious at scale

**Use Inline Agents** when you need:
- Custom tool integrations
- Control over agent behavior
- Fast iteration during development
- Cost optimization at scale

**Use Agent Core** when:
- Development speed > runtime cost
- You need AWS-managed infrastructure
- Complex multi-tool orchestration is required
- The 2-3x cost premium is justified by reduced engineering time

## The Architecture (What You're Actually Building)

All three patterns share the same foundation:

```
┌─────────────┐
│   React UI  │ ← User types message
└──────┬──────┘
       │ WebSocket + Firebase JWT
       ↓
┌──────────────────┐
│  API Gateway WS  │ ← Validates token
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  Lambda Handler  │ ← Different for each pattern
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  AWS Bedrock     │ ← Claude Sonnet 4.5
│  (Claude API)    │
└──────────────────┘
```

The **only difference** between patterns is what happens in the Lambda handler:

- **Converse API:** Single API call, stream response back
- **Inline Agents:** Loop with tool calling, you write the logic
- **Agent Core:** Call AWS Agent service, it handles everything

## Real-World Example: URL Fetcher Agent

Let me show you how the same feature looks in each pattern.

**Goal:** Agent that can fetch and summarize web pages.

### Converse API Implementation
```typescript
// You handle everything manually
const userMessage = "Summarize https://aws.amazon.com";

// Extract URL yourself
const url = extractUrl(userMessage);
const content = await fetch(url).then(r => r.text());

// Add to context
const response = await bedrock.converse({
  messages: [{
    role: 'user',
    content: `Here's the content: ${content}. Summarize it.`
  }]
});
```

**Lines of code:** ~50
**Control level:** Maximum
**Iteration speed:** Instant (just redeploy Lambda)

### Inline Agents Implementation
```typescript
// Define tool, agent calls it
const tools = [{
  name: 'fetch_url',
  description: 'Fetch content from URL',
  inputSchema: { type: 'object', properties: { url: { type: 'string' } } }
}];

while (true) {
  const response = await bedrock.converse({ tools, messages });
  
  if (response.stopReason === 'tool_use') {
    const { url } = response.content.toolUse.input;
    const content = await fetch(url).then(r => r.text());
    messages.push({ toolResult: { content } });
  } else {
    break;
  }
}
```

**Lines of code:** ~80
**Control level:** High
**Iteration speed:** Fast (redeploy Lambda)

### Agent Core Implementation
```typescript
// Create action group (one-time setup)
const actionGroup = new bedrock.CfnActionGroup({
  actionGroupName: 'UrlFetcher',
  apiSchema: { /* OpenAPI schema */ },
  actionGroupExecutor: lambdaArn
});

// Use it (runtime)
const response = await bedrockAgent.invokeAgent({
  agentId: 'agent-123',
  sessionId: 'session-456',
  inputText: 'Summarize https://aws.amazon.com'
});
// AWS handles tool detection, calling, orchestration
```

**Lines of code:** ~150 (includes CDK setup)
**Control level:** Medium
**Iteration speed:** Slow (CDK deploy + agent prep time)

## The Part Nobody Tells You: Token Tracking

Here's a gotcha that took me hours to figure out:

**Converse API & Inline Agents:**
- Token usage comes in real-time with the response
- You can display costs immediately in your UI
- Perfect for user-facing cost transparency

**Agent Core:**
- Token usage is **NOT** exposed in the API response
- You must query CloudWatch Metrics (5-15 minute delay)
- No real-time cost tracking possible

If you're building a usage-based pricing model, this matters a lot.

## My Recommendation (After Building All Three)

**For 95% of use cases, start with Inline Agents.**

Here's why:

✅ **Best balance** of control vs. complexity
✅ **Fast iteration** (just redeploy Lambda)
✅ **Cost-effective** at scale
✅ **Real-time metrics** (token tracking works)
✅ **Full control** over agent behavior
✅ **Easy debugging** (it's just your code)
✅ **Runtime flexibility** (change instructions without redeploying)

**Use Converse API** if you literally just need chat with no tools.

**Use Agent Core** only when:
- You need agents as **reviewed, deployed infrastructure**
- Enterprise governance requirements (change controls, audit trails)
- Complex multi-action-group orchestration
- AWS-managed sessions and memory are worth the cost premium
- You want agents visible in the Bedrock console dashboard
- Changes going through CI/CD is a feature, not a bug

## The Governance Question Nobody Asks

Here's the decision most teams overlook:

**"Do you want your agent's behavior defined in code (deployed) or in data (runtime)?"**

### Choose Deployed Infrastructure (Agent Core) when:
- Agent instructions should be code-reviewed
- Changes must go through CI/CD pipelines
- Compliance requires audit trails of agent modifications
- Multiple teams need visibility into agent definitions
- Rollback capabilities are critical
- You want "infrastructure as code" principles for AI agents

### Choose Runtime Behavior (Converse/Inline) when:
- You need to A/B test different instructions
- Agent personality varies per user/tenant
- Instructions stored in a database
- Fast iteration matters more than governance
- You want to update behavior without deployments
- Development speed > operational controls

## Getting Started (5-Minute Setup)

I've built a complete working example for all three patterns:

```bash
# Clone the repo
git clone https://github.com/blueleader07/agent-core-stack.git
cd agent-core-stack

# Pick your pattern
cd examples/converse-api/     # or inline-agents/ or agent-core/

# Deploy
npm install
npm run deploy

# You'll get a WebSocket URL
# Connect from your app and start chatting
```

Each example includes:
- ✅ Complete CDK infrastructure
- ✅ Firebase authentication
- ✅ WebSocket streaming
- ✅ TypeScript with full types
- ✅ Ready-to-deploy code

## The Learning Path I Recommend

**Week 1:** Deploy and play with Converse API
- Understand Bedrock basics
- Learn streaming responses
- See how simple it can be

**Week 2:** Build something with Inline Agents
- Add tool calling
- Implement custom logic
- Control orchestration yourself

**Week 3:** Try Agent Core (if you need it)
- Compare the managed experience
- Evaluate if the cost/complexity tradeoff makes sense
- Decide which pattern fits your production needs

## Common Pitfalls (And How to Avoid Them)

**❌ Mistake 1:** Starting with Agent Core because it sounds "production-ready"
**✅ Fix:** Start simple. Agent Core's complexity is only worth it for specific governance/infrastructure use cases.

**❌ Mistake 2:** Not accounting for runtime compute costs
**✅ Fix:** Calculate total cost including CPU/Memory charges, not just LLM tokens.

**❌ Mistake 3:** Expecting real-time cost tracking from Agent Core
**✅ Fix:** Use CloudWatch Metrics and accept the delay, or switch to Inline Agents.

**❌ Mistake 4:** Hard-coding agent logic instead of using tools
**✅ Fix:** If you need tools more than once, use Inline Agents or Agent Core.

**❌ Mistake 5:** Treating runtime agents like deployed infrastructure
**✅ Fix:** If you're using Converse/Inline, embrace the flexibility. Store instructions in a database, A/B test prompts, iterate fast.

**❌ Mistake 6:** Using Agent Core when you need dynamic instructions
**✅ Fix:** Agent Core instructions are set at deploy time. If you need runtime variability, use Inline Agents.

## The Future of These Patterns

AWS is actively developing Bedrock, and I expect to see:

- **Converse API:** More features (vision, PDFs, extended context)
- **Inline Agents:** Better tool calling primitives, streaming tool results
- **Agent Core:** Lower costs, faster cold starts, better observability

But the **fundamental tradeoff** will remain:
- **Converse:** Maximum control, minimum abstraction
- **Inline:** Balance of control and convenience
- **Agent Core:** Minimum control, maximum AWS management

## Final Thoughts

Building AI agents isn't about picking the "best" API — it's about **matching the pattern to your needs**.

I've shipped production systems with all three patterns:
- **Converse API** for a simple chat interface (5M+ messages)
- **Inline Agents** for a research assistant with 12 custom tools
- **Agent Core** for an enterprise workflow requiring AWS compliance

Each had different requirements, and each pattern was the right choice for its use case.

**The key is knowing the tradeoffs before you build.**

---

## Try It Yourself

The complete code for all three patterns is open source:

**GitHub:** [github.com/blueleader07/agent-core-stack](https://github.com/blueleader07/agent-core-stack)

Includes:
- 🚀 One-command deployment for each pattern
- 📊 Side-by-side comparison UI
- 💰 Real-time cost tracking (Converse/Inline)
- 📚 Complete documentation
- 🔐 Firebase auth integration
- ⚡ WebSocket streaming

**Deploy in 5 minutes. Compare all three patterns. Choose the right one for your project.**

---

*Questions? Hit me up in the comments or open an issue on GitHub. Happy to help you choose the right pattern for your use case.*

---

## More Resources

- **[AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)**
- **[Claude API Reference](https://docs.anthropic.com/)**
- **[Full Project README](https://github.com/blueleader07/agent-core-stack/blob/main/README.md)**

---

*Sean McKeon builds AI agents at scale. Previously led engineering teams at [Your Company]. Currently helping developers navigate the AWS Bedrock ecosystem.*
