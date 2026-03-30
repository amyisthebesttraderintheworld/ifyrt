"""Market data scanning and analysis."""

from datetime import datetime, timedelta
from typing import Optional
import numpy as np

from ifyrt_scanner.models.market import (
    VolatilityScanResult,
    OrderBookAnalysis,
    PriceLevelAnalysis,
)
from ifyrt_scanner.utils.db import SupabaseClient
from ifyrt_scanner.utils.calculations import (
    calculate_volatility,
    detect_momentum,
)


class MarketScanner:
    """Scans market data for patterns, volatility, and liquidity."""

    def __init__(self, db: SupabaseClient):
        """Initialize market scanner with database connection."""
        self.db = db

    async def scan_volatility(
        self,
        exchange: str,
        symbol: str,
        window_minutes: int = 60,
    ) -> VolatilityScanResult:
        """
        Scan market volatility over a time window.

        Args:
            exchange: Exchange name (e.g., 'binance')
            symbol: Trading pair (e.g., 'BTC/USDT')
            window_minutes: Analysis window in minutes

        Returns:
            VolatilityScanResult with volatility metrics
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)

        snapshots = await self.db.query(
            """
            SELECT timestamp, last, bid, ask
            FROM market_snapshots
            WHERE exchange = $1 AND symbol = $2 AND captured_at >= $3
            ORDER BY captured_at ASC
            """,
            exchange,
            symbol,
            cutoff_time,
        )

        if not snapshots:
            # Return degraded result
            return VolatilityScanResult(
                exchange=exchange,
                symbol=symbol,
                current_price=0.0,
                high_price=0.0,
                low_price=0.0,
                volatility_pct=0.0,
                price_change_pct=0.0,
                intraday_high_low_range=0.0,
                volatility_regime="low",
                volume_sma_ratio=1.0,
                window_minutes=window_minutes,
            )

        prices = [float(s["last"]) for s in snapshots]
        current_price = prices[-1]
        high_price = max(prices)
        low_price = min(prices)

        volatility_pct = calculate_volatility(prices, window=min(20, len(prices)))
        price_change_pct = (
            ((current_price - prices[0]) / prices[0]) * 100 if prices[0] > 0 else 0
        )
        intraday_range = ((high_price - low_price) / current_price * 100) if current_price > 0 else 0

        # Determine volatility regime
        if volatility_pct > 5:
            regime = "extreme"
        elif volatility_pct > 3:
            regime = "high"
        elif volatility_pct > 1:
            regime = "normal"
        else:
            regime = "low"

        # Momentum detection
        momentum = detect_momentum(prices)
        is_breakout = momentum != "neutral" and volatility_pct > 2

        return VolatilityScanResult(
            exchange=exchange,
            symbol=symbol,
            timestamp=datetime.utcnow(),
            window_minutes=window_minutes,
            current_price=current_price,
            high_price=high_price,
            low_price=low_price,
            volatility_pct=volatility_pct,
            price_change_pct=price_change_pct,
            intraday_high_low_range=intraday_range,
            volatility_regime=regime,
            volume_sma_ratio=1.0,  # TODO: fetch volume data
            is_breakout_candidate=is_breakout,
        )

    async def analyze_orderbook(
        self,
        exchange: str,
        symbol: str,
    ) -> OrderBookAnalysis:
        """
        Analyze current order book structure.

        Args:
            exchange: Exchange name
            symbol: Trading pair

        Returns:
            OrderBookAnalysis with liquidity metrics
        """
        snapshot = await self.db.query_one(
            """
            SELECT order_book, captured_at, bid, ask
            FROM market_snapshots
            WHERE exchange = $1 AND symbol = $2
            ORDER BY captured_at DESC
            LIMIT 1
            """,
            exchange,
            symbol,
        )

        if not snapshot:
            return OrderBookAnalysis(
                exchange=exchange,
                symbol=symbol,
                bid_volume_top_5=0.0,
                ask_volume_top_5=0.0,
                bid_ask_ratio=1.0,
                spread_bps=0.0,
                is_healthy=False,
                alert_message="No market data available",
            )

        ob = snapshot["order_book"]
        bid_price = float(snapshot["bid"])
        ask_price = float(snapshot["ask"])

        # Extract top 5 bid/ask volumes
        bids = ob.get("bids", [])[:5]
        asks = ob.get("asks", [])[:5]

        bid_volume = sum(float(level[1]) for level in bids) if bids else 0.0
        ask_volume = sum(float(level[1]) for level in asks) if asks else 0.0

        spread = ((ask_price - bid_price) / bid_price * 10000) if bid_price > 0 else 0
        ratio = (bid_volume / ask_volume) if ask_volume > 0 else 1.0

        # Health check
        is_healthy = bid_volume > 0 and ask_volume > 0 and spread < 50  # < 50 bps

        levels = []
        for bid, ask in zip(bids, asks):
            levels.append(
                PriceLevelAnalysis(
                    price=float(bid[0]),
                    bid_depth=float(bid[1]),
                    ask_depth=float(ask[1]),
                    imbalance_ratio=float(bid[1]) / float(ask[1]) if ask[1] > 0 else 1.0,
                )
            )

        return OrderBookAnalysis(
            exchange=exchange,
            symbol=symbol,
            bid_volume_top_5=bid_volume,
            ask_volume_top_5=ask_volume,
            bid_ask_ratio=ratio,
            spread_bps=spread,
            price_levels=levels,
            is_healthy=is_healthy,
            alert_message=None if is_healthy else "Liquidity or spread alert",
        )

    async def scan_all_symbols(
        self,
        exchange: str,
    ) -> list[VolatilityScanResult]:
        """
        Scan volatility across all tracked symbols.

        Args:
            exchange: Exchange name

        Returns:
            List of volatility scan results
        """
        symbols = await self.db.query(
            """
            SELECT DISTINCT symbol FROM market_snapshots
            WHERE exchange = $1
            """,
            exchange,
        )

        results = []
        for row in symbols:
            result = await self.scan_volatility(exchange, row["symbol"])
            results.append(result)

        return results


__all__ = ["MarketScanner"]
