import { useState, useEffect, useRef } from 'react';
import { CognitoAuth } from './CognitoAuth';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type AgentType = 'converse' | 'inline' | 'agent-core';

const AGENT_CONFIGS: Record<AgentType, {
  name: string;
  wsUrl: string;
  description: string;
  features: string[];
  examples: string[];
  note?: string;
}> = {
  converse: {
    name: 'Converse API',
    wsUrl: import.meta.env.VITE_CONVERSE_WS_URL || '',
    description: 'Direct Bedrock Converse API integration - simplest pattern for chat applications',
    features: [
      'Direct model calls with no agent overhead',
      'WebSocket streaming responses',
      'Function calling support',
      'Lowest latency option',
    ],
    examples: [
      'What is the capital of France?',
      'Explain quantum computing in simple terms',
      'Write a haiku about coding',
    ],
  },
  inline: {
    name: 'Inline Agents',
    wsUrl: import.meta.env.VITE_INLINE_WS_URL || '',
    description: 'Agents defined in Lambda code with custom tool implementations',
    features: [
      'Calculator tool for math operations',
      'URL fetcher for web content',
      'Weather data (mock)',
      'Fast iteration and debugging',
    ],
    examples: [
      'What is 1234 * 5678?',
      'Fetch content from https://aws.amazon.com/bedrock',
      'What\'s the weather in San Francisco?',
    ],
  },
  'agent-core': {
    name: 'Agent Core',
    wsUrl: import.meta.env.VITE_AGENT_CORE_WS_URL || '',
    description: 'Full Bedrock Agent service with action groups and orchestration',
    features: [
      'Bedrock-managed agent lifecycle',
      'URL fetcher action group',
      'Built-in conversation memory',
      'Production-ready orchestration',
    ],
    examples: [
      'Fetch and summarize https://docs.aws.amazon.com/bedrock',
      'What can you help me with?',
      'Analyze the content from https://techcrunch.com',
    ],
    note: '💡 Cost tracking: Agent Core API doesn\'t expose token usage. View actual usage in CloudWatch Metrics (AWS Bedrock > Agent metrics)',
  },
};

