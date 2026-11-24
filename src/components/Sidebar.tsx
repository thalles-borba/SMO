/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  History,
  LogOut,
  Stethoscope,
  RefreshCw,
  ClipboardCheck,
  FlaskConical,
  Wrench,
  DollarSign,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Building2,
  ChevronDown,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { UserRole, ROLE_LABELS } from '../lib/firebase';

export function canAccessTab(role: UserRole, tabId: string): boolean {
  if (role === 'gestao') return true;
  if (role === 'dentista') {
    return ['doutora', 'sanitizacao', 'laboratorio', 'utilitarios'].includes(tabId);
  }
  // funcionario
  return ['compras', 'doutora', 'sanitizacao', 'laboratorio', 'utilitarios'].includes(tabId);
}

interface AlertCounts {
  compras: number;
  sanitizacao: number;
  laboratorio: number;
}

interface SidebarUserInfo {
  displayName: string;
  email?: string | null;
  photoURL?: string;
  clinicName: string;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetData: () => void;
  onLogout: () => void;
  userRole: UserRole;
  userInfo?: SidebarUserInfo;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  alertCounts?: AlertCounts;
}

// Tooth logo matching official clinic branding
export function ClinicLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoTealBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2F8CA3" />
          <stop offset="100%" stopColor="#3DA0B9" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#logoTealBg)" />
      <rect x="26" y="22" width="29" height="65" fill="#FFFFFF" rx="1.5" />
      <rect x="59.5" y="12" width="13.5" height="65" fill="#FFFFFF" rx="1.5" />
      <path
        d="M66.25 16.5 V23.5 M62.75 20 H69.75"
        stroke="#2F8CA3"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
      <path
        d="M 34.5 40.5 C 34.5 37 38.5 35 44 37.5 C 47.5 39 48.5 40 49.5 40 C 50.5 40 51.5 39 55 37.5 C 60.5 35 64.5 37 64.5 40.5 C 64.5 48 65 52.5 61 71 C 59.5 78 57 78 55 70 C 53 62 52 57 49.5 57 C 47 57 46 62 44 70 C 42 78 39.5 78 38 71 C 34 52.5 34.5 48 34.5 40.5 Z"
        fill="#2F8CA3"
      />
    </svg>
  );
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onResetData,
  onLogout,
  userRole,
  userInfo,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
  alertCounts = { compras: 0, sanitizacao: 0, laboratorio: 0 }
}: SidebarProps) {
  const [opsOpen, setOpsOpen] = useState(true);
  const clinicTitle = userInfo?.clinicName || 'Seja Mais Odontologia';
  const roleLabel = ROLE_LABELS[userRole];
  const displayName = userInfo?.displayName || roleLabel;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'SM';

  const primaryItems = [
    { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard, badge: 0 },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, badge: 0 },
    { id: 'doutora', label: 'Dentistas', icon: Stethoscope, badge: 0 },
    { id: 'metas-equipe', label: 'Metas & equipe', icon: Users, badge: 0 },
    { id: 'compras', label: 'Compras', icon: ShoppingCart, badge: alertCounts.compras }
  ];

  const operationsItems = [
    { id: 'sanitizacao', label: 'Sanitização', icon: ClipboardCheck, badge: alertCounts.sanitizacao },
    { id: 'laboratorio', label: 'Laboratório', icon: FlaskConical, badge: alertCounts.laboratorio },
    { id: 'utilitarios', label: 'Utilitários', icon: Wrench, badge: 0 },
    { id: 'historico', label: 'Histórico', icon: History, badge: 0 },
    ...(userRole === 'gestao'
      ? [{ id: 'acessos', label: 'Acessos', icon: ShieldCheck, badge: 0 }]
      : [])
  ];

  const isExpanded = !isCollapsed || mobileOpen;

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const renderNavItem = (item: { id: string; label: string; icon: React.ElementType; badge: number }) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    const isRestricted = !canAccessTab(userRole, item.id);

    return (
      <button
        key={item.id}
        onClick={() => handleTabSelect(item.id)}
        title={!isExpanded ? item.label : undefined}
        className={`w-full flex items-center ${
          !isExpanded ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
        } rounded-xl text-left transition-all duration-150 cursor-pointer min-h-[40px] ${
          isActive
            ? 'bg-white text-[#18181B] font-semibold border border-[#EBEBED] shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
            : 'text-[#52525B] hover:text-[#18181B] hover:bg-[#EFEFF2]/80 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            size={17}
            strokeWidth={isActive ? 2.1 : 1.75}
            className={`shrink-0 transition-colors ${isActive ? 'text-[#3795AE]' : 'text-[#71717A]'}`}
          />
          {isExpanded && (
            <span className="text-[13.5px] tracking-[-0.01em] truncate">{item.label}</span>
          )}
        </div>

        {isExpanded && (
          <div className="flex items-center gap-1.5 shrink-0">
            {item.badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-[#EAEAEF] text-[#3F3F46] text-[11px] font-semibold tabular-nums flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {isRestricted && (
              <Lock size={13} className="text-[#A1A1AA]" aria-label="Acesso restrito para este perfil" />
            )}
          </div>
        )}
      </button>
    );
  };

  const navContent = (
    <div className="flex flex-col h-full py-4 px-3 select-none">
      {/* Top Brand Header + Collapse Toggle */}
      <div className={`flex items-center ${isExpanded ? 'justify-between px-1.5' : 'justify-center'} mb-4`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <ClinicLogo className="w-8 h-8 shrink-0" />
          {isExpanded && (
            <span className="font-display font-bold text-[16px] tracking-[-0.02em] text-[#18181B] truncate">
              Seja Mais
            </span>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="hidden md:flex w-7 h-7 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#EFEFF2] items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Recolher menu"
          >
            <PanelLeftClose size={16} />
          </button>
        )}

        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden w-8 h-8 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#EFEFF2] flex items-center justify-center transition-colors shrink-0"
          title="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {!isExpanded && (
        <div className="hidden md:flex justify-center mb-3">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-9 h-9 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#EFEFF2] flex items-center justify-center transition-colors cursor-pointer"
            title="Expandir menu"
          >
            <PanelLeftOpen size={17} />
          </button>
        </div>
      )}

      {/* Clinic Context Card (Mirrors Workspace Switcher) */}
      {isExpanded ? (
        <div className="mb-4 px-1">
          <div className="flex items-center gap-2.5 bg-[#EFEFF2]/75 border border-[#E4E4E7]/80 px-3 py-2 rounded-xl">
            <div className="w-6 h-6 rounded-md bg-white border border-[#E4E4E7] flex items-center justify-center text-[#3795AE] shrink-0">
              <Building2 size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[#18181B] truncate leading-tight">
                {clinicTitle}
              </p>
              <p className="text-[11px] text-[#71717A] leading-tight mt-0.5">
                Unidade Principal · {roleLabel}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex justify-center">
          <div
            className="w-9 h-9 rounded-xl bg-[#EFEFF2]/80 border border-[#E4E4E7]/80 flex items-center justify-center text-[#3795AE]"
            title={`${clinicTitle} · ${roleLabel}`}
          >
            <Building2 size={15} />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto space-y-5 px-0.5">
        {/* Primary Group */}
        <div className="space-y-1">
          {primaryItems.map(renderNavItem)}
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-[#ECECEE] mx-1.5" />

        {/* Clinical Operations Group */}
        <div className="space-y-1">
          {isExpanded && (
            <button
              type="button"
              onClick={() => setOpsOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-1 text-[11.5px] font-medium text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
            >
              <span>Operações clínicas</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-150 ${opsOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
          )}
          {(opsOpen || !isExpanded) && (
            <div className="space-y-1">
              {operationsItems.map(renderNavItem)}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Profile & Session Card */}
      <div className="mt-auto pt-3">
        {isExpanded ? (
          <div className="bg-white border border-[#EBEBED] rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              {userInfo?.photoURL ? (
                <img
                  src={userInfo.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-[#EBEBED] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#3795AE]/10 text-[#3795AE] border border-[#3795AE]/15 flex items-center justify-center font-semibold text-xs shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#18181B] truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#71717A] truncate leading-tight mt-0.5">
                  {userInfo?.email || roleLabel}
                </p>
              </div>
            </div>

            <div className="border-t border-[#F1F1F3] pt-2 space-y-1">
              {userRole === 'gestao' && (
                <button
                  onClick={onResetData}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F6] transition-colors cursor-pointer"
                  title="Restaurar dados iniciais"
                >
                  <RefreshCw size={14} className="text-[#71717A]" />
                  <span>Restaurar dados</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium text-[#52525B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                title="Sair da conta"
              >
                <LogOut size={14} className="text-[#71717A]" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-[#ECECEE]">
            {userRole === 'gestao' && (
              <button
                onClick={onResetData}
                className="w-9 h-9 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#EFEFF2] flex items-center justify-center transition-colors cursor-pointer"
                title="Restaurar dados iniciais"
              >
                <RefreshCw size={16} />
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl text-[#71717A] hover:text-[#DC2626] hover:bg-[#FEF2F2] flex items-center justify-center transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP FULL-HEIGHT SIDEBAR */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-[#F7F7F8] border-r border-[#ECECEE] flex-col z-30 transition-all duration-200 ease-out ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {navContent}
      </aside>

      {/* MOBILE DRAWER BACKDROP */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-200"
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-[min(18rem,85vw)] bg-[#F7F7F8] border-r border-[#ECECEE] z-50 transform transition-transform duration-200 ease-out md:hidden shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
