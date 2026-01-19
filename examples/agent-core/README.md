# AgentCore Runtime Example

**Advanced containerized agents with TypeScript SDK and ADOT observability**

## What is This?

This example demonstrates **AgentCore Runtime** - AWS's newest agent deployment pattern using containerized Lambda execution with the official TypeScript SDK. Unlike traditional Bedrock Agents (infrastructure-as-code), AgentCore Runtime provides:

- 🚀 **Runtime Configuration** - No CDK infrastructure for agent logic changes
- 🔧 **TypeScript SDK** - Direct programmatic control with `@aws/bedrock-agentcore-sdk-typescript`
- 📊 **ADOT Observability** - Built-in OpenTelemetry tracing and CloudWatch Application Signals
- 🛠️ **Rich Tool Ecosystem** - Code Interpreter, Browser, and custom tools via Vercel AI SDK
- ⚡ **Streaming Support** - Real-time responses via WebSocket

## What Makes This Different?

| Feature | Traditional Bedrock Agents | **AgentCore Runtime** |
|---------|----------------------------|----------------------|
| Agent Logic | CfnAgent infrastructure | TypeScript code with SDK |
| Tool Definition | OpenAPI schemas in CDK | Vercel AI SDK tools |
| Deployment Changes | CDK deploy required | Code deploy only |
| Observability | CloudWatch Metrics (delayed) | ADOT + Application Signals (real-time) |
| Development Speed | Slower (infrastructure changes) | Faster (code changes) |
| Control Level | AWS-managed orchestration | Full programmatic control |

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
│ AgentCore Runtime Lambda (Containerized) │
│ ┌─────────────────────────────────────┐ │
│ │ ToolLoopAgent (Vercel AI SDK v6)    │ │
│ │  ├── Claude Sonnet 4.5              │ │
│ │  ├── CodeInterpreter Tools          │ │
│ │  └── Browser Tools                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ADOT Layer (OpenTelemetry)              │
│  ├── X-Ray Tracing                      │
│  └── CloudWatch Application Signals     │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│ AWS Bedrock AgentCore Services          │
│  ├── Code Interpreter (secure sandbox)  │
│  └── Browser (cloud web automation)     │
└─────────────────────────────────────────┘
```

## Features

- ✅ **AgentCore TypeScript SDK** - Full programmatic control with `ToolLoopAgent`
- ✅ **Code Interpreter** - Execute Python code in secure sandboxed environment
- ✅ **Browser Automation** - Cloud-based web browsing and data extraction
- ✅ **WebSocket Streaming** - Real-time response streaming (up to 15 minutes)
- ✅ **ADOT Observability** - OpenTelemetry tracing + CloudWatch Application Signals
- ✅ **Firebase Auth** - Secure JWT-based authentication
- ✅ **Claude Sonnet 4.5** - Latest Anthropic model via Bedrock

## When to Use This Pattern

✅ **Use AgentCore Runtime when you need:**
- Real-time observability with ADOT and CloudWatch Application Signals
- Rapid iteration without infrastructure redeployment
- Full programmatic control over agent behavior
- Advanced tools (Code Interpreter, Browser)
- Container-based execution for complex dependencies
- Production-grade observability and monitoring

❌ **Don't use if you need:**
- Simple request/response (use converse-api)
- AWS-managed agent lifecycle (use bedrock-agents)
- Lowest possible latency (use inline-agents)
- Minimal AWS service dependencies (use inline-agents)

## Prerequisites

1. **AWS Account** with Bedrock access
2. **Bedrock Model Access** - Request access to Claude Sonnet 4.5
3. **AgentCore Access** - Enable Code Interpreter and Browser in Bedrock
4. **CloudWatch Application Signals** - Account-level setting enabled
5. **Firebase Project** - For authentication
6. **Node.js 20+**
7. **AWS CDK** - `npm install -g aws-cdk`

## Setup

### 1. Enable CloudWatch Observability

**⚠️ CRITICAL: THREE-PART SETUP REQUIRED for AgentCore observability to work!**

AgentCore observability requires both **account-level configuration** AND **container code instrumentation**. Missing either part will result in an empty dashboard showing 0/0 agents.

#### Step 1a: Enable Application Signals (Account-Level)

```bash
# Enable Application Signals in your AWS account
aws cloudwatch put-service-level-objective \
  --service-level-objective-name agentcore-runtime \
  --sli-config '{"MetricType":"ApplicationSignals"}' \
  --region us-east-1
