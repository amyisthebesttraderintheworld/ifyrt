"""Risk and portfolio scanning."""

from datetime import datetime, timedelta
from typing import Optional
import numpy as np

from ifyrt_scanner.models.risk import (
    DrawdownAlert,
    ExposureAnalysis,
    RiskMetrics,
    AlertSeverity,
)
from ifyrt_scanner.utils.db import SupabaseClient
from ifyrt_scanner.utils.calculations import (
    calculate_max_drawdown,
    calculate_win_rate,
    calculate_profit_factor,
    calculate_sharpe_ratio,
)


class RiskScanner:
    """Monitors portfolio risk, drawdowns, and exposure."""

    def __init__(self, db: SupabaseClient):
        """Initialize risk scanner with database connection."""
        self.db = db

    async def check_drawdown(
        self,
        user_id: str,
        threshold_pct: float = 10.0,
    ) -> Optional[DrawdownAlert]:
        """
        Check for drawdown exceeding threshold.

        Args:
            user_id: User ID
            threshold_pct: Alert threshold in percentage

        Returns:
            DrawdownAlert if threshold exceeded, None otherwise
        """
        user = await self.db.get_user(user_id)
        if not user:
            return None

        # Get trades to calculate equity curve
        trades = await self.db.get_trades(user_id, limit=500, is_live=False)

        if not trades:
            return None

        # Reconstruct equity curve
        equity_curve = [10000.0]  # Starting cash (simplified)
        for trade in reversed(trades):  # Iterate chronologically
            pnl = float(trade.get("pnl", 0))
            equity_curve.append(equity_curve[-1] + pnl)

        max_dd, duration = calculate_max_drawdown(equity_curve)

        if max_dd <= -threshold_pct:
            peak_equity = equity_curve[0]
            current_equity = equity_curve[-1]
            severity = AlertSeverity.CRITICAL if max_dd < -20 else AlertSeverity.WARNING

            return DrawdownAlert(
                user_id=user_id,
                severity=severity,
                peak_equity=peak_equity,
                current_equity=current_equity,
                drawdown_pct=abs(max_dd),
                drawdown_threshold_pct=threshold_pct,
                worst_case_pct=abs(max_dd) + 5,  # Conservative estimate
                recovery_trades_needed=max(5, int(abs(max_dd) / 2)),
                message=f"Portfolio down {abs(max_dd):.2f}% from peak. Recovery would need ~{max(5, int(abs(max_dd) / 2))} winning trades.",
            )

        return None

    async def analyze_exposure(
        self,
        user_id: str,
    ) -> ExposureAnalysis:
        """
        Analyze current portfolio exposure and concentration.

        Args:
            user_id: User ID

        Returns:
            ExposureAnalysis with position breakdown
        """
        # Get active live session
        live_session = await self.db.get_live_session(user_id)

        if not live_session:
            # No live trading active
            return ExposureAnalysis(
                user_id=user_id,
                total_account_value=0.0,
                cash_available=0.0,
                long_exposure_pct=0.0,
                short_exposure_pct=0.0,
                net_exposure_pct=0.0,
                leverage_ratio=0.0,
                concentrated_symbol_pct=0.0,
                concentration_risk="low",
            )

        # Get open positions
        user = await self.db.get_user(user_id)
        if not user:
            return ExposureAnalysis(user_id=user_id)

        # Simplified: assume single live session
        long_exposure = 50.0 if live_session["symbol"] else 0.0  # Simplified

        return ExposureAnalysis(
            user_id=user_id,
            total_account_value=10000.0,  # TODO: fetch real account value
            cash_available=5000.0,
            long_exposure_pct=long_exposure,
            short_exposure_pct=0.0,
            net_exposure_pct=long_exposure,
            leverage_ratio=1.0,
            concentrated_symbol_pct=100.0 if long_exposure > 0 else 0.0,
            concentration_risk="high" if long_exposure > 50 else "low",
        )

    async def scan_risk_metrics(
        self,
        user_id: str,
        analysis_period_days: int = 30,
    ) -> RiskMetrics:
        """
        Compute comprehensive risk metrics over a period.

        Args:
            user_id: User ID
            analysis_period_days: Days to analyze

        Returns:
            RiskMetrics with full risk assessment
        """
        cutoff = datetime.utcnow() - timedelta(days=analysis_period_days)

        trades = await self.db.query(
            """
            SELECT * FROM trades
            WHERE user_id = $1 AND is_live = false AND executed_at >= $2
            ORDER BY executed_at ASC
            """,
            user_id,
            cutoff,
        )

        if not trades:
            return RiskMetrics(
                user_id=user_id,
                analysis_period_days=analysis_period_days,
                starting_equity=10000.0,
                current_equity=10000.0,
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                max_daily_loss_pct=0.0,
                max_consecutive_losing_days=0,
                recovery_factor=0.0,
                win_loss_ratio=0.0,
                overall_risk_score=0.0,
                exposure=ExposureAnalysis(user_id=user_id),
            )

        pnls = [float(t.get("pnl", 0)) for t in trades]
        total_pnl = sum(pnls)
        realized_pnl = sum(p for p in pnls if p > 0)

        # Reconstruction
        equity_curve = [10000.0]
        for pnl in pnls:
            equity_curve.append(equity_curve[-1] + pnl)

        max_dd, dd_duration = calculate_max_drawdown(equity_curve)
        win_rate = calculate_win_rate(pnls)
        profit_factor = calculate_profit_factor(pnls)

        # Calculate Sharpe
        returns = [p / eq for p, eq in zip(pnls[:-1], equity_curve[:-1])]
        sharpe = calculate_sharpe_ratio(returns) if returns else 0.0

        # Alerts
        drawdown_alert = await self.check_drawdown(user_id, threshold_pct=15.0)
        alerts = [drawdown_alert] if drawdown_alert else []

        # Risk score (0-100, higher = riskier)
        risk_score = max(
            0,
            min(
                100,
                (abs(max_dd) * 2) +
                ((100 - win_rate) / 2) +
                (5 if profit_factor < 1 else 0),
            ),
        )

        return RiskMetrics(
            user_id=user_id,
            timestamp=datetime.utcnow(),
            analysis_period_days=analysis_period_days,
            starting_equity=equity_curve[0],
            current_equity=equity_curve[-1],
            realized_pnl=realized_pnl,
            unrealized_pnl=0.0,  # TODO: fetch open positions
            max_daily_loss_pct=abs(max_dd),
            max_consecutive_losing_days=dd_duration,
            recovery_factor=(
                total_pnl / (abs(max_dd) * equity_curve[0] / 100)
                if max_dd != 0
                else 0.0
            ),
            win_loss_ratio=win_rate / (100 - win_rate) if win_rate < 100 else 0.0,
            sharpe_ratio=sharpe,
            alerts=alerts,
            exposure=await self.analyze_exposure(user_id),
            overall_risk_score=risk_score,
        )


__all__ = ["RiskScanner"]
