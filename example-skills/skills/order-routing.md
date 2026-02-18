---
title: Order Routing
description: Determines the optimal venue and routing strategy for order execution based on liquidity analysis, execution plan requirements, and venue characteristics
version: "1.0.0"
domain: execution
priority: 0.5
activation:
  triggers:
    - order routing
    - route order
    - venue selection
    - smart routing
    - best execution
    - execution venue
    - dark pool
  required_context:
    - market_data
    - broker_connection
inputs:
  - name: execution_plan
    schema: "{ orders: Array<{ type: string, side: string, quantity: number, price: number | null, time_in_force: string }>, estimated_slippage: number }"
    required: true
  - name: liquidity_profile
    schema: "{ bid_ask_spread_bps: number, average_daily_volume: number, liquidity_score: number, liquidity_grade: string, optimal_execution_window: string }"
    required: true
  - name: routing_preference
    schema: "'best_price' | 'fastest_fill' | 'minimize_impact' | 'auto' (default 'auto')"
    required: false
outputs:
  - name: routing_plan
    schema: "{ primary_venue: string, venue_allocation: Array<{ venue: string, percentage: number, reason: string }>, order_type_adjustments: Array<{ original_type: string, adjusted_type: string, reason: string }>, execution_algo: 'TWAP' | 'VWAP' | 'POV' | 'IS' | 'DMA', estimated_fill_rate: number, estimated_cost_bps: number, dark_pool_eligible: boolean, routing_rationale: string }"
dependencies:
  required:
    - Trade Execution
    - Liquidity Assessment
  optional: []
context_budget_cost: 1.0
evaluation:
  success_criteria:
    - Venue allocation percentages sum to 100%
    - Primary venue is accessible and active
    - Execution algo is appropriate for the order size and liquidity
    - Estimated fill rate is between 0 and 1
    - Estimated cost is non-negative and in basis points
    - Dark pool eligibility is correctly assessed based on order size and regulations
  failure_modes:
    - Primary venue is down or unreachable
    - Order size exceeds venue capacity
    - Regulatory restrictions prevent routing to selected venue
    - Stale liquidity data causes suboptimal venue selection
    - Dark pool routing violates minimum order size requirements
---

## Procedure

1. Receive the execution plan from Trade Execution and liquidity profile from Liquidity Assessment.
2. Assess the order's size relative to available liquidity:
   - Small order (< 0.1% of ADV): Direct Market Access (DMA) is sufficient
   - Medium order (0.1% - 1% of ADV): Consider algorithmic execution
   - Large order (> 1% of ADV): Require multi-venue routing and impact minimization
3. Select the execution algorithm based on order size and routing preference:
   - **DMA**: For small orders prioritizing speed
   - **TWAP**: Time-weighted average price for medium orders without urgency
   - **VWAP**: Volume-weighted average price for orders targeting average price
   - **POV (Percentage of Volume)**: For large orders aiming to match participation rate
   - **IS (Implementation Shortfall)**: For orders balancing urgency and market impact
4. Evaluate available venues:
   - Lit exchanges: NYSE, NASDAQ, CBOE -- assess queue position and rebate structure
   - Dark pools: assess minimum size requirements and historical fill rates
   - ATS: evaluate crossing network schedules and match rates
5. Allocate order across venues:
   - Route to venue with tightest spread for price-sensitive orders
   - Split across venues for large orders to minimize information leakage
   - Consider dark pools for block-sized orders (> 10,000 shares) to reduce market impact
6. Adjust order types if needed:
   - Convert market orders to limit orders with buffer in illiquid markets
   - Add hidden quantity for large limit orders to reduce information leakage
7. Estimate the total execution cost including exchange fees, rebates, and expected slippage.
8. Generate a human-readable routing rationale explaining the decisions.
9. Return the complete routing plan.

## Reasoning

Order Routing is the tactical execution skill that bridges the trade plan to actual market execution. It depends on Trade Execution for the order specifications and Liquidity Assessment for understanding venue-level liquidity characteristics. Its priority of 0.5 matches Trade Execution because it operates at the same execution layer but handles the venue-specific optimization that Trade Execution delegates. The skill is critical for best execution compliance and minimizing transaction costs.

## References

- [[Trade Execution]] - required dependency providing execution plan and order details
- [[Liquidity Assessment]] - required dependency for venue liquidity evaluation
- [[Slippage Estimation]] - routing decisions affect realized slippage