```

Or enable via AWS Console: **CloudWatch > Application Signals > Get Started**

#### Step 1b: Enable Transaction Search (Account-Level)

```bash
# Enable Transaction Search for GenAI tracing
aws cloudwatch put-transaction-search-configuration \
  --transaction-search-configuration '{
    "transactionSearchEnabled": true,
    "cloudWatchLogsDestinationConfiguration": {
      "enabled": true
    },
    "probabilisticSamplingConfiguration": {
      "samplingPercentage": 1.0
    }
  }' \
  --region us-east-1
```

Or enable via AWS Console: **CloudWatch > Settings > Transaction Search**

#### Step 1c: Configure CloudWatch Log Delivery (Infrastructure)

**This is the non-intuitive part!** Even with Application Signals and Transaction Search enabled, AgentCore won't send traces/logs unless you configure CloudWatch Log Delivery resources. The CDK stack includes this automatically, but you need to understand what it does:

The stack creates:
- **DeliverySource** (APPLICATION_LOGS + TRACES) - Connects to your AgentCore Runtime
- **DeliveryDestination** (CloudWatch Logs + X-Ray) - Where the data goes
- **Delivery** - The connection between source and destination

Without these resources, **your AgentCore dashboard will show 0/0 agents** even after hours of waiting!

**Why this matters:**
- Application Signals and Transaction Search are **account-level settings**
- Log Delivery is **runtime-specific configuration**
- You must configure **both** for observability to work
- This is not documented clearly in AWS console - you'll just see empty dashboards

The CDK stack in this example includes the complete Log Delivery configuration. See lines 201-297 in `lib/agentcore-runtime-stack.ts` for the implementation.

#### Step 1d: Add ADOT SDK to Container Code (REQUIRED!)

**⚠️ THIS IS THE CRITICAL MISSING PIECE THAT'S NOT OBVIOUS!**

Even with all infrastructure configured, **you must instrument your container code with the OpenTelemetry SDK**. Without this, your agent will never generate traces, and the GenAI Observability dashboard will remain empty.

**What you need:**

1. **Install OpenTelemetry packages** (already included in this example):
   ```bash
   npm install @opentelemetry/api \
               @opentelemetry/sdk-node \
               @opentelemetry/auto-instrumentations-node \
               @opentelemetry/exporter-trace-otlp-http \
               @opentelemetry/instrumentation \
               @opentelemetry/sdk-trace-base
   ```

2. **Create a tracing initialization module** (`container/tracing.ts`):
   ```typescript
   import { NodeSDK } from '@opentelemetry/sdk-node';
   import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
   import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
   import { Resource } from '@opentelemetry/resources';
   import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

   const serviceName = process.env.OTEL_SERVICE_NAME || 'agentcore-runtime';
   const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

   const sdk = new NodeSDK({
     resource: new Resource({
       [ATTR_SERVICE_NAME]: serviceName,
       'cloud.provider': 'aws',
       'cloud.platform': 'aws_bedrock_agentcore',
       'cloud.region': process.env.AWS_REGION || 'us-east-1',
     }),
     traceExporter: new OTLPTraceExporter({
       url: `${otlpEndpoint}/v1/traces`,
     }),
     instrumentations: [
       getNodeAutoInstrumentations({
         '@opentelemetry/instrumentation-http': { enabled: true },
         '@opentelemetry/instrumentation-express': { enabled: true },
         '@opentelemetry/instrumentation-aws-sdk': { enabled: true },
       }),
     ],
   });

   sdk.start();
   console.log('OpenTelemetry SDK initialized');
   ```

3. **Load tracing module BEFORE your application** in `Dockerfile`:
   ```dockerfile
   # Update CMD to load OpenTelemetry before the application
   CMD ["node", "--require", "./dist/tracing.js", "dist/server.js"]
   ```

**Why this is required:**

For AgentCore Runtime hosted agents (like this example), AWS requires you to **add the ADOT SDK to your agent code**. The infrastructure (Log Delivery) provides the *destination* for traces, but your code must *generate* the traces.

**The flow:**
1. Your container code instruments operations using OpenTelemetry SDK
2. OTLP exporter sends traces to AgentCore Runtime's collector
3. Log Delivery configuration routes traces to X-Ray
4. GenAI Observability dashboard displays the data

**Without Step 1d:** Your infrastructure is ready to receive traces, but your code never generates any. Dashboard shows 0/0 agents forever.

**This example includes all ADOT setup automatically!** See:
- `container/tracing.ts` - OpenTelemetry SDK initialization
- `container/package.json` - All required OpenTelemetry packages
- `container/Dockerfile` - CMD configured to load tracing before app

**Reference**: 
- AWS AgentCore Observability Docs: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
- Based on AWS example: https://github.com/awslabs/amazon-bedrock-agentcore-samples

### 2. Configure Firebase

Create a `.env` file in the **repository root** (not in this directory):

```bash
# Root: /agent-core-stack/.env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----"
```

Get these credentials from: **Firebase Console > Project Settings > Service Accounts > Generate New Private Key**

### 3. Install Dependencies

```bash
npm install
```

### 4. Build TypeScript

```bash
npm run build
```

### 5. Deploy the Stack

```bash
npm run deploy
```

This will:
- Create AgentCore Runtime Lambda with ADOT layer
- Set up WebSocket API for streaming
- Configure IAM permissions for Bedrock AgentCore services
- Enable OpenTelemetry tracing and Application Signals
- Output the WebSocket URL

## How It Works

### AgentCore Runtime Lambda

The Lambda function uses the AgentCore TypeScript SDK:

```typescript
import { ToolLoopAgent } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { CodeInterpreterTools } from '@aws/bedrock-agentcore-sdk-typescript/code-interpreter/vercel-ai';
import { BrowserTools } from '@aws/bedrock-agentcore-sdk-typescript/browser/vercel-ai';

