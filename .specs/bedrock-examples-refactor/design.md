# Bedrock Examples Refactor - Design Specification

## System Architecture Overview

```
agent-core-stack/
├── examples/
│   ├── agent-core/           # Full Bedrock Agent (current implementation)
│   ├── inline-agents/        # Inline agents pattern
│   └── converse-api/         # Direct Converse API
├── shared/
│   ├── auth/                 # Firebase authentication
│   ├── websocket/            # WebSocket utilities
│   ├── constructs/           # Common CDK constructs
│   └── types/                # Shared TypeScript types
├── .specs/                   # Specification documents
├── README.md                 # Main documentation
├── BLOG.md                   # Social media content
└── package.json              # Root dependencies
```

## Pattern Comparison

| Aspect | Converse API | Inline Agents | Agent Core |
|--------|-------------|---------------|------------|
| **Complexity** | Lowest | Medium | Highest |
| **Latency** | ~1-2s | ~2-3s | ~3-5s |
| **Cost** | Lowest | Low | Medium |
| **Flexibility** | Highest | High | Medium |
| **Setup Time** | 5 min | 10 min | 15 min |
| **Use Case** | Simple chat, prototyping | Multi-tool apps, custom logic | Production multi-agent systems |
| **Debugging** | Easiest | Easy | Complex |
| **Iteration Speed** | Fastest | Fast | Slower |

## Example 1: Agent Core (Existing)

### Architecture

```
[React App] ──JWT──> [WebSocket API] ──> [WebSocket Lambda]
                           │                      │
                           │                      ├──> [Bedrock Agent Service]
                           │                      │         │
                           └── [Authorizer] ───┘         └──> [Action Group Lambda]
                                                                      │
                                                                      └──> [URL Fetcher]
```

### Components

**Stack: `examples/agent-core/lib/agent-core-stack.ts`**

1. **Bedrock Agent**
   - Model: Claude Sonnet 4.5 (inference profile)
   - Action Groups: URL fetcher
   - Permissions: Marketplace, model access

2. **WebSocket Lambda** (`lambda/websocket-agent/`)
   - Handles WebSocket connections
   - Streams Bedrock Agent responses
   - Manages session state

3. **URL Fetcher Lambda** (`lambda/url-fetcher/`)
   - Cheerio-based HTML parsing
   - Article extraction
   - Metadata extraction

4. **Firebase Authorizer** (→ moved to shared)
   - JWT validation
   - User context extraction

### File Structure
```
examples/agent-core/
├── lib/
│   └── agent-core-stack.ts
├── lambda/
│   ├── websocket-agent/
│   │   ├── index.ts
│   │   └── package.json
│   └── url-fetcher/
│       ├── index.ts
│       └── package.json
├── bin/
│   └── agent-core.ts
├── cdk.json
├── package.json
├── tsconfig.json
└── README.md
```

### Key Features
- Full Bedrock Agent with action groups
- Production-ready authentication
- Streaming responses
- URL content extraction
- Claude Sonnet 4.5

### When to Use
- Production multi-tool workflows
- Need managed agent orchestration
- Complex multi-step tasks
- Audit trail via Bedrock service

## Example 2: Inline Agents (New)

### Architecture

```
[React App] ──JWT──> [WebSocket API] ──> [Router Lambda]
                           │                    │
                           │                    ├──> [Calculator Agent Lambda]
                           │                    ├──> [Weather Agent Lambda]
                           └── [Authorizer] ─┘  ├──> [Memory Agent Lambda]
                                                └──> [Tool Use Agent Lambda]
                                                          │
                                                          └──> [Bedrock Converse API]
```

### Components

**Stack: `examples/inline-agents/lib/inline-agents-stack.ts`**

1. **Router Lambda** (`lambda/router/`)
   - Analyzes user intent
   - Routes to appropriate agent
   - Combines responses
   - Streams results via WebSocket

2. **Calculator Agent** (`lambda/agents/calculator/`)
   - Handles math operations
   - Uses tool calling to execute calculations
   - Returns formatted results

3. **Weather Agent** (`lambda/agents/weather/`)
   - Mock weather API integration
   - Demonstrates external API pattern
   - Shows async tool execution

