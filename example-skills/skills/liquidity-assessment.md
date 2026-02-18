---
title: Liquidity Assessment
description: Evaluates the liquidity profile of an asset by analyzing order book depth, bid-ask spreads, volume patterns, and market impact estimates
version: "1.0.0"
domain: market-microstructure
priority: 0.6
activation:
  triggers:
    - liquidity
    - market liquidity
    - order book depth
    - bid-ask spread
    - trading volume
    - market impact
    - illiquid
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: target_order_size
    schema: "number (shares or units to assess impact for)"
    required: false
  - name: time_horizon
    schema: "'intraday' | 'daily' | 'weekly' (default 'daily')"
    required: false
outputs:
  - name: liquidity_profile
    schema: "{ bid_ask_spread_bps: number, average_daily_volume: number, volume_percentile: number, order_book_depth_at_1pct: number, estimated_market_impact_bps: number, liquidity_score: number (0 to 100), liquidity_grade: 'excellent' | 'good' | 'fair' | 'poor' | 'illiquid', optimal_execution_window: string }"
dependencies:
  required: []
  optional: []
context_budget_cost: 1.0
evaluation:
  success_criteria:
    - Bid-ask spread is a positive number in basis points
    - Average daily volume is a positive integer
    - Liquidity score is between 0 and 100
    - Market impact estimate is non-negative
    - Liquidity grade is consistent with numeric score
  failure_modes:
    - Level 2 order book data is unavailable
    - Asset is not actively traded on any accessible venue
    - Stale volume data due to market closure or holiday
    - Target order size exceeds available daily volume
---

## Procedure

1. Retrieve Level 2 order book data for the specified asset from the primary exchange.
2. Compute the current bid-ask spread in basis points: (ask - bid) / midpoint * 10000.
3. Calculate average daily volume (ADV) over the trailing 20 trading days and its percentile rank against the trailing 252-day ADV distribution.
4. Measure order book depth at 1% from midpoint on both sides (total shares available within 1% of current price).
5. If a target order size is provided, estimate market impact using the square-root model: impact_bps = k * sqrt(order_size / ADV) * 10000, where k is a calibrated constant (typically 0.1 to 0.5).
6. Compute the composite liquidity score (0-100) based on:
   - Bid-ask spread (30% weight): tighter spread = higher score
   - ADV (30% weight): higher volume = higher score
   - Order book depth (20% weight): deeper book = higher score
   - Market impact (20% weight): lower impact = higher score
7. Assign liquidity grade:
   - Excellent: score >= 80
   - Good: 60 <= score < 80
   - Fair: 40 <= score < 60
   - Poor: 20 <= score < 40
   - Illiquid: score < 20
8. Determine the optimal execution window by analyzing intraday volume profiles (typically U-shaped) and recommending the period with highest expected liquidity.
9. Return the complete liquidity profile.

## Reasoning

Liquidity Assessment is a foundational market microstructure skill that informs execution quality and realistic cost estimation. It has no required dependencies because it works directly with order book and volume data. Its priority of 0.6 reflects its importance for any execution-related decision. Order Routing and Slippage Estimation both depend heavily on this skill's output, and it serves as a critical reality check on position sizes that might be too large for a given asset's liquidity.

## References

- [[Order Routing]] - consumes liquidity profile for routing decisions
- [[Slippage Estimation]] - uses liquidity data to estimate execution costs
- [[Trade Execution]] - liquidity context informs execution strategy
