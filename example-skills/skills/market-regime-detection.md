---
title: Market Regime Detection
description: Identifies the current market regime (trending, mean-reverting, or volatile) using volatility data and statistical regime-switching models
version: "1.0.0"
domain: quantitative-analysis
priority: 0.7
activation:
  triggers:
    - market regime
    - regime detection
    - market state
    - trending market
    - mean reversion
    - regime switch
    - market phase
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: string, percentile_rank: number }"
    required: true
  - name: lookback_period
    schema: "number (days, default 60)"
    required: false
outputs:
  - name: regime_classification
    schema: "{ current_regime: 'trending_up' | 'trending_down' | 'mean_reverting' | 'high_volatility_breakout' | 'low_volatility_compression', regime_probability: number, regime_duration_days: number, transition_likelihood: number, hurst_exponent: number }"
dependencies:
  required:
    - Volatility Estimation
  optional: []
context_budget_cost: 2.0
evaluation:
  success_criteria:
    - Regime classification is one of the defined enum values
    - Regime probability is between 0 and 1
    - Hurst exponent is within valid range (0 to 1)
    - Regime duration is a positive integer
  failure_modes:
    - Insufficient historical data for regime model calibration
    - Volatility assessment is missing or stale
    - Regime-switching model fails to converge
    - Asset exhibits structural break invalidating lookback window
---

## Procedure

1. Receive the volatility assessment from Volatility Estimation and retrieve the historical price series for the specified lookback period (default 60 days) plus a 252-day buffer.
2. Compute the Hurst exponent using rescaled range (R/S) analysis to determine persistence vs. mean reversion:
   - H > 0.55: trending regime
   - 0.45 < H < 0.55: random walk / transitional
   - H < 0.45: mean-reverting regime
3. Fit a two-state Hidden Markov Model (HMM) with Gaussian emissions to the return series to identify high-volatility and low-volatility states.
4. Cross-reference the HMM state probabilities with the vol regime from the volatility assessment:
   - If vol_regime is 'extreme' and HMM indicates high-vol state with H > 0.55: classify as 'high_volatility_breakout'
   - If vol_regime is 'low' and H < 0.45: classify as 'low_volatility_compression'
   - If H > 0.55 and returns are positive: classify as 'trending_up'
   - If H > 0.55 and returns are negative: classify as 'trending_down'
   - Otherwise: classify as 'mean_reverting'
5. Estimate the transition likelihood by computing the HMM transition matrix probability of switching out of the current state within the next 5 trading days.
6. Calculate regime duration by counting consecutive days in the current classified regime.
7. Return the complete regime classification object.

## Reasoning

Market Regime Detection is a critical analytical skill that contextualizes all downstream trading decisions. Knowing whether the market is trending, mean-reverting, or breaking out fundamentally changes the optimal strategy. It depends on Volatility Estimation because volatility regimes are a primary input to regime classification. Its priority of 0.7 reflects that regime awareness should inform signal generation and strategy selection before any trades are considered.

## References

- [[Volatility Estimation]] - required dependency providing volatility regime data
- [[Entry Signal Generation]] - consumes regime classification for signal context
- [[Exit Signal Generation]] - uses regime data to adapt exit strategies
