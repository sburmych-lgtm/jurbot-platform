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
            \u0429\u043e\u0441\u044c \u043f\u0456\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a
          </h2>
          <p className="text-sm text-text-muted mb-6 max-w-xs">
            \u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0432\u0456\u0434\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043e\u043d\u043e\u0432\u0438\u0442\u0438 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0443.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-teal text-bg-primary font-bold text-sm rounded-[10px] active:scale-[0.98] transition"
          >
            <RefreshCw size={16} />
            \u0421\u043f\u0440\u043e\u0431\u0443\u0432\u0430\u0442\u0438 \u0437\u043d\u043e\u0432\u0443
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
