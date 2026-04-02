# 🚀 Quick Start: Deploy Grafana Agent + Metrics on Render

## 5-Minute Deployment Checklist

### Phase 1: Get Credentials (5 mins)

- [ ] **Grafana Cloud Account**: https://grafana.com/auth/sign-in/
- [ ] **Create API Token**: 
  - Go to https://grafana.cloud/account/api-tokens
  - Click "Create API Token" → Name: `render-agent` → Role: `MetricsPublisher`
  - **Save your token** (looks like: `glc_xxxxxxxxxxxxx`)
- [ ] **Get User ID**:
  - Go to https://grafana.com/api/auth/profile
  - Copy your numeric `id` (e.g., `123456`)

### Phase 2: Update Backend (10 mins)

1. **Add dependencies to package.json**
   ```bash
   cd backend
   npm install prom-client winston
   ```

2. **Files already created for you:**
   - ✅ `src/metrics.ts` - Prometheus metrics
   - ✅ `src/logger.ts` - Structured logging
   - ✅ `src/server.ts` - Updated with metrics middleware

3. **Update your Render Backend service environment variables:**
   ```
   EXPOSE_METRICS=true
   LOG_LEVEL=info
   ```

### Phase 3: Deploy Grafana Agent (15 mins)

1. **Create New Web Service on Render**
   - https://dashboard.render.com
   - Click "New+" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service:**
   - **Name**: `grafana-agent`
   - **Branch**: `main`
   - **Root Directory**: `/` (your repo root)
   - **Build Command**: `true` (or leave blank)
   - **Start Command**: `/bin/grafana-agent -config.file=/etc/grafana-agent.yaml -server.http.address=0.0.0.0:$PORT`
   - **Dockerfile Path**: `Dockerfile.grafana-agent`

3. **Add Environment Variables:**
   ```
   GRAFANA_CLOUD_USER_ID=your_user_id_here
   GRAFANA_CLOUD_API_TOKEN=glc_xxxxxxxxxxxxx
   BACKEND_URL=your-backend.onrender.com
   GATEWAY_URL=your-gateway.onrender.com
   RENDER_REGION=us-east-1
   ```

4. **Set Health Check:**
   - Path: `/-/healthy`
   - Interval: 30s
   - Timeout: 10s

5. **Choose Plan:**
   - Free or Starter ($7/month)

6. **Deploy** - Click "Deploy"

### Phase 4: Verify Deployment (5 mins)

```bash
# Test agent health
curl https://your-grafana-agent.onrender.com/api/v1/liveness

# Test metrics endpoint on backend
curl https://your-backend.onrender.com/metrics

# Test health check
curl https://your-backend.onrender.com/health
```

### Phase 5: View Metrics in Grafana Cloud (5 mins)

1. **Login**: https://your-org.grafana.net
2. **Go to**: Explore → Select Prometheus
3. **Query examples:**
   - `up` - Service availability
   - `http_requests_total` - Total requests
   - `http_request_duration_seconds` - Response time
   - `node_up` - Node metrics

## File Structure Created

```
Gateway/
├── grafana-agent-config.prod.yaml    # Production config
├── Dockerfile.grafana-agent          # Agent container
├── .env.grafana-agent                # Environment template
├── GRAFANA_DEPLOYMENT.md             # Full documentation
├── RENDER_DEPLOYMENT_CHECKLIST.md    # This file
└── backend/
    ├── src/
    │   ├── metrics.ts                # Prometheus metrics library
    │   ├── logger.ts                 # Winston logging
    │   └── server.ts                 # Updated with middleware
    └── package.json                  # Updated with prom-client, winston
```

## Environment Variables Needed

### For Grafana Agent Service (on Render):
```
GRAFANA_CLOUD_USER_ID=your_numeric_id
GRAFANA_CLOUD_API_TOKEN=glc_xxxxxxxxxxxxx
BACKEND_URL=your-backend.onrender.com
GATEWAY_URL=your-gateway.onrender.com
RENDER_REGION=us-east-1
```

### For Backend Service (on Render):
```
EXPOSE_METRICS=true
LOG_LEVEL=info
```

## Key Metrics Monitored

- **HTTP Requests**: Method, route, status code, duration
- **Auth Attempts**: Success/failure rates
- **Database Operations**: Operation type, duration
- **Errors**: Error type and severity
- **System**: CPU, memory, uptime (Node.js default metrics)

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Grafana Agent Service | Free-$7/mo | On Render |
| Grafana Cloud | Free | Up to 10GB logs/month |
| Backend + Gateway | Existing | No additional cost |
| **Total** | **Free-$7/mo** | Very affordable |

## Common Issues & Solutions

### Issue: Agent not sending data
- ✅ Verify credentials in environment variables
- ✅ Check agent logs: Render Dashboard → grafana-agent → Logs
- ✅ Ensure backend is running with `EXPOSE_METRICS=true`

### Issue: Metrics not appearing in Grafana
- ✅ Wait 2-3 minutes for first scrape
- ✅ Check Grafana Cloud → Explore → Prometheus
- ✅ Query `up` to see which scrape jobs are working

### Issue: High agent CPU usage
- ✅ Increase scrape interval in config (currently 60s)
- ✅ Reduce number of metrics being scraped
- ✅ Upgrade to larger Render plan

## Next Steps After Deployment

1. **Create Custom Dashboards**
   - Grafana → Dashboards → New Dashboard
   - Add panels for your key metrics

2. **Set Up Alerts**
   - Grafana → Alerting → New Alert Rule
   - Alert when error rate > 5%
   - Alert when response time > 2s

3. **Create Runbooks**
   - Document how to investigate alerts
   - Create troubleshooting guides

4. **Monitor Costs**
   - Grafana Cloud Dashboard
   - Ensure you stay within free tier

## Support & Resources

- **Grafana Docs**: https://grafana.com/docs/agent/
- **Render Docs**: https://render.com/docs
- **Prometheus Metrics**: https://prometheus.io/docs/
- **Winston Logger**: https://github.com/winstonjs/winston

---

**Status**: ✅ Ready to deploy! Follow the checklist above.
