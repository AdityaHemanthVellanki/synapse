---
title: Drawdown Analysis
description: Analyzes historical and simulated drawdown characteristics including depth, duration, recovery, and conditional drawdown risk under various volatility regimes
version: "1.0.0"
domain: risk-management
priority: 0.6
activation:
  triggers:
    - drawdown
    - drawdown analysis
    - max drawdown
    - peak to trough
    - underwater analysis
    - recovery time
    - worst case loss
  required_context:
    - market_data
inputs:
  - name: backtest_results
    schema: "{ equity_curve: Array<{ date: string, equity: number }>, monthly_returns: Array<{ month: string, return_pct: number }> }"
    required: true
  - name: volatility_assessment
    schema: "{ historical_vol: number, implied_vol: number, vol_regime: string, percentile_rank: number }"
    required: true
  - name: confidence_level
    schema: "number (percentile for conditional drawdown, default 0.95)"
    required: false
outputs:
  - name: drawdown_report
    schema: "{ max_drawdown_pct: number, max_drawdown_duration_days: number, max_recovery_days: number, average_drawdown_pct: number, drawdown_frequency: number, current_drawdown_pct: number, conditional_drawdown_at_risk: number, calmar_ratio: number, ulcer_index: number, drawdown_periods: Array<{ start_date: string, trough_date: string, recovery_date: string, depth_pct: number, duration_days: number }>, regime_conditional_drawdowns: { low_vol: number, medium_vol: number, high_vol: number, extreme_vol: number } }"
dependencies:
  required:
    - Backtesting Engine
    - Volatility Estimation
  optional: []
context_budget_cost: 1.5
evaluation:
  success_criteria:
    - Max drawdown is the deepest peak-to-trough decline in the equity curve
    - All drawdown periods are non-overlapping and correctly bounded
    - Recovery dates are after trough dates
    - Calmar ratio is annualized return divided by max drawdown
    - Ulcer index is correctly computed as RMS of drawdown percentages
    - Regime conditional drawdowns are computed from actual vol regime periods
  failure_modes:
    - Equity curve has insufficient data points for meaningful analysis
    - Volatility assessment does not cover the backtest period
    - No drawdown periods detected (monotonically increasing equity)
    - Recovery date is undefined for drawdowns not yet recovered
---

## Procedure

1. Receive the backtest results from the Backtesting Engine and volatility assessment from Volatility Estimation.
2. Compute the running maximum of the equity curve (high-water mark).
3. Calculate the drawdown series: drawdown_pct = (equity - high_water_mark) / high_water_mark * 100 for each date.
4. Identify all distinct drawdown periods:
   - Start date: first date equity drops below previous high-water mark
   - Trough date: date of maximum drawdown within the period
   - Recovery date: first date equity returns to or exceeds the high-water mark (null if not recovered)
   - Depth: percentage decline at the trough
   - Duration: trading days from start to recovery (or to present if not recovered)
5. Compute aggregate metrics:
   - Max drawdown: deepest decline across all periods
   - Max drawdown duration: longest period from peak to recovery
   - Average drawdown: mean depth across all drawdown periods
   - Drawdown frequency: number of drawdown periods per year
   - Current drawdown: distance from current equity to high-water mark
6. Compute the Conditional Drawdown at Risk (CDaR) at the specified confidence level: the expected drawdown given that we are in the worst (1 - confidence_level) tail of drawdown outcomes.
7. Calculate the Calmar ratio: annualized return / |max drawdown|.
8. Calculate the Ulcer index: sqrt(mean(drawdown_pct^2)) across the full equity curve.
9. Segment the equity curve by vol regime periods (using volatility assessment percentile thresholds) and compute average drawdown depth during each regime.
10. Return the complete drawdown report.

## Reasoning

Drawdown Analysis is a specialized risk-management skill focused on the most psychologically and financially impactful aspect of trading: losses from peak equity. It depends on the Backtesting Engine for the equity curve and trade history, and on Volatility Estimation to provide regime context for conditional drawdown analysis. Its priority of 0.6 reflects that drawdown awareness is critical for strategy acceptance and risk budgeting. The Reporting Dashboard consumes drawdown analysis for comprehensive risk reporting.

## References

- [[Backtesting Engine]] - required dependency providing equity curve and returns
- [[Volatility Estimation]] - required dependency for regime-conditional analysis
- [[Reporting Dashboard]] - consumes drawdown data for risk visualization
- [[Capital Allocation]] - drawdown characteristics inform allocation limits
