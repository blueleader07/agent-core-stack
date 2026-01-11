# System Patterns

## Architecture Overview

### Infrastructure as Code Pattern
All AWS resources defined in TypeScript using CDK constructs. No manual console changes allowed.

```
bin/agent-core-stack.ts (Entry Point)
    ↓
lib/agent-core-stack.ts (Stack Definition)
    ↓
AWS CloudFormation
    ↓
AWS Resources (Lambda, S3, DynamoDB, etc.)
```

### CDK Stack Pattern

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AgentCoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Resources defined here
  }
}
```

### Deployment Workflow

```
Code Change → Build (tsc) → Synth (CloudFormation) → Diff → Deploy → Verify
```

Commands:
```bash
npm run build     # TypeScript → JavaScript
npm run synth     # Generate CloudFormation
npm run diff      # Show what will change
npm run cdk deploy # Apply changes to AWS
```

## Design Patterns

### 1. Construct Pattern (CDK)
Encapsulate related resources into reusable constructs:

```typescript
export class AgentQueue extends Construct {
  public readonly queue: sqs.Queue;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    this.queue = new sqs.Queue(this, 'Queue', {
      visibilityTimeout: cdk.Duration.seconds(300),
    });
  }
}
```

### 2. Environment Configuration Pattern
Use CDK context or environment variables for config:

```typescript
const app = new cdk.App();
new AgentCoreStack(app, 'AgentCoreStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

### 3. Tagging Pattern
Tag all resources for organization and cost tracking:

```typescript
cdk.Tags.of(this).add('Project', 'AgentCore');
cdk.Tags.of(this).add('Environment', 'dev');
cdk.Tags.of(this).add('ManagedBy', 'CDK');
```

### 4. Removal Policy Pattern
Use appropriate removal policies based on environment:

```typescript
// Development - easy cleanup
removalPolicy: cdk.RemovalPolicy.DESTROY

// Production - prevent data loss
removalPolicy: cdk.RemovalPolicy.RETAIN
```

### 5. IAM Least Privilege Pattern
Grant minimal necessary permissions:

```typescript
const lambda = new lambda.Function(this, 'MyFunction', {...});
const bucket = new s3.Bucket(this, 'MyBucket', {...});

// Don't: lambda.addToRolePolicy(/* broad permissions */)
// Do: 
bucket.grantRead(lambda);
```

## Common CDK Constructs

### S3 Bucket
```typescript
const bucket = new s3.Bucket(this, 'MyBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true, // Only for dev!
});
```

### Lambda Function
```typescript
const fn = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  timeout: cdk.Duration.seconds(30),
  environment: {
    BUCKET_NAME: bucket.bucketName,
  },
});
```

### DynamoDB Table
```typescript
const table = new dynamodb.Table(this, 'MyTable', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

### SQS Queue
```typescript
const queue = new sqs.Queue(this, 'MyQueue', {
  visibilityTimeout: cdk.Duration.seconds(300),
  retentionPeriod: cdk.Duration.days(14),
});
```

## Error Handling Patterns

### CDK Deployment Errors
1. **Build first**: Always run `npm run build` before deploy
2. **Check diff**: Run `npm run diff` to preview changes
3. **Verify credentials**: Run `aws sts get-caller-identity`
4. **Check CloudFormation**: View stack events in AWS Console

### Resource Name Conflicts
- Let CDK generate physical names automatically
- Use logical IDs only in code
- Don't hardcode resource names unless necessary

## Testing Patterns

### Unit Tests (Future)
```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { AgentCoreStack } from '../lib/agent-core-stack';

test('Stack creates expected resources', () => {
  const app = new cdk.App();
  const stack = new AgentCoreStack(app, 'TestStack');
  const template = Template.fromStack(stack);
  
  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: { Status: 'Enabled' }
  });
});
```

## Security Patterns

### 1. Encryption at Rest
All storage encrypted by default (S3, DynamoDB, EBS)

### 2. IAM Roles (Not Users)
Lambda, ECS, EC2 use IAM roles, never embed credentials

### 3. Secrets Management
Use AWS Secrets Manager for sensitive data:

```typescript
const secret = secretsmanager.Secret.fromSecretNameV2(
  this, 'MySecret', 'my-secret-name'
);
```

### 4. VPC Isolation (When Needed)
Use VPC for resources that need network isolation:

```typescript
const vpc = new ec2.Vpc(this, 'MyVpc', {
  maxAzs: 2,
  natGateways: 0, // Use NAT Gateway only if needed
});
```

## Observability Patterns

### CloudWatch Logs
```typescript
import * as logs from 'aws-cdk-lib/aws-logs';

const logGroup = new logs.LogGroup(this, 'MyLogs', {
  retention: logs.RetentionDays.ONE_WEEK,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

### CloudWatch Alarms
```typescript
const alarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
  metric: fn.metricErrors(),
  threshold: 10,
  evaluationPeriods: 2,
});
```

## Cost Optimization Patterns

1. **Serverless by Default**: Lambda, S3, DynamoDB on-demand
2. **Lifecycle Policies**: Auto-delete old S3 objects
3. **Reserved Capacity**: Only after proven usage pattern
4. **Tagging**: Tag everything for cost allocation
5. **Monitoring**: Set billing alarms
