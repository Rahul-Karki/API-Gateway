import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const TERMINAL_LINES = [
  { text: "$ proxgate init --port 8080", delay: 0 },
  { text: "> Reverse proxy bound to :8080", delay: 600, green: true },
  { text: "> Rate limiter: 1000 req/min/IP", delay: 1100, green: true },
  { text: "> Cache layer: Redis @ localhost:6379", delay: 1700, green: true },
  { text: "> JWT auth middleware: enabled", delay: 2200, green: true },
  { text: "> Load balancer: round-robin (3 nodes)", delay: 2800, green: true },
  { text: "✓ Gateway online. Routing traffic.", delay: 3400, accent: true },
];

export default function HeroSection() {
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!termRef.current) return;
    const lines = termRef.current.querySelectorAll<HTMLElement>(".term-line");
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((el) => {
      const delay = Number(el.dataset.delay ?? 0);
      const timer = setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, delay);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        .hero-section {
          width: 100%;
          min-height: 100vh;
          background: #050814;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          padding: 120px 2rem 80px;
        }
        .hero-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,255,170,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,170,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%);
          pointer-events: none;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(0,255,170,0.15), transparent 70%);
          top: -100px; left: -100px;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(0,170,255,0.12), transparent 70%);
          bottom: -80px; right: 10%;
        }
        .hero-inner {
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          color: #00ffaa;
          background: rgba(0,255,170,0.08);
          border: 1px solid rgba(0,255,170,0.2);
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 28px;
          text-transform: uppercase;
        }
        .hero-badge .dot {
          width: 6px; height: 6px;
          background: #00ffaa;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .hero-headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.8rem, 5vw, 4.4rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin: 0 0 24px;
        }
        .hero-headline .accent { color: #00ffaa; }
        .hero-headline .dim { color: rgba(255,255,255,0.35); }
        .hero-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.88rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.85;
          max-width: 480px;
          margin-bottom: 40px;
        }
        .hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; }
        .btn-hero-main {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          color: #050814;
          background: linear-gradient(135deg, #00ffaa 0%, #00ddff 100%);
          padding: 14px 32px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
        }
        .btn-hero-main:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,255,170,0.4); }
        .btn-hero-outline {
          font-family: 'Syne', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          color: rgba(255,255,255,0.8);
          background: transparent;
          padding: 14px 32px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
        }
        .btn-hero-outline:hover { border-color: rgba(0,255,170,0.35); color: #00ffaa; background: rgba(0,255,170,0.05); }
        .terminal-wrap { position: relative; }
        .terminal-window {
          background: #0b0f1e;
          border: 1px solid rgba(0,255,170,0.18);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,255,170,0.06);
        }
        .term-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .term-dot { width: 12px; height: 12px; border-radius: 50%; }
        .term-dot.r { background: #ff5f57; }
        .term-dot.y { background: #febc2e; }
        .term-dot.g { background: #28c840; }
        .term-title { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: rgba(255,255,255,0.3); margin-left: 8px; }
        .term-body { padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 8px; min-height: 220px; }
        .term-line {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          line-height: 1.5;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.4s ease, transform 0.4s ease;
          color: rgba(255,255,255,0.55);
        }
        .term-line.green { color: #00ffaa; }
        .term-line.accent { color: #fff; font-weight: 600; margin-top: 4px; }
        .route-diagram {
          margin-top: 16px;
          display: flex;
          align-items: center;
          padding: 14px 18px;
          background: #0b0f1e;
          border: 1px solid rgba(0,255,170,0.12);
          border-radius: 10px;
          overflow: hidden;
        }
        .route-node {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          padding: 7px 12px;
          border-radius: 6px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rn-client { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); }
        .rn-gw { background: rgba(0,255,170,0.12); color: #00ffaa; border: 1px solid rgba(0,255,170,0.25); font-weight: 600; }
        .rn-svc { background: rgba(0,170,255,0.1); color: #00aaff; border: 1px solid rgba(0,170,255,0.2); }
        .route-arrow { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0,255,170,0.4), rgba(0,170,255,0.4)); position: relative; min-width: 20px; }
        .route-arrow::after { content: '→'; position: absolute; right: -6px; top: 50%; transform: translateY(-50%); font-size: 10px; color: rgba(0,255,170,0.7); }
        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; gap: 48px; }
          .hero-section { padding: 120px 1.25rem 60px; }
        }
      `}</style>

      <section className="hero-section">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">
              <span className="dot" />
              Production-grade API Gateway
            </div>
            <h1 className="hero-headline">
              Route smarter.<br />
              <span className="accent">Scale faster.</span><br />
              <span className="dim">Ship fearlessly.</span>
            </h1>
            <p className="hero-sub">
              ProxGate is a high-performance reverse proxy &amp; API gateway —
              with built-in rate limiting, response caching, JWT auth,
              and intelligent load balancing. One config. Zero compromise.
            </p>
            <div className="hero-ctas">
              <Link to="/features" className="btn-hero-main">Explore features ↗</Link>
            </div>
          </div>
          <div className="terminal-wrap">
            <div className="terminal-window">
              <div className="term-header">
                <div className="term-dot r" />
                <div className="term-dot y" />
                <div className="term-dot g" />
                <span className="term-title">proxgate — zsh</span>
              </div>
              <div className="term-body" ref={termRef}>
                {TERMINAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className={`term-line${line.green ? " green" : ""}${line.accent ? " accent" : ""}`}
                    data-delay={line.delay}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="route-diagram">
              <div className="route-node rn-client">Client</div>
              <div className="route-arrow" />
              <div className="route-node rn-gw">ProxGate</div>
              <div className="route-arrow" />
              <div className="route-node rn-svc">svc-a:3001</div>
              <div className="route-arrow" />
              <div className="route-node rn-svc">svc-b:3002</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}