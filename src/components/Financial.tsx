/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  Calendar, 
  Plus, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieIcon, 
  BarChart3, 
  Lock, 
  FileText, 
  Download,
  CreditCard,
  Building,
  Check,
  X
} from 'lucide-react';
import { Transaction, Doctor, CashRegisterClosure } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  AreaChart, 
  Area 
} from 'recharts';

interface FinancialProps {
  transactions: Transaction[];
  doctors: Doctor[];
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'> & { date?: string }) => void;
  onDeleteTransaction: (id: string) => void;
  userRole: 'gerente' | 'funcionario';
}

export default function Financial({
  transactions,
  doctors,
  onAddTransaction,
  onDeleteTransaction,
  userRole
}: FinancialProps) {
  const [activeTab, setActiveTab] = useState<'dre' | 'caixa' | 'fluxo'>('dre');

  // DRE Filters & Custom Settings
  const [drePeriod, setDrePeriod] = useState<'current_month' | 'last_month' | 'year'>('current_month');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(6.0); // Simples Nacional default 6%
  
  // Custom fixed expenses for DRE calculations (Rent, Payroll, Utilities, etc.)
  const [fixedRent, setFixedRent] = useState<number>(4500);
  const [fixedUtilities, setFixedUtilities] = useState<number>(1200); // Água, Luz, Internet
  const [fixedPayroll, setFixedPayroll] = useState<number>(6800); // ASB, Secretaria
  const [fixedSoftware, setFixedSoftware] = useState<number>(450);
  const [fixedMarketing, setFixedMarketing] = useState<number>(1500);
  const [showEditFixedModal, setShowEditFixedModal] = useState<boolean>(false);

  // CAIXA STATE
  const [selectedCaixaDate, setSelectedCaixaDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [initialBalanceMoney, setInitialBalanceMoney] = useState<number>(300.00);
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');
  const [sangriaValue, setSangriaValue] = useState<string>('0');
  const [closureNotes, setClosureNotes] = useState<string>('');
  const [closureHistory, setClosureHistory] = useState<CashRegisterClosure[]>(() => {
    const saved = localStorage.getItem('clinica_caixa_closures');
    return saved ? JSON.parse(saved) : [];
  });
  const [closureSuccessMessage, setClosureSuccessMessage] = useState<boolean>(false);

  // Quick Caixa Movement Form State
  const [showQuickCaixaModal, setShowQuickCaixaModal] = useState<boolean>(false);
  const [caixaType, setCaixaType] = useState<'receita' | 'despesa'>('receita');
  const [caixaDescription, setCaixaDescription] = useState<string>('');
  const [caixaValue, setCaixaValue] = useState<string>('');
  const [caixaPaymentMethod, setCaixaPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto'>('Dinheiro');
  const [caixaDoctor, setCaixaDoctor] = useState<string>(doctors[0]?.name || 'Seja Mais Odontologia');
  const [caixaCategory, setCaixaCategory] = useState<string>('Procedimentos');

  // FLUXO DE CAIXA STATE
  const [fluxoFilterType, setFluxoFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [fluxoFilterStatus, setFluxoFilterStatus] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [fluxoSearch, setFluxoSearch] = useState<string>('');

  // New Transaction Modal State
  const [showNewTransModal, setShowNewTransModal] = useState<boolean>(false);
  const [transType, setTransType] = useState<'receita' | 'despesa'>('receita');
  const [transDesc, setTransDesc] = useState<string>('');
  const [transValue, setTransValue] = useState<string>('');
  const [transCategory, setTransCategory] = useState<string>('Procedimentos');
  const [transDoctor, setTransDoctor] = useState<string>(doctors[0]?.name || 'Seja Mais Odontologia');
  const [transPaymentMethod, setTransPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto'>('Pix');
  const [transStatus, setTransStatus] = useState<'pago' | 'pendente'>('pago');
  const [transDate, setTransDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // ==========================================
  // 1. DRE CALCULATIONS
  // ==========================================
  const getFilteredTransactionsForDRE = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    return transactions.filter(t => {
      const tDate = new Date(t.date + 'T12:00:00');
      if (drePeriod === 'current_month') {
        return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      } else if (drePeriod === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return tDate.getFullYear() === lastMonthYear && tDate.getMonth() === lastMonth;
      } else {
        // year
        return tDate.getFullYear() === currentYear;
      }
    });
  };

  const dreTransactions = getFilteredTransactionsForDRE();

  // Gross Revenue Breakdown
  const receitaConsultas = dreTransactions
    .filter(t => t.type === 'receita' && t.category === 'Consultas')
    .reduce((acc, t) => acc + t.value, 0);

  const receitaProcedimentos = dreTransactions
    .filter(t => t.type === 'receita' && (t.category === 'Procedimentos' || !t.category))
    .reduce((acc, t) => acc + t.value, 0);

  const receitaOutras = dreTransactions
    .filter(t => t.type === 'receita' && !['Consultas', 'Procedimentos'].includes(t.category))
    .reduce((acc, t) => acc + t.value, 0);

  const receitaBrutaTotal = receitaConsultas + receitaProcedimentos + receitaOutras;

  // Deductions & Taxes
  const impostosDeducoes = (receitaBrutaTotal * taxRatePercent) / 100;
  const receitaLiquida = receitaBrutaTotal - impostosDeducoes;

  // Variable Costs (COGS)
  const custoMateriais = dreTransactions
    .filter(t => t.type === 'despesa' && (t.category === 'Materiais' || t.category === 'Descartáveis' || t.category === 'Anestésicos'))
    .reduce((acc, t) => acc + t.value, 0);

  const custoLaboratorio = dreTransactions
    .filter(t => t.type === 'despesa' && t.category === 'Laboratório')
    .reduce((acc, t) => acc + t.value, 0);

  // Estimativa repasse médico (~30% dos procedimentos) ou do sistema
  const custoRepasseDentistas = dreTransactions
    .filter(t => t.type === 'despesa' && t.category === 'Comissões')
    .reduce((acc, t) => acc + t.value, 0) || (receitaProcedimentos * 0.25);

  const custosVariaveisTotal = custoMateriais + custoLaboratorio + custoRepasseDentistas;

  // Contribution Margin
  const margemContribucionR$ = receitaLiquida - custosVariaveisTotal;
  const margemContribucionPercent = receitaLiquida > 0 ? (margemContribucionR$ / receitaLiquida) * 100 : 0;

  // Fixed Operating Expenses
  const despesasFixasLancadas = dreTransactions
    .filter(t => t.type === 'despesa' && !['Materiais', 'Descartáveis', 'Anestésicos', 'Laboratório', 'Comissões'].includes(t.category))
    .reduce((acc, t) => acc + t.value, 0);

  const totalDespesasFixas = fixedRent + fixedUtilities + fixedPayroll + fixedSoftware + fixedMarketing + despesasFixasLancadas;

  // Net Profit / EBITDA
  const resultadoOperacionalLiquido = margemContribucionR$ - totalDespesasFixas;
  const margemLucrativaPercent = receitaBrutaTotal > 0 ? (resultadoOperacionalLiquido / receitaBrutaTotal) * 100 : 0;

  // Comparative Monthly Chart Data for DRE
  const monthlyChartData = [
    { mes: 'Jan', receitas: 38000, despesas: 24000, lucro: 14000 },
    { mes: 'Fev', receitas: 41200, despesas: 25500, lucro: 15700 },
    { mes: 'Mar (Atual)', receitas: Math.round(receitaBrutaTotal), despesas: Math.round(custosVariaveisTotal + totalDespesasFixas), lucro: Math.round(resultadoOperacionalLiquido) }
  ];

  // Print DRE Report
  const handlePrintDRE = () => {
    window.print();
  };

  // ==========================================
  // 2. CAIXA (FECHAMENTO E CONTROLE DIÁRIO)
  // ==========================================
  const caixaTransactions = transactions.filter(t => t.date === selectedCaixaDate);

  const totalIncomeMoney = caixaTransactions
    .filter(t => t.type === 'receita' && (t.paymentMethod === 'Dinheiro' || (!t.paymentMethod && t.category === 'Consultas')))
    .reduce((acc, t) => acc + t.value, 0);

  const totalIncomePix = caixaTransactions
    .filter(t => t.type === 'receita' && t.paymentMethod === 'Pix')
    .reduce((acc, t) => acc + t.value, 0);

  const totalIncomeCard = caixaTransactions
    .filter(t => t.type === 'receita' && (t.paymentMethod === 'Cartão de Crédito' || t.paymentMethod === 'Cartão de Débito'))
    .reduce((acc, t) => acc + t.value, 0);

  const totalIncomeOther = caixaTransactions
    .filter(t => t.type === 'receita' && t.paymentMethod === 'Boleto')
    .reduce((acc, t) => acc + t.value, 0);

  const totalExpenseMoney = caixaTransactions
    .filter(t => t.type === 'despesa' && (t.paymentMethod === 'Dinheiro' || !t.paymentMethod))
    .reduce((acc, t) => acc + t.value, 0);

  const expectedBalanceMoney = initialBalanceMoney + totalIncomeMoney - totalExpenseMoney;
  const actualBalanceNum = actualBalanceInput !== '' ? parseFloat(actualBalanceInput) : expectedBalanceMoney;
  const differenceMoney = actualBalanceNum - expectedBalanceMoney;
  const sangriaNum = parseFloat(sangriaValue) || 0;

  // Check if today's closure is already recorded
  const existingClosure = closureHistory.find(c => c.date === selectedCaixaDate);

  const handleConfirmClosure = (e: React.FormEvent) => {
    e.preventDefault();
    const closureRecord: CashRegisterClosure = {
      id: 'closure-' + Date.now(),
      date: selectedCaixaDate,
      initialBalance: initialBalanceMoney,
      totalIncomeMoney,
      totalIncomePix,
      totalIncomeCard,
      totalExpenseMoney,
      expectedBalanceMoney,
      actualBalanceMoney: actualBalanceNum,
      differenceMoney,
      sangria: sangriaNum,
      closedBy: userRole === 'gerente' ? 'Gerência Principal' : 'Secretaria / Recepção',
      closedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      notes: closureNotes
    };

    const updated = [closureRecord, ...closureHistory.filter(c => c.date !== selectedCaixaDate)];
    setClosureHistory(updated);
    localStorage.setItem('clinica_caixa_closures', JSON.stringify(updated));

    setClosureSuccessMessage(true);
    setTimeout(() => setClosureSuccessMessage(false), 5000);
  };

  const handleAddQuickCaixaMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaValue || parseFloat(caixaValue) <= 0) return;

    onAddTransaction({
      description: caixaDescription || (caixaType === 'receita' ? 'Entrada Avulsa de Caixa' : 'Saída Avulsa de Caixa'),
      value: parseFloat(caixaValue),
      type: caixaType,
      category: caixaCategory,
      doctorName: caixaDoctor,
      paymentMethod: caixaPaymentMethod,
      status: 'pago',
      date: selectedCaixaDate
    });

    setCaixaDescription('');
    setCaixaValue('');
    setShowQuickCaixaModal(false);
  };

  // ==========================================
  // 3. FLUXO DE CAIXA
  // ==========================================
  const filteredFluxoTransactions = transactions.filter(t => {
    if (fluxoFilterType !== 'todos' && t.type !== fluxoFilterType) return false;
    if (fluxoFilterStatus !== 'todos') {
      const status = t.status || 'pago'; // default paid for legacy records
      if (status !== fluxoFilterStatus) return false;
    }
    if (fluxoSearch.trim() !== '') {
      const q = fluxoSearch.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.doctorName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalReceitasRealizadas = transactions
    .filter(t => t.type === 'receita' && (t.status === 'pago' || !t.status))
    .reduce((acc, t) => acc + t.value, 0);

  const totalReceitasPendentes = transactions
    .filter(t => t.type === 'receita' && t.status === 'pendente')
    .reduce((acc, t) => acc + t.value, 0);

  const totalDespesasRealizadas = transactions
    .filter(t => t.type === 'despesa' && (t.status === 'pago' || !t.status))
    .reduce((acc, t) => acc + t.value, 0);

  const totalDespesasPendentes = transactions
    .filter(t => t.type === 'despesa' && t.status === 'pendente')
    .reduce((acc, t) => acc + t.value, 0);

  const saldoCaixaAcumulado = totalReceitasRealizadas - totalDespesasRealizadas;

  // Chart data for Fluxo de Caixa timeline
  const cashFlowTimelineData = [
    { data: '01/03', receitas: 8000, despesas: 1200, saldo: 6800 },
    { data: '05/03', receitas: 11500, despesas: 3600, saldo: 14700 },
    { data: '12/03', receitas: 17500, despesas: 5800, saldo: 26400 },
    { data: '19/03', receitas: 27500, despesas: 7200, saldo: 35000 },
    { data: '26/03', receitas: 37500, despesas: 8400, saldo: 29100 },
    { data: 'Hoje', receitas: totalReceitasRealizadas, despesas: totalDespesasRealizadas, saldo: saldoCaixaAcumulado }
  ];

  const handleAddNewTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transValue || parseFloat(transValue) <= 0) return;

    onAddTransaction({
      description: transDesc || 'Lançamento Financeiro',
      value: parseFloat(transValue),
      type: transType,
      category: transCategory,
      doctorName: transDoctor,
      paymentMethod: transPaymentMethod,
      status: transStatus,
      date: transDate
    });

    setTransDesc('');
    setTransValue('');
    setShowNewTransModal(false);
  };

  return (
    <div className="space-y-5 font-sans select-none pb-10">
      {/* Top Header & Navigation Sub-Tabs */}
      <div className="bg-white border border-[#EBEBED] p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-[15px] text-[#18181B]">
              Gestão financeira & DRE
            </h2>
            <p className="text-xs text-[#71717A]">
              DRE gerencial, fechamento de caixa diário e fluxo integrado
            </p>
          </div>
        </div>

        {/* Sub-Tabs Picker */}
        <div className="bg-[#F4F4F6] p-1 rounded-xl flex items-center gap-1 self-stretch md:self-auto text-xs font-medium overflow-x-auto max-w-full scrollbar-none">
          <button
            onClick={() => setActiveTab('dre')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dre'
                ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            <PieIcon size={14} className={activeTab === 'dre' ? 'text-[#3795AE]' : ''} /> DRE Gerencial
          </button>
          <button
            onClick={() => setActiveTab('caixa')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'caixa'
                ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            <Wallet size={14} className={activeTab === 'caixa' ? 'text-[#3795AE]' : ''} /> Caixa Diário
          </button>
          <button
            onClick={() => setActiveTab('fluxo')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fluxo'
                ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            <TrendingUp size={14} className={activeTab === 'fluxo' ? 'text-[#3795AE]' : ''} /> Fluxo de Caixa
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DRE (DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO) */}
      {/* ========================================================================= */}
      {activeTab === 'dre' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EBEBED]">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <span className="text-xs font-medium text-[#71717A]">Período</span>
              <div className="flex items-center gap-1 bg-[#F4F4F6] p-1 rounded-xl text-xs font-medium overflow-x-auto max-w-full scrollbar-none">
                <button
                  onClick={() => setDrePeriod('current_month')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                    drePeriod === 'current_month'
                      ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  Mês atual
                </button>
                <button
                  onClick={() => setDrePeriod('last_month')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                    drePeriod === 'last_month'
                      ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  Mês anterior
                </button>
                <button
                  onClick={() => setDrePeriod('year')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                    drePeriod === 'year'
                      ? 'bg-white text-[#18181B] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  Ano 2026
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
              <button
                onClick={() => setShowEditFixedModal(true)}
                className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-2 bg-white border border-[#E4E4E7] text-[#3F3F46] hover:bg-[#FAFAFA] rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                Despesas fixas & imposto ({taxRatePercent}%)
              </button>
              <button
                onClick={handlePrintDRE}
                className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-2 bg-[#3795AE] text-white hover:bg-[#2B7E94] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer size={14} /> Imprimir DRE
              </button>
            </div>
          </div>

          {/* DRE Key Metrics Top Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#EBEBED] space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span>Receita bruta</span>
                <ArrowUpRight size={15} className="text-[#16A34A]" />
              </div>
              <p className="text-2xl font-semibold text-[#18181B] tracking-[-0.02em] tabular-nums">
                R$ {receitaBrutaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#71717A]">Faturamento total do período</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#EBEBED] space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span>Custos variáveis</span>
                <TrendingDown size={15} className="text-[#D97706]" />
              </div>
              <p className="text-2xl font-semibold text-[#18181B] tracking-[-0.02em] tabular-nums">
                R$ {custosVariaveisTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#71717A]">Materiais, próteses e repasses</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#EBEBED] space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span>Margem de contribuição</span>
                <BarChart3 size={15} className="text-[#3795AE]" />
              </div>
              <p className="text-2xl font-semibold text-[#18181B] tracking-[-0.02em] tabular-nums">
                R$ {margemContribucionR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#3795AE] font-medium tabular-nums">
                {margemContribucionPercent.toFixed(1)}% da receita líquida
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#EBEBED] space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span>Lucro líquido (EBITDA)</span>
                <DollarSign size={15} className={resultadoOperacionalLiquido >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'} />
              </div>
              <p
                className={`text-2xl font-semibold tracking-[-0.02em] tabular-nums ${
                  resultadoOperacionalLiquido >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                R$ {resultadoOperacionalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-[#71717A] tabular-nums">
                Margem lucrativa: {margemLucrativaPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* DRE Structure Table & Visual Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Printable DRE Document Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEBED] overflow-hidden">
              <div className="bg-[#FAFAFA] px-6 py-4 border-b border-[#EBEBED] flex justify-between items-center">
                <div>
                  <h3 className="font-display font-semibold text-sm text-[#18181B]">
                    Demonstrativo do Resultado do Exercício (DRE)
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Estrutura gerencial odontológica · Seja Mais Odontologia
                  </p>
                </div>
                <span className="bg-white border border-[#EBEBED] px-3 py-1 rounded-lg text-xs font-medium text-[#3F3F46] tabular-nums">
                  {drePeriod === 'current_month' ? 'Março/2026' : drePeriod === 'last_month' ? 'Fevereiro/2026' : 'Ano 2026'}
                </span>
              </div>

              <div className="p-6 space-y-3 font-mono text-xs">
                {/* 1. RECEITA OPERACIONAL BRUTA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-gray-50/80 px-3 rounded-lg font-sans">
                  <span className="font-extrabold text-gray-900 text-sm">1. RECEITA OPERACIONAL BRUTA</span>
                  <span className="font-extrabold text-emerald-700 text-sm">R$ {receitaBrutaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-6 space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>(+) Consultas e Avaliações</span>
                    <span>R$ {receitaConsultas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(+) Procedimentos & Tratamentos Clínicos</span>
                    <span>R$ {receitaProcedimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {receitaOutras > 0 && (
                    <div className="flex justify-between">
                      <span>(+) Outras Receitas</span>
                      <span>R$ {receitaOutras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                {/* 2. DEDUÇÕES E IMPOSTOS */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-gray-50/80 px-3 rounded-lg font-sans mt-3">
                  <span className="font-extrabold text-gray-800">2. (-) DEDUÇÕES E IMPOSTOS SOBRE VENDAS ({taxRatePercent}%)</span>
                  <span className="font-bold text-rose-600">- R$ {impostosDeducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* 3. RECEITA OPERACIONAL LÍQUIDA */}
                <div className="flex justify-between items-center py-2 border-b border-emerald-200 bg-emerald-50/50 px-3 rounded-lg font-sans">
                  <span className="font-black text-gray-900">3. (=) RECEITA OPERACIONAL LÍQUIDA</span>
                  <span className="font-black text-emerald-800">R$ {receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* 4. CUSTOS VARIÁVEIS */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-gray-50/80 px-3 rounded-lg font-sans mt-3">
                  <span className="font-extrabold text-gray-800">4. (-) CUSTOS VARIÁVEIS (COGS)</span>
                  <span className="font-bold text-rose-600">- R$ {custosVariaveisTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-6 space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>(-) Materiais Odontológicos & Descartáveis</span>
                    <span>R$ {custoMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Custos de Laboratório de Prótese</span>
                    <span>R$ {custoLaboratorio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Comissões / Repasses a Dentistas</span>
                    <span>R$ {custoRepasseDentistas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* 5. MARGEM DE CONTRIBUIÇÃO */}
                <div className="flex justify-between items-center py-2 border-b border-blue-200 bg-blue-50/60 px-3 rounded-lg font-sans">
                  <span className="font-black text-blue-900">5. (=) MARGEM DE CONTRIBUIÇÃO</span>
                  <span className="font-black text-blue-900">R$ {margemContribucionR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({margemContribucionPercent.toFixed(1)}%)</span>
                </div>

                {/* 6. DESPESAS FIXAS OPERACIONAIS */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-gray-50/80 px-3 rounded-lg font-sans mt-3">
                  <span className="font-extrabold text-gray-800">6. (-) DESPESAS FIXAS OPERACIONAIS</span>
                  <span className="font-bold text-rose-600">- R$ {totalDespesasFixas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pl-6 space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>(-) Aluguel & Condomínio</span>
                    <span>R$ {fixedRent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Utilidades (Água, Energia, Internet, Tel)</span>
                    <span>R$ {fixedUtilities.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Folha de Pagamento & Encargos (ASB/Secretaria)</span>
                    <span>R$ {fixedPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Softwares & Sistemas de Gestão</span>
                    <span>R$ {fixedSoftware.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Marketing, Anúncios & Comunicação</span>
                    <span>R$ {fixedMarketing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {despesasFixasLancadas > 0 && (
                    <div className="flex justify-between">
                      <span>(-) Outras Despesas Operacionais Lançadas</span>
                      <span>R$ {despesasFixasLancadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                {/* 7. RESULTADO OPERACIONAL LÍQUIDO */}
                <div className={`flex justify-between items-center p-3.5 rounded-xl font-sans mt-4 border-2 ${
                  resultadoOperacionalLiquido >= 0
                    ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950'
                    : 'bg-rose-100/70 border-rose-400 text-rose-950'
                }`}>
                  <div>
                    <span className="font-black text-base block">7. (=) RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO)</span>
                    <span className="text-xs font-semibold opacity-80">Lucratividade sobre Faturamento Bruto: {margemLucrativaPercent.toFixed(1)}%</span>
                  </div>
                  <span className="font-black text-xl font-display">
                    R$ {resultadoOperacionalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* DRE Bar Chart Visualization */}
            <div className="bg-white p-6 rounded-2xl border border-level-2 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-extrabold text-sm text-gray-900 mb-1">Evolução de Desempenho (Trimestral)</h3>
                <p className="text-xs text-gray-500 mb-4">Comparativo histórico de Receita, Custos e Lucro</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="receitas" name="Receita" fill="#2d8096" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lucro" name="Lucro Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-gray-900">💡 Resumo Executivo para a Gerência:</p>
                <p className="text-gray-600 leading-relaxed">
                  {resultadoOperacionalLiquido >= 0
                    ? `Sua clínica apresenta saúde financeira positiva com margem de lucro de ${margemLucrativaPercent.toFixed(1)}%. Os custos variáveis representam ${((custosVariaveisTotal/receitaBrutaTotal)*100).toFixed(1)}% do faturamento.`
                    : 'Atenção: Os custos operacionais e variáveis superaram as receitas no período selecionado. Avalie renegociação de suprimentos ou otimização da agenda.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAIXA (FECHAMENTO E CONTROLE DIÁRIO) */}
      {/* ========================================================================= */}
      {activeTab === 'caixa' && (
        <div className="space-y-6">
          {/* Caixa Date Picker & Status Bar */}
          <div className="bg-white p-5 rounded-2xl border border-level-2 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Data do Caixa:</span>
              <input
                type="date"
                value={selectedCaixaDate}
                onChange={e => setSelectedCaixaDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {existingClosure ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Caixa Fechado às {existingClosure.closedAt} por {existingClosure.closedBy}
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                  <Clock size={16} /> Caixa Aberto (Aguardando Fechamento)
                </span>
              )}

              <button
                onClick={() => setShowQuickCaixaModal(true)}
                className="px-4 py-2 bg-[#2d8096] text-white hover:bg-[#256f83] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <Plus size={16} /> Novo Lançamento de Caixa
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {closureSuccessMessage && (
            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-between animate-fade-in text-xs font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} />
                <span>Fechamento de caixa registrado e salvo com sucesso!</span>
              </div>
              <button onClick={() => setClosureSuccessMessage(false)} className="cursor-pointer">
                <X size={18} />
              </button>
            </div>
          )}

          {/* Caixa Payment Methods Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">💵 DINHEIRO (GAVETEIRO)</span>
              <p className="text-lg font-black font-display text-emerald-600">
                + R$ {totalIncomeMoney.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-rose-500 font-semibold">- Saídas: R$ {totalExpenseMoney.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">⚡ PIX BANCO</span>
              <p className="text-lg font-black font-display text-[#2d8096]">
                R$ {totalIncomePix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Conta digital</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">💳 CARTÃO CRÉD./DÉB.</span>
              <p className="text-lg font-black font-display text-purple-600">
                R$ {totalIncomeCard.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Maquininha pós</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">📄 BOLETO / OUTROS</span>
              <p className="text-lg font-black font-display text-gray-800">
                R$ {totalIncomeOther.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Bancário</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">💰 FÍSICO ESPERADO</span>
              <p className="text-xl font-black font-display text-emerald-700">
                R$ {expectedBalanceMoney.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">Fundo de Troco + Entradas - Saídas</p>
            </div>
          </div>

          {/* Closure Form & Daily Movements Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fechamento Form Panel */}
            <div className="bg-white p-6 rounded-2xl border border-level-2 shadow-2xs space-y-5">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <h3 className="font-display font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Wallet className="text-[#2d8096]" size={18} /> Fechamento do Gaveteiro de Caixa
                </h3>
                <span className="text-[10px] font-bold text-gray-400 font-mono">{selectedCaixaDate}</span>
              </div>

              <form onSubmit={handleConfirmClosure} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Saldo Inicial de Abertura (Troco):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalanceMoney}
                    onChange={e => setInitialBalanceMoney(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono font-bold text-gray-900"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex justify-between font-medium text-gray-600">
                    <span>(+) Entradas em Dinheiro:</span>
                    <span className="text-emerald-600 font-bold">R$ {totalIncomeMoney.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-600">
                    <span>(-) Saídas em Dinheiro:</span>
                    <span className="text-rose-600 font-bold">- R$ {totalExpenseMoney.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-gray-900 border-t border-slate-200 pt-1.5 mt-1">
                    <span>(=) Saldo Esperado no Gaveteiro:</span>
                    <span className="text-[#2d8096]">R$ {expectedBalanceMoney.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Saldo REAL Contado no Gaveteiro (R$): *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Ex: ${expectedBalanceMoney.toFixed(2)}`}
                    value={actualBalanceInput}
                    onChange={e => setActualBalanceInput(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-[#2d8096]/30 rounded-xl px-3.5 py-2.5 font-mono font-extrabold text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]"
                  />
                </div>

                {actualBalanceInput !== '' && (
                  <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                    differenceMoney === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : differenceMoney > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <span>Diferença / Divergência de Caixa:</span>
                    <span className="font-mono text-sm">
                      {differenceMoney > 0 ? `+ R$ ${differenceMoney.toFixed(2)} (Sobra)` : differenceMoney < 0 ? `- R$ ${Math.abs(differenceMoney).toFixed(2)} (Falta)` : 'R$ 0,00 (Exato)'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-gray-500 font-bold mb-1">Sangria / Retirada do Caixa (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sangriaValue}
                    onChange={e => setSangriaValue(e.target.value)}
                    placeholder="Valor a ser depositado no banco"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold mb-1">Observações do Fechamento:</label>
                  <textarea
                    rows={2}
                    value={closureNotes}
                    onChange={e => setClosureNotes(e.target.value)}
                    placeholder="Ex: Trocado R$ 50 para troco da tarde com a recepção."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2d8096] text-white hover:bg-[#256f83] rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <CheckCircle2 size={16} /> Realizar Fechamento do Caixa
                </button>
              </form>
            </div>

            {/* Daily Movements Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-level-2 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-display font-extrabold text-sm text-gray-900">Movimentações do Dia</h3>
                  <p className="text-xs text-gray-500 font-medium">Registros de entradas e saídas em {selectedCaixaDate}</p>
                </div>
                <span className="text-xs font-bold text-gray-400">{caixaTransactions.length} registros</span>
              </div>

              {caixaTransactions.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Receipt size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs font-medium">Nenhum lançamento registrado nesta data.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-extrabold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Descrição / Dentista</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Forma</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {caixaTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-bold text-gray-900">{t.description}</p>
                            <p className="text-[10px] text-gray-400">{t.doctorName}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {t.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-600">
                            {t.paymentMethod || 'Dinheiro'}
                          </td>
                          <td className={`py-3 px-3 text-right font-extrabold font-mono text-sm ${
                            t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {t.type === 'receita' ? '+' : '-'} R$ {t.value.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => onDeleteTransaction(t.id)}
                              className="text-gray-400 hover:text-rose-600 p-1 rounded-md cursor-pointer transition-colors"
                              title="Excluir lançamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FLUXO DE CAIXA (CASH FLOW) */}
      {/* ========================================================================= */}
      {activeTab === 'fluxo' && (
        <div className="space-y-6">
          {/* Top Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">ENTRADAS REALIZADAS (PAGAS)</span>
              <p className="text-2xl font-black font-display text-emerald-700">
                R$ {totalReceitasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-amber-600 font-bold">
                + R$ {totalReceitasPendentes.toFixed(2)} pendentes a receber
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">SAÍDAS REALIZADAS (PAGAS)</span>
              <p className="text-2xl font-black font-display text-rose-700">
                R$ {totalDespesasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-rose-500 font-bold">
                + R$ {totalDespesasPendentes.toFixed(2)} pendentes a pagar
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-level-2 shadow-2xs space-y-1">
              <span className="text-[10px] font-extrabold text-[#2d8096] uppercase tracking-wider block">SALDO DE CAIXA ACUMULADO</span>
              <p className="text-2xl font-black font-display text-gray-900">
                R$ {saldoCaixaAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">Balanço do extrato bancário + dinheiro</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#EBEBED] flex flex-col justify-between gap-3">
              <span className="text-xs font-medium text-[#71717A] block">Novo registro</span>
              <button
                onClick={() => setShowNewTransModal(true)}
                className="w-full py-2.5 bg-[#3795AE] text-white hover:bg-[#2B7E94] rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus size={15} /> Lançar receita ou despesa
              </button>
            </div>
          </div>

          {/* Cash Flow Timeline Area Chart */}
          <div className="bg-white p-6 rounded-2xl border border-[#EBEBED] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-sm text-[#18181B]">Curva do fluxo de caixa acumulado</h3>
                <p className="text-xs text-[#71717A] mt-0.5">Acompanhamento de entradas, saídas e saldo projetado</p>
              </div>
              <span className="text-xs font-medium text-[#71717A]">Março 2026</span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowTimelineData}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3795AE" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#3795AE" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F3" />
                  <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A1A1AA' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A1A1AA' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#EBEBED',
                      borderRadius: '12px',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="#3795AE" strokeWidth={2} fillOpacity={1} fill="url(#colorSaldo)" />
                  <Area type="monotone" dataKey="receitas" name="Entradas" stroke="#16A34A" strokeWidth={1.75} fillOpacity={0} />
                  <Area type="monotone" dataKey="despesas" name="Saídas" stroke="#DC2626" strokeWidth={1.75} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transactions Extrato Table with Filters */}
          <div className="bg-white rounded-2xl border border-level-2 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-sm text-gray-900">Extrato de Lançamentos Financeiros</h3>
                <p className="text-xs text-gray-500">Histórico detalhado com status de pagamento</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs font-bold">
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={fluxoSearch}
                  onChange={e => setFluxoSearch(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />

                <select
                  value={fluxoFilterType}
                  onChange={e => setFluxoFilterType(e.target.value as any)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="receita">Somente Receitas</option>
                  <option value="despesa">Somente Despesas</option>
                </select>

                <select
                  value={fluxoFilterStatus}
                  onChange={e => setFluxoFilterStatus(e.target.value as any)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pago">Somente Pagos</option>
                  <option value="pendente">Somente Pendentes</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Descrição / Fornecedor</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Profissional</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredFluxoTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Nenhum lançamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredFluxoTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-gray-600 whitespace-nowrap">
                          {t.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {t.description}
                          {t.supplier && <span className="block text-[10px] text-gray-400 font-normal">Forn: {t.supplier}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-semibold">
                          {t.doctorName}
                        </td>
                        <td className="py-3 px-3">
                          {t.status === 'pendente' ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit">
                              <Clock size={12} /> Pendente
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit">
                              <CheckCircle2 size={12} /> Pago / Confirmado
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-3 text-right font-extrabold font-mono text-sm ${
                          t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'receita' ? '+' : '-'} R$ {t.value.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onDeleteTransaction(t.id)}
                            className="text-gray-400 hover:text-rose-600 p-1 rounded-md cursor-pointer transition-colors"
                            title="Excluir lançamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDITAR DESPESAS FIXAS & ALÍQUOTA DRE */}
      {/* ========================================================================= */}
      {showEditFixedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-level-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-gray-900">
                ⚙️ Configurações DRE Gerencial
              </h3>
              <button onClick={() => setShowEditFixedModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Imposto / Alíquota Simples Nacional (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={taxRatePercent}
                  onChange={e => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Aluguel & Condomínio Mensal (R$):</label>
                <input
                  type="number"
                  value={fixedRent}
                  onChange={e => setFixedRent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Utilidades (Água, Luz, Internet) (R$):</label>
                <input
                  type="number"
                  value={fixedUtilities}
                  onChange={e => setFixedUtilities(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Folha de Pagamento Equipe Fixa (R$):</label>
                <input
                  type="number"
                  value={fixedPayroll}
                  onChange={e => setFixedPayroll(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Softwares & Sistemas (R$):</label>
                <input
                  type="number"
                  value={fixedSoftware}
                  onChange={e => setFixedSoftware(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Marketing & Anúncios (R$):</label>
                <input
                  type="number"
                  value={fixedMarketing}
                  onChange={e => setFixedMarketing(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>
            </div>

            <button
              onClick={() => setShowEditFixedModal(false)}
              className="w-full py-2.5 bg-[#2d8096] text-white hover:bg-[#256f83] rounded-xl font-bold text-xs cursor-pointer shadow-xs mt-2"
            >
              Salvar Parâmetros DRE
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LANÇAMENTO RÁPIDO DE CAIXA */}
      {/* ========================================================================= */}
      {showQuickCaixaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-level-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-gray-900">
                ➕ Novo Lançamento no Caixa ({selectedCaixaDate})
              </h3>
              <button onClick={() => setShowQuickCaixaModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddQuickCaixaMovement} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCaixaType('receita')}
                  className={`py-2 rounded-xl font-extrabold cursor-pointer text-center transition-all ${
                    caixaType === 'receita' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  + Receita (Entrada)
                </button>
                <button
                  type="button"
                  onClick={() => setCaixaType('despesa')}
                  className={`py-2 rounded-xl font-extrabold cursor-pointer text-center transition-all ${
                    caixaType === 'despesa' ? 'bg-rose-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  - Despesa (Saída)
                </button>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Descrição do Lançamento: *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento Consulta Paciente João"
                  value={caixaDescription}
                  onChange={e => setCaixaDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Valor (R$): *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={caixaValue}
                  onChange={e => setCaixaValue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono font-bold text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Meio de Pagamento:</label>
                <select
                  value={caixaPaymentMethod}
                  onChange={e => setCaixaPaymentMethod(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                >
                  <option value="Dinheiro">💵 Dinheiro (Gaveteiro)</option>
                  <option value="Pix">⚡ Pix Banco</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Boleto">📄 Boleto / Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Dentista / Profissional Responsável:</label>
                <select
                  value={caixaDoctor}
                  onChange={e => setCaixaDoctor(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                >
                  <option value="Seja Mais Odontologia">Seja Mais Odontologia (Geral)</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#2d8096] text-white hover:bg-[#256f83] rounded-xl font-bold text-xs cursor-pointer shadow-xs mt-2"
              >
                Registrar no Caixa
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LANÇAMENTO COMPLETO DE FLUXO DE CAIXA */}
      {/* ========================================================================= */}
      {showNewTransModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-level-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-gray-900">
                ➕ Novo Lançamento no Fluxo de Caixa
              </h3>
              <button onClick={() => setShowNewTransModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNewTransactionSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransType('receita')}
                  className={`py-2 rounded-xl font-extrabold cursor-pointer text-center transition-all ${
                    transType === 'receita' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  + Receita
                </button>
                <button
                  type="button"
                  onClick={() => setTransType('despesa')}
                  className={`py-2 rounded-xl font-extrabold cursor-pointer text-center transition-all ${
                    transType === 'despesa' ? 'bg-rose-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  - Despesa
                </button>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Descrição / Histórico: *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento de Prótese - Lab Sorriso"
                  value={transDesc}
                  onChange={e => setTransDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Valor (R$): *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={transValue}
                    onChange={e => setTransValue(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Data:</label>
                  <input
                    type="date"
                    value={transDate}
                    onChange={e => setTransDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Categoria:</label>
                <select
                  value={transCategory}
                  onChange={e => setTransCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                >
                  <option value="Procedimentos">Procedimentos & Tratamentos</option>
                  <option value="Consultas">Consultas & Avaliações</option>
                  <option value="Materiais">Materiais & Consumíveis</option>
                  <option value="Laboratório">Laboratório de Prótese</option>
                  <option value="Aluguel">Aluguel & Condomínio</option>
                  <option value="Salários">Salários & Pró-labore</option>
                  <option value="Impostos">Impostos & Taxas</option>
                  <option value="Marketing">Marketing & Anúncios</option>
                  <option value="Manutenção">Manutenção & Sanitização</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Meio de Pagamento:</label>
                  <select
                    value={transPaymentMethod}
                    onChange={e => setTransPaymentMethod(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Status:</label>
                  <select
                    value={transStatus}
                    onChange={e => setTransStatus(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                  >
                    <option value="pago">Pago / Confirmado</option>
                    <option value="pendente">Pendente / A Vencer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Profissional Responsável:</label>
                <select
                  value={transDoctor}
                  onChange={e => setTransDoctor(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900"
                >
                  <option value="Seja Mais Odontologia">Seja Mais Odontologia</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#2d8096] text-white hover:bg-[#256f83] rounded-xl font-bold text-xs cursor-pointer shadow-xs mt-2"
              >
                Salvar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