// Initialize AgentCore tools
const codeInterpreter = new CodeInterpreterTools({ region: 'us-east-1' });
const browser = new BrowserTools({ region: 'us-east-1' });

// Create agent with full programmatic control
const agent = new ToolLoopAgent({
  model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
  tools: {
    ...codeInterpreter.tools,
    ...browser.tools,
  },
  maxSteps: 15,
});

// Stream responses
const result = await agent.stream({ prompt: userMessage });
```

### ADOT Observability

The stack automatically configures:

1. **ADOT Lambda Layer** - AWS Distro for OpenTelemetry
2. **Environment Variables**:
   - `OTEL_SERVICE_NAME=agentcore-runtime`
   - `OTEL_RESOURCE_ATTRIBUTES=service.namespace=bedrock-agents`
   - `AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler`
3. **X-Ray Tracing** - Distributed tracing enabled
4. **CloudWatch Application Signals** - Real-time metrics and traces

### Tool Execution Flow

```
User sends message
    ↓
WebSocket receives
    ↓
AgentCore Lambda invokes ToolLoopAgent
    ↓
ToolLoopAgent analyzes prompt
    ↓
Executes tools as needed:
    ├── executeCode (Python in sandbox)
    ├── fileOperations (read/write files)
    ├── runCommand (shell commands)
    ├── navigate (browse web)
    └── getText (extract content)
    ↓
Streams response chunks
    ↓
Returns final result with metadata
```

## Testing

### Using the Web UI

1. **Start the web UI** (from repository root):
   ```bash
   cd web-ui
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Select "Agent Core" tab**

4. **Send test message**:
   ```
   Visit https://example.com and tell me what you find
   ```

### Direct WebSocket Testing

```bash
# Get WebSocket URL from CDK output
wscat -c "wss://your-websocket-url?token=your-firebase-jwt"

# Send message
{"action": "invoke-runtime", "message": "Calculate the fibonacci sequence up to 100"}
```

### Example Prompts

**Code Execution:**
```
Write a Python function to analyze CSV data and calculate the mean, median, and mode
```

**Web Browsing:**
```
Go to news.ycombinator.com and summarize the top 3 stories
```

