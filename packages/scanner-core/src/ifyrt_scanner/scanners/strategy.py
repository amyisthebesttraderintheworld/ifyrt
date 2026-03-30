"""Strategy analysis and validation."""

from datetime import datetime, timedelta
from typing import Optional

from ifyrt_scanner.models.strategy import (
    StrategyAnalysis,
    BacktestValidation,
    SignalQuality,
)
from ifyrt_scanner.utils.db import SupabaseClient
from ifyrt_scanner.utils.calculations import (
    calculate_sharpe_ratio,
    calculate_max_drawdown,
    calculate_profit_factor,
    calculate_win_rate,
)


class StrategyScanner:
    """Analyzes strategy performance and fitness."""

    def __init__(self, db: SupabaseClient):
        """Initialize strategy scanner with database connection."""
        self.db = db

    async def analyze_strategy(
        self,
        user_id: str,
        strategy_name: str,
    ) -> StrategyAnalysis:
        """
        Analyze strategy performance and generate fitness score.

        Args:
            user_id: User ID
            strategy_name: Strategy identifier

        Returns:
            StrategyAnalysis with comprehensive metrics
        """
        # Get active simulation/session if running
        active_sim = await self.db.get_active_simulation(user_id)
        active_live = await self.db.get_live_session(user_id)

        current_symbol = None
        current_status = "inactive"

        if active_sim and active_sim["strategy"] == strategy_name:
            current_symbol = active_sim["symbol"]
            current_status = active_sim["status"]

        if active_live and active_live["strategy"] == strategy_name:
            current_symbol = active_live["symbol"]
            current_status = "active"

        # Get recent trades for the strategy
        trades = await self.db.query(
            """
            SELECT * FROM trades
            WHERE user_id = $1 AND strategy = $2
            ORDER BY executed_at DESC
            LIMIT 100
            """,
            user_id,
            strategy_name,
        )

        # Signal quality analysis
        signal_quality = await self._analyze_signal_quality(trades)

        # Fitness score calculation
        fitness_score = self._calculate_fitness_score(
            signal_quality=signal_quality,
            trade_count=len(trades),
        )

        # Backtest validation
        backtest = await self._get_recent_backtest(user_id, strategy_name)

        # Risk assessment
        if fitness_score > 75:
            risk = "conservative"
        elif fitness_score > 50:
            risk = "moderate"
        else:
            risk = "aggressive"

        return StrategyAnalysis(
            user_id=user_id,
            strategy_name=strategy_name,
            timestamp=datetime.utcnow(),
            current_live_symbol=current_symbol if current_status == "active" else None,
            current_status=current_status,
            signal_quality=signal_quality,
            recent_backtest=backtest,
            live_performance=None,  # TODO: if running
            backtest_vs_live_divergence_pct=None,
            optimization_suggestions=self._generate_suggestions(signal_quality, backtest),
            risk_assessment=risk,
            fitness_score=fitness_score,
        )

    async def validate_backtest(
        self,
        simulation_id: str,
    ) -> Optional[BacktestValidation]:
        """
        Validate a backtest result.

        Args:
            simulation_id: Simulation ID

        Returns:
            BacktestValidation with validation status
        """
        sim = await self.db.query_one(
            """
            SELECT * FROM simulations WHERE id = $1 AND type = 'backtest'
            """,
            simulation_id,
        )

        if not sim:
            return None

        result = sim.get("result", {})
        metrics = result.get("metrics", {})

        # Extract key metrics
        total_trades = metrics.get("total_trades", 0)
        win_rate = metrics.get("win_rate", 0) * 100
        total_return = metrics.get("realized_pnl", 0)
        max_dd = metrics.get("max_drawdown_pct", 0)

        # Validation checks
        warnings = []
        if total_trades < 5:
            warnings.append("Too few trades for reliable backtest")
        if win_rate < 30:
            warnings.append("Win rate below 30% threshold")
        if max_dd > 30:
            warnings.append("Drawdown exceeds 30%")

        profit_factor = (
            metrics.get("realized_pnl", 0) / abs(metrics.get("realized_pnl", 1))
            if metrics.get("realized_pnl", 0) != 0
            else 0
        )

        is_valid = len(warnings) == 0 and total_trades >= 5 and win_rate > 30

        return BacktestValidation(
            strategy_name=sim.get("strategy", "unknown"),
            symbol=sim.get("symbol", "unknown"),
            backtest_start=sim.get("from_date") or datetime.utcnow(),
            backtest_end=sim.get("to_date") or datetime.utcnow(),
            total_trades=total_trades,
            winning_trades=int(total_trades * (win_rate / 100)),
            win_rate_pct=win_rate,
            profit_factor=profit_factor,
            total_return_pct=total_return,
            max_drawdown_pct=max_dd,
            is_valid=is_valid,
            validation_warnings=warnings,
        )

    async def _analyze_signal_quality(
        self,
        trades: list,
    ) -> SignalQuality:
        """Analyze quality of signals that generated trades."""
        if not trades:
            return SignalQuality(
                total_signals=0,
                buy_signals=0,
                sell_signals=0,
                hold_signals=0,
                signal_frequency=0.0,
                false_signal_rate=0.0,
                signal_quality_score=0.0,
            )

        buys = sum(1 for t in trades if t["side"] == "buy")
        sells = sum(1 for t in trades if t["side"] == "sell")
        
        # Calculate false signal rate (trades with losses)
        losing_trades = sum(1 for t in trades if float(t.get("pnl", 0)) < 0)
        false_signal_rate = (losing_trades / len(trades) * 100) if trades else 0.0

        # Quality score: 100 - false_rate
        quality_score = max(0, 100 - false_signal_rate)

        return SignalQuality(
            total_signals=len(trades),
            buy_signals=buys,
            sell_signals=sells,
            hold_signals=0,
            signal_frequency=(len(trades) / 7) if trades else 0.0,  # Per week
            false_signal_rate=false_signal_rate,
            signal_quality_score=quality_score,
        )

    async def _get_recent_backtest(
        self,
        user_id: str,
        strategy_name: str,
    ) -> Optional[BacktestValidation]:
        """Fetch and validate most recent backtest."""
        sim = await self.db.query_one(
            """
            SELECT * FROM simulations
            WHERE user_id = $1 AND strategy = $2 AND type = 'backtest'
            ORDER BY created_at DESC
            LIMIT 1
            """,
            user_id,
            strategy_name,
        )

        if sim:
            return await self.validate_backtest(sim["id"])
        return None

    def _calculate_fitness_score(
        self,
        signal_quality: SignalQuality,
        trade_count: int,
    ) -> float:
        """Calculate overall strategy fitness score."""
        # Base score from signal quality
        score = signal_quality.signal_quality_score

        # Adjust for trade volume
        if trade_count < 5:
            score *= 0.5  # Penalize low activity
        elif trade_count > 50:
            score *= 0.9  # Slight penalty for overtrading

        return max(0, min(100, score))

    def _generate_suggestions(
        self,
        signal_quality: SignalQuality,
        backtest: Optional[BacktestValidation],
    ) -> list[str]:
        """Generate optimization suggestions."""
        suggestions = []

        if signal_quality.false_signal_rate > 50:
            suggestions.append("Consider tightening entry/exit criteria")
            suggestions.append("Add additional confirmation indicators")

        if signal_quality.signal_frequency < 0.5:
            suggestions.append("Strategy generates few signals; consider broadening conditions")

        if backtest and backtest.max_drawdown_pct > 20:
            suggestions.append("Implement stronger risk management")

        if backtest and backtest.profit_factor < 1.5:
            suggestions.append("Improve win rate or average win size")

        return suggestions


__all__ = ["StrategyScanner"]
