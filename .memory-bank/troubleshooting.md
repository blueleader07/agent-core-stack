# Troubleshooting Guide

Common issues encountered and their solutions.

---

## npm install Hangs

**Problem**: `npm install` hangs indefinitely during optional dependency installation

**Symptoms**:
- Terminal shows no progress
- Last message: "Building fresh packages..."
- System resources spike
- Process doesn't complete after 10+ minutes

**Root Cause**: node-gyp attempting to compile optional native dependencies that aren't needed

**Solution**:
```bash
npm install --no-optional --ignore-scripts
```

**Prevention**: Always use these flags for this project

**Date Discovered**: January 10, 2026

---

## Firebase Admin in Lambda

**Problem**: `firebase-admin` package won't bundle in Lambda without Docker

**Symptoms**:
- CDK bundling errors
- Missing native dependencies
- Lambda deployment fails

**Root Cause**: firebase-admin has native dependencies requiring compilation

**Solution**:
1. Install Docker Desktop
2. Use `bundling.forceDockerBundling: true` in Lambda construct
3. Ensure Docker daemon is running during deployment

**Code Example**:
```typescript
const authorizerFunction = new lambda.Function(this, 'Authorizer', {
  runtime: lambda.Runtime.NODEJS_18_X,
  bundling: {
    forceDockerBundling: true,  // Required for firebase-admin
  }
});
```

**Date Discovered**: January 11, 2026

---

## Bedrock Session ID Invalid

**Problem**: WebSocket connection ID contains characters invalid for Bedrock session IDs

**Symptoms**:
- Error: "Session ID contains invalid characters"
- WebSocket connects but agent invocation fails

**Root Cause**: Bedrock session IDs must be alphanumeric only, but WebSocket connection IDs contain underscores and equals signs

**Solution**: Sanitize connection ID before using as session ID
```typescript
const sessionId = connectionId.replace(/[^a-zA-Z0-9]/g, '');
```

**Prevention**: Always sanitize external IDs before using with AWS services

**Date Discovered**: January 11, 2026

---

## AgentCore Workload Identity Permission

**Problem**: AgentCore Runtime containers fail to authenticate with Bedrock

**Symptoms**:
- Container starts but can't invoke Bedrock
- Error: "Access denied" or authentication failures
- CloudWatch logs show permission errors

**Root Cause**: Missing `bedrock-agentcore:GetWorkloadAccessToken*` permission on Lambda execution role

**Solution**: Add Workload Identity permission to Lambda role
```typescript
lambdaRole.addToPolicy(new iam.PolicyStatement({
  actions: ['bedrock-agentcore:GetWorkloadAccessToken*'],
  resources: ['*'],
}));
```

**Why This Matters**: AgentCore containers use AWS Workload Identity to authenticate with Bedrock services. Without this permission, the container can't obtain credentials.

**Date Discovered**: January 18, 2026

---

## Token Usage Not Displayed

**Problem**: Token usage from LangGraph doesn't appear in Web UI

**Symptoms**:
- Conversation works but no token counts shown
- `undefined` or `0` for all token fields

**Root Cause #1**: Token usage in wrong response field
- LangChain stores usage in `usage_metadata` on AIMessage
- NOT in `response_metadata.usage`

**Root Cause #2**: Token usage format mismatch
- Web UI expects flat structure: `{inputTokens, outputTokens, totalTokens}`
- LangGraph returns nested: `{usage: {input_tokens, output_tokens}}`

**Solution**: 
1. Read from `usage_metadata` field:
```typescript
const metadata = message.usage_metadata;
const usage = {
  inputTokens: metadata?.input_tokens || 0,
  outputTokens: metadata?.output_tokens || 0,
  totalTokens: metadata?.total_tokens || 0
};
```

2. Flatten structure in Lambda proxy:
```typescript
// Flatten token usage for Web UI
if (responseData.tokenUsage?.usage) {
  responseData.tokenUsage = {
    inputTokens: responseData.tokenUsage.usage.input_tokens || 0,
    outputTokens: responseData.tokenUsage.usage.output_tokens || 0,
    totalTokens: responseData.tokenUsage.usage.total_tokens || 0,
  };
}
```

**Date Discovered**: January 18, 2026

---

## CDK Bootstrap Required

**Problem**: `cdk deploy` fails with "Unable to resolve AWS account/region"

**Symptoms**:
- Error message about missing bootstrap resources
- First deployment attempt in new account/region

**Root Cause**: CDK requires one-time bootstrap in each account/region

**Solution**:
```bash
cdk bootstrap aws://991551400024/us-east-1
```

**Prevention**: Bootstrap before first deployment in any account/region

**Date Discovered**: January 10, 2026

---

## Lambda SDK Response Format

**Problem**: Bedrock Agent response data not found in expected location

**Symptoms**:
- `response.body` is undefined
- Data seems missing from AWS SDK response

**Root Cause**: AWS SDK v3 returns data in `response.response`, not `response.body`

**Solution**: Access correct response field
```typescript
// WRONG
const data = response.body;

// CORRECT
const data = response.response;
```

**Date Discovered**: January 18, 2026

---

## WebSocket Connection Drops

**Problem**: WebSocket connection closes unexpectedly during long conversations

**Symptoms**:
- Connection closes mid-stream
- No error message
- Reconnection required

**Root Cause**: API Gateway WebSocket timeout (15 minutes maximum)

**Solution**: 
- For conversations under 15 minutes: No action needed
- For longer conversations: Implement reconnection logic with session persistence
- Use AgentCore Memory for conversation history across connections

**Prevention**: Design for connection interruptions, don't rely on persistent connections

**Date Discovered**: January 11, 2026

---

## TypeScript Compilation Errors

**Problem**: `npm run build` fails with type errors after adding new dependencies

**Symptoms**:
- Type mismatches
- Missing type definitions
- `any` type warnings

**Root Cause**: Missing `@types/*` packages or incorrect tsconfig.json

**Solution**:
1. Install type definitions: `npm install --save-dev @types/package-name`
2. Verify tsconfig.json has `"strict": true`
3. Never use `any` type - find proper types instead

**Prevention**: Always install types packages, maintain strict TypeScript settings

**Date Discovered**: January 10, 2026

---

## Template for New Issues

```markdown
## [Issue Title]

**Problem**: [Brief description]

**Symptoms**:
- [What you see when this happens]
- [Error messages]
- [Behavior observed]

**Root Cause**: [Why this happens]

**Solution**: 
[Step-by-step fix or code example]

**Prevention**: [How to avoid in future]

**Date Discovered**: [YYYY-MM-DD]
```
