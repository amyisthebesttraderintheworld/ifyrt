"""Market scanning data models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PriceLevelAnalysis(BaseModel):
    """Analysis of a specific price level."""

    price: float = Field(..., description="Price level")
    bid_depth: float = Field(default=0, description="Total bid volume at this level")
    ask_depth: float = Field(default=0, description="Total ask volume at this level")
    imbalance_ratio: float = Field(
        default=1.0, description="Bid/Ask volume ratio (>1 = bullish)"
    )


class OrderBookAnalysis(BaseModel):
    """Order book structure and liquidity analysis."""

    exchange: str = Field(..., description="Exchange name")
    symbol: str = Field(..., description="Trading pair")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    bid_volume_top_5: float = Field(description="Total volume in top 5 bid levels")
    ask_volume_top_5: float = Field(description="Total volume in top 5 ask levels")
    bid_ask_ratio: float = Field(description="Bid/Ask ratio (>1 = more buy pressure)")
    
    spread_bps: float = Field(description="Spread in basis points")
    price_levels: list[PriceLevelAnalysis] = Field(
        default_factory=list, description="Detailed price level analysis"
    )
    
    is_healthy: bool = Field(
        default=True, description="True if liquidity meets minimum thresholds"
    )
    alert_message: Optional[str] = Field(
        default=None, description="Any alert if unhealthy"
    )


class VolatilityScanResult(BaseModel):
    """Market volatility scanning results."""

    exchange: str = Field(..., description="Exchange name")
    symbol: str = Field(..., description="Trading pair")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    window_minutes: int = Field(..., description="Time window analyzed in minutes")
    
    current_price: float = Field(description="Current price")
    high_price: float = Field(description="High price in window")
    low_price: float = Field(description="Low price in window")
    
    volatility_pct: float = Field(..., description="Standard deviation of returns (%)")
    price_change_pct: float = Field(description="Percentage change over window")
    
    intraday_high_low_range: float = Field(description="High-low range (%)")
    
    volatility_regime: str = Field(
        ..., description="Regime classification: 'low', 'normal', 'high', 'extreme'"
    )
    
    volume_sma_ratio: float = Field(
        description="Current volume / 20-period SMA ratio"
    )
    is_breakout_candidate: bool = Field(
        default=False, description="True if price is near resistance/support"
    )


__all__ = [
    "PriceLevelAnalysis",
    "OrderBookAnalysis",
    "VolatilityScanResult",
]
