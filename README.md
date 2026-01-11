# Agent Core Stack

AWS CDK infrastructure for Bedrock Agent with Firebase authentication and WebSocket streaming.

## Overview

This project implements a **hybrid Firebase + AWS architecture** that combines:
- **AWS Bedrock Agent** with Claude Sonnet 4.5 for AI-powered conversations
- **Firebase JWT authentication** via Lambda authorizer
- **WebSocket API** for real-time streaming responses
- **React frontend integration** (deployed to Firebase Hosting)

## Architecture

```
Firebase React App (https://automation-station-e3361.web.app)
                    ↓ (Firebase ID Token)
            WebSocket API Gateway
                    ↓ (Authorizer validates JWT)
              Lambda Authorizer
                    ↓ (verified user context)
            WebSocket Lambda Handler
                    ↓ (invoke agent)
              Bedrock Agent (Claude Sonnet 4.5)
                    ↓ (streaming response)
            Back to React App (real-time updates)
```

## Features

- ✅ **Claude Sonnet 4.5** - Latest Anthropic model via Bedrock Agents
- ✅ **Firebase Authentication** - Secure JWT validation in AWS Lambda
- ✅ **Streaming Responses** - Real-time WebSocket communication (up to 15 min)
- ✅ **Hybrid Architecture** - Best of Firebase (auth, hosting) + AWS (AI, infrastructure)
- ✅ **Infrastructure as Code** - Full CDK deployment

## Prerequisites

1. **AWS Account** with Bedrock access
2. **Firebase Project** (for authentication)
3. **Docker** (for Lambda bundling)
4. **Node.js 18+**

## Setup

### 1. Install Dependencies

```bash
npm install --no-optional --ignore-scripts
```

### 2. Configure Firebase Credentials

Create `.env` file in the project root:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----"
```

Get these from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

### 3. Configure AWS

```bash
aws configure
```

Bootstrap CDK (first time only):

```bash
npx cdk bootstrap
```

### 4. Deploy

```bash
npm run build
npm run cdk deploy
```

**Outputs:**
- `WebSocketUrl` - wss://xxx.execute-api.us-east-1.amazonaws.com/prod
- `BedrockAgentId` - Agent ID for direct invocation
- `BedrockAgentAliasId` - Agent alias ID

## Usage

### Frontend Integration (React)

```tsx
import { auth } from './firebase';

const ws = new WebSocket(`${WS_URL}?token=${await user.getIdToken()}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'stream') {
    console.log('Agent:', data.chunk);
  }
};

ws.send(JSON.stringify({ 
  action: 'invoke-agent', 
  message: 'Hello!' 
}));
```

### CLI Testing

```bash
# Install wscat
npm install -g wscat

# Get Firebase token (from browser console after login)
TOKEN=$(firebase auth:export)

# Connect and chat
wscat -c "wss://xxx.execute-api.us-east-1.amazonaws.com/prod?token=$TOKEN"

# Send message
> {"action": "invoke-agent", "message": "Explain quantum computing"}
```

## Project Structure

```
agent-core-stack/
├── bin/
│   └── agent-core-stack.ts       # CDK app entry (loads .env)
├── lib/
│   └── agent-core-stack.ts       # Main stack definition
├── lambda/
│   ├── authorizer/               # Firebase JWT validator
│   │   ├── index.ts
│   │   └── package.json          # firebase-admin dependency
│   ├── hello-agent/              # Simple test handler
│   │   └── index.ts
│   └── websocket-agent/          # WebSocket + Bedrock Agent
│       └── index.ts
├── .memory-bank/                 # Project documentation
├── .env                          # Firebase credentials (gitignored)
├── package.json
├── tsconfig.json
└── cdk.json
```

## Stack Resources

### Bedrock Agent
- **Model**: `anthropic.claude-sonnet-4-5-20250929-v1:0`
- **Instructions**: Article reading and social media content generation
- **Alias**: `production` (for stable invocation)

### Lambda Functions
1. **FirebaseAuthorizer** - Validates Firebase ID tokens
2. **WebSocketAgentFunction** - Handles WebSocket connections and streams Bedrock responses

### API Gateway
- **Type**: WebSocket API
- **Routes**: `$connect`, `$disconnect`, `$default`
- **Authorizer**: Lambda authorizer (query string token)

## Development

### Build TypeScript

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Synthesize CloudFormation

```bash
npm run cdk synth
```

### Compare Changes

```bash
npm run cdk diff
```

### View Logs

```bash
# Authorizer logs
aws logs tail /aws/lambda/AgentCoreStack-FirebaseAuthorizer --follow

# WebSocket logs
aws logs tail /aws/lambda/AgentCoreStack-WebSocketAgentFunction --follow
```

## Troubleshooting

### Docker not found during deployment

Install Docker Desktop and ensure it's running:

```bash
brew install --cask docker
```

### Firebase credentials error

Ensure `.env` file has proper format:
- `FIREBASE_PRIVATE_KEY` must have `\n` for newlines (escaped)
- All three variables must be set

### WebSocket connection fails

Check authorizer logs for token validation errors:

```bash
aws logs tail /aws/lambda/AgentCoreStack-FirebaseAuthorizer --since 5m
```

### Bedrock model not available

Verify you have access to Claude Sonnet 4.5 in your AWS region:

```bash
aws bedrock list-foundation-models --query 'modelSummaries[?contains(modelId, `claude-sonnet-4-5`)]'
```

Request model access: AWS Console > Bedrock > Model access

## Security

- ✅ **No credentials in git** - `.env` and `*firebase-adminsdk*.json` are gitignored
- ✅ **JWT validation** - Every WebSocket connection requires valid Firebase token
- ✅ **IAM least privilege** - Lambda functions have minimal required permissions
- ✅ **CORS configured** - WebSocket allows Firebase Hosting origins

## Cost Optimization

- **Bedrock Agent**: Pay per token (Claude Sonnet 4.5 pricing)
- **Lambda**: Free tier covers 1M requests/month
- **API Gateway WebSocket**: $1.00 per million messages
- **CloudWatch Logs**: First 5GB free

**Estimated cost for 1000 agent conversations**: ~$5-10/month

## Related Projects

- **Frontend**: [social-media-draft-agent](https://github.com/blueleader07/social-media-draft-agent) - React app with Firebase Hosting
- **Firebase Functions**: Article processing queue and daily digest

## License

MIT

## Author

Built with AWS CDK, Bedrock Agents, and Firebase Authentication.
