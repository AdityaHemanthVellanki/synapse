---
title: Trade Execution
description: Generates a complete trade execution plan including order type, timing, and contingency logic based on position sizing and market conditions
version: "1.0.0"
domain: execution
priority: 0.5
activation:
  triggers:
    - execute trade
    - place order
    - trade execution
    - buy order
    - sell order
    - fill order
    - market order
    - limit order
  required_context:
    - market_data
    - portfolio_state
    - broker_connection
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: position_recommendation
    schema: "{ units: number, dollar_amount: number, percentage_of_portfolio: number, stop_loss_price: number, risk_reward_ratio: number }"
    required: true
  - name: order_side
    schema: "'buy' | 'sell'"
    required: true
  - name: urgency
    schema: "'low' | 'medium' | 'high'"
    required: false
outputs:
  - name: execution_plan
    schema: "{ orders: Array<{ type: string, side: string, quantity: number, price: number | null, time_in_force: string }>, contingencies: Array<{ condition: string, action: string }>, estimated_slippage: number, estimated_commission: number }"
dependencies:
  required:
    - Position Sizing
  optional: []
context_budget_cost: 1.0
evaluation:
  success_criteria:
    - All orders have valid type, side, and quantity
    - Stop loss order is included in the contingency plan
    - Estimated slippage is within reasonable bounds for the asset's liquidity
    - Total order quantity matches position recommendation
  failure_modes:
    - Broker connection is unavailable
    - Market is closed and order type requires immediate execution
    - Asset is halted or restricted
    - Insufficient buying power
---

## Procedure

1. Receive the position recommendation from Position Sizing.
2. Determine the optimal order type based on urgency:
   - High urgency: Market order
   - Medium urgency: Limit order at current ask + 0.1% buffer
   - Low urgency: Limit order at midpoint of bid-ask spread
3. If the position size exceeds 1% of average daily volume, split into multiple child orders (TWAP strategy over 15-minute intervals).
4. Generate the stop loss order: Stop-limit order at the stop_loss_price with 0.5% buffer.
5. Generate take-profit contingency: Limit sell at entry_price * (1 + risk_reward_ratio * risk_per_unit).
6. Estimate slippage based on current spread and order size relative to book depth.
7. Calculate estimated commission based on a per-share fee model.
8. Compile the complete execution plan with all orders and contingencies.
9. Return the execution plan object.

## Reasoning

Trade Execution is the terminal skill in the trading skill chain. It converts all upstream analysis (volatility, risk, sizing) into concrete, actionable orders. Its lower priority (0.5) means it should only activate when all prerequisite analysis is complete. It strictly requires Position Sizing as an input, which transitively requires Risk Assessment and Volatility Estimation. This creates a clean four-skill execution chain that demonstrates the full power of skill composition.

## References

- [[Position Sizing]] - required dependency providing position details
- [[Risk Assessment]] - transitive dependency through Position Sizing
- [[Volatility Estimation]] - transitive dependency through Risk Assessment
