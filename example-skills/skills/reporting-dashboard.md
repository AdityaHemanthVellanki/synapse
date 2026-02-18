---
title: Reporting Dashboard
description: Aggregates performance attribution, drawdown analysis, and capital allocation data into a comprehensive reporting package for stakeholders
version: "1.0.0"
domain: analytics
priority: 0.4
activation:
  triggers:
    - report
    - dashboard
    - reporting
    - summary report
    - investor report
    - performance report
    - portfolio report
    - monthly report
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: attribution_report
    schema: "{ total_alpha: number, allocation_effect: number, selection_effect: number, factor_exposures: Array<{ factor: string, beta: number, contribution: number }>, information_ratio: number, best_trades: Array<{ asset: string, contribution: number }>, worst_trades: Array<{ asset: string, contribution: number }> }"
    required: true
  - name: drawdown_report
    schema: "{ max_drawdown_pct: number, max_drawdown_duration_days: number, calmar_ratio: number, ulcer_index: number, drawdown_periods: Array<{ start_date: string, depth_pct: number, duration_days: number }>, regime_conditional_drawdowns: object }"
    required: true
  - name: allocation_plan
    schema: "{ allocations: Array<{ strategy: string, dollar_amount: number, percentage: number, risk_contribution_pct: number }>, cash_reserve_pct: number, expected_portfolio_return: number, portfolio_sharpe: number }"
    required: true
  - name: report_period
    schema: "'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' (default 'monthly')"
    required: false
  - name: audience
    schema: "'internal' | 'investor' | 'compliance' (default 'investor')"
    required: false
outputs:
  - name: report_package
    schema: "{ executive_summary: string, performance_section: { period_return: number, cumulative_return: number, benchmark_comparison: number, alpha: number, sharpe_ratio: number }, risk_section: { current_var: number, max_drawdown: number, current_drawdown: number, risk_grade: string, calmar_ratio: number }, attribution_section: { top_contributors: Array<{ item: string, value: number }>, bottom_contributors: Array<{ item: string, value: number }>, factor_summary: string }, allocation_section: { current_allocations: Array<{ name: string, pct: number }>, cash_position: number, rebalance_needed: boolean }, charts: Array<{ type: string, title: string, data_reference: string }>, compliance_flags: Array<string>, generated_at: string }"
dependencies:
  required:
    - Performance Attribution
    - Drawdown Analysis
    - Capital Allocation
  optional: []
context_budget_cost: 2.0
evaluation:
  success_criteria:
    - Executive summary accurately reflects the period's key events
    - All numeric values are consistent with upstream data sources
    - Charts reference valid data series
    - Compliance flags are empty when no violations exist
    - Report is appropriate for the specified audience level
    - Generated timestamp is current
  failure_modes:
    - One or more upstream data sources provide inconsistent data
    - Report period has no trading activity to report on
    - Audience-specific formatting requirements are not met
    - Chart generation fails due to missing data points
    - Compliance checks timeout or produce false positives
---

## Procedure

1. Receive the attribution report from Performance Attribution, drawdown report from Drawdown Analysis, and allocation plan from Capital Allocation.
2. Validate data consistency across all three sources: ensure time periods align and portfolio values reconcile.
3. Generate the executive summary based on the audience:
   - **Investor**: Focus on returns, risk-adjusted performance, and outlook
   - **Internal**: Include detailed attribution, strategy-level performance, and improvement areas
   - **Compliance**: Emphasize risk limits, concentration checks, and regulatory metrics
4. Compile the performance section:
   - Period return and cumulative return from the attribution report
   - Benchmark comparison (total return vs. benchmark)
   - Alpha and Sharpe ratio
5. Compile the risk section:
   - Current VaR and drawdown from the drawdown report
   - Risk grade from the most recent risk assessment (embedded in allocation data)
   - Calmar ratio for risk-adjusted drawdown perspective
6. Compile the attribution section:
   - Rank allocation, selection, and timing effects
   - List top 3 and bottom 3 contributors
   - Summarize factor exposures in narrative form
7. Compile the allocation section:
   - Current strategy allocations with dollar amounts and percentages
   - Cash position and whether rebalancing is needed (drift > 5% from targets)
8. Generate chart specifications:
   - Equity curve chart (line chart of cumulative returns)
   - Drawdown chart (underwater plot)
   - Allocation pie chart (current weights)
   - Factor exposure bar chart
   - Monthly returns heatmap
9. Run compliance checks:
   - Concentration limits: no single position > max_single_strategy_pct
   - Leverage limit: leverage_ratio <= max_leverage
   - Drawdown limit: current drawdown < max allowed drawdown threshold
   - Flag any violations
10. Set the generated_at timestamp and return the complete report package.

## Reasoning

The Reporting Dashboard is the terminal analytics skill that synthesizes all analytical outputs into a consumable format. It has the lowest priority (0.4) among all skills because reporting is a presentation layer that should only activate after all analytical work is complete. It requires three upstream skills -- Performance Attribution, Drawdown Analysis, and Capital Allocation -- making it the most dependency-heavy skill in the graph and a natural convergence point for the analytics branch. Different audience modes ensure the same data is presented appropriately for different stakeholders.

## References

- [[Performance Attribution]] - required dependency providing return decomposition
- [[Drawdown Analysis]] - required dependency providing risk characterization
- [[Capital Allocation]] - required dependency providing current allocation state
