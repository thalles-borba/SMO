/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar, { ClinicLogo, canAccessTab } from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import CommandHome from './components/CommandHome';
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

import { Transaction, Doctor, SupplyItem, TeamGoal, TeamMember } from './types';
import { Bell, Lock, Menu, Plus, ArrowRight, Loader2, Ban, LogOut } from 'lucide-react';
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
  clearAllClinicData,
  DEFAULT_CLINIC_ID,
  ROLE_LABELS,
  User,
  UserProfile,
  UserRole
} from './lib/firebase';

const CLINIC_LOCAL_STORAGE_KEYS = [
  'clinica_sanitizacao_checks',
  'clinica_sanitizacao_logs',
  'clinica_lab_procedures',
  'sejamais_escala_consultorios',
  'clinica_caixa_closures',
  'clinica_gamification_v3'
];

const LOCAL_CLEAN_SLATE_KEY = 'sejamais_clean_slate_v1';

function clearLocalClinicStorage() {
  try {
    CLINIC_LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('[Storage] Erro ao limpar dados locais:', e);
  }
}

function ensureLocalCleanSlateOnce() {
  try {
    if (!localStorage.getItem(LOCAL_CLEAN_SLATE_KEY)) {
      clearLocalClinicStorage();
      localStorage.setItem(LOCAL_CLEAN_SLATE_KEY, '1');
    }
  } catch (e) {
    console.error('[Storage] Erro ao inicializar limpeza local:', e);
  }
}

