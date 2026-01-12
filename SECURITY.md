# Authentication Security Best Practices

## Overview

This implementation follows OAuth 2.0 and OpenID Connect security best practices for browser-based applications.

## Key Security Features

### 1. **Authorization Code Flow with PKCE**

❌ **Old (Implicit Flow)**
```
Browser → Cognito → Google → Cognito → Browser
                                        ↓
                                   #id_token=xxx (in URL hash)
```
- Token exposed in URL
- No refresh token
- Vulnerable to token leakage

✅ **New (Authorization Code + PKCE)**
```
Browser → Cognito → Google → Cognito → Browser
   ↓                                      ↓
Generate                              ?code=xxx
PKCE codes                               ↓
   ↓                               Exchange code
sessionStorage                      for tokens
                                        ↓
                                    Tokens in memory
```
- Token never in URL
- Refresh token included
- PKCE prevents authorization code interception

### 2. **Token Storage**

| Method | Security | Notes |
|--------|----------|-------|
| **localStorage** | ❌ Low | Vulnerable to XSS attacks. Any malicious script can read tokens. |
| **sessionStorage** | ⚠️ Medium | Better than localStorage but still XSS vulnerable. Cleared on tab close. |
| **In-Memory (useRef)** | ✅ High | Not accessible to scripts. Cleared on page refresh. Best for SPAs. |
| **httpOnly Cookies** | ✅ Highest | Immune to XSS. Server-side only. Requires backend. |

**Our Implementation:**
- **Tokens**: Stored in React ref (memory only)
- **PKCE verifier**: sessionStorage (temporary, cleared after use)
- **State**: sessionStorage (CSRF protection, cleared after use)

### 3. **Automatic Token Refresh**

```typescript
// Token lifecycle
┌─────────────────────────────────────────────────┐
│ ID Token Valid (1 hour)                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  After 55 minutes: Automatic Refresh           │
│     ↓                                           │
│  Use refresh_token to get new id_token         │
│     ↓                                           │
│  Update tokens in memory                       │
│     ↓                                           │
│  Schedule next refresh (55 min)                │
│                                                 │
└─────────────────────────────────────────────────┘

Refresh Token Valid (30 days)
```

**Implementation:**
```typescript
// Schedule refresh 5 minutes before expiration
const refreshIn = (expiresIn - 300) * 1000;

setTimeout(() => {
  refreshAccessToken(); // Automatic
}, refreshIn);
```

**Benefits:**
- ✅ User never sees "session expired" errors
- ✅ Tokens always fresh
- ✅ No manual refresh needed
- ✅ Secure - uses refresh token flow

### 4. **PKCE (Proof Key for Code Exchange)**

**Purpose:** Prevents authorization code interception attacks

**How it works:**
```typescript
// 1. Generate random code verifier (128 chars)
const codeVerifier = generateRandomString(128);

// 2. Create SHA256 hash
const hash = await crypto.subtle.digest('SHA-256', codeVerifier);

// 3. Base64 URL encode = code challenge
const codeChallenge = base64UrlEncode(hash);

// 4. Send challenge to Cognito (store verifier locally)
/oauth2/authorize?code_challenge=${codeChallenge}&code_challenge_method=S256

// 5. After redirect, send verifier to prove you started the flow
/oauth2/token?code=${code}&code_verifier=${codeVerifier}
```

**Security:**
- Even if attacker steals authorization code, they can't use it
- Only the client with the original verifier can exchange the code
- Essential for public clients (browsers)

### 5. **CSRF Protection with State Parameter**

```typescript
// Generate random state
const state = generateRandomString(32);
sessionStorage.setItem('oauth_state', state);

// Include in auth request
/oauth2/authorize?state=${state}

// Verify on callback
if (urlParams.get('state') !== sessionStorage.getItem('oauth_state')) {
  throw new Error('CSRF attack detected');
}
```

### 6. **Token Validation**

The Cognito Lambda authorizer validates:
- ✅ **Signature** - Token signed by Cognito
- ✅ **Issuer** - From correct user pool
- ✅ **Audience** - For correct client ID
- ✅ **Expiration** - Not expired
- ✅ **Token use** - Correct type (id vs access)

```typescript
const verifier = CognitoJwtVerifier.create({
  userPoolId: 'us-east-1_XXXXX',
  tokenUse: 'id',
  clientId: 'your-client-id',
});

const payload = await verifier.verify(token);
// Throws error if any validation fails
```

## Security Comparison

### Implicit Flow (Old)
```
GET /oauth2/authorize?
  response_type=token&          ❌ Token in URL
  client_id=xxx

→ Redirect to:
  https://yourapp.com/#id_token=eyJ... ❌ Token visible in browser history
                                      ❌ No refresh token
                                      ❌ Can't verify client
```

