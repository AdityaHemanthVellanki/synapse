---
title: Hedging Strategy
description: Designs hedging strategies to mitigate portfolio risk using correlation data, options structures, and inverse/uncorrelated instruments
version: "1.0.0"
domain: risk-management
priority: 0.6
activation:
  triggers:
    - hedging
    - hedge strategy
    - portfolio hedge
    - tail risk protection
    - downside protection
    - risk mitigation
    - protective put
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: portfolio_positions
    schema: "Array<{ asset: string, weight: number, notional: number }>"
    required: true
  - name: risk_score
    schema: "{ overall_risk: number, risk_grade: string, max_recommended_exposure: number, var_95: number, expected_shortfall: number }"
    required: true
  - name: correlation_structure
    schema: "{ correlation_matrix: number[][], regime_conditional_corr: { low_vol: number[][], high_vol: number[][] } }"
    required: true
  - name: hedge_budget
    schema: "number (maximum cost as percentage of portfolio, default 2%)"
    required: false
  - name: hedge_horizon
    schema: "number (days, default 30)"
    required: false
outputs:
  - name: hedge_recommendation
    schema: "{ strategy_type: 'options_overlay' | 'inverse_etf' | 'pairs_trade' | 'collar' | 'tail_risk_hedge', instruments: Array<{ ticker: string, action: 'buy' | 'sell', quantity: number, estimated_cost: number }>, hedge_ratio: number, expected_risk_reduction_pct: number, max_cost: number, breakeven_scenario: string }"
dependencies:
  required:
    - Risk Assessment
    - Correlation Analysis
  optional: []
context_budget_cost: 2.0
evaluation:
  success_criteria:
    - Total hedge cost does not exceed hedge_budget
    - Hedge ratio is between 0 and 1
    - Expected risk reduction is positive and reasonable
    - Strategy type is appropriate given current risk grade
    - All recommended instruments are liquid and tradeable
  failure_modes:
    - Options market is illiquid for the desired strikes/expirations
    - No suitable inverse or uncorrelated instruments identified
    - Correlation structure is unstable making hedge ratio unreliable
    - Hedge cost exceeds budget constraint with no feasible alternative
---

## Procedure

1. Receive the risk score from Risk Assessment and correlation structure from Correlation Analysis.
2. Assess the current portfolio's key risk exposures:
   - Identify the top 3 risk contributors using marginal risk contribution analysis
   - Compute the portfolio beta to the primary market benchmark
3. Based on the risk grade and hedge budget, select the hedging strategy type:
   - Risk grade A/B: Minimal hedging needed; recommend collar or no action
   - Risk grade C: Recommend options overlay (protective puts on concentrated positions)
   - Risk grade D: Recommend inverse ETF position or tail risk hedge
   - Risk grade F: Recommend aggressive hedging via out-of-the-money puts and inverse positions
4. For options-based strategies: select strikes and expirations that maximize protection within the cost budget using the Black-Scholes model and current implied volatility surface.
5. For correlation-based strategies: use the high-vol conditional correlation matrix to identify instruments with the most negative correlation during stress periods.
6. Calculate the optimal hedge ratio using minimum-variance hedge ratio: h = rho * (sigma_portfolio / sigma_hedge).
7. Estimate the expected risk reduction: delta_VaR = VaR_unhedged - VaR_hedged.
8. Compute the breakeven scenario (the market move at which the hedge cost is recovered).
9. Return the complete hedge recommendation.

## Reasoning

Hedging Strategy is a specialized risk-management skill that goes beyond risk assessment to prescribe concrete protective actions. It requires Risk Assessment for understanding the current risk level and Correlation Analysis for identifying effective hedging instruments. Its priority of 0.6 reflects that hedging is critical but secondary to core risk measurement. The skill is particularly valuable during high-risk regimes where portfolio protection becomes urgent.

## References

- [[Risk Assessment]] - required dependency providing risk grade and VaR
- [[Correlation Analysis]] - required dependency for identifying hedge instruments
- [[Portfolio Optimization]] - hedging constraints feed back into optimization
