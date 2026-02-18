---
title: Portfolio Optimization
description: Constructs optimal portfolio allocations using mean-variance optimization, risk parity, or other allocation frameworks given risk and correlation inputs
version: "1.0.0"
domain: portfolio-management
priority: 0.7
activation:
  triggers:
    - portfolio optimization
    - optimal allocation
    - efficient frontier
    - mean variance
    - risk parity
    - portfolio construction
    - rebalance portfolio
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: asset_identifiers
    schema: "Array<string> (list of ticker symbols or asset IDs)"
    required: true
  - name: risk_score
    schema: "{ overall_risk: number, risk_grade: string, max_recommended_exposure: number, var_95: number, expected_shortfall: number }"
    required: true
  - name: correlation_structure
    schema: "{ correlation_matrix: number[][], eigenvalues: number[], condition_number: number }"
    required: true
  - name: expected_returns
    schema: "Array<number> (annualized expected returns per asset)"
    required: false
  - name: optimization_method
    schema: "'mean_variance' | 'risk_parity' | 'min_variance' | 'max_sharpe' (default 'max_sharpe')"
    required: false
outputs:
  - name: optimal_portfolio
    schema: "{ weights: Array<{ asset: string, weight: number }>, expected_return: number, expected_volatility: number, sharpe_ratio: number, diversification_ratio: number, max_drawdown_estimate: number, rebalance_trades: Array<{ asset: string, current_weight: number, target_weight: number, trade_direction: 'buy' | 'sell', trade_amount: number }> }"
dependencies:
  required:
    - Risk Assessment
    - Correlation Analysis
  optional: []
context_budget_cost: 2.5
evaluation:
  success_criteria:
    - All portfolio weights sum to 1.0 (or target leverage ratio)
    - No individual weight exceeds the max recommended exposure from risk assessment
    - Expected portfolio volatility is computed consistently with correlation matrix
    - Sharpe ratio is computed correctly given expected return and volatility
    - Rebalance trades correctly bridge current to target weights
  failure_modes:
    - Correlation matrix is not positive semi-definite
    - Optimization solver fails to converge
    - Expected returns are missing and method requires them (mean_variance, max_sharpe)
    - All assets have identical return forecasts causing degenerate solution
---

## Procedure

1. Receive the risk score from Risk Assessment and correlation structure from Correlation Analysis.
2. Validate that the correlation matrix is positive semi-definite; if not, apply nearest PSD correction using the Higham algorithm.
3. If expected returns are not provided:
   - For mean_variance/max_sharpe: estimate using shrinkage estimator (Ledoit-Wolf) on historical returns
   - For risk_parity/min_variance: expected returns are not required
4. Based on the selected optimization method:
   - **Max Sharpe**: Maximize (w'mu - rf) / sqrt(w'Sigma*w) subject to sum(w) = 1, w >= 0
   - **Min Variance**: Minimize w'Sigma*w subject to sum(w) = 1, w >= 0
   - **Risk Parity**: Find w such that each asset contributes equally to total portfolio risk
   - **Mean Variance**: Maximize w'mu - (lambda/2) * w'Sigma*w where lambda reflects risk tolerance from risk_score
5. Apply position constraints: no single weight exceeds max_recommended_exposure / 100 from the risk assessment.
6. Compute portfolio-level metrics: expected return, expected volatility, Sharpe ratio, diversification ratio.
7. Estimate maximum drawdown using the analytical approximation: max_dd ~ -2 * vol * sqrt(T) / sqrt(pi).
8. Compare optimal weights to current portfolio weights and generate rebalance trade instructions.
9. Return the complete optimal portfolio object.

## Reasoning

Portfolio Optimization is the core portfolio construction skill that translates risk awareness and correlation understanding into actionable allocation decisions. It requires both Risk Assessment (for risk constraints and tolerances) and Correlation Analysis (for the covariance structure), making it a natural convergence point in the skill graph. Its priority of 0.7 reflects its high importance for any portfolio-level decision. Capital Allocation depends on this skill to determine how to distribute capital across strategies.

## References

- [[Risk Assessment]] - required dependency providing risk constraints
- [[Correlation Analysis]] - required dependency providing correlation matrix
- [[Capital Allocation]] - consumes optimal portfolio weights for capital distribution
