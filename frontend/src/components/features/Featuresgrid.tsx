const FEATURES = [
  {
    icon: "⇄", tag: "CORE", title: "Reverse Proxy", accent: "#00ffaa",
    desc: "Transparently forward requests to any upstream. Full HTTP/1.1 & HTTP/2 support with connection pooling, TLS termination, and custom header injection.",
    code: `proxy_pass http://upstream:8080;\nproxy_set_header X-Real-IP $remote_addr;`,
  },
  {
    icon: "🛡", tag: "PROTECTION", title: "Rate Limiting", accent: "#ff6b6b",
    desc: "Sliding window, token bucket, or fixed counter — your choice. Per-IP, per-user, and per-route limits with Redis-backed distributed state.",
    code: `rate_limit:\n  strategy: sliding_window\n  limit: 1000\n  window: 60s`,
  },
  {
    icon: "⚡", tag: "PERFORMANCE", title: "Response Caching", accent: "#ffd93d",
    desc: "In-memory and Redis-backed cache layers with stale-while-revalidate, conditional GET support, and per-route TTL configuration.",
    code: `cache:\n  ttl: 300s\n  strategy: stale-while-revalidate\n  vary: [Authorization]`,
  },
  {
    icon: "⚖", tag: "SCALING", title: "Load Balancing", accent: "#00aaff",
    desc: "Round-robin, weighted, least-connections, and IP-hash strategies. Health checks with automatic failover ensure zero-downtime routing.",
    code: `upstream api_cluster {\n  server svc-a:3001 weight=3;\n  server svc-b:3002;\n  healthcheck /ping;\n}`,
  },
  {
    icon: "🔐", tag: "SECURITY", title: "Auth & JWT", accent: "#c084fc",
    desc: "Validate JWT tokens at the gateway layer before traffic reaches your services. Supports RS256, HS256, JWKS endpoints, and custom claim extraction.",
    code: `auth:\n  type: jwt\n  jwks_uri: https://auth.example/.well-known/jwks\n  claims: [sub, roles]`,
  },
  {
    icon: "📡", tag: "OBSERVABILITY", title: "Metrics & Tracing", accent: "#34d399",
    desc: "OpenTelemetry-native distributed tracing, Prometheus metrics endpoint, and structured JSON logs for full visibility into latency and throughput.",
    code: `telemetry:\n  tracing: otlp\n  metrics: prometheus\n  logs: json`,
  },
];

export default function FeatureGrid() {
  return (
    <>
      <style>{`
        .fg-section {
          width: 100%;
          background: #050814;
          padding: 40px 2rem 100px;
        }
        .fg-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .fg-card {
          background: #0a0e1e;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .fg-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: var(--card-accent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .fg-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-3px); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .fg-card:hover::before { opacity: 1; }
        .fg-card-top { display: flex; align-items: center; justify-content: space-between; }
        .fg-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .fg-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 100px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.35); }
        .fg-title { font-family: 'Syne', sans-serif; font-size: 1.12rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .fg-desc { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: rgba(255,255,255,0.4); line-height: 1.8; flex: 1; }
        .fg-code { background: #050814; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: rgba(255,255,255,0.32); line-height: 1.75; white-space: pre; overflow-x: auto; }
        @media (max-width: 900px) { .fg-inner { grid-template-columns: repeat(2, 1fr); } .fg-section { padding: 40px 1.25rem 80px; } }
        @media (max-width: 560px) { .fg-inner { grid-template-columns: 1fr; } }
      `}</style>
      <section className="fg-section">
        <div className="fg-inner">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="fg-card"
              style={{ "--card-accent": f.accent } as React.CSSProperties}
            >
              <div className="fg-card-top">
                <div className="fg-icon">{f.icon}</div>
                <span className="fg-tag">{f.tag}</span>
              </div>
              <div className="fg-title">{f.title}</div>
              <p className="fg-desc">{f.desc}</p>
              <pre className="fg-code">{f.code}</pre>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}