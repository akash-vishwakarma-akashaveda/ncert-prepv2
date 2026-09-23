import React from 'react';
import { LogoMark } from './Logo';

/** Last-resort screen for render errors, so a crash never leaves a student on a blank page. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-[#F5F6FA]">
        <div className="max-w-md w-full bg-white rounded-[28px] border-[3px] border-[#EDEFF6] shadow-[0_6px_0_#EDEFF6] p-8 text-center flex flex-col items-center gap-3">
          <LogoMark className="w-14 h-14" />
          <h1 className="text-2xl text-[#1E2233]">Something went wrong</h1>
          <p className="text-sm font-semibold text-[#6B7280]">
            Sorry, this page hit a problem. Your progress is saved. Reloading usually fixes it.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="btn-3d [--edge:#2A3BB8] px-5 py-2.5 rounded-2xl bg-[#3B4FE0] text-white text-sm font-extrabold cursor-pointer"
            >
              Reload page
            </button>
            <a href="/" className="px-5 py-2.5 rounded-2xl border-[3px] border-[#E3E5EC] text-sm font-extrabold text-[#4B5168]">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
