# Bedrock Examples Refactor - Implementation Tasks

## Phase 1: Repository Setup & Planning

### Task 1.1: Create New Branch
- [ ] Create feature branch `refactor/bedrock-examples`
- [ ] Ensure all current changes are committed to main
- [ ] Document current deployment state for rollback if needed

### Task 1.2: Update Root Documentation
- [ ] Create new root README.md with examples overview
- [ ] Create BLOG.md with social media content about the repo
- [ ] Add comparison table of three patterns
- [ ] Add architecture diagrams for each pattern
- [ ] Document prerequisites (AWS CLI, Node.js, CDK, Firebase)

### Task 1.3: Set Up Directory Structure
- [ ] Create `examples/` directory
- [ ] Create `shared/` directory  
- [ ] Create placeholder directories for three examples
- [ ] Set up individual package.json files for each example

## Phase 2: Extract Shared Components

### Task 2.1: Extract Firebase Authentication
- [ ] Move `lambda/authorizer/` to `shared/auth/firebase-authorizer/`
- [ ] Create shared TypeScript types for auth context
- [ ] Update imports to use shared auth module
- [ ] Test authorizer independently

### Task 2.2: Extract WebSocket Utilities
- [ ] Create `shared/websocket/` directory
- [ ] Extract WebSocket API construct
- [ ] Create streaming utilities module
- [ ] Create connection management helpers
- [ ] Document WebSocket patterns

### Task 2.3: Create Shared CDK Constructs
- [ ] Create `shared/constructs/` directory
- [ ] Extract common Lambda configurations
- [ ] Create reusable NodejsFunction construct with esbuild settings
- [ ] Create WebSocket API construct
- [ ] Document construct usage

### Task 2.4: Create Shared Types
- [ ] Create `shared/types/` directory
- [ ] Define Bedrock Agent response types
- [ ] Define Bedrock Converse API types
- [ ] Define WebSocket message types
- [ ] Define Firebase auth types

## Phase 3: Migrate Agent Core Example

### Task 3.1: Create Agent Core Stack
- [ ] Create `examples/agent-core/` directory
- [ ] Move `lib/agent-core-stack.ts` to `examples/agent-core/lib/`
- [ ] Move `bin/agent-core-stack.ts` to `examples/agent-core/bin/`
- [ ] Create `examples/agent-core/cdk.json`
- [ ] Create `examples/agent-core/package.json`
- [ ] Create `examples/agent-core/tsconfig.json`

### Task 3.2: Migrate Lambda Functions
- [ ] Move `lambda/websocket-agent/` to `examples/agent-core/lambda/`
- [ ] Move `lambda/url-fetcher/` to `examples/agent-core/lambda/`
- [ ] Update imports to use shared modules
- [ ] Update Lambda asset paths in CDK stack
- [ ] Test Lambda builds independently

### Task 3.3: Update Agent Core Stack
- [ ] Import shared Firebase authorizer construct
- [ ] Import shared WebSocket construct
- [ ] Update stack name to `BedrockAgentCoreStack`
- [ ] Update CloudFormation outputs
- [ ] Verify all environment variables

### Task 3.4: Create Agent Core Documentation
- [ ] Create `examples/agent-core/README.md`
- [ ] Document architecture with diagrams
- [ ] Document setup and deployment steps
- [ ] Document environment variables
- [ ] Add testing instructions
- [ ] Document when to use this pattern
- [ ] Add cost estimates

### Task 3.5: Test Agent Core Deployment
- [ ] Deploy stack from examples/agent-core
- [ ] Test WebSocket connection
- [ ] Test URL fetcher action group
- [ ] Test Firebase authentication
- [ ] Verify streaming responses
- [ ] Document any issues

## Phase 4: Implement Inline Agents Example

### Task 4.1: Research Inline Agent Pattern
- [ ] Research Bedrock `return_control` pattern
- [ ] Review AWS documentation on inline agents
- [ ] Identify key differences from agent-core pattern
- [ ] Document inline agent advantages/disadvantages

### Task 4.2: Create Inline Agent Stack
- [ ] Create `examples/inline-agents/` directory
- [ ] Create CDK stack file
- [ ] Create bin entry point
- [ ] Create package.json with dependencies
- [ ] Create cdk.json configuration

### Task 4.3: Implement Inline Agent Lambda
- [ ] Create `lambda/inline-agent/` directory
- [ ] Implement WebSocket handler
- [ ] Implement function calling logic with `return_control`
- [ ] Implement URL fetcher as inline function
- [ ] Handle conversation state management
- [ ] Implement error handling

### Task 4.4: Define Inline Functions
- [ ] Create function registry/schema
- [ ] Implement URL fetcher inline function
- [ ] Implement example calculation function
- [ ] Implement weather lookup function (mock)
- [ ] Document function signature pattern

### Task 4.5: Implement Bedrock Integration
- [ ] Use Bedrock Converse API with tools
- [ ] Handle `return_control` responses
- [ ] Execute functions and return results
- [ ] Continue conversation after function execution
- [ ] Implement streaming responses

### Task 4.6: Create Inline Agents Documentation
- [ ] Create `examples/inline-agents/README.md`
- [ ] Document inline agent pattern
- [ ] Explain function calling flow
- [ ] Document setup and deployment
- [ ] Add code examples
- [ ] Document when to use this pattern
- [ ] Add comparison with agent-core

### Task 4.7: Test Inline Agents
- [ ] Deploy stack
- [ ] Test WebSocket connection
- [ ] Test function calling with URL fetcher
- [ ] Test multiple function calls in conversation
- [ ] Test error handling
- [ ] Verify streaming works

