import React from 'react';
import ErrorState from './ErrorState';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="py-12 max-w-xl mx-auto px-4">
          <ErrorState
            title={this.props.title || 'Something went wrong'}
            message={
              this.props.message ||
              this.state.error?.message ||
              'The dashboard could not be loaded.'
            }
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
