# AWS Bedrock Examples - Web UI

Beautiful React-based UI to demo all three Bedrock integration patterns.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure WebSocket URLs:**
   
   Copy `.env.example` to `.env` and update with your deployed WebSocket URLs:
   ```bash
   cp .env.example .env
   ```
   
   Get the WebSocket URLs from your deployed stacks:
   ```bash
   # From the root of agent-core-stack
   cd examples/converse-api && cdk deploy --outputs-file outputs.json
   cd ../inline-agents && cdk deploy --outputs-file outputs.json
   cd ../agent-core && cdk deploy --outputs-file outputs.json
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:5173

4. **Deploy to AWS:**
   ```bash
   npm run build
   npm run deploy
   ```
   
   This will:
   - Build the React app
   - Deploy to S3
   - Create CloudFront distribution
   - Output the public URL

## Features

- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations
- 🔌 **WebSocket Streaming** - Real-time streaming responses from all agents
- 🔐 **Firebase Auth** - Secure connections with Firebase JWT tokens
- 📱 **Responsive** - Works on desktop and mobile
- 🎯 **Example Queries** - Pre-built examples for each agent type
- 💬 **Chat Interface** - Full conversation history with user/assistant messages

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Styling**: Custom CSS with gradients and animations
- **Deployment**: S3 + CloudFront (CDK)
- **Authentication**: Firebase JWT tokens
- **Communication**: WebSocket API Gateway

## Using the UI

1. **Select an agent** - Choose from the three tabs:
   - Converse API (direct model calls)
   - Inline Agents (custom tools)
   - Agent Core (full Bedrock Agent)

2. **Enter Firebase token** - Get a token from your Firebase Console

3. **Connect** - Click the connection status to connect

4. **Chat** - Type a message or click an example query

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to AWS
npm run deploy
```

## Environment Variables

Create a `.env` file with:

```bash
VITE_CONVERSE_WS_URL=wss://xxx.execute-api.us-east-1.amazonaws.com/prod
VITE_INLINE_WS_URL=wss://yyy.execute-api.us-east-1.amazonaws.com/prod
VITE_AGENT_CORE_WS_URL=wss://zzz.execute-api.us-east-1.amazonaws.com/prod
```

## Deployment

The UI is deployed using AWS CDK:

- **S3 Bucket** - Hosts the static files
- **CloudFront** - CDN for global distribution
- **HTTPS** - Automatic redirect to HTTPS
- **SPA Routing** - Proper error handling for single-page apps

After deployment, you'll get:
- CloudFront URL (e.g., `https://d1234567890.cloudfront.net`)
- Distribution ID (for invalidations)

## Troubleshooting

**Connection issues:**
- Verify WebSocket URLs in `.env`
- Check Firebase token is valid
- Ensure CORS is configured on API Gateway

**Build errors:**
- Run `npm install` to ensure dependencies are installed
- Check Node.js version (requires >= 20.0.0)

**Deployment errors:**
- Ensure AWS credentials are configured
- Run `cdk bootstrap` if first time deploying CDK
- Check S3 bucket doesn't already exist
