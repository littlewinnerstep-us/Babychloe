import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/memorial.css';

class SanctuaryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering issue',
    };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Nevermore Garden recovered from render error:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f1613',
            color: '#f7f3e9',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              background: '#17221d',
              border: '1px solid rgba(255,213,126,0.35)',
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🐾🕯️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>
              Sanctuary View Interrupted
            </h2>
            <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#c4cfc9' }}>
              Something slipped while opening that view. You can safely return to the garden without losing your saved memories.
            </p>
            {this.state.errorMessage && (
              <div
                style={{
                  margin: '0 0 14px',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.28)',
                  fontSize: '0.74rem',
                  color: '#ffd57e',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.errorMessage}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('evergreen_paws_viewmode_v1', 'world2d');
                  } catch {
                    // ignore
                  }
                  this.setState({ hasError: false, errorMessage: '' });
                }}
                style={{
                  background: '#d8b467',
                  color: '#131b17',
                  border: 'none',
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Return to Garden
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('evergreen_paws_user_v1');
                    localStorage.removeItem('evergreen_paws_avatar_v1');
                    localStorage.setItem('evergreen_paws_viewmode_v1', 'world3d');
                  } catch {
                    // ignore
                  }
                  if (typeof window !== 'undefined' && window.location?.reload) {
                    window.location.reload();
                  } else {
                    this.setState({ hasError: false, errorMessage: '' });
                  }
                }}
                style={{
                  background: 'transparent',
                  color: '#c4cfc9',
                  border: '1px solid rgba(196,207,201,0.35)',
                  borderRadius: 999,
                  padding: '9px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SanctuaryErrorBoundary>
      <App />
    </SanctuaryErrorBoundary>
  </React.StrictMode>
);