**Combined Tools:**
```
Visit wikipedia.org/wiki/Python_(programming_language), 
extract the history section, and create a timeline chart using matplotlib
```

## Observability Dashboard

**⏰ Note: After deployment and first invocations, allow 5-15 minutes for traces to appear in X-Ray and the GenAI Observability dashboard.** CloudWatch Logs appear immediately, but X-Ray trace propagation has a delay.

### Success Criteria - What You Should See

After deploying and invoking your runtime, you should see:

**✅ GenAI Observability Dashboard (CloudWatch > GenAI Observability > Agents)**
```
Agents (1)                                    ← Should show "1", not "0"
┌────────────────────────────────────────────────────────────────┐
│ Name                  Environment        Sessions  Traces  Errors │
│ langgraph_agent...    bedrock-agentcore     3        3       0   │
│   DEFAULT             bedrock-agentcore     3        3       0   │
└────────────────────────────────────────────────────────────────┘

Overview
Agents/Endpoints: 1/1        ← This confirms observability is working!
Sessions: 3
Traces: 3
Error rate: 0%
Throttle rate: 0%
```

**✅ CloudWatch Logs** (appear immediately)
```bash
aws logs tail "/aws/vendedlogs/bedrock-agentcore/YOUR_RUNTIME_ID" --since 1h
# Should show JSON logs with trace_id, span_id, session_id
```

**✅ X-Ray Traces** (appear after 5-15 minutes)
- AWS Console > CloudWatch > X-Ray > Traces
- Shows distributed traces with AgentCore Runtime spans
- Service map shows connections to Bedrock models

**❌ If dashboard shows "Agents (0)" after 20+ minutes:**
- Missing ADOT SDK instrumentation in container code (see Setup Step 1d)
- Missing Log Delivery configuration (see Setup Step 1c)
- See Troubleshooting section below

### Viewing Traces

1. **AWS Console > CloudWatch > Application Signals**
2. Select **Service: agentcore-runtime**
3. View:
   - Request traces
   - Latency metrics
   - Error rates
   - Tool execution timing

**Verification Steps After Deployment:**
1. Invoke your AgentCore Runtime a few times via web UI or WebSocket
2. Check CloudWatch Logs immediately (should see logs right away):
   ```bash
   aws logs tail "/aws/vendedlogs/bedrock-agentcore/langgraph_agent_runtime-TEUJecAs2z" --since 1h --region us-east-1
   ```
3. Wait 5-15 minutes for X-Ray traces to propagate
4. Check GenAI Observability dashboard - **should show 1/1 agents** (not 0/0)
5. Click on your agent name to see detailed metrics and traces

### X-Ray Service Map

**AWS Console > X-Ray > Service Map**

Shows:
- AgentCore Lambda
- Bedrock model invocations
- Code Interpreter sessions
- Browser sessions
- Downstream dependencies

### Custom Metrics

The handler logs:
- Input/output tokens
- Tool execution count
- Response streaming time
- Session management

## Cost Considerations

AgentCore Runtime has different pricing than traditional Bedrock Agents:

| Component | Pricing |
|-----------|---------|
| **Claude Tokens** | $3/M input, $15/M output |
| **Lambda Execution** | $0.0000166667/GB-second |
| **Code Interpreter** | Per session + compute time |
| **Browser** | Per session + page loads |
| **ADOT Ingestion** | CloudWatch Logs pricing |
| **X-Ray Traces** | $5 per million traces |

**Estimated cost for 1,000 conversations:**
- Tokens: ~$5-10
- Lambda: ~$2-5
- AgentCore services: ~$10-15
- Observability: ~$3-5
- **Total: ~$20-35**

Higher than simple patterns but includes enterprise observability.

## Development Workflow

### Making Changes

1. **Update agent logic** in `lambda/agentcore-handler/index.ts`
2. **Build**: `npm run build`
3. **Deploy**: `npm run deploy`

No CDK infrastructure changes needed for:
- Changing prompts/instructions
- Adding/removing tools
- Modifying response handling
- Updating streaming logic

### Adding Custom Tools

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const myCustomTool = tool({
  description: 'Does something useful',
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    // Your logic here
    return { result: 'success' };
  },
});