### Authorization Code + PKCE (New)
```
GET /oauth2/authorize?
  response_type=code&           ✅ Code (not token) in URL
  code_challenge=xxx&           ✅ PKCE protection
  code_challenge_method=S256

→ Redirect to:
  https://yourapp.com/?code=abc123   ✅ Code useless without verifier

→ Exchange (POST):
  code=abc123&                  ✅ Server-to-server
  code_verifier=xxx            ✅ Proves same client

→ Response:
  {
    id_token: "...",            ✅ Never in URL
    access_token: "...",
    refresh_token: "...",       ✅ Can refresh
    expires_in: 3600
  }
```

## Attack Prevention

### 1. XSS (Cross-Site Scripting)
**Attack:** Malicious script tries to steal tokens

**Protection:**
- ✅ Tokens in memory (useRef) - not accessible to scripts
- ✅ No tokens in localStorage/sessionStorage
- ✅ Content Security Policy (CSP) headers
- ✅ React escapes all output by default

### 2. CSRF (Cross-Site Request Forgery)
**Attack:** Trick user into making unwanted requests

**Protection:**
- ✅ OAuth state parameter verified
- ✅ Random state stored in sessionStorage
- ✅ State validated on callback

### 3. Authorization Code Interception
**Attack:** Steal authorization code from redirect

**Protection:**
- ✅ PKCE code verifier/challenge
- ✅ Code useless without original verifier
- ✅ One-time use codes

### 4. Token Replay
**Attack:** Reuse stolen token

**Protection:**
- ✅ Short token lifetime (1 hour)
- ✅ Automatic refresh with new tokens
- ✅ Token revocation enabled
- ✅ Signature validation

## Token Refresh Flow

```typescript
// Automatic refresh process

1. User signs in
   ↓
2. Receive tokens:
   - id_token (1 hour)
   - access_token (1 hour)  
   - refresh_token (30 days)
   ↓
3. Schedule refresh timer (55 minutes)
   ↓
4. Timer fires → Call refresh endpoint
   ↓
5. POST /oauth2/token
   {
     grant_type: "refresh_token",
     client_id: "xxx",
     refresh_token: "yyy"
   }
   ↓
6. Receive new tokens:
   - New id_token (1 hour)
   - New access_token (1 hour)
   - Same refresh_token (or new one)
   ↓
7. Update tokens in memory
   ↓
8. Schedule next refresh (55 minutes)
   ↓
9. Loop continues for 30 days
   ↓
10. After 30 days: Refresh token expires
    → User must sign in again
```

## Best Practices Implemented

✅ **Use Authorization Code Flow** - Not Implicit Flow
✅ **Implement PKCE** - Prevent code interception
✅ **Store tokens in memory** - Not localStorage
✅ **Use short-lived tokens** - 1 hour max
✅ **Implement auto-refresh** - Before expiration
✅ **Validate state parameter** - CSRF protection
✅ **Use HTTPS only** - In production
✅ **Enable token revocation** - Invalidate compromised tokens
✅ **Verify JWT signatures** - Server-side
✅ **Use refresh tokens** - Long-lived sessions
✅ **Clear tokens on logout** - Proper cleanup
✅ **Prevent user enumeration** - Security setting

## Production Checklist

- [ ] HTTPS enforced on all endpoints
- [ ] Content Security Policy headers configured
- [ ] CORS properly configured
- [ ] Refresh token rotation enabled
- [ ] Token revocation tested
- [ ] Session timeout configured
- [ ] MFA enabled (optional but recommended)
- [ ] Audit logging enabled
- [ ] Rate limiting on auth endpoints
- [ ] Monitor for suspicious activity

## Token Expiration Handling

**Scenario 1: Page stays open for hours**
- ✅ Tokens auto-refresh every 55 minutes
- ✅ User continues working seamlessly
- ✅ After 30 days: Refresh token expires → Redirect to login

**Scenario 2: User closes tab**
- ✅ Tokens cleared from memory
- ✅ On return: Must sign in again
- ✅ Good for security (no persistent sessions)

**Scenario 3: Token refresh fails**
- ✅ Clear tokens from memory
- ✅ Set isAuthenticated = false
- ✅ Show "Please sign in again" message
- ✅ Graceful degradation

## Comparison with Firebase

| Feature | Firebase Auth | Cognito (New) |
|---------|--------------|---------------|
| OAuth Flow | Implicit | Authorization Code + PKCE ✅ |
| Token Storage | localStorage | In-memory ✅ |
| Auto-refresh | ✅ Yes | ✅ Yes (custom) |
| Refresh tokens | ✅ Yes | ✅ Yes |
| PKCE | ❌ No | ✅ Yes |
| AWS native | ❌ No | ✅ Yes |
| Token lifetime | Custom | 1 hour (configurable) |

## Migration Notes

When migrating from Firebase to Cognito:

1. **No localStorage**: Tokens in memory mean page refresh = re-auth
2. **Different flow**: Authorization Code vs Implicit
3. **Callback URL**: Query param (?code=) vs hash (#id_token=)
4. **Auto-refresh**: Implemented in component, not SDK
5. **Security**: Better CSRF and PKCE protection

## References

- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/security.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
