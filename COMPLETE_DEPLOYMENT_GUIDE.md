# 🎯 Complete Production Deployment Guide: Grafana Agent on Render

This comprehensive guide walks you through deploying Grafana Agent with metrics collection to production on Render.

**Estimated Time**: 30-45 minutes  
**Cost**: Free to $7/month (Grafana Agent only)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Get Grafana Cloud Credentials](#step-1-get-grafana-cloud-credentials)
3. [Step 2: Update Backend Service](#step-2-update-backend-service)
4. [Step 3: Deploy Grafana Agent](#step-3-deploy-grafana-agent-service)
5. [Step 4: Verify Everything Works](#step-4-verify-everything-works)
6. [Step 5: Monitor and Configure Alerts](#step-5-monitor-and-configure-alerts)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- ✅ GitHub account with your Gateway repository
- ✅ Render account (render.com) - free tier
- ✅ Backend and Gateway services already deployed on Render
- ✅ 30 minutes of setup time

---

## Step 1: Get Grafana Cloud Credentials

### 1.1 Create Grafana Cloud Account

1. Go to https://grafana.com/auth/sign-in/
2. Sign up for free account (or login if you have one)
3. Verify your email
4. Create a new Grafana Cloud Stack (takes ~2 minutes)

### 1.2 Generate API Token

1. Go to https://grafana.cloud/account/api-tokens
2. Click **"Create API Token"**
3. Fill in:
   - **Token name**: `render-agent` or `production-metrics`
   - **Role**: Choose **MetricsPublisher** (not Admin for security)
   - **Expiration**: 90 days (or as needed)
4. Click **Create Token**
5. **IMMEDIATELY COPY** the token (you can't see it again!)
   - Format: `glc_xxxxxxxxxxxxxxxxxxxxxxxx`
   - Paste into a secure note or password manager

### 1.3 Find Your User ID

1. Go to https://grafana.com/api/auth/profile (you'll need to be logged in)
2. Look for the `id` field (a number like `123456`)
3. Save this value

**You now have:**
- ✅ User ID: `123456`
- ✅ API Token: `glc_xxxxxxxxxxxxx`

---

## Step 2: Update Backend Service

### 2.1 Install Dependencies

Your backend already has the metrics code created, but you need to install the packages:

```bash
cd backend
npm install prom-client winston
npm run build
```

### 2.2 Update Render Backend Environment Variables

1. Go to https://dashboard.render.com
2. Select your **backend service**
3. Click **Environment** tab
4. Add/Update these variables:
   ```
   EXPOSE_METRICS=true
   LOG_LEVEL=info
   METRICS_PORT=9090
   ```
5. Click **Save Changes** (deployment will restart)

### 2.3 Verify Backend Metrics Endpoint

Once your backend redeploys:

```bash
# Test the metrics endpoint
curl https://your-backend.onrender.com/metrics

# You should see output like:
# # HELP http_requests_total Total number of HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="GET",route="/",status="200"} 42
```

### 2.4 Verify Backend Health Check

```bash
# Test health endpoint
curl https://your-backend.onrender.com/health

# Expected response:
# {"status":"OK","timestamp":"2024-04-02T10:30:45.123Z"}
```

---

## Step 3: Deploy Grafana Agent Service

### 3.1 Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Select **Build and deploy from a Git repository**
4. **If you have a GitHub OAuth token configured:**
   - Select your Gateway repository
   - If not, follow the manual connection steps

### 3.2 Configure Service Settings

Fill in the following:

**Basic Settings:**
- **Name**: `grafana-agent`
- **Environment**: `Docker`
- **Region**: Same as your backend (e.g., `US East (N. Virginia)`)
- **Root Directory**: `/` (your repo root, leave blank if root)
- **Dockerfile Path**: `Dockerfile.grafana-agent` (relative to root)

**Build & Deploy:**
- **Build Command**: `true` (or leave blank - Docker will build)
- **Start Command**: `/bin/grafana-agent -config.file=/etc/grafana-agent.yaml -server.http.address=0.0.0.0:$PORT`

### 3.3 Add Environment Variables

1. Scroll to **Environment** section
2. Click **Add Environment Variable** for each:

```
GRAFANA_CLOUD_USER_ID          → 123456 (your numeric ID from Step 1.3)
GRAFANA_CLOUD_API_TOKEN         → glc_xxxxxxxxxxxxx (your token from Step 1.2)
BACKEND_URL                     → your-backend.onrender.com (your actual backend URL)
GATEWAY_URL                     → your-gateway.onrender.com (your actual gateway URL)
RENDER_REGION                   → us-east-1 (region code)
```

### 3.4 Set Instance & Plan

- **Plan**: `Free` or `Starter` ($7/month)
  - Free: Shared CPU/RAM, good for learning/demos
  - Starter: Dedicated resources, good for production
- Leave other options as default

### 3.5 Set Health Check (Optional but Recommended)

- **Health Check Path**: `/-/healthy`
- **Check Interval**: `30s`
- **Check Timeout**: `10s`

### 3.6 Deploy

1. Review all settings
2. Click **Create Web Service**
3. Render will build and deploy (takes 2-5 minutes)
4. Watch the logs in the dashboard

---

## Step 4: Verify Everything Works

### 4.1 Check Agent Service Status

1. Go to https://dashboard.render.com
2. Select `grafana-agent` service
3. Check **Logs** for any errors
4. Look for message: `WAL replay complete, starting metrics collection`

### 4.2 Test Agent Health Endpoint

```bash
# Check if agent is running
curl https://grafana-agent.onrender.com/api/v1/liveness

# Expected response: HTTP 200
```

### 4.3 Verify Metrics are Being Collected

Give it 2-3 minutes, then check Grafana Cloud:

1. Go to https://grafana.com/a/grafana-cloud-portal
2. Click **Dashboards** → **Explore**
3. Select **Prometheus** data source
4. Run query: `up`
   - Should show metrics from your backend and gateway
5. Try other queries:
   - `http_requests_total`
   - `http_request_duration_seconds`
   - `node_up`

### 4.4 Check Logs in Grafana

1. In Grafana Cloud: **Dashboards** → **Explore**
2. Select **Loki** data source
3. Run query: `{job="backend"}` or `{job="nginx-access"}`
   - Should see application logs

---

## Step 5: Monitor and Configure Alerts

### 5.1 Create a Custom Dashboard

1. In Grafana: **Dashboards** → **New Dashboard**
2. Click **Add Panel**
3. Add your first metric:
   - **Title**: "Request Rate"
   - **Query**: `rate(http_requests_total[1m])`
   - **Legend**: `{{method}} {{route}}`
4. Save dashboard

### 5.2 Add More Panels

Create panels for:

| Panel Name | Query | Description |
|-----------|-------|-------------|
| Error Rate | `rate(errors_total[5m])` | Errors per second |
| Auth Failures | `rate(auth_attempts_total{status="failed"}[5m])` | Failed auth attempts |
| Response Time (p95) | `histogram_quantile(0.95, http_request_duration_seconds_bucket)` | 95th percentile latency |
| Active Connections | `up` | Service availability |

### 5.3 Set Up Basic Alerts

1. In Grafana: **Alerting** → **Alert Rules** → **New Alert Rule**
2. Create alert for high error rate:
   - **Name**: `High Error Rate`
   - **Condition**: `rate(errors_total[5m]) > 0.5`
   - **Evaluate for**: `5m`
   - **Contact Points**: (configure email/Slack first)

---

## Troubleshooting

### Problem: "Agent not sending metrics to Grafana Cloud"

**Solutions:**
1. Verify credentials:
   ```bash
   # In Render dashboard, check environment variables
   - GRAFANA_CLOUD_USER_ID is numeric only
   - GRAFANA_CLOUD_API_TOKEN starts with glc_
   ```

2. Check agent logs:
   - Render Dashboard → grafana-agent → Logs
   - Look for connection errors
   - Check for "authentication failed" messages

3. Verify firewall:
   - Grafana Cloud requires HTTPS (port 443)
   - Render should have outbound internet access by default

### Problem: "No metrics data in Grafana"

**Solutions:**
1. **Wait 2-3 minutes** - First scrape takes time
2. **Verify backend is exposing metrics**:
   ```bash
   curl https://your-backend.onrender.com/metrics
   # Should return Prometheus metrics
   ```

3. **Check backend logs** for metric errors
4. **Verify backend environment variables** are set correctly

### Problem: "Agent keeps restarting"

**Solutions:**
1. Check logs for errors
2. Verify Dockerfile.grafana-agent is correct
3. Ensure config file path is correct in start command
4. Check Docker build logs in Render

### Problem: "High CPU/Memory usage"

**Solutions:**
1. Increase scrape interval in config (currently 60s)
   - Change in `grafana-agent-config.prod.yaml`
2. Upgrade to larger Render plan
3. Reduce number of metrics being scraped
4. Enable WAL (Write-Ahead Log) limits

---

## What's Monitoring Now?

After successful deployment, you have:

✅ **Metrics Collection:**
- HTTP request counts and latency
- Authentication success/failure rates
- Application errors
- System resources (CPU, memory, uptime)

✅ **Log Collection:**
- Structured logs from your backend
- Error logs with stack traces
- Authentication logs
- Access logs from Nginx

✅ **Alerting Ready:**
- Can create alerts on any metric
- Email, Slack, PagerDuty integration

✅ **Dashboards:**
- Pre-built node exporter dashboards
- Custom dashboards for your application
- Cross-service visibility

---

## Next Steps

1. **Get to know Grafana**
   - Explore pre-built dashboards
   - Practice writing PromQL queries
   - Learn about alert rules

2. **Optimize Monitoring**
   - Add custom metrics for business logic
   - Set up meaningful alerts
   - Create team dashboards

3. **Plan for Scale**
   - Document metric retention policies
   - Plan for high-volume log storage
   - Consider upgrading Grafana Cloud plan

4. **Integrate with Incident Management**
   - Connect to PagerDuty or Opsgenie
   - Set up on-call schedules
   - Create runbooks for common alerts

---

## Cost Reference

| Component | Cost | Notes |
|-----------|------|-------|
| Grafana Agent (Render) | Free-$7/mo | Depends on plan chosen |
| Grafana Cloud Free Tier | Free | 10GB logs/month, 10k series |
| Prometheus Data (beyond free) | $10/month | Per 10k metric series |
| Logs Ingestion (beyond free) | $10/month | Per 50GB |
| **Production Minimum** | **~$17/mo** | Likely still within free tier |

---

## Files Reference

| File | Purpose |
|------|---------|
| `Dockerfile.grafana-agent` | Container image definition |
| `grafana-agent-config.prod.yaml` | Scrape targets and forwarding |
| `.env.grafana-agent` | Environment variables template |
| `backend/src/metrics.ts` | Prometheus metrics definitions |
| `backend/src/logger.ts` | Structured logging setup |
| `backend/src/server.ts` | Updated with instrumentation |
| `RENDER_DEPLOYMENT_CHECKLIST.md` | Quick reference checklist |
| `render.yaml` | Render infrastructure (optional) |

---

## Support & Resources

- **Grafana Docs**: https://grafana.com/docs/
- **Agent Docs**: https://grafana.com/docs/agent/latest/
- **Prometheus Docs**: https://prometheus.io/docs/
- **Render Docs**: https://render.com/docs
- **Winston Logger**: https://github.com/winstonjs/winston
- **Prom Client**: https://github.com/siimon/prom-client

---

**Status: ✅ Ready to Deploy!**

You have all the files and instructions needed. Follow the steps above and you'll have production monitoring in under an hour.

Need help? Check the [Troubleshooting](#troubleshooting) section or consult the documentation links above.
