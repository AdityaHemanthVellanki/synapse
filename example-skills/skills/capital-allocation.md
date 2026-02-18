---
title: Capital Allocation
description: Distributes available capital across strategies, portfolios, or asset classes based on optimization results and risk constraints
version: "1.0.0"
domain: portfolio-management
priority: 0.7
activation:
  triggers:
    - capital allocation
    - allocate capital
    - strategy allocation
    - fund distribution
    - capital budget
    - money allocation
    - deploy capital
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: optimal_portfolio
    schema: "{ weights: Array<{ asset: string, weight: number }>, expected_return: number, expected_volatility: number, sharpe_ratio: number }"
    required: true
  - name: risk_score
    schema: "{ overall_risk: number, risk_grade: string, max_recommended_exposure: number, var_95: number }"
    required: true
  - name: total_capital
    schema: "number (total available capital to allocate)"
    required: true
  - name: allocation_constraints
    schema: "{ max_single_strategy_pct: number, min_cash_reserve_pct: number, max_leverage: number (default 1.0) }"
    required: false
  - name: strategy_list
    schema: "Array<{ name: string, expected_sharpe: number, max_drawdown_pct: number, capacity: number }>"
    required: false
outputs:
  - name: allocation_plan
    schema: "{ allocations: Array<{ strategy: string, dollar_amount: number, percentage: number, risk_contribution_pct: number }>, cash_reserve: number, cash_reserve_pct: number, total_deployed: number, expected_portfolio_return: number, expected_portfolio_risk: number, portfolio_sharpe: number, leverage_ratio: number, rebalance_schedule: string }"
dependencies:
  required:
    - Portfolio Optimization
    - Risk Assessment
  optional: []
context_budget_cost: 1.5
evaluation:
  success_criteria:
    - All allocations plus cash reserve equal total capital
    - No single strategy allocation exceeds max_single_strategy_pct constraint
    - Cash reserve meets minimum requirement
    - Leverage ratio does not exceed max_leverage constraint
    - Risk contributions sum to approximately 100%
    - Expected portfolio metrics are weighted sums of component metrics
  failure_modes:
    - Total capital is zero or negative
    - Portfolio optimization weights are stale or inconsistent
    - Risk assessment indicates extreme risk making all allocations inadvisable
    - Strategy capacities are exceeded by proposed allocations
    - Constraints are mutually exclusive (e.g., min cash reserve > 100%)
---

## Procedure

1. Receive the optimal portfolio weights from Portfolio Optimization and risk score from Risk Assessment.
2. Determine the cash reserve: max(min_cash_reserve_pct * total_capital, risk-adjusted buffer based on risk_grade):
   - Risk grade A/B: min_cash_reserve_pct (default 5%)
   - Risk grade C: max(min_cash_reserve_pct, 10%)
   - Risk grade D: max(min_cash_reserve_pct, 20%)
   - Risk grade F: max(min_cash_reserve_pct, 40%)
3. Calculate deployable capital: total_capital - cash_reserve.
4. If a strategy list is provided, use a risk-budgeting approach:
   - Allocate capital proportional to each strategy's Sharpe ratio, inversely weighted by max drawdown
   - Respect per-strategy capacity constraints
   - Cap any single strategy at max_single_strategy_pct
5. If no strategy list is provided, use the optimal portfolio weights directly:
   - Scale weights to deployable capital
   - Apply max_single_strategy_pct constraint and redistribute excess pro-rata
6. For each allocation, compute the risk contribution:
   - risk_contribution = weight * marginal_risk / total_portfolio_risk
   - Ensure no single strategy contributes more than 30% of total risk
7. If constraints cause the initial allocation to be infeasible, iteratively relax the lowest-priority constraint and re-solve.
8. Compute expected portfolio-level metrics as weighted sums of strategy-level metrics.
9. Determine the rebalance schedule based on expected drift:
   - Low vol: quarterly rebalance
   - Medium vol: monthly rebalance
   - High vol: bi-weekly rebalance
   - Extreme vol: weekly rebalance
10. Return the complete allocation plan.

## Reasoning

Capital Allocation is the strategic decision of how to distribute capital, sitting above individual position sizing at the portfolio/strategy level. It depends on Portfolio Optimization for optimal weights and Risk Assessment for risk-adjusted cash buffering. Its high priority of 0.7 reflects that capital allocation is one of the most impactful decisions in portfolio management -- getting the high-level allocation right matters more than individual trade optimization. The Reporting Dashboard consumes allocation data for investor-facing reports.

## References

- [[Portfolio Optimization]] - required dependency providing optimal weights
- [[Risk Assessment]] - required dependency for risk-grade-based cash buffers
- [[Reporting Dashboard]] - consumes allocation data for reporting
- [[Position Sizing]] - operates at individual trade level below capital allocation
