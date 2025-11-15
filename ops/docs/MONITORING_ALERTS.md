# 🔍 Monitoring & Alerting Definitions

This document defines Service Level Objectives (SLOs), Service Level Indicators (SLIs), and alerting rules for the Polish Tutor application.

## 📊 Service Level Objectives (SLOs)

### 1. API Availability
- **Target**: 99.5% uptime for core API endpoints
- **SLI**: HTTP 2xx/3xx responses for `/api/*` endpoints
- **Measurement Window**: Rolling 30 days

### 2. TTS Job Success Rate
- **Target**: 95% of TTS jobs complete successfully
- **SLI**: Ratio of completed jobs to total submitted jobs
- **Measurement Window**: Rolling 7 days

### 3. TTS Job Latency
- **Target**: 90% of TTS jobs complete within 5 minutes
- **SLI**: Job completion time from submission to completion
- **Measurement Window**: Rolling 7 days

### 4. Queue Backlog
- **Target**: Queue depth stays below 50 jobs
- **SLI**: Current number of queued jobs
- **Measurement Window**: Real-time

## 🚨 Alert Definitions

### Critical Alerts (Immediate Response Required)

#### 1. API Unavailable
```prometheus
# Alert when API availability drops below 99%
- alert: APIDown
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
  for: 5m
  labels:
    severity: critical
    service: api
  annotations:
    summary: "API is returning 5xx errors"
    description: "API availability has dropped below 99% ({{ $value | printf "%.2f" }}% error rate)"

# Alert when API is completely down
- alert: APITotalFailure
  expr: up{job="polish-tutor-api"} == 0
  for: 2m
  labels:
    severity: critical
    service: api
  annotations:
    summary: "API service is down"
    description: "API service has been down for 2 minutes"
```

#### 2. TTS Queue Overload
```prometheus
# Alert when queue depth exceeds threshold
- alert: TTSQueueBacklog
  expr: tts_queue_length > 50
  for: 5m
  labels:
    severity: critical
    service: tts
  annotations:
    summary: "TTS queue backlog is too high"
    description: "TTS queue has {{ $value }} jobs pending (threshold: 50)"

# Alert when no active workers
- alert: TTSWorkersDown
  expr: tts_active_workers == 0
  for: 5m
  labels:
    severity: critical
    service: tts
  annotations:
    summary: "No active TTS workers"
    description: "All TTS workers have stopped processing jobs"
```

#### 3. TTS Job Failures
```prometheus
# Alert on high failure rate
- alert: TTSHighFailureRate
  expr: rate(tts_jobs_failed_total[10m]) / rate(tts_jobs_submitted_total[10m]) > 0.1
  for: 5m
  labels:
    severity: critical
    service: tts
  annotations:
    summary: "TTS job failure rate is too high"
    description: "TTS job failure rate is {{ $value | printf "%.2f" }}% (threshold: 10%)"
```

### Warning Alerts (Response Within 30 Minutes)

#### 4. API Performance Degradation
```prometheus
# Alert on high latency
- alert: APIHighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[10m])) > 5.0
  for: 10m
  labels:
    severity: warning
    service: api
  annotations:
    summary: "API response latency is high"
    description: "95th percentile API latency is {{ $value | printf "%.2f" }}s (threshold: 5s)"

# Alert on high error rate (non-critical)
- alert: APIHighErrorRate
  expr: rate(http_requests_total{status_code=~"4.."}[10m]) / rate(http_requests_total[10m]) > 0.05
  for: 10m
  labels:
    severity: warning
    service: api
  annotations:
    summary: "API client error rate is high"
    description: "API 4xx error rate is {{ $value | printf "%.2f" }}% (threshold: 5%)"
```

#### 5. TTS Performance Issues
```prometheus
# Alert on slow job completion
- alert: TTSSlowJobs
  expr: histogram_quantile(0.95, rate(tts_job_duration_seconds_bucket[15m])) > 600
  for: 10m
  labels:
    severity: warning
    service: tts
  annotations:
    summary: "TTS jobs are taking too long"
    description: "95th percentile TTS job duration is {{ $value | printf "%.2f" }}s (threshold: 600s)"

# Alert on cache performance
- alert: TTSCacheMissRateHigh
  expr: rate(tts_cache_misses_total[15m]) / (rate(tts_cache_hits_total[15m]) + rate(tts_cache_misses_total[15m])) > 0.8
  for: 15m
  labels:
    severity: warning
    service: tts
  annotations:
    summary: "TTS cache miss rate is high"
    description: "TTS cache miss rate is {{ $value | printf "%.2f" }}% (threshold: 80%)"
```

#### 6. Resource Issues
```prometheus
# Alert on Redis connectivity issues
- alert: RedisConnectionIssues
  expr: up{job="redis"} == 0
  for: 2m
  labels:
    severity: warning
    service: infrastructure
  annotations:
    summary: "Redis connection lost"
    description: "Cannot connect to Redis database"

# Alert on disk space issues
- alert: DiskSpaceLow
  expr: (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) > 0.85
  for: 5m
  labels:
    severity: warning
    service: infrastructure
  annotations:
    summary: "Disk space is running low"
    description: "Disk usage is {{ $value | printf "%.2f" }}% (threshold: 85%)"
```

