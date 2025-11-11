#!/usr/bin/env python3
"""Worker management script for TTS queues."""
import argparse
import logging
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.app_context import app_context

# Worker pool configurations (mirrored from queue_manager.py)
WORKER_POOLS = {
    "standard": {
        "queues": ["tts_high_priority", "tts_jobs"],
        "worker_count": int(app_context.config.get("tts_standard_workers", "4")),
        "timeout": int(app_context.config.get("tts_worker_timeout", "600")),
    },
    "priority": {
        "queues": ["tts_high_priority"],
        "worker_count": int(app_context.config.get("tts_high_priority_workers", "2")),
        "timeout": int(app_context.config.get("tts_worker_timeout", "300")),
    },
    "batch": {
        "queues": ["tts_batch"],
        "worker_count": int(app_context.config.get("tts_batch_workers", "1")),
        "timeout": int(app_context.config.get("tts_worker_timeout", "1800")),
    },
}

logger = logging.getLogger(__name__)

class WorkerManager:
    """Manages RQ worker processes."""

    def __init__(self):
        self.workers: Dict[str, subprocess.Popen] = {}
        self.redis_url = app_context.config.get("redis_url", "redis://localhost:6379")

    def start_pool(self, pool_name: str) -> List[str]:
        """Start a worker pool.

        Args:
            pool_name: Name of the worker pool to start

        Returns:
            List of worker names that were started
        """
        if pool_name not in WORKER_POOLS:
            raise ValueError(f"Unknown worker pool: {pool_name}")

        config = WORKER_POOLS[pool_name]
        started_workers = []

        for i in range(config["worker_count"]):
            worker_name = f"{pool_name}_{i}"
            if worker_name in self.workers:
                logger.warning(f"Worker {worker_name} is already running")
                continue

            queues = ",".join(config["queues"])
            cmd = [
                sys.executable, "-m", "rq", "worker",
                "--url", self.redis_url,
                "--name", worker_name,
                "--timeout", str(config["timeout"]),
                "--verbose",
                queues
            ]

            logger.info(f"Starting worker {worker_name} with command: {' '.join(cmd)}")

            try:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=project_root
                )
                self.workers[worker_name] = process
                started_workers.append(worker_name)
                logger.info(f"Started worker {worker_name} (PID: {process.pid})")
            except Exception as e:
                logger.error(f"Failed to start worker {worker_name}: {e}")

        return started_workers

    def stop_pool(self, pool_name: str, graceful: bool = True) -> List[str]:
        """Stop a worker pool.

        Args:
            pool_name: Name of the worker pool to stop
            graceful: Whether to wait for graceful shutdown

        Returns:
            List of worker names that were stopped
        """
        stopped_workers = []
        timeout = 30 if graceful else 5

        # Find workers in this pool
        pool_workers = [name for name in self.workers.keys() if name.startswith(f"{pool_name}_")]

        for worker_name in pool_workers:
            if worker_name not in self.workers:
                continue

            process = self.workers[worker_name]
            logger.info(f"Stopping worker {worker_name} (PID: {process.pid})")

            try:
                if graceful:
                    # Send SIGTERM for graceful shutdown
                    process.terminate()
                else:
                    # Send SIGKILL for immediate shutdown
                    process.kill()

                # Wait for process to end
                try:
                    process.wait(timeout=timeout)
                    logger.info(f"Worker {worker_name} stopped successfully")
                except subprocess.TimeoutExpired:
                    logger.warning(f"Worker {worker_name} didn't stop gracefully, force killing")
                    process.kill()
                    process.wait(timeout=5)
                    logger.info(f"Worker {worker_name} force killed")

                stopped_workers.append(worker_name)
                del self.workers[worker_name]

            except Exception as e:
                logger.error(f"Failed to stop worker {worker_name}: {e}")

        return stopped_workers

    def start_all_pools(self) -> Dict[str, List[str]]:
        """Start all worker pools.

        Returns:
            Dictionary mapping pool names to lists of started worker names
        """
        results = {}
        for pool_name in WORKER_POOLS.keys():
            results[pool_name] = self.start_pool(pool_name)
        return results

    def stop_all_pools(self, graceful: bool = True) -> Dict[str, List[str]]:
        """Stop all worker pools.

        Args:
            graceful: Whether to wait for graceful shutdown

        Returns:
            Dictionary mapping pool names to lists of stopped worker names
        """
        results = {}
        for pool_name in WORKER_POOLS.keys():
            results[pool_name] = self.stop_pool(pool_name, graceful)
        return results

    def get_status(self) -> Dict[str, Dict[str, any]]:
        """Get status of all workers.

        Returns:
            Dictionary with worker status information
        """
        status = {}

        for worker_name, process in self.workers.items():
            try:
                # Check if process is still running
                if process.poll() is None:
                    # Process is running
                    status[worker_name] = {
                        "status": "running",
                        "pid": process.pid,
                        "pool": worker_name.split("_")[0],
                        "exit_code": None
                    }
                else:
                    # Process has exited
                    status[worker_name] = {
                        "status": "stopped",
                        "pid": process.pid,
                        "pool": worker_name.split("_")[0],
                        "exit_code": process.returncode
                    }
                    # Remove from workers dict
                    del self.workers[worker_name]

            except Exception as e:
                logger.error(f"Failed to get status for worker {worker_name}: {e}")
                status[worker_name] = {
                    "status": "error",
                    "error": str(e),
                    "pool": worker_name.split("_")[0]
                }

        return status

    def restart_pool(self, pool_name: str) -> Dict[str, List[str]]:
        """Restart a worker pool.

        Args:
            pool_name: Name of the pool to restart

        Returns:
            Dictionary with 'stopped' and 'started' keys
        """
        logger.info(f"Restarting worker pool: {pool_name}")

        # Stop the pool
        stopped = self.stop_pool(pool_name)

        # Wait a moment for cleanup
        time.sleep(2)

        # Start the pool again
        started = self.start_pool(pool_name)

        return {
            "stopped": stopped,
            "started": started
        }

    def health_check(self) -> Dict[str, any]:
        """Perform health check on worker manager.

        Returns:
            Health status information
        """
        status = self.get_status()

        running_count = sum(1 for worker in status.values() if worker["status"] == "running")
        total_expected = sum(config["worker_count"] for config in WORKER_POOLS.values())

        health = {
            "status": "healthy" if running_count == total_expected else "degraded",
            "workers": {
                "running": running_count,
                "expected": total_expected,
                "details": status
            }
        }

        return health


