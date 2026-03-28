import { Link } from "react-router-dom";

export default function FeaturesCTA() {
  return (
    <>
      <style>{`
        .fcta {
          width: 100%;
          background: #050814;
          padding: 100px 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .fcta-glow {
          position: absolute;
          width: 500px; height: 250px;
          background: radial-gradient(ellipse, rgba(0,170,255,0.1), transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .fcta-inner { max-width: 600px; margin: 0 auto; position: relative; z-index: 1; }
        .fcta-headline { font-family: 'Syne', sans-serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; color: #fff; letter-spacing: -0.03em; margin-bottom: 16px; }
        .fcta-headline span { color: #00ffaa; }
        .fcta-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: rgba(255,255,255,0.38); line-height: 1.85; margin-bottom: 36px; }
        .fcta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .fcta-btn-main { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.95rem; color: #050814; background: linear-gradient(135deg, #00ffaa, #00ddff); padding: 14px 32px; border-radius: 8px; text-decoration: none; transition: all 0.25s; }
        .fcta-btn-main:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(0,255,170,0.4); }
        .fcta-btn-docs { font-family: 'Syne', sans-serif; font-weight: 600; font-size: 0.95rem; color: rgba(255,255,255,0.65); background: transparent; padding: 14px 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); text-decoration: none; transition: all 0.25s; }
        .fcta-btn-docs:hover { border-color: rgba(0,255,170,0.3); color: #00ffaa; }
        @media (max-width: 640px) { .fcta { padding: 72px 1.25rem; } }
      `}</style>
      <section className="fcta">
        <div className="fcta-glow" />
        <div className="fcta-inner">
          <h2 className="fcta-headline">Ready to <span>ship faster</span>?</h2>
          <p className="fcta-sub">
            Deploy your first gateway in under 5 minutes. No vendor lock-in,
            no black boxes — just clean, composable infrastructure.
          </p>
          <div className="fcta-btns">
            <Link to="/signup" className="fcta-btn-main">Start free →</Link>
          </div>
        </div>
      </section>
    </>
  );
}