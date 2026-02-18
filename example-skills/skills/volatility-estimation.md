---
title: Volatility Estimation
description: Analyzes historical and implied volatility to produce a comprehensive volatility assessment for a given asset
version: "1.0.0"
domain: quantitative-analysis
priority: 0.7
activation:
  triggers:
    - volatility
    - vol estimation
    - market volatility
    - implied vol
    - historical vol
    - price variance
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: lookback_period
    schema: "number (days, default 30)"
    required: false
outputs:
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: 'low' | 'medium' | 'high' | 'extreme', percentile_rank: number }"
dependencies:
  required: []
  optional: []
context_budget_cost: 2.0
evaluation:
  success_criteria:
    - Volatility values are within valid ranges (0-500%)
    - Vol regime classification is consistent with numeric values
    - Percentile rank is computed against trailing 252-day window
  failure_modes:
    - Insufficient historical data for lookback period
    - Stale market data (more than 1 hour old)
    - Asset not found in data provider
---

## Procedure

1. Retrieve historical price series for the specified asset over the lookback period (default 30 days) plus a buffer of 252 days for percentile ranking.
2. Calculate historical volatility using close-to-close log returns with annualization factor of sqrt(252).
3. If options data is available, extract at-the-money implied volatility from the nearest expiry.
4. Compute the volatility percentile rank by comparing current realized vol against the trailing 252-day distribution.
5. Classify the vol regime:
   - Low: percentile rank < 25
   - Medium: percentile rank 25-60
   - High: percentile rank 60-85
   - Extreme: percentile rank > 85
6. Return the complete volatility assessment object.

## Reasoning

Volatility estimation is a foundational skill because nearly every risk-aware decision depends on understanding the current volatility environment. It should dominate when the user's query involves uncertainty quantification, risk measurement, or when other skills like Position Sizing and Risk Assessment need volatility as an input. This skill has no dependencies itself, making it a leaf node that other skills can safely rely on.

## References

- [[Risk Assessment]] - consumes volatility output for risk scoring
- [[Position Sizing]] - uses volatility to determine optimal sizing
