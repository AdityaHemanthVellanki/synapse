---
title: Position Sizing
description: Determines the optimal position size for a trade based on risk assessment, volatility, and portfolio constraints
version: "1.0.0"
domain: portfolio-management
priority: 0.6
activation:
  triggers:
    - position size
    - sizing
    - how much to buy
    - allocation
    - lot size
    - quantity
    - how many shares
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: risk_score
    schema: "{ overall_risk: number, risk_grade: string, max_recommended_exposure: number, var_95: number, expected_shortfall: number }"
    required: true
  - name: target_risk_per_trade
    schema: "number (percentage of portfolio, default 2%)"
    required: false
  - name: account_value
    schema: "number (total portfolio value)"
    required: true
outputs:
  - name: position_recommendation
    schema: "{ units: number, dollar_amount: number, percentage_of_portfolio: number, stop_loss_price: number, risk_reward_ratio: number }"
dependencies:
  required:
    - Risk Assessment
  optional:
    - Volatility Estimation
context_budget_cost: 1.5
evaluation:
  success_criteria:
    - Position size does not exceed max recommended exposure from risk assessment
    - Dollar risk per trade is within target risk tolerance
    - Stop loss price is mathematically consistent with position size and risk amount
    - Risk/reward ratio is computed and positive
  failure_modes:
    - Risk score data is missing or invalid
    - Account value is zero or negative
    - Asset price is unavailable
    - Position size calculation results in fractional units below minimum lot
---

## Procedure

1. Receive the risk score from Risk Assessment and optionally the volatility assessment.
2. Determine the maximum dollar risk per trade: account_value * target_risk_per_trade (default 2%).
3. Cap the allocation at the max_recommended_exposure from the risk assessment.
4. Calculate stop loss distance based on volatility: stop_distance = current_price * historical_vol * sqrt(holding_period/252) * 2.
5. Compute position size in units: dollar_risk / stop_distance.
6. Validate that position_size * current_price does not exceed max allocation.
7. Calculate the risk/reward ratio assuming a 2:1 minimum target.
8. Round down to nearest valid lot size.
9. Return the position recommendation object.

## Reasoning

Position Sizing is the bridge between risk analysis and trade execution. It translates abstract risk metrics into concrete numbers: how many units to buy and where to place the stop loss. It should activate when a user wants to move from analysis to action. Its moderate priority (0.6) reflects that it's a derived skill that should defer to risk assessment. It requires Risk Assessment as a hard dependency and can optionally use Volatility Estimation directly for more precise stop loss calculations.

## References

- [[Risk Assessment]] - required dependency providing risk metrics
- [[Volatility Estimation]] - optional dependency for direct vol access
- [[Trade Execution]] - downstream skill that consumes position recommendations
