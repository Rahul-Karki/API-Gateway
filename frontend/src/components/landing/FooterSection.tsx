import { Link } from "react-router-dom";

const LINKS = {
  Product: [
    { label: "Features", to: "/features" },
    { label: "Changelog", to: "/changelog" },
    { label: "Pricing", to: "/pricing" },
    { label: "Roadmap", to: "/roadmap" },
  ],
  Developers: [
    { label: "Docs", to: "/docs" },
    { label: "API Reference", to: "/api-reference" },
    { label: "SDKs", to: "/sdks" },
    { label: "Status", to: "/status" },
  ],
  Company: [
    { label: "About", to: "/about" },
    { label: "Blog", to: "/blog" },
    { label: "Careers", to: "/careers" },
    { label: "Contact", to: "/contact" },
  ],
};

export default function FooterSection() {
  return (
    <>
      <style>{`
        .footer {
          width: 100%;
          background: #030610;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 64px 2rem 36px;
          margin-top: auto;
        }
        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.5fr repeat(3, 1fr);
          gap: 48px;
        }
        .footer-brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 1.2rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }
        .footer-brand-name span { color: #00ffaa; }
        .footer-brand-desc {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.73rem;
          color: rgba(255,255,255,0.28);
          line-height: 1.75;
          max-width: 220px;
        }
        .footer-col-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 16px;
        }
        .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .footer-col a {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.76rem;
          color: rgba(255,255,255,0.3);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-col a:hover { color: #00ffaa; }
        .footer-bottom {
          max-width: 1280px;
          margin: 40px auto 0;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          color: rgba(255,255,255,0.18);
        }
        @media (max-width: 900px) {
          .footer-inner { grid-template-columns: 1fr 1fr; }
          .footer { padding: 48px 1.25rem 28px; }
        }
        @media (max-width: 480px) {
          .footer-inner { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
        }
      `}</style>
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand-name">Prox<span>Gate</span></div>
            <p className="footer-brand-desc">
              High-performance API gateway &amp; reverse proxy for modern backend architectures.
            </p>
          </div>
          {Object.entries(LINKS).map(([col, items]) => (
            <div key={col} className="footer-col">
              <div className="footer-col-title">{col}</div>
              <ul>
                {items.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2025 ProxGate. All rights reserved.</span>
          <span>Built with ♥ for the open web</span>
        </div>
      </footer>
    </>
  );
}