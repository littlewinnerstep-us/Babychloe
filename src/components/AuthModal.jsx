import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import {
  DEMO_USER,
  AVATAR_STYLES,
  HAIR_STYLES,
  CLOAK_OPTIONS,
  HAIR_OPTIONS,
} from '../data/memorialData';
import {
  authenticateAccount,
  registerAccount,
  isUsernameTaken,
  isDisplayNameTaken,
  validateTextOnlyDisplayName,
} from '../utils/multiplayerEngine';
import { drawAvatar2D } from '../utils/avatarRenderer';

export default function AuthModal({ showDemoLogin = false, onClose, onLogin }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('girl');
  const [avatarStyle, setAvatarStyle] = useState('classic');
  const [hairStyle, setHairStyle] = useState('long');
  const [hairColor, setHairColor] = useState(HAIR_OPTIONS[0].color);
  const [cloakColor, setCloakColor] = useState('#b86578');
  const [errorMsg, setErrorMsg] = useState('');

  const previewCanvasRef = useRef(null);

  const handleGenderSwitch = (nextGender) => {
    setGender(nextGender);
    if (nextGender === 'boy') {
      if (hairStyle === 'long' || hairStyle === 'twin') setHairStyle('short');
      if (cloakColor === '#b86578') setCloakColor('#4a7c59');
    } else {
      if (hairStyle === 'short') setHairStyle('long');
      if (cloakColor === '#4a7c59') setCloakColor('#b86578');
    }
  };

  useEffect(() => {
    if (mode !== 'register') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAvatar2D(ctx, canvas.width / 2, canvas.height * 0.65, 1.85, 0, {
      gender,
      avatarStyle,
      hairStyle,
      hairColor,
      cloakColor,
      carryingLantern: true,
    });
  }, [mode, gender, avatarStyle, hairStyle, hairColor, cloakColor]);

  const usernameTaken = mode === 'register' && username.trim().length >= 2 && isUsernameTaken(username);
  const displayNameCheck = mode === 'register' && name.trim().length > 0 ? validateTextOnlyDisplayName(name) : { ok: true, error: '' };
  const displayNameTaken = mode === 'register' && displayNameCheck.ok && name.trim().length >= 2 && isDisplayNameTaken(name);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'signin') {
      const res = authenticateAccount(username, password);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      onLogin(res.user);
      return;
    }

    const dnCheck = validateTextOnlyDisplayName(name);
    if (!dnCheck.ok) {
      setErrorMsg(dnCheck.error);
      return;
    }

    const avatar = {
      gender,
      avatarStyle,
      hairStyle,
      hairColor,
      cloakColor,
      companion: 'none',
      carryingLantern: true,
    };
    const res = registerAccount({
      username,
      password,
      name: dnCheck.clean,
      gender,
      avatar,
    });
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    onLogin({ ...res.user, avatar });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', margin: 0 }}>
              Welcome to Evergreen Paws
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Sign in with username &amp; password or create your own unique visitor character
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {showDemoLogin && (
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', marginBottom: 10 }}
            onClick={() => onLogin(DEMO_USER)}
          >
            <Sparkles size={16} /> Instant Demo Login ({DEMO_USER.name} • @{DEMO_USER.username})
          </button>
        )}

        <div className="modal-tabs" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`modal-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`modal-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="armtip-notif" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid" style={{ gap: 10 }}>
          <div className={mode === 'register' ? 'form-row-2' : 'form-grid'} style={{ gap: 10 }}>
            <div>
              <label className="field-label">
                {mode === 'register' ? 'Unique Username *' : 'Username or Email *'}
              </label>
              <input
                type="text"
                required
                className="input-control"
                placeholder={mode === 'register' ? 'e.g., jamie_paws' : 'alex or email'}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
              />
              {usernameTaken && (
                <div style={{ fontSize: '0.72rem', color: '#e05252', marginTop: 3, fontWeight: 600 }}>
                  Username is already taken
                </div>
              )}
            </div>

            <div>
              <label className="field-label">Password *</label>
              <input
                type="password"
                required
                minLength={4}
                className="input-control"
                placeholder="At least 4 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="field-label">Unique Display Name (Text Only) *</label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  className="input-control"
                  placeholder="e.g., Jamie Chen (letters & spaces only)"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                />
                {!displayNameCheck.ok && (
                  <div style={{ fontSize: '0.72rem', color: '#e05252', marginTop: 3, fontWeight: 600 }}>
                    {displayNameCheck.error}
                  </div>
                )}
                {displayNameTaken && (
                  <div style={{ fontSize: '0.72rem', color: '#e05252', marginTop: 3, fontWeight: 600 }}>
                    Display name is already taken
                  </div>
                )}
              </div>

              {/* Live Character Preview + Girl/Boy Picker */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 14,
                  padding: 10,
                }}
              >
                <canvas
                  ref={previewCanvasRef}
                  width={90}
                  height={104}
                  style={{
                    borderRadius: 12,
                    background: 'rgba(18, 28, 24, 0.85)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>
                    Choose Character
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`chip ${gender === 'girl' ? 'active' : ''}`}
                      onClick={() => handleGenderSwitch('girl')}
                    >
                      👩 Girl Character
                    </button>
                    <button
                      type="button"
                      className={`chip ${gender === 'boy' ? 'active' : ''}`}
                      onClick={() => handleGenderSwitch('boy')}
                    >
                      👦 Boy Character
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    🐾 Spirit Pet: <strong>None</strong> (Enshrine a pet inside the park to unlock their Spirit Pet companion)
                  </div>
                </div>
              </div>

              <div>
                <label className="field-label">Avatar / Uniform Style</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {AVATAR_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`chip ${avatarStyle === st.id ? 'active' : ''}`}
                      onClick={() => setAvatarStyle(st.id)}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">Hair Model</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {HAIR_STYLES.map((hs) => (
                    <button
                      key={hs.id}
                      type="button"
                      className={`chip ${hairStyle === hs.id ? 'active' : ''}`}
                      onClick={() => setHairStyle(hs.id)}
                    >
                      {hs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row-2" style={{ gap: 10 }}>
                <div>
                  <label className="field-label">Hair Color</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {HAIR_OPTIONS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        title={h.label}
                        onClick={() => setHairColor(h.color)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: h.color,
                          border:
                            hairColor === h.color
                              ? '2.5px solid #ffd57e'
                              : '1px solid rgba(255,255,255,0.28)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="field-label">Uniform / Cloak Color</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CLOAK_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        onClick={() => setCloakColor(c.color)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: c.color,
                          border:
                            cloakColor === c.color
                              ? '2.5px solid #ffd57e'
                              : '1px solid rgba(255,255,255,0.28)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={usernameTaken}
            style={{ justifyContent: 'center', padding: '11px', opacity: usernameTaken ? 0.6 : 1 }}
          >
            {mode === 'register' ? (
              <>
                <UserPlus size={15} /> Create Account &amp; Enter Park
              </>
            ) : (
              <>
                <LogIn size={15} /> Sign In with Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
