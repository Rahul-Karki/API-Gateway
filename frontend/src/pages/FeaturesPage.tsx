import React, { useState } from 'react';
import { FeatureSection, ComparisonRow } from '../types/landing';

interface FeaturesPageProps {
  onNavigateHome: () => void;
  onSignup: () => void;
}

/* ─── Data ──────────────────────────────────────────────── */
const featureSections: FeatureSection[] = [
  {
    id: 'routing', icon: '🔀', title: 'Smart Routing', subtitle: 'NGINX-powered rule engine with TypeScript configuration',
    cards: [
      { icon: '📍', title: 'Path-Based Routing', accentColor: 'var(--accent)',
        desc: 'Route requests to different upstream services based on URL path prefixes, exact matches, or regex patterns configured through the TypeScript rule engine.',
        tags: [{ label: 'NGINX' }, { label: 'Regex' }] },
      { icon: '🏷️', title: 'Header-Based Routing', accentColor: 'var(--accent)',
        desc: 'Inspect request headers like X-Route-Tag, Accept, or custom headers to direct traffic — ideal for canary and A/B deployments.',
        tags: [{ label: 'Headers' }, { label: 'Canary' }] },
      { icon: '🔄', title: 'Dynamic Upstream Config', accentColor: 'var(--accent)',
        desc: 'Modify NGINX upstream targets at runtime via the TypeScript admin API without reloading the server. Hot-reload routing rules on the fly.',
        tags: [{ label: 'Hot Reload' }, { label: 'TypeScript' }] },
      { icon: '🌐', title: 'Versioned API Routing', accentColor: 'var(--accent)',
        desc: 'Route /api/v1, /api/v2, and /api/v3 to distinct upstream clusters, with graceful deprecation rules and automatic redirects.',
        tags: [{ label: 'Versioning' }, { label: 'Deprecation' }] },
    ],
  },
  {
    id: 'auth', icon: '🔐', title: 'Auth & Security', subtitle: 'Multi-strategy authentication handled at the gateway layer',
    cards: [
      { icon: '🎫', title: 'JWT Validation', accentColor: 'var(--accent2)',
        desc: 'Validate JWT tokens at the gateway using RS256/HS256 algorithms. Claims extracted and forwarded as headers to upstream services.',
        tags: [{ label: 'JWT', variant: 'red' }, { label: 'RS256', variant: 'red' }] },
      { icon: '🔑', title: 'API Key Management', accentColor: 'var(--accent2)',
        desc: 'Issue, rotate, and revoke API keys with per-key rate limits and scope definitions. Keys validated against Redis with microsecond latency.',
        tags: [{ label: 'API Keys', variant: 'red' }, { label: 'Redis', variant: 'red' }] },
      { icon: '🛡️', title: 'mTLS Support', accentColor: 'var(--accent2)',
        desc: 'Enforce mutual TLS between services via NGINX ssl_verify_client directive. Test client certificate chains directly from the React UI.',
        tags: [{ label: 'mTLS', variant: 'red' }, { label: 'SSL', variant: 'red' }] },
      { icon: '🚫', title: 'IP Allow / Block Lists', accentColor: 'var(--accent2)',
        desc: 'Define CIDR-based allow or block rules that NGINX enforces at the connection level, before any routing or auth processing.',
        tags: [{ label: 'CIDR', variant: 'red' }, { label: 'Firewall', variant: 'red' }] },
    ],
  },
  {
    id: 'rate-limiting', icon: '⚡', title: 'Rate Limiting', subtitle: 'Fine-grained traffic control powered by NGINX and Redis',
    cards: [
      { icon: '🪣', title: 'Token Bucket Algorithm', accentColor: 'var(--accent3)',
        desc: 'Classic token bucket with configurable refill rates and burst sizes. Test how clients behave when approaching and exceeding rate limits.',
        tags: [{ label: 'Token Bucket', variant: 'purple' }] },
      { icon: '🪟', title: 'Sliding Window Counters', accentColor: 'var(--accent3)',
        desc: 'Prevents boundary exploitation with Redis-backed sliding window rate limiting, configurable per route, per user, or per API key.',
        tags: [{ label: 'Sliding Window', variant: 'purple' }, { label: 'Redis', variant: 'purple' }] },
      { icon: '📊', title: 'Live Quota Dashboard', accentColor: 'var(--accent3)',
        desc: 'React dashboard showing real-time request counts, quota remaining, throttle events, and per-client rate limit breaches via WebSocket.',
        tags: [{ label: 'WebSocket', variant: 'purple' }, { label: 'React', variant: 'purple' }] },
      { icon: '🎚️', title: 'Custom Rate Limit Policies', accentColor: 'var(--accent3)',
        desc: 'Define TypeScript policy objects — different limits for free vs paid tiers, burst allowances, and graceful 429 response bodies.',
        tags: [{ label: 'TypeScript', variant: 'purple' }, { label: 'Tiers', variant: 'purple' }] },
    ],
  },
  {
    id: 'load-balancing', icon: '⚖️', title: 'Load Balancing', subtitle: 'NGINX upstream groups with intelligent distribution strategies',
    cards: [
      { icon: '🔁', title: 'Round Robin & Weighted', accentColor: 'var(--accent4)',
        desc: 'Classic round robin with optional weights — push 80% of traffic to a new deployment while retaining 20% on stable servers.',
        tags: [{ label: 'Weighted', variant: 'yellow' }, { label: 'NGINX', variant: 'yellow' }] },
      { icon: '🏃', title: 'Least Connections', accentColor: 'var(--accent4)',
        desc: 'Direct traffic to the upstream with fewest active connections, perfect for mixed workloads where response times vary significantly.',
        tags: [{ label: 'Least Conn', variant: 'yellow' }] },
      { icon: '🏥', title: 'Health Checks', accentColor: 'var(--accent4)',
        desc: 'Active and passive health checks with configurable thresholds. Failed upstreams are automatically removed and re-added on recovery.',
        tags: [{ label: 'Health Check', variant: 'yellow' }, { label: 'Auto-Failover', variant: 'yellow' }] },
      { icon: '📌', title: 'Sticky Sessions', accentColor: 'var(--accent4)',
        desc: 'Cookie-based and IP-hash session persistence for stateful applications — with configurable TTL and fallback behavior.',
        tags: [{ label: 'Sessions', variant: 'yellow' }, { label: 'IP Hash', variant: 'yellow' }] },
    ],
  },
  {
    id: 'monitoring', icon: '📡', title: 'Monitoring & Observability', subtitle: 'Full request visibility from ingress to upstream',
    cards: [
      { icon: '🔭', title: 'Request Inspector', accentColor: 'var(--accent)',
        desc: 'Capture and replay any request. View exact headers, body, routing decisions, upstream selection, and response metadata side by side.',
        tags: [{ label: 'Inspector' }, { label: 'Replay' }] },
      { icon: '📈', title: 'Latency Histograms', accentColor: 'var(--accent)',
        desc: 'p50/p95/p99 latency breakdown per route, per upstream, and per time window. Exported as Prometheus metrics for Grafana.',
        tags: [{ label: 'Prometheus' }, { label: 'Grafana' }] },
      { icon: '🪵', title: 'Structured Access Logs', accentColor: 'var(--accent)',
        desc: 'NGINX logs enriched with TypeScript fields — auth status, user ID, matched route rule, rate limit bucket, and custom trace IDs.',
        tags: [{ label: 'JSON Logs' }, { label: 'Tracing' }] },
      { icon: '🚨', title: 'Alerting Rules', accentColor: 'var(--accent)',
        desc: 'Define threshold alerts on error rate, latency spikes, upstream downtime, or abnormal traffic — delivered via webhook or in-app.',
        tags: [{ label: 'Alerts' }, { label: 'Webhooks' }] },
    ],
  },
];

