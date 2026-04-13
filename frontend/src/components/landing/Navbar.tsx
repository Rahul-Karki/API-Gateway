import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        .nav-root {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          transition: background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease;
          padding: 0 2rem;
        }
        .nav-root.scrolled {
          background: rgba(5, 8, 20, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 255, 170, 0.1);
        }
        .nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .nav-logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #00ffaa, #00aaff);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: #050814;
          flex-shrink: 0;
        }
        .nav-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.15rem;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .nav-logo-text span { color: #00ffaa; }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
          list-style: none;
        }
        .nav-links a {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.76rem;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.2s;
        }
        .nav-links a:hover,
        .nav-links a.active { color: #00ffaa; }

        .nav-actions { display: flex; align-items: center; gap: 10px; }

        .btn-ghost {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.76rem;
          color: rgba(255,255,255,0.7);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.14);
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .btn-ghost:hover { border-color: rgba(0,255,170,0.35); color: #00ffaa; }

        .btn-primary-nav {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.76rem;
          font-weight: 600;
          color: #050814;
          background: linear-gradient(135deg, #00ffaa, #00ddff);
          border: none;
          padding: 9px 22px;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.25s;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .btn-primary-nav:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,255,170,0.35);
        }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-root { padding: 0 1.25rem; }
        }
        @media (max-width: 480px) {
          .btn-ghost { display: none; }
        }
      `}</style>

      <nav className={`nav-root${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <div className="nav-logo-icon">GW</div>
            <span className="nav-logo-text">Prox<span>Gate</span></span>
          </Link>

          {!loading && !isAuthenticated && (
            <div className="nav-actions">
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/signup" className="btn-primary-nav">Get started →</Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}