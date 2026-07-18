import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}
interface State {
    hasError: boolean;
    message: string;
}

/**
 * App-wide safety net. Without this, any render-time error unmounts the whole
 * React tree and the user sees a blank white screen. This catches the error,
 * logs details for debugging, and shows a friendly recover-able fallback.
 */
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error?.message || 'Unknown error' };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error?.message, error?.stack, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: 24,
                textAlign: 'center', fontFamily: 'system-ui, sans-serif',
                color: '#0f172a', background: '#f8fafc',
            }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h1>
                <p style={{ color: '#64748b', fontSize: 14, maxWidth: 320, margin: '0 0 20px' }}>
                    This page hit an unexpected error. Please try again.
                </p>
                <button
                    onClick={() => { window.location.href = '/'; }}
                    style={{
                        background: '#2563eb', color: 'white', border: 'none',
                        borderRadius: 12, padding: '12px 24px', fontWeight: 600,
                        fontSize: 14, cursor: 'pointer',
                    }}
                >
                    Go home
                </button>
            </div>
        );
    }
}
