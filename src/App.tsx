/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar, { ClinicLogo, canAccessTab } from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import Overview from './components/Overview';
import Doctors from './components/Doctors';
import GoalsTeam from './components/GoalsTeam';
import Supplies from './components/Supplies';
import History from './components/History';
import Sanitizacao from './components/Sanitizacao';
import Laboratorio from './components/Laboratorio';
import Utilities from './components/Utilities';
import Financial from './components/Financial';
import AccessManagement from './components/AccessManagement';

import {
  INITIAL_DOCTORS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUPPLY_ITEMS,
  INITIAL_TEAM_GOALS,
  INITIAL_TEAM_MEMBERS
} from './data';
import { Transaction, Doctor, SupplyItem, TeamGoal, TeamMember } from './types';
import { Calendar, Bell, Lock, Menu, Plus, ArrowRight, Loader2, Ban, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  auth,
  onAuthStateChanged,
  completeGoogleRedirectIfPending,
  signOutUser,
  getUserProfile,
  ensureUserWorkspaceSync,
  loadClinicCollection,
  createClinicDoc,
  updateClinicDoc,
  updateDoctorProgressAsDentista,
  deleteClinicDoc,
  upsertClinicMonthlyGoal,
  seedInitialClinicData,
  clearAndSeedClinicData,
  DEFAULT_CLINIC_ID,
  ROLE_LABELS,
  User,
  UserProfile,
  UserRole
} from './lib/firebase';

function getDefaultTabForRole(role: UserRole): string {
  if (role === 'gestao') return 'visao-geral';
  if (role === 'dentista') return 'doutora';
  return 'compras';
}

