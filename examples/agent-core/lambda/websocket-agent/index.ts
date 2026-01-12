import { 
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const bedrockClient = new BedrockAgentRuntimeClient({ region: 'us-east-1' });
const stsClient = new STSClient({ region: 'us-east-1' });

const BEDROCK_AGENT_ID = process.env.BEDROCK_AGENT_ID!;
const BEDROCK_AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID!;

// Log caller identity on cold start
(async () => {
  try {
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('Lambda Caller Identity:', {
      Account: identity.Account,
      Arn: identity.Arn,
      UserId: identity.UserId,
    });
  } catch (error) {
    console.error('Failed to get caller identity:', error);
  }
})();

interface WebSocketEvent {
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

/**
 * WebSocket Lambda Handler
 * Supports: $connect, $disconnect, and message routes
 */
export const handler = async (event: WebSocketEvent) => {
  console.log('HANDLER ENTRY - Full event:', JSON.stringify(event, null, 2));
  
  const { connectionId, routeKey, domainName, stage } = event.requestContext;
  
  console.log('WebSocket event:', { connectionId, routeKey });

  // Handle different WebSocket routes
  switch (routeKey) {
    case '$connect':
      console.log('Routing to handleConnect');
      return handleConnect(connectionId, event.requestContext.authorizer);
    
    case '$disconnect':
      console.log('Routing to handleDisconnect');
      return handleDisconnect(connectionId);
    
    case '$default':
      console.log('Routing to handleMessage');
      return handleMessage(event, domainName, stage);
    
    default:
      return { statusCode: 400, body: 'Unknown route' };
  }
};

/**
 * Handle new WebSocket connection
 */
async function handleConnect(connectionId: string, authorizer?: any) {
  const userId = authorizer?.userId || 'anonymous';
  const email = authorizer?.email || 'unknown';
  
  console.log(`New connection: ${connectionId}`);
  console.log(`User: ${email} (${userId})`);
  
  // TODO: Store connection mapping in DynamoDB
  // connectionId -> userId for later message routing
  
  return { statusCode: 200, body: 'Connected' };
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId: string) {
  console.log(`Disconnected: ${connectionId}`);
  return { statusCode: 200, body: 'Disconnected' };
}

/**
 * Handle incoming messages and stream responses
 */
async function handleMessage(event: WebSocketEvent, domainName: string, stage: string) {
  const { connectionId } = event.requestContext;
  
  console.log('handleMessage called - raw event.body:', event.body);
  
  const body = event.body ? JSON.parse(event.body) : {};
  
  console.log('Received message body:', JSON.stringify(body));
  
  // Create API Gateway Management API client for sending messages
  const callbackUrl = `https://${domainName}/${stage}`;
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: callbackUrl,
  });

  try {
    const { action, message } = body;
    
    console.log('Message action:', action, 'message:', message);

    if (action === 'ping') {
      // Simple ping/pong for connection testing
      await sendToConnection(apiGatewayClient, connectionId, {
        type: 'pong',
        timestamp: new Date().toISOString(),
      });
      return { statusCode: 200, body: 'Pong sent' };
    }

    if (action === 'invoke-agent' || action === 'chat') {
      // Stream agent response back to client
      console.log('Invoking agent with message:', message);
      await streamAgentResponse(apiGatewayClient, connectionId, message);
      return { statusCode: 200, body: 'Agent invoked' };
    }

    // Default: echo the message
    console.log('Echoing message back to client');
    await sendToConnection(apiGatewayClient, connectionId, {
      type: 'echo',
      message: message || 'Hello from WebSocket Agent!',
      timestamp: new Date().toISOString(),
    });

    return { statusCode: 200, body: 'Message sent' };

  } catch (error) {
    console.error('Error handling message:', error);
    
    try {
      await sendToConnection(apiGatewayClient, connectionId, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }

    return { statusCode: 500, body: 'Error processing message' };
  }
}

/**
 * Send data to WebSocket connection
 */
async function sendToConnection(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  data: any
) {
  const command = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify(data),
  });
  
  await client.send(command);
}

/**
 * Stream Bedrock Agent response to WebSocket client
 */
async function streamAgentResponse(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  message: string
) {
  try {
    // Sanitize connection ID for Bedrock session (remove special chars like = and /)
    const sessionId = connectionId.replace(/[^0-9a-zA-Z._:-]/g, '');
    
    // Invoke Bedrock Agent with streaming
    const command = new InvokeAgentCommand({
      agentId: BEDROCK_AGENT_ID,
      agentAliasId: BEDROCK_AGENT_ALIAS_ID,
      sessionId: sessionId, // Use sanitized session ID
      inputText: message,
    });

    console.log('Invoking Bedrock Agent:', { agentId: BEDROCK_AGENT_ID, aliasId: BEDROCK_AGENT_ALIAS_ID, sessionId, message });

    const response = await bedrockClient.send(command);

    // Stream response chunks to client
    if (response.completion) {
      for await (const event of response.completion) {
        if (event.chunk?.bytes) {
          const text = new TextDecoder().decode(event.chunk.bytes);
          
          console.log('Streaming chunk:', text);
          
          await sendToConnection(client, connectionId, {
            type: 'stream',
            chunk: text,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Send completion signal
    await sendToConnection(client, connectionId, {
      type: 'complete',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Bedrock Agent error:', error);
    
    await sendToConnection(client, connectionId, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to invoke agent',
    });
  }
}
