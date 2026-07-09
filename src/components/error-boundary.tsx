'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

const MAX_RETRIES = 5;
const BASE_DELAY = 1500;

function isRecoverableError(error: Error): boolean {
  const msg = error.message || '';
  const name = error.name || '';
  return (
    name === 'ChunkLoadError' ||
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Failed to load chunk') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported module') ||
    msg.includes('NetworkError') ||
    msg.includes('Network request failed') ||
    msg.includes('fetch') ||
    msg.includes('Load failed')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Auto-retry for recoverable errors (network/chunk load issues)
    if (isRecoverableError(error) && this.state.retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(1.5, this.state.retryCount);
      this.setState({ isRetrying: true });
      this.retryTimer = setTimeout(() => {
        this.setState(prev => ({ hasError: false, retryCount: prev.retryCount + 1, isRetrying: false }));
      }, delay);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, retryCount: 0, isRetrying: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRecoverable = this.state.error ? isRecoverableError(this.state.error) : false;
      const canRetry = this.state.retryCount < MAX_RETRIES;
      const isAutoRetrying = this.state.isRetrying;

      return (
        <div className="flex items-center justify-center min-h-screen bg-claude-bg p-6">
          <div className="max-w-md w-full p-6 border-2 border-red-300 dark:border-red-800 rounded-xl bg-red-50 dark:bg-red-950/30 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                {isRecoverable ? '资源加载失败' : '出错了'}
              </h2>
            </div>
            <p className="text-red-800 dark:text-red-300 mb-4">
              {isRecoverable 
                ? '部分资源加载失败，可能是网络波动或服务器暂时不可用。请尝试重试。'
                : '加载失败，请刷新页面重试。'}
            </p>
            {isAutoRetrying && (
              <div className="flex items-center gap-2 mb-4 text-sm text-amber-700 dark:text-amber-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>正在自动重试... (第 {this.state.retryCount + 1} 次)</span>
              </div>
            )}
            {this.state.retryCount > 0 && !isAutoRetrying && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                已自动重试 {this.state.retryCount} 次
              </p>
            )}
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                错误详情
              </summary>
              <p className="mt-2 text-xs text-red-700 dark:text-red-300 break-all">
                {this.state.error?.message}
              </p>
            </details>
            <div className="flex gap-3">
              {canRetry && !isAutoRetrying && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  重试
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