## Phase 5: Implement Converse API Example

### Task 5.1: Create Converse API Stack
- [ ] Create `examples/converse-api/` directory
- [ ] Create CDK stack file
- [ ] Create bin entry point
- [ ] Create package.json
- [ ] Create cdk.json

### Task 5.2: Implement Converse Lambda
- [ ] Create `lambda/converse/` directory
- [ ] Implement WebSocket handler
- [ ] Implement direct Bedrock Converse API calls
- [ ] Implement conversation history management
- [ ] Implement streaming response handling
- [ ] Implement error handling

### Task 5.3: Add Converse API Features
- [ ] Implement system prompt configuration
- [ ] Implement temperature and max_tokens settings
- [ ] Implement stop sequences
- [ ] Add conversation memory (in-memory or DynamoDB)
- [ ] Add message formatting utilities

### Task 5.4: Create Converse API Documentation
- [ ] Create `examples/converse-api/README.md`
- [ ] Document direct API pattern
- [ ] Explain when to use vs agents
- [ ] Document setup and deployment
- [ ] Add code examples
- [ ] Document Converse API parameters
- [ ] Add cost comparison

### Task 5.5: Test Converse API
- [ ] Deploy stack
- [ ] Test WebSocket connection
- [ ] Test basic chat functionality
- [ ] Test streaming responses
- [ ] Test conversation memory
- [ ] Test parameter variations

## Phase 6: Testing & Documentation

### Task 6.1: Create Testing Tools
- [ ] Create `tools/` directory
- [ ] Create WebSocket test client (Node.js)
- [ ] Create curl examples for each endpoint
- [ ] Create wscat examples
- [ ] Create test data fixtures

### Task 6.2: End-to-End Testing
- [ ] Test all three examples independently
- [ ] Test concurrent deployments (no conflicts)
- [ ] Test with fresh AWS account (clean slate)
- [ ] Test environment variable configuration
- [ ] Document any deployment issues

### Task 6.3: Update Root Documentation
- [ ] Update root README with final structure
- [ ] Add architecture diagrams
- [ ] Create comparison table with real metrics
- [ ] Add cost estimates for each pattern
- [ ] Document prerequisites and setup
- [ ] Add troubleshooting section

### Task 6.4: Create Social Media Content
- [ ] Write BLOG.md with key learnings
- [ ] Create Twitter/X thread content
- [ ] Create LinkedIn post content
- [ ] Create sample screenshots
- [ ] Create architecture diagrams for social media
- [ ] Prepare code snippets for sharing

### Task 6.5: Security Review
- [ ] Verify all secrets in .gitignore
- [ ] Check for hardcoded credentials
- [ ] Review IAM permissions
- [ ] Document security best practices
- [ ] Add security section to READMEs

## Phase 7: Migration & Cleanup

### Task 7.1: Create Migration Guide
- [ ] Document how to migrate from old structure
- [ ] Provide clean removal commands for old stack
- [ ] Document breaking changes
- [ ] Provide rollback instructions

### Task 7.2: Clean Up Old Files
- [ ] Remove old bin/agent-core-stack.ts
- [ ] Remove old lib/agent-core-stack.ts
- [ ] Remove old lambda/ directory (after migration verified)
- [ ] Update .gitignore if needed
- [ ] Clean up unused dependencies

### Task 7.3: Update Git History
- [ ] Use `git mv` for file movements where possible
- [ ] Commit in logical chunks
- [ ] Write descriptive commit messages
- [ ] Tag release version

## Phase 8: Release Preparation

### Task 8.1: Final Testing
- [ ] Fresh deployment of all three examples
- [ ] Full test suite execution
- [ ] Performance testing (latency, cost)
- [ ] Documentation review
- [ ] Link validation

### Task 8.2: Prepare Release
- [ ] Create CHANGELOG.md
- [ ] Update version in package.json
- [ ] Create release notes
- [ ] Prepare announcement post
- [ ] Take screenshots for social media

### Task 8.3: Go Public
- [ ] Make repository public on GitHub
- [ ] Add topics/tags to repository
- [ ] Add to awesome-bedrock lists
- [ ] Share on social media
- [ ] Monitor for questions/issues

## Success Metrics

- [ ] All three examples deploy successfully
- [ ] Each example has comprehensive README
- [ ] Root README provides clear guidance
- [ ] No secrets or credentials in repository
- [ ] Code passes TypeScript strict mode
- [ ] All examples independently testable
- [ ] Documentation suitable for beginners
- [ ] Social media content ready to share
- [ ] Repository appears professional and polished

## Estimated Timeline

- Phase 1: Repository Setup - 2 hours
- Phase 2: Extract Shared Components - 4 hours
- Phase 3: Migrate Agent Core - 3 hours
- Phase 4: Implement Inline Agents - 6 hours
- Phase 5: Implement Converse API - 4 hours
- Phase 6: Testing & Documentation - 4 hours
- Phase 7: Migration & Cleanup - 2 hours
- Phase 8: Release Preparation - 2 hours

**Total: ~27 hours** (estimate)

## Dependencies

- AWS CDK 2.149.0+
- Node.js 20+
- TypeScript 5.9+
- Firebase Admin SDK
- Cheerio (for URL fetching)
- AWS Bedrock Claude Sonnet 4.5 access
- AWS Marketplace subscription

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing deployment | High | Keep old stack, deploy new alongside |
| Inline agent pattern unclear | Medium | Research thoroughly, document well |
| Shared code over-abstraction | Medium | Keep it simple, inline if needed |
| Social media visibility low | Low | Engage with Bedrock community |
| Cost overruns during testing | Medium | Monitor AWS costs, use Free Tier |
