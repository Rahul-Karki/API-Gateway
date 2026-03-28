export default function FeaturesHero() {
  return (
    <>
      <style>{`
        .fhero {
          width: 100%;
          background: #050814;
          padding: 160px 2rem 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .fhero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,255,170,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,170,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 80% at 50% 0%, black, transparent);
          pointer-events: none;
        }
        .fhero-glow {
          position: absolute;
          width: 700px; height: 300px;
          background: radial-gradient(ellipse, rgba(0,170,255,0.12), transparent 70%);
          top: 0; left: 50%; transform: translateX(-50%);
          pointer-events: none;
        }
        .fhero-inner { max-width: 800px; margin: 0 auto; position: relative; z-index: 1; }
        .fhero-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #00ffaa;
          margin-bottom: 20px;
        }
        .fhero-headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 20px;
        }
        .fhero-headline span { color: #00ffaa; }
        .fhero-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.86rem;
          color: rgba(255,255,255,0.42);
          line-height: 1.9;
        }
        @media (max-width: 640px) { .fhero { padding: 130px 1.25rem 60px; } }
      `}</style>
      <section className="fhero">
        <div className="fhero-glow" />
        <div className="fhero-inner">
          <div className="fhero-label">// What ProxGate does</div>
          <h1 className="fhero-headline">Every feature your<br /><span>gateway needs</span></h1>
          <p className="fhero-sub">
            From edge caching to JWT validation — ProxGate ships the building blocks
            so you focus on your application, not your infrastructure.
          </p>
        </div>
      </section>
    </>
  );
}