const agent = new ToolLoopAgent({
  model: bedrock('...'),
  tools: {
    ...codeInterpreter.tools,
    ...browser.tools,
    myCustomTool,
  },
});
```

## Troubleshooting

### "AgentCore Dashboard Shows 0/0 Agents" or "No X-Ray Traces After Hours"

**Issue**: CloudWatch GenAI Observability dashboard shows 0/0 agents even though Application Signals and Transaction Search are enabled and you've invoked the runtime multiple times.

**Root Cause**: Two-part problem - BOTH must be fixed:

1. ❌ **Missing CloudWatch Log Delivery configuration** (infrastructure)
2. ❌ **Missing ADOT SDK instrumentation** (container code)

**What's Happening**:
1. ✅ Application Signals enabled (account-level setting)
2. ✅ Transaction Search enabled (account-level setting)
3. ❌ **Log Delivery NOT configured** (runtime-specific infrastructure)
4. ❌ **ADOT SDK NOT added to container code** (critical missing piece!)

**Why This Is Confusing**:
- AWS Console doesn't show any errors
- Runtime works perfectly (returns responses)
- Account-level settings appear correct
- CloudWatch Logs show activity with trace_id fields
- No indication that ADOT instrumentation is missing
- Documentation doesn't make the code requirement clear
- You'll just wait hours seeing nothing in the dashboard

**Solution Part 1 - Infrastructure**: The CDK stack in this example includes the complete Log Delivery configuration (lines 201-297 in `lib/agentcore-runtime-stack.ts`). It creates:

```typescript
// 1. Log Group for vended logs
const logGroup = new logs.LogGroup(this, 'AgentRuntimeLogs', {
  logGroupName: '/aws/vendedlogs/bedrock-agentcore/${RuntimeId}',
});

// 2. Delivery Source for APPLICATION_LOGS
new CfnResource(this, 'LogsDeliverySource', {
  type: 'AWS::Logs::DeliverySource',
  properties: {
    Name: '${RuntimeId}-logs-source',
    LogType: 'APPLICATION_LOGS',
    ResourceArn: agentCoreRuntime.getAtt('AgentRuntimeArn'),
  },
});

// 3. Delivery Destination (CloudWatch Logs)
new CfnResource(this, 'LogsDeliveryDestination', {
  type: 'AWS::Logs::DeliveryDestination',
  properties: {
    Name: '${RuntimeId}-logs-destination',
    DestinationResourceArn: logGroup.logGroupArn,
  },
});

// 4. Delivery Connection
new CfnResource(this, 'LogsDelivery', {
  type: 'AWS::Logs::Delivery',
  properties: {
    DeliverySourceName: '${RuntimeId}-logs-source',
    DeliveryDestinationArn: logsDeliveryDestination.getAtt('Arn'),
  },
});

// Same pattern for TRACES → X-Ray
```

**Solution Part 2 - Container Code Instrumentation** (THE CRITICAL PART!):

Even with Log Delivery configured, you MUST add the OpenTelemetry SDK to your container code. This example includes it automatically:

```typescript
// container/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'agentcore-runtime',
    'cloud.provider': 'aws',
    'cloud.platform': 'aws_bedrock_agentcore',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': { enabled: true },
    '@opentelemetry/instrumentation-express': { enabled: true },
    '@opentelemetry/instrumentation-aws-sdk': { enabled: true },
  })],
});

