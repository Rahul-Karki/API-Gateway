# Grafana Agent Production Setup Guide

## 📋 File Structure & Purpose

```
Gateway/
├── docker-compose.yml              # ← LOCAL DEVELOPMENT ONLY
├── render.yaml                     # ← PRODUCTION ON RENDER (USE THIS)
├── k8s-grafana-agent.yaml          # ← Only if migrating to Kubernetes later
├── Dockerfile.grafana-agent        # ← Containerize Grafana Agent for Render
├── grafana-agent-config.yaml       # ← Local Docker config
├── grafana-agent-config.prod.yaml  # ← Production config (Render)
└── backend/src/
    ├── metrics.ts                  # ← Prometheus metrics library
    └── logger.ts                   # ← Winston structured logging
```

## 🎯 When to Use Each File

| File | Use Case | When |
|------|----------|------|
| **docker-compose.yml** | Local development with all services | Running `docker-compose up` on your machine |
| **render.yaml** | Production deployment specification | Deploying to Render (your current approach) |
| **k8s-grafana-agent.yaml** | Kubernetes deployment | **ONLY** if using AWS EKS, GCP GKE, or DigitalOcean Kubernetes |
| **Dockerfile.grafana-agent** | Container image definition | Building Docker image for Render |
| **grafana-agent-config.prod.yaml** | Production agent settings | Running on Render (references env vars) |

## ✅ Why You DON'T Need Kubernetes

You're using **Render** which provides:
- ✅ Containerization (Docker) built-in
- ✅ Managed deployment
- ✅ Auto-restart on failure
- ✅ Environment variables management
- ✅ Zero Kubernetes complexity

**Kubernetes is ONLY needed if you're using:**
- ❌ AWS EKS (Elastic Kubernetes Service)
- ❌ GCP GKE (Google Kubernetes Engine)
- ❌ Azure AKS (Azure Kubernetes Service)
- ❌ DigitalOcean Kubernetes
- ❌ Self-managed K8s cluster

## 🚀 Deployment Steps for Render

### Step 1: Add Environment Variables to Render

In your Render dashboard, set these for the **grafana-agent** service:

```
GRAFANA_CLOUD_USER_ID      = <your-user-id>
GRAFANA_CLOUD_API_TOKEN    = <your-api-token>
BACKEND_METRICS_TOKEN      = <optional-auth-token>
GATEWAY_AUTH_TOKEN         = <optional-auth-token>
RENDER_REGION              = oregon  (or your region)
```

### Step 2: Update Backend (package.json)

Add these dependencies:
```bash
npm install prom-client winston
```

### Step 3: Integrate with Express (backend/src/server.ts)

```typescript
import express from 'express';
import { metricsMiddleware, registerMetricsEndpoint } from './metrics';
import logger from './logger';

const app = express();

// Add metrics middleware EARLY
app.use(metricsMiddleware);

// Expose metrics endpoint
registerMetricsEndpoint(app);

// Add logger to requests
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ... rest of your routes
```

### Step 4: Deploy to Render

Push your code with updated `render.yaml`:
```bash
git add .
git commit -m "Add Grafana Agent metrics and logging"
git push origin main
```

Render will automatically:
1. Build the Dockerfile.grafana-agent image
2. Deploy grafana-agent service
3. Start collecting metrics from backend
4. Push logs/metrics to Grafana Cloud

### Step 5: View in Grafana Cloud

1. Go to https://grafana.com/auth/login
2. Navigate to **Dashboards** → Create new dashboard
3. Add panels with Prometheus queries:

```promql
# Request rate
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(errors_total[5m])
```

## 📊 Architecture

```
┌─────────────────────┐
│   Your Browser      │
└──────────┬──────────┘
           │ HTTPS
   ┌───────▼────────────────┐
   │   Render: Gateway      │
   │   (nginx:8080)         │
   └───────┬────────────────┘
           │ HTTP
   ┌───────▼────────────────┐
   │  Render: Backend       │
   │  (Node.js:5000)        │ ◄─── Exposes /metrics
   │  (MongoDB)             │
   └────────────────────────┘
           
   ┌──────────────────────────────────┐
   │  Render: Grafana Agent           │
   │  - Scrapes /metrics from Backend │
   │  - Collects logs                 │
   │  - Pushes to Grafana Cloud       │
   └──────────────┬───────────────────┘
                  │ HTTPS
   ┌──────────────▼──────────────┐
   │  Grafana Cloud              │
   │  - Prometheus (metrics)     │
   │  - Loki (logs)              │
   │  - Dashboards & Alerts      │
   └─────────────────────────────┘
```

## 🔧 Delete Kubernetes Files?

Since you're NOT using Kubernetes, you can delete:
- `k8s-grafana-agent.yaml` (not needed for Render)

Keep only what you need for Render:
```bash
# You can remove K8s files
rm k8s-grafana-agent.yaml
```

## 📈 Next Steps

1. ✅ Update `backend/package.json` (add prom-client, winston)
2. ✅ Add `metrics.ts` and `logger.ts` to backend
3. ✅ Integrate metrics in `server.ts`
4. ✅ Update `render.yaml` with Grafana Agent service
5. ✅ Set environment variables in Render dashboard
6. ✅ Deploy to Render
7. ✅ Create dashboards in Grafana Cloud

## 🆘 Troubleshooting

**Metrics not showing in Grafana?**
```bash
# Check if /metrics endpoint is reachable
curl -I https://backend.onrender.com/metrics
```

**Logs not appearing?**
```bash
# Verify credentials in Render environment
# Check Grafana Agent logs in Render dashboard
```

**Connection refused to backend?**
```bash
# Update render.yaml BACKEND_URL to your actual Render backend URL
# Format: your-service-name.onrender.com
```
