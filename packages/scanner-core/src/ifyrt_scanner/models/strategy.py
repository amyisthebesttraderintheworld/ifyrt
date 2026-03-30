"""Strategy analysis and backtesting data models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SignalQuality(BaseModel):
    """Analysis of strategy signal quality."""

    total_signals: int = Field(description="Total signals generated")
    
    buy_signals: int = Field(description="Number of buy signals")
    sell_signals: int = Field(description="Number of sell signals")
    hold_signals: int = Field(description="Number of hold signals")
    
    signal_frequency: float = Field(
        description="Average signals per day"
    )
    
    false_signal_rate: float = Field(
        description="Percentage of signals that resulted in losses"
    )
    
    signal_quality_score: float = Field(
        description="0-100 score indicating signal reliability"
    )


class BacktestValidation(BaseModel):
    """Backtest results and validation."""

    strategy_name: str = Field(description="Strategy identifier")
    symbol: str = Field(description="Trading pair tested")
    
    backtest_start: datetime = Field(description="Backtest period start")
    backtest_end: datetime = Field(description="Backtest period end")
    
    total_trades: int = Field(description="Trades executed in backtest")
    winning_trades: int = Field(description="Number of profitable trades")
    
    win_rate_pct: float = Field(description="Win rate percentage")
    profit_factor: float = Field(description="Gross profit / Gross loss")
    
    total_return_pct: float = Field(description="Total return on backtest")
    max_drawdown_pct: float = Field(description="Maximum drawdown during backtest")
    
    sharpe_ratio: Optional[float] = Field(default=None, description="Risk-adjusted return")
    
    is_valid: bool = Field(
        description="True if backtest passes validation checks"
    )
    validation_warnings: list[str] = Field(
        default_factory=list, description="Warnings about data or methodology"
    )


class StrategyAnalysis(BaseModel):
    """Comprehensive strategy analysis."""

    user_id: str = Field(description="User ID")
    strategy_name: str = Field(description="Strategy identifier")
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    current_live_symbol: Optional[str] = Field(
        default=None, description="Current live trading symbol if active"
    )
    
    current_status: str = Field(
        description="'active', 'inactive', 'paused', 'error'"
    )
    
    signal_quality: SignalQuality = Field(description="Signal quality metrics")
    
    recent_backtest: Optional[BacktestValidation] = Field(
        default=None, description="Most recent backtest results"
    )
    
    live_performance: Optional[dict] = Field(
        default=None, description="Live trading performance metrics if running"
    )
    
    backtest_vs_live_divergence_pct: Optional[float] = Field(
        default=None, description="Percentage divergence between backtest and live performance"
    )
    
    optimization_suggestions: list[str] = Field(
        default_factory=list, description="Recommendations for strategy improvement"
    )
    
    risk_assessment: str = Field(
        description="Overall risk level: 'conservative', 'moderate', 'aggressive'"
    )
    
    fitness_score: float = Field(
        description="0-100 overall strategy fitness score"
    )


__all__ = [
    "SignalQuality",
    "BacktestValidation",
    "StrategyAnalysis",
]
