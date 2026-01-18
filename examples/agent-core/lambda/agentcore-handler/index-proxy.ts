/**
 * AgentCore Runtime Proxy Lambda Handler
 * 
 * This Lambda acts as a PROXY to the real AgentCore Runtime service.
 * By invoking AgentCore (instead of running LangGraph directly), we get:
 * - CloudWatch AgentCore metrics populated
 * - Centralized monitoring and observability
 * - Proper AgentCore service integration
 * 
 * Flow: WebSocket → This Lambda → AgentCore Runtime → Container → Response
 */

import { 
  BedrockAgentCoreClient, 
  InvokeAgentRuntimeCommand 
} from '@aws-sdk/client-bedrock-agentcore';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

// AgentCore Runtime ARN - set via environment variable
const AGENTCORE_RUNTIME_ARN = process.env.AGENTCORE_RUNTIME_ARN || '';

// Initialize AWS clients
const agentCoreClient = new BedrockAgentCoreClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// WebSocket event interface
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
 * WebSocket Lambda Handler - Proxies to AgentCore Runtime
 */
export const handler = async (event: WebSocketEvent) => {
  console.log('AgentCore Proxy Handler - Event:', JSON.stringify(event, null, 2));
  
  const { connectionId, routeKey, domainName, stage } = event.requestContext;

  switch (routeKey) {
    case '$connect':
      return handleConnect(connectionId, event.requestContext.authorizer);
    
    case '$disconnect':
      return handleDisconnect(connectionId);
    
    case '$default':
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
  
  console.log(`AgentCore Proxy connection: ${connectionId}`, { userId, email });
  
  return { statusCode: 200, body: 'Connected' };
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId: string) {
  console.log(`AgentCore Proxy disconnected: ${connectionId}`);
  
  return { statusCode: 200, body: 'Disconnected' };
}

/**
 * Handle incoming messages - proxy to AgentCore Runtime
 */
async function handleMessage(event: WebSocketEvent, domainName: string, stage: string) {
  const { connectionId } = event.requestContext;
  
  const body = event.body ? JSON.parse(event.body) : {};
  console.log('AgentCore Proxy message:', JSON.stringify(body));
  
  const callbackUrl = `https://${domainName}/${stage}`;
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: callbackUrl,
  });

  try {
    const { action, message } = body;

    if (action === 'ping') {
      await sendToConnection(apiGatewayClient, connectionId, {
        type: 'pong',
        timestamp: new Date().toISOString(),
      });
      return { statusCode: 200, body: 'Pong sent' };
    }

    if (action === 'invoke-runtime' || action === 'chat') {
      await invokeAgentCoreRuntime(apiGatewayClient, connectionId, message);
      return { statusCode: 200, body: 'AgentCore Runtime invoked' };
    }

    // Echo for testing
    await sendToConnection(apiGatewayClient, connectionId, {
      type: 'echo',
      message: message || 'Hello from AgentCore Proxy!',
      timestamp: new Date().toISOString(),
    });

    return { statusCode: 200, body: 'Message sent' };

  } catch (error) {
    console.error('AgentCore Proxy error:', error);
    
    try {
      await sendToConnection(apiGatewayClient, connectionId, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (sendError) {
      console.error('Failed to send error:', sendError);
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
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    });
    
    await client.send(command);
  } catch (error) {
    console.error('Error sending to WebSocket:', error);
    if (error instanceof Error && error.name === 'GoneException') {
      console.log('Connection already closed');
    }
  }
}

/**
 * Invoke the real AgentCore Runtime and stream responses back
 * 
 * This is the key function that:
 * 1. Calls AgentCore Runtime (populating CloudWatch metrics)
 * 2. Receives SSE streaming response
 * 3. Forwards chunks to WebSocket client
 */
