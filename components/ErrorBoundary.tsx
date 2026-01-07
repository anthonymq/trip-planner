import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="min-h-[400px] h-full flex flex-col items-center justify-center p-8 text-center bg-cream rounded-3xl border border-sand-200">
          <div className="w-20 h-20 bg-terracotta-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-terracotta-100 rotate-3">
            <AlertTriangle className="w-10 h-10 text-terracotta-500" />
          </div>
          
          <h2 className="text-3xl font-serif font-bold text-ocean-900 mb-3 tracking-tight">
            Oops, something went wrong
          </h2>
          
          <p className="text-sand-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed font-medium">
            {this.state.error?.message || 'We encountered an unexpected issue. Don\'t worry, your trip data is safe.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button 
              onClick={this.handleReload}
              className="flex-1 px-6 py-4 bg-ocean-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-ocean-500/20 active:scale-95 hover:bg-ocean-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
            
            <button 
              onClick={this.handleGoHome}
              className="flex-1 px-6 py-4 bg-white text-ocean-900 border-2 border-sand-100 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sand-50 active:scale-95 transition-all"
            >
              <Home className="w-4 h-4" /> Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
