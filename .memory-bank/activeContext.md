# Active Context

## Current Focus
**Empty CDK stack deployed** - Ready to add first AWS resources

## Recent Accomplishments (Jan 10, 2026)
- ✅ Created CDK project structure with TypeScript
- ✅ Configured AWS CLI with IAM user credentials (cdk-deploy-user)
- ✅ Bootstrapped CDK in AWS account 991551400024 (us-east-1)
- ✅ Deployed empty AgentCoreStack successfully
- ✅ Resolved fsevents/node-gyp installation hang with `--no-optional --ignore-scripts`
- ✅ Initialized memory bank structure

## Active Decisions

### Technology Choices
- **CDK over CloudFormation**: TypeScript provides better IDE support and type safety
- **us-east-1**: Primary region for development (lowest cost, most services)
- **IAM User over SSO**: Simpler for single-developer setup
- **npm install flags**: Always use `--no-optional --ignore-scripts` to avoid node-gyp hang

### Architecture Patterns
- **Stack Organization**: Single stack for now, will split by concern as complexity grows
- **Resource Naming**: Use CDK logical IDs, let CDK handle physical names
- **Removal Policy**: DESTROY for development, will change to RETAIN for production

## Open Questions
- What AWS resources are needed first? (Lambda, S3, DynamoDB, SQS?)
- Should we split into multiple stacks? (compute, storage, messaging)
- Do we need VPC isolation or can we use default VPC?
- What IAM permissions does cdk-deploy-user need beyond AdministratorAccess?

## Next Steps
1. **Define first resource** - Decide what AWS service to deploy first
2. **Add to stack** - Update `lib/agent-core-stack.ts` with resource
3. **Deploy and test** - Run `cdk deploy` and verify in console
4. **Document pattern** - Update memory bank with decisions made

## Blockers
None currently. Stack is deployed and ready for resource addition.

## Important Context

### npm Install Issue
**Problem**: `fsevents@2.3.2` package hangs during `node-gyp rebuild` on macOS
**Solution**: Always use `npm install --no-optional --ignore-scripts`
**Impact**: Cannot use standard `npm install` command

### AWS Account Details
- **Account ID**: 991551400024
- **Region**: us-east-1
- **IAM User**: cdk-deploy-user (AdministratorAccess)
- **CDK Bootstrapped**: Yes (CDKToolkit stack deployed)

### Stack Details
- **Stack Name**: AgentCoreStack
- **ARN**: arn:aws:cloudformation:us-east-1:991551400024:stack/AgentCoreStack/...
- **Status**: Deployed (empty, just metadata)
- **Deployment Time**: ~13 seconds

## Related Projects
- **social-media-draft-agent**: Firebase-based article processing system
  - May migrate some functionality to AWS Lambda
  - Could benefit from AWS infrastructure (S3, DynamoDB, SQS)
