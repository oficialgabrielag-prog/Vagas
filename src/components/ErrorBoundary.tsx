import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro isolado capturado:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-xl font-bold text-slate-800">Algo correu mal nesta secção.</h2>
          <p className="text-sm text-slate-500 mt-2">Os seus dados permanecem seguros.</p>
          <button 
            className="mt-4 bg-[#0F4C9C] text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => window.location.reload()}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
