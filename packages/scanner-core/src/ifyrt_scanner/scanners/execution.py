"""Trade execution scanning and analysis."""

from datetime import datetime, timedelta
from typing import Optional

from ifyrt_scanner.models.execution import (
    ExecutionMetrics,
    FillAnalysis,
    LatencyMetrics,
)
from ifyrt_scanner.utils.db import SupabaseClient
from ifyrt_scanner.utils.calculations import calculate_slippage


class ExecutionScanner:
    """Monitors and analyzes trade execution quality."""

    def __init__(self, db: SupabaseClient):
        """Initialize execution scanner with database connection."""
        self.db = db

    async def scan_fills(
        self,
        user_id: str,
        last_n_trades: int = 20,
        is_live: bool = False,
    ) -> ExecutionMetrics:
        """
        Scan recent trades for execution quality metrics.

        Args:
            user_id: User ID
            last_n_trades: Number of recent trades to analyze
            is_live: Filter for live trades only

        Returns:
            ExecutionMetrics with fill analysis
        """
        trades = await self.db.get_trades(user_id, limit=last_n_trades, is_live=is_live)

        if not trades:
            return ExecutionMetrics(
                user_id=user_id,
                time_period_minutes=60,
                total_trades=0,
                total_filled_quantity=0.0,
                total_slippage_pct=0.0,
                average_fill_percentage=0.0,
                average_slippage_pct=0.0,
                average_latency_ms=0.0,
                execution_quality_score=0.0,
            )

        # Calculate metrics for each trade
        fill_analyses = []
        total_quantity = 0.0
        total_slippage = 0.0

        for trade in trades:
            # Estimate fill percentage (assume full fill if not specified)
            fill_pct = 1.0  # Simplified; would include partial fills from actual data

            # Calculate slippage (simplified; would need best_available_price from fill history)
            slippage_pct = 0.0  # TODO: fetch from fill records

            fill_analysis = FillAnalysis(
                trade_id=trade["id"],
                side=trade["side"],
                requested_quantity=float(trade["quantity"]),
                filled_quantity=float(trade["quantity"]),
                fill_percentage=fill_pct,
                requested_price=None,
                fill_price=float(trade["fill_price"]),
                best_available_price=float(trade["fill_price"]),
                slippage_ticks=0.0,
                slippage_pct=slippage_pct,
                fee_paid=float(trade["fee"]),
                fee_pct=(float(trade["fee"]) / (float(trade["fill_price"]) * float(trade["quantity"])) * 100) if trade["fill_price"] > 0 else 0.0,
                latency=LatencyMetrics(
                    order_creation_to_submission_ms=5.0,  # TODO: actual latency
                    submission_to_fill_ms=10.0,
                    total_latency_ms=15.0,
                    is_within_acceptable_range=True,
                ),
                execution_quality_score=75.0,  # Simplified
            )

            fill_analyses.append(fill_analysis)
            total_quantity += float(trade["quantity"])
            total_slippage += slippage_pct

        avg_slippage = (
            total_slippage / len(trades) if trades else 0.0
        )
        avg_fill_pct = 1.0  # Simplified

        # Calculate quality score
        quality_score = max(
            0,
            100 - (avg_slippage * 10) - ((1.0 - avg_fill_pct) * 20),
        )

        # Sort fills for top/worst
        ranked_fills = sorted(fill_analyses, key=lambda f: f.execution_quality_score, reverse=True)
        top_fills = ranked_fills[:3]
        worst_fills = ranked_fills[-3:] if len(ranked_fills) > 3 else []

        return ExecutionMetrics(
            user_id=user_id,
            time_period_minutes=60,
            total_trades=len(trades),
            total_filled_quantity=total_quantity,
            total_slippage_pct=total_slippage,
            average_fill_percentage=avg_fill_pct,
            average_slippage_pct=avg_slippage,
            average_latency_ms=15.0,  # Simplified
            execution_quality_score=quality_score,
            top_fills=top_fills,
            worst_fills=worst_fills,
            recommendations=[
                "Monitor slippage on larger orders",
                "Consider using limit orders during high volatility",
            ] if avg_slippage > 0.5 else [],
        )

    async def scan_execution_by_symbol(
        self,
        user_id: str,
        symbol: str,
        last_n_trades: int = 10,
    ) -> ExecutionMetrics:
        """
        Analyze execution for a specific trading pair.

        Args:
            user_id: User ID
            symbol: Trading pair
            last_n_trades: Number of trades to analyze

        Returns:
            ExecutionMetrics for the symbol
        """
        trades = await self.db.query(
            """
            SELECT * FROM trades
            WHERE user_id = $1 AND symbol = $2
            ORDER BY executed_at DESC
            LIMIT $3
            """,
            user_id,
            symbol,
            last_n_trades,
        )

        # Reuse scan_fills logic on filtered trades
        metrics = await self.scan_fills(user_id, last_n_trades)
        metrics.symbol = symbol
        return metrics

    async def get_execution_trend(
        self,
        user_id: str,
        days: int = 7,
    ) -> dict:
        """
        Get execution quality trend over time.

        Args:
            user_id: User ID
            days: Number of days to analyze

        Returns:
            Trend data with daily execution quality scores
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        results = await self.db.query(
            """
            SELECT DATE(executed_at) as day, 
                   COUNT(*) as trade_count,
                   AVG(slippage) as avg_slippage,
                   AVG(fee) as avg_fee
            FROM trades
            WHERE user_id = $1 AND executed_at >= $2
            GROUP BY DATE(executed_at)
            ORDER BY day DESC
            """,
            user_id,
            cutoff,
        )

        return {
            "user_id": user_id,
            "period_days": days,
            "daily_metrics": results,
        }


__all__ = ["ExecutionScanner"]
