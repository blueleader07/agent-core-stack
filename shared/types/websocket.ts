/**
 * Shared TypeScript types for WebSocket communication
 */

export interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    domainName: string;
    stage: string;
    authorizer?: {
      userId: string;
      email: string;
      name: string;
      emailVerified: string;
    };
  };
  body?: string;
}

export interface WebSocketMessage {
  action: string;
  message?: string;
  [key: string]: any;
}

export interface WebSocketResponse {
  type: 'stream' | 'complete' | 'error' | 'pong' | 'echo';
  chunk?: string;
  message?: string;
  error?: string;
  timestamp: string;
}