async function invokeAgentCoreRuntime(
  wsClient: ApiGatewayManagementApiClient,
  connectionId: string,
  userMessage: string
) {
  console.log('Invoking AgentCore Runtime:', {
    runtimeArn: AGENTCORE_RUNTIME_ARN,
    message: userMessage,
  });

  if (!AGENTCORE_RUNTIME_ARN) {
    throw new Error('AGENTCORE_RUNTIME_ARN environment variable not set');
  }

  const startTime = Date.now();
  let fullResponse = '';

  try {
    // Prepare the payload for AgentCore
    // The container expects 'prompt' field (see container/server.ts)
    const payload = JSON.stringify({
      prompt: userMessage,  // Container expects 'prompt', not 'message'
      stream: false,        // Try non-streaming first to debug
    });

    console.log('Payload being sent to AgentCore:', payload);

    // Invoke AgentCore Runtime
    const command = new InvokeAgentRuntimeCommand({
      agentRuntimeArn: AGENTCORE_RUNTIME_ARN,
      contentType: 'application/json',
      accept: 'application/json', // Non-streaming response
      payload: new TextEncoder().encode(payload),
    });

    console.log('Sending InvokeAgentRuntimeCommand...');
    const response = await agentCoreClient.send(command);
    
    // Log ALL properties of the response to find where the data is
    console.log('AgentCore response - all keys:', Object.keys(response));
    console.log('AgentCore response - property details:', {
      contentType: response.contentType,
      statusCode: response.statusCode,
      // Check body
      bodyExists: !!response.body,
      bodyType: typeof response.body,
      bodyConstructorName: response.body?.constructor?.name,
      bodyKeys: response.body ? Object.keys(response.body) : [],
      // Check for alternate property names on response
      responseKeys: Object.keys(response),
      hasResponse: 'response' in response,
      hasPayload: 'payload' in response,
      hasOutput: 'output' in response,
      hasData: 'data' in response,
      hasResult: 'result' in response,
      hasStream: 'stream' in response,
      // Check $metadata
      metadata: (response as any).$metadata,
    });
    
    // If body exists, log its properties
    if (response.body) {
      console.log('Body inspection:', {
        isUint8Array: response.body instanceof Uint8Array,
        hasAsyncIterator: Symbol.asyncIterator in (response.body as any),
        hasIterator: Symbol.iterator in (response.body as any),
        bodyKeys: Object.keys(response.body),
        prototypeKeys: Object.getOwnPropertyNames(Object.getPrototypeOf(response.body)),
      });
    }
    
    console.log('AgentCore response received:', {
      contentType: response.contentType,
      statusCode: response.statusCode,
      hasBody: !!response.body,
      bodyType: response.body ? typeof response.body : 'undefined',
      // The actual response is in response.response, not response.body!
      hasResponseField: !!(response as any).response,
      responseFieldType: typeof (response as any).response,
    });

    // Process the response - SDK returns data in 'response' field, NOT 'body'!
    const responseStream = (response as any).response;
    if (responseStream) {
      // The response could be a Uint8Array, ReadableStream, or AsyncIterable
      let bodyText = '';
      
      // Check if response is already a Uint8Array
      if (responseStream instanceof Uint8Array) {
        bodyText = new TextDecoder().decode(responseStream);
        console.log('Response was Uint8Array, decoded:', bodyText.substring(0, 500));
      }
      // Check if it's an async iterable (streaming)
      else if (Symbol.asyncIterator in responseStream) {
        const chunks: Uint8Array[] = [];
        for await (const chunk of responseStream as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        bodyText = new TextDecoder().decode(combined);
        console.log('Response was AsyncIterable, decoded:', bodyText.substring(0, 500));
      }
      // Check if it's a string already
      else if (typeof responseStream === 'string') {
        bodyText = responseStream;
        console.log('Response was string:', bodyText.substring(0, 500));
      }
      // Try to convert using streamToBuffer as fallback
      else {
        try {
          const bodyBytes = await streamToBuffer(responseStream as any);
          bodyText = new TextDecoder().decode(bodyBytes);
          console.log('Response converted via streamToBuffer:', bodyText.substring(0, 500));
        } catch (streamError) {
          console.error('Failed to read response stream:', streamError);
          // Try toString as last resort
          bodyText = String(responseStream);
          console.log('Response via toString:', bodyText.substring(0, 500));
        }
      }

      // Parse the JSON response from container
      // Container returns: {"response":"...","status":"success","steps":1,"duration":1817,"usage":{...}}
      let usageData: any = null;
      try {
        const responseData = JSON.parse(bodyText);
        console.log('Parsed response data:', responseData);
        
        fullResponse = responseData.response || responseData.content || bodyText;
        usageData = responseData.usage;
        
        // Send the response to WebSocket
        await sendToConnection(wsClient, connectionId, {
          type: 'stream',
          chunk: fullResponse,
          timestamp: new Date().toISOString(),
        });
        
        console.log('Sent response to WebSocket:', fullResponse.substring(0, 100));
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        console.log('Raw body text:', bodyText);
        
        // Send raw text as fallback
        fullResponse = bodyText;
        await sendToConnection(wsClient, connectionId, {
          type: 'stream',
          chunk: bodyText,
          timestamp: new Date().toISOString(),
        });
      }
      
      const duration = Date.now() - startTime;

      // Send completion with usage data
      // Web UI expects inputTokens, outputTokens, totalTokens directly on the message (not nested)
      await sendToConnection(wsClient, connectionId, {
        type: 'complete',
        stopReason: 'end_turn',
        duration: duration,
        responseLength: fullResponse.length,
        source: 'agentcore-runtime',
        timestamp: new Date().toISOString(),
        // Include token usage directly (not nested under 'usage')
        ...(usageData && {
          inputTokens: usageData.inputTokens,
          outputTokens: usageData.outputTokens,
          totalTokens: usageData.totalTokens,
        }),
      });

      console.log('AgentCore Runtime invocation complete:', {
        duration: `${duration}ms`,
        responseLength: fullResponse.length,
        usage: usageData,
      });
    } else {
      console.warn('No response field received from AgentCore. Response keys:', Object.keys(response));

      const duration = Date.now() - startTime;

      // Send completion
      await sendToConnection(wsClient, connectionId, {
        type: 'complete',
        stopReason: 'end_turn',
        duration: duration,
        responseLength: fullResponse.length,
        source: 'agentcore-runtime',
        timestamp: new Date().toISOString(),
      });

      console.log('AgentCore Runtime invocation complete:', {
        duration: `${duration}ms`,
        responseLength: fullResponse.length,
      });
    }

  } catch (error: any) {
    // Enhanced error logging to capture all available details
    console.error('Error invoking AgentCore Runtime:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.Code || error?.code,
      httpStatusCode: error?.$metadata?.httpStatusCode,
      requestId: error?.$metadata?.requestId,
      fault: error?.$fault,
      retryable: error?.$retryable,
      // Try to get response body if available
      responseBody: error?.response?.body,
      // Full error object
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });
    
    // Also log the raw error for full stack trace
    console.error('Full error stack:', error);
    
    const errorDetails = {
      message: error?.message || 'AgentCore invocation failed',
      code: error?.Code || error?.code || error?.name,
      httpStatus: error?.$metadata?.httpStatusCode,
      requestId: error?.$metadata?.requestId,
    };
    
    await sendToConnection(wsClient, connectionId, {
      type: 'error',
      error: errorDetails.message,
      details: errorDetails,
      source: 'agentcore-runtime',
    });
    
    throw error;
  }
}