function App() {
  const [activeAgent, setActiveAgent] = useState<AgentType>('converse');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [authToken, setAuthToken] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Claude Sonnet 4.5 pricing
  const COST_PER_INPUT_TOKEN = 0.000003;  // $3 per million tokens
  const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per million tokens

  // Cognito configuration from environment variables
  const cognitoConfig = {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-connect when active agent changes or auth token is available
  useEffect(() => {
    if (authToken && AGENT_CONFIGS[activeAgent].wsUrl) {
      connect();
    }
    
    // Disconnect when switching agents or unmounting
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [activeAgent, authToken]);

  const connect = () => {
    const config = AGENT_CONFIGS[activeAgent];
    
    if (!config.wsUrl) {
      addMessage('error', 'WebSocket URL not configured. Set VITE_*_WS_URL environment variable.');
      return;
    }

    if (!authToken) {
      addMessage('error', 'Please sign in with Google first.');
      return;
    }

    setConnectionStatus('connecting');
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create WebSocket with auth token
    const ws = new WebSocket(`${config.wsUrl}?token=${encodeURIComponent(authToken)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'stream' && data.chunk) {
          // Append to last assistant message or create new one
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: lastMsg.content + data.chunk },
              ];
            } else {
              return [
                ...prev,
                {
                  role: 'assistant',
                  content: data.chunk,
                  timestamp: new Date().toISOString(),
                },
              ];
            }
          });
        } else if (data.type === 'complete') {
          console.log('Complete event received:', data);
          console.log('Total tokens:', data.totalTokens);
          console.log('Input tokens:', data.inputTokens);
          console.log('Output tokens:', data.outputTokens);
          setIsStreaming(false);
          if (data.totalTokens) {
            setTotalTokens(prev => prev + data.totalTokens);
            const cost = (data.inputTokens || 0) * COST_PER_INPUT_TOKEN + 
                        (data.outputTokens || 0) * COST_PER_OUTPUT_TOKEN;
            console.log('Calculated cost:', cost);
            setTotalCost(prev => prev + cost);
          }
        } else if (data.type === 'error') {
          addMessage('error', data.error || 'Unknown error');
          setIsStreaming(false);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage('error', 'WebSocket error occurred');
      setConnectionStatus('disconnected');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setIsStreaming(false);
    };
  };

  const addMessage = (role: Message['role'], content: string) => {
    setMessages((prev) => [
      ...prev,
      { role, content, timestamp: new Date().toISOString() },
    ]);
  };

  const sendMessage = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    if (connectionStatus !== 'connected') {
      addMessage('error', 'Waiting for connection...');
      return;
    }

    addMessage('user', messageText);
    setInput('');
    setIsStreaming(true);

    const message = {
      action: 'chat',
      message: messageText,
    };

    wsRef.current?.send(JSON.stringify(message));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    if (connectionStatus === 'connected') {
      sendMessage(example);
    }
  };

  const config = AGENT_CONFIGS[activeAgent];

  // Show only sign-in screen if not authenticated
  if (!authToken) {
    return (
      <div className="app">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AWS Bedrock Integration Examples
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '3rem', maxWidth: '600px' }}>
            Compare three different patterns for building AI agents with AWS Bedrock
          </p>
          <CognitoAuth config={cognitoConfig} onTokenReceived={setAuthToken} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>AWS Bedrock Integration Examples</h1>
        <p>Compare three different patterns for building AI agents with AWS Bedrock</p>
      </header>

      <div className="agent-tabs">
        {(Object.keys(AGENT_CONFIGS) as AgentType[]).map((agent) => (
          <button
            key={agent}
            className={`tab-button ${activeAgent === agent ? 'active' : ''}`}
            onClick={() => {
              setActiveAgent(agent);
              setMessages([]);
            }}
          >
            {AGENT_CONFIGS[agent].name}
          </button>
        ))}
      </div>

      <div
        className={`connection-status ${connectionStatus}`}
      >
        <span>
          {connectionStatus === 'connected' && '✓ Connected'}
          {connectionStatus === 'connecting' && '⏳ Connecting...'}
          {connectionStatus === 'disconnected' && '○ Disconnected'}
        </span>
        {totalTokens > 0 && (
          <span className="usage-stats">
            {totalTokens.toLocaleString()} tokens · ${totalCost.toFixed(4)}
          </span>
        )}
      </div>

      <div className="agent-info-toggle">
        <button 
          className="info-toggle-button"
          onClick={() => setShowInfo(!showInfo)}
        >
          {showInfo ? '▼' : '▶'} {config.name} - {config.description}
        </button>
        {showInfo && (
          <div className="agent-info-content">
            <ul className="feature-list">
              {config.features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>

            {config.note && (
              <div className="info-note">
                {config.note}
              </div>
            )}

            <div className="example-queries">
              <strong style={{ width: '100%', marginBottom: '0.5rem', display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>
                Try these examples:
              </strong>
              {config.examples.map((example, i) => (
                <button
                  key={i}
                  className="example-query"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-label">
                {msg.role === 'user' && 'You'}
                {msg.role === 'assistant' && config.name}
                {msg.role === 'system' && 'System'}
                {msg.role === 'error' && 'Error'}
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="message assistant">
              <div className="message-label">{config.name}</div>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <div className="input-wrapper">
              <input
                type="text"
                className="input-field"
                placeholder={`Ask ${config.name} a question...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={connectionStatus !== 'connected'}
              />
            </div>
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || connectionStatus !== 'connected' || isStreaming}
            >
              Send
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                className="reset-button"
                onClick={clearChat}
              >
                Reset
              </button>
            )}
          </form>
        </div>
    </div>
  );
}

export default App;