const comparisonRows: ComparisonRow[] = [
  { capability: 'Centralized Authentication',   without: '✕',              with: '✓', withOk: true },
  { capability: 'Rate Limiting per Client',      without: '✕',              with: '✓', withOk: true },
  { capability: 'SSL Termination',               without: 'Manual per service', with: '✓ Single point', withOk: true },
  { capability: 'Request / Response Logging',    without: 'Per-service setup',  with: '✓ Automatic', withOk: true },
  { capability: 'Load Balancing',                without: '✕',              with: '✓ Multiple strategies', withOk: true },
  { capability: 'Circuit Breaking',              without: '✕',              with: '✓', withOk: true },
  { capability: 'API Versioning',                without: 'Hardcoded in clients', with: '✓ Dynamic routing', withOk: true },
  { capability: 'Request Transformation',        without: '✕',              with: '✓ Header rewrite, body map', withOk: true },
];

const CATEGORIES = ['All Features', 'Routing', 'Auth & Security', 'Rate Limiting', 'Monitoring', 'Load Balancing'];

/* ─── Styles ────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: { position: 'relative', zIndex: 1 },

  /* hero */
  pageHero: {
    position: 'relative', zIndex: 1,
    padding: '10rem 3rem 5rem', textAlign: 'center', overflow: 'hidden',
  },
  heroDivider: {
    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: 1, height: 80,
    background: 'linear-gradient(to bottom,transparent,var(--accent))',
  },
  pageTag: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: 'rgba(0,255,224,0.05)', border: '1px solid rgba(0,255,224,0.2)',
    color: 'var(--accent)', fontSize: '0.7rem', letterSpacing: '2px',
    textTransform: 'uppercase', padding: '0.4rem 1rem', borderRadius: 2,
    marginBottom: '2rem', animation: 'fadeUp 0.5s ease both',
  },
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 800,
    letterSpacing: '-2px', lineHeight: 1, marginBottom: '1.2rem',
    animation: 'fadeUp 0.5s 0.1s ease both',
  },
  h1em: { color: 'var(--accent)', fontStyle: 'normal' },
  heroDesc: {
    color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.8,
    maxWidth: 500, margin: '0 auto', animation: 'fadeUp 0.5s 0.2s ease both',
  },

  /* categories */
  categories: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
    position: 'relative', zIndex: 1,
  },
  catBtn: {
    padding: '1rem 1.8rem', background: 'transparent',
    border: 'none', borderRight: '1px solid var(--border)',
    fontFamily: "'DM Mono', monospace",
    fontSize: '0.72rem', letterSpacing: '1.5px', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'all 0.2s',
  },

  /* features main */
  main: { position: 'relative', zIndex: 1, padding: '5rem 3rem', maxWidth: 1200, margin: '0 auto' },
  fsHeader: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' },
  fsIcon: { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 },
  fsTitle: { fontFamily: "'Syne', sans-serif", fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' },
  fsSub: { fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 1, background: 'var(--border)' },
  card: { padding: '2rem', transition: 'background 0.3s', cursor: 'default', position: 'relative', overflow: 'hidden' },
  cardIcon: { fontSize: '1.5rem', marginBottom: '1rem', display: 'block' },
  cardTitle: { fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' },
  cardDesc: { fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.75 },
  cardTags: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1.2rem' },

  /* comparison */
  comparison: { position: 'relative', zIndex: 1, padding: '0 3rem 5rem' },
  compTitle: { fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '2rem', textAlign: 'center' },
  tableWrap: { maxWidth: 900, margin: '0 auto', overflowX: 'auto' },

  /* arch */
  arch: { position: 'relative', zIndex: 1, padding: '0 3rem 5rem' },
  archTitle: { fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '3rem', textAlign: 'center' },
  archDiagram: { maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 },
  archRow: { display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' },
  archBox: { background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.6rem', textAlign: 'center', minWidth: 140, transition: 'border-color 0.2s', position: 'relative' },
  archBoxTitle: { fontFamily: "'Syne', sans-serif", fontSize: '0.85rem', fontWeight: 700 },
  archBoxSub: { fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.2rem' },
  archArrow: { textAlign: 'center', padding: '0.6rem', color: 'var(--muted)', fontSize: '1.2rem', display: 'flex', justifyContent: 'center' },
  archFlowLabel: { fontSize: '0.6rem', color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', margin: '0.3rem 0' },

  /* final cta */
  finalCta: { position: 'relative', zIndex: 1, padding: '6rem 3rem', textAlign: 'center', borderTop: '1px solid var(--border)' },
  finalTitle: { fontFamily: "'Syne', sans-serif", fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem' },
  finalDesc: { color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '2rem' },
  finalBtns: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },

  footer: { borderTop: '1px solid var(--border)', padding: '2rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 },
  footerLeft: { fontSize: '0.72rem', color: 'var(--muted)' },
  footerRight: { display: 'flex', gap: '1.5rem' },
  footerLink: { fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'none', fontFamily: "'DM Mono', monospace", background: 'none', border: 'none' },
};

const tagColor = (variant?: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    red:    { background:'rgba(255,77,109,0.08)',  color:'var(--accent2)', border:'1px solid rgba(255,77,109,0.2)' },
    purple: { background:'rgba(123,97,255,0.08)', color:'var(--accent3)', border:'1px solid rgba(123,97,255,0.2)' },
    yellow: { background:'rgba(255,209,102,0.08)',color:'var(--accent4)', border:'1px solid rgba(255,209,102,0.2)' },
    default:{ background:'rgba(0,255,224,0.06)',  color:'var(--accent)',  border:'1px solid rgba(0,255,224,0.12)' },
  };
  return map[variant ?? 'default'] ?? map['default'];
};

const tagBase: React.CSSProperties = {
  fontSize: '0.62rem', letterSpacing: '1px', textTransform: 'uppercase',
  padding: '0.2rem 0.6rem', borderRadius: 2, fontFamily: "'DM Mono', monospace",
};

/* ─── Btn helper ─────────────────────────────────────────── */
const Btn: React.FC<{ variant:'primary'|'ghost'; onClick?:()=>void; children:React.ReactNode; large?:boolean }> =
  ({ variant, onClick, children, large }) => {
    const [hov, setHov] = useState(false);
    const base: React.CSSProperties = {
      fontFamily:"'DM Mono', monospace", fontSize: large?'0.85rem':'0.78rem',
      letterSpacing:'1px', textTransform:'uppercase',
      padding: large?'0.9rem 2.4rem':'0.6rem 1.4rem',
      borderRadius:3, cursor:'pointer', border:'1px solid', transition:'all 0.2s',
    };
    const st: React.CSSProperties = variant === 'primary'
      ? { ...base, background: hov?'transparent':'var(--accent)', borderColor:'var(--accent)', color:hov?'var(--accent)':'#050810', fontWeight:500 }
      : { ...base, background:'transparent', borderColor: hov?'var(--accent)':'var(--border)', color:hov?'var(--accent)':'var(--text)' };
    return <button style={st} onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>{children}</button>;
  };

/* ─── Component ──────────────────────────────────────────── */
const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigateHome, onSignup }) => {
  const [activeCategory, setActiveCategory] = useState('All Features');
  const [hovCard, setHovCard] = useState<string | null>(null);
  const [hovArchBox, setHovArchBox] = useState<string | null>(null);

  const visibleSections = featureSections.filter((fs) => {
    if (activeCategory === 'All Features') return true;
    if (activeCategory === 'Auth & Security') return fs.id === 'auth';
    if (activeCategory === 'Rate Limiting') return fs.id === 'rate-limiting';
    if (activeCategory === 'Load Balancing') return fs.id === 'load-balancing';
    return fs.title.toLowerCase().includes(activeCategory.toLowerCase());
  });

  return (
    <div style={s.page}>
      {/* ── PAGE HERO ── */}
      <section style={s.pageHero}>
        <div style={s.heroDivider}/>
        <div style={s.pageTag}>Features</div>
        <h1 style={s.h1}>
          Everything You Need to<br/>
          <em style={s.h1em}>Master Your Gateway</em>
        </h1>
        <p style={s.heroDesc}>
          Built on NGINX and TypeScript, our platform surfaces every routing decision,
          auth check, and rate-limit event in real time.
        </p>
      </section>

      {/* ── CATEGORIES ── */}
      <div style={s.categories}>
        {CATEGORIES.map((cat, i) => (
          <button key={cat}
            style={{
              ...s.catBtn,
              borderRight: i < CATEGORIES.length - 1 ? '1px solid var(--border)' : 'none',
              color: activeCategory === cat ? 'var(--accent)' : 'var(--muted)',
              background: activeCategory === cat ? 'rgba(0,255,224,0.04)' : 'transparent',
            }}
            onClick={() => setActiveCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* ── FEATURE SECTIONS ── */}
      <div style={s.main}>
        {visibleSections.map((section) => (
          <div key={section.id} style={{ marginBottom: '5rem' }}>
            <div style={s.fsHeader}>
              <div style={s.fsIcon}>{section.icon}</div>
              <div>
                <div style={s.fsTitle}>{section.title}</div>
                <div style={s.fsSub}>{section.subtitle}</div>
              </div>
            </div>
            <div style={s.grid}>
              {section.cards.map((card) => {
                const key = `${section.id}-${card.title}`;
                const hov = hovCard === key;
                return (
                  <div key={key}
                    style={{ ...s.card, background: hov ? 'var(--surface)' : 'var(--bg)' }}
                    onMouseEnter={() => setHovCard(key)}
                    onMouseLeave={() => setHovCard(null)}
                  >
                    {/* top accent bar */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: card.accentColor ?? 'var(--accent)',
                      transform: hov ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left', transition: 'transform 0.3s',
                    }}/>
                    <span style={s.cardIcon}>{card.icon}</span>
                    <div style={s.cardTitle}>{card.title}</div>
                    <div style={s.cardDesc}>{card.desc}</div>
                    <div style={s.cardTags}>
                      {card.tags.map((tag) => (
                        <span key={tag.label} style={{ ...tagBase, ...tagColor(tag.variant) }}>{tag.label}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── COMPARISON TABLE ── */}
      <div style={s.comparison}>
        <div style={s.compTitle}>Gateway vs Direct API Calls</div>
        <div style={s.tableWrap}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem', fontFamily:"'DM Mono',monospace" }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--accent)' }}>
                {['Capability','Without Gateway','With API Gateway'].map((h) => (
                  <th key={h} style={{ textAlign: h==='Capability'?'left':'center', padding:'0.8rem 1.2rem', fontSize:'0.68rem', letterSpacing:1, textTransform:'uppercase', color:'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'0.9rem 1.2rem', color:'var(--text)' }}>{row.capability}</td>
                  <td style={{ padding:'0.9rem 1.2rem', textAlign:'center', color:'var(--border)', fontSize:'1rem' }}>{row.without}</td>
                  <td style={{ padding:'0.9rem 1.2rem', textAlign:'center', color: row.withOk?'var(--accent)':'var(--muted)' }}>{row.with}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ARCH DIAGRAM ── */}
      <div style={s.arch}>
        <div style={s.archTitle}>Architecture Overview</div>
        <div style={s.archDiagram}>
          <div style={s.archRow}>
            {['React Client\nTypeScript frontend','Mobile / CLI\nThird-party consumers'].map((label) => {
              const [title,sub] = label.split('\n');
              return (
                <div key={title}
                  style={{ ...s.archBox, borderColor: hovArchBox===title?'var(--accent)':'var(--border)', minWidth:170 }}
                  onMouseEnter={()=>setHovArchBox(title)} onMouseLeave={()=>setHovArchBox(null)}>
                  <div style={s.archBoxTitle}>{title}</div>
                  <div style={s.archBoxSub}>{sub}</div>
                </div>
              );
            })}
          </div>

          <div style={s.archArrow}>↓</div>
          <div style={s.archFlowLabel}>HTTPS / HTTP2</div>

          <div style={s.archRow}>
            <div style={{ ...s.archBox, minWidth:360, borderColor:'rgba(0,255,224,0.4)', position:'relative', paddingTop:'1.6rem' }}>
              <span style={{ position:'absolute',top:-9,left:'50%',transform:'translateX(-50%)', background:'var(--accent)',color:'#050810',fontSize:'0.55rem',letterSpacing:1,textTransform:'uppercase',padding:'0.1rem 0.5rem', fontFamily:"'DM Mono',monospace" }}>Gateway Layer</span>
              <div style={{ ...s.archBoxTitle, color:'var(--accent)' }}>NGINX Reverse Proxy</div>
              <div style={s.archBoxSub}>SSL termination · Rate limiting · Auth · Routing</div>
            </div>
          </div>

          <div style={s.archArrow}>↓</div>
          <div style={s.archFlowLabel}>Internal Network</div>

          <div style={s.archRow}>
            <div style={{ ...s.archBox, minWidth:220, borderColor:'rgba(123,97,255,0.4)' }}>
              <div style={{ ...s.archBoxTitle, color:'var(--accent3)' }}>TS Middleware</div>
              <div style={s.archBoxSub}>Auth · Transform · Log</div>
            </div>
          </div>

          <div style={s.archArrow}>↓</div>

          <div style={s.archRow}>
            {[['Service A','Users API'],['Service B','Orders API'],['Service C','Analytics API']].map(([title,sub]) => (
              <div key={title}
                style={{ ...s.archBox, borderColor: hovArchBox===title?'var(--accent)':'var(--border)' }}
                onMouseEnter={()=>setHovArchBox(title)} onMouseLeave={()=>setHovArchBox(null)}>
                <div style={s.archBoxTitle}>{title}</div>
                <div style={s.archBoxSub}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <section style={s.finalCta}>
        <div style={s.finalTitle}>Ready to Test Your Gateway?</div>
        <div style={s.finalDesc}>Sign up and start validating routes, auth flows, and rate limits in minutes.</div>
        <div style={s.finalBtns}>
          <Btn variant="primary" large onClick={onSignup}>Get Started Free</Btn>
          <Btn variant="ghost" large onClick={onNavigateHome}>← Back to Home</Btn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerLeft}>© 2025 API Gateway Tester. Built with React + NGINX + TypeScript.</div>
        <div style={s.footerRight}>
          {['Features','Docs','GitHub','Status'].map((lbl) => (
            <button key={lbl} style={s.footerLink}>{lbl}</button>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default FeaturesPage;