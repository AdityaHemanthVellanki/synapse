---
title: Risk Assessment
description: Evaluates the risk profile of a potential trade or portfolio position using volatility data and risk metrics
version: "1.0.0"
domain: risk-management
priority: 0.8
activation:
  triggers:
    - risk assessment
    - risk evaluation
    - risk analysis
    - assess risk
    - risk score
    - danger level
    - risk check
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: string, percentile_rank: number }"
    required: true
  - name: portfolio_exposure
    schema: "number (current exposure as percentage of portfolio)"
    required: false
outputs:
  - name: risk_score
    schema: "{ overall_risk: number (0-100), risk_grade: 'A' | 'B' | 'C' | 'D' | 'F', max_recommended_exposure: number, var_95: number, expected_shortfall: number }"
dependencies:
  required:
    - Volatility Estimation
  optional: []
context_budget_cost: 2.5
evaluation:
  success_criteria:
    - Risk score is between 0 and 100
    - Risk grade is consistent with numeric score
    - VaR and Expected Shortfall are computed correctly
    - Max recommended exposure does not exceed 100%
  failure_modes:
    - Volatility assessment is stale or missing
    - Portfolio state is unavailable
    - Asset correlation data is incomplete
---

## Procedure

1. Receive the volatility assessment from the Volatility Estimation skill.
2. Compute Value-at-Risk (95%) using parametric method: VaR_95 = portfolio_value * vol * z_score_95 * sqrt(holding_period / 252).
3. Compute Expected Shortfall (CVaR) as the conditional expectation beyond VaR.
4. Calculate overall risk score (0-100) based on:
   - Volatility regime weight (30%): extreme=90, high=70, medium=40, low=15
   - VaR as percentage of portfolio (40%): scaled linearly
   - Current exposure concentration (30%): higher concentration = higher risk
5. Assign risk grade based on overall score:
   - A: 0-20 (very low risk)
   - B: 21-40 (low risk)
   - C: 41-60 (moderate risk)
   - D: 61-80 (high risk)
   - F: 81-100 (extreme risk)
6. Determine max recommended exposure based on inverse of risk score.
7. Return the complete risk assessment object.

## Reasoning

Risk Assessment is a critical intermediate skill that translates raw volatility data into actionable risk metrics. It should dominate when the user explicitly asks about risk, when a trade decision is pending, or when portfolio exposure is being evaluated. It requires volatility data as input, creating a clear dependency chain. Its high priority (0.8) reflects that risk awareness should generally override other concerns in trading decisions.

## References

- [[Volatility Estimation]] - required dependency providing vol data
- [[Position Sizing]] - consumes risk assessment for sizing decisions
