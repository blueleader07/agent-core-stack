/**
 * OpenTelemetry Instrumentation for AgentCore Runtime
 * 
 * This file configures ADOT (AWS Distro for OpenTelemetry) to emit traces,
 * metrics, and logs for AgentCore observability in CloudWatch.
 * 
 * MUST be loaded BEFORE the application starts using:
 * node --require ./dist/tracing.js dist/server.js
 * 
 * Environment Variables (set by AgentCore Runtime):
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint for traces/metrics
 * - OTEL_SERVICE_NAME: Service name for telemetry
 * - AWS_REGION: AWS region for CloudWatch
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Get configuration from environment (set by AgentCore Runtime)
const serviceName = process.env.OTEL_SERVICE_NAME || 'agentcore-runtime';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const awsRegion = process.env.AWS_REGION || 'us-east-1';

console.log('Initializing OpenTelemetry instrumentation...', {
  serviceName,
  otlpEndpoint,
  awsRegion,
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers: {},
});

// Configure SDK with auto-instrumentation
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    'cloud.provider': 'aws',
    'cloud.platform': 'aws_bedrock_agentcore',
    'cloud.region': awsRegion,
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instrument popular libraries
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-aws-sdk': { enabled: true },
    }),
  ],
});

// Start SDK
sdk.start();

console.log('✅ OpenTelemetry instrumentation started');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});
