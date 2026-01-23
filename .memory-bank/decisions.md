# Architecture Decision Records

This file documents key architectural decisions made throughout the project, with rationale and consequences.

## Format
Each decision follows this structure:
- **Decision**: What was decided
- **Context**: Why this decision was needed
- **Rationale**: Why this approach was chosen
- **Consequences**: Impact of this decision
- **Alternatives Considered**: What else was evaluated
- **Date**: When the decision was made

---

## ADR-001: CDK over Terraform

**Decision**: Use AWS CDK with TypeScript instead of Terraform

**Context**: Need infrastructure-as-code solution for AWS resource management

**Rationale**:
- TypeScript provides type safety and IDE support
- CDK constructs are higher-level abstractions than Terraform resources
- Native AWS support and faster updates for new services
- Familiar language (TypeScript) for team

**Consequences**:
- Locked into AWS (no multi-cloud)
- CloudFormation limitations apply
- Better developer experience for TypeScript developers

**Alternatives Considered**:
- Terraform: More mature, multi-cloud, but HCL learning curve
- CloudFormation YAML: Too verbose, no type safety
- Pulumi: Similar to CDK but less AWS-native

**Date**: January 10, 2026

---

## ADR-002: Firebase for Authentication

**Decision**: Use Firebase Authentication instead of AWS Cognito

**Context**: Need user authentication system for web UI

**Rationale**:
- Simpler integration with existing Firebase project
- Better developer experience for frontend
- Google OAuth already configured
- Firebase Hosting already in use

**Consequences**:
- Hybrid architecture (Firebase + AWS)
- Lambda authorizer needed for JWT validation
- Firebase Admin SDK required in Lambda
- Docker required for Lambda bundling

**Alternatives Considered**:
- AWS Cognito: More AWS-native but complex setup
- Auth0: Third-party dependency
- Custom auth: Too much maintenance

**Date**: January 11, 2026

---

## ADR-003: WebSocket over REST

**Decision**: Use WebSocket API instead of REST API for agent communication

**Context**: Need real-time streaming responses from Bedrock agents

**Rationale**:
- API Gateway timeout: WebSocket 15 minutes vs REST 29 seconds
- Streaming responses require long-lived connections
- Better user experience with incremental updates
- Native browser WebSocket support

**Consequences**:
- More complex connection management
- Session state tied to connection
- Connection ID used as Bedrock session ID
- Firebase auth via query parameters

**Alternatives Considered**:
- REST with polling: Poor UX, high latency
- Server-Sent Events (SSE): No browser control of connection
- HTTP/2 streaming: Lambda limitations

**Date**: January 11, 2026

---

## ADR-004: ARM64 for AgentCore Runtime

**Decision**: Use ARM64 architecture for containerized Lambda with AgentCore

**Context**: AgentCore Runtime requires specific container architecture

**Rationale**:
- AgentCore Runtime compatibility requirement
- AWS Graviton2/3 processors offer better price/performance
- Native support in Lambda container runtime
- LangGraph supports ARM64

**Consequences**:
- Must build multi-arch Docker images or specify platform
- Local development on ARM (Apple Silicon) is faster
- Slightly different dependency compatibility considerations

**Alternatives Considered**:
- x86_64: Standard but not required by AgentCore
- Multi-arch builds: Unnecessary complexity for single platform

**Date**: January 18, 2026

---

## ADR-005: CallbackSaver Pattern for Memory

**Decision**: Use custom `langgraph-callback-checkpointer` package with AgentCore Memory backend

**Context**: Need conversation persistence for LangGraph agents in AgentCore Runtime

**Rationale**:
- Flexible checkpointing with any storage backend
- AgentCore Memory is AWS managed service
- Callbacks allow custom storage logic
- No vendor lock-in to specific checkpointer implementation
- User's existing package (langgraph-callback-checkpointer@1.0.1)

**Consequences**:
- Custom npm package dependency
- Must implement StoreMemory/RetrieveMemories API calls
- Event-based storage with query filtering
- AgentCore Memory service manages S3 backend

**Alternatives Considered**:
- Built-in LangGraph checkpointers: Limited to specific backends
- Direct S3 checkpointer: More complex state management
- DynamoDB checkpointer: Additional service to manage

**Date**: January 20, 2026

---

## ADR-006: Monorepo Structure

**Decision**: Use monorepo with multiple example patterns in `/examples`

**Context**: Need to demonstrate 5 different Bedrock integration patterns

**Rationale**:
- Each pattern is independent and self-contained
- Shared types and utilities in `/shared`
- Easy to compare implementations
- Single git repository for all examples
- Clear documentation per pattern

**Consequences**:
- More complex root package.json scripts
- Must navigate to specific example to deploy
- Shared dependencies need coordination
- Each example has own CDK stack

**Alternatives Considered**:
- Multiple repositories: Too much overhead
- Single stack: Too coupled, hard to understand patterns
- Workspaces: Unnecessary complexity for this size

**Date**: January 12, 2026

---

## Template for New Decisions

```markdown
## ADR-XXX: [Decision Title]

**Decision**: [What was decided]

**Context**: [Why this decision was needed]

**Rationale**:
- [Key reason 1]
- [Key reason 2]
- [Key reason 3]

**Consequences**:
- [Impact 1]
- [Impact 2]

**Alternatives Considered**:
- [Alternative 1]: [Why not chosen]
- [Alternative 2]: [Why not chosen]

**Date**: [YYYY-MM-DD]
```