sdk.start();
```

```dockerfile
# container/Dockerfile
# Load OpenTelemetry BEFORE the application starts
CMD ["node", "--require", "./dist/tracing.js", "dist/server.js"]
```

**The Complete Flow**:
1. Your container code instruments operations using OpenTelemetry SDK
2. OTLP exporter sends traces to AgentCore Runtime's collector
3. Log Delivery configuration routes traces to X-Ray
4. GenAI Observability dashboard displays the data

**Without BOTH parts**:
- Infrastructure only: Ready to receive traces, but code never generates any → 0/0 agents
- Code only: Generates traces, but nowhere to send them → 0/0 agents

**After deploying with BOTH configured**:
- ✅ GenAI Observability dashboard shows your agent (1/1 instead of 0/0)
- ✅ X-Ray traces appear in console with full distributed tracing
- ✅ CloudWatch Logs show APPLICATION_LOGS with trace correlation
- ✅ Everything works as expected

**Reference**: This configuration pattern comes from https://github.com/awslabs/amazon-bedrock-agentcore-samples

### "Container returns 500 error" or "No response body"

**Issue**: AgentCore Runtime container fails to authenticate with Bedrock, returns HTTP 500.

**Root Cause**: Missing **Workload Identity** permissions. The container needs special permissions to obtain temporary AWS credentials via the AgentCore service.

**Solution**: Add Workload Identity permissions to the AgentCore Runtime IAM role:

```typescript
// In agentcore-runtime-stack.ts
agentCoreRole.addToPolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    'bedrock-agentcore:GetWorkloadAccessToken',
    'bedrock-agentcore:GetWorkloadAccessTokenForJwt',
    'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
  ],
  resources: [
    `arn:aws:bedrock-agentcore:${this.region}:${this.account}:workload-identity-directory/*`,
  ],
}));
```

**Why This Matters**: 
- The container doesn't have direct AWS credentials
- It must call `bedrock-agentcore:GetWorkloadAccessToken` to get temporary credentials
- Without these permissions, all Bedrock API calls fail with 500 errors
- This is different from standard IAM roles - it's a special AgentCore authentication mechanism

**Reference**: See AWS sample at `github.com/awslabs/amazon-bedrock-agentcore-samples` for the complete `AgentCoreRole` implementation.

### "Application Signals not enabled"

Enable CloudWatch Application Signals:
```bash
aws cloudwatch put-service-level-objective \
  --service-level-objective-name agentcore-runtime \
  --sli-config '{"MetricType":"ApplicationSignals"}' \
  --region us-east-1
```

### "Code Interpreter session failed"

Check IAM permissions:
```typescript
bedrock-agentcore:StartCodeInterpreterSession
bedrock-agentcore:ExecuteCode
bedrock-agentcore:StopCodeInterpreterSession
```

### "No traces in X-Ray"

Verify ADOT layer is attached:
```bash
aws lambda get-function --function-name <your-function-name> \
  --query 'Configuration.Layers'
```

### High latency

- Code Interpreter sessions have cold start (~3-5s)
- Browser sessions need page load time
- Consider connection pooling for production

## Advanced Configuration

### Custom ADOT Sampling

Update `lambda/agentcore-handler/adot-config.ts`:

```typescript
export const adotConfig = {
  tracingEnabled: true,
  samplingRate: 0.1, // Sample 10% of requests
  captureHTTPRequests: true,
};
```

### Session Management

AgentCore tools maintain sessions automatically:

```typescript
// Sessions auto-start on first use
await agent.stream({ prompt: 'Execute Python code' });

// Cleanup on disconnect
await codeInterpreter.stopSession();
await browser.stopSession();
```

## Comparison with Other Patterns

| Aspect | Converse API | Inline Agents | Bedrock Agents | **AgentCore Runtime** |
|--------|--------------|---------------|----------------|----------------------|
| Complexity | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Control | High | High | Medium | **Highest** |
| Observability | Basic | Basic | Delayed | **Real-time (ADOT)** |
| Tool Ecosystem | None | Custom | Action Groups | **SDK Tools** |
| Deployment Speed | Fast | Fast | Slow | **Fast (code only)** |
| Infrastructure | Minimal | Minimal | Heavy (CfnAgent) | **Minimal (Lambda)** |
| Cost (1K convos) | $6-8 | $7-9 | $15-25 | **$20-35** |

## Learn More

- **AgentCore TypeScript SDK**: https://github.com/aws/bedrock-agentcore-sdk-typescript
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **ADOT for Lambda**: https://aws-otel.github.io/docs/getting-started/lambda
- **CloudWatch Application Signals**: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals.html

## Next Steps

1. ✅ Deploy this example
2. ✅ Test with web UI
3. ✅ View traces in CloudWatch Application Signals
4. ✅ Try Code Interpreter and Browser tools
5. ✅ Add custom tools for your use case
6. ✅ Monitor costs and observability metrics
7. ✅ Compare with other patterns (bedrock-agents, inline-agents)
