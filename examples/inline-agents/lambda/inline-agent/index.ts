import { 
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
 * Main WebSocket handler for inline agents
 */
export const handler = async (event: WebSocketEvent) => {
  const { connectionId, routeKey, domainName, stage } = event.requestContext;
  
  console.log('Inline agent event:', { connectionId, routeKey });

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
 * Handle incoming messages with inline agent logic
 */
async function handleMessage(event: WebSocketEvent, domainName: string, stage: string) {
  const { connectionId } = event.requestContext;
  const body = event.body ? JSON.parse(event.body) : {};
  
  const callbackUrl = `https://${domainName}/${stage}`;
  const apiGatewayClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });

  try {
    const { action, message } = body;

    if (action === 'ping') {
      await sendToConnection(apiGatewayClient, connectionId, {
        type: 'pong',
        timestamp: new Date().toISOString(),
      });
      return { statusCode: 200, body: 'Pong sent' };
    }

    if (action === 'chat') {
      // Process with inline agent logic
      await processWithInlineAgent(apiGatewayClient, connectionId, message);
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
 * Process message with inline agent using Bedrock Converse API
 */
async function processWithInlineAgent(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  userMessage: string
) {
  // Conversation history (in production, store in DynamoDB)
  const messages: any[] = [
    {
      role: 'user',
      content: [{ text: userMessage }],
    },
  ];

  // Define available tools
  const tools = [
    {
      toolSpec: {
        name: 'fetch_url',
        description: 'Fetch and extract content from a URL',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to fetch',
              },
            },
            required: ['url'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'calculate',
        description: 'Perform mathematical calculations',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")',
              },
            },
            required: ['expression'],
          },
        },
      },
    },
    {
      toolSpec: {
        name: 'get_weather',
        description: 'Get current weather for a location (mock data)',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name or location',
              },
            },
            required: ['location'],
          },
        },
      },
    },
  ];

  // System prompt for the inline agent
  const systemPrompt = [
    {
      text: `You are a helpful AI assistant with access to tools. 
You can fetch URLs, perform calculations, and get weather information.
Use the available tools when needed to help answer user questions.`,
    },
  ];

  // Agent loop: keep calling Bedrock until no more tool use
  let continueLoop = true;
  let loopCount = 0;
  const MAX_LOOPS = 10;

  while (continueLoop && loopCount < MAX_LOOPS) {
    loopCount++;

    const command = new ConverseStreamCommand({
      modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      messages,
      system: systemPrompt,
      toolConfig: { tools },
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 2048,
      },
    });

    const response = await bedrockClient.send(command);

    let currentText = '';
    let toolUses: any[] = [];
    let stopReason = '';

    // Stream response
    if (response.stream) {
      for await (const event of response.stream) {
        if (event.contentBlockDelta?.delta?.text) {
          const chunk = event.contentBlockDelta.delta.text;
          currentText += chunk;
          
          // Send streaming chunk to client
          await sendToConnection(client, connectionId, {
            type: 'stream',
            chunk,
            timestamp: new Date().toISOString(),
          });
        }

        if (event.contentBlockStart?.start?.toolUse) {
          toolUses.push({
            toolUseId: event.contentBlockStart.start.toolUse.toolUseId,
            name: event.contentBlockStart.start.toolUse.name,
            input: {},
          });
        }

        if (event.contentBlockDelta?.delta?.toolUse) {
          const lastTool = toolUses[toolUses.length - 1];
          if (lastTool) {
            Object.assign(lastTool.input, event.contentBlockDelta.delta.toolUse.input || {});
          }
        }

        if (event.messageStop?.stopReason) {
          stopReason = event.messageStop.stopReason;
        }
      }
    }

    // Build assistant message content
    const assistantContent: any[] = [];
    if (currentText) {
      assistantContent.push({ text: currentText });
    }
    toolUses.forEach(tool => {
      assistantContent.push({ toolUse: tool });
    });

    // Add assistant response to conversation
    messages.push({
      role: 'assistant',
      content: assistantContent,
    });

    // Check if we need to execute tools
    if (stopReason === 'tool_use' && toolUses.length > 0) {
      // Execute tools
      const toolResults: any[] = [];
      
      for (const toolUse of toolUses) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ text: JSON.stringify(result) }],
            status: result.error ? 'error' : 'success',
          },
        });

        // Send tool execution notification
        await sendToConnection(client, connectionId, {
          type: 'tool',
          tool: toolUse.name,
          input: toolUse.input,
          output: result,
          timestamp: new Date().toISOString(),
        });
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Continue the loop to get final response
      continueLoop = true;
    } else {
      // No more tool use, we're done
      continueLoop = false;
    }
  }

  // Send completion signal
  await sendToConnection(client, connectionId, {
    type: 'complete',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Execute a tool and return results
 */
async function executeTool(toolName: string, input: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, input);

  try {
    switch (toolName) {
      case 'fetch_url':
        return await fetchUrl(input.url);
      
      case 'calculate':
        return calculate(input.expression);
      
      case 'get_weather':
        return getWeather(input.location);
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { 
      error: error instanceof Error ? error.message : 'Tool execution failed' 
    };
  }
}

/**
 * Fetch and extract content from URL
 */
async function fetchUrl(url: string): Promise<any> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    timeout: 30000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);
  
  const title = $('title').text() || 
                $('meta[property="og:title"]').attr('content') ||
                $('h1').first().text() ||
                'Untitled';
  
  const excerpt = $('meta[name="description"]').attr('content') || 
                  $('meta[property="og:description"]').attr('content') ||
                  '';
  
  $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();
  
  let content = $('article').text() || $('main').text() || $('body').text();
  content = content.replace(/\s+/g, ' ').trim().substring(0, 5000);

  return {
    url,
    title,
    excerpt,
    content: content || 'Could not extract content',
    siteName: new URL(url).hostname,
  };
}

/**
 * Perform calculation
 */
function calculate(expression: string): any {
  try {
    // Safe evaluation of mathematical expressions
    // In production, use a proper math library like mathjs
    const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
    const result = eval(sanitized);
    return { expression, result };
  } catch (error) {
    return { 
      error: 'Invalid expression', 
      expression 
    };
  }
}

/**
 * Get weather (mock implementation)
 */
function getWeather(location: string): any {
  // Mock weather data
  const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const randomTemp = Math.floor(Math.random() * 30) + 50;

  return {
    location,
    temperature: `${randomTemp}°F`,
    condition: randomCondition,
    humidity: `${Math.floor(Math.random() * 40) + 40}%`,
    note: 'This is mock data for demonstration purposes',
  };
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
