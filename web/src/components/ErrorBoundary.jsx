import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>!</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>
            Đã xảy ra lỗi
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Vui lòng thử tải lại trang.
          </p>
          <button
            className="btn primary"
            onClick={() => window.location.reload()}
            style={{ fontSize: 14 }}
          >
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