function getDefaultTabForRole(_role: UserRole): string {
  return 'inicio';
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
  const [activeTab, setActiveTab] = useState('inicio');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddTrigger, setQuickAddTrigger] = useState(0);

  // Firebase Auth & Profile state
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authRedirectError, setAuthRedirectError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);

  // Ensure any previously cached fictional localStorage data is wiped once before child views mount
  const [workspaceResetKey, setWorkspaceResetKey] = useState(() => {
    ensureLocalCleanSlateOnce();
    return 0;
  });

  // Core stateful database synchronized with shared clinic Firestore collections
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [monthlyGoal, setMonthlyGoalState] = useState(0);

  // Dynamic live date
  const [currentLiveDate, setCurrentLiveDate] = useState('');
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setCurrentLiveDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));
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

          const isCleanSlate = fbConfig.some(c => c.id === 'clean_slate_v1');

          if (!isCleanSlate) {
            await clearAllClinicData(activeClinicId, activeUid);
            clearLocalClinicStorage();
            try {
              localStorage.setItem(LOCAL_CLEAN_SLATE_KEY, '1');
            } catch {
              // ignore storage errors
            }
            if (cancelled) return;
            setTransactions([]);
            setDoctors([]);
            setSupplies([]);
            setGoals([]);
            setTeamMembers([]);
            setMonthlyGoalState(0);
            setWorkspaceResetKey(prev => prev + 1);
          } else {
            setTransactions(
              [...fbTransactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            );
            setDoctors(fbDoctors);
            setSupplies(fbSupplies);
            setGoals(fbGoals);
            setTeamMembers(fbTeam);
            const goalDoc = fbConfig.find(c => c.id === 'monthly_goal');
            setMonthlyGoalState(goalDoc ? goalDoc.val : 0);
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
      setActiveTab('inicio');
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
          const updated = { ...sup, stock: Math.max(0, sup.stock + qty) };
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
        'Deseja mesmo zerar todos os dados do dashboard (lançamentos, dentistas, metas, estoque, escala, sanitização e laboratório) para começar do zero?'
      )
    ) {
      clearLocalClinicStorage();
      try {
        localStorage.setItem(LOCAL_CLEAN_SLATE_KEY, '1');
      } catch {
        // ignore storage errors
      }

      setTransactions([]);
      setDoctors([]);
      setSupplies([]);
      setGoals([]);
      setTeamMembers([]);
      setMonthlyGoalState(0);
      setWorkspaceResetKey(prev => prev + 1);
      setActiveTab('visao-geral');

      if (uid) {
        try {
          await clearAllClinicData(clinicId, uid);
        } catch (err) {
          console.error('[Firebase] Erro ao zerar dados:', err);
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
      case 'inicio':
        return {
          title: '',
          subtitle: ''
        };
      case 'visao-geral':
        return {
          title: 'Visão geral',
          subtitle: `${currentLiveDate || 'Hoje'} · Resumo geral da clínica`
        };
      case 'financeiro':
        return {
          title: 'Financeiro',
          subtitle: 'Resumo do mês, fechamento do caixa do dia e lista de entradas e saídas'
        };
      case 'doutora':
        return {
          title: userRole === 'funcionario' ? 'Escala dos consultórios' : userRole === 'dentista' ? 'Meu desempenho' : 'Dentistas e escala',
          subtitle:
            userRole === 'funcionario'
              ? 'Veja em qual consultório cada dentista atende durante a semana'
              : 'Acompanhe resultados, metas e a escala semanal dos consultórios'
        };
      case 'metas-equipe':
        return {
          title: 'Metas e equipe',
          subtitle: 'Acompanhe os objetivos do mês e os profissionais da clínica'
        };
      case 'compras':
        return {
          title: 'Estoque e compras',
          subtitle: 'Controle a quantidade e a validade dos materiais e registre compras'
        };
      case 'sanitizacao':
        return {
          title: 'Limpeza e sanitização',
          subtitle: 'Marque os cuidados do dia e assine a conferência diária'
        };
      case 'laboratorio':
        return {
          title: 'Laboratório',
          subtitle: 'Acompanhe o andamento de próteses, envios e entregas'
        };
      case 'utilitarios':
        return {
          title: 'Documentos e Pix',
          subtitle: 'Gere cobranças Pix, recibos, atestados e termos prontos para enviar'
        };
      case 'historico':
        return {
          title: 'Histórico',
          subtitle: 'Consulte todos os lançamentos registrados e emita recibos'
        };
      case 'acessos':
        return {
          title: 'Controle de acessos',
          subtitle: 'Escolha quem pode entrar e o que cada pessoa da equipe pode ver'
        };
      default:
        return { title: 'Início', subtitle: currentLiveDate };
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

  const isBlankHome = activeTab === 'inicio';

  return (
    <div
      className={`${
        isBlankHome ? 'bg-white' : 'bg-[#F7F8FA]'
      } text-[#14181F] min-h-[100dvh] w-full max-w-full overflow-x-clip flex font-sans transition-colors`}
    >
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
          isCollapsed ? 'md:ml-[76px]' : 'md:ml-[264px]'
        } ml-0`}
      >
        {/* Clean, Breathable Top Bar */}
        <header
          className={`sticky top-0 z-20 px-4 sm:px-8 lg:px-10 ${
            isBlankHome
              ? 'bg-white/95 backdrop-blur-sm py-3.5 sm:py-4'
              : 'bg-[#F7F8FA]/95 backdrop-blur-md border-b border-[#E6EAF0] py-4 sm:py-5'
          }`}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-3 sm:gap-6 min-w-0">
            {/* Left: Clear Mobile Menu Trigger + Page Heading */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden h-11 px-3.5 rounded-xl bg-white border border-[#E6EAF0] text-[#14181F] hover:bg-[#F1F4F7] flex items-center gap-2 transition-colors cursor-pointer shrink-0 font-medium text-sm"
                aria-label="Abrir menu"
              >
                <Menu size={18} className="text-[#3795AE]" />
                <span>Menu</span>
              </button>

              {!isBlankHome && (
                <div className="min-w-0 flex-1">
                  <h1 className="font-display font-semibold text-[18px] sm:text-[24px] text-[#14181F] tracking-[-0.02em] leading-tight truncate">
                    {headerMeta.title}
                  </h1>
                  <p className="text-[12.5px] sm:text-[13.5px] text-[#647082] mt-0.5 truncate">
                    {headerMeta.subtitle}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Quiet Alerts + Single Primary Action */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Notifications Button & Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="h-11 px-3 sm:px-3.5 rounded-xl bg-white border border-[#E6EAF0] hover:border-[#CBD5E1] text-[#4B5563] hover:text-[#14181F] flex items-center gap-2 transition-colors relative cursor-pointer"
                  title="Ver avisos da clínica"
                >
                  <Bell size={18} />
                  <span className="hidden lg:inline text-[13.5px] font-medium whitespace-nowrap">Avisos</span>
                  {notificationList.length > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-semibold tabular-nums flex items-center justify-center">
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
                      className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[74px] sm:top-13 sm:w-[360px] bg-white border border-[#E6EAF0] rounded-2xl shadow-lg z-50 overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-[#ECEFF3] flex justify-between items-center">
                        <span className="text-sm font-semibold text-[#14181F]">Avisos importantes</span>
                        <span className="text-xs text-[#647082] tabular-nums">
                          {notificationList.length} {notificationList.length === 1 ? 'aviso' : 'avisos'}
                        </span>
                      </div>

                      <div className="max-h-[340px] overflow-y-auto divide-y divide-[#ECEFF3]">
                        {notificationList.length === 0 ? (
                          <div className="p-8 text-center text-sm text-[#647082]">
                            Tudo certo por aqui. Nenhum aviso pendente no momento.
                          </div>
                        ) : (
                          notificationList.map(notif => (
                            <button
                              key={notif.id}
                              type="button"
                              onClick={() => {
                                if (notif.type === 'sanitizacao') setActiveTab('sanitizacao');
                                if (notif.type === 'compras') setActiveTab('compras');
                                if (notif.type === 'laboratorio') setActiveTab('laboratorio');
                                setShowNotifications(false);
                              }}
                              className="w-full p-4 hover:bg-[#F7F8FA] transition-colors cursor-pointer text-left space-y-1.5 block"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-[13.5px] font-semibold text-[#14181F] truncate">{notif.title}</h4>
                                <span
                                  className={`text-xs font-medium shrink-0 ${
                                    notif.severity === 'high' ? 'text-[#DC2626]' : 'text-[#B45309]'
                                  }`}
                                >
                                  {notif.severity === 'high' ? 'Prioridade' : 'Atenção'}
                                </span>
                              </div>
                              <p className="text-[13px] text-[#647082] leading-relaxed">{notif.desc}</p>
                              <div className="text-xs text-[#3795AE] font-semibold flex items-center gap-1 pt-0.5">
                                <span>Ir para esta tela</span>
                                <ArrowRight size={13} />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Single Primary Action on Overview (Gestão only) */}
              {activeTab === 'visao-geral' && userRole === 'gestao' && (
                <button
                  type="button"
                  onClick={() => setQuickAddTrigger(prev => prev + 1)}
                  className="h-11 flex items-center gap-2 bg-[#3795AE] hover:bg-[#2B7E94] text-white px-4 sm:px-5 rounded-xl text-[13.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus size={17} />
                  <span className="hidden sm:inline">Novo lançamento</span>
                  <span className="sm:hidden">Lançar</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Active View Container */}
        <main
          className={`flex-1 px-4 sm:px-8 lg:px-10 min-w-0 w-full ${
            isBlankHome ? 'py-2 sm:py-4' : 'py-6 sm:py-8 lg:py-9'
          }`}
        >
          <div key={workspaceResetKey} className="max-w-[1280px] mx-auto w-full min-w-0">
            {dataLoading && doctors.length === 0 && supplies.length === 0 && transactions.length === 0 ? (
              <div className="py-28 flex flex-col items-center justify-center gap-3 text-sm text-[#647082]">
                <Loader2 size={24} className="animate-spin text-[#3795AE]" />
                <span>Carregando dados da clínica...</span>
              </div>
            ) : (
              <>
                {activeTab === 'inicio' && (
                  <CommandHome
                    firstName={firstName}
                    userRole={userRole}
                    linkedDoctorId={userProfile.linkedDoctorId}
                    transactions={transactions}
                    doctors={doctors}
                    supplies={supplies}
                    goals={goals}
                    teamMembers={teamMembers}
                    monthlyGoal={monthlyGoal}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onAddSupplyItem={handleAddSupplyItem}
                    onUpdateSupplyItem={handleUpdateSupplyItem}
                    onDeleteSupplyItem={handleDeleteSupplyItem}
                    onAddStock={handleAddStock}
                    onRecordPurchaseExpense={handleRecordPurchaseExpense}
                    onAddDoctor={handleAddDoctor}
                    onUpdateDoctorTarget={handleUpdateDoctorTarget}
                    onUpdateDoctorStats={handleUpdateDoctorStats}
                    onSetMonthlyGoal={setMonthlyGoal}
                    onAddGoal={handleAddGoal}
                    onUpdateGoalProgress={handleUpdateGoalProgress}
                    onAddMember={handleAddMember}
                    onToggleMemberStatus={handleToggleStatus}
                    onNavigate={setActiveTab}
                  />
                )}

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
