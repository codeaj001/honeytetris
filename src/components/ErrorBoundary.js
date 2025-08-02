import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console for debugging
    console.error('Chain Tetris Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-6 mb-6">
              <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
              <h2 className="text-2xl font-bold mb-4 text-red-400">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-300 mb-4">
                Don't worry - your blockchain progress is safe! This appears to be a temporary issue.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="text-left bg-black/30 p-4 rounded mb-4 text-xs">
                  <p className="text-red-400 font-semibold mb-2">Error Details:</p>
                  <pre className="text-gray-400 whitespace-pre-wrap">
                    {this.state.error && this.state.error.toString()}
                  </pre>
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors mx-auto"
              >
                <RefreshCw size={20} />
                Reload Game
              </button>
            </div>
            
            <div className="text-sm text-gray-400">
              <p>If the problem persists:</p>
              <ul className="mt-2 space-y-1">
                <li>• Check your wallet connection</li>
                <li>• Ensure you have Devnet SOL</li>
                <li>• Try refreshing the page</li>
                <li>• Contact support if issues continue</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;