### Info Alerts (Monitoring Only)

#### 7. Queue Growth Trends
```prometheus
# Alert on growing queue (info level)
- alert: TTSQueueGrowing
  expr: increase(tts_queue_length[30m]) > 10
  for: 10m
  labels:
    severity: info
    service: tts
  annotations:
    summary: "TTS queue is growing rapidly"
    description: "TTS queue has grown by {{ $value }} jobs in the last 30 minutes"
```

#### 8. Authentication Anomalies
```prometheus
# Alert on unusual login patterns
- alert: HighFailedLogins
  expr: rate(auth_logins_total{result="failure"}[15m]) > 5
  for: 5m
  labels:
    severity: info
    service: auth
  annotations:
    summary: "High rate of failed login attempts"
    description: "{{ $value | printf "%.1f" }} failed logins per minute detected"
```

## 📈 Key Metrics to Monitor

### Application Metrics
- `http_requests_total` - Total HTTP requests by endpoint and status
- `http_request_duration_seconds` - Request latency histograms
- `http_request_size_bytes` - Request/response size tracking
- `http_response_size_bytes` - Response size by endpoint

### TTS Metrics
- `tts_jobs_submitted_total` - Total jobs submitted by priority
- `tts_jobs_completed_total` - Successful job completions
- `tts_jobs_failed_total` - Failed jobs by error type
- `tts_job_duration_seconds` - Job processing time
- `tts_queue_length` - Current queue depth by queue type
- `tts_active_workers` - Number of active workers
- `tts_cache_hits_total` / `tts_cache_misses_total` - Cache performance

### Authentication Metrics
- `auth_logins_total` - Login attempts by result
- `auth_tokens_issued_total` - JWT tokens issued by type

### System Metrics
- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_heap_size_used_bytes` - Node.js heap usage (frontend)

## 🔧 Alert Manager Configuration

### Routing Rules
```yaml
# Alertmanager configuration
route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
  - match:
      severity: critical
    receiver: 'critical-pager'
  - match:
      severity: warning
    receiver: 'warning-email'
  - match:
      severity: info
    receiver: 'info-slack'

receivers:
- name: 'critical-pager'
  pagerduty_configs:
  - routing_key: 'your-pagerduty-key'

- name: 'warning-email'
  email_configs:
  - to: 'dev-team@company.com'
    from: 'alerts@company.com'
    smarthost: 'smtp.company.com:587'

- name: 'info-slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts-info'
    username: 'Polish Tutor Monitor'
```

## 🎯 SLO Burn Rate Alerts

### Error Budget Burn Rate
```prometheus
# Fast burn rate (2x normal consumption)
- alert: SLOBurnRateHigh
  expr: (
    1 - (
      sum(rate(http_requests_total{status_code!~"5.."}[1h]))
      /
      sum(rate(http_requests_total[1h]))
    )
  ) > 0.005  # 0.5% error rate = 2x burn rate for 99.5% SLO
  for: 1h
  labels:
    severity: warning
    slo: api-availability
  annotations:
    summary: "API SLO burn rate is high"
    description: "API error rate is consuming error budget too quickly"

# Critical burn rate (4x normal consumption)
- alert: SLOBurnRateCritical
  expr: (
    1 - (
      sum(rate(http_requests_total{status_code!~"5.."}[30m]))
      /
      sum(rate(http_requests_total[30m]))
    )
  ) > 0.01  # 1% error rate = 4x burn rate for 99.5% SLO
  for: 30m
  labels:
    severity: critical
    slo: api-availability
  annotations:
    summary: "API SLO burn rate is critical"
    description: "API error budget will be exhausted soon"
```

## 📋 Runbooks

### API Down
1. Check application logs for error patterns
2. Verify database connectivity
3. Check Redis queue status
4. Restart application if needed
5. Verify external API dependencies (Murf, OpenAI)

### TTS Queue Backlog
1. Check worker process status (`python scripts/manage_workers.py status`)
2. Verify Redis connectivity
3. Check Murf API rate limits
4. Scale up worker processes if needed
5. Clear failed jobs if appropriate

### High TTS Failure Rate
1. Check Murf API status and quotas
2. Review recent error logs for patterns
3. Verify audio cache integrity
4. Check network connectivity to Murf API
5. Consider temporary service degradation

## 🔄 Monitoring Dashboards

### Grafana Dashboard Panels
- API Response Time Trends
- TTS Job Success/Failure Rates
- Queue Depth Over Time
- Worker Pool Utilization
- Cache Hit/Miss Ratios
- Authentication Success Rates
- Error Budget Burn Down Charts

This monitoring setup provides comprehensive observability with actionable alerts and clear escalation paths.