// Minimalist Acesso Restrito View for Restricted Tabs
function AccessDenied({
  tabName,
  requiredLabel = 'Gestão',
  currentRole,
  onGoHome
}: {
  tabName: string;
  requiredLabel?: string;
  currentRole: UserRole;
  onGoHome: () => void;
}) {
  return (
    <div className="max-w-md mx-auto w-full py-16 text-center select-none font-sans">
      <div className="bg-white border border-[#EBEBED] p-7 sm:p-8 rounded-2xl space-y-5">
        <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto">
          <Lock size={22} />
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-lg text-[#18181B]">Acesso restrito</h3>
          <p className="text-sm text-[#52525B] leading-relaxed">
            A seção <strong className="text-[#18181B] font-semibold">{tabName}</strong> é exclusiva para o perfil{' '}
            <strong className="text-[#3795AE] font-semibold">{requiredLabel}</strong>.
          </p>
          <p className="text-xs text-[#71717A] leading-relaxed">
            Seu perfil atual é <strong className="text-[#3F3F46] font-medium">{ROLE_LABELS[currentRole]}</strong>. Caso precise desse acesso, solicite à Gestão da clínica.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>Ir para minha área inicial</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// Minimalist Inactive Account Screen
function InactiveAccountScreen({
  displayName,
  email,
  onLogout
}: {
  displayName: string;
  email?: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-6 select-none font-sans">
      <div className="bg-white border border-[#EBEBED] p-7 sm:p-8 rounded-2xl max-w-[400px] w-full text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
          <Ban size={22} />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-semibold text-lg text-[#18181B]">Acesso desativado</h2>
          <p className="text-sm text-[#52525B] leading-relaxed">
            Olá, <strong className="text-[#18181B] font-semibold">{displayName}</strong>. Sua conta está temporariamente desativada pela <strong className="text-[#3795AE] font-semibold">Gestão</strong>.
          </p>
          {email && <p className="text-xs text-[#71717A]">{email}</p>}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FEF2F2] border border-[#E4E4E7] hover:border-[#FECACA] text-[#52525B] hover:text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sair e trocar de conta</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddTrigger, setQuickAddTrigger] = useState(0);

  // Firebase Auth & Profile state
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authRedirectError, setAuthRedirectError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);

  // Core stateful database synchronized with shared clinic Firestore collections
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [monthlyGoal, setMonthlyGoalState] = useState(50000);

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

  // Complete any pending Google redirect sign-in on startup (mobile/Safari fallback)
  useEffect(() => {
    completeGoogleRedirectIfPending().catch((err: any) => {
      const code = err?.code || '';
      if (code && code !== 'auth/popup-closed-by-user') {
        setAuthRedirectError(`Erro ao concluir login Google (${code}). Tente novamente.`);
      }
    });
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setFirebaseUser(null);
        setUserProfile(null);
        setTransactions([]);
        setDoctors([]);
        setSupplies([]);
        setGoals([]);
        setTeamMembers([]);
        setAuthLoading(false);
        return;
      }

      setFirebaseUser(user);
      setAuthLoading(true);
      try {
        const existingProfile = await getUserProfile(user.uid);
        if (existingProfile) {
          const synced = await ensureUserWorkspaceSync(user, existingProfile);
          setUserProfile(synced);
          setActiveTab(prev =>
            canAccessTab(synced.role, prev) ? prev : getDefaultTabForRole(synced.role)
          );
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error('[Firebase] Erro ao carregar perfil do usuário:', err);
        setUserProfile(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const uid = firebaseUser?.uid || null;
  const clinicId = userProfile?.clinicId || DEFAULT_CLINIC_ID;
  const userRole: UserRole = userProfile?.role || 'funcionario';

  // Role-gated clinic data hydration (strictly queries only collections allowed by Firestore Rules)
  useEffect(() => {
    if (!firebaseUser || !userProfile || !userProfile.active) return;

    let cancelled = false;
    const activeUid = firebaseUser.uid;
    const activeClinicId = userProfile.clinicId || DEFAULT_CLINIC_ID;
    const role = userProfile.role;

    async function hydrateClinicData() {
      setDataLoading(true);
      try {
        if (role === 'gestao') {
          const [fbTransactions, fbDoctors, fbSupplies, fbGoals, fbTeam, fbConfig] =
            await Promise.all([
              loadClinicCollection<Transaction>(activeClinicId, 'transactions'),
              loadClinicCollection<Doctor>(activeClinicId, 'doctors'),
              loadClinicCollection<SupplyItem>(activeClinicId, 'supplies'),
              loadClinicCollection<TeamGoal>(activeClinicId, 'goals'),
              loadClinicCollection<TeamMember>(activeClinicId, 'teamMembers'),
              loadClinicCollection<{ id: string; val: number }>(activeClinicId, 'config')
            ]);

          if (cancelled) return;

          const hasExistingWorkspace =
            fbTransactions.length > 0 ||
            fbDoctors.length > 0 ||
            fbSupplies.length > 0 ||
            fbConfig.length > 0;

          if (!hasExistingWorkspace) {
            await seedInitialClinicData(activeClinicId, activeUid, {
              transactions: INITIAL_TRANSACTIONS,
              doctors: INITIAL_DOCTORS,
              supplies: INITIAL_SUPPLY_ITEMS,
              goals: INITIAL_TEAM_GOALS,
              teamMembers: INITIAL_TEAM_MEMBERS,
              monthlyGoal: 50000
            });
            if (cancelled) return;
            setTransactions(INITIAL_TRANSACTIONS);
            setDoctors(INITIAL_DOCTORS);
            setSupplies(INITIAL_SUPPLY_ITEMS);
            setGoals(INITIAL_TEAM_GOALS);
            setTeamMembers(INITIAL_TEAM_MEMBERS);
            setMonthlyGoalState(50000);
          } else {
            setTransactions(
              [...fbTransactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            );
            setDoctors(fbDoctors);
            setSupplies(fbSupplies);
            setGoals(fbGoals);
            setTeamMembers(fbTeam);
            const goalDoc = fbConfig.find(c => c.id === 'monthly_goal');
            setMonthlyGoalState(goalDoc ? goalDoc.val : 50000);
          }
        } else if (role === 'dentista') {
          const fbDoctors = await loadClinicCollection<Doctor>(activeClinicId, 'doctors');
          if (cancelled) return;
          setDoctors(fbDoctors);
          setTransactions([]);
          setSupplies([]);
          setGoals([]);
          setTeamMembers([]);
        } else {
          // funcionario
          const [fbDoctors, fbSupplies] = await Promise.all([
            loadClinicCollection<Doctor>(activeClinicId, 'doctors'),
            loadClinicCollection<SupplyItem>(activeClinicId, 'supplies')
          ]);
          if (cancelled) return;
          setDoctors(fbDoctors);
          setSupplies(fbSupplies);
          setTransactions([]);
          setGoals([]);
          setTeamMembers([]);
        }
      } catch (err) {
        console.error('[Firebase] Erro ao carregar dados da clínica:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    hydrateClinicData();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, userProfile]);

  // Notifications State & Engine (filtered to sections the user's role can access)
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState<
    { id: string; type: 'sanitizacao' | 'compras' | 'laboratorio'; title: string; desc: string; severity: 'low' | 'medium' | 'high' }[]
  >([]);

  useEffect(() => {
    const list: typeof notificationList = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Sanitizações Pendentes
    if (canAccessTab(userRole, 'sanitizacao')) {
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
    }

    // 2. Compras Pendentes (Estoque baixo e Validades)
    if (canAccessTab(userRole, 'compras')) {
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
    }

    // 3. Procedimentos Atrasados
    if (canAccessTab(userRole, 'laboratorio')) {
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
    }

    setNotificationList(list);
  }, [supplies, activeTab, userRole]);

  const alertCounts = useMemo(
    () => ({
      compras: notificationList.filter(n => n.type === 'compras').length,
      sanitizacao: notificationList.filter(n => n.type === 'sanitizacao').length,
      laboratorio: notificationList.filter(n => n.type === 'laboratorio').length
    }),
    [notificationList]
  );

  const handleLogout = async () => {
    try {
      await signOutUser();
      setActiveTab('visao-geral');
    } catch (err) {
      console.error('[Firebase] Erro ao sair:', err);
    }
  };

  const setMonthlyGoal = (val: number) => {
    if (userRole !== 'gestao') return;
    setMonthlyGoalState(val);
    if (uid) {
      upsertClinicMonthlyGoal(clinicId, uid, val).catch(console.error);
    }
  };

  const handleAddTransaction = (newT: Omit<Transaction, 'id' | 'date'> & { date?: string }) => {
    const id = 't-' + Math.random().toString(36).slice(2, 11);
    const date = newT.date || new Date().toISOString().split('T')[0];

    const transaction: Transaction = {
      id,
      ...newT,
      date
    };

    setTransactions(prev => [transaction, ...prev]);
    if (uid) {
      createClinicDoc(clinicId, uid, 'transactions', id, transaction).catch(console.error);
    }

    if (transaction.type === 'receita') {
      setDoctors(prev =>
        prev.map(doc => {
          if (doc.name === transaction.doctorName) {
            const updated = { ...doc, currentEarnings: doc.currentEarnings + transaction.value };
            if (uid) {
              if (userRole === 'gestao') {
                updateClinicDoc(clinicId, uid, 'doctors', doc.id, updated).catch(console.error);
              } else if (userRole === 'dentista' && userProfile?.linkedDoctorId === doc.id) {
                updateDoctorProgressAsDentista(clinicId, doc.id, {
                  currentEarnings: updated.currentEarnings
                }).catch(console.error);
              }
            }
            return updated;
          }
          return doc;
        })
      );

      if (userRole === 'gestao') {
        setGoals(prev =>
          prev.map(goal => {
            if (
              goal.title.includes('faturamento') ||
              goal.assignedTo === 'Toda a Equipe' ||
              goal.assignedTo === transaction.doctorName
            ) {
              const updated = { ...goal, currentValue: goal.currentValue + transaction.value };
              if (uid) updateClinicDoc(clinicId, uid, 'goals', goal.id, updated).catch(console.error);
              return updated;
            }
            return goal;
          })
        );
      }
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (userRole !== 'gestao') return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    setTransactions(prev => prev.filter(t => t.id !== id));
    if (uid) {
      deleteClinicDoc(clinicId, 'transactions', id).catch(console.error);
    }

    if (target.type === 'receita') {
      setDoctors(prev =>
        prev.map(doc => {
          if (doc.name === target.doctorName) {
            const updated = { ...doc, currentEarnings: Math.max(doc.currentEarnings - target.value, 0) };
            if (uid) updateClinicDoc(clinicId, uid, 'doctors', doc.id, updated).catch(console.error);
            return updated;
          }
          return doc;
        })
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
            const updated = { ...goal, currentValue: Math.max(goal.currentValue - target.value, 0) };
            if (uid) updateClinicDoc(clinicId, uid, 'goals', goal.id, updated).catch(console.error);
            return updated;
          }
        } else if (target.type === 'despesa' && target.category === 'Materiais') {
          if (
            goal.assignedTo === 'Equipe de Compras' ||
            goal.title.includes('Materiais') ||
            goal.title.includes('gasto')
          ) {
            const updated = { ...goal, currentValue: Math.max(goal.currentValue - target.value, 0) };
            if (uid) updateClinicDoc(clinicId, uid, 'goals', goal.id, updated).catch(console.error);
            return updated;
          }
        }
        return goal;
      })
    );
  };

  const handleUpdateDoctorTarget = (id: string, newTarget: number) => {
    if (userRole !== 'gestao') return;
    setDoctors(prev =>
      prev.map(doc => {
        if (doc.id === id) {
          const updated = { ...doc, monthlyTarget: newTarget };
          if (uid) updateClinicDoc(clinicId, uid, 'doctors', id, updated).catch(console.error);
          return updated;
        }
        return doc;
      })
    );
  };

  const handleAddSupplyItem = (newItem: Omit<SupplyItem, 'id'>) => {
    if (userRole === 'dentista') return;
    const id = 'sup-' + Math.random().toString(36).slice(2, 11);
    const created: SupplyItem = { id, ...newItem };
    setSupplies(prev => [...prev, created]);
    if (uid) {
      createClinicDoc(clinicId, uid, 'supplies', id, created).catch(console.error);
    }
  };

  const handleUpdateSupplyItem = (id: string, updatedFields: Partial<SupplyItem>) => {
    if (userRole === 'dentista') return;
    setSupplies(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updatedFields };
          if (uid) updateClinicDoc(clinicId, uid, 'supplies', id, updated).catch(console.error);
          return updated;
        }
        return item;
      })
    );
  };

  const handleDeleteSupplyItem = (id: string) => {
    if (userRole === 'dentista') return;
    setSupplies(prev => prev.filter(item => item.id !== id));
    if (uid) {
      deleteClinicDoc(clinicId, 'supplies', id).catch(console.error);
    }
  };

  const handleAddDoctor = (newDoc: Omit<Doctor, 'id'>) => {
    if (userRole !== 'gestao') return;
    const id = 'doc-' + Math.random().toString(36).slice(2, 11);
    const created: Doctor = { id, ...newDoc };
    setDoctors(prev => [...prev, created]);
    if (uid) {
      createClinicDoc(clinicId, uid, 'doctors', id, created).catch(console.error);
    }
  };

  const handleUpdateDoctorStats = (
    id: string,
    stats: { evaluations: number; closures: number; monthlyTarget: number }
  ) => {
    setDoctors(prev =>
      prev.map(d => {
        if (d.id === id) {
          const updated = {
            ...d,
            evaluations: stats.evaluations,
            closures: stats.closures,
            monthlyTarget: userRole === 'gestao' ? stats.monthlyTarget : d.monthlyTarget
          };
          if (uid) {
            if (userRole === 'gestao') {
              updateClinicDoc(clinicId, uid, 'doctors', id, updated).catch(console.error);
            } else if (userRole === 'dentista' && userProfile?.linkedDoctorId === id) {
              updateDoctorProgressAsDentista(clinicId, id, {
                evaluations: stats.evaluations,
                closures: stats.closures
              }).catch(console.error);
            }
          }
          return updated;
        }
        return d;
      })
    );
  };

  const handleAddStock = (id: string, qty: number) => {
    if (userRole === 'dentista') return;
    setSupplies(prev =>
      prev.map(sup => {
        if (sup.id === id) {
          const updated = { ...sup, stock: sup.stock + qty };
          if (uid) updateClinicDoc(clinicId, uid, 'supplies', id, updated).catch(console.error);
          return updated;
        }
        return sup;
      })
    );
  };

  const handleRecordPurchaseExpense = (
    description: string,
    value: number,
    customDate?: string,
    supplier?: string,
    subcategory?: string
  ) => {
    if (userRole === 'dentista') return;
    const id = 't-exp-' + Math.random().toString(36).slice(2, 11);
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
    if (uid) {
      createClinicDoc(clinicId, uid, 'transactions', id, transaction).catch(console.error);
    }

    if (userRole === 'gestao') {
      setGoals(prev =>
        prev.map(goal => {
          if (
            goal.assignedTo === 'Equipe de Compras' ||
            goal.title.includes('Materiais') ||
            goal.title.includes('gasto')
          ) {
            const updated = { ...goal, currentValue: goal.currentValue + value };
            if (uid) updateClinicDoc(clinicId, uid, 'goals', goal.id, updated).catch(console.error);
            return updated;
          }
          return goal;
        })
      );
    }
  };

  const handleUpdateGoalProgress = (id: string, progressDelta: number) => {
    if (userRole !== 'gestao') return;
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id === id) {
          const updated = { ...goal, currentValue: goal.currentValue + progressDelta };
          if (uid) updateClinicDoc(clinicId, uid, 'goals', id, updated).catch(console.error);
          return updated;
        }
        return goal;
      })
    );
  };

  const handleToggleStatus = (id: string, status: 'Ativo' | 'Em plantão' | 'Ausente') => {
    if (userRole !== 'gestao') return;
    setTeamMembers(prev =>
      prev.map(member => {
        if (member.id === id) {
          const updated = { ...member, status };
          if (uid) updateClinicDoc(clinicId, uid, 'teamMembers', id, updated).catch(console.error);
          return updated;
        }
        return member;
      })
    );
  };

  const handleAddGoal = (newGoal: Omit<TeamGoal, 'id'>) => {
    if (userRole !== 'gestao') return;
    const id = 'g-' + Math.random().toString(36).slice(2, 11);
    const created: TeamGoal = { id, ...newGoal };
    setGoals(prev => [...prev, created]);
    if (uid) {
      createClinicDoc(clinicId, uid, 'goals', id, created).catch(console.error);
    }
  };

  const handleAddMember = (newMember: Omit<TeamMember, 'id'>) => {
    if (userRole !== 'gestao') return;
    const id = 'tm-' + Math.random().toString(36).slice(2, 11);
    const created: TeamMember = { id, ...newMember };
    setTeamMembers(prev => [...prev, created]);
    if (uid) {
      createClinicDoc(clinicId, uid, 'teamMembers', id, created).catch(console.error);
    }
  };

  const handleResetData = async () => {
    if (userRole !== 'gestao') return;
    if (
      window.confirm(
        'Deseja mesmo redefinir todos os faturamentos e estoques para os valores iniciais do sistema?'
      )
    ) {
      localStorage.removeItem('clinica_gamification_v3');

      setTransactions(INITIAL_TRANSACTIONS);
      setDoctors(INITIAL_DOCTORS);
      setSupplies(INITIAL_SUPPLY_ITEMS);
      setGoals(INITIAL_TEAM_GOALS);
      setTeamMembers(INITIAL_TEAM_MEMBERS);
      setMonthlyGoalState(50000);
      setActiveTab('visao-geral');

      if (uid) {
        try {
          await clearAndSeedClinicData(clinicId, uid, {
            transactions: INITIAL_TRANSACTIONS,
            doctors: INITIAL_DOCTORS,
            supplies: INITIAL_SUPPLY_ITEMS,
            goals: INITIAL_TEAM_GOALS,
            teamMembers: INITIAL_TEAM_MEMBERS,
            monthlyGoal: 50000
          });
        } catch (err) {
          console.error('[Firebase] Erro ao restaurar dados:', err);
        }
      }
    }
  };

  const firstName = useMemo(() => {
    const raw = userProfile?.displayName || firebaseUser?.displayName || '';
    const cleaned = raw.trim();
    if (!cleaned) return ROLE_LABELS[userRole];
    const parts = cleaned.split(/\s+/);
    if ((parts[0] === 'Dr.' || parts[0] === 'Dra.') && parts[1]) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  }, [userProfile, firebaseUser, userRole]);

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'visao-geral':
        return {
          title: `Olá, ${firstName}`,
          subtitle: `${currentLiveDate || 'Hoje'} · Perfil ${ROLE_LABELS[userRole]}`
        };
      case 'financeiro':
        return {
          title: 'Financeiro',
          subtitle: 'DRE gerencial, fechamento de caixa diário e fluxo de lançamentos'
        };
      case 'doutora':
        return {
          title: userRole === 'funcionario' ? 'Escala dos consultórios' : 'Dentistas',
          subtitle:
            userRole === 'funcionario'
              ? 'Agenda e alocação por consultório e procedimento'
              : 'Produção individual, metas, conversão de avaliações e escala'
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
      case 'acessos':
        return {
          title: 'Controle de acessos',
          subtitle: 'Defina permissões para Gestão, Dentista e Funcionário por conta Google'
        };
      default:
        return { title: 'Visão geral', subtitle: currentLiveDate };
    }
  };

  // INITIAL AUTH LOADING STATE
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#FAFAFA] flex flex-col items-center justify-center p-6 gap-4 font-sans">
        <ClinicLogo className="w-11 h-11" />
        <div className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
          <Loader2 size={15} className="animate-spin text-[#3795AE]" />
          <span>Verificando sua sessão Google...</span>
        </div>
      </div>
    );
  }

  // GOOGLE-ONLY LOGIN & REGISTRATION SCREEN
  if (!firebaseUser || !userProfile) {
    return (
      <AuthScreen
        pendingGoogleUser={firebaseUser}
        externalAuthError={authRedirectError}
        onRegistrationComplete={profile => {
          setUserProfile(profile);
          setActiveTab(getDefaultTabForRole(profile.role));
        }}
      />
    );
  }

  // DEACTIVATED ACCOUNT SCREEN
  if (!userProfile.active) {
    return (
      <InactiveAccountScreen
        displayName={userProfile.displayName}
        email={firebaseUser.email}
        onLogout={handleLogout}
      />
    );
  }

  const headerMeta = getHeaderMeta();
  const goToDefaultTab = () => setActiveTab(getDefaultTabForRole(userRole));

  return (
    <div className="bg-[#FAFAFA] text-[#18181B] min-h-[100dvh] w-full max-w-full overflow-x-clip flex font-sans">
      {/* Full-Height Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        onLogout={handleLogout}
        userRole={userRole}
        userInfo={{
          displayName: userProfile.displayName,
          email: firebaseUser.email,
          photoURL: userProfile.photoURL || firebaseUser.photoURL || undefined,
          clinicName: userProfile.clinicName
        }}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        alertCounts={alertCounts}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full min-h-[100dvh] transition-all duration-200 ease-out ${
          isCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
        } ml-0`}
      >
        {/* Unified Minimalist Top Workspace Header */}
        <header className="sticky top-0 z-20 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-[#ECECEE]/80 px-3.5 sm:px-8 py-3 sm:py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
            {/* Left: Mobile Trigger + Title & Quiet Subtitle */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden w-9 h-9 rounded-xl bg-white border border-[#EBEBED] text-[#52525B] hover:text-[#18181B] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Abrir menu"
              >
                <Menu size={18} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="font-display font-semibold text-[15px] sm:text-[22px] text-[#18181B] tracking-[-0.02em] leading-tight truncate">
                  {headerMeta.title}
                </h1>
                <p className="text-[11px] sm:text-xs text-[#71717A] mt-0.5 truncate">
                  {headerMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Minimalist Utility Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
                      className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[64px] sm:top-11 sm:w-80 bg-white border border-[#EBEBED] rounded-2xl shadow-lg z-50 overflow-hidden"
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

              {/* Single Primary Action on Overview (Gestão only) */}
              {activeTab === 'visao-geral' && userRole === 'gestao' && (
                <button
                  onClick={() => setQuickAddTrigger(prev => prev + 1)}
                  className="flex items-center gap-1.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus size={15} />
                  <span className="hidden sm:inline">Novo lançamento</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Active View Container */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 min-w-0 w-full">
          <div className="max-w-[1400px] mx-auto w-full min-w-0">
            {dataLoading && doctors.length === 0 && supplies.length === 0 && transactions.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-xs text-[#71717A]">
                <Loader2 size={20} className="animate-spin text-[#3795AE]" />
                <span>Carregando dados da clínica...</span>
              </div>
            ) : (
              <>
                {activeTab === 'visao-geral' &&
                  (!canAccessTab(userRole, 'visao-geral') ? (
                    <AccessDenied
                      tabName="Visão geral"
                      requiredLabel="Gestão"
                      currentRole={userRole}
                      onGoHome={goToDefaultTab}
                    />
                  ) : (
                    <Overview
                      transactions={transactions}
                      doctors={doctors}
                      onAddTransaction={handleAddTransaction}
                      monthlyGoal={monthlyGoal}
                      setMonthlyGoal={setMonthlyGoal}
                      onNavigate={setActiveTab}
                      openAddTrigger={quickAddTrigger}
                    />
                  ))}

                {activeTab === 'financeiro' &&
                  (!canAccessTab(userRole, 'financeiro') ? (
                    <AccessDenied
                      tabName="Financeiro"
                      requiredLabel="Gestão"
                      currentRole={userRole}
                      onGoHome={goToDefaultTab}
                    />
                  ) : (
                    <Financial
                      transactions={transactions}
                      doctors={doctors}
                      onAddTransaction={handleAddTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                      userRole={userRole}
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
                    userRole={userRole}
                    linkedDoctorId={userProfile.linkedDoctorId}
                  />
                )}

                {activeTab === 'metas-equipe' &&
                  (!canAccessTab(userRole, 'metas-equipe') ? (
                    <AccessDenied
                      tabName="Metas & equipe"
                      requiredLabel="Gestão"
                      currentRole={userRole}
                      onGoHome={goToDefaultTab}
                    />
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

                {activeTab === 'compras' &&
                  (!canAccessTab(userRole, 'compras') ? (
                    <AccessDenied
                      tabName="Compras e estoque"
                      requiredLabel="Gestão e Funcionário"
                      currentRole={userRole}
                      onGoHome={goToDefaultTab}
                    />
                  ) : (
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
                  ))}

                {activeTab === 'sanitizacao' && <Sanitizacao />}

                {activeTab === 'laboratorio' && <Laboratorio doctors={doctors} />}

                {activeTab === 'utilitarios' && <Utilities doctors={doctors} />}

                {activeTab === 'historico' &&
                  (!canAccessTab(userRole, 'historico') ? (
                    <AccessDenied
                      tabName="Histórico"
                      requiredLabel="Gestão"
                      currentRole={userRole}
                      onGoHome={goToDefaultTab}
                    />
                  ) : (
                    <History transactions={transactions} onDeleteTransaction={handleDeleteTransaction} />
                  ))}

                {activeTab === 'acessos' &&
                  (!canAccessTab(userRole, 'acessos') || !uid ? (
                    <AccessDenied
                      tabName="Controle de acessos"
                      requiredLabel="Gestão"
                      currentRole={userRole}
                      onGoHome={goToDefaultTab}
                    />
                  ) : (
                    <AccessManagement
                      clinicId={clinicId}
                      currentUserUid={uid}
                      doctors={doctors}
                    />
                  ))}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
