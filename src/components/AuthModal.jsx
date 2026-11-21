import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, LogIn, UserPlus, AlertCircle, KeyRound, Mail, CheckCircle2 } from 'lucide-react';
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
import {
  isSupabaseConfigured,
  supabaseSignUp,
  supabaseSignIn,
  supabaseSendPasswordReset,
  supabaseUpdatePassword,
} from '../utils/supabaseClient';
import { drawAvatar2D } from '../utils/avatarRenderer';

export default function AuthModal({
  showDemoLogin = false,
  initialMode = 'signin',
  onClose,
  onLogin,
}) {
  const [mode, setMode] = useState(initialMode); // 'signin' | 'register' | 'forgot' | 'reset'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('girl');
  const [avatarStyle, setAvatarStyle] = useState('classic');
  const [hairStyle, setHairStyle] = useState('long');
  const [hairColor, setHairColor] = useState(HAIR_OPTIONS[0].color);
  const [cloakColor, setCloakColor] = useState('#b86578');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const previewCanvasRef = useRef(null);

  useEffect(() => {
    setMode(initialMode || 'signin');
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialMode]);

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
  const displayNameCheck =
    mode === 'register' && name.trim().length > 0
      ? validateTextOnlyDisplayName(name)
      : { ok: true, error: '' };
  const displayNameTaken =
    mode === 'register' && displayNameCheck.ok && name.trim().length >= 2 && isDisplayNameTaken(name);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'forgot') {
      setSubmitting(true);
      const res = await supabaseSendPasswordReset(email || username);
      setSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      const targetEmail = (email || username).trim().toLowerCase();
      setSuccessMsg(
        `Password reset email sent to ${targetEmail}. Open the link in your inbox to set a new password.`
      );
      return;
    }

    if (mode === 'reset') {
      if (password.length < 6) {
        setErrorMsg('New password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      const res = await supabaseUpdatePassword(password);
      setSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setSuccessMsg('Password updated! You can now enter the park.');
      if (res.user) {
        setTimeout(() => onLogin(res.user), 800);
      } else {
        setMode('signin');
      }
      return;
    }

    if (mode === 'signin') {
      setSubmitting(true);
      if (isSupabaseConfigured) {
        const sbRes = await supabaseSignIn({ identifier: username, password });
        if (sbRes.ok && sbRes.user) {
          setSubmitting(false);
          onLogin(sbRes.user);
          return;
        }
        // Only fall back to local registry if account wasn't found in Supabase or offline
        if (!sbRes.notFoundInSupabase && !sbRes.networkError) {
          const localCheck = authenticateAccount(username, password);
          if (localCheck.ok) {
            setSubmitting(false);
            onLogin(localCheck.user);
            return;
          }
          setSubmitting(false);
          setErrorMsg(sbRes.error || 'Incorrect credentials. Please try again.');
          return;
        }
      }

      const localRes = authenticateAccount(username, password);
      setSubmitting(false);
      if (!localRes.ok) {
        setErrorMsg(localRes.error);
        return;
      }
      onLogin(localRes.user);
      return;
    }

    // mode === 'register'
    const dnCheck = validateTextOnlyDisplayName(name);
    if (!dnCheck.ok) {
      setErrorMsg(dnCheck.error);
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
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

    setSubmitting(true);
    if (isSupabaseConfigured) {
      const sbRes = await supabaseSignUp({
        email,
        password,
        username,
        name: dnCheck.clean,
        gender,
        avatar,
      });
      if (!sbRes.ok) {
        setSubmitting(false);
        setErrorMsg(sbRes.error);
        return;
      }
      // Keep local/MQTT account directory mirrored for presence & lookup
      registerAccount({
        username,
        password,
        email,
        name: dnCheck.clean,
        gender,
        avatar,
      });
      setSubmitting(false);
      if (sbRes.needsEmailConfirm) {
        setSuccessMsg(
          `Account created! Please check ${email.trim()} to verify your email, then Sign In.`
        );
        setMode('signin');
        return;
      }
      onLogin({ ...(sbRes.user || {}), avatar });
      return;
    }

    const res = registerAccount({
      username,
      password,
      email,
      name: dnCheck.clean,
      gender,
      avatar,
    });
    setSubmitting(false);
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
              Welcome to Nevermore Garden
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {mode === 'forgot'
                ? 'Enter your account email to receive a password reset link'
                : mode === 'reset'
                  ? 'Set your new Nevermore Garden account password'
                  : 'Sign in with username/email & password or create your visitor character'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {showDemoLogin && mode === 'signin' && (
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', marginBottom: 10 }}
            onClick={() => onLogin(DEMO_USER)}
          >
            <Sparkles size={16} /> Instant Demo Login ({DEMO_USER.name} • @{DEMO_USER.username})
          </button>
        )}

        {mode !== 'reset' && (
          <div className="modal-tabs" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`modal-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
                setSuccessMsg('');
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
                setSuccessMsg('');
              }}
            >
              Create Account
            </button>
            <button
              type="button"
              className={`modal-tab ${mode === 'forgot' ? 'active' : ''}`}
              onClick={() => {
                setMode('forgot');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Forgot Password
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="armtip-notif" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              padding: '9px 12px',
              borderRadius: 10,
              background: '#dcfce7',
              color: '#166534',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid" style={{ gap: 10 }}>
          {mode === 'forgot' ? (
            <div>
              <label className="field-label" htmlFor="auth-reset-email">
                Account Email Address *
              </label>
              <input
                id="auth-reset-email"
                type="email"
                required
                className="input-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
              />
            </div>
          ) : mode === 'reset' ? (
            <>
              <div>
                <label className="field-label" htmlFor="auth-new-pass">
                  New Password *
                </label>
                <input
                  id="auth-new-pass"
                  type="password"
                  required
                  minLength={6}
                  className="input-control"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="auth-confirm-pass">
                  Confirm New Password *
                </label>
                <input
                  id="auth-confirm-pass"
                  type="password"
                  required
                  minLength={6}
                  className="input-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg('');
                  }}
                />
              </div>
            </>
          ) : (
            <div className={mode === 'register' ? 'form-row-2' : 'form-grid'} style={{ gap: 10 }}>
              <div>
                <label className="field-label" htmlFor="auth-username">
                  {mode === 'register' ? 'Unique Username *' : 'Username or Email *'}
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  className="input-control"
                  placeholder={mode === 'register' ? 'e.g., jamie_paws' : 'username or email'}
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
                <label className="field-label" htmlFor="auth-password">
                  Password *
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={mode === 'register' ? 6 : 4}
                  className="input-control"
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                />
                {mode === 'signin' && (
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '0.74rem', padding: '2px 8px', border: 'none' }}
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="form-row-2" style={{ gap: 10 }}>
                <div>
                  <label className="field-label" htmlFor="auth-email">
                    Email Address (for Password Reset) *
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    className="input-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg('');
                    }}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="auth-display-name">
                    Unique Display Name (Text Only) *
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    required
                    maxLength={32}
                    className="input-control"
                    placeholder="e.g., Jamie Chen"
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
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {HAIR_OPTIONS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        title={h.label}
                        aria-label={`Hair color ${h.label}`}
                        onClick={() => setHairColor(h.color)}
                        style={{
                          width: 30,
                          height: 30,
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
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CLOAK_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        aria-label={`Cloak color ${c.label}`}
                        onClick={() => setCloakColor(c.color)}
                        style={{
                          width: 30,
                          height: 30,
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
            disabled={submitting || usernameTaken}
            style={{ justifyContent: 'center', padding: '11px', opacity: submitting || usernameTaken ? 0.65 : 1 }}
          >
            {submitting ? (
              'Please wait...'
            ) : mode === 'register' ? (
              <>
                <UserPlus size={15} /> Create Account &amp; Enter Park
              </>
            ) : mode === 'forgot' ? (
              <>
                <Mail size={15} /> Send Password Reset Email
              </>
            ) : mode === 'reset' ? (
              <>
                <KeyRound size={15} /> Update Password
              </>
            ) : (
              <>
                <LogIn size={15} /> Sign In with Password
              </>
            )}
          </button>

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              className="btn-ghost"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
