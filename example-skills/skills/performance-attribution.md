---
title: Performance Attribution
description: Decomposes portfolio or strategy returns into contributing factors including asset allocation, security selection, timing, and risk factor exposures
version: "1.0.0"
domain: analytics
priority: 0.5
activation:
  triggers:
    - performance attribution
    - return attribution
    - alpha decomposition
    - factor attribution
    - what drove returns
    - performance breakdown
    - attribution analysis
  required_context:
    - market_data
    - portfolio_state
inputs:
  - name: backtest_results
    schema: "{ equity_curve: Array<{ date: string, equity: number }>, trade_log: Array<{ entry_date: string, exit_date: string, asset: string, side: string, return_pct: number }>, monthly_returns: Array<{ month: string, return_pct: number }> }"
    required: true
  - name: benchmark_identifier
    schema: "string (benchmark ticker, default 'SPY')"
    required: false
  - name: factor_model
    schema: "'capm' | 'fama_french_3' | 'fama_french_5' | 'custom' (default 'fama_french_3')"
    required: false
outputs:
  - name: attribution_report
    schema: "{ total_alpha: number, allocation_effect: number, selection_effect: number, interaction_effect: number, timing_effect: number, factor_exposures: Array<{ factor: string, beta: number, contribution: number }>, information_ratio: number, tracking_error: number, best_trades: Array<{ asset: string, contribution: number }>, worst_trades: Array<{ asset: string, contribution: number }>, monthly_alpha: Array<{ month: string, alpha: number }> }"
dependencies:
  required:
    - Backtesting Engine
  optional: []
context_budget_cost: 2.0
evaluation:
  success_criteria:
    - Allocation + selection + interaction effects sum to total active return
    - Factor exposures are statistically significant (t-stat > 2 for reported factors)
    - Information ratio is computed correctly as alpha / tracking error
    - Best and worst trades are ranked correctly by contribution magnitude
    - Monthly alpha series covers the full analysis period
  failure_modes:
    - Backtest results have insufficient trade history for meaningful attribution
    - Benchmark data is unavailable or misaligned with test period
    - Factor model regression has low R-squared indicating poor fit
    - Multicollinearity among factors produces unstable beta estimates
---

## Procedure

1. Receive the backtest results from the Backtesting Engine.
2. Load benchmark return series for the analysis period (default SPY).
3. Compute active returns: strategy return minus benchmark return for each period.
4. Perform Brinson-Fachler attribution to decompose active returns into:
   - **Allocation Effect**: return from overweighting/underweighting sectors vs. benchmark
   - **Selection Effect**: return from picking better/worse assets within each sector
   - **Interaction Effect**: cross-term between allocation and selection decisions
5. Compute timing effect by analyzing the correlation between position changes and subsequent returns.
6. Run the selected factor model regression (default Fama-French 3-factor):
   - CAPM: R_excess = alpha + beta_mkt * MKT + epsilon
   - FF3: R_excess = alpha + beta_mkt * MKT + beta_smb * SMB + beta_hml * HML + epsilon
   - FF5: adds RMW (profitability) and CMA (investment) factors
7. Extract factor betas and compute each factor's contribution to total return.
8. Calculate information ratio: annualized_alpha / tracking_error.
9. Rank individual trades by their contribution to total portfolio return and identify the top 5 best and worst trades.
10. Compute rolling monthly alpha to show consistency of outperformance.
11. Return the complete attribution report.

## Reasoning

Performance Attribution answers the critical question "why did we make or lose money?" by decomposing returns into explainable components. It depends on the Backtesting Engine because it needs a complete set of trade results and equity curve data to analyze. Its moderate priority of 0.5 reflects that attribution is a post-hoc analytical tool rather than a real-time decision skill. However, the insights it provides are essential for strategy refinement and investor reporting through the Reporting Dashboard.

## References

- [[Backtesting Engine]] - required dependency providing trade history and equity curve
- [[Reporting Dashboard]] - consumes attribution data for visualization
