/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Doctor } from '../types';
import {
  TrendingUp,
  Target,
  Package,
  Plus,
  Sparkles,
  DollarSign,
  Loader2,
  ArrowUpRight,
  Search,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface OverviewProps {
  transactions: Transaction[];
  doctors: Doctor[];
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  monthlyGoal: number;
  setMonthlyGoal: (goal: number) => void;
  onNavigate?: (tab: string) => void;
  openAddTrigger?: number;
}

export default function Overview({
  transactions,
  doctors,
  onAddTransaction,
  monthlyGoal,
  setMonthlyGoal,
  onNavigate,
  openAddTrigger = 0
}: OverviewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState(monthlyGoal);
  const [chartView, setChartView] = useState<'evolucao' | 'categorias'>('evolucao');
  const [recentSearch, setRecentSearch] = useState('');

  // Form states
  const [description, setDescription] = useState('');
  const [doctorName, setDoctorName] = useState(doctors[0]?.name || '');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<'Consultas' | 'Procedimentos' | 'Materiais'>('Procedimentos');
  const [type, setType] = useState<'receita' | 'despesa'>('receita');

  // AI Advisory states
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  // Sync external header "+ Novo lançamento" button trigger
  useEffect(() => {
    if (openAddTrigger > 0) {
      setShowAddModal(true);
    }
  }, [openAddTrigger]);

  // Keep doctorName synced once doctors load
  useEffect(() => {
    if (!doctorName && doctors.length > 0) {
      setDoctorName(doctors[0].name);
    }
  }, [doctors, doctorName]);

  // 1. Core Metrics dynamically calculated
  const totalRevenues = useMemo(
    () => transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.value, 0),
    [transactions]
  );

  const materialExpenses = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'despesa' && t.category === 'Materiais')
        .reduce((sum, t) => sum + t.value, 0),
    [transactions]
  );

  const totalExpenses = useMemo(
    () => transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.value, 0),
    [transactions]
  );

  const profitMarginVal = totalRevenues - materialExpenses;
  const marginPercentage = totalRevenues > 0 ? Math.round((profitMarginVal / totalRevenues) * 100) : 0;
  const goalPercent = monthlyGoal > 0 ? Math.round((totalRevenues / monthlyGoal) * 100) : 0;
  const materialExpensesCount = transactions.filter(
    t => t.type === 'despesa' && t.category === 'Materiais'
  ).length;
  const revenueCount = transactions.filter(t => t.type === 'receita').length;
  const avgTicket = revenueCount > 0 ? Math.round(totalRevenues / revenueCount) : 0;

  // 2. Doctor rankings dynamically calculated
  const doctorRevenues = useMemo(() => {
    return doctors
      .map(doc => {
        const docTotal = transactions
          .filter(t => t.type === 'receita' && t.doctorName === doc.name)
          .reduce((sum, t) => sum + t.value, 0);
        return {
          ...doc,
          currentEarnings: docTotal,
          percentage: doc.monthlyTarget > 0 ? Math.round((docTotal / doc.monthlyTarget) * 100) : 0
        };
      })
      .sort((a, b) => b.currentEarnings - a.currentEarnings);
  }, [doctors, transactions]);

  const avgConversion = useMemo(() => {
    const evalSum = doctors.reduce((s, d) => s + (d.evaluations || 0), 0);
    const closeSum = doctors.reduce((s, d) => s + (d.closures || 0), 0);
    return evalSum > 0 ? Math.round((closeSum / evalSum) * 100) : 0;
  }, [doctors]);

  // 3. Clean traditional chart data derived from real transactions
  const timelineData = useMemo(() => {
    const map = new Map<string, { rawDate: string; label: string; receitas: number; despesas: number }>();
    transactions.forEach(t => {
      const key = t.date;
      const parts = t.date.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : t.date;
      const existing = map.get(key) || { rawDate: key, label, receitas: 0, despesas: 0 };
      if (t.type === 'receita') existing.receitas += t.value;
      else existing.despesas += t.value;
      map.set(key, existing);
    });
    const sorted = Array.from(map.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    return sorted.length > 0
      ? sorted
      : [{ rawDate: '0', label: 'Hoje', receitas: totalRevenues, despesas: totalExpenses }];
  }, [transactions, totalRevenues, totalExpenses]);

  const categoryChartData = useMemo(() => {
    const catMap = new Map<string, number>();
    transactions.forEach(t => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.value);
    });
    return Array.from(catMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Sparkline micro-series for KPI cards
  const revenueSpark = useMemo(() => {
    const pts = timelineData.filter(d => d.receitas > 0).slice(-8);
    return pts.length >= 2 ? pts : [{ label: '1', receitas: 3500 }, { label: '2', receitas: 6000 }, { label: '3', receitas: 8000 }, { label: '4', receitas: 7000 }];
  }, [timelineData]);

  const expenseSpark = useMemo(() => {
    const pts = timelineData.filter(d => d.despesas > 0).slice(-8);
    return pts.length >= 2 ? pts : [{ label: '1', despesas: 900 }, { label: '2', despesas: 1200 }, { label: '3', despesas: 600 }, { label: '4', despesas: 850 }];
  }, [timelineData]);

  // Filtered recent transactions for the bottom table
  const recentTransactions = useMemo(() => {
    const q = recentSearch.trim().toLowerCase();
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(
        t =>
          !q ||
          t.description.toLowerCase().includes(q) ||
          t.doctorName.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [transactions, recentSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value) return;

    onAddTransaction({
      description,
      doctorName: type === 'despesa' ? 'Administração' : doctorName,
      value: parseFloat(value),
      category,
      type
    });

    setDescription('');
    setValue('');
    setShowAddModal(false);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalValue > 0) {
      setMonthlyGoal(newGoalValue);
      setShowGoalModal(false);
    }
  };

  // Clinical Advisor insights from Gemini
  const fetchAiAdvice = async (customQuestion = '') => {
    setLoadingAi(true);
    setAiAdvice(null);
    try {
      const response = await fetch('/api/gemini/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: {
            faturamento: totalRevenues,
            metaGeral: monthlyGoal,
            porcentagemMeta: goalPercent,
            gastoMateriais: materialExpenses,
            porcentagemGastoMateriais:
              totalRevenues > 0 ? Math.round((materialExpenses / totalRevenues) * 100) : 0,
            gastoMateriaisContagem: materialExpensesCount,
            margemLucro: profitMarginVal,
            porcentagemMargem: marginPercentage,
            rankingDoutoras: doctorRevenues.map(d => ({
              name: d.name,
              earnings: d.currentEarnings,
              target: d.monthlyTarget
            }))
          },
          customQuery: customQuestion
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAiAdvice(data.text);
      } else {
        setAiAdvice(`Erro ao carregar insights da IA: ${data.error}`);
      }
    } catch {
      setAiAdvice('Erro de conexão com o servidor de IA. Por favor, tente novamente.');
    } finally {
      setLoadingAi(false);
    }
  };

  const formatDateBR = (isoDate: string) => {
    const parts = isoDate.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
  };

  const getInitials = (name: string) => {
    const cleaned = name.replace(/^Dra?\.\s*/i, '').trim();
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return cleaned.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
      {/* ROW 1: 4 CLEAN WHITE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Faturamento */}
        <div className="bg-white border border-[#EBEBED] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#DCDCE0] transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
                <DollarSign size={15} />
              </div>
              <span className="text-[13px] font-medium text-[#52525B] truncate">Faturamento do mês</span>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('financeiro')}
                className="text-[#A1A1AA] hover:text-[#18181B] transition-colors cursor-pointer"
                title="Abrir Financeiro"
              >
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[22px] sm:text-[26px] font-semibold text-[#18181B] tracking-[-0.025em] tabular-nums leading-none">
                R$ {totalRevenues.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 text-xs">
                <span className="font-semibold text-[#16A34A] tabular-nums">+12,5%</span>
                <span className="text-[#71717A] truncate">vs. mês anterior</span>
              </div>
            </div>

            <div className="w-16 sm:w-20 h-11 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSpark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="receitas" fill="#3795AE" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 2: Meta Geral */}
        <div className="bg-white border border-[#EBEBED] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#DCDCE0] transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
                <Target size={15} />
              </div>
              <span className="text-[13px] font-medium text-[#52525B] truncate">Meta geral atingida</span>
            </div>
            <button
              onClick={() => {
                setNewGoalValue(monthlyGoal);
                setShowGoalModal(true);
              }}
              className="text-[11.5px] font-medium text-[#3795AE] hover:text-[#2B7E94] flex items-center gap-1 cursor-pointer shrink-0"
              title="Ajustar meta mensal"
            >
              <SlidersHorizontal size={12} />
              <span>Ajustar</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[22px] sm:text-[26px] font-semibold text-[#18181B] tracking-[-0.025em] tabular-nums leading-none">
                {goalPercent}%
              </div>
              <span className="text-xs text-[#71717A] tabular-nums truncate">
                Meta R$ {monthlyGoal.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#F1F1F3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3795AE] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(goalPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Gasto com Materiais */}
        <div className="bg-white border border-[#EBEBED] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#DCDCE0] transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
                <Package size={15} />
              </div>
              <span className="text-[13px] font-medium text-[#52525B] truncate">Gasto com materiais</span>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('compras')}
                className="text-[#A1A1AA] hover:text-[#18181B] transition-colors cursor-pointer"
                title="Abrir Compras"
              >
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[22px] sm:text-[26px] font-semibold text-[#18181B] tracking-[-0.025em] tabular-nums leading-none">
                R$ {materialExpenses.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-2.5 text-xs text-[#71717A] tabular-nums truncate">
                {materialExpensesCount} {materialExpensesCount === 1 ? 'lançamento' : 'lançamentos'} no período
              </div>
            </div>

            <div className="w-16 sm:w-20 h-11 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseSpark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="despesas" fill="#D97706" radius={[3, 3, 0, 0]} opacity={0.75} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 4: Margem Líquida */}
        <div className="bg-white border border-[#EBEBED] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#DCDCE0] transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
                <TrendingUp size={15} />
              </div>
              <span className="text-[13px] font-medium text-[#52525B] truncate">Margem operacional</span>
            </div>
            <span className="text-xs font-semibold text-[#3795AE] tabular-nums shrink-0">{marginPercentage}%</span>
          </div>

          <div className="space-y-2">
            <div className="text-[22px] sm:text-[26px] font-semibold text-[#18181B] tracking-[-0.025em] tabular-nums leading-none">
              R$ {profitMarginVal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-[#71717A]">
              Receitas descontando insumos clínicos
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE AI CLINICAL ADVISOR PANEL */}
      <AnimatePresence>
        {(loadingAi || aiAdvice) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="bg-white border border-[#3795AE]/30 rounded-2xl p-6 relative"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-[#18181B]">
                    Diagnóstico do Consultor Clínico IA
                  </h4>
                  <p className="text-xs text-[#71717A]">
                    Análise baseada no faturamento, margem e metas atuais
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAiAdvice(null);
                  setLoadingAi(false);
                }}
                className="w-8 h-8 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6] flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar diagnóstico"
              >
                <X size={16} />
              </button>
            </div>

            {loadingAi ? (
              <div className="flex items-center gap-3 py-6 justify-center text-sm text-[#52525B]">
                <Loader2 className="animate-spin text-[#3795AE]" size={20} />
                <span>Analisando faturamento de R$ {totalRevenues.toLocaleString('pt-BR')} e metas...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-[#3F3F46] leading-relaxed space-y-1.5">
                  {aiAdvice?.split('\n').map((line, i) => {
                    let formatted = line;
                    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#18181B] font-semibold">$1</strong>');
                    formatted = formatted.replace(/^\*\s(.*)/g, '• $1');
                    formatted = formatted.replace(
                      /#+\s(.*)/g,
                      '<strong class="font-display text-[#3795AE] text-sm block mt-2">$1</strong>'
                    );
                    return (
                      <p
                        key={i}
                        className={`min-h-[1.1rem] ${line.startsWith('#') ? 'mt-2' : ''}`}
                        dangerouslySetInnerHTML={{ __html: formatted }}
                      />
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-[#F1F1F3] flex gap-2">
                  <input
                    type="text"
                    placeholder="Pergunte algo específico sobre metas, custos ou equipe..."
                    value={customQuery}
                    onChange={e => setCustomQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchAiAdvice(customQuery)}
                    className="flex-1 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl px-3.5 py-2 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                  />
                  <button
                    onClick={() => fetchAiAdvice(customQuery)}
                    className="bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Perguntar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROW 2: ASYMMETRIC 2-COLUMN SPLIT (2/3 CHART + 1/3 DOCTOR RANKING) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch min-w-0">
        {/* Left 2/3: Clean Traditional Financial Evolution Chart */}
        <section className="xl:col-span-8 bg-white border border-[#EBEBED] rounded-2xl p-4 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display font-semibold text-[15px] text-[#18181B]">
                  Evolução financeira
                </h2>
                <span className="text-xs text-[#71717A]">
                  · Meta atingida <strong className="text-[#3795AE] font-semibold tabular-nums">{goalPercent}%</strong>
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-2xl sm:text-[28px] font-semibold text-[#18181B] tracking-[-0.025em] tabular-nums">
                  R$ {totalRevenues.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs font-medium text-[#16A34A] tabular-nums">
                  Margem de {marginPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Segmented Chart Switcher */}
              <div className="inline-flex bg-[#F4F4F6] p-1 rounded-xl text-xs font-medium text-[#71717A]">
                <button
                  onClick={() => setChartView('evolucao')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartView === 'evolucao'
                      ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'hover:text-[#18181B]'
                  }`}
                >
                  Evolução
                </button>
                <button
                  onClick={() => setChartView('categorias')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartView === 'categorias'
                      ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'hover:text-[#18181B]'
                  }`}
                >
                  Categorias
                </button>
              </div>

              {/* Clean Subtle AI Diagnostic Action */}
              <button
                onClick={() => fetchAiAdvice()}
                className="flex items-center gap-1.5 bg-white border border-[#E4E4E7] hover:border-[#3795AE]/40 hover:bg-[#3795AE]/5 text-[#3F3F46] hover:text-[#3795AE] px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={14} className="text-[#3795AE]" />
                <span>Diagnóstico IA</span>
              </button>
            </div>
          </div>

          {/* Legend Strip */}
          {chartView === 'evolucao' && (
            <div className="flex items-center gap-5 mb-3 text-xs text-[#71717A]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3795AE]" />
                <span>Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#E11D48]/70" />
                <span>Despesas</span>
              </div>
            </div>
          )}

          {/* Clean Traditional Recharts Container */}
          <div className="h-[220px] sm:h-[250px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'evolucao' ? (
                <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFillMinimal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3795AE" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#3795AE" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="expFillMinimal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E11D48" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#E11D48" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#A1A1AA' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#A1A1AA' }}
                    tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#EBEBED',
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                      fontSize: '12px'
                    }}
                    formatter={(val: any, name: string) => [
                      `R$ ${Number(val).toLocaleString('pt-BR')}`,
                      name === 'receitas' ? 'Receitas' : 'Despesas'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="#3795AE"
                    strokeWidth={2}
                    fill="url(#revFillMinimal)"
                    activeDot={{ r: 4, fill: '#3795AE', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stroke="#E11D48"
                    strokeWidth={1.75}
                    strokeOpacity={0.75}
                    fill="url(#expFillMinimal)"
                    activeDot={{ r: 4, fill: '#E11D48', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={categoryChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F3" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#71717A' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#A1A1AA' }}
                    tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <Tooltip
                    cursor={{ fill: '#F7F7F8' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#EBEBED',
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#3795AE" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right 1/3: Doctor Ranking + 3-Metric Footer */}
        <section className="xl:col-span-4 bg-white border border-[#EBEBED] rounded-2xl p-4 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="font-display font-semibold text-[15px] text-[#18181B]">
                  Ranking das dentistas
                </h2>
                <p className="text-xs text-[#71717A] mt-0.5">Progresso frente às metas mensais</p>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('doutora')}
                  className="w-8 h-8 rounded-lg border border-[#EBEBED] text-[#71717A] hover:text-[#18181B] hover:bg-[#FAFAFA] flex items-center justify-center transition-colors cursor-pointer"
                  title="Ver todas as dentistas"
                >
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {doctorRevenues.map((doctor, index) => {
                const progress = Math.min(doctor.percentage, 100);
                const isLow = doctor.percentage < 70;

                return (
                  <div key={doctor.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums ${
                            index === 0
                              ? 'bg-[#3795AE]/12 text-[#3795AE]'
                              : 'bg-[#F4F4F6] text-[#71717A]'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-semibold text-[#18181B] truncate">
                            {doctor.name}
                          </h4>
                          <p className="text-[11.5px] text-[#71717A] tabular-nums">
                            R$ {doctor.currentEarnings.toLocaleString('pt-BR')} / R${' '}
                            {doctor.monthlyTarget.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-semibold tabular-nums shrink-0 ${
                          isLow ? 'text-[#D97706]' : 'text-[#16A34A]'
                        }`}
                      >
                        {doctor.percentage}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-[#F1F1F3] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow ? 'bg-[#D97706]/80' : 'bg-[#3795AE]'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {doctorRevenues.length === 0 && (
                <p className="text-xs text-[#71717A] py-6 text-center">
                  Nenhuma dentista cadastrada ainda.
                </p>
              )}
            </div>
          </div>

          {/* 3-Column Summary Footer (Mirrors Reference Bottom Dividers) */}
          <div className="grid grid-cols-3 divide-x divide-[#F1F1F3] border-t border-[#F1F1F3] pt-4 mt-6">
            <div className="pr-2 min-w-0">
              <p className="text-sm sm:text-[15px] font-semibold text-[#18181B] tabular-nums truncate">{doctors.length}</p>
              <p className="text-[11px] text-[#71717A] mt-0.5 truncate">Dentistas</p>
            </div>
            <div className="px-2 sm:px-3 min-w-0">
              <p className="text-sm sm:text-[15px] font-semibold text-[#18181B] tabular-nums truncate">
                R$ {avgTicket.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-[#71717A] mt-0.5 truncate">Ticket médio</p>
            </div>
            <div className="pl-2 sm:pl-3 min-w-0">
              <p className="text-sm sm:text-[15px] font-semibold text-[#18181B] tabular-nums truncate">{avgConversion}%</p>
              <p className="text-[11px] text-[#71717A] mt-0.5 truncate">Conversão</p>
            </div>
          </div>
        </section>
      </div>

      {/* ROW 3: RECENT TRANSACTIONS TABLE CARD */}
      <section className="bg-white border border-[#EBEBED] rounded-2xl overflow-hidden min-w-0">
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F1F3]">
          <div>
            <h2 className="font-display font-semibold text-[15px] text-[#18181B]">
              Lançamentos recentes
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 min-w-[160px] sm:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Buscar..."
                value={recentSearch}
                onChange={e => setRecentSearch(e.target.value)}
                className="w-full sm:w-56 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Adicionar</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('historico')}
                className="px-3 py-1.5 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#FAFAFA] text-xs font-medium text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer whitespace-nowrap"
              >
                Ver tudo
              </button>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F8FA] border-b border-[#F1F1F3] text-[12px] font-medium text-[#71717A]">
                <th className="py-3 px-5 sm:px-6 font-medium">Data</th>
                <th className="py-3 px-4 font-medium">Responsável</th>
                <th className="py-3 px-4 font-medium">Descrição</th>
                <th className="py-3 px-4 font-medium">Categoria</th>
                <th className="py-3 px-4 font-medium text-right">Valor</th>
                <th className="py-3 px-5 sm:px-6 font-medium text-right">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F3] text-[13px]">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#71717A]">
                    Nenhum lançamento encontrado com esse filtro.
                  </td>
                </tr>
              ) : (
                recentTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-5 sm:px-6 text-[#71717A] tabular-nums whitespace-nowrap">
                      {formatDateBR(t.date)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#F4F4F6] text-[#52525B] text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {getInitials(t.doctorName)}
                        </div>
                        <span className="font-medium text-[#18181B]">{t.doctorName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#3F3F46] max-w-[260px] truncate">{t.description}</td>
                    <td className="py-3.5 px-4 text-[#71717A] whitespace-nowrap">{t.category}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#18181B] tabular-nums whitespace-nowrap">
                      {t.type === 'despesa' ? '− ' : ''}R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-medium ${
                          t.type === 'receita'
                            ? 'bg-[#ECFDF5] text-[#16A34A]'
                            : 'bg-[#FEF2F2] text-[#DC2626]'
                        }`}
                      >
                        {t.type === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: ADD TRANSACTION */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-[#EBEBED] w-full max-w-md p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-display font-semibold text-base text-[#18181B]">Novo lançamento</h3>
                <p className="text-xs text-[#71717A] mt-0.5">Registre uma receita clínica ou despesa de material</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 gap-1 bg-[#F4F4F6] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setType('receita');
                      setCategory('Procedimentos');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      type === 'receita'
                        ? 'bg-white text-[#3795AE] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                        : 'text-[#71717A] hover:text-[#18181B]'
                    }`}
                  >
                    Receita (Faturamento)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('despesa');
                      setCategory('Materiais');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      type === 'despesa'
                        ? 'bg-white text-[#DC2626] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                        : 'text-[#71717A] hover:text-[#18181B]'
                    }`}
                  >
                    Despesa (Material)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder={type === 'receita' ? 'Ex: Restauração estética em resina' : 'Ex: Luvas de procedimento nitrílicas'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="850"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1.5">Categoria</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2.5 text-sm text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                  >
                    {type === 'receita' ? (
                      <>
                        <option value="Procedimentos">Procedimentos</option>
                        <option value="Consultas">Consultas</option>
                      </>
                    ) : (
                      <option value="Materiais">Materiais</option>
                    )}
                  </select>
                </div>
              </div>

              {type === 'receita' && (
                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1.5">Dentista responsável</label>
                  <select
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2.5 text-sm text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold text-[#52525B] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Confirmar lançamento
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADJUST MONTHLY GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-[#EBEBED] w-full max-w-sm p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold text-base text-[#18181B]">Ajustar meta mensal</h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="w-8 h-8 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                  Meta geral da clínica (R$)
                </label>
                <input
                  type="number"
                  required
                  min="5000"
                  step="1000"
                  value={newGoalValue}
                  onChange={e => setNewGoalValue(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold text-[#52525B] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Salvar meta
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
