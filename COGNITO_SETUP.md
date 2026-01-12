    # Cognito Authentication Setup

This guide shows how to set up Cognito with Google OAuth for the Bedrock examples.

## Security Highlights

✅ **Authorization Code Flow with PKCE** - Most secure OAuth flow for browsers  
✅ **Automatic token refresh** - Tokens refresh 5 minutes before expiration  
✅ **In-memory token storage** - Not vulnerable to XSS like localStorage  
✅ **CSRF protection** - State parameter validation  
✅ **Short-lived tokens** - 1 hour expiration with 30-day refresh tokens  

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

## Prerequisites

1. **Google Cloud Console Project**
2. **AWS Account**

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if prompted:
   - User Type: External
   - App name: "Bedrock Examples"
   - Support email: your email
   - Add scopes: email, profile, openid
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Bedrock Examples Web"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local dev)
     - `https://your-cloudfront-domain.cloudfront.net` (for production)
   - Authorized redirect URIs:
     - `http://localhost:5173`
     - `https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
7. Save the **Client ID** and **Client Secret**

## Step 2: Deploy Cognito with CDK

Update your stack to use the CognitoAuth construct:

```typescript
import { CognitoAuth } from '../../../shared/constructs/cognito-auth';

// In your stack constructor:
const cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackUrls: [
    'http://localhost:5173',
    'https://your-cloudfront-url.cloudfront.net',
  ],
  logoutUrls: [
    'http://localhost:5173',
    'https://your-cloudfront-url.cloudfront.net',
  ],
});

// Use cognitoAuth.authorizerFunction instead of Firebase authorizer
const authorizer = new WebSocketLambdaAuthorizer('Authorizer', cognitoAuth.authorizerFunction);
```

## Step 3: Set Environment Variables

Create a `.env` file in the **root** of agent-core-stack:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS
AWS_REGION=us-east-1
```

## Step 4: Deploy the Stacks

```bash
# Install Cognito authorizer dependencies
cd shared/auth/cognito-authorizer
npm install

# Deploy examples (they will use Cognito)
cd ../../..
npm run deploy:all
```

After deployment, note the outputs:
- `UserPoolId`
- `UserPoolClientId`
- `CognitoDomain`
- `HostedUIUrl`

## Step 5: Update Google OAuth Redirect URIs

Go back to Google Cloud Console and add the Cognito redirect URI:

```
https://{CognitoDomain}.auth.{region}.amazoncognito.com/oauth2/idpresponse
```

Example:
```
https://bedrockexamples-12345678.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

## Step 6: Configure Web UI

Update `web-ui/.env`:

```bash
# WebSocket URLs (from deployed stacks)
VITE_CONVERSE_WS_URL=wss://xxx.execute-api.us-east-1.amazonaws.com/prod
VITE_INLINE_WS_URL=wss://yyy.execute-api.us-east-1.amazonaws.com/prod
VITE_AGENT_CORE_WS_URL=wss://zzz.execute-api.us-east-1.amazonaws.com/prod

# Cognito Configuration (from stack outputs)
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_DOMAIN=your-domain-prefix
VITE_AWS_REGION=us-east-1
```

## Step 7: Test Locally

```bash
cd web-ui
npm run dev
```

Open http://localhost:5173 and click **Sign in with Google**. You'll be redirected to Google, authenticate, and return to the app with a token.

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (React App)    │
└────────┬────────┘
         │
         │ 1. Click "Sign in with Google"
         ▼
┌─────────────────────────┐
│  Cognito Hosted UI      │
│  (Google OAuth)         │
└────────┬────────────────┘
         │
         │ 2. Redirect to Google
         ▼
┌─────────────────┐
│  Google OAuth   │
└────────┬────────┘
         │
         │ 3. User authenticates
         ▼
┌─────────────────────────┐
│  Cognito                │
│  (issues JWT token)     │
└────────┬────────────────┘
         │
         │ 4. Return to app with token
         ▼
┌─────────────────┐
│   Web Browser   │
│  (stores token) │
└────────┬────────┘
         │
         │ 5. Connect to WebSocket with token
         ▼
┌─────────────────────────┐
│  API Gateway            │
│  (WebSocket)            │
└────────┬────────────────┘
         │
         │ 6. Invoke authorizer
         ▼
┌─────────────────────────┐
│  Cognito Authorizer     │
│  (Lambda)               │
│  - Validates JWT        │
│  - Checks signature     │
│  - Returns policy       │
└────────┬────────────────┘
         │
         │ 7. Allow/Deny
         ▼
┌─────────────────────────┐
│  Backend Lambda         │
│  (Agent logic)          │
└─────────────────────────┘
```

## Benefits over Firebase

✅ **Native AWS integration** - No external dependencies
✅ **Google OAuth built-in** - Easy federated identity
✅ **Hosted UI** - No custom auth UI needed
✅ **AWS free tier** - 50,000 MAU free
✅ **JWT validation** - Built-in AWS library
✅ **User management** - Full AWS Console integration

## Troubleshooting

**Error: "Invalid redirect URI"**
- Ensure Google OAuth redirect URIs match exactly (including https://)
- Add both Cognito domain and your app domain

**Error: "Token validation failed"**
- Check USER_POOL_ID and CLIENT_ID in Lambda environment
- Ensure token is not expired (default 1 hour)

**Error: "User pool does not exist"**
- Verify Cognito deployment completed successfully
- Check region matches in all configurations

**OAuth flow doesn't start**
- Verify VITE_COGNITO_* variables are set correctly
- Check browser console for errors
- Ensure callback URLs are configured in Cognito

## Migration from Firebase

If you have existing Firebase users, you can:

1. **Dual auth** - Support both Firebase and Cognito temporarily
2. **Migration Lambda** - Import users to Cognito
3. **Identity federation** - Link Firebase accounts to Cognito

The backend Lambda authorizer can check both token types:

```typescript
// Check if token is from Firebase or Cognito
if (token.includes('firebase')) {
  // Use Firebase Admin SDK
} else {
  // Use Cognito JWT Verifier
}
```
