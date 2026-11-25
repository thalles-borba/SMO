/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClinicLogo } from './Sidebar';
import {
  User,
  UserProfile,
  UserRole,
  ROLE_LABELS,
  signInWithGoogle,
  signOutUser,
  registerUserProfile,
  getInviteForEmail,
  isBootstrappedAdminEmail,
  isRunningInIframe,
} from '../lib/firebase';
import { ShieldCheck, CheckCircle2, Loader2, LogOut, ArrowRight, ExternalLink } from 'lucide-react';

interface AuthScreenProps {
  pendingGoogleUser: User | null;
  onRegistrationComplete: (profile: UserProfile) => void;
  initialMode?: 'login' | 'register';
  externalAuthError?: string;
}

function formatGoogleAuthError(err: any): { message: string; showOpenNewTab: boolean } {
  const code: string = err?.code || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const inIframe = typeof window !== 'undefined' && isRunningInIframe();

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      message: 'A janela de autenticação do Google foi fechada antes de concluir.',
      showOpenNewTab: false,
    };
  }
  if (code === 'auth/popup-blocked') {
    return {
      message: 'O navegador bloqueou o pop-up do Google. Permita pop-ups para este site ou abra o app em uma nova aba.',
      showOpenNewTab: inIframe,
    };
  }
  if (code === 'auth/unauthorized-domain') {
    return {
      message: `O domínio atual (${hostname || 'desconhecido'}) não está autorizado no Firebase Authentication. Adicione-o em Firebase Console → Authentication → Settings → Authorized domains.`,
      showOpenNewTab: false,
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      message: 'O provedor Google não está ativado no Firebase Authentication deste projeto.',
      showOpenNewTab: false,
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      message: 'Falha de conexão. Verifique sua internet e tente novamente.',
      showOpenNewTab: false,
    };
  }
  if (
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported'
  ) {
    return {
      message: 'Este navegador ou modo privado bloqueou o armazenamento necessário para o login Google. Abra o aplicativo diretamente no Chrome ou Safari com cookies ativados.',
      showOpenNewTab: inIframe,
    };
  }
  if (code === 'auth/user-disabled') {
    return {
      message: 'Esta conta Google foi desativada no Firebase.',
      showOpenNewTab: false,
    };
  }
  if (code === 'auth/internal-error') {
    return {
      message: inIframe
        ? 'O navegador bloqueou a janela do Google dentro da prévia incorporada. Abra o aplicativo em uma nova aba para entrar.'
        : 'Não foi possível concluir a comunicação com o Google (auth/internal-error). Desative bloqueadores de pop-up/cookies de terceiros e tente novamente.',
      showOpenNewTab: inIframe,
    };
  }

  return {
    message: `Não foi possível autenticar com o Google${code ? ` (${code})` : ''}. Tente novamente.`,
    showOpenNewTab: inIframe,
  };
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export default function AuthScreen({
  pendingGoogleUser,
  onRegistrationComplete,
  initialMode = 'login',
  externalAuthError = '',
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(externalAuthError);
  const [showOpenNewTab, setShowOpenNewTab] = useState(false);

  // First-time registration form state (populated from verified Google account)
  const [displayName, setDisplayName] = useState(pendingGoogleUser?.displayName || '');
  const [clinicName, setClinicName] = useState('Seja Mais Odontologia');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedRole, setAssignedRole] = useState<UserRole>('funcionario');
  const [hasInvite, setHasInvite] = useState(false);

  React.useEffect(() => {
    if (externalAuthError) {
      setErrorMsg(externalAuthError);
    }
  }, [externalAuthError]);

  // Keep displayName synced and detect pre-authorized role when pendingGoogleUser arrives
  React.useEffect(() => {
    setIsLoading(false);
    if (!pendingGoogleUser) return;
    if (pendingGoogleUser.displayName) {
      setDisplayName(pendingGoogleUser.displayName);
    }

    let cancelled = false;
    async function detectAssignedRole() {
      if (isBootstrappedAdminEmail(pendingGoogleUser?.email)) {
        if (!cancelled) {
          setAssignedRole('gestao');
          setHasInvite(true);
        }
        return;
      }
      if (pendingGoogleUser?.email) {
        const invite = await getInviteForEmail(pendingGoogleUser.email);
        if (!cancelled) {
          if (invite) {
            setAssignedRole(invite.role);
            setHasInvite(true);
          } else {
            setAssignedRole('funcionario');
            setHasInvite(false);
          }
        }
      }
    }
    detectAssignedRole();
    return () => {
      cancelled = true;
    };
  }, [pendingGoogleUser]);

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setShowOpenNewTab(false);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      // If signInWithPopup succeeded, onAuthStateChanged will transition state; reset loading safely
      if (user) {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[Firebase Auth] Erro ao autenticar com Google:', err);
      const formatted = formatGoogleAuthError(err);
      setErrorMsg(formatted.message);
      setShowOpenNewTab(formatted.showOpenNewTab);
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;

    const cleanName = displayName.trim();
    const cleanClinic = clinicName.trim();
    if (!cleanName || !cleanClinic) {
      setErrorMsg('Informe seu nome e o nome da clínica para concluir o cadastro.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    try {
      const profile = await registerUserProfile(pendingGoogleUser, {
        displayName: cleanName,
        clinicName: cleanClinic,
        specialty: specialty.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onRegistrationComplete(profile);
    } catch (err) {
      console.error('[AuthScreen] Erro ao finalizar cadastro:', err);
      setErrorMsg('Erro ao salvar seu cadastro no Firebase. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signOutUser();
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: COMPLETE REGISTRATION FOR FIRST-TIME GOOGLE USERS
  if (pendingGoogleUser) {
    return (
      <div className="min-h-[100dvh] w-full overflow-x-clip bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-6 select-none font-sans">
        <div className="bg-white border border-[#EBEBED] p-6 sm:p-8 rounded-2xl max-w-[420px] w-full space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <ClinicLogo className="w-11 h-11" />
            <div>
              <h1 className="font-display font-semibold text-xl text-[#18181B] tracking-[-0.02em]">
                Complete seu cadastro
              </h1>
              <p className="text-xs text-[#71717A] mt-1">
                Confirme seus dados para criar seu ambiente clínico
              </p>
            </div>
          </div>

          {/* Verified Google Account Summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F7F8] border border-[#EBEBED]">
            {pendingGoogleUser.photoURL ? (
              <img
                src={pendingGoogleUser.photoURL}
                alt={pendingGoogleUser.displayName || 'Conta Google'}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-[#EBEBED] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#3795AE]/15 text-[#3795AE] font-semibold text-sm flex items-center justify-center shrink-0">
                {(pendingGoogleUser.displayName || pendingGoogleUser.email || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#18181B] truncate">
                {pendingGoogleUser.email}
              </p>
              <p className="text-[11px] text-[#16A34A] font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={12} />
                <span>Conta Google verificada</span>
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E4E4E7] text-[11px] font-semibold text-[#3795AE] shrink-0">
              {ROLE_LABELS[assignedRole]}
            </span>
          </div>

          <p className="text-[11px] text-[#71717A] leading-relaxed -mt-2">
            {hasInvite ? (
              <>
                Seu e-mail foi pré-autorizado com o perfil <strong className="text-[#18181B] font-semibold">{ROLE_LABELS[assignedRole]}</strong>.
              </>
            ) : (
              <>
                Novos cadastros iniciam com o perfil <strong className="text-[#18181B] font-semibold">Funcionário</strong>. A Gestão pode alterar seu nível de acesso a qualquer momento.
              </>
            )}
          </p>

          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Ex: Dra. Ana Silva"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                Nome da clínica
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Ex: Seja Mais Odontologia"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                  Especialidade / cargo <span className="text-[#A1A1AA]">(opcional)</span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ex: Gestão Clínica"
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                  WhatsApp <span className="text-[#A1A1AA]">(opcional)</span>
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-xl font-medium">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Criando sua conta...</span>
                </>
              ) : (
                <>
                  <span>Concluir cadastro e acessar</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-[#F1F1F3] pt-4 text-center">
            <button
              type="button"
              onClick={handleSwitchAccount}
              disabled={isLoading}
              className="text-xs text-[#71717A] hover:text-[#18181B] inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Usar outra conta Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: MINIMALIST GOOGLE-ONLY LOGIN & REGISTRATION SCREEN
  return (
    <div className="min-h-[100dvh] w-full overflow-x-clip bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-6 select-none font-sans">
      <div className="bg-white border border-[#EBEBED] p-6 sm:p-8 rounded-2xl max-w-[400px] w-full space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <ClinicLogo className="w-12 h-12" />
          <div>
            <h1 className="font-display font-semibold text-xl text-[#18181B] tracking-[-0.02em]">
              Seja Mais Odontologia
            </h1>
            <p className="text-xs text-[#71717A] mt-1">
              Gestão clínica, faturamento e operações
            </p>
          </div>
        </div>

        {/* Clean Segmented Toggle: Login / Cadastro */}
        <div className="grid grid-cols-2 gap-1 bg-[#F4F4F6] p-1 rounded-xl text-xs font-medium text-[#71717A]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'hover:text-[#18181B]'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'hover:text-[#18181B]'
            }`}
          >
            Criar conta
          </button>
        </div>

        {/* Auth Body */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              {mode === 'login' ? 'Acesse sua clínica' : 'Cadastre sua clínica'}
            </h2>
            <p className="text-xs text-[#71717A] leading-relaxed">
              {mode === 'login'
                ? 'Entre com sua conta Google para sincronizar dados financeiros, equipe e estoque em tempo real.'
                : 'Crie seu acesso em segundos com sua conta Google. No primeiro acesso, basta confirmar o nome da clínica.'}
            </p>
          </div>

          {errorMsg && (
            <div className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 rounded-xl font-medium text-center space-y-2">
              <p>{errorMsg}</p>
              {showOpenNewTab && typeof window !== 'undefined' && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] font-semibold transition-colors"
                >
                  <ExternalLink size={13} />
                  <span>Abrir em nova aba</span>
                </a>
              )}
            </div>
          )}

          {/* Exclusive Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#FAFAFA] active:bg-[#F4F4F6] border border-[#E4E4E7] hover:border-[#D4D4D8] disabled:opacity-60 text-[#18181B] font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-[#3795AE]" />
                <span>Conectando ao Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>
                  {mode === 'login' ? 'Continuar com Google' : 'Cadastrar com Google'}
                </span>
              </>
            )}
          </button>

          {/* Footer Switch Link */}
          <p className="text-center text-xs text-[#71717A]">
            {mode === 'login' ? (
              <>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="text-[#3795AE] hover:text-[#2B7E94] font-semibold cursor-pointer"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já possui acesso?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-[#3795AE] hover:text-[#2B7E94] font-semibold cursor-pointer"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>

        {/* Security Assurance Strip */}
        <div className="bg-[#F7F7F8] border border-[#F1F1F3] px-3.5 py-3 rounded-xl flex items-start gap-2.5 text-[11px] text-[#71717A]">
          <ShieldCheck size={15} className="text-[#3795AE] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Autenticação exclusiva via <strong className="text-[#3F3F46] font-medium">Google Firebase</strong> com controle de permissões por perfil (<strong className="text-[#3F3F46] font-medium">Gestão</strong>, <strong className="text-[#3F3F46] font-medium">Dentista</strong> e <strong className="text-[#3F3F46] font-medium">Funcionário</strong>).
          </p>
        </div>
      </div>
    </div>
  );
}
