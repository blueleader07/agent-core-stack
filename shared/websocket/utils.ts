import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { WebSocketResponse } from '../types';

/**
 * Send data to a WebSocket connection
 */
export async function sendToConnection(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  data: WebSocketResponse | any
): Promise<void> {
  const command = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify(data),
  });
  
  await client.send(command);
}

/**
 * Create API Gateway Management API client for WebSocket
 */
export function createApiGatewayClient(domainName: string, stage: string): ApiGatewayManagementApiClient {
  const callbackUrl = `https://${domainName}/${stage}`;
  return new ApiGatewayManagementApiClient({
    endpoint: callbackUrl,
  });
}

/**
 * Sanitize connection ID for use as Bedrock session ID
 * Removes special characters that are not allowed
 */
export function sanitizeSessionId(connectionId: string): string {
  return connectionId.replace(/[^0-9a-zA-Z._:-]/g, '');
}
