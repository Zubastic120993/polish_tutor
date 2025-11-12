"""Murf.ai TTS API client."""

import asyncio
import logging
from typing import Dict, Optional, Any
import httpx
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class MurfClient:
    """Client for Murf.ai Text-to-Speech API."""

    BASE_URL = "https://api.murf.ai/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        """Initialize Murf API client.

        Args:
            api_key: Murf API key
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
            retry_delay: Delay between retries in seconds
        """
        self.api_key = api_key or os.getenv("MURF_API_KEY")
        if not self.api_key:
            raise ValueError("MURF_API_KEY environment variable is required")

        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        # HTTP client for API requests
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    async def synthesize_speech(
        self,
        text: str,
        voice_id: str,
        language: str = "pl",
        style: str = "conversational",
        format: str = "mp3",
        **kwargs,
    ) -> Dict[str, Any]:
        """Synthesize speech from text using Murf API.

        Args:
            text: Text to synthesize
            voice_id: Murf voice ID
            language: Language code (default: 'pl' for Polish)
            style: Voice style ('conversational', 'narrative', etc.)
            format: Audio format ('mp3', 'wav', etc.)
            **kwargs: Additional parameters

        Returns:
            Response containing job information
        """
        payload = {
            "text": text,
            "voice_id": voice_id,
            "language": language,
            "style": style,
            "format": format,
            **kwargs,
        }

        for attempt in range(self.max_retries + 1):
            try:
                response = await self.client.post(
                    f"{self.BASE_URL}/speech/generate", json=payload
                )
                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limited
                    if attempt < self.max_retries:
                        wait_time = self.retry_delay * (
                            2**attempt
                        )  # Exponential backoff
                        logger.warning(
                            f"Rate limited by Murf API, retrying in {wait_time}s"
                        )
                        await asyncio.sleep(wait_time)
                        continue
                elif e.response.status_code >= 500:  # Server error
                    if attempt < self.max_retries:
                        logger.warning(
                            f"Murf API server error, retrying in {self.retry_delay}s"
                        )
                        await asyncio.sleep(self.retry_delay)
                        continue
                raise

            except Exception as e:
                if attempt < self.max_retries:
                    logger.warning(f"Murf API request failed, retrying: {e}")
                    await asyncio.sleep(self.retry_delay)
                    continue
                raise

        raise Exception(
            f"Failed to synthesize speech after {self.max_retries + 1} attempts"
        )

    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get the status of a synthesis job.

        Args:
            job_id: Murf job ID

        Returns:
            Job status information
        """
        for attempt in range(self.max_retries + 1):
            try:
                response = await self.client.get(
                    f"{self.BASE_URL}/speech/jobs/{job_id}"
                )
                response.raise_for_status()
                return response.json()

            except Exception as e:
                if attempt < self.max_retries:
                    logger.warning(f"Failed to get job status, retrying: {e}")
                    await asyncio.sleep(self.retry_delay)
                    continue
                raise

        raise Exception(
            f"Failed to get job status after {self.max_retries + 1} attempts"
        )

    async def download_audio(self, job_id: str, output_path: Path) -> Path:
        """Download synthesized audio file.

        Args:
            job_id: Murf job ID
            output_path: Path to save the audio file

        Returns:
            Path to the downloaded file
        """
        for attempt in range(self.max_retries + 1):
            try:
                response = await self.client.get(
                    f"{self.BASE_URL}/speech/jobs/{job_id}/download",
                    follow_redirects=True,
                )
                response.raise_for_status()

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "wb") as f:
                    f.write(response.content)

                return output_path

            except Exception as e:
                if attempt < self.max_retries:
                    logger.warning(f"Failed to download audio, retrying: {e}")
                    await asyncio.sleep(self.retry_delay)
                    continue
                raise

        raise Exception(
            f"Failed to download audio after {self.max_retries + 1} attempts"
        )

    async def get_voices(self, language: Optional[str] = None) -> Dict[str, Any]:
        """Get available voices, optionally filtered by language.

        Args:
            language: Language code to filter voices

        Returns:
            Available voices information
        """
        params = {}
        if language:
            params["language"] = language

        for attempt in range(self.max_retries + 1):
            try:
                response = await self.client.get(
                    f"{self.BASE_URL}/voices", params=params
                )
                response.raise_for_status()
                return response.json()

            except Exception as e:
                if attempt < self.max_retries:
                    logger.warning(f"Failed to get voices, retrying: {e}")
                    await asyncio.sleep(self.retry_delay)
                    continue
                raise

        raise Exception(f"Failed to get voices after {self.max_retries + 1} attempts")

    async def wait_for_completion(
        self, job_id: str, poll_interval: float = 2.0, max_wait_time: float = 300.0
    ) -> Dict[str, Any]:
        """Wait for a job to complete.

        Args:
            job_id: Murf job ID
            poll_interval: Seconds between status checks
            max_wait_time: Maximum time to wait in seconds

        Returns:
            Final job status
        """
        import time

        start_time = time.time()

        while time.time() - start_time < max_wait_time:
            status = await self.get_job_status(job_id)

            if status.get("status") == "completed":
                return status
            elif status.get("status") == "failed":
                raise Exception(
                    f"Job {job_id} failed: {status.get('error', 'Unknown error')}"
                )

            await asyncio.sleep(poll_interval)

        raise Exception(f"Job {job_id} did not complete within {max_wait_time} seconds")

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
