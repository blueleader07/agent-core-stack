import { 
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    domainName: string;
    stage: string;
    authorizer?: {
      userId: string;
      email: string;
    };
  };
  body?: string;
}

/**
 * Simple WebSocket handler for direct Converse API calls
 */
export const handler = async (event: WebSocketEvent) => {
  const { connectionId, routeKey, domainName, stage } = event.requestContext;
  
  console.log('Converse API event:', { connectionId, routeKey });

  switch (routeKey) {
    case '$connect':
      console.log(`Connection established: ${connectionId}`);
      return { statusCode: 200, body: 'Connected' };
    
    case '$disconnect':
      console.log(`Disconnected: ${connectionId}`);
      return { statusCode: 200, body: 'Disconnected' };
    
    case '$default':
      return handleMessage(event, domainName, stage);
    
    default:
      return { statusCode: 400, body: 'Unknown route' };
  }
};

/**
 * Handle incoming messages with direct Converse API
 */
async function handleMessage(event: WebSocketEvent, domainName: string, stage: string) {
  const { connectionId } = event.requestContext;
  const body = event.body ? JSON.parse(event.body) : {};
  
  const callbackUrl = `https://${domainName}/${stage}`;
  const apiGatewayClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });

  try {
    const { action, message, systemPrompt, temperature, maxTokens } = body;

    if (action === 'ping') {
      await sendToConnection(apiGatewayClient, connectionId, {
        type: 'pong',
        timestamp: new Date().toISOString(),
      });
      return { statusCode: 200, body: 'Pong sent' };
    }

    if (action === 'chat') {
      // Direct Converse API call with streaming
      await callConverseAPI(
        apiGatewayClient, 
        connectionId, 
        message,
        systemPrompt,
        temperature,
        maxTokens
      );
      return { statusCode: 200, body: 'Processing' };
    }

    await sendToConnection(apiGatewayClient, connectionId, {
      type: 'error',
      error: 'Unknown action. Use "chat" or "ping"',
    });

    return { statusCode: 400, body: 'Unknown action' };

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
 * Call Bedrock Converse API directly with streaming
 */
async function callConverseAPI(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  userMessage: string,
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
) {
  // Simple message array (in production, maintain conversation history)
  const messages = [
    {
      role: 'user',
      content: [{ text: userMessage }],
    },
  ];

  // System prompt (optional)
  const system = systemPrompt ? [{ text: systemPrompt }] : [
    { 
      text: 'You are a helpful AI assistant. Be concise, accurate, and friendly.' 
    }
  ];

  // Inference configuration
  const inferenceConfig = {
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 2048,
    topP: 0.9,
  };

  const command = new ConverseStreamCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    messages,
    system,
    inferenceConfig,
  });

  const response = await bedrockClient.send(command);

  let fullText = '';
  let tokenCount = 0;

  // Stream response to client
  if (response.stream) {
    for await (const event of response.stream) {
      // Handle text chunks
      if (event.contentBlockDelta?.delta?.text) {
        const chunk = event.contentBlockDelta.delta.text;
        fullText += chunk;
        
        await sendToConnection(client, connectionId, {
          type: 'stream',
          chunk,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle metadata
      if (event.metadata?.usage) {
        tokenCount = event.metadata.usage.inputTokens + event.metadata.usage.outputTokens;
      }

      // Handle completion
      if (event.messageStop) {
        await sendToConnection(client, connectionId, {
          type: 'complete',
          stopReason: event.messageStop.stopReason,
          totalTokens: tokenCount,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  console.log(`Conversation complete. Tokens: ${tokenCount}, Text length: ${fullText.length}`);
}

/**
 * Send data to WebSocket connection
 */
async function sendToConnection(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  data: any
): Promise<void> {
  const command = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify(data),
  });
  
  await client.send(command);
}