4. **Memory Agent** (`lambda/agents/memory/`)
   - DynamoDB for conversation history
   - Stateful interactions
   - Context retrieval

5. **Tool Use Agent** (`lambda/agents/tools/`)
   - Generic tool calling pattern
   - Multiple function definitions
   - Function result formatting

### File Structure
```
examples/inline-agents/
├── lib/
│   └── inline-agents-stack.ts
├── lambda/
│   ├── router/
│   │   ├── index.ts
│   │   └── package.json
│   └── agents/
│       ├── calculator/
│       │   ├── index.ts
│       │   ├── tools.ts
│       │   └── package.json
│       ├── weather/
│       │   ├── index.ts
│       │   ├── tools.ts
│       │   └── package.json
│       ├── memory/
│       │   ├── index.ts
│       │   ├── dynamodb.ts
│       │   └── package.json
│       └── tools/
│           ├── index.ts
│           ├── tool-definitions.ts
│           └── package.json
├── bin/
│   └── inline-agents.ts
├── cdk.json
├── package.json
├── tsconfig.json
└── README.md
```

### Agent Routing Logic

```typescript
// lambda/router/index.ts
async function routeToAgent(message: string, userId: string) {
  // Use Claude to categorize intent
  const intent = await categorizeIntent(message);
  
  switch (intent) {
    case 'calculator':
      return await invokeAgent('calculator', message);
    case 'weather':
      return await invokeAgent('weather', message);
    case 'memory':
      return await invokeAgent('memory', message, userId);
    case 'tools':
      return await invokeAgent('tools', message);
    default:
      return await fallbackResponse(message);
  }
}
```

### Key Features
- Multiple specialized agents
- Fast iteration (no CDK deploy for logic changes)
- Fine-grained control
- Easy debugging
- Direct Converse API usage
- Custom tool definitions

### When to Use
- Need custom agent logic
- Want fast development iteration
- Multiple specialized sub-agents
- Fine control over orchestration
- Cost-sensitive applications

## Example 3: Converse API (New)

### Architecture

```
[React App] ──JWT──> [WebSocket API] ──> [Converse Lambda]
                           │                      │
                           │                      └──> [Bedrock Converse API]
                           │                                  │
                           └── [Authorizer] ───────────┘     └──> Claude Sonnet 4.5
```

### Components

**Stack: `examples/converse-api/lib/converse-api-stack.ts`**

1. **Converse Lambda** (`lambda/converse/`)
   - Direct Bedrock Converse API calls
   - Streaming response handling
   - Function calling support
   - Conversation history management

2. **Function Definitions** (`lambda/converse/functions/`)
   - `get_weather`: Mock weather lookup
   - `calculate`: Math operations
   - `search_knowledge`: Mock knowledge base
   - `get_current_time`: Time utilities

### File Structure
```
examples/converse-api/
├── lib/
│   └── converse-api-stack.ts
├── lambda/
│   └── converse/
│       ├── index.ts
│       ├── functions/
│       │   ├── weather.ts
│       │   ├── calculator.ts
│       │   ├── knowledge.ts
│       │   └── time.ts
│       ├── types.ts
│       └── package.json
├── bin/
│   └── converse-api.ts
├── cdk.json
├── package.json
├── tsconfig.json
└── README.md
```

### Converse API Integration

```typescript
// lambda/converse/index.ts
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

async function streamResponse(message: string, history: Message[]) {
  const command = new ConverseStreamCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    messages: [...history, { role: 'user', content: [{ text: message }] }],
    inferenceConfig: {
      temperature: 0.7,
      maxTokens: 2048,
    },
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: 'get_weather',
            description: 'Get weather for a location',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                },
                required: ['location'],
              },
            },
          },
        },
        // ... more tools
      ],
    },
  });

  const response = await bedrockClient.send(command);
  
  // Stream chunks to WebSocket
  for await (const chunk of response.stream) {
    if (chunk.contentBlockDelta) {
      await sendToWebSocket(chunk.contentBlockDelta.delta.text);
    }
    if (chunk.toolUse) {
      const result = await executeFunction(chunk.toolUse);
      // Send tool result back to model...
    }
  }
}
```

### Key Features
- Simplest possible pattern
- Direct model access
- Streaming built-in
- Function calling
- Conversation history
- Full control over prompts

