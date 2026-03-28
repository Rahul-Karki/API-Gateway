import { Link } from "react-router-dom";

export default function CTASection() {
  return (
    <>
      <style>{`
        .cta-section {
          width: 100%;
          background: #050814;
          padding: 120px 2rem;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .cta-glow {
          position: absolute;
          width: 600px; height: 300px;
          background: radial-gradient(ellipse, rgba(0,255,170,0.1), transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .cta-inner { max-width: 680px; margin: 0 auto; position: relative; z-index: 1; }
        .cta-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          color: #00ffaa;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .cta-headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.2rem, 4vw, 3.4rem);
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 20px;
        }
        .cta-headline span { color: #00ffaa; }
        .cta-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.83rem;
          color: rgba(255,255,255,0.42);
          line-height: 1.85;
          margin-bottom: 44px;
        }
        .cta-buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .cta-btn-main {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: #050814;
          background: linear-gradient(135deg, #00ffaa, #00ddff);
          padding: 15px 36px;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.25s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cta-btn-main:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(0,255,170,0.45); }
        .cta-btn-ghost {
          font-family: 'Syne', sans-serif;
          font-weight: 600;
          font-size: 1rem;
          color: rgba(255,255,255,0.7);
          background: transparent;
          padding: 15px 36px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          text-decoration: none;
          transition: all 0.25s;
        }
        .cta-btn-ghost:hover { border-color: rgba(0,255,170,0.3); color: #00ffaa; }
        .cta-note {
          margin-top: 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          color: rgba(255,255,255,0.22);
          letter-spacing: 0.04em;
        }
        @media (max-width: 640px) { .cta-section { padding: 80px 1.25rem; } }
      `}</style>
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="cta-inner">
          <div className="cta-label">// Start building today</div>
          <h2 className="cta-headline">One gateway.<br /><span>Infinite routes.</span></h2>
          <p className="cta-sub">
            Deploy ProxGate in minutes. Bring your own services,
            configure routing rules, and let ProxGate handle the rest —
            auth, caching, rate limits, and load balancing included.
          </p>
          <div className="cta-buttons">
            <Link to="/signup" className="cta-btn-main">Start free →</Link>
            <Link to="/features" className="cta-btn-ghost">See all features</Link>
          </div>
          <p className="cta-note">No credit card required · Free tier available · Open-source core</p>
        </div>
      </section>
    </>
  );
}