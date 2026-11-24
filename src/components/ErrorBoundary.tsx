import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado na aplicação.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = 'Ocorreu um erro inesperado ao carregar os dados da clínica.';
      if (this.state.errorMessage.includes('Missing or insufficient permissions')) {
        friendlyMessage =
          'Permissão insuficiente no banco de dados. Verifique sua conta Google ou tente entrar novamente.';
      } else if (this.state.errorMessage.includes('Quota exceeded')) {
        friendlyMessage =
          'O limite diário gratuito do banco de dados foi atingido. O uso será restabelecido amanhã.';
      }

      return (
        <div className="min-h-[100dvh] w-full bg-[#FAFAFA] flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-[#EBEBED] rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
              <AlertTriangle size={22} />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display font-semibold text-lg text-[#18181B]">
                Algo deu errado
              </h2>
              <p className="text-xs text-[#71717A] leading-relaxed">{friendlyMessage}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Recarregar aplicativo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
