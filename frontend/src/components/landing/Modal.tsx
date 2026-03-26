import React, { useState } from 'react';
import { ModalType } from "../../types/landing"

interface ModalProps {
  type: ModalType;
  onClose: () => void;
  onSwitch: (to: ModalType) => void;
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(5,8,16,0.92)',
    backdropFilter: 'blur(10px)',
    zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeUp 0.2s ease both',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    width: 400,
    padding: '2.5rem',
    position: 'relative',
    animation: 'scaleIn 0.2s ease both',
  },
  close: {
    position: 'absolute', top: '1rem', right: '1rem',
    background: 'none', border: 'none',
    color: 'var(--muted)', fontSize: '1.1rem', cursor: 'pointer',
    fontFamily: "'DM Mono', monospace",
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.5rem', fontWeight: 800,
    marginBottom: '0.3rem',
  },
  sub: { color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '2rem' },
  label: {
    display: 'block', fontSize: '0.68rem', letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem',
    fontFamily: "'DM Mono', monospace",
  },
  input: {
    width: '100%', background: 'var(--bg)',
    border: '1px solid var(--border)', color: 'var(--text)',
    fontFamily: "'DM Mono', monospace", fontSize: '0.82rem',
    padding: '0.7rem 1rem', outline: 'none', transition: 'border-color 0.2s',
    marginBottom: '1.2rem',
  },
  submit: {
    width: '100%', background: 'var(--accent)', border: 'none',
    color: '#050810', fontFamily: "'DM Mono', monospace",
    fontSize: '0.8rem', fontWeight: 500, letterSpacing: '1px',
    textTransform: 'uppercase', padding: '0.9rem',
    cursor: 'pointer', marginTop: '0.5rem', transition: 'opacity 0.2s',
  },
  switchLine: {
    fontSize: '0.72rem', color: 'var(--muted)', marginTop: '1rem', textAlign: 'center',
    fontFamily: "'DM Mono', monospace",
  },
  switchLink: {
    color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline',
  },
};

const Modal: React.FC<ModalProps> = ({ type, onClose, onSwitch }) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  if (!type) return null;

  const isLogin = type === 'login';

  const inputStyle = (field: string): React.CSSProperties => ({
    ...s.input,
    borderColor: focusedField === field ? 'var(--accent)' : 'var(--border)',
  });

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <button style={s.close} onClick={onClose}>✕</button>

        <div style={s.title}>{isLogin ? 'Welcome Back' : 'Get Started'}</div>
        <div style={s.sub}>
          {isLogin ? 'Sign in to your API Gateway account' : 'Create your free API Gateway account'}
        </div>

        {!isLogin && (
          <div>
            <label style={s.label}>Full Name</label>
            <input
              style={inputStyle('name')} type="text" placeholder="Your Name"
              onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
            />
          </div>
        )}

        <div>
          <label style={s.label}>Email</label>
          <input
            style={inputStyle('email')} type="email" placeholder="dev@yourdomain.com"
            onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
          />
        </div>

        <div>
          <label style={s.label}>Password</label>
          <input
            style={inputStyle('pass')} type="password"
            placeholder={isLogin ? '••••••••••' : 'Min. 8 characters'}
            onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)}
          />
        </div>

        <button style={s.submit}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {isLogin ? 'Log In →' : 'Create Account →'}
        </button>

        <div style={s.switchLine}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span style={s.switchLink} onClick={() => onSwitch(isLogin ? 'signup' : 'login')}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Modal;