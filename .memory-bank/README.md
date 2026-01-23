# Memory Bank - Agent Core Stack

This directory contains the project's institutional memory - context, patterns, and progress that persist across development sessions.

## 📋 File Index

### Core Context Files
- **[projectBrief.md](./projectBrief.md)** - High-level project overview, objectives, and success criteria
- **[productContext.md](./productContext.md)** - Product vision, target users, core principles, and design constraints
- **[techContext.md](./techContext.md)** - Technology stack, AWS services, Firebase integration, and configuration details
- **[systemPatterns.md](./systemPatterns.md)** - Architecture patterns, CDK constructs, deployment workflows, and design patterns

### Development Files
- **[developmentGuide.md](./developmentGuide.md)** - TDD principles, testing guidelines, TypeScript standards, and coding practices
- **[activeContext.md](./activeContext.md)** - Current focus, recent sessions, active decisions, and critical learnings
- **[progress.md](./progress.md)** - Project timeline, completed phases, milestones, and deployment metrics

## 🎯 Quick Start for New Sessions

1. **Start here**: Read [activeContext.md](./activeContext.md) to understand what's currently happening
2. **Understand the project**: Review [projectBrief.md](./projectBrief.md) and [productContext.md](./productContext.md)
3. **Check technical details**: Reference [techContext.md](./techContext.md) for stack information
4. **Follow patterns**: Use [systemPatterns.md](./systemPatterns.md) for architectural decisions
5. **Write code**: Follow [developmentGuide.md](./developmentGuide.md) for TDD and TypeScript standards

## 📝 Maintenance Guidelines

### When to Update Files

**activeContext.md** - Update after every significant development session
- Add new decisions made
- Document completed work
- Update current focus
- Add critical learnings

**progress.md** - Update when major milestones are completed
- Mark phases as complete
- Add new accomplishments
- Update metrics

**techContext.md** - Update when technology changes
- New dependencies added
- AWS services deployed
- Configuration changes

**systemPatterns.md** - Update when new patterns emerge
- New architectural patterns
- Reusable constructs
- Design decisions

**developmentGuide.md** - Rarely updated
- Only when core principles change
- New testing patterns discovered
- TypeScript standards evolve

**productContext.md** - Rarely updated
- Only when vision or goals change
- New constraints identified

**projectBrief.md** - Rarely updated
- Only when project scope changes

## 🔍 Search Tips

Use grep to find specific information:
```bash
# Find all mentions of a technology
grep -r "Firebase" .memory-bank/

# Find deployment-related info
grep -r "deploy" .memory-bank/

# Find active work
grep -r "🔄\|⏳\|🚀" .memory-bank/
```

## 📊 Current Project Status

**Project**: AWS Bedrock Integration Examples  
**Version**: 2.0.0  
**Status**: Production-ready with 5 integration patterns  
**Last Updated**: January 22, 2026

### Five Integration Patterns
1. ✅ **Converse API** - Direct Bedrock API calls
2. ✅ **Inline Agents** - Custom agent logic in Lambda
3. ✅ **Bedrock Agents** - Infrastructure-based agents
4. ✅ **Lambda + LangGraph** - Containerized Lambda pattern
5. ✅ **AgentCore + LangGraph** - Real AgentCore Runtime with memory integration

---

*This memory bank follows the principles of maintaining institutional memory across development sessions, enabling context continuity and knowledge preservation.*
