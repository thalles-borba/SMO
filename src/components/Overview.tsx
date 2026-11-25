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
  SlidersHorizontal,
  Stethoscope,
  ArrowRight
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

  // Core Metrics dynamically calculated
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

  // Doctor rankings dynamically calculated
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

  // Chart data derived strictly from real transactions
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

  // Filtered recent transactions
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
      doctorName: type === 'despesa' ? 'Administração' : doctorName || 'Clínica',
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
    if (newGoalValue >= 0) {
      setMonthlyGoal(newGoalValue);
      setShowGoalModal(false);
    }
  };

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
        setAiAdvice(`Não foi possível gerar o resumo agora: ${data.error}`);
      }
    } catch {
      setAiAdvice('Erro de conexão ao gerar a análise. Tente novamente em instantes.');
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

  const isFreshWorkspace = transactions.length === 0 && doctors.length === 0;

  return (
    <div className="space-y-7 sm:space-y-8 w-full min-w-0">
      {/* GUIDED QUICK-START CARD (Only shown when workspace is completely empty) */}
      {isFreshWorkspace && (
        <section className="bg-white border border-[#E6EAF0] rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h2 className="font-display font-semibold text-lg text-[#14181F]">
              Comece configurando a clínica em 3 passos simples
            </h2>
            <p className="text-sm text-[#647082]">
              Escolha qualquer passo abaixo para começar. Os números do painel serão atualizados automaticamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => onNavigate?.('doutora')}
              className="text-left p-5 rounded-2xl bg-[#F7F8FA] hover:bg-[#F1F4F7] border border-transparent hover:border-[#3795AE]/30 transition-all cursor-pointer space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-white border border-[#E6EAF0] text-[#3795AE] flex items-center justify-center font-semibold text-sm">
                  1
                </span>
                <ArrowRight size={16} className="text-[#94A0B2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#14181F]">Cadastrar dentistas</h3>
                <p className="text-[13px] text-[#647082] mt-1">
                  Adicione as profissionais da clínica e defina a meta de cada uma.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewGoalValue(monthlyGoal);
                setShowGoalModal(true);
              }}
              className="text-left p-5 rounded-2xl bg-[#F7F8FA] hover:bg-[#F1F4F7] border border-transparent hover:border-[#3795AE]/30 transition-all cursor-pointer space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-white border border-[#E6EAF0] text-[#3795AE] flex items-center justify-center font-semibold text-sm">
                  2
                </span>
                <ArrowRight size={16} className="text-[#94A0B2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#14181F]">Definir meta do mês</h3>
                <p className="text-[13px] text-[#647082] mt-1">
                  Informe o valor de faturamento que a clínica deseja alcançar.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-left p-5 rounded-2xl bg-[#F7F8FA] hover:bg-[#F1F4F7] border border-transparent hover:border-[#3795AE]/30 transition-all cursor-pointer space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-white border border-[#E6EAF0] text-[#3795AE] flex items-center justify-center font-semibold text-sm">
                  3
                </span>
                <ArrowRight size={16} className="text-[#94A0B2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#14181F]">Registrar primeiro lançamento</h3>
                <p className="text-[13px] text-[#647082] mt-1">
                  Lance um atendimento realizado ou uma compra de material.
                </p>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ROW 1: 4 AIRY, EASY-TO-SCAN KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Faturamento */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 flex flex-col justify-between gap-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-medium text-[#647082]">Faturamento do mês</span>
            <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[28px] font-semibold text-[#14181F] tracking-[-0.025em] tabular-nums leading-none">
              R$ {totalRevenues.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 text-[13px] text-[#647082]">
              <span className="tabular-nums truncate">
                {revenueCount === 0
                  ? 'Nenhuma entrada ainda'
                  : `${revenueCount} ${revenueCount === 1 ? 'entrada registrada' : 'entradas registradas'}`}
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('financeiro')}
                  className="text-[#3795AE] hover:text-[#2B7E94] font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <span>Ver</span>
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Meta Geral */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 flex flex-col justify-between gap-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-medium text-[#647082]">Meta do mês</span>
            <button
              type="button"
              onClick={() => {
                setNewGoalValue(monthlyGoal);
                setShowGoalModal(true);
              }}
              className="text-[13px] font-semibold text-[#3795AE] hover:text-[#2B7E94] inline-flex items-center gap-1 cursor-pointer shrink-0 py-1 px-2 -mr-2 rounded-lg hover:bg-[#3795AE]/8 transition-colors"
            >
              <SlidersHorizontal size={14} />
              <span>{monthlyGoal > 0 ? 'Alterar' : 'Definir'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[28px] font-semibold text-[#14181F] tracking-[-0.025em] tabular-nums leading-none">
                {goalPercent}%
              </div>
              <span className="text-[13px] text-[#647082] tabular-nums truncate">
                {monthlyGoal > 0 ? `de R$ ${monthlyGoal.toLocaleString('pt-BR')}` : 'Meta não definida'}
              </span>
            </div>
            <div className="w-full h-2 bg-[#F1F4F7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3795AE] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(goalPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Gasto com Materiais */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 flex flex-col justify-between gap-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-medium text-[#647082]">Gasto com materiais</span>
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7]/70 text-[#B45309] flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[28px] font-semibold text-[#14181F] tracking-[-0.025em] tabular-nums leading-none">
              R$ {materialExpenses.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 text-[13px] text-[#647082]">
              <span className="tabular-nums truncate">
                {materialExpensesCount === 0
                  ? 'Nenhuma compra lançada'
                  : `${materialExpensesCount} ${materialExpensesCount === 1 ? 'compra lançada' : 'compras lançadas'}`}
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('compras')}
                  className="text-[#3795AE] hover:text-[#2B7E94] font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <span>Abrir</span>
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI 4: Saldo após Materiais */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 flex flex-col justify-between gap-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-medium text-[#647082]">Saldo após materiais</span>
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#15803D] flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[28px] font-semibold text-[#14181F] tracking-[-0.025em] tabular-nums leading-none">
              R$ {profitMarginVal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <p className="pt-1 text-[13px] text-[#647082] tabular-nums">
              Margem atual de <strong className="text-[#14181F] font-semibold">{marginPercentage}%</strong>
            </p>
          </div>
        </div>
      </div>

      {/* EXPANDABLE AI CLINICAL ADVISOR PANEL */}
      <AnimatePresence>
        {(loadingAi || aiAdvice) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-white border border-[#3795AE]/35 rounded-2xl p-6 sm:p-7 relative"
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-base text-[#14181F]">
                    Análise inteligente da clínica
                  </h4>
                  <p className="text-[13px] text-[#647082]">
                    Resumo automático com base nos números registrados até agora
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAiAdvice(null);
                  setLoadingAi(false);
                }}
                className="w-10 h-10 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar análise"
              >
                <X size={18} />
              </button>
            </div>

            {loadingAi ? (
              <div className="flex items-center gap-3 py-8 justify-center text-sm text-[#4B5563]">
                <Loader2 className="animate-spin text-[#3795AE]" size={20} />
                <span>Analisando os números da clínica...</span>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="text-sm text-[#374151] leading-relaxed space-y-2">
                  {aiAdvice?.split('\n').map((line, i) => {
                    let formatted = line;
                    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#14181F] font-semibold">$1</strong>');
                    formatted = formatted.replace(/^\*\s(.*)/g, '• $1');
                    formatted = formatted.replace(
                      /#+\s(.*)/g,
                      '<strong class="font-display text-[#3795AE] text-[15px] block mt-3">$1</strong>'
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

                <div className="pt-4 border-t border-[#ECEFF3] flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Faça uma pergunta sobre faturamento, gastos ou metas..."
                    value={customQuery}
                    onChange={e => setCustomQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchAiAdvice(customQuery)}
                    className="flex-1 min-h-[44px] bg-[#F7F8FA] border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:bg-white focus:border-[#3795AE]"
                  />
                  <button
                    type="button"
                    onClick={() => fetchAiAdvice(customQuery)}
                    className="min-h-[44px] bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Perguntar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROW 2: 2-COLUMN SPLIT (CHART + DOCTOR RANKING) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch min-w-0">
        {/* Left 2/3: Clean Financial Evolution Chart */}
        <section className="xl:col-span-8 bg-white border border-[#E6EAF0] rounded-2xl p-6 sm:p-7 flex flex-col justify-between min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h2 className="font-display font-semibold text-[17px] text-[#14181F]">
                Entradas e saídas do período
              </h2>
              <p className="text-[13px] text-[#647082]">
                Acompanhe a evolução diária ou compare por tipo de atendimento
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Segmented Chart Switcher */}
              <div className="inline-flex bg-[#F1F4F7] p-1 rounded-xl text-[13px] font-medium text-[#647082]">
                <button
                  type="button"
                  onClick={() => setChartView('evolucao')}
                  className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartView === 'evolucao'
                      ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                      : 'hover:text-[#14181F]'
                  }`}
                >
                  Por dia
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('categorias')}
                  className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    chartView === 'categorias'
                      ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                      : 'hover:text-[#14181F]'
                  }`}
                >
                  Por categoria
                </button>
              </div>

              {/* Clean Subtle AI Diagnostic Action */}
              <button
                type="button"
                onClick={() => fetchAiAdvice()}
                className="min-h-[40px] flex items-center gap-2 bg-white border border-[#DCE2EA] hover:border-[#3795AE] hover:text-[#3795AE] text-[#374151] px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={15} className="text-[#3795AE]" />
                <span>Resumo IA</span>
              </button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <p className="text-sm font-medium text-[#374151]">
                O gráfico aparecerá automaticamente quando você registrar seus primeiros lançamentos.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-[#3795AE] hover:bg-[#2B7E94] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                <Plus size={16} />
                <span>Adicionar primeiro lançamento</span>
              </button>
            </div>
          ) : (
            <>
              {chartView === 'evolucao' && (
                <div className="flex items-center gap-6 mb-4 text-[13px] text-[#647082]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#3795AE]" />
                    <span>Entradas (receitas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#DC2626]/75" />
                    <span>Saídas (despesas)</span>
                  </div>
                </div>
              )}

              <div className="h-[240px] sm:h-[270px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'evolucao' ? (
                    <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFillMinimal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3795AE" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#3795AE" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="expFillMinimal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#DC2626" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#DC2626" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF3" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#647082' }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#647082' }}
                        tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E6EAF0',
                          borderRadius: '6px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                          fontSize: '13px'
                        }}
                        formatter={(val: any, name: string) => [
                          `R$ ${Number(val).toLocaleString('pt-BR')}`,
                          name === 'receitas' ? 'Entradas' : 'Saídas'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="receitas"
                        stroke="#3795AE"
                        strokeWidth={2.2}
                        fill="url(#revFillMinimal)"
                        activeDot={{ r: 5, fill: '#3795AE', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="despesas"
                        stroke="#DC2626"
                        strokeWidth={1.8}
                        strokeOpacity={0.75}
                        fill="url(#expFillMinimal)"
                        activeDot={{ r: 5, fill: '#DC2626', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={categoryChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barSize={42}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF3" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#647082' }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#647082' }}
                        tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                      />
                      <Tooltip
                        cursor={{ fill: '#F7F8FA' }}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E6EAF0',
                          borderRadius: '6px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                          fontSize: '13px'
                        }}
                        formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Total']}
                      />
                      <Bar dataKey="total" fill="#3795AE" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        {/* Right 1/3: Doctor Ranking */}
        <section className="xl:col-span-4 bg-white border border-[#E6EAF0] rounded-2xl p-6 sm:p-7 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="font-display font-semibold text-[17px] text-[#14181F]">
                  Produção das dentistas
                </h2>
                <p className="text-[13px] text-[#647082] mt-0.5">Progresso em relação às metas</p>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('doutora')}
                  className="text-[13px] font-semibold text-[#3795AE] hover:text-[#2B7E94] inline-flex items-center gap-1 cursor-pointer shrink-0 py-1"
                >
                  <span>Abrir</span>
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>

            <div className="space-y-5">
              {doctorRevenues.map((doctor, index) => {
                const progress = Math.min(doctor.percentage, 100);
                const isLow = doctor.percentage < 70;

                return (
                  <div key={doctor.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums ${
                            index === 0
                              ? 'bg-[#3795AE]/12 text-[#3795AE]'
                              : 'bg-[#F1F4F7] text-[#647082]'
                          }`}
                        >
                          {index + 1}º
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[#14181F] truncate">
                            {doctor.name}
                          </h4>
                          <p className="text-xs text-[#647082] tabular-nums">
                            R$ {doctor.currentEarnings.toLocaleString('pt-BR')} de R${' '}
                            {doctor.monthlyTarget.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-sm font-semibold tabular-nums shrink-0 ${
                          isLow ? 'text-[#B45309]' : 'text-[#15803D]'
                        }`}
                      >
                        {doctor.percentage}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#F1F4F7] rounded-full overflow-hidden">
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
                <div className="py-8 text-center space-y-3">
                  <Stethoscope size={28} className="mx-auto text-[#CBD5E1]" />
                  <p className="text-sm text-[#647082]">
                    Nenhuma dentista cadastrada ainda.
                  </p>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('doutora')}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3795AE] hover:text-[#2B7E94] cursor-pointer"
                    >
                      <span>Cadastrar primeira dentista</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3-Column Quiet Summary Footer */}
          <div className="grid grid-cols-3 divide-x divide-[#ECEFF3] border-t border-[#ECEFF3] pt-5 mt-6">
            <div className="pr-3 min-w-0">
              <p className="text-base font-semibold text-[#14181F] tabular-nums truncate">{doctors.length}</p>
              <p className="text-xs text-[#647082] mt-0.5 truncate">Dentistas</p>
            </div>
            <div className="px-3 min-w-0">
              <p className="text-base font-semibold text-[#14181F] tabular-nums truncate">
                R$ {avgTicket.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-[#647082] mt-0.5 truncate">Valor médio</p>
            </div>
            <div className="pl-3 min-w-0">
              <p className="text-base font-semibold text-[#14181F] tabular-nums truncate">{avgConversion}%</p>
              <p className="text-xs text-[#647082] mt-0.5 truncate">Conversão</p>
            </div>
          </div>
        </section>
      </div>

      {/* ROW 3: RECENT TRANSACTIONS TABLE CARD */}
      <section className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden min-w-0">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECEFF3]">
          <div>
            <h2 className="font-display font-semibold text-[17px] text-[#14181F]">
              Últimos lançamentos
            </h2>
            <p className="text-[13px] text-[#647082] mt-0.5">
              Veja rapidamente as entradas e saídas mais recentes
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 min-w-[180px] sm:flex-initial">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A0B2]" />
              <input
                type="text"
                placeholder="Pesquisar lançamento..."
                value={recentSearch}
                onChange={e => setRecentSearch(e.target.value)}
                className="w-full sm:w-60 min-h-[42px] bg-[#F7F8FA] border border-[#DCE2EA] rounded-xl pl-10 pr-3.5 py-2 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:bg-white focus:border-[#3795AE]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="min-h-[42px] flex items-center gap-1.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white px-4 py-2 rounded-xl text-[13.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Adicionar</span>
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('historico')}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-[#DCE2EA] bg-white hover:bg-[#F7F8FA] text-[13.5px] font-medium text-[#374151] transition-colors cursor-pointer whitespace-nowrap"
              >
                Ver todos
              </button>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#ECEFF3] text-[13px] font-medium text-[#647082]">
                <th className="py-3.5 px-6 font-medium">Data</th>
                <th className="py-3.5 px-4 font-medium">Responsável</th>
                <th className="py-3.5 px-4 font-medium">Descrição</th>
                <th className="py-3.5 px-4 font-medium">Categoria</th>
                <th className="py-3.5 px-4 font-medium text-right">Valor</th>
                <th className="py-3.5 px-6 font-medium text-right">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFF3] text-sm">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#647082]">
                    {transactions.length === 0
                      ? 'Nenhum lançamento registrado ainda. Clique em "Adicionar" para começar.'
                      : 'Nenhum lançamento encontrado para essa pesquisa.'}
                  </td>
                </tr>
              ) : (
                recentTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 text-[#647082] tabular-nums whitespace-nowrap">
                      {formatDateBR(t.date)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F1F4F7] text-[#4B5563] text-xs font-semibold flex items-center justify-center shrink-0">
                          {getInitials(t.doctorName)}
                        </div>
                        <span className="font-medium text-[#14181F]">{t.doctorName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[#374151] max-w-[280px] truncate">{t.description}</td>
                    <td className="py-4 px-4 text-[#647082] whitespace-nowrap">{t.category}</td>
                    <td className="py-4 px-4 text-right font-semibold text-[#14181F] tabular-nums whitespace-nowrap">
                      {t.type === 'despesa' ? '− ' : ''}R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <span
                        className={`text-[13px] font-semibold ${
                          t.type === 'receita' ? 'text-[#15803D]' : 'text-[#DC2626]'
                        }`}
                      >
                        {t.type === 'receita' ? 'Entrada' : 'Saída'}
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
        <div className="fixed inset-0 bg-[#14181F]/35 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-3xl border border-[#E6EAF0] w-full max-w-md p-6 sm:p-7 shadow-xl"
          >
            <div className="flex justify-between items-start gap-3 mb-6">
              <div>
                <h3 className="font-display font-semibold text-lg text-[#14181F]">Novo lançamento</h3>
                <p className="text-[13px] text-[#647082] mt-0.5">
                  Registre uma entrada de atendimento ou uma compra de material
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Tipo de lançamento</label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#F1F4F7] p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setType('receita');
                      setCategory('Procedimentos');
                    }}
                    className={`py-2.5 rounded-lg text-[13.5px] font-semibold transition-all cursor-pointer ${
                      type === 'receita'
                        ? 'bg-white text-[#1F6F85] shadow-xs'
                        : 'text-[#647082] hover:text-[#14181F]'
                    }`}
                  >
                    Entrada (Receita)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('despesa');
                      setCategory('Materiais');
                    }}
                    className={`py-2.5 rounded-lg text-[13.5px] font-semibold transition-all cursor-pointer ${
                      type === 'despesa'
                        ? 'bg-white text-[#DC2626] shadow-xs'
                        : 'text-[#647082] hover:text-[#14181F]'
                    }`}
                  >
                    Saída (Despesa)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">O que foi feito ou comprado?</label>
                <input
                  type="text"
                  required
                  placeholder={type === 'receita' ? 'Ex: Limpeza, Restauração, Clareamento' : 'Ex: Luvas, Resina, Anestésico'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:border-[#3795AE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0,00"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] tabular-nums focus:outline-none focus:border-[#3795AE]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Categoria</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-3.5 py-2.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE]"
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
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Dentista responsável</label>
                  <select
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-3.5 py-2.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE]"
                  >
                    {doctors.length === 0 && <option value="Clínica">Clínica (geral)</option>}
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-[#DCE2EA] text-sm font-medium text-[#4B5563] hover:bg-[#F7F8FA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Salvar lançamento
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADJUST MONTHLY GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-[#14181F]/35 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-3xl border border-[#E6EAF0] w-full max-w-sm p-6 sm:p-7 shadow-xl"
          >
            <div className="flex justify-between items-start gap-3 mb-5">
              <div>
                <h3 className="font-display font-semibold text-lg text-[#14181F]">Meta de faturamento do mês</h3>
                <p className="text-[13px] text-[#647082] mt-0.5">
                  Quanto a clínica pretende faturar neste mês?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="w-9 h-9 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Valor da meta (R$)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  placeholder="Ex: 50000"
                  value={newGoalValue}
                  onChange={e => setNewGoalValue(Number(e.target.value))}
                  className="w-full min-h-[48px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-base font-semibold text-[#14181F] tabular-nums focus:outline-none focus:border-[#3795AE]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-[#DCE2EA] text-sm font-medium text-[#4B5563] hover:bg-[#F7F8FA] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold transition-colors cursor-pointer"
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
