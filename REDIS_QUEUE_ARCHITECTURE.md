# 🔄 Redis Queue Architecture for TTS Jobs

## Overview

This document outlines the Redis-based queue architecture for handling TTS (Text-to-Speech) jobs in the Polish Tutor application. The system uses RQ (Redis Queue) with multiple worker pools, job deduplication, monitoring, and failure recovery.

## 🏗️ Architecture Components

### 1. Queue Infrastructure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI App   │────│     Redis       │────│   RQ Workers    │
│                 │    │   (Queue Store) │    │   (Job Processors)
│ • /api/tts/*    │    │                 │    │                 │
│ • Job submission│    │ • Job Queue     │    │ • Murf API calls│
│ • Status polling│    │ • Job Results   │    │ • Audio caching │
└─────────────────┘    │ • Job Metadata  │    └─────────────────┘
                       └─────────────────┘             │
                                                     │
                                                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Audio Cache   │    │   Murf API      │    │   Monitoring    │
│                 │    │                 │    │                 │
│ • File storage  │    │ • Synthesis     │    │ • Job metrics   │
│ • Metadata      │    │ • Download      │    │ • Health checks │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. Queue Types

#### Primary Queues
- **`tts_jobs`** - Main queue for speech synthesis jobs
- **`tts_high_priority`** - Urgent jobs (real-time chat responses)
- **`tts_batch`** - Background jobs (lesson pre-rendering)

#### Special Queues
- **`tts_retry`** - Failed jobs awaiting retry
- **`tts_dead_letter`** - Permanently failed jobs

### 3. Job Lifecycle

```
Job Submission → Queue → Worker Processing → Result Storage → Cleanup
      ↓            ↓          ↓              ↓            ↓
   Validation   Deduplication  Murf API    Cache Audio  TTL Expiry
   Priority      Caching       Polling     Metadata     Monitoring
   Rate Limit    Status        Download    Notifications
```

## ⚙️ Configuration

### Environment Variables (`env.template`)

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Queue Worker Configuration
TTS_WORKER_COUNT=4
TTS_WORKER_TIMEOUT=600  # 10 minutes
TTS_JOB_TTL=86400       # 24 hours
TTS_JOB_RESULT_TTL=604800  # 7 days

# Queue Policies
TTS_MAX_RETRIES=3
TTS_RETRY_DELAY=60      # seconds
TTS_RATE_LIMIT_PER_MINUTE=10
TTS_DEDUP_TTL=3600      # 1 hour

# Monitoring
TTS_MONITORING_INTERVAL=30
TTS_HEALTH_CHECK_TIMEOUT=10
```

### Worker Pools

```python
# worker_pools.py
WORKER_CONFIGS = {
    "tts_standard": {
        "queues": ["tts_jobs"],
        "worker_count": 4,
        "timeout": 600,
    },
    "tts_priority": {
        "queues": ["tts_high_priority", "tts_jobs"],
        "worker_count": 2,
        "timeout": 300,
    },
    "tts_batch": {
        "queues": ["tts_batch"],
        "worker_count": 1,
        "timeout": 1800,
    },
}
```

## 🔧 Core Components

### 1. Enhanced Queue Manager

```python
# backend/tts/queue_manager.py
class TTSQueueManager:
    """Enhanced queue manager with monitoring and deduplication."""

    def __init__(self, redis_url: str):
        self.redis = Redis.from_url(redis_url)
        self.queues = {}
        self.dedup_store = Redis.from_url(redis_url, db=1)

    def submit_job(self, task_func: str, *args, priority="normal", **kwargs) -> str:
        """Submit job with deduplication and priority handling."""
        # Generate deduplication key
        dedup_key = self._generate_dedup_key(task_func, args, kwargs)

        # Check for existing job
        if self._is_duplicate(dedup_key):
            return self._get_existing_job_id(dedup_key)

        # Select queue based on priority
        queue_name = self._get_queue_for_priority(priority)
        queue = self.queues[queue_name]

        # Submit job
        job = queue.enqueue(
            task_func,
            *args,
            **kwargs,
            job_timeout=config.TTS_WORKER_TIMEOUT,
            result_ttl=config.TTS_JOB_RESULT_TTL,
            ttl=config.TTS_JOB_TTL,
            retry=Retry(max=config.TTS_MAX_RETRIES, interval=config.TTS_RETRY_DELAY)
        )

        # Store deduplication mapping
        self._store_dedup_mapping(dedup_key, job.id)

        return job.id
```

### 2. Worker Management

```python
# scripts/manage_workers.py
#!/usr/bin/env python3
"""Worker management script."""

import subprocess
import signal
import time
from pathlib import Path

class WorkerManager:
    """Manages RQ worker processes."""

    def __init__(self):
        self.workers = {}
        self.worker_configs = WORKER_CONFIGS

    def start_workers(self, pool_name: str):
        """Start worker pool."""
        config = self.worker_configs[pool_name]
        queues = ",".join(config["queues"])

        for i in range(config["worker_count"]):
            worker_name = f"{pool_name}_{i}"
            cmd = [
                "rq", "worker",
                "--url", os.getenv("REDIS_URL"),
                "--name", worker_name,
                "--timeout", str(config["timeout"]),
                "--verbose",
                queues
            ]

            process = subprocess.Popen(cmd)
            self.workers[worker_name] = process

    def stop_workers(self):
        """Gracefully stop all workers."""
        for name, process in self.workers.items():
            process.terminate()

        # Wait for graceful shutdown
        time.sleep(10)

        # Force kill if needed
        for name, process in self.workers.items():
            if process.poll() is None:
                process.kill()

    def get_status(self) -> dict:
        """Get worker status."""
        status = {}
        for name, process in self.workers.items():
            status[name] = {
                "pid": process.pid,
                "alive": process.poll() is None,
                "exit_code": process.poll()
            }
        return status
```

### 3. Job Monitoring & Metrics

```python
# backend/tts/monitoring.py
class QueueMonitor:
    """Monitor queue health and performance."""

    def __init__(self, redis_url: str):
        self.redis = Redis.from_url(redis_url)

    def get_queue_stats(self) -> dict:
        """Get comprehensive queue statistics."""
        stats = {
            "queues": {},
            "workers": {},
            "jobs": {
                "total": 0,
                "completed": 0,
                "failed": 0,
                "in_progress": 0
            }
        }

        # Queue statistics
        for queue_name in ["tts_jobs", "tts_high_priority", "tts_batch"]:
            queue = Queue(queue_name, connection=self.redis)
            stats["queues"][queue_name] = {
                "queued": len(queue),
                "deferred": len(queue.deferred_job_registry),
                "failed": len(queue.failed_job_registry)
            }

        # Job counts
        # ... implementation ...

        return stats

    def get_health_status(self) -> dict:
        """Get system health status."""
        return {
            "redis_connected": self._check_redis_connection(),
            "queues_healthy": self._check_queues_healthy(),
            "workers_running": self._count_active_workers(),
            "avg_job_duration": self._get_avg_job_duration(),
            "error_rate": self._calculate_error_rate()
        }
```

### 4. Deduplication System

```python
# backend/tts/deduplication.py
class JobDeduplicator:
    """Handle job deduplication to prevent duplicate TTS generation."""

    def __init__(self, redis_url: str):
        self.redis = Redis.from_url(redis_url, db=2)  # Separate DB for dedup

    def get_cache_key(self, text: str, voice_id: str, **params) -> str:
        """Generate deterministic cache key for job deduplication."""
        key_data = {
            "text": text.strip().lower(),
            "voice_id": voice_id,
            "params": sorted(params.items())
        }
        return hashlib.sha256(json.dumps(key_data, sort_keys=True).encode()).hexdigest()

    def is_job_cached(self, cache_key: str) -> bool:
        """Check if job result is already cached."""
        return self.redis.exists(f"cache:{cache_key}")

    def mark_job_completed(self, cache_key: str, job_id: str, ttl: int = 3600):
        """Mark job as completed with TTL."""
        self.redis.setex(f"cache:{cache_key}", ttl, job_id)

    def get_existing_job(self, cache_key: str) -> Optional[str]:
        """Get existing job ID for cached result."""
        return self.redis.get(f"cache:{cache_key}")
```

## 🚀 Deployment & Operations

### 1. Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  tts-worker-standard:
    build: .
    command: python scripts/manage_workers.py start tts_standard
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 4

  tts-worker-priority:
    build: .
    command: python scripts/manage_workers.py start tts_priority
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 2

volumes:
  redis_data:
```

### 2. Systemd Services

```bash
# /etc/systemd/system/tts-worker.service
[Unit]
Description=TTS Worker Pool
After=network.target redis.service

[Service]
Type=simple
User=polish-tutor
WorkingDirectory=/opt/polish-tutor
ExecStart=/opt/polish-tutor/venv/bin/python scripts/manage_workers.py start tts_standard
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Monitoring Integration

```python
# backend/tts/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Queue metrics
jobs_submitted = Counter('tts_jobs_submitted_total', 'Total jobs submitted')
jobs_completed = Counter('tts_jobs_completed_total', 'Total jobs completed')
jobs_failed = Counter('tts_jobs_failed_total', 'Total jobs failed')

job_duration = Histogram('tts_job_duration_seconds', 'Job processing duration')
queue_length = Gauge('tts_queue_length', 'Current queue length')

# Worker metrics
active_workers = Gauge('tts_active_workers', 'Number of active workers')
worker_cpu_usage = Gauge('tts_worker_cpu_usage_percent', 'Worker CPU usage')
```

## 🔍 Health Checks & Debugging

### FastAPI Health Endpoints

```python
# backend/api/routers/health.py
@router.get("/health/queue")
async def queue_health():
    """Comprehensive queue health check."""
    monitor = QueueMonitor(config.REDIS_URL)
    return monitor.get_health_status()

@router.get("/metrics/queue")
async def queue_metrics():
    """Prometheus-compatible metrics."""
    monitor = QueueMonitor(config.REDIS_URL)
    return monitor.get_prometheus_metrics()
```

### Debugging Tools

```bash
# Check queue status
rq info --url redis://localhost:6379

# Monitor jobs
rq-dashboard --redis-url redis://localhost:6379

# Debug specific job
python -c "from backend.tts.tasks import get_job_status; print(get_job_status('job_id'))"
```

## 📊 Performance Optimizations

### 1. Connection Pooling
- Redis connection pooling for high concurrency
- Async Redis client for monitoring endpoints

### 2. Job Prioritization
- High-priority queue for real-time responses
- Batch processing for background jobs
- Rate limiting per user/API key

### 3. Caching Strategies
- Audio file caching with content hashing
- Job result caching (24h TTL)
- Metadata caching for quick lookups

### 4. Scalability Features
- Horizontal scaling of worker pools
- Queue partitioning by priority
- Load balancing across worker instances

## 🔐 Security Considerations

### 1. Job Validation
- Input sanitization for TTS text
- Rate limiting per user/session
- API key validation for Murf access

### 2. Resource Protection
- Worker timeout limits
- Memory usage monitoring
- Disk space management for audio cache

### 3. Audit Logging
- Job submission logs
- Worker activity logs
- Failed job analysis

## 🚨 Failure Recovery

### 1. Retry Policies
- Exponential backoff for Murf API failures
- Circuit breaker pattern for external API issues
- Dead letter queue for permanent failures

### 2. Data Consistency
- Job state persistence in Redis
- Atomic operations for critical updates
- Recovery procedures for crashed workers

### 3. Monitoring & Alerts
- Queue depth alerts
- Worker health monitoring
- Error rate tracking
- Performance degradation alerts

This architecture provides a robust, scalable, and monitorable queue system for TTS job processing with comprehensive error handling and performance optimization.
