# Ifyrt Scanner Core

Real-time market scanning, trade execution monitoring, risk analysis, and strategy evaluation for Ifyrt.

## Features

- **Market Scanning**: Price patterns, volatility, order book depth analysis
- **Trade Execution Monitoring**: Fill rate, slippage, latency tracking
- **Risk & Portfolio Scanning**: Drawdown monitoring, exposure tracking, alerts
- **Strategy Analysis**: Backtest validation, optimization recommendations

## Installation

```bash
pip install -e ".[dev]"
```

## Usage

```python
from ifyrt_scanner import MarketScanner, ExecutionScanner, RiskScanner, StrategyScanner

# Scan market data
market_scanner = MarketScanner(supabase_url, supabase_key)
market_results = await market_scanner.scan_volatility("BTC/USDT", window_minutes=60)

# Monitor trade execution
exec_scanner = ExecutionScanner(supabase_url, supabase_key)
exec_metrics = await exec_scanner.scan_fills(user_id, last_n_trades=10)

# Risk monitoring
risk_scanner = RiskScanner(supabase_url, supabase_key)
drawdown_alert = await risk_scanner.check_drawdown(user_id, threshold_pct=10)

# Strategy analysis
strategy_scanner = StrategyScanner(supabase_url, supabase_key)
analysis = await strategy_scanner.analyze_strategy("sma-crossover", symbol="BTC/USDT")
```

## Architecture

```
scanner-core/
├── scanners/         # Individual scanner implementations
├── models/           # Pydantic data models
├── utils/            # Shared utilities (DB, alerts, helpers)
└── app.py            # FastAPI application
```
