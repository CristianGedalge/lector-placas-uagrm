from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


class StorageError(RuntimeError):
    """Sanitized provider-neutral storage failure."""


class StorageConfigurationError(StorageError):
    pass


@dataclass(frozen=True)
class StorageUploadResult:
    asset_id: str
    public_id: str
    resource_type: str
    delivery_type: str
    format: str
    width: int
    height: int
    bytes: int


@dataclass(frozen=True)
class TemporaryUrl:
    url: str
    expires_at: datetime


class StorageService(ABC):
    @abstractmethod
    def upload(self, content: bytes, media_type: str) -> StorageUploadResult: ...

    @abstractmethod
    def delete(self, public_id: str) -> bool: ...

    @abstractmethod
    def replace(
        self, old_public_id: str | None, content: bytes, media_type: str
    ) -> StorageUploadResult: ...

    @abstractmethod
    def exists(self, public_id: str) -> bool: ...

    @abstractmethod
    def get_temporary_url(self, public_id: str, fmt: str) -> TemporaryUrl: ...
