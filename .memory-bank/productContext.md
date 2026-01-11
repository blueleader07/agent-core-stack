# Product Context

## Vision
Build a robust, scalable cloud infrastructure foundation that enables AI agents to operate reliably and efficiently in production environments.

## Target Users
- **Internal**: AI agents requiring cloud resources (compute, storage, queues)
- **Developers**: Engineers building and deploying agent workflows
- **Operations**: Teams managing infrastructure and monitoring systems

## Core Principles

### 1. Infrastructure as Code
All infrastructure defined in TypeScript using AWS CDK. No manual console changes. Everything version-controlled and reproducible.

### 2. Serverless-First
Prefer managed services (Lambda, S3, DynamoDB, SQS) over EC2/containers to minimize operational overhead and optimize costs.

### 3. Event-Driven Architecture
Design for asynchronous, event-driven workflows using SQS, SNS, EventBridge to enable scalable agent coordination.

### 4. Security by Default
- IAM roles with least-privilege access
- Encrypted storage (S3, DynamoDB)
- VPC isolation where needed
- Secrets in AWS Secrets Manager

### 5. Cost Optimization
- Use serverless services (pay per use)
- Lifecycle policies for data retention
- Reserved capacity only when proven cost-effective
- Tag all resources for cost tracking

### 6. Observability
- CloudWatch Logs for all services
- CloudWatch Metrics for performance tracking
- X-Ray for distributed tracing
- Alarms for critical failures

## Non-Goals
- Manual infrastructure management
- Server maintenance and patching
- Multi-cloud deployment (AWS only)
- Real-time streaming (use batch/event-driven instead)

## Design Constraints
- **Region**: us-east-1 (primary)
- **Account**: Single AWS account (991551400024)
- **Budget**: Optimize for minimal cost during development
- **Deployment**: Automated via CDK CLI only
- **State**: CloudFormation managed, no manual drift

## Success Metrics
- **Deployment Time**: < 5 minutes for typical stack updates
- **Cost**: < $50/month during development
- **Reliability**: 99.9% uptime for critical resources
- **Security**: Zero IAM privilege escalations
- **Drift**: Zero manual console changes (all via CDK)
