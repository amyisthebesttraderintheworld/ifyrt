"""Example usage of scanner components."""

import asyncio
from ifyrt_scanner.utils.db import SupabaseClient
from ifyrt_scanner.scanners.market import MarketScanner
from ifyrt_scanner.scanners.execution import ExecutionScanner
from ifyrt_scanner.scanners.risk import RiskScanner
from ifyrt_scanner.scanners.strategy import StrategyScanner


async def example_market_scanning():
    """Example: Scan market volatility."""
    print("=== Market Scanning Example ===")

    db = SupabaseClient("https://xxx.supabase.co", "your_service_key")
    await db.connect()

    scanner = MarketScanner(db)

    # Scan BTC/USDT volatility over the last hour
    result = await scanner.scan_volatility("binance", "BTC/USDT", window_minutes=60)

    print(f"Symbol: {result.symbol}")
    print(f"Volatility: {result.volatility_pct:.2f}%")
    print(f"Regime: {result.volatility_regime}")
    print(f"Current Price: ${result.current_price:.2f}")

    await db.disconnect()


async def example_execution_scanning():
    """Example: Analyze trade execution quality."""
    print("\n=== Execution Scanning Example ===")

    db = SupabaseClient("https://xxx.supabase.co", "your_service_key")
    await db.connect()

    scanner = ExecutionScanner(db)

    # Get execution metrics for last 20 trades
    metrics = await scanner.scan_fills("user-uuid", last_n_trades=20)

    print(f"Total Trades: {metrics.total_trades}")
    print(f"Avg Slippage: {metrics.average_slippage_pct:.4f}%")
    print(f"Quality Score: {metrics.execution_quality_score:.1f}/100")

    if metrics.worst_fills:
        print(f"Worst Fill Slippage: {metrics.worst_fills[0].slippage_pct:.4f}%")

    await db.disconnect()


async def example_risk_scanning():
    """Example: Monitor portfolio risk."""
    print("\n=== Risk Scanning Example ===")

    db = SupabaseClient("https://xxx.supabase.co", "your_service_key")
    await db.connect()

    scanner = RiskScanner(db)

    # Check for drawdown alerts
    alert = await scanner.check_drawdown("user-uuid", threshold_pct=15.0)

    if alert:
        print(f"⚠️ ALERT: {alert.message}")
        print(f"   Severity: {alert.severity}")
        print(f"   Drawdown: {alert.drawdown_pct:.2f}%")
    else:
        print("✓ No drawdown alerts")

    # Get full risk metrics
    metrics = await scanner.scan_risk_metrics("user-uuid", analysis_period_days=30)

    print(f"\nRisk Metrics (30 days):")
    print(f"  Starting Equity: ${metrics.starting_equity:.2f}")
    print(f"  Current Equity: ${metrics.current_equity:.2f}")
    print(f"  Risk Score: {metrics.overall_risk_score:.1f}/100")

    await db.disconnect()


async def example_strategy_analysis():
    """Example: Analyze strategy performance."""
    print("\n=== Strategy Analysis Example ===")

    db = SupabaseClient("https://xxx.supabase.co", "your_service_key")
    await db.connect()

    scanner = StrategyScanner(db)

    # Analyze strategy fitness
    analysis = await scanner.analyze_strategy("user-uuid", "sma-crossover")

    print(f"Strategy: {analysis.strategy_name}")
    print(f"Status: {analysis.current_status}")
    print(f"Fitness Score: {analysis.fitness_score:.1f}/100")
    print(f"Signal Quality: {analysis.signal_quality.signal_quality_score:.1f}/100")

    if analysis.optimization_suggestions:
        print("\nSuggestions:")
        for suggestion in analysis.optimization_suggestions:
            print(f"  • {suggestion}")

    await db.disconnect()


async def main():
    """Run all examples."""
    print("Ifyrt Scanner Examples\n")

    # Note: These examples require a real Supabase instance
    # Uncomment to run with real data:
    # await example_market_scanning()
    # await example_execution_scanning()
    # await example_risk_scanning()
    # await example_strategy_analysis()

    print("(Examples require a real Supabase instance)")
    print("\nTo use the scanners in your code:")
    print("1. Install: pip install -e .")
    print("2. Run the FastAPI app: python -m ifyrt_scanner.app")
    print("3. Access endpoints at http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())
