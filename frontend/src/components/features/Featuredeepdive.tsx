const FLOW_STEPS = [
  { id: "01", title: "Client Request",   desc: "Any HTTP/HTTPS request arrives at the gateway edge.", color: "#00ffaa" },
  { id: "02", title: "Auth Middleware",  desc: "JWT tokens validated, API keys checked, unauthorized requests blocked instantly.", color: "#c084fc" },
  { id: "03", title: "Rate Limiter",     desc: "Per-IP and per-user counters evaluated against configured thresholds.", color: "#ff6b6b" },
  { id: "04", title: "Cache Check",      desc: "Cache hit? Serve from memory in <1ms. Miss? Continue upstream.", color: "#ffd93d" },
  { id: "05", title: "Load Balancer",    desc: "A healthy upstream is selected via your configured strategy. Request proxied.", color: "#00aaff" },
  { id: "06", title: "Response & Cache", desc: "Response returned to client, result cached for subsequent requests.", color: "#34d399" },
];

export default function FeatureDeepDive() {
  return (
    <>
      <style>{`
        .dd-section {
          width: 100%;
          background: #080c1a;
          padding: 100px 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .dd-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .dd-label { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: #00ffaa; margin-bottom: 16px; }
        .dd-headline { font-family: 'Syne', sans-serif; font-size: clamp(1.8rem, 3vw, 2.6rem); font-weight: 800; color: #fff; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 16px; }
        .dd-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: rgba(255,255,255,0.36); line-height: 1.85; }
        .flow-diagram { display: flex; flex-direction: column; }
        .flow-step { display: flex; align-items: flex-start; gap: 16px; padding: 18px 0; position: relative; }
        .flow-step:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 19px; top: 54px;
          width: 2px;
          height: calc(100% - 34px);
          background: linear-gradient(to bottom, var(--step-color), transparent);
          opacity: 0.25;
        }
        .flow-id {
          width: 38px; height: 38px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid var(--step-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--step-color);
          background: rgba(0,0,0,0.4);
        }
        .flow-title { font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 3px; }
        .flow-desc { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: rgba(255,255,255,0.33); line-height: 1.65; }
        @media (max-width: 900px) {
          .dd-inner { grid-template-columns: 1fr; gap: 48px; }
          .dd-section { padding: 72px 1.25rem; }
        }
      `}</style>
      <section className="dd-section">
        <div className="dd-inner">
          <div>
            <div className="dd-label">// Request lifecycle</div>
            <h2 className="dd-headline">How every request flows through ProxGate</h2>
            <p className="dd-sub">
              Every request passes through a deterministic middleware pipeline.
              Auth, rate limiting, caching, and proxying — in exactly that order,
              every time. Predictable, auditable, and fast.
            </p>
          </div>
          <div className="flow-diagram">
            {FLOW_STEPS.map((step) => (
              <div
                key={step.id}
                className="flow-step"
                style={{ "--step-color": step.color } as React.CSSProperties}
              >
                <div className="flow-id">{step.id}</div>
                <div>
                  <div className="flow-title">{step.title}</div>
                  <div className="flow-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}