---
title: Correlation Analysis
description: Computes pairwise and portfolio-level correlation structures across assets using rolling and conditional correlation methods
version: "1.0.0"
domain: quantitative-analysis
priority: 0.6
activation:
  triggers:
    - correlation
    - asset correlation
    - correlation matrix
    - diversification
    - co-movement
    - cross-asset
    - pair correlation
  required_context:
    - market_data
inputs:
  - name: asset_identifiers
    schema: "Array<string> (list of ticker symbols or asset IDs)"
    required: true
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: string, percentile_rank: number }"
    required: true
  - name: lookback_period
    schema: "number (days, default 60)"
    required: false
  - name: method
    schema: "'pearson' | 'spearman' | 'dcc' (default 'pearson')"
    required: false
outputs:
  - name: correlation_structure
    schema: "{ correlation_matrix: number[][], eigenvalues: number[], principal_components: number, condition_number: number, unstable_pairs: Array<{ pair: [string, string], rolling_corr_std: number }>, regime_conditional_corr: { low_vol: number[][], high_vol: number[][] } }"
dependencies:
  required:
    - Volatility Estimation
  optional: []
context_budget_cost: 2.5
evaluation:
  success_criteria:
    - Correlation matrix is symmetric with diagonal values of 1.0
    - All correlation values are between -1 and 1
    - Eigenvalues are non-negative (matrix is positive semi-definite)
    - Unstable pairs have rolling correlation standard deviation above threshold
  failure_modes:
    - Fewer than 2 assets provided for correlation computation
    - Insufficient overlapping data between asset pairs
    - DCC model fails to converge when dynamic method selected
    - Degenerate correlation matrix due to identical return series
---

## Procedure

1. Retrieve historical return series for all specified assets over the lookback period (default 60 days) plus a 252-day buffer for stability analysis.
2. Align all series to common trading dates, handling missing data via forward-fill with a maximum gap of 3 days.
3. Compute the pairwise correlation matrix using the specified method (default Pearson).
4. Perform eigenvalue decomposition to assess the correlation structure:
   - Count principal components explaining 90% of variance
   - Compute the condition number to assess matrix stability
5. Calculate rolling 30-day correlations for each pair and identify unstable pairs where the rolling correlation standard deviation exceeds 0.15.
6. Using the volatility assessment's vol_regime classification, segment the return history into low-vol and high-vol periods and compute regime-conditional correlation matrices.
7. If the DCC method is selected, fit a DCC-GARCH(1,1) model to produce time-varying correlations.
8. Return the complete correlation structure object.

## Reasoning

Correlation Analysis is essential for portfolio construction and risk management because diversification benefits depend entirely on the correlation structure between assets. It depends on Volatility Estimation because volatility regimes materially affect correlations (correlations tend to spike during high-volatility periods). Its moderate priority of 0.6 reflects its role as an analytical building block consumed by Portfolio Optimization and Hedging Strategy rather than a direct user-facing output.

## References

- [[Volatility Estimation]] - required dependency providing volatility regime context
- [[Portfolio Optimization]] - consumes correlation matrix for mean-variance optimization
- [[Hedging Strategy]] - uses correlation structure to identify hedging instruments
