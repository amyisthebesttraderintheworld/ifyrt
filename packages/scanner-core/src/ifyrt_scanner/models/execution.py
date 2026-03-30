"""Trade execution monitoring data models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LatencyMetrics(BaseModel):
    """Order submission latency metrics."""

    order_creation_to_submission_ms: float = Field(
        description="Time from order creation to submission"
    )
    submission_to_fill_ms: float = Field(description="Time from submission to fill")
    total_latency_ms: float = Field(description="Total latency from creation to fill")
    
    is_within_acceptable_range: bool = Field(
        description="True if latency is below threshold"
    )


class FillAnalysis(BaseModel):
    """Individual fill analysis."""

    trade_id: str = Field(description="Trade ID")
    side: str = Field(description="'buy' or 'sell'")
    
    requested_quantity: float = Field(description="Requested quantity")
    filled_quantity: float = Field(description="Actual filled quantity")
    fill_percentage: float = Field(description="Fill % of requested")
    
    requested_price: Optional[float] = Field(
        default=None, description="Requested price (for limit orders)"
    )
    fill_price: float = Field(description="Actual fill price")
    best_available_price: float = Field(
        description="Best available price at submission time"
    )
    
    slippage_ticks: float = Field(description="Slippage in price ticks")
    slippage_pct: float = Field(description="Slippage as percentage")
    
    fee_paid: float = Field(description="Fee charged")
    fee_pct: float = Field(description="Fee as percentage of fill value")
    
    latency: LatencyMetrics = Field(description="Latency metrics")
    
    execution_quality_score: float = Field(
        description="0-100 score; higher is better (accounts for fill %, slippage, latency)"
    )


class ExecutionMetrics(BaseModel):
    """Aggregated execution metrics."""

    user_id: str = Field(description="User ID")
    symbol: Optional[str] = Field(default=None, description="Trading pair filter")
    
    time_period_minutes: int = Field(description="Analysis window in minutes")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    total_trades: int = Field(description="Number of trades analyzed")
    total_filled_quantity: float = Field(description="Total quantity filled")
    total_slippage_pct: float = Field(description="Total slippage %")
    
    average_fill_percentage: float = Field(
        description="Avg fill % across trades"
    )
    average_slippage_pct: float = Field(description="Avg slippage %")
    average_latency_ms: float = Field(description="Avg order latency ms")
    
    execution_quality_score: float = Field(
        description="0-100 overall execution quality"
    )
    
    top_fills: list[FillAnalysis] = Field(
        default_factory=list, description="Best execution fills"
    )
    worst_fills: list[FillAnalysis] = Field(
        default_factory=list, description="Worst execution fills"
    )
    
    recommendations: list[str] = Field(
        default_factory=list, description="Improvement suggestions"
    )


__all__ = [
    "LatencyMetrics",
    "FillAnalysis",
    "ExecutionMetrics",
]
