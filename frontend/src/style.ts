export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  :root {
    --bg: #050810;
    --surface: #0c1120;
    --surface2: #111827;
    --border: #1a2540;
    --accent: #00ffe0;
    --accent2: #ff4d6d;
    --accent3: #7b61ff;
    --accent4: #ffd166;
    --text: #e8eaf2;
    --muted: #5a6480;
    --glow: 0 0 40px rgba(0,255,224,0.15);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    overflow-x: hidden;
    min-height: 100vh;
  }

  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(0,255,224,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,224,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    z-index: 0;
  }

  @keyframes spin-slow { to { transform: rotate(360deg); } }
  @keyframes float1 {
    0%, 100% { transform: translate(0,0); }
    50% { transform: translate(30px,-40px); }
  }
  @keyframes float2 {
    0%, 100% { transform: translate(0,0); }
    50% { transform: translate(-30px,30px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.4; transform:scale(0.7); }
  }
  @keyframes blink {
    0%,100% { opacity:1; }
    50%      { opacity:0; }
  }
  @keyframes scaleIn {
    from { opacity:0; transform:scale(0.95); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes conicSpin {
    to { transform: rotate(360deg); }
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
`;