def setup_logging():
    """Setup logging for the worker manager."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def main():
    parser = argparse.ArgumentParser(description="TTS Worker Manager")
    parser.add_argument("action", choices=["start", "stop", "restart", "status", "health"],
                       help="Action to perform")
    parser.add_argument("--pool", choices=list(WORKER_POOLS.keys()) + ["all"],
                       default="all", help="Worker pool to manage (default: all)")
    parser.add_argument("--force", action="store_true",
                       help="Force immediate shutdown (don't wait for graceful)")

    args = parser.parse_args()

    setup_logging()
    manager = WorkerManager()

    try:
        if args.action == "start":
            if args.pool == "all":
                results = manager.start_all_pools()
                print("Started workers:")
                for pool_name, workers in results.items():
                    print(f"  {pool_name}: {workers}")
            else:
                workers = manager.start_pool(args.pool)
                print(f"Started workers for pool {args.pool}: {workers}")

        elif args.action == "stop":
            if args.pool == "all":
                results = manager.stop_all_pools(graceful=not args.force)
                print("Stopped workers:")
                for pool_name, workers in results.items():
                    print(f"  {pool_name}: {workers}")
            else:
                workers = manager.stop_pool(args.pool, graceful=not args.force)
                print(f"Stopped workers for pool {args.pool}: {workers}")

        elif args.action == "restart":
            if args.pool == "all":
                print("Restarting all pools...")
                # Stop all
                manager.stop_all_pools()
                time.sleep(3)
                # Start all
                results = manager.start_all_pools()
                print("Restarted workers:")
                for pool_name, workers in results.items():
                    print(f"  {pool_name}: {workers}")
            else:
                result = manager.restart_pool(args.pool)
                print(f"Restarted pool {args.pool}:")
                print(f"  Stopped: {result['stopped']}")
                print(f"  Started: {result['started']}")

        elif args.action == "status":
            status = manager.get_status()
            print("Worker Status:")
            for worker_name, info in status.items():
                print(f"  {worker_name}: {info['status']} (PID: {info.get('pid', 'N/A')})")

        elif args.action == "health":
            health = manager.health_check()
            print(f"Health Status: {health['status']}")
            print(f"Workers: {health['workers']['running']}/{health['workers']['expected']} running")

    except KeyboardInterrupt:
        print("\nShutting down gracefully...")
        manager.stop_all_pools()
    except Exception as e:
        logger.error(f"Worker manager failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
