# Bedrock Examples Refactor - Requirements Specification

## Overview

Refactor the agent-core-stack repository into a comprehensive examples collection showcasing three different AWS Bedrock integration patterns. The repository will serve as a public reference for developers learning Bedrock, demonstrating agent-based, inline agent, and direct Converse API approaches.

## Core Requirements

### FR-1: Repository Restructure

**FR-1.1: Examples-Based Organization**
- Repository SHALL be organized under an `examples/` folder
- Each example SHALL be a self-contained CDK stack
- Each example SHALL have independent deployment configuration
- Examples SHALL share common infrastructure code where appropriate

**FR-1.2: Example Categories**
The repository SHALL contain exactly three examples:

1. **Agent Core** (`examples/agent-core/`)
   - Full Bedrock Agent with action groups
   - WebSocket streaming integration
   - Firebase authentication
   - URL fetcher action group (current implementation)

2. **Inline Agents** (`examples/inline-agents/`)
   - Inline agent pattern (agents defined in code, not via Bedrock service)
   - Multiple inline agents demonstrating different use cases
   - Faster iteration and local testing
   - No Bedrock Agent service required

3. **Converse API** (`examples/converse-api/`)
   - Direct Bedrock Converse API integration
   - Simplest pattern - no agents, direct model calls
   - WebSocket streaming of model responses
   - Function calling demonstration

**FR-1.3: Shared Infrastructure**
- Common modules SHALL be extracted to `shared/` directory:
  - Firebase authorizer Lambda
  - WebSocket connection management utilities
  - Common CDK constructs
  - TypeScript types and interfaces
- Each example SHALL import only what it needs from shared/

### FR-2: Agent Core Example (Existing Implementation)

**FR-2.1: Current Features Preservation**
- SHALL maintain existing Bedrock Agent functionality:
  - Claude Sonnet 4.5 via inference profile
  - URL fetcher action group with cheerio
  - WebSocket streaming
  - Firebase authentication
  - AWS Marketplace permissions

**FR-2.2: Relocation**
- Move current stack to `examples/agent-core/`
- Update deployment scripts and documentation
- Maintain all existing Lambda functions
- Preserve action group schema and implementation

**FR-2.3: Documentation**
- Add comprehensive README explaining:
  - What Bedrock Agents are
  - When to use agent pattern vs alternatives
  - Setup and deployment steps
  - Cost implications
  - Testing instructions

### FR-3: Inline Agents Example (New)

**FR-3.1: Core Functionality**
- SHALL demonstrate inline agent pattern where agent logic runs in Lambda
- SHALL showcase multiple mini-agents:
  - **Calculator Agent**: Handle math operations
  - **Weather Agent**: Mock weather queries (demonstrate API integration pattern)
  - **Memory Agent**: Demonstrate stateful conversation with DynamoDB
  - **Tool Use Agent**: Show function calling with tool definitions

**FR-3.2: Architecture**
- One Lambda function per agent type
- WebSocket API for streaming responses
- Firebase authentication (shared from common/)
- Agent routing based on user intent (in Lambda code, not Bedrock service)

**FR-3.3: Benefits Demonstrated**
- Faster development iteration (no CDK deploy for agent changes)
- Lower latency (no Bedrock Agent service overhead)
- Fine-grained control over agent behavior
- Easier debugging and testing
- Cost-effective for simple use cases

**FR-3.4: Documentation**
- README SHALL explain:
  - What inline agents are
  - Pros/cons vs Bedrock Agents
  - When to choose inline pattern
  - How to add new agents
  - Local testing setup

### FR-4: Converse API Example (New)

**FR-4.1: Core Functionality**
- SHALL demonstrate direct Bedrock Converse API usage
- SHALL show streaming responses
- SHALL demonstrate function/tool calling
- SHALL use Claude Sonnet 4.5 (same model as other examples)

**FR-4.2: Use Cases Demonstrated**
- Simple chat interface
- Function calling (e.g., get_weather, calculate, search_knowledge)
- System prompts and role management
- Temperature and top_p parameter tuning
- Token usage tracking

**FR-4.3: Architecture**
- Single Lambda for Converse API calls
- WebSocket for streaming
- Firebase authentication (shared)
- No Bedrock Agent service
- No action groups (functions defined in code)

**FR-4.4: Benefits Demonstrated**
- Simplest possible pattern
- Direct model access
- Maximum control over prompts
- Lowest latency
- Easiest to understand for beginners

**FR-4.5: Documentation**
- README SHALL explain:
  - What Converse API is
  - Difference from Agents and inline agents
  - When to use this pattern
  - How to add custom functions
  - Streaming implementation details

### FR-5: Deployment & Configuration

**FR-5.1: Independent Deployments**
- Each example SHALL have its own `cdk.json`
- Each example SHALL be deployable independently
- Each example SHALL have unique stack name
- Examples SHALL NOT share deployed resources (separate WebSocket APIs, Lambdas, etc.)

**FR-5.2: Shared Dependencies**
- Root `package.json` for shared CDK dependencies
- Each example MAY have additional dependencies in local `package.json`
- Shared TypeScript code in `shared/` directory
- Common `.env.example` at root with all required variables

**FR-5.3: Deployment Scripts**
Examples SHALL support:
```bash
# Deploy all examples
npm run deploy:all

# Deploy specific example
npm run deploy:agent-core
npm run deploy:inline-agents
npm run deploy:converse-api

# Build all
npm run build

# Test individual example
npm run test:agent-core
```

### FR-6: Documentation & Social Media Ready

**FR-6.1: Root README**
- Overview of all three patterns
- Comparison table (features, complexity, cost, latency, use cases)
- Architecture diagrams for each pattern
- Prerequisites (AWS account, Firebase, Node.js)
- Quick start guide
- Links to individual example READMEs

