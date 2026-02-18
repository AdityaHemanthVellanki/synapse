---
title: Stop-Loss Optimization
description: Determines optimal stop-loss placement using volatility-based methods, support/resistance analysis, and maximum adverse excursion statistics
version: "1.0.0"
domain: risk-management
priority: 0.5
activation:
  triggers:
    - stop loss
    - stop placement
    - trailing stop
    - stop optimization
    - protective stop
    - risk limit
    - loss limit
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: string, percentile_rank: number }"
    required: true
  - name: entry_price
    schema: "number (price at which position was or will be entered)"
    required: true
  - name: position_side
    schema: "'long' | 'short'"
    required: true
  - name: stop_method
    schema: "'atr_multiple' | 'percentage' | 'support_resistance' | 'mae' (default 'atr_multiple')"
    required: false
outputs:
  - name: stop_loss_plan
    schema: "{ initial_stop_price: number, stop_distance_pct: number, stop_distance_atr: number, trailing_stop_activation_price: number, trailing_stop_distance: number, expected_stop_hit_probability: number, max_adverse_excursion_p95: number, recommended_method: string }"
dependencies:
  required:
    - Volatility Estimation
  optional: []
context_budget_cost: 1.0
evaluation:
  success_criteria:
    - Stop price is on the correct side of entry price (below for long, above for short)
    - Stop distance is proportional to current volatility regime
    - Expected stop hit probability is between 0 and 1
    - Trailing stop activation price is between entry and target
  failure_modes:
    - Volatility assessment is missing or stale
    - Entry price is invalid or zero
    - Insufficient historical data for MAE analysis
    - Support/resistance levels cannot be identified
---

## Procedure

1. Receive the volatility assessment from Volatility Estimation and validate the entry price and position side.
2. Compute the Average True Range (ATR) over the trailing 14 days for the specified asset.
3. Based on the selected stop method (default ATR multiple):
   - **ATR Multiple**: Set stop distance = ATR * multiplier, where multiplier adapts to vol regime:
     - Low vol: 2.0x ATR
     - Medium vol: 2.5x ATR
     - High vol: 3.0x ATR
     - Extreme vol: 3.5x ATR
   - **Percentage**: Use a fixed percentage based on vol regime (1% low, 2% medium, 3% high, 5% extreme)
   - **Support/Resistance**: Identify the nearest support (long) or resistance (short) level and place stop 0.5% beyond it
   - **MAE (Maximum Adverse Excursion)**: Analyze historical trades to find the 95th percentile MAE and set stop at that level
4. Calculate the initial stop price: entry_price - stop_distance (long) or entry_price + stop_distance (short).
5. Set the trailing stop activation price at entry_price + 1.5 * stop_distance (long) or entry_price - 1.5 * stop_distance (short).
6. Set trailing stop distance at 75% of the initial stop distance to lock in profits.
7. Estimate the probability of the stop being hit within the expected holding period using the volatility-based probability model: P(hit) = 2 * N(-stop_distance / (vol * sqrt(T))).
8. Compute the 95th percentile maximum adverse excursion from the historical return distribution.
9. Return the complete stop-loss plan.

## Reasoning

Stop-Loss Optimization is a focused risk-management skill that provides precise loss-limiting levels adapted to current market conditions. It depends on Volatility Estimation because stop placement must be calibrated to the asset's volatility -- stops too tight get hit by noise, stops too wide expose unnecessary capital. Its priority of 0.5 reflects that it is a specialized tool used primarily when a position is being entered or reviewed, rather than a broadly applicable analytical skill.

## References

- [[Volatility Estimation]] - required dependency providing volatility data for stop calibration
- [[Position Sizing]] - stop-loss distance feeds into position size calculation
- [[Trade Execution]] - stop orders are part of the execution plan
