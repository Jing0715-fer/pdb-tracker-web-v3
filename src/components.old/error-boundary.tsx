'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
        }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle className="h-5 w-5" /> 出错了</h2>
          <p style={{ color: '#7f1d1d' }}>加载失败，请刷新页面重试。</p>
          <details style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>
            <summary style={{ cursor: 'pointer', color: '#991b1b' }}>错误详情</summary>
            {this.state.error?.message}
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}