"""Unit tests for scanner components."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from ifyrt_scanner.utils.calculations import (
    calculate_volatility,
    calculate_slippage,
    calculate_sharpe_ratio,
    calculate_max_drawdown,
    calculate_win_rate,
    detect_momentum,
)


class TestCalculations:
    """Test mathematical calculations."""

    def test_calculate_volatility(self):
        """Test volatility calculation."""
        prices = [100.0, 101.0, 99.0, 102.0, 100.5, 101.5, 99.5, 102.5]
        vol = calculate_volatility(prices)
        assert vol > 0
        assert vol < 10  # Reasonable range

    def test_calculate_slippage(self):
        """Test slippage calculation."""
        slippage = calculate_slippage(100.0, 101.0)
        assert slippage == pytest.approx(1.0, rel=0.01)

        slippage = calculate_slippage(100.0, 99.0)
        assert slippage == pytest.approx(1.0, rel=0.01)

    def test_calculate_sharpe_ratio(self):
        """Test Sharpe ratio calculation."""
        returns = [0.01, 0.02, -0.01, 0.03, 0.01]
        sharpe = calculate_sharpe_ratio(returns)
        assert isinstance(sharpe, float)

    def test_calculate_max_drawdown(self):
        """Test max drawdown calculation."""
        equity = [10000, 10500, 10200, 9500, 9800, 10300]
        max_dd, duration = calculate_max_drawdown(equity)
        assert max_dd <= 0
        assert duration > 0

    def test_calculate_win_rate(self):
        """Test win rate calculation."""
        pnls = [100, -50, 200, -30, 150, 100]
        win_rate = calculate_win_rate(pnls)
        assert 0 <= win_rate <= 100
        assert win_rate == pytest.approx(66.67, rel=0.01)

    def test_detect_momentum(self):
        """Test momentum detection."""
        bullish_prices = [100, 101, 102, 103, 104, 105]
        momentum = detect_momentum(bullish_prices)
        assert momentum == "bullish"

        bearish_prices = [105, 104, 103, 102, 101, 100]
        momentum = detect_momentum(bearish_prices)
        assert momentum == "bearish"

        neutral_prices = [100, 100.5, 100, 100.5, 100, 100.5]
        momentum = detect_momentum(neutral_prices)
        assert momentum == "neutral"


class TestMarketScanner:
    """Test market scanning functionality."""

    @pytest.mark.asyncio
    async def test_scan_volatility(self):
        """Test volatility scanning."""
        # Mock database
        mock_db = AsyncMock()
        mock_db.query.return_value = [
            {"timestamp": "2024-01-01T10:00:00", "last": 100.0, "bid": 99.9, "ask": 100.1},
            {"timestamp": "2024-01-01T10:05:00", "last": 101.0, "bid": 100.9, "ask": 101.1},
            {"timestamp": "2024-01-01T10:10:00", "last": 99.5, "bid": 99.4, "ask": 99.6},
        ]

        from ifyrt_scanner.scanners.market import MarketScanner

        scanner = MarketScanner(mock_db)
        result = await scanner.scan_volatility("binance", "BTC/USDT", 60)

        assert result.exchange == "binance"
        assert result.symbol == "BTC/USDT"
        assert result.volatility_pct >= 0


class TestAlertManager:
    """Test alert management."""

    @pytest.mark.asyncio
    async def test_send_alert(self):
        """Test alert sending."""
        from ifyrt_scanner.utils.alerts import AlertManager, AlertChannel

        manager = AlertManager()
        received_alerts = []

        async def test_handler(alert):
            received_alerts.append(alert)

        manager.register_handler(AlertChannel.LOG, test_handler)

        await manager.send_alert(
            message="Test alert",
            severity="info",
            user_id="user123",
        )

        assert len(received_alerts) == 1
        assert received_alerts[0]["message"] == "Test alert"
        assert received_alerts[0]["user_id"] == "user123"
