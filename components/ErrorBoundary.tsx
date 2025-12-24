
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ICONS } from '../constants';
import Button from './Button';
import { MonitoringService } from '../services/monitoring';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard React Error Boundary component to catch rendering errors in its child component tree.
 */
// Fix: Directly extend Component from 'react' to ensure TypeScript correctly recognizes inherited members like setState and props.
class ErrorBoundary extends Component<Props, State> {
  // Fix: Initialized state without the 'override' modifier to avoid compilation errors when inheritance is not strictly tracked.
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Report to Monitoring Service
    MonitoringService.captureException(error, { errorInfo });
  }

  // Use arrow function to maintain correct 'this' context pointing to the class instance
  public handleRecover = () => {
    // Fix: Properly call this.setState which is inherited from the base Component class.
    this.setState({ hasError: false, error: null });
  };

  public render() {
    // Fix: Correctly access the inherited state property.
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 text-white p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl shadow-red-500/10">
            <ICONS.XMark className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-black mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
            We encountered an unexpected issue. Our team has been notified. Please try reloading the application.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <Button 
              variant="primary" 
              fullWidth
              onClick={() => window.location.reload()}
              icon={<ICONS.Check className="w-5 h-5" />}
            >
              Reload Application
            </Button>
            
            <button 
              onClick={this.handleRecover}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Try to recover
            </button>
          </div>

          <div className="mt-8 p-4 bg-black/30 rounded-xl border border-white/5 text-left w-full max-w-xs overflow-hidden">
             <p className="text-[10px] text-red-400 font-mono break-all">
               {/* Fix: Access error from state inherited from Component. */}
               {this.state.error?.toString()}
             </p>
          </div>
        </div>
      );
    }

    // Fix: Correctly access the inherited props property.
    return this.props.children;
  }
}

export default ErrorBoundary;
