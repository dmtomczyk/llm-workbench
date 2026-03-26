from __future__ import annotations

import asyncio
import contextlib

from app.automations.service import AutomationService
from app.db.session import get_db
from app.providers.service import ProviderService


class AutomationRuntime:
    def __init__(self, plugin_service, interval_seconds: int = 15):
        self.plugin_service = plugin_service
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def _loop(self) -> None:
        while not self._stop.is_set():
            db = next(get_db())
            try:
                service = AutomationService(db, ProviderService(db, self.plugin_service))
                await service.run_due()
            except Exception:
                # Keep the scheduler alive even if one tick fails.
                pass
            finally:
                db.close()
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self.interval_seconds)
            except TimeoutError:
                continue
