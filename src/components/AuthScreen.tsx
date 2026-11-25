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
      <div className="min-h-[100dvh] w-full overflow-x-clip bg-[#F7F8FA] flex flex-col items-center justify-center px-4 py-8 select-none font-sans">
        <div className="bg-white border border-[#E6EAF0] p-7 sm:p-9 rounded-3xl max-w-[460px] w-full space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <ClinicLogo className="w-12 h-12" />
            <div className="space-y-1">
              <h1 className="font-display font-semibold text-2xl text-[#14181F] tracking-[-0.02em]">
                Finalize seu cadastro
              </h1>
              <p className="text-sm text-[#647082]">
                Confirme seu nome para começar a usar o painel da clínica.
              </p>
            </div>
          </div>

          {/* Verified Google Account Summary */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#F7F8FA] border border-[#E6EAF0]">
            {pendingGoogleUser.photoURL ? (
              <img
                src={pendingGoogleUser.photoURL}
                alt={pendingGoogleUser.displayName || 'Conta Google'}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-[#E6EAF0] shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#3795AE]/15 text-[#3795AE] font-semibold text-sm flex items-center justify-center shrink-0">
                {(pendingGoogleUser.displayName || pendingGoogleUser.email || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#14181F] truncate">
                {pendingGoogleUser.email}
              </p>
              <p className="text-xs text-[#15803D] font-medium flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={14} />
                <span>Conta Google conectada · Perfil {ROLE_LABELS[assignedRole]}</span>
              </p>
            </div>
          </div>

          <p className="text-[13px] text-[#647082] leading-relaxed">
            {hasInvite ? (
              <>
                Seu acesso já está liberado como <strong className="text-[#14181F] font-semibold">{ROLE_LABELS[assignedRole]}</strong>.
              </>
            ) : (
              <>
                Seu acesso inicia como <strong className="text-[#14181F] font-semibold">Funcionário</strong>. Se precisar de outro perfil, a Gestão pode ajustar depois.
              </>
            )}
          </p>

          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Seu nome completo
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Digite seu nome"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Nome da clínica
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Seja Mais Odontologia"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Função <span className="text-[#94A0B2] font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ex: Recepção, ASB, Dentista"
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  WhatsApp <span className="text-[#94A0B2] font-normal">(opcional)</span>
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 rounded-xl font-medium">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Salvando cadastro...</span>
                </>
              ) : (
                <>
                  <span>Concluir e entrar</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-[#ECEFF3] pt-4 text-center">
            <button
              type="button"
              onClick={handleSwitchAccount}
              disabled={isLoading}
              className="text-[13px] text-[#647082] hover:text-[#14181F] inline-flex items-center gap-2 font-medium transition-colors cursor-pointer py-1"
            >
              <LogOut size={15} />
              <span>Trocar de conta Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: CALM, SIMPLE GOOGLE LOGIN & REGISTRATION SCREEN
  return (
    <div className="min-h-[100dvh] w-full overflow-x-clip bg-[#F7F8FA] flex flex-col items-center justify-center px-4 py-8 select-none font-sans">
      <div className="bg-white border border-[#E6EAF0] p-7 sm:p-10 rounded-3xl max-w-[430px] w-full space-y-7">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3.5">
          <ClinicLogo className="w-14 h-14" />
          <div className="space-y-1">
            <h1 className="font-display font-semibold text-2xl text-[#14181F] tracking-[-0.02em]">
              Seja Mais Odontologia
            </h1>
            <p className="text-sm text-[#647082]">
              Sistema da clínica
            </p>
          </div>
        </div>

        {/* Clean Segmented Toggle: Entrar / Primeiro acesso */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#F1F4F7] p-1.5 rounded-xl text-sm font-medium text-[#647082]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                : 'hover:text-[#14181F]'
            }`}
          >
            Já tenho acesso
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                : 'hover:text-[#14181F]'
            }`}
          >
            Primeiro acesso
          </button>
        </div>

        {/* Auth Body */}
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <h2 className="text-base font-semibold text-[#14181F]">
              {mode === 'login' ? 'Entre com sua conta Google' : 'Crie seu acesso com o Google'}
            </h2>
            <p className="text-sm text-[#647082] leading-relaxed">
              {mode === 'login'
                ? 'Clique no botão abaixo e escolha o seu e-mail do Google para entrar.'
                : 'Não precisa criar senha. Basta clicar abaixo e escolher sua conta Google.'}
            </p>
          </div>

          {errorMsg && (
            <div className="text-[13px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-4 py-3.5 rounded-xl font-medium text-center space-y-2.5">
              <p>{errorMsg}</p>
              {showOpenNewTab && typeof window !== 'undefined' && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] font-semibold transition-colors"
                >
                  <ExternalLink size={14} />
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
            className="w-full min-h-[52px] py-3.5 px-5 rounded-xl bg-white hover:bg-[#F8FAFC] active:bg-[#F1F4F7] border border-[#D4DBE5] hover:border-[#3795AE] disabled:opacity-60 text-[#14181F] font-semibold text-[15px] flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin text-[#3795AE]" />
                <span>Abrindo Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>
                  {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Calm Security Assurance Footer */}
        <div className="pt-4 border-t border-[#ECEFF3] flex items-start gap-3 text-[13px] text-[#647082]">
          <ShieldCheck size={18} className="text-[#3795AE] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Cada pessoa vê apenas as telas da sua função (<strong className="text-[#14181F] font-medium">Gestão</strong>, <strong className="text-[#14181F] font-medium">Dentista</strong> ou <strong className="text-[#14181F] font-medium">Funcionário</strong>).
          </p>
        </div>
      </div>
    </div>
  );
}
