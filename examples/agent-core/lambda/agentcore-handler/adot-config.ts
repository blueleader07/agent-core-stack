/**
 * ADOT (AWS Distro for OpenTelemetry) Configuration
 * 
 * Enables observability for AgentCore Runtime with CloudWatch Application Signals.
 * This configuration sets up OpenTelemetry tracing and metrics collection.
 */

// OpenTelemetry configuration
export const adotConfig = {
  // Enable tracing
  tracingEnabled: true,
  
  // CloudWatch Application Signals integration
  applicationSignals: {
    enabled: true,
    serviceName: 'agentcore-runtime',
    serviceNamespace: 'bedrock-agents',
  },
  
  // X-Ray integration for distributed tracing
  xrayTracing: {
    enabled: true,
    captureHTTPRequests: true,
    captureAWS: true,
  },
  
  // Metrics configuration
  metrics: {
    enabled: true,
    exportInterval: 60000, // 60 seconds
  },
  
  // Resource attributes
  resourceAttributes: {
    'service.name': 'agentcore-runtime',
    'service.namespace': 'bedrock-agents',
    'deployment.environment': process.env.NODE_ENV || 'production',
  },
};

/**
 * Initialize ADOT instrumentation
 * Call this at the top of your Lambda handler
 */
export function initializeADOT() {
  // In production, ADOT layer will be automatically configured via Lambda layer
  // This provides the configuration that ADOT will use
  
  console.log('ADOT Configuration:', JSON.stringify(adotConfig, null, 2));
  
  // Environment variables for ADOT Lambda Layer
  // These should be set in CDK stack:
  // - OTEL_SERVICE_NAME: agentcore-runtime
  // - OTEL_RESOURCE_ATTRIBUTES: service.namespace=bedrock-agents
  // - AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
  
  return adotConfig;
}
