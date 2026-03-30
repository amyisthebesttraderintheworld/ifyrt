"""FastAPI application for scanner service."""

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import asyncio

from ifyrt_scanner.utils.db import SupabaseClient
from ifyrt_scanner.scanners.market import MarketScanner
from ifyrt_scanner.scanners.execution import ExecutionScanner
from ifyrt_scanner.scanners.risk import RiskScanner
from ifyrt_scanner.scanners.strategy import StrategyScanner

# Initialize FastAPI app
app = FastAPI(
    title="Ifyrt Scanner Service",
    description="Real-time market, execution, risk, and strategy scanning",
    version="0.1.0",
)

# Global scanner instances
db: Optional[SupabaseClient] = None
market_scanner: Optional[MarketScanner] = None
execution_scanner: Optional[ExecutionScanner] = None
risk_scanner: Optional[RiskScanner] = None
strategy_scanner: Optional[StrategyScanner] = None


@app.on_event("startup")
async def startup_event():
    """Initialize database and scanners on startup."""
    global db, market_scanner, execution_scanner, risk_scanner, strategy_scanner

    # TODO: Read from environment
    supabase_url = "https://xxx.supabase.co"
    supabase_key = "your_service_key"

    db = SupabaseClient(supabase_url, supabase_key)
    await db.connect()

    market_scanner = MarketScanner(db)
    execution_scanner = ExecutionScanner(db)
    risk_scanner = RiskScanner(db)
    strategy_scanner = StrategyScanner(db)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    if db:
        await db.disconnect()


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "service": "ifyrt-scanner",
        "status": "ok" if db else "initializing",
    }


# ===== MARKET SCANNING ENDPOINTS =====
@app.get("/market/volatility")
async def scan_market_volatility(
    exchange: str,
    symbol: str,
    window_minutes: int = Query(60, ge=1, le=1440),
):
    """Scan market volatility for a trading pair."""
    if not market_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await market_scanner.scan_volatility(exchange, symbol, window_minutes)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/orderbook")
async def analyze_orderbook(
    exchange: str,
    symbol: str,
):
    """Analyze order book structure and liquidity."""
    if not market_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await market_scanner.analyze_orderbook(exchange, symbol)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/all-symbols")
async def scan_all_symbols(
    exchange: str,
):
    """Scan volatility across all tracked symbols."""
    if not market_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        results = await market_scanner.scan_all_symbols(exchange)
        return [r.dict() for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== EXECUTION SCANNING ENDPOINTS =====
@app.get("/execution/fills/{user_id}")
async def scan_execution_fills(
    user_id: str,
    last_n: int = Query(20, ge=1, le=100),
    is_live: bool = Query(False),
):
    """Scan recent trade fills for execution quality."""
    if not execution_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await execution_scanner.scan_fills(user_id, last_n, is_live)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/execution/symbol/{user_id}")
async def scan_execution_by_symbol(
    user_id: str,
    symbol: str,
    last_n: int = Query(10, ge=1, le=100),
):
    """Analyze execution for a specific trading pair."""
    if not execution_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await execution_scanner.scan_execution_by_symbol(user_id, symbol, last_n)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/execution/trend/{user_id}")
async def get_execution_trend(
    user_id: str,
    days: int = Query(7, ge=1, le=90),
):
    """Get execution quality trend over time."""
    if not execution_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await execution_scanner.get_execution_trend(user_id, days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== RISK SCANNING ENDPOINTS =====
@app.get("/risk/drawdown/{user_id}")
async def check_drawdown(
    user_id: str,
    threshold: float = Query(10.0, ge=0, le=100),
):
    """Check for drawdown exceeding threshold."""
    if not risk_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await risk_scanner.check_drawdown(user_id, threshold)
        return result.dict() if result else {"alert": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/risk/exposure/{user_id}")
async def analyze_exposure(user_id: str):
    """Analyze current portfolio exposure."""
    if not risk_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await risk_scanner.analyze_exposure(user_id)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/risk/metrics/{user_id}")
async def scan_risk_metrics(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
):
    """Compute comprehensive risk metrics."""
    if not risk_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await risk_scanner.scan_risk_metrics(user_id, days)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== STRATEGY SCANNING ENDPOINTS =====
@app.get("/strategy/analyze/{user_id}")
async def analyze_strategy(
    user_id: str,
    strategy_name: str,
):
    """Analyze strategy performance and fitness."""
    if not strategy_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await strategy_scanner.analyze_strategy(user_id, strategy_name)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/strategy/backtest/{simulation_id}")
async def validate_backtest(simulation_id: str):
    """Validate a backtest result."""
    if not strategy_scanner:
        raise HTTPException(status_code=503, detail="Scanner not initialized")

    try:
        result = await strategy_scanner.validate_backtest(simulation_id)
        return result.dict() if result else {"validation": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
