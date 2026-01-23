/**
 * AgentCore Runtime Lambda Handler with LangGraph
 * 
 * Uses LangGraph StateGraph for agent orchestration with AWS Bedrock.
 * Follows the LangGraph + AgentCore pattern from AWS documentation.
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatBedrockConverse } from '@langchain/aws';
import { HumanMessage, AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
// import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt'; // Not available in current version
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import axios from 'axios';

// Initialize LangChain Bedrock model
const llm = new ChatBedrockConverse({
  model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  region: process.env.AWS_REGION || 'us-east-1',
  temperature: 1.0,
  maxTokens: 4096,
});

// Define the state annotation for LangGraph
// Using add_messages pattern to append messages to history
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

// Define tools using LangChain tool() function
const readArticleTool = tool(
  async ({ url }: { url: string }) => {
    console.log(`Tool: read_article called with URL: ${url}`);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentCoreRuntime/1.0)',
        },
        timeout: 30000,
      });

      // Simple HTML extraction
      const html = response.data;
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const content = text.substring(0, 10000); // Limit to 10K chars
      console.log(`Tool: read_article extracted ${content.length} chars`);
      return content;
    } catch (error) {
      const errorMsg = `Failed to read article: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Tool error:', errorMsg);
      return errorMsg;
    }
  },
  {
    name: 'read_article',
    description: 'Reads and extracts the main content from a URL. Use this when the user provides a URL or asks about an article.',
    schema: z.object({
      url: z.string().describe('The URL of the article to read'),
    }),
  }
);

// List of all tools
const tools = [readArticleTool];

// Bind tools to the LLM
const llmWithTools = llm.bindTools(tools);

// Define the chatbot node - calls the LLM with tools
async function chatbot(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  console.log('LangGraph: chatbot node executing, messages:', state.messages.length);
  
  const response = await llmWithTools.invoke(state.messages);
  console.log('LangGraph: chatbot response received');
  
  return { messages: [response] };
}

// Create the tool node using LangGraph prebuilt
// const toolNode = new ToolNode(tools); // Not available - use custom implementation

// Build the LangGraph state machine
function buildGraph() {
  const graph = new StateGraph(GraphState)
    // Add nodes
    .addNode('chatbot', chatbot);
    // .addNode('tools', toolNode)
    // Add edges
    // .addEdge(START, 'chatbot')
    // .addConditionalEdges('chatbot', toolsCondition, {
    //   tools: 'tools',
    //   [END]: END,
    // })
    // .addEdge('tools', 'chatbot');

  return graph.compile();
}

// Create the compiled graph
const graph = buildGraph();

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
 * WebSocket Lambda Handler
 */
export const handler = async (event: WebSocketEvent) => {
  console.log('LangGraph AgentCore Handler - Event:', JSON.stringify(event, null, 2));
  
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
  
  console.log(`LangGraph connection: ${connectionId}`, { userId, email });
  
  return { statusCode: 200, body: 'Connected' };
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId: string) {
  console.log(`LangGraph disconnected: ${connectionId}`);
  
  return { statusCode: 200, body: 'Disconnected' };
}

/**
 * Handle incoming messages
 */
async function handleMessage(event: WebSocketEvent, domainName: string, stage: string) {
  const { connectionId } = event.requestContext;
  
  const body = event.body ? JSON.parse(event.body) : {};
  console.log('LangGraph message:', JSON.stringify(body));
  
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
      await runLangGraphAgent(apiGatewayClient, connectionId, message);
      return { statusCode: 200, body: 'LangGraph agent invoked' };
    }

    // Echo for testing
    await sendToConnection(apiGatewayClient, connectionId, {
      type: 'echo',
      message: message || 'Hello from LangGraph AgentCore!',
      timestamp: new Date().toISOString(),
    });

    return { statusCode: 200, body: 'Message sent' };

  } catch (error) {
    console.error('LangGraph error:', error);
    
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
 * Run LangGraph agent and stream responses
 */
async function runLangGraphAgent(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  userMessage: string
) {
  console.log('Starting LangGraph agent:', userMessage);
  
  const startTime = Date.now();
  let stepCount = 0;
  let fullResponse = '';

  try {
    // Create initial state with user message
    const initialState = {
      messages: [new HumanMessage(userMessage)],
    };

    // Stream the graph execution
    const stream = await graph.stream(initialState, {
      streamMode: 'updates',
    });

    for await (const update of stream) {
      stepCount++;
      console.log(`LangGraph step ${stepCount}:`, Object.keys(update));

      // Process node updates
      for (const [nodeName, nodeOutput] of Object.entries(update)) {
        console.log(`Node '${nodeName}' output:`, JSON.stringify(nodeOutput, null, 2).substring(0, 500));

        // Extract messages from node output
        const output = nodeOutput as { messages?: BaseMessage[] };
        if (output.messages) {
          for (const message of output.messages) {
            if (message instanceof AIMessage) {
              // Stream AI response content
              const content = message.content;
              if (typeof content === 'string' && content.length > 0) {
                fullResponse += content;
                await sendToConnection(client, connectionId, {
                  type: 'stream',
                  chunk: content,
                  node: nodeName,
                  step: stepCount,
                  timestamp: new Date().toISOString(),
                });
              }

              // Check for tool calls
              if (message.tool_calls && message.tool_calls.length > 0) {
                await sendToConnection(client, connectionId, {
                  type: 'tool-call',
                  tools: message.tool_calls.map(tc => ({
                    name: tc.name,
                    args: tc.args,
                  })),
                  step: stepCount,
                  timestamp: new Date().toISOString(),
                });
              }
            }

            if (message instanceof ToolMessage) {
              // Tool result
              await sendToConnection(client, connectionId, {
                type: 'tool-result',
                toolName: message.name,
                contentPreview: typeof message.content === 'string' 
                  ? message.content.substring(0, 200) + (message.content.length > 200 ? '...' : '')
                  : 'Complex result',
                step: stepCount,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    // Send completion
    await sendToConnection(client, connectionId, {
      type: 'complete',
      stopReason: 'end_turn',
      steps: stepCount,
      duration: duration,
      responseLength: fullResponse.length,
      timestamp: new Date().toISOString(),
    });

    console.log('LangGraph execution complete:', {
      steps: stepCount,
      duration: `${duration}ms`,
      responseLength: fullResponse.length,
    });

  } catch (error) {
    console.error('Error in LangGraph agent:', error);
    
    await sendToConnection(client, connectionId, {
      type: 'error',
      error: error instanceof Error ? error.message : 'LangGraph execution failed',
      step: stepCount,
    });
    
    throw error;
  }
}
