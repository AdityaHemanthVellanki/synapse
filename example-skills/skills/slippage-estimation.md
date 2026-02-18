---
title: Slippage Estimation
description: Estimates expected execution slippage for a given order based on liquidity conditions, volatility, order size, and historical fill data
version: "1.0.0"
domain: market-microstructure
priority: 0.5
activation:
  triggers:
    - slippage
    - execution cost
    - market impact
    - fill price
    - transaction cost
    - implementation shortfall
    - execution quality
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: liquidity_profile
    schema: "{ bid_ask_spread_bps: number, average_daily_volume: number, order_book_depth_at_1pct: number, liquidity_score: number }"
    required: true
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: string }"
    required: true
  - name: order_size
    schema: "number (shares or units)"
    required: true
  - name: order_side
    schema: "'buy' | 'sell'"
    required: true
  - name: order_type
    schema: "'market' | 'limit' | 'algo' (default 'market')"
    required: false
outputs:
  - name: slippage_estimate
    schema: "{ expected_slippage_bps: number, slippage_range: { low_bps: number, mid_bps: number, high_bps: number }, market_impact_permanent_bps: number, market_impact_temporary_bps: number, spread_cost_bps: number, timing_risk_bps: number, total_transaction_cost_bps: number, cost_confidence_interval: { lower_95: number, upper_95: number } }"
dependencies:
  required:
    - Liquidity Assessment
    - Volatility Estimation
  optional: []
context_budget_cost: 1.0
evaluation:
  success_criteria:
    - Expected slippage is non-negative for market orders
    - Permanent impact is less than or equal to total market impact
    - Spread cost is approximately half the bid-ask spread
    - Total transaction cost is sum of slippage, spread, and timing components
    - Confidence interval correctly brackets the expected value
  failure_modes:
    - Liquidity profile is stale or from a different trading session
    - Volatility data is inconsistent with current market conditions
    - Order size is unrealistically large relative to available liquidity
    - Historical fill data is insufficient for calibration
---

## Procedure

1. Receive the liquidity profile from Liquidity Assessment and volatility assessment from Volatility Estimation.
2. Compute the half-spread cost: spread_cost_bps = bid_ask_spread_bps / 2.
3. Estimate permanent market impact using the Almgren-Chriss model:
   - permanent_impact_bps = gamma * sigma * (order_size / ADV)^0.5 * 10000
   - where gamma is a calibrated permanent impact coefficient (typically 0.1-0.3) and sigma is daily volatility
4. Estimate temporary market impact:
   - temporary_impact_bps = eta * sigma * (order_size / ADV)^0.6 * 10000
   - where eta is a calibrated temporary impact coefficient (typically 0.05-0.15)
5. Estimate timing risk (the risk that prices move adversely while executing):
   - timing_risk_bps = sigma * sqrt(execution_time_fraction) * 10000
   - where execution_time_fraction is estimated order_size / (ADV * participation_rate)
6. Adjust all estimates for the current volatility regime:
   - Low vol: multiply by 0.7
   - Medium vol: no adjustment
   - High vol: multiply by 1.5
   - Extreme vol: multiply by 2.5
7. Compute the total expected slippage: spread_cost + permanent_impact + temporary_impact.
8. Compute total transaction cost: slippage + timing_risk.
9. Generate slippage scenarios:
   - Low: expected * 0.5 (favorable conditions)
   - Mid: expected (base case)
   - High: expected * 2.0 (adverse conditions)
10. Compute the 95% confidence interval using the volatility of historical slippage estimates.
11. Return the complete slippage estimate.

## Reasoning

Slippage Estimation quantifies the hidden cost of executing trades, which can be the difference between a profitable and unprofitable strategy. It depends on Liquidity Assessment for order book and volume data, and on Volatility Estimation because slippage scales with volatility. Its priority of 0.5 reflects its role as a precision tool used when evaluating execution quality or comparing routing strategies. The Backtesting Engine should ideally use slippage estimates to produce more realistic simulations.

## References

- [[Liquidity Assessment]] - required dependency providing order book and volume data
- [[Volatility Estimation]] - required dependency for volatility-adjusted impact estimates
- [[Order Routing]] - slippage estimates inform routing decisions
- [[Backtesting Engine]] - slippage assumptions affect backtest accuracy
