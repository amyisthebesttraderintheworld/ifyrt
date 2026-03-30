"""Alert management and notification."""

from typing import Optional, Callable, Any
from datetime import datetime
from enum import Enum


class AlertChannel(str, Enum):
    """Alert delivery channels."""

    TELEGRAM = "telegram"
    EMAIL = "email"
    WEBHOOK = "webhook"
    LOG = "log"


class AlertManager:
    """Manages alert creation and delivery."""

    def __init__(self):
        """Initialize alert manager."""
        self.handlers: dict[AlertChannel, Callable] = {}
        self.alert_history: list[dict] = []

    def register_handler(
        self,
        channel: AlertChannel,
        handler: Callable[[dict], Any],
    ) -> None:
        """Register a handler for an alert channel."""
        self.handlers[channel] = handler

    async def send_alert(
        self,
        message: str,
        severity: str,
        user_id: Optional[str] = None,
        channels: Optional[list[AlertChannel]] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        """Send an alert through registered channels."""
        if channels is None:
            channels = [AlertChannel.TELEGRAM, AlertChannel.LOG]

        alert = {
            "message": message,
            "severity": severity,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        }

        self.alert_history.append(alert)

        for channel in channels:
            handler = self.handlers.get(channel)
            if handler:
                try:
                    await handler(alert) if hasattr(handler, "__await__") else handler(alert)
                except Exception as e:
                    # Log failed handler but continue
                    print(f"Alert handler failed for {channel}: {e}")

    async def send_drawdown_alert(
        self,
        user_id: str,
        drawdown_pct: float,
        current_equity: float,
        peak_equity: float,
    ) -> None:
        """Send a drawdown alert."""
        message = (
            f"⚠️ Drawdown Alert: Your account is down {drawdown_pct:.2f}% "
            f"from peak (${peak_equity:.2f} → ${current_equity:.2f})"
        )
        await self.send_alert(
            message=message,
            severity="warning" if drawdown_pct < 20 else "critical",
            user_id=user_id,
            metadata={
                "alert_type": "drawdown",
                "drawdown_pct": drawdown_pct,
                "current_equity": current_equity,
                "peak_equity": peak_equity,
            },
        )

    async def send_execution_alert(
        self,
        user_id: str,
        symbol: str,
        fill_percentage: float,
        slippage_pct: float,
    ) -> None:
        """Send a trade execution alert."""
        if fill_percentage < 0.8:
            message = (
                f"⚠️ Execution Issue on {symbol}: "
                f"Only {fill_percentage*100:.1f}% filled, slippage {slippage_pct:.2f}%"
            )
            severity = "critical" if fill_percentage < 0.5 else "warning"
        else:
            message = (
                f"✓ Trade executed on {symbol}: "
                f"{fill_percentage*100:.1f}% filled, slippage {slippage_pct:.2f}%"
            )
            severity = "info"

        await self.send_alert(
            message=message,
            severity=severity,
            user_id=user_id,
            metadata={
                "alert_type": "execution",
                "symbol": symbol,
                "fill_percentage": fill_percentage,
                "slippage_pct": slippage_pct,
            },
        )

    async def send_volatility_alert(
        self,
        symbol: str,
        volatility_regime: str,
        volatility_pct: float,
    ) -> None:
        """Send a market volatility alert."""
        message = (
            f"📊 Market Alert: {symbol} entering {volatility_regime} volatility regime "
            f"({volatility_pct:.2f}%)"
        )
        await self.send_alert(
            message=message,
            severity="info",
            metadata={
                "alert_type": "volatility",
                "symbol": symbol,
                "regime": volatility_regime,
                "volatility_pct": volatility_pct,
            },
        )

    def get_recent_alerts(
        self,
        user_id: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        """Get recent alerts, optionally filtered by user."""
        alerts = self.alert_history
        if user_id:
            alerts = [a for a in alerts if a.get("user_id") == user_id]
        return alerts[-limit:]


__all__ = ["AlertChannel", "AlertManager"]
