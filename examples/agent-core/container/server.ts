/**
 * AgentCore Runtime HTTP Server
 * 
 * Implements the AWS Bedrock AgentCore HTTP Protocol Contract:
 * - POST /invocations - Main agent endpoint (JSON in, JSON/SSE out)
 * - GET /ping - Health check
 * - WebSocket /ws - Real-time streaming (optional)
 * 
 * Host: 0.0.0.0
 * Port: 8080
 * Platform: ARM64 container
 * 
 * @see https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-http-protocol-contract.html
 */

import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatBedrockConverse } from '@langchain/aws';
import { HumanMessage, AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const MODEL_ID = process.env.MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

console.log('AgentCore Runtime starting...', { PORT, HOST, MODEL_ID, AWS_REGION });

// =============================================================================
// LangGraph Agent Setup
// =============================================================================

// Initialize LangChain Bedrock model
const llm = new ChatBedrockConverse({
  model: MODEL_ID,
  region: AWS_REGION,
  temperature: 1.0,
  maxTokens: 4096,
});

// Define the state annotation for LangGraph
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

// Define read_article tool with explicit schema
const readArticleSchema = z.object({
  url: z.string().describe('The URL of the article to read'),
});

async function readArticleImpl(input: z.infer<typeof readArticleSchema>): Promise<string> {
  console.log(`[Tool] read_article: ${input.url}`);
  
  try {
    const response = await axios.get(input.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentCoreRuntime/1.0)',
      },
      timeout: 30000,
    });

    // Simple HTML to text extraction
    const html = response.data;
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const content = text.substring(0, 10000); // Limit to 10K chars
    console.log(`[Tool] read_article: extracted ${content.length} chars`);
    return content;
  } catch (error) {
    const errorMsg = `Failed to read article: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Tool] Error:', errorMsg);
    return errorMsg;
  }
}

// Create tool using DynamicStructuredTool
const readArticleTool = new DynamicStructuredTool({
  name: 'read_article',
  description: 'Reads and extracts the main content from a URL. Use this when the user provides a URL or asks about an article.',
  schema: readArticleSchema,
  func: readArticleImpl,
});

// List of all tools
const tools = [readArticleTool];

// Bind tools to the LLM
const llmWithTools = llm.bindTools(tools);

// Define the chatbot node
async function chatbot(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  console.log('[LangGraph] chatbot node, messages:', state.messages.length);
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

// Create the tool node using LangGraph prebuilt
const toolNode = new ToolNode(tools);

// Build the LangGraph state machine
function buildGraph() {
  const graph = new StateGraph(GraphState)
    .addNode('chatbot', chatbot)
    .addNode('tools', toolNode)
    .addEdge(START, 'chatbot')
    .addConditionalEdges('chatbot', toolsCondition, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'chatbot');

  return graph.compile();
}

// Create the compiled graph
const graph = buildGraph();

// =============================================================================
// Express HTTP Server
// =============================================================================

const app = express();
app.use(express.json());

// Track server health state
let lastUpdateTime = Date.now();
let isBusy = false;

/**
 * GET /ping - Health Check Endpoint
 * 
 * Returns server health status for AgentCore monitoring.
 * 
 * Response:
 * - status: "Healthy" | "HealthyBusy"
 * - time_of_last_update: Unix timestamp
 */
app.get('/ping', (req: Request, res: Response) => {
  const status = isBusy ? 'HealthyBusy' : 'Healthy';
  
  res.json({
    status,
    time_of_last_update: Math.floor(lastUpdateTime / 1000),
  });
});

/**
 * POST /invocations - Main Agent Endpoint
 * 
 * Receives incoming requests and processes them through the LangGraph agent.
 * Supports both JSON (non-streaming) and SSE (streaming) responses.
 * 
 * Request:
 * {
 *   "prompt": "User message",
 *   "stream": true/false (optional, default true)
 * }
 * 
 * Response (JSON): { "response": "...", "status": "success" }
 * Response (SSE): data: {"event": "partial response"}\n\n
 */
app.post('/invocations', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { prompt, stream = true } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Missing required field: prompt',
      status: 'error',
    });
  }

  console.log('[/invocations] Processing:', prompt.substring(0, 100));
  isBusy = true;
  lastUpdateTime = Date.now();

  try {
    const initialState = {
      messages: [new HumanMessage(prompt)],
    };

    if (stream) {
      // SSE Streaming Response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      let stepCount = 0;

      const graphStream = await graph.stream(initialState, {
        streamMode: 'updates',
      });

      for await (const update of graphStream) {
        stepCount++;
        
        for (const [nodeName, nodeOutput] of Object.entries(update)) {
          const output = nodeOutput as { messages?: BaseMessage[] };
          
          if (output.messages) {
            for (const message of output.messages) {
              if (message instanceof AIMessage) {
                const content = message.content;
                if (typeof content === 'string' && content.length > 0) {
                  fullResponse += content;
                  res.write(`data: ${JSON.stringify({ 
                    event: 'chunk', 
                    content,
                    node: nodeName,
                    step: stepCount,
                  })}\n\n`);
                }

                // Report tool calls
                if (message.tool_calls && message.tool_calls.length > 0) {
                  res.write(`data: ${JSON.stringify({
                    event: 'tool_call',
                    tools: message.tool_calls.map(tc => ({
                      name: tc.name,
                      args: tc.args,
                    })),
                    step: stepCount,
                  })}\n\n`);
                }
              }

              if (message instanceof ToolMessage) {
                res.write(`data: ${JSON.stringify({
                  event: 'tool_result',
                  tool: message.name,
                  preview: typeof message.content === 'string'
                    ? message.content.substring(0, 200)
                    : 'Complex result',
                  step: stepCount,
                })}\n\n`);
              }
            }
          }
        }
      }

      // Send completion event
      const duration = Date.now() - startTime;
      res.write(`data: ${JSON.stringify({
        event: 'complete',
        response: fullResponse,
        steps: stepCount,
        duration,
        status: 'success',
      })}\n\n`);

      res.end();

    } else {
      // JSON Non-Streaming Response
      let fullResponse = '';
      let stepCount = 0;

      const graphStream = await graph.stream(initialState, {
        streamMode: 'updates',
      });

      // Track token usage across all messages
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for await (const update of graphStream) {
        stepCount++;
        
        for (const [nodeName, nodeOutput] of Object.entries(update)) {
          const output = nodeOutput as { messages?: BaseMessage[] };
          
          if (output.messages) {
            for (const message of output.messages) {
              if (message instanceof AIMessage) {
                const content = message.content;
                if (typeof content === 'string') {
                  fullResponse += content;
                }
                
                // Extract token usage from response_metadata or usage_metadata
                const metadata = (message as any).response_metadata;
                const usageMetadata = (message as any).usage_metadata;
                
                // Log to debug what's available
                console.log('[Token Usage Debug]', {
                  hasResponseMetadata: !!metadata,
                  hasUsageMetadata: !!usageMetadata,
                  responseMetadataKeys: metadata ? Object.keys(metadata) : [],
                  usageMetadataKeys: usageMetadata ? Object.keys(usageMetadata) : [],
                  responseMetadata: metadata,
                  usageMetadata: usageMetadata,
                });
                
                // Try response_metadata.usage first (Bedrock Converse format)
                if (metadata?.usage) {
                  totalInputTokens += metadata.usage.input_tokens || metadata.usage.inputTokens || 0;
                  totalOutputTokens += metadata.usage.output_tokens || metadata.usage.outputTokens || 0;
                }
                // Try usage_metadata (LangChain standard format)
                else if (usageMetadata) {
                  totalInputTokens += usageMetadata.input_tokens || usageMetadata.inputTokens || 0;
                  totalOutputTokens += usageMetadata.output_tokens || usageMetadata.outputTokens || 0;
                }
              }
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      
      res.json({
        response: fullResponse,
        status: 'success',
        steps: stepCount,
        duration,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
      });
    }

  } catch (error) {
    console.error('[/invocations] Error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Agent execution failed',
        status: 'error',
      });
    } else {
      // SSE error
      res.write(`data: ${JSON.stringify({
        event: 'error',
        error: error instanceof Error ? error.message : 'Agent execution failed',
      })}\n\n`);
      res.end();
    }
  } finally {
    isBusy = false;
    lastUpdateTime = Date.now();
  }
});

// =============================================================================
// HTTP Server with WebSocket Support
// =============================================================================

const server = createServer(app);

// WebSocket server on /ws path
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
});

wss.on('connection', (ws: WebSocket) => {
  console.log('[WebSocket] Client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WebSocket] Received:', message);

      const { prompt, action } = message;

      // Handle ping
      if (action === 'ping') {
        ws.send(JSON.stringify({
          message_type: 'pong',
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // Handle agent invocation
      if (prompt) {
        isBusy = true;
        lastUpdateTime = Date.now();

        const initialState = {
          messages: [new HumanMessage(prompt)],
        };

        let fullResponse = '';
        let stepCount = 0;

        const graphStream = await graph.stream(initialState, {
          streamMode: 'updates',
        });

        for await (const update of graphStream) {
          stepCount++;
          
          for (const [nodeName, nodeOutput] of Object.entries(update)) {
            const output = nodeOutput as { messages?: BaseMessage[] };
            
            if (output.messages) {
              for (const msg of output.messages) {
                if (msg instanceof AIMessage) {
                  const content = msg.content;
                  if (typeof content === 'string' && content.length > 0) {
                    fullResponse += content;
                    ws.send(JSON.stringify({
                      message_type: 'agent_response',
                      response: content,
                      node: nodeName,
                      step: stepCount,
                    }));
                  }

                  if (msg.tool_calls && msg.tool_calls.length > 0) {
                    ws.send(JSON.stringify({
                      message_type: 'tool_call',
                      tools: msg.tool_calls.map(tc => ({
                        name: tc.name,
                        args: tc.args,
                      })),
                      step: stepCount,
                    }));
                  }
                }

                if (msg instanceof ToolMessage) {
                  ws.send(JSON.stringify({
                    message_type: 'tool_result',
                    tool: msg.name,
                    preview: typeof msg.content === 'string'
                      ? msg.content.substring(0, 200)
                      : 'Complex result',
                    step: stepCount,
                  }));
                }
              }
            }
          }
        }

        ws.send(JSON.stringify({
          message_type: 'complete',
          response: fullResponse,
          steps: stepCount,
        }));

        isBusy = false;
        lastUpdateTime = Date.now();
      }

    } catch (error) {
      console.error('[WebSocket] Error:', error);
      ws.send(JSON.stringify({
        message_type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      isBusy = false;
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error);
  });
});

// =============================================================================
// Start Server
// =============================================================================

server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           AgentCore Runtime Server Started                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Host:     ${HOST}                                            ║
║  Port:     ${PORT}                                              ║
║  Model:    ${MODEL_ID.substring(0, 40)}...                    
║  Region:   ${AWS_REGION}                                        
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║    GET  /ping         - Health check                          ║
║    POST /invocations  - Agent invocation (JSON/SSE)           ║
║    WS   /ws           - WebSocket streaming                   ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