/**
 * Process an SSE event from AgentCore and forward to WebSocket
 */
async function processAgentCoreEvent(
  wsClient: ApiGatewayManagementApiClient,
  connectionId: string,
  eventData: any
) {
  console.log('Processing AgentCore event:', eventData.event);

  switch (eventData.event) {
    case 'start':
      await sendToConnection(wsClient, connectionId, {
        type: 'start',
        sessionId: eventData.sessionId,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'text':
      await sendToConnection(wsClient, connectionId, {
        type: 'stream',
        chunk: eventData.content,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'tool_use':
      await sendToConnection(wsClient, connectionId, {
        type: 'tool-call',
        tools: [{
          name: eventData.toolName,
          args: eventData.args,
        }],
        timestamp: new Date().toISOString(),
      });
      break;

    case 'tool_result':
      await sendToConnection(wsClient, connectionId, {
        type: 'tool-result',
        toolName: eventData.toolName,
        contentPreview: typeof eventData.result === 'string'
          ? eventData.result.substring(0, 200)
          : JSON.stringify(eventData.result).substring(0, 200),
        timestamp: new Date().toISOString(),
      });
      break;

    case 'error':
      await sendToConnection(wsClient, connectionId, {
        type: 'error',
        error: eventData.message || eventData.error,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'done':
      // Don't send done here, we send 'complete' after processing
      console.log('AgentCore signaled done');
      break;

    default:
      console.log('Unknown AgentCore event type:', eventData.event);
  }
}

/**
 * Helper to convert a stream/blob to a Buffer
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array> | Blob): Promise<Uint8Array> {
  if ('arrayBuffer' in stream) {
    // It's a Blob
    const arrayBuffer = await stream.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  
  // It's a ReadableStream
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  
  // Concatenate chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}
