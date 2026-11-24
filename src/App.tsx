/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar, { ClinicLogo } from './components/Sidebar';
import Overview from './components/Overview';
import Doctors from './components/Doctors';
import GoalsTeam from './components/GoalsTeam';
import Supplies from './components/Supplies';
import History from './components/History';
import Sanitizacao from './components/Sanitizacao';
import Laboratorio from './components/Laboratorio';
import Utilities from './components/Utilities';
import Financial from './components/Financial';

import {
  INITIAL_DOCTORS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUPPLY_ITEMS,
  INITIAL_TEAM_GOALS,
  INITIAL_TEAM_MEMBERS
} from './data';
import { Transaction, Doctor, SupplyItem, TeamGoal, TeamMember } from './types';
import { Calendar, Bell, Lock, Menu, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  isFirebaseConfigured,
  loadCollectionFromFirestore,
  saveToFirestore,
  saveCollectionToFirestore
} from './lib/firebase';

// Minimalist Acesso Restrito View for Restricted Tabs (Funcionários)
function AccessDenied({ tabName }: { tabName: string }) {
  return (
    <div className="max-w-md mx-auto w-full py-20 text-center select-none font-sans">
      <div className="bg-white border border-[#EBEBED] p-8 rounded-2xl space-y-5">
        <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto">
          <Lock size={22} />
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-lg text-[#18181B]">Acesso restrito</h3>
          <p className="text-sm text-[#52525B] leading-relaxed">
            A seção <strong className="text-[#18181B] font-semibold">{tabName}</strong> é exclusiva para o perfil de{' '}
            <strong className="text-[#3795AE] font-semibold">Gerência</strong>.
          </p>
          <p className="text-xs text-[#71717A] leading-relaxed">
            Entre com o perfil de gerência ou solicite autorização para visualizar os indicadores financeiros completos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddTrigger, setQuickAddTrigger] = useState(0);

  // Persisted user session role: 'gerente' | 'funcionario' | null
  const [userRole, setUserRole] = useState<'gerente' | 'funcionario' | null>(() => {
    return localStorage.getItem('clinica_user_role') as 'gerente' | 'funcionario' | null;
  });

  // Login form states
  const [selectedLoginRole, setSelectedLoginRole] = useState<'gerente' | 'funcionario'>('gerente');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Core stateful database persisted in localStorage / Firebase
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(50000);

  // Dynamic live date
  const [currentLiveDate, setCurrentLiveDate] = useState('');
  const [shortLiveDate, setShortLiveDate] = useState('');
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setCurrentLiveDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));

    const shortFmt = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    setShortLiveDate(shortFmt);
  }, []);

  // Notifications State & Engine
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState<
    { id: string; type: 'sanitizacao' | 'compras' | 'laboratorio'; title: string; desc: string; severity: 'low' | 'medium' | 'high' }[]
  >([]);

  useEffect(() => {
    const list: typeof notificationList = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Sanitizações Pendentes
    try {
      const savedLogs = localStorage.getItem('clinica_sanitizacao_logs');
      const logs = savedLogs ? JSON.parse(savedLogs) : [];
      const signedToday = logs.some((l: any) => l.data === todayStr);
      if (!signedToday) {
        list.push({
          id: 'notif-san-1',
          type: 'sanitizacao',
          title: 'Sanitização pendente',
          desc: 'A assinatura da auditoria sanitária diária ainda não foi realizada hoje.',
          severity: 'high'
        });
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Compras Pendentes (Estoque baixo e Validades)
    supplies.forEach(sup => {
      if (sup.stock <= sup.minStock) {
        list.push({
          id: `notif-sup-${sup.id}`,
          type: 'compras',
          title: `Estoque crítico: ${sup.name}`,
          desc: `${sup.name} está com ${sup.stock} ${sup.unit} (mínimo: ${sup.minStock} ${sup.unit}).`,
          severity: 'medium'
        });
      }

      if (sup.expirationDate) {
        const expDate = new Date(sup.expirationDate + 'T23:59:59');
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0) {
          list.push({
            id: `notif-exp-${sup.id}`,
            type: 'compras',
            title: `Produto vencido: ${sup.name}`,
            desc: `Venceu em ${sup.expirationDate.split('-').reverse().join('/')}. Verifique no estoque.`,
            severity: 'high'
          });
        } else if (diffDays <= 30) {
          list.push({
            id: `notif-exp-soon-${sup.id}`,
            type: 'compras',
            title: `Validade próxima: ${sup.name}`,
            desc: `Vence em ${diffDays} dias (${sup.expirationDate.split('-').reverse().join('/')}).`,
            severity: 'medium'
          });
        }
      }
    });

    // 3. Procedimentos Atrasados
    try {
      const savedProcs = localStorage.getItem('clinica_lab_procedures');
      const procs = savedProcs ? JSON.parse(savedProcs) : [];
      procs.forEach((p: any) => {
        const isDelayed = p.expectedReturnDate < todayStr && !['Recebido', 'Instalado'].includes(p.status);
        if (isDelayed) {
          const dateBR = p.expectedReturnDate.split('-').reverse().join('/');
          list.push({
            id: `notif-lab-${p.id}`,
            type: 'laboratorio',
            title: `Trabalho atrasado: ${p.patientName}`,
            desc: `${p.procedureType} previsto para ${dateBR} (${p.laboratoryName}).`,
            severity: 'high'
          });
        }
      });
    } catch (e) {
      console.error(e);
    }

    setNotificationList(list);
  }, [supplies, activeTab]);

  const alertCounts = useMemo(
    () => ({
      compras: notificationList.filter(n => n.type === 'compras').length,
      sanitizacao: notificationList.filter(n => n.type === 'sanitizacao').length,
      laboratorio: notificationList.filter(n => n.type === 'laboratorio').length
    }),
    [notificationList]
  );

  // Initialize data from Firebase (if configured) or fallback to localStorage
  useEffect(() => {
    async function loadData() {
      if (isFirebaseConfigured) {
        try {
          const fbTransactions = await loadCollectionFromFirestore<Transaction>('transactions');
          const fbDoctors = await loadCollectionFromFirestore<Doctor>('doctors');
          const fbSupplies = await loadCollectionFromFirestore<SupplyItem>('supplies');
          const fbGoals = await loadCollectionFromFirestore<TeamGoal>('goals');
          const fbTeam = await loadCollectionFromFirestore<TeamMember>('teamMembers');
          const fbConfig = await loadCollectionFromFirestore<{ id: string; val: number }>('config');

          if (fbTransactions && fbTransactions.length > 0) {
            setTransactions(fbTransactions);
          } else {
            setTransactions(INITIAL_TRANSACTIONS);
            await saveCollectionToFirestore('transactions', INITIAL_TRANSACTIONS);
          }

          if (fbDoctors && fbDoctors.length > 0) {
            setDoctors(fbDoctors);
          } else {
            setDoctors(INITIAL_DOCTORS);
            await saveCollectionToFirestore('doctors', INITIAL_DOCTORS);
          }

          if (fbSupplies && fbSupplies.length > 0) {
            setSupplies(fbSupplies);
          } else {
            setSupplies(INITIAL_SUPPLY_ITEMS);
            await saveCollectionToFirestore('supplies', INITIAL_SUPPLY_ITEMS);
          }

          if (fbGoals && fbGoals.length > 0) {
            setGoals(fbGoals);
          } else {
            setGoals(INITIAL_TEAM_GOALS);
            await saveCollectionToFirestore('goals', INITIAL_TEAM_GOALS);
          }

          if (fbTeam && fbTeam.length > 0) {
            setTeamMembers(fbTeam);
          } else {
            setTeamMembers(INITIAL_TEAM_MEMBERS);
            await saveCollectionToFirestore('teamMembers', INITIAL_TEAM_MEMBERS);
          }

          const monthlyGoalDoc = fbConfig?.find(c => c.id === 'monthly_goal');
          if (monthlyGoalDoc) {
            setMonthlyGoal(monthlyGoalDoc.val);
          } else {
            setMonthlyGoal(50000);
            await saveToFirestore('config', 'monthly_goal', { val: 50000 });
          }
          return;
        } catch (error) {
          console.error('[Firebase] Falha na sincronização, usando LocalStorage como fallback:', error);
        }
      }

      const savedTransactions = localStorage.getItem('clinica_transactions');
      const savedDoctors = localStorage.getItem('clinica_doctors');
      const savedSupplies = localStorage.getItem('clinica_supplies');
      const savedGoals = localStorage.getItem('clinica_goals');
      const savedTeam = localStorage.getItem('clinica_team');
      const savedGoalVal = localStorage.getItem('clinica_monthly_goal');

      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      else setTransactions(INITIAL_TRANSACTIONS);

      if (savedDoctors) setDoctors(JSON.parse(savedDoctors));
      else setDoctors(INITIAL_DOCTORS);

      if (savedSupplies) setSupplies(JSON.parse(savedSupplies));
      else setSupplies(INITIAL_SUPPLY_ITEMS);

      if (savedGoals) setGoals(JSON.parse(savedGoals));
      else setGoals(INITIAL_TEAM_GOALS);

      if (savedTeam) setTeamMembers(JSON.parse(savedTeam));
      else setTeamMembers(INITIAL_TEAM_MEMBERS);

      if (savedGoalVal) setMonthlyGoal(parseInt(savedGoalVal));
      else setMonthlyGoal(50000);
    }

    loadData();
  }, []);

  // Save states to localStorage and Firebase upon changes
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('clinica_transactions', JSON.stringify(transactions));
      if (isFirebaseConfigured) saveCollectionToFirestore('transactions', transactions);
    }
  }, [transactions]);

  useEffect(() => {
    if (doctors.length > 0) {
      localStorage.setItem('clinica_doctors', JSON.stringify(doctors));
      if (isFirebaseConfigured) saveCollectionToFirestore('doctors', doctors);
    }
  }, [doctors]);

  useEffect(() => {
    if (supplies.length > 0) {
      localStorage.setItem('clinica_supplies', JSON.stringify(supplies));
      if (isFirebaseConfigured) saveCollectionToFirestore('supplies', supplies);
    }
  }, [supplies]);

  useEffect(() => {
    if (goals.length > 0) {
      localStorage.setItem('clinica_goals', JSON.stringify(goals));
      if (isFirebaseConfigured) saveCollectionToFirestore('goals', goals);
    }
  }, [goals]);

  useEffect(() => {
    if (teamMembers.length > 0) {
      localStorage.setItem('clinica_team', JSON.stringify(teamMembers));
      if (isFirebaseConfigured) saveCollectionToFirestore('teamMembers', teamMembers);
    }
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem('clinica_monthly_goal', monthlyGoal.toString());
    if (isFirebaseConfigured) saveToFirestore('config', 'monthly_goal', { val: monthlyGoal });
  }, [monthlyGoal]);

  // Handle credentials check
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedLoginRole === 'gerente') {
      if (password === 'gerente123') {
        setUserRole('gerente');
        localStorage.setItem('clinica_user_role', 'gerente');
        setPassword('');
      } else {
        setErrorMsg('Senha incorreta para nível de Gerência.');
      }
    } else {
      if (password === 'funcionario123') {
        setUserRole('funcionario');
        localStorage.setItem('clinica_user_role', 'funcionario');
        setPassword('');
        if (!['visao-geral', 'compras'].includes(activeTab)) {
          setActiveTab('visao-geral');
        }
      } else {
        setErrorMsg('Senha incorreta para nível de Funcionário.');
      }
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('clinica_user_role');
  };

  const handleAddTransaction = (newT: Omit<Transaction, 'id' | 'date'> & { date?: string }) => {
    const id = 't-' + Math.random().toString(36).substr(2, 9);
    const date = newT.date || new Date().toISOString().split('T')[0];

    const transaction: Transaction = {
      id,
      ...newT,
      date
    };

    setTransactions(prev => [transaction, ...prev]);

    if (transaction.type === 'receita') {
      setDoctors(prev =>
        prev.map(doc =>
          doc.name === transaction.doctorName
            ? { ...doc, currentEarnings: doc.currentEarnings + transaction.value }
            : doc
        )
      );

      setGoals(prev =>
        prev.map(goal =>
          goal.title.includes('faturamento') ||
          goal.assignedTo === 'Toda a Equipe' ||
          goal.assignedTo === transaction.doctorName
            ? { ...goal, currentValue: goal.currentValue + transaction.value }
            : goal
        )
      );
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    setTransactions(prev => prev.filter(t => t.id !== id));

    if (target.type === 'receita') {
      setDoctors(prev =>
        prev.map(doc =>
          doc.name === target.doctorName
            ? { ...doc, currentEarnings: Math.max(doc.currentEarnings - target.value, 0) }
            : doc
        )
      );
    }

    setGoals(prev =>
      prev.map(goal => {
        if (target.type === 'receita') {
          if (
            goal.title.includes('faturamento') ||
            goal.assignedTo === 'Toda a Equipe' ||
            goal.assignedTo === target.doctorName
          ) {
            return { ...goal, currentValue: Math.max(goal.currentValue - target.value, 0) };
          }
        } else if (target.type === 'despesa' && target.category === 'Materiais') {
          if (
            goal.assignedTo === 'Equipe de Compras' ||
            goal.title.includes('Materiais') ||
            goal.title.includes('gasto')
          ) {
            return { ...goal, currentValue: Math.max(goal.currentValue - target.value, 0) };
          }
        }
        return goal;
      })
    );
  };

  const handleUpdateDoctorTarget = (id: string, newTarget: number) => {
    setDoctors(prev => prev.map(doc => (doc.id === id ? { ...doc, monthlyTarget: newTarget } : doc)));
  };

  const handleAddSupplyItem = (newItem: Omit<SupplyItem, 'id'>) => {
    const id = 'sup-' + Math.random().toString(36).substr(2, 9);
    setSupplies(prev => [...prev, { id, ...newItem }]);
  };

  const handleUpdateSupplyItem = (id: string, updatedFields: Partial<SupplyItem>) => {
    setSupplies(prev => prev.map(item => (item.id === id ? { ...item, ...updatedFields } : item)));
  };

  const handleDeleteSupplyItem = (id: string) => {
    setSupplies(prev => prev.filter(item => item.id !== id));
  };

  const handleAddDoctor = (newDoc: Omit<Doctor, 'id'>) => {
    const id = 'doc-' + Math.random().toString(36).substr(2, 9);
    setDoctors(prev => [...prev, { id, ...newDoc }]);
  };

  const handleUpdateDoctorStats = (
    id: string,
    stats: { evaluations: number; closures: number; monthlyTarget: number }
  ) => {
    setDoctors(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, evaluations: stats.evaluations, closures: stats.closures, monthlyTarget: stats.monthlyTarget }
          : d
      )
    );
  };

  const handleAddStock = (id: string, qty: number) => {
    setSupplies(prev => prev.map(sup => (sup.id === id ? { ...sup, stock: sup.stock + qty } : sup)));
  };

  const handleRecordPurchaseExpense = (
    description: string,
    value: number,
    customDate?: string,
    supplier?: string,
    subcategory?: string
  ) => {
    const id = 't-exp-' + Math.random().toString(36).substr(2, 9);
    const date = customDate || new Date().toISOString().split('T')[0];

    const transaction: Transaction = {
      id,
      date,
      description,
      doctorName: 'Administração',
      value,
      category: 'Materiais',
      type: 'despesa',
      supplier,
      subcategory
    };

    setTransactions(prev => [transaction, ...prev]);

    setGoals(prev =>
      prev.map(goal =>
        goal.assignedTo === 'Equipe de Compras' ||
        goal.title.includes('Materiais') ||
        goal.title.includes('gasto')
          ? { ...goal, currentValue: goal.currentValue + value }
          : goal
      )
    );
  };

  const handleUpdateGoalProgress = (id: string, progressDelta: number) => {
    setGoals(prev =>
      prev.map(goal => (goal.id === id ? { ...goal, currentValue: goal.currentValue + progressDelta } : goal))
    );
  };

  const handleToggleStatus = (id: string, status: 'Ativo' | 'Em plantão' | 'Ausente') => {
    setTeamMembers(prev => prev.map(member => (member.id === id ? { ...member, status } : member)));
  };

  const handleAddGoal = (newGoal: Omit<TeamGoal, 'id'>) => {
    const id = 'g-' + Math.random().toString(36).substr(2, 9);
    setGoals(prev => [...prev, { id, ...newGoal }]);
  };

  const handleAddMember = (newMember: Omit<TeamMember, 'id'>) => {
    const id = 'tm-' + Math.random().toString(36).substr(2, 9);
    setTeamMembers(prev => [...prev, { id, ...newMember }]);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Deseja mesmo redefinir todos os faturamentos e estoques para os valores iniciais do sistema?'
      )
    ) {
      localStorage.removeItem('clinica_transactions');
      localStorage.removeItem('clinica_doctors');
      localStorage.removeItem('clinica_supplies');
      localStorage.removeItem('clinica_goals');
      localStorage.removeItem('clinica_team');
      localStorage.removeItem('clinica_monthly_goal');
      localStorage.removeItem('clinica_gamification_v3');

      setTransactions(INITIAL_TRANSACTIONS);
      setDoctors(INITIAL_DOCTORS);
      setSupplies(INITIAL_SUPPLY_ITEMS);
      setGoals(INITIAL_TEAM_GOALS);
      setTeamMembers(INITIAL_TEAM_MEMBERS);
      setMonthlyGoal(50000);
      setActiveTab('visao-geral');
    }
  };

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'visao-geral':
        return {
          title: userRole === 'gerente' ? 'Bem-vinda de volta, Dra. Ana' : 'Bem-vinda, Mariana',
          subtitle: `${currentLiveDate || 'Hoje'} · ${isFirebaseConfigured ? 'Nuvem sincronizada' : 'Dados locais ativos'}`
        };
      case 'financeiro':
        return {
          title: 'Financeiro',
          subtitle: 'DRE gerencial, fechamento de caixa diário e fluxo de lançamentos'
        };
      case 'doutora':
        return {
          title: 'Dentistas',
          subtitle: 'Produção individual, metas, conversão de avaliações e escala'
        };
      case 'metas-equipe':
        return {
          title: 'Metas & equipe',
          subtitle: 'Objetivos clínicos, acompanhamento da equipe e engajamento'
        };
      case 'compras':
        return {
          title: 'Compras e estoque',
          subtitle: 'Controle de insumos odontológicos, validades e registros de compra'
        };
      case 'sanitizacao':
        return {
          title: 'Sanitização',
          subtitle: 'Protocolo diário de esterilização, biossegurança e assinaturas'
        };
      case 'laboratorio':
        return {
          title: 'Laboratório',
          subtitle: 'Acompanhamento de próteses, prazos de retorno e entregas'
        };
      case 'utilitarios':
        return {
          title: 'Utilitários',
          subtitle: 'Calculadoras clínicas, documentos rápidos e ferramentas de apoio'
        };
      case 'historico':
        return {
          title: 'Histórico',
          subtitle: 'Registro completo de lançamentos financeiros e emissão de recibos'
        };
      default:
        return { title: 'Visão geral', subtitle: currentLiveDate };
    }
  };

  // MINIMALIST LOGIN SCREEN
  if (!userRole) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="bg-white border border-[#EBEBED] p-8 rounded-2xl max-w-[380px] w-full space-y-6">
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

          <div className="border-t border-[#F1F1F3] pt-5 space-y-4">
            {/* Segmented Role Selector */}
            <div className="grid grid-cols-2 gap-1 bg-[#F4F4F6] p-1 rounded-xl text-xs font-medium text-[#71717A]">
              <button
                type="button"
                onClick={() => {
                  setSelectedLoginRole('gerente');
                  setPassword('');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedLoginRole === 'gerente'
                    ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'hover:text-[#18181B]'
                }`}
              >
                Gerência
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLoginRole('funcionario');
                  setPassword('');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedLoginRole === 'funcionario'
                    ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'hover:text-[#18181B]'
                }`}
              >
                Funcionário
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                  Senha de acesso
                </label>
                <input
                  type="password"
                  required
                  placeholder={selectedLoginRole === 'gerente' ? 'Digite a senha de gerência' : 'Digite a senha de funcionário'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-[#DC2626] font-medium">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Entrar no sistema
              </button>
            </form>
          </div>

          <div className="bg-[#F7F7F8] border border-[#F1F1F3] px-3.5 py-3 rounded-xl text-[11px] text-[#71717A] space-y-1">
            <p className="font-medium text-[#52525B]">Acesso de demonstração</p>
            <p>
              Gerência: <span className="font-mono text-[#18181B] font-medium">gerente123</span> · Funcionário:{' '}
              <span className="font-mono text-[#18181B] font-medium">funcionario123</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const headerMeta = getHeaderMeta();

  return (
    <div className="bg-[#FAFAFA] text-[#18181B] min-h-screen flex font-sans">
      {/* Full-Height Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        onLogout={handleLogout}
        userRole={userRole}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        alertCounts={alertCounts}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200 ease-out ${
          isCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
        } ml-0`}
      >
        {/* Unified Minimalist Top Workspace Header */}
        <header className="sticky top-0 z-20 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-[#ECECEE]/80 px-4 sm:px-8 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            {/* Left: Mobile Trigger + Title & Quiet Subtitle */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden w-9 h-9 rounded-xl bg-white border border-[#EBEBED] text-[#52525B] hover:text-[#18181B] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Abrir menu"
              >
                <Menu size={18} />
              </button>

              <div className="min-w-0">
                <h1 className="font-display font-semibold text-lg sm:text-[22px] text-[#18181B] tracking-[-0.02em] leading-tight truncate">
                  {headerMeta.title}
                </h1>
                <p className="text-xs text-[#71717A] mt-0.5 truncate">
                  {headerMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Minimalist Utility Controls */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Notifications Button & Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-9 h-9 rounded-xl bg-white border border-[#EBEBED] hover:border-[#D4D4D8] text-[#52525B] hover:text-[#18181B] flex items-center justify-center transition-colors relative cursor-pointer"
                  title="Alertas clínicos"
                >
                  <Bell size={16} />
                  {notificationList.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-semibold tabular-nums flex items-center justify-center">
                      {notificationList.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 w-80 bg-white border border-[#EBEBED] rounded-2xl shadow-lg z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[#F1F1F3] flex justify-between items-center">
                        <span className="text-xs font-semibold text-[#18181B]">Alertas clínicos</span>
                        <span className="text-[11px] font-medium text-[#71717A] tabular-nums">
                          {notificationList.length} {notificationList.length === 1 ? 'pendência' : 'pendências'}
                        </span>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto divide-y divide-[#F1F1F3]">
                        {notificationList.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#71717A]">
                            Nenhuma pendência ou atraso detectado no momento.
                          </div>
                        ) : (
                          notificationList.map(notif => (
                            <button
                              key={notif.id}
                              onClick={() => {
                                if (notif.type === 'sanitizacao') setActiveTab('sanitizacao');
                                if (notif.type === 'compras') setActiveTab('compras');
                                if (notif.type === 'laboratorio') setActiveTab('laboratorio');
                                setShowNotifications(false);
                              }}
                              className="w-full p-3.5 hover:bg-[#FAFAFA] transition-colors cursor-pointer text-left space-y-1 block"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold text-[#18181B] truncate">{notif.title}</h4>
                                <span
                                  className={`text-[10px] font-medium shrink-0 ${
                                    notif.severity === 'high' ? 'text-[#DC2626]' : 'text-[#D97706]'
                                  }`}
                                >
                                  {notif.severity === 'high' ? 'Urgente' : 'Atenção'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#71717A] leading-relaxed">{notif.desc}</p>
                              <div className="text-[11px] text-[#3795AE] font-medium flex items-center gap-1 pt-0.5">
                                <span>Abrir seção</span>
                                <ArrowRight size={11} />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Compact Date Pill */}
              <div className="hidden sm:flex items-center gap-2 bg-white border border-[#EBEBED] px-3 py-2 rounded-xl text-xs font-medium text-[#3F3F46] whitespace-nowrap shrink-0">
                <Calendar size={14} className="text-[#71717A]" />
                <span className="tabular-nums">{shortLiveDate || 'Hoje'}</span>
              </div>

              {/* Single Primary Action on Overview */}
              {activeTab === 'visao-geral' && (
                <button
                  onClick={() => setQuickAddTrigger(prev => prev + 1)}
                  className="flex items-center gap-1.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus size={15} />
                  <span>Novo lançamento</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Active View Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto w-full">
            {activeTab === 'visao-geral' && (
              <Overview
                transactions={transactions}
                doctors={doctors}
                onAddTransaction={handleAddTransaction}
                monthlyGoal={monthlyGoal}
                setMonthlyGoal={setMonthlyGoal}
                onNavigate={setActiveTab}
                openAddTrigger={quickAddTrigger}
              />
            )}

            {activeTab === 'financeiro' &&
              (userRole === 'funcionario' ? (
                <AccessDenied tabName="Financeiro" />
              ) : (
                <Financial
                  transactions={transactions}
                  doctors={doctors}
                  onAddTransaction={handleAddTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  userRole={userRole || 'gerente'}
                />
              ))}

            {activeTab === 'doutora' && (
              <Doctors
                doctors={doctors}
                transactions={transactions}
                onUpdateTarget={handleUpdateDoctorTarget}
                onAddTransaction={handleAddTransaction}
                onAddDoctor={handleAddDoctor}
                onUpdateDoctorStats={handleUpdateDoctorStats}
              />
            )}

            {activeTab === 'metas-equipe' &&
              (userRole === 'funcionario' ? (
                <AccessDenied tabName="Metas & equipe" />
              ) : (
                <GoalsTeam
                  goals={goals}
                  teamMembers={teamMembers}
                  doctors={doctors}
                  transactions={transactions}
                  onAddGoal={handleAddGoal}
                  onAddMember={handleAddMember}
                  onUpdateGoalProgress={handleUpdateGoalProgress}
                  onToggleStatus={handleToggleStatus}
                />
              ))}

            {activeTab === 'compras' && (
              <Supplies
                supplies={supplies}
                onAddStock={handleAddStock}
                onRecordPurchaseExpense={handleRecordPurchaseExpense}
                userRole={userRole}
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                onAddSupplyItem={handleAddSupplyItem}
                onUpdateSupplyItem={handleUpdateSupplyItem}
                onDeleteSupplyItem={handleDeleteSupplyItem}
              />
            )}

            {activeTab === 'sanitizacao' && <Sanitizacao />}

            {activeTab === 'laboratorio' && <Laboratorio doctors={doctors} />}

            {activeTab === 'utilitarios' && <Utilities doctors={doctors} />}

            {activeTab === 'historico' &&
              (userRole === 'funcionario' ? (
                <AccessDenied tabName="Histórico" />
              ) : (
                <History transactions={transactions} onDeleteTransaction={handleDeleteTransaction} />
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}
