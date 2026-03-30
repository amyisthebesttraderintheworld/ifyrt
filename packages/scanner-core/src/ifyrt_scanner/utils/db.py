"""Supabase database client for scanner access."""

import asyncpg
from typing import Optional, Any, Dict, List
from datetime import datetime
import json


class SupabaseClient:
    """Async Supabase client for scanner queries."""

    def __init__(self, supabase_url: str, service_key: str):
        """Initialize Supabase client."""
        self.supabase_url = supabase_url
        self.service_key = service_key
        self.connection_string = self._build_connection_string()
        self._pool: Optional[asyncpg.Pool] = None

    def _build_connection_string(self) -> str:
        """Build PostgreSQL connection string from Supabase URL."""
        # Extract host and database from Supabase URL
        # Format: https://[project-ref].supabase.co
        project_ref = self.supabase_url.split("://")[1].split(".")[0]
        return (
            f"postgresql://postgres:{self.service_key}@{project_ref}.supabase.co:5432/postgres"
        )

    async def connect(self) -> None:
        """Initialize connection pool."""
        self._pool = await asyncpg.create_pool(
            self.connection_string,
            min_size=5,
            max_size=20,
        )

    async def disconnect(self) -> None:
        """Close connection pool."""
        if self._pool:
            await self._pool.close()

    async def query(
        self, sql: str, *args: Any
    ) -> List[Dict[str, Any]]:
        """Execute a SELECT query."""
        if not self._pool:
            raise RuntimeError("Not connected to database")

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *args)
            return [dict(row) for row in rows]

    async def query_one(
        self, sql: str, *args: Any
    ) -> Optional[Dict[str, Any]]:
        """Execute a query expecting zero or one result."""
        results = await self.query(sql, *args)
        return results[0] if results else None

    async def execute(self, sql: str, *args: Any) -> None:
        """Execute a non-query statement."""
        if not self._pool:
            raise RuntimeError("Not connected to database")

        async with self._pool.acquire() as conn:
            await conn.execute(sql, *args)

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user record."""
        return await self.query_one(
            "SELECT * FROM users WHERE id = $1",
            user_id,
        )

    async def get_trades(
        self,
        user_id: str,
        limit: int = 100,
        is_live: bool = False,
    ) -> List[Dict[str, Any]]:
        """Fetch trades for a user."""
        return await self.query(
            """
            SELECT * FROM trades
            WHERE user_id = $1 AND is_live = $2
            ORDER BY executed_at DESC
            LIMIT $3
            """,
            user_id,
            is_live,
            limit,
        )

    async def get_market_snapshots(
        self,
        exchange: str,
        symbol: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Fetch recent market snapshots."""
        return await self.query(
            """
            SELECT * FROM market_snapshots
            WHERE exchange = $1 AND symbol = $2
            ORDER BY captured_at DESC
            LIMIT $3
            """,
            exchange,
            symbol,
            limit,
        )

    async def get_ohlcv(
        self,
        exchange: str,
        symbol: str,
        interval: str = "1h",
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Fetch OHLCV candles."""
        return await self.query(
            """
            SELECT * FROM ohlcv
            WHERE exchange = $1 AND symbol = $2 AND interval = $3
            ORDER BY open_time DESC
            LIMIT $4
            """,
            exchange,
            symbol,
            interval,
            limit,
        )

    async def get_active_simulation(
        self, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch active simulation for user."""
        return await self.query_one(
            """
            SELECT * FROM simulations
            WHERE user_id = $1 AND status = 'running'
            ORDER BY started_at DESC
            LIMIT 1
            """,
            user_id,
        )

    async def get_live_session(
        self, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch active live session."""
        return await self.query_one(
            """
            SELECT * FROM live_sessions
            WHERE user_id = $1 AND status = 'active'
            ORDER BY started_at DESC
            LIMIT 1
            """,
            user_id,
        )

    async def store_scan_result(
        self,
        scan_type: str,
        user_id: Optional[str],
        data: Dict[str, Any],
    ) -> None:
        """Store scan result in audit or custom table."""
        # Store as JSON in audit_logs for now; can expand to dedicated table
        await self.execute(
            """
            INSERT INTO audit_logs (user_id, event_type, actor, metadata)
            VALUES ($1, $2, $3, $4)
            """,
            user_id,
            f"scanner_{scan_type}",
            "scanner",
            json.dumps(data),
        )


__all__ = ["SupabaseClient"]
