import React, { useState } from 'react';
import { X, Sparkles, LogIn } from 'lucide-react';
import { DEMO_USER } from '../data/memorialData';

export default function AuthModal({ onClose, onLogin }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('girl'); // 'girl' | 'boy'

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    const derivedName =
      name.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    onLogin({ email: cleanEmail, name: derivedName, gender });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', margin: 0 }}>
              Welcome to Evergreen Paws
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Sign in to visit your pet’s tombstone & ash room, light candles, and leave tributes
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '11px 14px', marginBottom: 14 }}
          onClick={() => onLogin({ ...DEMO_USER, gender })}
        >
          <Sparkles size={16} /> Instant Demo Login ({DEMO_USER.name})
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            marginBottom: 12,
          }}
        >
          Demo account includes Barnaby (Tombstone) &amp; Mochi (Ash Room)
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Choose Your Character</label>
          <div className="form-row-2">
            <button
              type="button"
              className={`style-option ${gender === 'girl' ? 'active' : ''}`}
              onClick={() => setGender('girl')}
              style={{ textAlign: 'center', padding: '8px 10px' }}
            >
              <strong style={{ fontSize: '0.86rem' }}>👩 Girl Character</strong>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Ribbon bow &amp; flowing cloak
              </div>
            </button>
            <button
              type="button"
              className={`style-option ${gender === 'boy' ? 'active' : ''}`}
              onClick={() => setGender('boy')}
              style={{ textAlign: 'center', padding: '8px 10px' }}
            >
              <strong style={{ fontSize: '0.86rem' }}>👦 Boy Character</strong>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Short hair &amp; collar cape
              </div>
            </button>
          </div>
        </div>

        <div className="modal-tabs" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`modal-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`modal-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          {mode === 'register' && (
            <div>
              <label className="field-label">Your Name</label>
              <input
                type="text"
                required
                className="input-control"
                placeholder="e.g., Jamie Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="field-label">Email Address</label>
            <input
              type="email"
              required
              className="input-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-ghost" style={{ justifyContent: 'center', padding: '10px' }}>
            <LogIn size={15} /> {mode === 'register' ? 'Create & Enter Park' : 'Continue with Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
