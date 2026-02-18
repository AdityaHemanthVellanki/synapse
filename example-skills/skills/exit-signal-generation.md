---
title: Exit Signal Generation
description: Generates trade exit signals by monitoring market regime shifts, risk thresholds, and technical exhaustion patterns for open positions
version: "1.0.0"
domain: signal-generation
priority: 0.7
activation:
  triggers:
    - exit signal
    - sell signal
    - when to exit
    - take profit
    - close position
    - exit strategy
    - profit target
    - trade exit
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: regime_classification
    schema: "{ current_regime: string, regime_probability: number, transition_likelihood: number, hurst_exponent: number }"
    required: true
  - name: risk_score
    schema: "{ overall_risk: number, risk_grade: string, var_95: number, expected_shortfall: number }"
    required: true
  - name: position_entry_price
    schema: "number"
    required: true
  - name: position_side
    schema: "'long' | 'short'"
    required: true
  - name: unrealized_pnl_pct
    schema: "number (current unrealized P&L as percentage)"
    required: false
outputs:
  - name: exit_signal
    schema: "{ signal_action: 'full_exit' | 'partial_exit' | 'hold' | 'tighten_stop', exit_urgency: 'immediate' | 'end_of_day' | 'end_of_week' | 'no_action', exit_price_target: number, exit_reason: string, partial_exit_pct: number, regime_risk_flag: boolean, contributing_factors: Array<{ factor: string, signal: string }> }"
dependencies:
  required:
    - Market Regime Detection
    - Risk Assessment
  optional: []
context_budget_cost: 1.5
evaluation:
  success_criteria:
    - Signal action is one of the defined enum values
    - Exit price target is on the profitable side of entry for take-profit signals
    - Partial exit percentage is between 0 and 100
    - Exit reason is a clear, descriptive string
    - Regime risk flag correctly reflects regime transition danger
  failure_modes:
    - Regime classification is transitional with low probability
    - Risk score data is stale relative to fast-moving market
    - Position data is inconsistent with current market state
    - Unable to determine trend exhaustion with available technical data
---

## Procedure

1. Receive the regime classification from Market Regime Detection and risk score from Risk Assessment.
2. Retrieve the current market price and compute the unrealized P&L if not provided.
3. Evaluate regime-based exit conditions:
   - If regime transition likelihood > 0.7 and current regime supported the trade direction: flag regime_risk = true
   - If current regime is adversarial to position side (e.g., trending_down for long): recommend full exit
4. Evaluate risk-based exit conditions:
   - If risk_grade deteriorated to 'F': recommend immediate full exit
   - If risk_grade is 'D' and worsening: recommend partial exit (50%)
   - If VaR_95 exceeds 3x the position's original risk budget: recommend tighten stop
5. Evaluate technical exhaustion signals:
   - RSI > 80 (long) or RSI < 20 (short): momentum exhaustion
   - Bearish/bullish divergence on MACD
   - Volume declining while price extends: trend weakness
6. Evaluate profit-taking thresholds:
   - If unrealized P&L > 3x original risk: recommend partial exit (33%)
   - If unrealized P&L > 5x original risk: recommend partial exit (50%)
7. Combine all signals into a priority-weighted decision:
   - Risk-based signals override all others (safety first)
   - Regime signals override technical signals
   - Technical exhaustion signals generate partial exits
8. Set exit urgency based on signal severity:
   - Immediate: risk grade F or adversarial regime change
   - End of day: deteriorating risk or regime transition likely
   - End of week: technical exhaustion or profit-taking
   - No action: hold signal
9. Return the complete exit signal.

## Reasoning

Exit Signal Generation is the complementary skill to Entry Signal Generation, completing the trade lifecycle. It has a priority of 0.7, slightly lower than entry signals, because exit decisions benefit from a more measured approach except in emergency risk situations. It requires Market Regime Detection to detect regime shifts that invalidate the original trade thesis, and Risk Assessment to monitor whether risk has exceeded acceptable levels. The hierarchical decision framework ensures safety-critical exits always take precedence over discretionary ones.

## References

- [[Market Regime Detection]] - required dependency for detecting regime shifts
- [[Risk Assessment]] - required dependency for risk threshold monitoring
- [[Backtesting Engine]] - exit signals are validated through backtesting
- [[Entry Signal Generation]] - paired skill for complete trade lifecycle
