"""Risk and portfolio scanning data models."""

from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DrawdownAlert(BaseModel):
    """Drawdown monitoring alert."""

    user_id: str = Field(description="User ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    severity: AlertSeverity = Field(description="Alert severity")
    
    peak_equity: float = Field(description="Peak equity before drawdown")
    current_equity: float = Field(description="Current equity")
    
    drawdown_pct: float = Field(description="Current drawdown percentage")
    drawdown_threshold_pct: float = Field(description="Threshold that triggered alert")
    
    worst_case_pct: Optional[float] = Field(
        default=None, description="Worst-case scenario if all open positions liquidated"
    )
    
    recovery_trades_needed: int = Field(
        description="Estimated trades to break-even"
    )
    
    message: str = Field(description="Human-readable alert message")
    triggered_at: datetime = Field(
        default_factory=datetime.utcnow, description="When alert was first triggered"
    )


class ExposureAnalysis(BaseModel):
    """Portfolio exposure analysis."""

    user_id: str = Field(description="User ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    total_account_value: float = Field(description="Total account equity")
    cash_available: float = Field(description="Available cash")
    
    long_exposure_pct: float = Field(
        description="Percentage of account in long positions"
    )
    short_exposure_pct: float = Field(
        description="Percentage of account in short positions"
    )
    net_exposure_pct: float = Field(
        description="Net long/short exposure percentage"
    )
    
    leverage_ratio: float = Field(description="Effective leverage (if applicable)")
    
    concentrated_symbol_pct: float = Field(
        description="Largest single position as % of account"
    )
    concentration_risk: str = Field(
        description="Risk level: 'low', 'medium', 'high'"
    )


class RiskMetrics(BaseModel):
    """Comprehensive risk metrics."""

    user_id: str = Field(description="User ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    analysis_period_days: int = Field(description="Period analyzed in days")
    
    starting_equity: float = Field(description="Equity at start of period")
    current_equity: float = Field(description="Current equity")
    
    realized_pnl: float = Field(description="Realized profit/loss")
    unrealized_pnl: float = Field(description="Unrealized profit/loss")
    
    max_daily_loss_pct: float = Field(description="Worst single day loss %")
    max_consecutive_losing_days: int = Field(
        description="Longest losing streak in days"
    )
    
    recovery_factor: float = Field(
        description="Profit factor: |win| / |loss| ratio"
    )
    
    win_loss_ratio: float = Field(
        description="Ratio of winning trades to losing trades"
    )
    
    sharpe_ratio: Optional[float] = Field(
        default=None, description="Risk-adjusted return metric"
    )
    
    var_95: Optional[float] = Field(
        default=None, description="Value at Risk (95% confidence)"
    )
    
    alerts: list[DrawdownAlert] = Field(
        default_factory=list, description="Active risk alerts"
    )
    exposure: ExposureAnalysis = Field(description="Current exposure analysis")
    
    overall_risk_score: float = Field(
        description="0-100 risk assessment score (higher = more risky)"
    )


__all__ = [
    "AlertSeverity",
    "DrawdownAlert",
    "ExposureAnalysis",
    "RiskMetrics",
]
