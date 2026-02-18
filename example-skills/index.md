# SkillForge Example Repository

This is an example skill repository for **Synapse**.

It contains a set of interconnected trading/risk management skills that demonstrate:

- Strict YAML frontmatter schema
- Skill dependencies (required and optional)
- Activation triggers and context requirements
- Input/output schema chaining
- Context budget costs
- Evaluation criteria

## Skills

1. **Risk Assessment** - Core risk evaluation skill
2. **Volatility Estimation** - Market volatility analysis
3. **Position Sizing** - Optimal position size calculation
4. **Trade Execution** - Final trade execution logic

## Dependency Graph

```
Trade Execution
  └── Position Sizing (required)
        ├── Risk Assessment (required)
        │     └── Volatility Estimation (required)
        └── Volatility Estimation (optional)
```
