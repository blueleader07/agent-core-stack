#!/bin/bash

echo "🔍 Fetching WebSocket URLs from deployed stacks..."
echo ""

# Get Converse API WebSocket URL
CONVERSE_WS=$(aws cloudformation describe-stacks \
  --stack-name BedrockConverseApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`WebSocketUrl`].OutputValue' \
  --output text 2>/dev/null)

# Get Inline Agents WebSocket URL
INLINE_WS=$(aws cloudformation describe-stacks \
  --stack-name BedrockInlineAgentsStack \
  --query 'Stacks[0].Outputs[?OutputKey==`WebSocketUrl`].OutputValue' \
  --output text 2>/dev/null)

# Get Agent Core WebSocket URL
AGENT_WS=$(aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack \
  --query 'Stacks[0].Outputs[?OutputKey==`WebSocketUrl`].OutputValue' \
  --output text 2>/dev/null)

# Create .env file
cat > .env << EOF
# WebSocket URLs from deployed stacks
# Auto-generated on $(date)

VITE_CONVERSE_WS_URL=${CONVERSE_WS:-wss://placeholder-converse.execute-api.us-east-1.amazonaws.com/prod}
VITE_INLINE_WS_URL=${INLINE_WS:-wss://placeholder-inline.execute-api.us-east-1.amazonaws.com/prod}
VITE_AGENT_CORE_WS_URL=${AGENT_WS:-wss://placeholder-agent.execute-api.us-east-1.amazonaws.com/prod}
EOF

echo "✅ Created .env file with WebSocket URLs:"
echo ""
cat .env
echo ""

if [ -z "$CONVERSE_WS" ]; then
  echo "⚠️  BedrockConverseApiStack not found or not deployed"
fi

if [ -z "$INLINE_WS" ]; then
  echo "⚠️  BedrockInlineAgentsStack not found or not deployed"
fi

if [ -z "$AGENT_WS" ]; then
  echo "⚠️  BedrockAgentCoreStack not found or not deployed"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. npm install"
echo "   2. npm run dev (for local development)"
echo "   3. npm run deploy (to deploy to AWS)"
