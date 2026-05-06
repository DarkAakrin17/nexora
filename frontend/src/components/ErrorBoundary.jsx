import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#04060f',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'monospace',
        }}>
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '720px',
            width: '100%',
          }}>
            <h1 style={{ color: '#fca5a5', fontSize: '1.25rem', marginBottom: '12px' }}>
              ⚠️ Application Error
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.85rem' }}>
              Something crashed on startup. Error details below:
            </p>
            <pre style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '0.75rem',
              color: '#fca5a5',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                background: 'linear-gradient(135deg,#6366f1,#0ea5e9)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
                fontWeight: 600,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
