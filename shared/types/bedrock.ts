/**
 * Shared TypeScript types for Bedrock API responses
 */

export interface BedrockAgentResponse {
  completion: AsyncIterable<BedrockAgentEvent>;
  sessionId: string;
}

export interface BedrockAgentEvent {
  chunk?: {
    bytes: Uint8Array;
  };
}

export interface ConverseRequest {
  modelId: string;
  messages: ConverseMessage[];
  system?: SystemPrompt[];
  inferenceConfig?: InferenceConfig;
  toolConfig?: ToolConfig;
}

export interface ConverseMessage {
  role: 'user' | 'assistant';
  content: MessageContent[];
}

export interface MessageContent {
  text?: string;
  toolUse?: ToolUse;
  toolResult?: ToolResult;
}

export interface ToolUse {
  toolUseId: string;
  name: string;
  input: any;
}

export interface ToolResult {
  toolUseId: string;
  content: ToolResultContent[];
  status?: 'success' | 'error';
}

export interface ToolResultContent {
  text?: string;
  json?: any;
}

export interface SystemPrompt {
  text: string;
}

export interface InferenceConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface ToolConfig {
  tools: Tool[];
}

export interface Tool {
  toolSpec: {
    name: string;
    description: string;
    inputSchema: {
      json: any;
    };
  };
}
