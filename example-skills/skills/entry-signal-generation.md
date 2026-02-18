---
title: Entry Signal Generation
description: Generates trade entry signals by combining market regime context, sentiment data, and technical indicators into a unified scoring framework
version: "1.0.0"
domain: signal-generation
priority: 0.8
activation:
  triggers:
    - entry signal
    - buy signal
    - trade signal
    - entry point
    - when to enter
    - signal generation
    - trade setup
    - long signal
    - short signal
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: regime_classification
    schema: "{ current_regime: string, regime_probability: number, transition_likelihood: number, hurst_exponent: number }"
    required: true
  - name: sentiment_report
    schema: "{ composite_score: number, sentiment_trend: string, confidence: number }"
    required: true
  - name: signal_type
    schema: "'momentum' | 'mean_reversion' | 'breakout' | 'adaptive' (default 'adaptive')"
    required: false
  - name: timeframe
    schema: "'intraday' | 'swing' | 'position' (default 'swing')"
    required: false
outputs:
  - name: entry_signal
    schema: "{ signal_direction: 'long' | 'short' | 'neutral', signal_strength: number (0 to 1), entry_price_target: number, strategy_type: string, contributing_factors: Array<{ factor: string, weight: number, value: number }>, time_validity_hours: number, confidence: number }"
dependencies:
  required:
    - Market Regime Detection
    - Sentiment Analysis
  optional: []
context_budget_cost: 2.0
evaluation:
  success_criteria:
    - Signal direction is one of the defined enum values
    - Signal strength is between 0 and 1
    - Entry price target is within a reasonable range of current market price
    - Contributing factors weights sum to 1.0
    - Strategy type is consistent with current market regime
  failure_modes:
    - Regime classification is stale or indicates transitional state
    - Sentiment data has low confidence and dominates the signal
    - Conflicting signals from technical and sentiment components
    - Market is in an unrecognizable regime making adaptive selection unreliable
---

## Procedure

1. Receive the regime classification from Market Regime Detection and sentiment report from Sentiment Analysis.
2. Select the appropriate signal strategy based on the current regime (if mode is 'adaptive'):
   - Trending up/down regime: Use momentum strategy (follow the trend)
   - Mean-reverting regime: Use mean reversion strategy (fade extremes)
   - High volatility breakout: Use breakout strategy (trade the expansion)
   - Low volatility compression: Use breakout strategy (anticipate the expansion)
3. Compute technical indicator scores for the selected strategy:
   - **Momentum**: RSI(14), MACD crossover, ADX strength, 50/200 MA alignment
   - **Mean Reversion**: Bollinger Band %B, RSI extremes, z-score of price vs. 20-day mean
   - **Breakout**: ATR expansion, volume surge, price relative to Donchian channel
4. Compute the sentiment factor score:
   - Weight sentiment composite score by its confidence level
   - Apply regime-conditional sentiment weight (higher weight in mean-reverting regimes where sentiment shifts precede price moves)
5. Blend all factors into a unified entry score:
   - Technical indicators: 50% weight
   - Regime alignment: 30% weight (higher score if regime supports the signal direction)
   - Sentiment: 20% weight
6. Determine signal direction:
   - Score > 0.6: Long signal
   - Score < -0.6: Short signal
   - Otherwise: Neutral (no trade)
7. Calculate signal strength as the absolute value of the blended score.
8. Set entry price target at current price adjusted by the expected short-term move.
9. Set time validity based on timeframe (intraday: 4 hours, swing: 48 hours, position: 168 hours).
10. Return the complete entry signal.

## Reasoning

Entry Signal Generation is the primary skill that transforms analytical inputs into actionable trade ideas. It has high priority (0.8) because generating a clear entry signal is often the direct goal of a user query. It requires Market Regime Detection to ensure the chosen strategy matches current conditions, and Sentiment Analysis to incorporate non-price information. The adaptive approach ensures the signal methodology evolves with market conditions rather than applying a static framework.

## References

- [[Market Regime Detection]] - required dependency providing regime context for strategy selection
- [[Sentiment Analysis]] - required dependency providing non-price signal component
- [[Backtesting Engine]] - entry signals are validated through backtesting
- [[Exit Signal Generation]] - paired skill for complete trade lifecycle
