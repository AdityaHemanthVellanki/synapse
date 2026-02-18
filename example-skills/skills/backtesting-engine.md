---
title: Backtesting Engine
description: Simulates historical performance of trading strategies using entry/exit signals and position sizing rules against historical market data
version: "1.0.0"
domain: validation
priority: 0.6
activation:
  triggers:
    - backtest
    - backtesting
    - historical test
    - strategy test
    - simulate strategy
    - historical performance
    - paper trade
  required_context:
    - market_data
inputs:
  - name: entry_signal_rules
    schema: "{ strategy_type: string, signal_parameters: object, entry_threshold: number }"
    required: true
  - name: exit_signal_rules
    schema: "{ exit_conditions: Array<{ type: string, threshold: number }>, stop_loss_method: string }"
    required: true
  - name: position_sizing_rules
    schema: "{ method: string, risk_per_trade_pct: number, max_positions: number }"
    required: true
  - name: asset_universe
    schema: "Array<string> (ticker symbols to test against)"
    required: true
  - name: test_period
    schema: "{ start_date: string, end_date: string }"
    required: true
  - name: initial_capital
    schema: "number (default 100000)"
    required: false
outputs:
  - name: backtest_results
    schema: "{ total_return_pct: number, annualized_return_pct: number, sharpe_ratio: number, sortino_ratio: number, max_drawdown_pct: number, max_drawdown_duration_days: number, win_rate: number, profit_factor: number, total_trades: number, avg_trade_return_pct: number, avg_holding_period_days: number, equity_curve: Array<{ date: string, equity: number }>, monthly_returns: Array<{ month: string, return_pct: number }>, trade_log: Array<{ entry_date: string, exit_date: string, asset: string, side: string, return_pct: number }> }"
dependencies:
  required:
    - Entry Signal Generation
    - Exit Signal Generation
    - Position Sizing
  optional: []
context_budget_cost: 3.0
evaluation:
  success_criteria:
    - Equity curve starts at initial capital and has no gaps
    - Total trades count matches trade log length
    - Win rate is between 0 and 1
    - Sharpe ratio and Sortino ratio are computed with annualization
    - Monthly returns cover the full test period
    - Max drawdown is computed correctly from peak-to-trough equity
  failure_modes:
    - Insufficient historical data for the specified test period
    - Look-ahead bias detected in signal generation
    - Survivorship bias in asset universe
    - Execution assumptions are unrealistic (zero slippage, unlimited liquidity)
    - Test period is too short for statistical significance
---

## Procedure

1. Receive entry signal rules, exit signal rules, and position sizing rules from their respective upstream skills.
2. Load historical market data (OHLCV) for all assets in the universe over the test period plus a lookback buffer for indicator warmup.
3. Initialize the simulation engine with the specified initial capital and an empty portfolio.
4. Iterate through each trading day in the test period:
   a. Generate entry signals for all assets using the entry signal rules and current market state.
   b. Generate exit signals for all open positions using exit signal rules.
   c. Process exits first: close positions where exit signals are triggered, recording realized P&L.
   d. Process entries: for qualifying entry signals, compute position size using position sizing rules and available capital.
   e. Execute simulated trades at the next bar's open price with realistic slippage assumptions (0.05% for liquid assets, 0.2% for illiquid).
   f. Apply commission model ($0.005 per share or 0.1% of notional, whichever is greater).
   g. Update the equity curve.
5. After simulation completes, compute aggregate performance metrics:
   - Total and annualized returns
   - Sharpe ratio: (annualized_return - risk_free_rate) / annualized_volatility
   - Sortino ratio: (annualized_return - risk_free_rate) / downside_deviation
   - Maximum drawdown from peak equity to trough
   - Win rate, profit factor, average trade return, average holding period
6. Generate the monthly returns breakdown and complete trade log.
7. Validate against look-ahead bias by confirming all signals use only data available at the time of the signal.
8. Return the complete backtest results.

## Reasoning

The Backtesting Engine is the validation layer that tests whether the combination of entry signals, exit signals, and position sizing actually produces profitable results on historical data. It has a context budget cost of 3.0 (the highest among all skills) because it requires processing large volumes of historical data and running a full simulation loop. Its priority of 0.6 reflects that backtesting is important but typically requested explicitly rather than triggered implicitly. It depends on all three signal/sizing skills to ensure the backtest faithfully represents the complete trading system.

## References

- [[Entry Signal Generation]] - required dependency providing entry rules
- [[Exit Signal Generation]] - required dependency providing exit rules
- [[Position Sizing]] - required dependency providing sizing methodology
- [[Performance Attribution]] - consumes backtest results for attribution analysis
- [[Drawdown Analysis]] - consumes backtest results for risk analysis