### When to Use
- Learning Bedrock basics
- Rapid prototyping
- Simple chatbots
- Need maximum control
- Cost-sensitive MVP
- Low latency critical

## Shared Components

### Location: `shared/`

### 1. Firebase Authorizer

**File: `shared/auth/firebase-authorizer.ts`**

```typescript
import * as admin from 'firebase-admin';

export async function validateFirebaseToken(token: string) {
  const decodedToken = await admin.auth().verifyIdToken(token);
  return {
    userId: decodedToken.uid,
    email: decodedToken.email,
    emailVerified: decodedToken.email_verified,
  };
}

export function createAuthorizerResponse(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }],
    },
    context,
  };
}
```

**Usage in each example:**
```typescript
import { validateFirebaseToken, createAuthorizerResponse } from '../../../shared/auth/firebase-authorizer';
```

### 2. WebSocket Utilities

**File: `shared/websocket/utils.ts`**

```typescript
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

export class WebSocketManager {
  private client: ApiGatewayManagementApiClient;

  constructor(endpoint: string) {
    this.client = new ApiGatewayManagementApiClient({ endpoint });
  }

  async sendMessage(connectionId: string, message: string) {
    await this.client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(message),
    }));
  }

  async sendChunk(connectionId: string, chunk: string, isLast: boolean = false) {
    await this.sendMessage(connectionId, JSON.stringify({
      type: isLast ? 'complete' : 'chunk',
      content: chunk,
    }));
  }

  async sendError(connectionId: string, error: string) {
    await this.sendMessage(connectionId, JSON.stringify({
      type: 'error',
      message: error,
    }));
  }
}
```

### 3. Common CDK Constructs

**File: `shared/constructs/firebase-authorizer.ts`**

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class FirebaseAuthorizerConstruct extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.function = new lambda.Function(this, 'AuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../../shared/auth'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
      },
    });
  }
}
```

### 4. Shared Types

**File: `shared/types/index.ts`**

```typescript
export interface WebSocketMessage {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  message?: string;
}

export interface UserContext {
  userId: string;
  email: string;
  emailVerified: boolean;
}

export interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}
```

## Deployment Configuration

### Root Package.json

```json
{
  "name": "bedrock-examples",
  "version": "1.0.0",
  "scripts": {
    "build": "npm run build:agent-core && npm run build:inline && npm run build:converse",
    "build:agent-core": "cd examples/agent-core && npm run build",
    "build:inline": "cd examples/inline-agents && npm run build",
    "build:converse": "cd examples/converse-api && npm run build",
    "deploy:all": "npm run deploy:agent-core && npm run deploy:inline && npm run deploy:converse",
    "deploy:agent-core": "cd examples/agent-core && npm run deploy",
    "deploy:inline": "cd examples/inline-agents && npm run deploy",
    "deploy:converse": "cd examples/converse-api && npm run deploy",
    "test": "npm run test:agent-core && npm run test:inline && npm run test:converse",
    "test:agent-core": "cd examples/agent-core && npm test",
    "test:inline": "cd examples/inline-agents && npm test",
    "test:converse": "cd examples/converse-api && npm test"
  },
  "workspaces": [
    "examples/agent-core",
    "examples/inline-agents",
    "examples/converse-api",
    "shared/*"
  ]
}
```

### Example Package.json Template

```json
{
  "name": "@bedrock-examples/agent-core",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "deploy": "cdk deploy --require-approval never",
    "destroy": "cdk destroy",
    "synth": "cdk synth",
    "test": "jest"
  },
  "devDependencies": {
    "aws-cdk": "^2.149.0",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.149.0",
    "constructs": "^10.0.0"
  }
}
```

## Data Flow Diagrams

### Agent Core Flow
```
User Message
    ↓
WebSocket API
    ↓
WebSocket Lambda
    ↓
Bedrock Agent Service
    ↓
Action Group (if tool called)
    ↓
URL Fetcher Lambda (cheerio extraction)
    ↓
Bedrock Agent (synthesis)
    ↓
WebSocket Lambda (streaming)
    ↓
User receives chunks
```

### Inline Agents Flow
```
User Message
    ↓
WebSocket API
    ↓
Router Lambda
    ├─> Categorize intent (Claude)
    ↓
