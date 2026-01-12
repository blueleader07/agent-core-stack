import { useState, useEffect, useCallback, useRef } from 'react';

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  region: string;
}

interface CognitoAuthProps {
  config: CognitoConfig;
  onTokenReceived: (token: string) => void;
}

interface TokenResponse {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Cognito authentication component with automatic token refresh
 * 
 * Security improvements:
 * - Uses Authorization Code flow (not Implicit flow)
 * - Stores tokens in memory (not localStorage - vulnerable to XSS)
 * - Automatic token refresh before expiration
 * - PKCE (Proof Key for Code Exchange) for additional security
 */
export function CognitoAuth({ config, onTokenReceived }: CognitoAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  // Store tokens in memory (more secure than localStorage)
  const tokensRef = useRef<{
    idToken: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  } | null>(null);
  
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const isProcessingCodeRef = useRef(false); // Prevent duplicate processing

  // Generate random string for PKCE
  const generateRandomString = (length: number): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
      .map(v => charset[v % charset.length])
      .join('');
  };

  // Generate PKCE code verifier and challenge
  const generatePKCE = async () => {
    const codeVerifier = generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return { codeVerifier, codeChallenge };
  };

  // Exchange authorization code for tokens
  const exchangeCodeForTokens = async (code: string, codeVerifier: string): Promise<TokenResponse> => {
    const { domain, clientId, region } = config;
    const redirectUri = window.location.origin;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(
      `https://${domain}.auth.${region}.amazoncognito.com/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', errorText);
      throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  };

  // Refresh access token using refresh token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!tokensRef.current?.refreshToken) {
      console.log('No refresh token available');
      return false;
    }

    try {
      const { domain, clientId, region } = config;
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: tokensRef.current.refreshToken,
      });

      const response = await fetch(
        `https://${domain}.auth.${region}.amazoncognito.com/oauth2/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        console.error('Token refresh failed:', response.statusText);
        return false;
      }

      const data: TokenResponse = await response.json();
      
      // Update tokens
      tokensRef.current = {
        idToken: data.id_token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokensRef.current.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      onTokenReceived(data.id_token);
      
      // Schedule next refresh
      scheduleTokenRefresh(data.expires_in);
      
      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }, [config, onTokenReceived]);

  // Schedule automatic token refresh (refresh 5 minutes before expiration)
  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule refresh 5 minutes before expiration
    const refreshIn = Math.max((expiresIn - 300) * 1000, 60000); // At least 1 minute
    
    console.log(`Scheduling token refresh in ${Math.round(refreshIn / 1000)} seconds`);
    
    refreshTimerRef.current = setTimeout(() => {
      console.log('Attempting automatic token refresh...');
      refreshAccessToken();
    }, refreshIn);
  }, [refreshAccessToken]);

  useEffect(() => {
    // Check if we're coming back from OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      // Prevent duplicate processing (React StrictMode runs effects twice in dev)
      if (isProcessingCodeRef.current) {
        return;
      }
      isProcessingCodeRef.current = true;
      
      // Get code verifier from sessionStorage (stored during sign-in)
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      const savedState = sessionStorage.getItem('oauth_state');
      
      // Verify state to prevent CSRF attacks
      if (state !== savedState) {
        console.error('OAuth state mismatch - possible CSRF attack');
        isProcessingCodeRef.current = false;
        return;
      }
      
      if (codeVerifier) {
        // Exchange code for tokens
        exchangeCodeForTokens(code, codeVerifier)
          .then((data) => {
            // Store tokens in memory
            tokensRef.current = {
              idToken: data.id_token,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: Date.now() + (data.expires_in * 1000),
            };
            
            const payload = parseJwt(data.id_token);
            setUserEmail(payload.email || '');
            setIsAuthenticated(true);
            onTokenReceived(data.id_token);
            
            // Schedule automatic refresh
            scheduleTokenRefresh(data.expires_in);
            
            // Clean up
            sessionStorage.removeItem('pkce_code_verifier');
            sessionStorage.removeItem('oauth_state');
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((error) => {
            console.error('Failed to exchange code for tokens:', error);
            isProcessingCodeRef.current = false;
          });
      } else {
        isProcessingCodeRef.current = false;
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [config, onTokenReceived, scheduleTokenRefresh]);

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  };

  const signInWithGoogle = async () => {
    const { domain, clientId, region } = config;
    const redirectUri = window.location.origin;
    
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = await generatePKCE();
    
    // Generate random state for CSRF protection
    const state = generateRandomString(32);
    
    // Store in sessionStorage (cleared after auth completes)
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);
    
    // Build authorization URL with PKCE
    const authUrl = `https://${domain}.auth.${region}.amazoncognito.com/oauth2/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `identity_provider=Google&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256&` +
      `state=${state}`;

    window.location.href = authUrl;
  };

  const signOut = () => {
    // Clear tokens from memory
    tokensRef.current = null;
    
    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    setIsAuthenticated(false);
    setUserEmail('');
    
    const { domain, clientId, region } = config;
    const redirectUri = encodeURIComponent(window.location.origin);
    
    const logoutUrl = `https://${domain}.auth.${region}.amazoncognito.com/logout?` +
      `client_id=${clientId}&` +
      `logout_uri=${redirectUri}`;

    window.location.href = logoutUrl;
  };

  if (isAuthenticated) {
    return (
      <div className="auth-status">
        <div className="auth-user">
          <span className="auth-email">✓ {userEmail}</span>
          <button onClick={signOut} className="auth-button signout">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-prompt">
      <p>Sign in with Google to use the AI agents</p>
      <button onClick={signInWithGoogle} className="auth-button google">
        <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