**FR-6.2: Visual Aids**
- Architecture diagram for each example (ASCII or Mermaid)
- Flow diagrams showing request/response paths
- Screenshots or demo GIFs (optional)

**FR-6.3: Blog/Social Media Content**
- Include `BLOG.md` with article-ready content explaining:
  - Why multiple patterns matter
  - When to choose each approach
  - Lessons learned
  - Code snippets highlighting key differences
- Include `TWITTER.md` with tweet-sized summaries and thread ideas

**FR-6.4: Learning Path**
README SHALL suggest progression:
1. Start with Converse API (simplest)
2. Move to Inline Agents (add agent logic)
3. Use Agent Core for production multi-tool workflows

### FR-7: Code Quality & Best Practices

**FR-7.1: TypeScript Standards**
- Strict TypeScript compilation
- ES module imports (no require)
- Proper type definitions for all AWS SDK calls
- Shared types in `shared/types.ts`

**FR-7.2: Error Handling**
- Each example SHALL demonstrate proper error handling
- CloudWatch logs SHALL be structured and queryable
- Errors SHALL return meaningful messages to clients

**FR-7.3: Security**
- All examples SHALL use Firebase authentication
- `.env` and credential files SHALL be gitignored
- No hardcoded secrets in code
- IAM roles with least-privilege permissions

**FR-7.4: Testing**
- Each example SHALL include basic integration tests
- WebSocket connection testing
- Model response validation
- Function calling verification (where applicable)

## Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1: Response Times**
- Converse API: < 2s for first token
- Inline Agents: < 3s for first token
- Agent Core: < 5s for first token (includes action group overhead)

**NFR-1.2: Cost Optimization**
- Use appropriate Lambda memory sizes
- Bundle sizes minimized (esbuild)
- No unnecessary dependencies

### NFR-2: Developer Experience

**NFR-2.1: Setup Time**
- New developer SHALL deploy any example within 15 minutes
- Clear error messages for missing configuration
- Pre-deployment validation of required environment variables

**NFR-2.2: Documentation Quality**
- Every example SHALL have working example commands
- Common issues documented with solutions
- Video walkthrough (optional future enhancement)

### NFR-3: Maintainability

**NFR-3.1: Code Reuse**
- Shared code SHALL be properly abstracted
- Each example SHALL remain independent
- Changes to shared code SHALL be backwards compatible

**NFR-3.2: Versioning**
- Lock Claude model versions in code
- Document CDK version requirements
- Node.js version pinned in package.json engines field

### NFR-4: Public Repository Standards

**NFR-4.1: Open Source Readiness**
- Include LICENSE file (MIT or Apache 2.0)
- Include CONTRIBUTING.md with guidelines
- Include CODE_OF_CONDUCT.md
- Clear attribution for borrowed code/patterns

**NFR-4.2: GitHub Best Practices**
- Comprehensive .gitignore
- Issue templates for bugs and features
- Pull request template
- GitHub Actions for CI (optional)

## Success Criteria

### SC-1: Technical Success
- [ ] All three examples deploy successfully
- [ ] Each example demonstrates unique pattern correctly
- [ ] WebSocket streaming works in all examples
- [ ] Authentication works across all examples
- [ ] No secrets committed to repository

### SC-2: Documentation Success
- [ ] Developer can deploy any example following README alone
- [ ] Comparison table clearly shows differences
- [ ] Each pattern's use case is clearly explained
- [ ] Blog content ready for publication

### SC-3: Educational Success
- [ ] Beginners can understand Converse API example
- [ ] Intermediate developers can extend inline agents
- [ ] Advanced developers can customize agent-core
- [ ] Progression path from simple to complex is clear

### SC-4: Social Media Success
- [ ] Repository suitable for GitHub trending
- [ ] Blog post ready for Medium/Dev.to
- [ ] Twitter thread drafted
- [ ] Code snippets extractable for demos

## Out of Scope

- Frontend application (examples focus on backend/API)
- Production monitoring/observability (examples show basics only)
- Multi-region deployment
- Auto-scaling configuration
- CI/CD pipelines (developers deploy manually)
- Multiple authentication providers (Firebase only)

## Migration Strategy

### Phase 1: Structure Setup
1. Create `examples/` directory structure
2. Create `shared/` directory for common code
3. Move current implementation to `examples/agent-core/`
4. Update all import paths
5. Test agent-core deployment still works

### Phase 2: Extract Shared Code
1. Identify common components (Firebase auth, WebSocket utils)
2. Move to `shared/` directory
3. Update agent-core to use shared code
4. Verify no regression

### Phase 3: Converse API Example
1. Implement `examples/converse-api/` stack
2. Add function calling examples
3. Document and test
4. Deploy and verify

### Phase 4: Inline Agents Example
1. Implement `examples/inline-agents/` stack
2. Create 4 mini-agents
3. Document and test
4. Deploy and verify

### Phase 5: Documentation & Polish
1. Write root README with comparison
2. Create architecture diagrams
3. Write BLOG.md and TWITTER.md
4. Add LICENSE and contributing guidelines
5. Final testing across all examples

## Dependencies

- AWS CDK 2.x
- Node.js 20.x
- TypeScript 5.x
- Firebase Admin SDK
- AWS SDK v3
- esbuild (for Lambda bundling)
- cheerio (agent-core only)

## Timeline Estimate

- Phase 1 (Structure): 2 hours
- Phase 2 (Shared Code): 2 hours
- Phase 3 (Converse API): 4 hours
- Phase 4 (Inline Agents): 6 hours
- Phase 5 (Documentation): 4 hours

**Total**: ~18 hours of development time