Agent Lambda (calculator/weather/memory/tools)
    ├─> Call Converse API with tools
    ├─> Execute tool if requested
    ├─> Send result back to model
    ↓
Router Lambda (streaming)
    ↓
User receives chunks
```

### Converse API Flow
```
User Message
    ↓
WebSocket API
    ↓
Converse Lambda
    ├─> Build message history
    ├─> Call ConverseStream
    ├─> Handle tool use
    ├─> Execute functions
    ↓
Stream chunks to WebSocket
    ↓
User receives chunks
```

## Security Architecture

### Authentication Flow (All Examples)

```
[React App]
    ↓ Login
[Firebase Auth]
    ↓ ID Token
[WebSocket Connection] ?token=<jwt>
    ↓
[API Gateway]
    ↓ Invoke Authorizer
[Firebase Authorizer Lambda]
    ├─> Verify JWT with Firebase
    ├─> Extract user context
    ↓
[Allow/Deny Policy]
    ↓ (if Allow)
[Example Lambda] (with user context)
```

### IAM Permissions

**Agent Core:**
- Bedrock: InvokeAgent, InvokeModel
- Marketplace: ViewSubscriptions, Subscribe
- Lambda: Invoke (for action groups)

**Inline Agents:**
- Bedrock: InvokeModel (Converse API)
- DynamoDB: GetItem, PutItem, Query (memory agent)
- Lambda: Invoke (for agent routing)

**Converse API:**
- Bedrock: InvokeModel (Converse API only)

## Cost Estimation

### Per 1000 Requests

| Example | API Gateway | Lambda | Bedrock | Total |
|---------|------------|--------|---------|-------|
| Agent Core | $1.00 | $0.20 | $12.00* | ~$13.20 |
| Inline Agents | $1.00 | $0.15 | $10.00 | ~$11.15 |
| Converse API | $1.00 | $0.10 | $10.00 | ~$11.10 |

*Agent Core higher due to action group overhead

## Testing Strategy

### Unit Tests
- Shared utilities (WebSocket, auth)
- Function definitions (inline agents, converse)
- Tool execution logic

### Integration Tests
- WebSocket connection flow
- Authentication validation
- Model response streaming
- Function calling end-to-end

### Example Test
```typescript
// examples/converse-api/test/converse.test.ts
describe('Converse API', () => {
  it('should stream response chunks', async () => {
    const ws = await connectWebSocket(TEST_URL, TEST_TOKEN);
    ws.send(JSON.stringify({ message: 'Hello' }));
    
    const chunks: string[] = [];
    await new Promise((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'chunk') chunks.push(msg.content);
        if (msg.type === 'complete') resolve(null);
      });
    });
    
    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

## Migration Checklist

### Phase 1: Structure
- [ ] Create `examples/` directory
- [ ] Create `shared/` directory
- [ ] Create `.specs/` directory
- [ ] Move current code to `examples/agent-core/`
- [ ] Update import paths
- [ ] Test agent-core deployment

### Phase 2: Shared Components
- [ ] Extract Firebase authorizer to `shared/auth/`
- [ ] Create WebSocket utilities in `shared/websocket/`
- [ ] Create CDK constructs in `shared/constructs/`
- [ ] Create shared types in `shared/types/`
- [ ] Update agent-core to use shared code
- [ ] Test agent-core with shared code

### Phase 3: Converse API
- [ ] Create `examples/converse-api/` structure
- [ ] Implement Converse Lambda
- [ ] Add function definitions
- [ ] Create CDK stack
- [ ] Write README
- [ ] Deploy and test

### Phase 4: Inline Agents
- [ ] Create `examples/inline-agents/` structure
- [ ] Implement router Lambda
- [ ] Implement calculator agent
- [ ] Implement weather agent
- [ ] Implement memory agent (with DynamoDB)
- [ ] Implement tools agent
- [ ] Create CDK stack
- [ ] Write README
- [ ] Deploy and test

### Phase 5: Documentation
- [ ] Write root README
- [ ] Create comparison table
- [ ] Create architecture diagrams
- [ ] Write BLOG.md
- [ ] Write TWITTER.md
- [ ] Add LICENSE
- [ ] Add CONTRIBUTING.md
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Final review and polish
