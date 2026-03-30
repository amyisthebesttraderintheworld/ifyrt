"""Mathematical calculations for scanning metrics."""

from typing import List, Optional
import math
import numpy as np
from numpy.typing import NDArray


def calculate_volatility(
    prices: List[float],
    window: int = 20,
) -> float:
    """
    Calculate rolling volatility (standard deviation of returns).

    Args:
        prices: List of prices
        window: Rolling window size

    Returns:
        Volatility as percentage
    """
    if len(prices) < window:
        return 0.0

    prices_array = np.array(prices)
    returns = np.diff(prices_array) / prices_array[:-1]
    volatility = np.std(returns[-window:])

    return volatility * 100.0


def calculate_slippage(
    requested_price: float,
    actual_price: float,
) -> float:
    """
    Calculate slippage percentage.

    Args:
        requested_price: Expected price
        actual_price: Actual executed price

    Returns:
        Slippage as percentage
    """
    if requested_price == 0:
        return 0.0

    slippage = abs(actual_price - requested_price) / requested_price
    return slippage * 100.0


def calculate_sharpe_ratio(
    returns: List[float],
    risk_free_rate: float = 0.02,
) -> float:
    """
    Calculate Sharpe ratio for a return series.

    Args:
        returns: List of returns (as decimals, e.g., 0.01 for 1%)
        risk_free_rate: Annual risk-free rate (default 2%)

    Returns:
        Sharpe ratio
    """
    if len(returns) < 2:
        return 0.0

    returns_array = np.array(returns)
    excess_returns = returns_array - (risk_free_rate / 252)  # Daily rate
    
    if np.std(excess_returns) == 0:
        return 0.0

    sharpe = np.mean(excess_returns) / np.std(excess_returns)
    return float(sharpe * math.sqrt(252))  # Annualize


def calculate_max_drawdown(
    equity_curve: List[float],
) -> tuple[float, int]:
    """
    Calculate maximum drawdown and duration.

    Args:
        equity_curve: List of equity values over time

    Returns:
        Tuple of (max_drawdown_pct, duration_periods)
    """
    if len(equity_curve) < 2:
        return 0.0, 0

    equity_array = np.array(equity_curve)
    running_max = np.maximum.accumulate(equity_array)
    drawdown = (equity_array - running_max) / running_max * 100

    max_drawdown = np.min(drawdown)
    max_drawdown_idx = np.argmin(drawdown)

    # Find duration (from peak to trough)
    peak_idx = np.argmax(running_max[:max_drawdown_idx])
    duration = max_drawdown_idx - peak_idx

    return float(max_drawdown), int(duration)


def calculate_win_rate(
    pnls: List[float],
) -> float:
    """
    Calculate win rate (percentage of profitable trades).

    Args:
        pnls: List of trade P&L values

    Returns:
        Win rate as percentage
    """
    if len(pnls) == 0:
        return 0.0

    winning = sum(1 for pnl in pnls if pnl > 0)
    return (winning / len(pnls)) * 100.0


def calculate_profit_factor(
    pnls: List[float],
) -> float:
    """
    Calculate profit factor (gross profit / gross loss).

    Args:
        pnls: List of trade P&L values

    Returns:
        Profit factor
    """
    wins = sum(pnl for pnl in pnls if pnl > 0)
    losses = abs(sum(pnl for pnl in pnls if pnl < 0))

    if losses == 0:
        return 0.0 if wins == 0 else float('inf')

    return wins / losses


def calculate_recovery_factor(
    total_profit: float,
    max_drawdown: float,
) -> float:
    """
    Calculate recovery factor (total profit / max drawdown).

    Args:
        total_profit: Total profit amount
        max_drawdown: Maximum drawdown amount

    Returns:
        Recovery factor
    """
    if max_drawdown == 0:
        return 0.0
    return total_profit / max_drawdown


def detect_momentum(
    prices: List[float],
    short_window: int = 10,
    long_window: int = 20,
) -> str:
    """
    Detect price momentum using SMA comparison.

    Args:
        prices: List of prices
        short_window: Short-term SMA period
        long_window: Long-term SMA period

    Returns:
        Momentum direction: 'bullish', 'bearish', or 'neutral'
    """
    if len(prices) < long_window:
        return "neutral"

    prices_array = np.array(prices)
    short_sma = np.mean(prices_array[-short_window:])
    long_sma = np.mean(prices_array[-long_window:])

    if short_sma > long_sma * 1.01:
        return "bullish"
    elif short_sma < long_sma * 0.99:
        return "bearish"
    else:
        return "neutral"


def calculate_concentration_ratio(
    position_sizes: List[float],
) -> float:
    """
    Calculate Herfindahl-Hirschman Index (HHI) for concentration.

    Args:
        position_sizes: List of position sizes

    Returns:
        Concentration ratio (0-1, where 1 is fully concentrated)
    """
    if len(position_sizes) == 0:
        return 0.0

    total_size = sum(position_sizes)
    if total_size == 0:
        return 0.0

    weights = np.array(position_sizes) / total_size
    hhi = np.sum(weights ** 2)

    return float(hhi)


__all__ = [
    "calculate_volatility",
    "calculate_slippage",
    "calculate_sharpe_ratio",
    "calculate_max_drawdown",
    "calculate_win_rate",
    "calculate_profit_factor",
    "calculate_recovery_factor",
    "detect_momentum",
    "calculate_concentration_ratio",
]
