# Production Deployment Guide: Grafana Agent on Render

## Step 1: Get Grafana Cloud Credentials

1. **Sign up / Login to Grafana Cloud**
   - Go to https://grafana.com/auth/sign-in/
   - Create free account or login

2. **Get API Token**
   - Go to https://grafana.cloud/account/api-tokens
   - Click "Create API Token"
   - Name: `render-agent`
   - Role: `MetricsPublisher`
   - Copy the token

3. **Get User ID**
   - Go to https://grafana.com/api/auth/profile
   - Note your `ID` field (e.g., `12345`)

## Step 2: Prepare Your Services for Metrics Collection

### For Backend Service (on Render):

1. **Update backend package.json**
   ```bash
   npm install prom-client winston
   ```

2. **Integrate metrics in your server.ts**
   - See the code examples below

3. **Add environment variable to Render dashboard**
   - Set: `METRICS_PORT=9090`

### For Gateway/Nginx:

1. **Deploy nginx-prometheus-exporter** alongside your gateway
   - This exposes nginx metrics on port 9113

## Step 3: Deploy Grafana Agent Service on Render

### Option A: Using Docker (Recommended)

1. **Create new Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Select "Build and deploy from a Git repository"

2. **Configure the service**
   ```
   Name: grafana-agent
   Region: Same as your backend/gateway (e.g., us-east-1)
   Branch: main
   Build Command: (leave empty or `true`)
   Start Command: /bin/grafana-agent -config.file=/etc/grafana-agent.yaml -server.http.address=0.0.0.0:$PORT
   ```

3. **Set Environment Variables**
   - Under "Environment"
   - Add from `.env.grafana-agent`:
     ```
     GRAFANA_CLOUD_USER_ID=<your_id>
     GRAFANA_CLOUD_API_TOKEN=<your_token>
     BACKEND_URL=your-backend.onrender.com
     GATEWAY_URL=your-gateway.onrender.com
     RENDER_REGION=us-east-1
     ```

4. **Configure Instance**
   - Plan: Free or Starter ($7/month)
   - Root Directory: `/` (your repo root)
   - Runtime: Docker
   - Dockerfile Path: `Dockerfile.grafana-agent`

5. **Add Health Check**
   - Health Check Path: `/-/healthy`
   - Check Interval: 30s

### Option B: Manual Docker Push (Alternative)

```bash
# Build image
docker build -f Dockerfile.grafana-agent -t grafana-agent:latest .

# Tag for registry
docker tag grafana-agent:latest <your-render-registry>/grafana-agent:latest

# Push to registry
docker push <your-render-registry>/grafana-agent:latest
```

## Step 4: Update Backend Service

### Expose Metrics Endpoint

In your backend for Render, set environment:
```env
EXPOSE_METRICS=true
METRICS_PORT=9090
```

And in your code (see backend integration below).

## Step 5: Verify Deployment

1. **Check Agent Health**
   ```bash
   curl https://grafana-agent.onrender.com/api/v1/liveness
   ```

2. **View Logs**
   - Go to Render dashboard
   - Select grafana-agent service
   - Check logs for errors

3. **Check Grafana Cloud**
   - Go to https://grafana.com/a/grafana-cloud-portal
   - Dashboard → Explore
   - Query: `node_up` (should show data)

## Step 6: Access Grafana Dashboards

1. **Login to Grafana**
   - https://your-org.grafana.net
   - Username: Your Grafana Cloud email
   - Password: Your Grafana password

2. **Import Pre-built Dashboards**
   - Go to Dashboards → Browse
   - Search for "Prometheus" or "Node Exporter"
   - Click "Import"

3. **Create Custom Dashboard**
   - Dashboards → New Dashboard
   - Add panels with these queries:
     - `rate(http_requests_total[1m])` - Request rate
     - `http_request_duration_seconds_bucket` - Request duration
     - `errors_total` - Error count

## Troubleshooting

### Agent not connecting to Grafana Cloud
- Verify credentials: `GRAFANA_CLOUD_USER_ID` and `GRAFANA_CLOUD_API_TOKEN`
- Check firewall: ports 443 (HTTPS) must be open

### No metrics appearing
- Verify backend is exposing `/metrics` endpoint
- Check backend URL in agent config
- Ensure backend is running with `EXPOSE_METRICS=true`

### Slow performance
- Check agent logs for errors
- Reduce scrape interval in config (currently 60s)
- Monitor agent's CPU/memory usage on Render

## Cost Estimation

- **Grafana Agent Service**: Free (or $7+ depending on plan)
- **Grafana Cloud**: Free tier includes 10GB logs/month
- **Total**: Usually free or very cheap

## Next Steps

- [ ] Get Grafana Cloud credentials
- [ ] Update backend with metrics middleware
- [ ] Deploy Grafana Agent service
- [ ] Configure monitoring alerts
- [ ] Create custom dashboards
- [ ] Document runbooks
