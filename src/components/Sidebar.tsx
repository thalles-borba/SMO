/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  FileText,
  DollarSign,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ShieldCheck,
  CalendarDays
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

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge: number;
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
  const clinicTitle = userInfo?.clinicName || 'Seja Mais Odontologia';
  const roleLabel = ROLE_LABELS[userRole];
  const displayName = userInfo?.displayName || roleLabel;
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'SM';

  // Only render tabs the logged-in user can actually use — zero confusing dead-end locked screens
  const navGroups: { title?: string; items: NavItem[] }[] =
    userRole === 'gestao'
      ? [
          {
            title: 'Gestão',
            items: [
              { id: 'visao-geral', label: 'Início', icon: LayoutDashboard, badge: 0 },
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign, badge: 0 },
              { id: 'doutora', label: 'Dentistas e escala', icon: Stethoscope, badge: 0 },
              { id: 'metas-equipe', label: 'Metas e equipe', icon: Users, badge: 0 },
              { id: 'historico', label: 'Histórico', icon: History, badge: 0 }
            ]
          },
          {
            title: 'Dia a dia da clínica',
            items: [
              { id: 'compras', label: 'Estoque e compras', icon: ShoppingCart, badge: alertCounts.compras },
              { id: 'sanitizacao', label: 'Limpeza e sanitização', icon: ClipboardCheck, badge: alertCounts.sanitizacao },
              { id: 'laboratorio', label: 'Laboratório', icon: FlaskConical, badge: alertCounts.laboratorio },
              { id: 'utilitarios', label: 'Documentos e Pix', icon: FileText, badge: 0 }
            ]
          },
          {
            title: 'Equipe e sistema',
            items: [{ id: 'acessos', label: 'Controle de acessos', icon: ShieldCheck, badge: 0 }]
          }
        ]
      : userRole === 'dentista'
      ? [
          {
            title: 'Minha rotina',
            items: [
              { id: 'doutora', label: 'Meu desempenho', icon: Stethoscope, badge: 0 },
              { id: 'sanitizacao', label: 'Limpeza e sanitização', icon: ClipboardCheck, badge: alertCounts.sanitizacao },
              { id: 'laboratorio', label: 'Laboratório', icon: FlaskConical, badge: alertCounts.laboratorio },
              { id: 'utilitarios', label: 'Documentos e Pix', icon: FileText, badge: 0 }
            ]
          }
        ]
      : [
          {
            title: 'Minha rotina',
            items: [
              { id: 'compras', label: 'Estoque e compras', icon: ShoppingCart, badge: alertCounts.compras },
              { id: 'doutora', label: 'Escala dos consultórios', icon: CalendarDays, badge: 0 },
              { id: 'sanitizacao', label: 'Limpeza e sanitização', icon: ClipboardCheck, badge: alertCounts.sanitizacao },
              { id: 'laboratorio', label: 'Laboratório', icon: FlaskConical, badge: alertCounts.laboratorio },
              { id: 'utilitarios', label: 'Documentos e Pix', icon: FileText, badge: 0 }
            ]
          }
        ];

  const isExpanded = !isCollapsed || mobileOpen;

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleTabSelect(item.id)}
        title={!isExpanded ? item.label : undefined}
        className={`w-full flex items-center ${
          !isExpanded ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
        } rounded-xl text-left transition-colors duration-150 cursor-pointer min-h-[44px] ${
          isActive
            ? 'bg-[#3795AE]/10 text-[#1F6F85] font-semibold'
            : 'text-[#4B5563] hover:text-[#14181F] hover:bg-[#F1F4F7] font-medium'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            size={19}
            strokeWidth={isActive ? 2.1 : 1.75}
            className={`shrink-0 transition-colors ${isActive ? 'text-[#3795AE]' : 'text-[#6B7280]'}`}
          />
          {isExpanded && (
            <span className="text-[14px] tracking-[-0.01em] truncate whitespace-nowrap">{item.label}</span>
          )}
        </div>

        {isExpanded && item.badge > 0 && (
          <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-[#FEF2F2] text-[#DC2626] text-[11px] font-semibold tabular-nums flex items-center justify-center shrink-0">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const navContent = (
    <div className="flex flex-col h-full py-5 px-4 select-none">
      {/* Top Brand Header + Collapse Toggle */}
      <div className={`flex items-center ${isExpanded ? 'justify-between px-1' : 'justify-center'} mb-6`}>
        <div className="flex items-center gap-3 min-w-0">
          <ClinicLogo className="w-9 h-9 shrink-0" />
          {isExpanded && (
            <div className="min-w-0">
              <span className="font-display font-bold text-[16px] tracking-[-0.02em] text-[#14181F] block truncate leading-tight">
                Seja Mais
              </span>
              <span className="text-[12px] text-[#647082] block truncate leading-tight mt-0.5">
                {clinicTitle}
              </span>
            </div>
          )}
        </div>

        {isExpanded && (
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="hidden md:flex w-8 h-8 rounded-lg text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Recolher menu"
          >
            <PanelLeftClose size={17} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden w-9 h-9 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center transition-colors shrink-0"
          title="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>

      {!isExpanded && (
        <div className="hidden md:flex justify-center mb-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center transition-colors cursor-pointer"
            title="Expandir menu"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto space-y-6 pr-0.5">
        {navGroups.map((group, idx) => (
          <div key={group.title || idx} className="space-y-1">
            {isExpanded && group.title && (
              <p className="px-3.5 pb-1 text-[12px] font-medium text-[#8A94A6]">
                {group.title}
              </p>
            )}
            <div className="space-y-1">{group.items.map(renderNavItem)}</div>
          </div>
        ))}
      </nav>

      {/* Quiet Bottom Profile & Session Area */}
      <div className="mt-auto pt-5 border-t border-[#ECEFF3]">
        {isExpanded ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              {userInfo?.photoURL ? (
                <img
                  src={userInfo.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-[#E6EAF0] shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#3795AE]/12 text-[#2B7E94] flex items-center justify-center font-semibold text-xs shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-[#14181F] truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[12px] text-[#647082] truncate leading-tight mt-0.5">
                  {roleLabel}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {userRole === 'gestao' && (
                <button
                  type="button"
                  onClick={onResetData}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] transition-colors cursor-pointer min-h-[40px]"
                  title="Zerar todos os dados"
                >
                  <RefreshCw size={15} className="text-[#8A94A6]" />
                  <span>Zerar dados</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#647082] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer min-h-[40px]"
                title="Sair da conta"
              >
                <LogOut size={15} className="text-[#8A94A6]" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {userRole === 'gestao' && (
              <button
                type="button"
                onClick={onResetData}
                className="w-10 h-10 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center transition-colors cursor-pointer"
                title="Zerar todos os dados"
              >
                <RefreshCw size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="w-10 h-10 rounded-xl text-[#647082] hover:text-[#DC2626] hover:bg-[#FEF2F2] flex items-center justify-center transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut size={17} />
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
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-white border-r border-[#E6EAF0] flex-col z-30 transition-all duration-200 ease-out ${
          isCollapsed ? 'w-[76px]' : 'w-[264px]'
        }`}
      >
        {navContent}
      </aside>

      {/* MOBILE DRAWER BACKDROP */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[#14181F]/35 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-200"
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-[min(18.5rem,86vw)] bg-white border-r border-[#E6EAF0] z-50 transform transition-transform duration-200 ease-out md:hidden shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
