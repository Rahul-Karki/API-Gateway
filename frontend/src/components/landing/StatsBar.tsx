const STATS = [
  { value: "< 2ms", label: "Avg proxy latency" },
  { value: "1M+", label: "Req/min capacity" },
  { value: "99.99%", label: "Uptime SLA" },
  { value: "10x", label: "Cache hit speedup" },
];

export default function StatsBar() {
  return (
    <>
      <style>{`
        .stats-bar {
          width: 100%;
          background: #080c1a;
          border-top: 1px solid rgba(0,255,170,0.07);
          border-bottom: 1px solid rgba(0,255,170,0.07);
          padding: 44px 2rem;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .stat-item {
          text-align: center;
          padding: 0 2rem;
          position: relative;
        }
        .stat-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0; top: 10%;
          height: 80%; width: 1px;
          background: rgba(255,255,255,0.06);
        }
        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #00ffaa;
          letter-spacing: -0.04em;
          margin-bottom: 4px;
        }
        .stat-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        @media (max-width: 640px) {
          .stats-inner { grid-template-columns: repeat(2, 1fr); gap: 28px; }
          .stat-item::after { display: none; }
          .stats-bar { padding: 40px 1.25rem; }
        }
      `}</style>
      <section className="stats-bar">
        <div className="stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}