import { Component } from 'react';
import { logError } from '../lib/errorLog';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError(error, { componentStack: errorInfo?.componentStack, source: 'ErrorBoundary' });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-8 text-center max-w-lg mx-auto mt-8" role="alert">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="font-display text-2xl text-[var(--coral)] mb-2">
            Algo salió mal
          </h1>
          <p className="text-sm text-[var(--ink3)] mb-6">
            Ocurrió un error inesperado. Puedes intentar nuevamente o recargar la aplicación.
          </p>
          <details className="text-left text-xs text-[var(--ink3)] bg-[var(--cream)] p-3 rounded-lg mb-6 cursor-pointer">
            <summary className="font-semibold cursor-pointer">Detalles técnicos</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{String(this.state.error)}</pre>
          </details>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary" onClick={this.handleReset}>
              Reintentar
            </button>
            <button className="btn-primary" onClick={this.handleReload}>
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
