# 🚀 Render Production Deployment Checklist

## Prerequisites ✅

- [ ] Grafana Cloud account created
- [ ] Grafana Cloud User ID obtained
- [ ] Grafana Cloud API Token generated
- [ ] MongoDB Atlas cluster ready (or local MongoDB)
- [ ] Render account with active services

---

## Step 1: Install Dependencies Locally

```bash
cd backend
npm install
# Should add prom-client and winston
```

Verify installation:
```bash
npm ls prom-client winston
```

---

## Step 2: Update Backend Environment Variables

### In your local `.env` file (backend/):
```
MONGODB_URI=mongodb://...
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
LOG_LEVEL=info
NODE_ENV=production
```

### Test metrics endpoint locally:
```bash
npm run dev
# In another terminal:
curl http://localhost:5000/metrics
curl http://localhost:5000/health
```

Expected output from `/metrics`: Prometheus metrics in text format

---

## Step 3: Update Docker Images

Update your `Dockerfile` for backend to create log directory:

```dockerfile
# At the end of your backend Dockerfile:
RUN mkdir -p /var/log/backend
```

---

## Step 4: Deploy to Render

### Option A: Using render.yaml (Recommended)

```bash
git add .
git commit -m "Add Grafana Agent metrics and logging integration"
git push origin main
```

Render will automatically detect `render.yaml` and deploy all services.

### Option B: Manual Setup in Render Dashboard

1. **Create Grafana Agent Service:**
   - Name: `grafana-agent`
   - Runtime: Docker
   - Dockerfile Path: `./Dockerfile.grafana-agent`
   - Start Command: `/bin/grafana-agent -config.file=/etc/grafana-agent.yaml -server.http.address=0.0.0.0:$PORT`

2. **Set Environment Variables for grafana-agent:**
   - `GRAFANA_CLOUD_USER_ID` = Your Grafana Cloud User ID
   - `GRAFANA_CLOUD_API_TOKEN` = Your Grafana Cloud API Token
   - `BACKEND_URL` = `your-backend.onrender.com`
   - `GATEWAY_URL` = `your-gateway.onrender.com`
   - `RENDER_REGION` = `oregon` (or your region)

3. **Update Backend Service Environment:**
   - Ensure `LOG_LEVEL=info` is set
   - Keep `NODE_ENV=production`

---

## Step 5: Verify Deployment

### Check Backend Metrics Endpoint:
```bash
curl https://your-backend.onrender.com/metrics
# Should return Prometheus metrics
```

### Check Backend Health:
```bash
curl https://your-backend.onrender.com/health
# Should return: {"status":"OK","timestamp":"..."}
```

### Check Grafana Agent Logs:
In Render dashboard → grafana-agent service → Logs tab

Should see:
```
Grafana Agent started successfully
Connected to Prometheus
Connected to Loki
```

---

## Step 6: Connect to Grafana Cloud

1. Go to https://grafana.com/auth/login
2. Navigate to **Explore** → Select **Prometheus** data source
3. Enter your first query:

```promql
http_requests_total
```

4. Should see metrics from your backend!

---

## Step 7: Create Dashboards

### Create a new dashboard with these panels:

**Panel 1: Request Rate**
```promql
rate(http_requests_total[5m])
```

**Panel 2: P95 Latency**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Panel 3: Error Rate**
```promql
rate(errors_total[5m])
```

**Panel 4: Auth Success Rate**
```promql
rate(auth_attempts_total{status="success"}[5m]) / rate(auth_attempts_total[5m])
```

---

## Step 8: Set Up Alerts (Optional)

In Grafana Cloud:
1. Go to **Alerting** → **Alert Rules**
2. Create alert: "Backend Error Rate > 5%"
   ```promql
   rate(errors_total[5m]) > 0.05
   ```
3. Set notification channel (Slack, Email, PagerDuty, etc.)

---

## Troubleshooting

### Metrics not appearing in Grafana?

```bash
# 1. Check if metrics endpoint is accessible
curl -I https://your-backend.onrender.com/metrics

# 2. Check Grafana Agent logs
# Render dashboard → grafana-agent → Logs

# 3. Verify credentials in Render env vars
# Should match your Grafana Cloud account

# 4. Check Grafana Cloud data source
# Settings → Data Sources → Prometheus (verify URL)
```

### Logs not flowing?

```bash
# 1. Check if backend is writing logs
# Logs should appear in: Render dashboard → backend → Logs tab

# 2. Verify LOG_LEVEL in backend service
# Should be: info or debug

# 3. Check Grafana Agent connection
curl http://localhost:3100/loki/api/v1/label/job/values
# Should return available log jobs
```

### Service won't start?

```bash
# 1. Check if PORT env var is set
# Default: 5000 for backend

# 2. Check Docker image builds successfully
# Render dashboard → Logs showing dockerfile output

# 3. Verify all required env vars are set
# Especially GRAFANA_CLOUD_* and database connection strings
```

---

## File Checklist

Make sure all these files are committed and in your repo:

- [ ] `backend/package.json` (with prom-client, winston)
- [ ] `backend/src/metrics.ts`
- [ ] `backend/src/logger.ts`
- [ ] `backend/src/server.ts` (with metrics integration)
- [ ] `backend/Dockerfile` (creates /var/log/backend)
- [ ] `Dockerfile.grafana-agent`
- [ ] `grafana-agent-config.prod.yaml`
- [ ] `render.yaml`
- [ ] `.env.example`
- [ ] `.env.render`

---

## Success Indicators ✅

When everything is working, you should see:

1. ✅ Backend service running on Render
2. ✅ Grafana Agent service running on Render
3. ✅ `/metrics` endpoint returns Prometheus metrics
4. ✅ `/health` endpoint returns OK
5. ✅ Metrics appearing in Grafana Cloud Prometheus
6. ✅ Logs appearing in Grafana Cloud Loki
7. ✅ Dashboards showing real-time data
8. ✅ Alerts triggering for errors

---

## Need Help?

- **Grafana Cloud Docs**: https://grafana.com/docs/grafana-cloud/
- **Grafana Agent Docs**: https://grafana.com/docs/agent/latest/
- **Render Docs**: https://render.com/docs
- **Prometheus Queries**: https://prometheus.io/docs/prometheus/latest/querying/basics/
