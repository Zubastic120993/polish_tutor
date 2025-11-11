"""Audio cache manager with hash-based deduplication."""
import hashlib
import logging
import os
from pathlib import Path
from typing import Dict, Optional, Any, Set
import json
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class AudioCacheManager:
    """Manages audio file caching with hash-based deduplication."""

    def __init__(
        self,
        cache_dir: Optional[str] = None,
        max_age_days: int = 30,
        cleanup_interval_hours: int = 24,
    ):
        """Initialize audio cache manager.

        Args:
            cache_dir: Directory for cached audio files
            max_age_days: Maximum age of cache entries in days
            cleanup_interval_hours: Hours between cleanup runs
        """
        self.cache_dir = Path(cache_dir or "./audio_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.max_age_days = max_age_days
        self.cleanup_interval_hours = cleanup_interval_hours

        # Metadata file for tracking cache entries
        self.metadata_file = self.cache_dir / "cache_metadata.json"

        # Load existing metadata
        self.metadata = self._load_metadata()

        # Track last cleanup time
        self.last_cleanup = self.metadata.get("last_cleanup", 0)

    def generate_cache_key(
        self,
        text: str,
        voice_id: str,
        provider: str = "murf",
        speed: float = 1.0,
        language: str = "pl",
        **kwargs
    ) -> str:
        """Generate a unique cache key for audio content.

        Args:
            text: Text content
            voice_id: Voice identifier
            provider: TTS provider (murf, openai, etc.)
            speed: Playback speed
            language: Language code
            **kwargs: Additional parameters that affect audio

        Returns:
            MD5 hash string as cache key
        """
        # Create a deterministic string from all parameters
        key_components = [
            text.strip().lower(),  # Normalize text
            voice_id,
            provider.lower(),
            f"{speed:.2f}",  # Normalize speed to 2 decimal places
            language.lower(),
        ]

        # Add any additional parameters that affect output
        for k, v in sorted(kwargs.items()):
            if k not in ["timestamp", "request_id"]:  # Exclude non-deterministic params
                key_components.append(f"{k}:{v}")

        key_string = "|".join(key_components)
        return hashlib.md5(key_string.encode("utf-8")).hexdigest()

    def get_cache_path(self, cache_key: str, extension: str = "mp3") -> Path:
        """Get the file path for a cache key.

        Args:
            cache_key: Cache key
            extension: File extension

        Returns:
            Path to the cached file
        """
        # Use first 2 chars of hash as subdirectory for better filesystem performance
        subdir = cache_key[:2]
        cache_subdir = self.cache_dir / subdir
        cache_subdir.mkdir(exist_ok=True)

        return cache_subdir / f"{cache_key}.{extension}"

    def is_cached(self, cache_key: str, extension: str = "mp3") -> bool:
        """Check if audio is cached.

        Args:
            cache_key: Cache key
            extension: File extension

        Returns:
            True if cached file exists
        """
        cache_path = self.get_cache_path(cache_key, extension)
        return cache_path.exists() and cache_path.stat().st_size > 0

    def store_audio(
        self,
        audio_data: bytes,
        cache_key: str,
        extension: str = "mp3",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Path:
        """Store audio data in cache.

        Args:
            audio_data: Raw audio bytes
            cache_key: Cache key
            extension: File extension
            metadata: Additional metadata to store

        Returns:
            Path to the stored file
        """
        cache_path = self.get_cache_path(cache_key, extension)

        # Write audio data
        with open(cache_path, "wb") as f:
            f.write(audio_data)

        # Update metadata
        entry = {
            "cache_key": cache_key,
            "path": str(cache_path.relative_to(self.cache_dir)),
            "extension": extension,
            "size": len(audio_data),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "last_accessed": datetime.utcnow().isoformat() + "Z",
            **(metadata or {})
        }

        self.metadata["entries"][cache_key] = entry
        self._save_metadata()

        logger.info(f"Stored audio in cache: {cache_path} ({len(audio_data)} bytes)")
        return cache_path

    def get_audio(
        self,
        cache_key: str,
        extension: str = "mp3",
        update_access_time: bool = True
    ) -> Optional[Path]:
        """Retrieve cached audio file.

        Args:
            cache_key: Cache key
            extension: File extension
            update_access_time: Whether to update last accessed time

        Returns:
            Path to cached file or None if not found
        """
        cache_path = self.get_cache_path(cache_key, extension)

        if not cache_path.exists():
            return None

        if update_access_time:
            # Update last accessed time
            if cache_key in self.metadata["entries"]:
                self.metadata["entries"][cache_key]["last_accessed"] = datetime.utcnow().isoformat() + "Z"
                self._save_metadata()

        return cache_path

    def get_audio_url(self, cache_key: str, extension: str = "mp3") -> Optional[str]:
        """Get the URL path for cached audio.

        Args:
            cache_key: Cache key
            extension: File extension

        Returns:
            URL path or None if not cached
        """
        if not self.is_cached(cache_key, extension):
            return None

        # Return relative path from audio_cache directory
        cache_path = self.get_cache_path(cache_key, extension)
        return f"/audio_cache/{cache_path.relative_to(self.cache_dir)}"

    def cleanup_expired_entries(self) -> int:
        """Remove expired cache entries.

        Returns:
            Number of files removed
        """
        now = datetime.utcnow()
        max_age = timedelta(days=self.max_age_days)
        removed_count = 0

        entries_to_remove = []

        for cache_key, entry in self.metadata["entries"].items():
            created_at = datetime.fromisoformat(entry["created_at"].replace("Z", "+00:00"))
            if now - created_at > max_age:
                # Remove file
                cache_path = self.cache_dir / entry["path"]
                if cache_path.exists():
                    cache_path.unlink()
                    removed_count += 1

                entries_to_remove.append(cache_key)

        # Remove metadata entries
        for cache_key in entries_to_remove:
            del self.metadata["entries"][cache_key]

        if removed_count > 0:
            self.metadata["last_cleanup"] = time.time()
            self._save_metadata()
            logger.info(f"Cleaned up {removed_count} expired cache entries")

        return removed_count

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        total_size = 0
        total_files = 0
        oldest_entry = None
        newest_entry = None

        for entry in self.metadata["entries"].values():
            total_size += entry.get("size", 0)
            total_files += 1

            created_at = entry.get("created_at")
            if created_at:
                created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if oldest_entry is None or created_dt < oldest_entry:
                    oldest_entry = created_dt
                if newest_entry is None or created_dt > newest_entry:
                    newest_entry = created_dt

        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "oldest_entry": oldest_entry.isoformat() + "Z" if oldest_entry else None,
            "newest_entry": newest_entry.isoformat() + "Z" if newest_entry else None,
            "max_age_days": self.max_age_days,
            "last_cleanup": self.metadata.get("last_cleanup"),
        }

    def clear_cache(self, confirm: bool = False) -> int:
        """Clear all cached files.

        Args:
            confirm: Must be True to actually clear cache

        Returns:
            Number of files removed
        """
        if not confirm:
            logger.warning("Cache clear requested but not confirmed")
            return 0

        removed_count = 0

        # Remove all files
        for entry in self.metadata["entries"].values():
            cache_path = self.cache_dir / entry["path"]
            if cache_path.exists():
                cache_path.unlink()
                removed_count += 1

        # Clear metadata
        self.metadata["entries"] = {}
        self.metadata["last_cleanup"] = time.time()
        self._save_metadata()

        logger.info(f"Cleared {removed_count} files from cache")
        return removed_count

    def _load_metadata(self) -> Dict[str, Any]:
        """Load cache metadata from file."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache metadata: {e}")

        # Return default metadata structure
        return {
            "entries": {},
            "last_cleanup": 0,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

    def _save_metadata(self):
        """Save cache metadata to file."""
        try:
            with open(self.metadata_file, "w") as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache metadata: {e}")

    def auto_cleanup(self):
        """Perform automatic cleanup if needed."""
        current_time = time.time()
        cleanup_interval_seconds = self.cleanup_interval_hours * 3600

        if current_time - self.last_cleanup > cleanup_interval_seconds:
            logger.info("Running automatic cache cleanup")
            self.cleanup_expired_entries()
