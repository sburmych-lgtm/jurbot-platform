import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <AlertTriangle size={48} className="text-accent-amber mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Щось пішло не так
          </h2>
          <p className="text-sm text-text-muted mb-6 max-w-xs">
            Помилка відображення. Спробуйте оновити сторінку.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-teal text-bg-primary font-bold text-sm rounded-[10px] active:scale-[0.98] transition"
          >
            <RefreshCw size={16} />
            Спробувати знову
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
