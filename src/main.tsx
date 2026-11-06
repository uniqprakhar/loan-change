import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// True only inside the Broodle Build editor preview (an iframe). A published site
// is top-level, so visitors must never be told "we are fixing this automatically".
const inEditorPreview = (() => {
  try { return window.parent !== window; } catch { return true; }
})();

// Error Boundary - catches React rendering errors and shows a friendly message
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log, so the real cause is visible in the browser console.
    console.error('[app] render error:', error, info.componentStack);
    // Report to the editor (auto-fix) only when running inside the editor preview.
    if (!inEditorPreview) return;
    try {
      window.parent.postMessage({
        type: 'broodle-preview-error',
        errors: [{
          message: error.message,
          source: info.componentStack || '',
          stack: error.stack || '',
          timestamp: Date.now()
        }]
      }, '*');
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fdf2f8, #faf5ff, #eff6ff)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '420px',
            textAlign: 'center',
            background: 'white',
            borderRadius: '16px',
            padding: '40px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '20px'
            }}>✨</div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
              margin: '0 0 8px'
            }}>{inEditorPreview ? 'Making improvements...' : 'Something went wrong'}</h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 24px',
              lineHeight: 1.5
            }}>
              {inEditorPreview
                ? 'Broodle Build is automatically fixing this. The preview will update in a moment.'
                : 'This page hit an unexpected problem. Reloading usually fixes it. If it keeps happening, please contact the site owner.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {inEditorPreview ? 'Refresh Preview' : 'Reload page'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
