/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction, SupplyItem } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Printer,
  X,
  FileText,
  Download,
  Loader2,
  Boxes,
  ShoppingBag,
  Search,
  Filter,
  Clock,
  Edit3,
  AlertCircle,
  MapPin,
  Tag,
  ShieldAlert,
  PackageCheck,
  Building2,
  PackagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadElementAsPDF, openPrintWindow } from '../lib/pdfUtils';
import { ClinicLogo } from './Sidebar';

interface SuppliesProps {
  supplies: SupplyItem[];
  onAddStock: (id: string, qty: number) => void;
  onRecordPurchaseExpense: (
    description: string, 
    value: number, 
    date?: string, 
    supplier?: string, 
    subcategory?: string
  ) => void;
  userRole: 'gestao' | 'dentista' | 'funcionario' | null;
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onAddSupplyItem: (item: Omit<SupplyItem, 'id'>) => void;
  onUpdateSupplyItem?: (id: string, updated: Partial<SupplyItem>) => void;
  onDeleteSupplyItem?: (id: string) => void;
}

export default function Supplies({ 
  supplies, 
  onAddStock, 
  onRecordPurchaseExpense,
  userRole,
  transactions,
  onDeleteTransaction,
  onAddSupplyItem,
  onUpdateSupplyItem,
  onDeleteSupplyItem
}: SuppliesProps) {
  
  // Navigation Sub-tab: 'compras' | 'estoque'
  const [activeSubTab, setActiveSubTab] = useState<'compras' | 'estoque'>('estoque');

  // Date State - Defaults to current real month
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Form Inputs State (Lançar Compra)
  const [formDate, setFormDate] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [formItem, setFormItem] = useState('');
  const [formValue, setFormValue] = useState('0');
  const [formSupplier, setFormSupplier] = useState('');
  const [formCategory, setFormCategory] = useState('Descartáveis');

  // Selected Purchases State for "Adicionar ao estoque"
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);

  // Modal States for Inventory (Estoque)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);

  // Filters for Inventory (Estoque)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [expirationFilter, setExpirationFilter] = useState<'todos' | 'vencidos' | 'a_vencer' | 'ok' | 'sem_data'>('todos');
  const [stockFilter, setStockFilter] = useState<'todos' | 'baixo'>('todos');

  // New Item Form State
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: 'Consumíveis',
    stock: 10,
    minStock: 5,
    unit: 'unidades',
    price: 0,
    expirationDate: '',
    batchNumber: '',
    supplier: '',
    location: ''
  });

  // Sync Form Date when Month selector is changed
  useEffect(() => {
    const day = '01';
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    setFormDate(`${day}/${month}/${year}`);
  }, [currentDate]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleDownloadReportPDF = async () => {
    setIsGeneratingPDF(true);
    const success = await downloadElementAsPDF('printable-report', 'Relatorio_Compras_SejaMais.pdf');
    if (!success) {
      openPrintWindow('printable-report', 'Relatório de Compras - Seja Mais Odontologia');
    }
    setIsGeneratingPDF(false);
  };

  // Helper for expiration status calculation
  const getExpirationInfo = (expirationDate?: string) => {
    if (!expirationDate) return { status: 'sem_data', label: 'Sem Registro', daysLeft: null, color: 'gray' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate + 'T00:00:00');
    
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        status: 'vencido', 
        label: `Vencido (${Math.abs(diffDays)}d atrás)`, 
        daysLeft: diffDays, 
        color: 'red' 
      };
    } else if (diffDays <= 30) {
      return { 
        status: 'a_vencer', 
        label: `Vence em ${diffDays}d`, 
        daysLeft: diffDays, 
        color: 'amber' 
      };
    } else if (diffDays <= 60) {
      return { 
        status: 'a_vencer_60', 
        label: `Vence em ${diffDays}d`, 
        daysLeft: diffDays, 
        color: 'yellow' 
      };
    } else {
      return { 
        status: 'ok', 
        label: 'Validade OK', 
        daysLeft: diffDays, 
        color: 'emerald' 
      };
    }
  };

  // Inventory Expiration Summary Counts
  const expiredCount = supplies.filter(item => getExpirationInfo(item.expirationDate).status === 'vencido').length;
  const expiringSoonCount = supplies.filter(item => ['a_vencer', 'a_vencer_60'].includes(getExpirationInfo(item.expirationDate).status)).length;
  const lowStockCount = supplies.filter(item => item.stock <= item.minStock).length;

  // Filtered supplies for inventory table
  const filteredSupplies = supplies.filter(item => {
    // Search
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batchNumber && item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

    // Category
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;

    // Expiration
    const expInfo = getExpirationInfo(item.expirationDate);
    let matchesExp = true;
    if (expirationFilter === 'vencidos') matchesExp = expInfo.status === 'vencido';
    else if (expirationFilter === 'a_vencer') matchesExp = ['a_vencer', 'a_vencer_60'].includes(expInfo.status);
    else if (expirationFilter === 'ok') matchesExp = expInfo.status === 'ok';
    else if (expirationFilter === 'sem_data') matchesExp = expInfo.status === 'sem_data';

    // Stock
    let matchesStock = true;
    if (stockFilter === 'baixo') matchesStock = item.stock <= item.minStock;

    return matchesSearch && matchesCategory && matchesExp && matchesStock;
  });

  // Extract purchase transactions belonging to selected Month and Year
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthlyPurchases = transactions.filter(t => {
    if (t.type !== 'despesa' || t.category !== 'Materiais') return false;
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonthIndex;
  });

  const totalMonthlySum = monthlyPurchases.reduce((sum, p) => sum + p.value, 0);

  // Group by category helper
  const categoryTotals: { [cat: string]: number } = {};
  monthlyPurchases.forEach(p => {
    const cat = p.subcategory || 'Descartáveis';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + p.value;
  });

  // Submit Lançar Compra Form
  const handleLaunchPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.trim()) return;

    const valueNum = parseFloat(formValue) || 0;
    const dateParts = formDate.split('/');
    let formattedISO = new Date().toISOString().split('T')[0];
    if (dateParts.length === 3) {
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      formattedISO = `${year}-${month}-${day}`;
    }

    onRecordPurchaseExpense(
      formItem,
      valueNum,
      formattedISO,
      formSupplier.trim() || 'Opcional',
      formCategory
    );

    setFormItem('');
    setFormValue('0');
    setFormSupplier('');
    setSuccessMsg('Compra lançada com sucesso no financeiro!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm("Deseja mesmo remover este lançamento de compra?")) {
      onDeleteTransaction(id);
      setSuccessMsg("Lançamento removido com sucesso.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Handler for "Adicionar ao estoque" button
  const handleAddToStockSelected = () => {
    let itemsToAdd = monthlyPurchases.filter(p => selectedPurchaseIds.includes(p.id));

    if (itemsToAdd.length === 0) {
      if (monthlyPurchases.length === 0) {
        setSuccessMsg('Nenhuma compra registrada neste mês para enviar ao estoque.');
        setTimeout(() => setSuccessMsg(null), 3500);
        return;
      }
      const confirmAddAll = window.confirm(
        'Nenhum item foi marcado. Deseja enviar TODOS os itens comprados neste mês para o Estoque?'
      );
      if (!confirmAddAll) return;
      itemsToAdd = [...monthlyPurchases];
    }

    let addedCount = 0;
    let updatedCount = 0;

    itemsToAdd.forEach(purchase => {
      const existingIndex = supplies.findIndex(
        s => s.name.trim().toLowerCase() === purchase.description.trim().toLowerCase()
      );

      if (existingIndex >= 0) {
        const existingItem = supplies[existingIndex];
        if (onUpdateSupplyItem) {
          onUpdateSupplyItem(existingItem.id, {
            stock: existingItem.stock + 1,
            price: purchase.value > 0 ? purchase.value : existingItem.price,
            supplier: purchase.supplier && purchase.supplier !== 'Opcional' ? purchase.supplier : existingItem.supplier
          });
          updatedCount++;
        }
      } else {
        const itemToAdd: Omit<SupplyItem, 'id'> = {
          name: purchase.description.trim(),
          category: purchase.subcategory || 'Consumíveis',
          stock: 1,
          minStock: 2,
          unit: 'unidades',
          price: purchase.value || 0
        };
        if (purchase.supplier && purchase.supplier !== 'Opcional') {
          itemToAdd.supplier = purchase.supplier;
        }
        onAddSupplyItem(itemToAdd);
        addedCount++;
      }
    });

    setSelectedPurchaseIds([]);
    setActiveSubTab('estoque');
    
    const totalProcessed = addedCount + updatedCount;
    setSuccessMsg(
      `${totalProcessed} produto(s) enviado(s) para o Estoque. Toque em um produto para informar a data de validade.`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Submit New Item to Inventory
  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.name.trim()) return;

    onAddSupplyItem({
      name: newItemData.name.trim(),
      category: newItemData.category,
      stock: Number(newItemData.stock) || 0,
      minStock: Number(newItemData.minStock) || 0,
      unit: newItemData.unit || 'unidades',
      price: Number(newItemData.price) || 0,
      expirationDate: newItemData.expirationDate || undefined,
      batchNumber: newItemData.batchNumber.trim() || undefined,
      supplier: newItemData.supplier.trim() || undefined,
      location: newItemData.location.trim() || undefined
    });

    setShowAddModal(false);
    setNewItemData({
      name: '',
      category: 'Consumíveis',
      stock: 10,
      minStock: 5,
      unit: 'unidades',
      price: 0,
      expirationDate: '',
      batchNumber: '',
      supplier: '',
      location: ''
    });

    setSuccessMsg('Produto cadastrado no estoque com registro de validade!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Save Edits to existing item
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !onUpdateSupplyItem) return;

    onUpdateSupplyItem(editingItem.id, {
      name: editingItem.name,
      category: editingItem.category,
      stock: Number(editingItem.stock),
      minStock: Number(editingItem.minStock),
      unit: editingItem.unit,
      price: Number(editingItem.price),
      expirationDate: editingItem.expirationDate || undefined,
      batchNumber: editingItem.batchNumber || undefined,
      supplier: editingItem.supplier || undefined,
      location: editingItem.location || undefined
    });

    setEditingItem(null);
    setSuccessMsg('Dados do produto e registro de validade atualizados!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Delete product from inventory
  const handleDeleteProduct = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir "${name}" do estoque?`)) {
      if (onDeleteSupplyItem) {
        onDeleteSupplyItem(id);
      }
      setSuccessMsg(`Produto "${name}" removido do estoque.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Quick launch purchase expense from an inventory item
  const handleQuickLaunchExpenseFromStock = (item: SupplyItem) => {
    const value = item.price * (item.minStock * 2 || 5);
    onRecordPurchaseExpense(
      `Reposição: ${item.name}`,
      value > 0 ? value : 100,
      new Date().toISOString().split('T')[0],
      item.supplier || 'Fornecedor',
      item.category
    );
    setSuccessMsg(`Compra de reposição registrada para ${item.name}!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-7 w-full font-sans select-none pb-10">
      {/* Dynamic Success Notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] text-sm font-semibold px-5 py-4 rounded-2xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="w-8 h-8 rounded-lg hover:bg-[#15803D]/10 flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E6EAF0]">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#14181F]">
            O que você deseja fazer?
          </h2>
          <p className="text-sm text-[#647082] mt-0.5">
            Alterne entre conferir os materiais guardados e lançar compras feitas no mês.
          </p>
        </div>

        <div className="flex items-center bg-[#F1F4F7] p-1.5 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('estoque')}
            className={`flex-1 sm:flex-initial min-h-[42px] flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'estoque'
                ? 'bg-white text-[#14181F] shadow-xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <Boxes size={17} className={activeSubTab === 'estoque' ? 'text-[#3795AE]' : ''} />
            <span>Estoque de materiais</span>
            {(expiredCount > 0 || expiringSoonCount > 0) && (
              <span className="bg-[#FEF2F2] text-[#DC2626] text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums">
                {expiredCount + expiringSoonCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('compras')}
            className={`flex-1 sm:flex-initial min-h-[42px] flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'compras'
                ? 'bg-white text-[#14181F] shadow-xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <ShoppingBag size={17} className={activeSubTab === 'compras' ? 'text-[#3795AE]' : ''} />
            <span>Compras do mês</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: ESTOQUE DE MATERIAIS & REGISTRO DE VALIDADE   */}
      {/* ========================================================= */}
      {activeSubTab === 'estoque' && (
        <div className="space-y-7">
          {/* Expiration Alert Banner */}
          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 bg-white border border-[#FDE68A] text-[#B45309] rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#92400E]">
                    Atenção com a validade dos materiais
                  </h4>
                  <p className="text-[13.5px] text-[#92400E]/90 mt-0.5">
                    {expiredCount > 0 && (
                      <span className="font-semibold text-[#DC2626]">
                        {expiredCount} produto(s) vencido(s)
                      </span>
                    )}
                    {expiredCount > 0 && expiringSoonCount > 0 && ' e '}
                    {expiringSoonCount > 0 && (
                      <span className="font-semibold text-[#B45309]">
                        {expiringSoonCount} produto(s) vencendo nos próximos 60 dias
                      </span>
                    )}
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpirationFilter('vencidos')}
                className="min-h-[42px] bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-semibold text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Mostrar vencidos
              </button>
            </div>
          )}

          {/* Top Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-[#E6EAF0] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13.5px] font-medium text-[#647082]">Produtos cadastrados</span>
                <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center">
                  <Boxes size={18} />
                </div>
              </div>
              <div className="text-[28px] font-semibold text-[#14181F] tracking-tight tabular-nums leading-none">
                {supplies.length}
              </div>
              <p className="text-[13px] text-[#647082] tabular-nums">
                Total em estoque: R$ {supplies.reduce((acc, i) => acc + i.stock * i.price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border bg-white space-y-3 ${expiredCount > 0 ? 'border-[#FECACA]' : 'border-[#E6EAF0]'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[13.5px] font-medium text-[#647082]">Produtos vencidos</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${expiredCount > 0 ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F1F4F7] text-[#94A0B2]'}`}>
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className={`text-[28px] font-semibold tracking-tight tabular-nums leading-none ${expiredCount > 0 ? 'text-[#DC2626]' : 'text-[#14181F]'}`}>
                {expiredCount}
              </div>
              <p className="text-[13px] text-[#647082]">
                {expiredCount > 0 ? 'Separar para descarte' : 'Nenhum vencido'}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border bg-white space-y-3 ${expiringSoonCount > 0 ? 'border-[#FDE68A]' : 'border-[#E6EAF0]'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[13.5px] font-medium text-[#647082]">Vencem em até 60 dias</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${expiringSoonCount > 0 ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#F1F4F7] text-[#94A0B2]'}`}>
                  <Clock size={18} />
                </div>
              </div>
              <div className={`text-[28px] font-semibold tracking-tight tabular-nums leading-none ${expiringSoonCount > 0 ? 'text-[#B45309]' : 'text-[#14181F]'}`}>
                {expiringSoonCount}
              </div>
              <p className="text-[13px] text-[#647082]">
                {expiringSoonCount > 0 ? 'Usar primeiro nos atendimentos' : 'Sem alertas de validade'}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border bg-white space-y-3 ${lowStockCount > 0 ? 'border-[#FED7AA]' : 'border-[#E6EAF0]'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[13.5px] font-medium text-[#647082]">Acabando (baixo)</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-[#FFF7ED] text-[#EA580C]' : 'bg-[#F1F4F7] text-[#94A0B2]'}`}>
                  <PackageCheck size={18} />
                </div>
              </div>
              <div className={`text-[28px] font-semibold tracking-tight tabular-nums leading-none ${lowStockCount > 0 ? 'text-[#EA580C]' : 'text-[#14181F]'}`}>
                {lowStockCount}
              </div>
              <p className="text-[13px] text-[#647082]">
                {lowStockCount > 0 ? 'Precisam de reposição' : 'Quantidades em dia'}
              </p>
            </div>
          </div>

          {/* Search, Clean Filters & Primary Add Button */}
          <div className="bg-white border border-[#E6EAF0] p-5 sm:p-6 rounded-2xl space-y-5">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
              <div className="relative flex-1 lg:max-w-md">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A0B2] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Procurar produto, lote, armário ou fornecedor..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full min-h-[46px] bg-[#F7F8FA] border border-[#DCE2EA] rounded-xl py-2.5 pl-11 pr-10 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:bg-white focus:border-[#3795AE]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#94A0B2] hover:text-[#14181F]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="min-h-[46px] flex items-center justify-center gap-2 bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus size={18} />
                <span>Cadastrar novo produto</span>
              </button>
            </div>

            {/* Calm, Emoji-Free Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#ECEFF3]">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="min-h-[40px] bg-[#F7F8FA] border border-[#DCE2EA] rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-[#374151] focus:outline-none focus:bg-white focus:border-[#3795AE]"
              >
                <option value="Todas">Todas as categorias</option>
                <option value="Consumíveis">Consumíveis</option>
                <option value="Anestésicos">Anestésicos</option>
                <option value="Descartáveis">Descartáveis</option>
                <option value="Instrumentos">Instrumentos</option>
                <option value="Agulhas">Agulhas</option>
                <option value="Ortodontia">Ortodontia</option>
                <option value="Cirúrgico">Cirúrgico</option>
                <option value="Estética">Estética</option>
              </select>

              <div className="inline-flex flex-wrap items-center gap-1 bg-[#F1F4F7] p-1 rounded-xl text-[13px] font-medium">
                {[
                  { id: 'todos', label: 'Todas validades' },
                  { id: 'vencidos', label: `Vencidos (${expiredCount})` },
                  { id: 'a_vencer', label: `A vencer (${expiringSoonCount})` },
                  { id: 'ok', label: 'No prazo' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExpirationFilter(opt.id as any)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      expirationFilter === opt.id
                        ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                        : 'text-[#647082] hover:text-[#14181F]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStockFilter(prev => (prev === 'baixo' ? 'todos' : 'baixo'))}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors sm:ml-auto whitespace-nowrap border ${
                  stockFilter === 'baixo'
                    ? 'bg-[#EA580C] text-white border-[#EA580C]'
                    : 'bg-white text-[#4B5563] border-[#DCE2EA] hover:bg-[#F7F8FA]'
                }`}
              >
                Mostrar só estoque baixo ({lowStockCount})
              </button>
            </div>
          </div>

          {/* Main Inventory Table */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden">
            {filteredSupplies.length === 0 ? (
              <div className="text-center py-16 px-6 space-y-4">
                <Boxes size={42} className="mx-auto text-[#CBD5E1]" />
                <div className="space-y-1">
                  <h4 className="font-display font-semibold text-base text-[#14181F]">
                    {supplies.length === 0 ? 'Seu estoque ainda está vazio' : 'Nenhum produto encontrado'}
                  </h4>
                  <p className="text-sm text-[#647082] max-w-md mx-auto">
                    {supplies.length === 0
                      ? 'Cadastre os materiais da clínica para acompanhar quantidades e receber alertas antes de vencer.'
                      : 'Tente limpar a busca ou escolher outro filtro acima.'}
                  </p>
                </div>
                {supplies.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus size={18} />
                    <span>Cadastrar primeiro produto</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#ECEFF3] font-medium text-[#647082] text-[13px]">
                      <th className="py-4 px-5">Produto</th>
                      <th className="py-4 px-4">Validade</th>
                      <th className="py-4 px-4">Lote e local</th>
                      <th className="py-4 px-4 text-center">Quantidade</th>
                      <th className="py-4 px-4 text-right">Preço un.</th>
                      <th className="py-4 px-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEFF3] text-[#374151]">
                    {filteredSupplies.map(item => {
                      const expInfo = getExpirationInfo(item.expirationDate);
                      const isLowStock = item.stock <= item.minStock;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setEditingItem(item)}
                          className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                          title="Toque para editar ou atualizar validade"
                        >
                          <td className="py-4 px-5">
                            <div className="font-semibold text-[#14181F] group-hover:text-[#3795AE] transition-colors">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#647082] mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{item.category}</span>
                              {item.supplier && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.supplier}</span>
                                </>
                              )}
                              {isLowStock && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[#EA580C] font-semibold">Estoque baixo</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            {item.expirationDate ? (
                              <div className="space-y-0.5">
                                <div className="font-medium text-[#14181F] tabular-nums">
                                  {item.expirationDate.split('-').reverse().join('/')}
                                </div>
                                <div
                                  className={`text-xs font-semibold ${
                                    expInfo.status === 'vencido'
                                      ? 'text-[#DC2626]'
                                      : ['a_vencer', 'a_vencer_60'].includes(expInfo.status)
                                      ? 'text-[#B45309]'
                                      : 'text-[#15803D]'
                                  }`}
                                >
                                  {expInfo.label}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                }}
                                className="inline-flex items-center gap-1.5 text-[#3795AE] hover:text-[#2B7E94] font-semibold text-xs py-1.5 px-2.5 rounded-lg bg-[#3795AE]/8 hover:bg-[#3795AE]/15 transition-colors cursor-pointer"
                              >
                                <Calendar size={14} />
                                <span>Informar data</span>
                              </button>
                            )}
                          </td>

                          <td className="py-4 px-4 text-[13px]">
                            <div className="text-[#14181F] font-medium">
                              {item.batchNumber ? `Lote ${item.batchNumber}` : 'Sem lote'}
                            </div>
                            <div className="text-xs text-[#647082] mt-0.5">
                              {item.location || 'Local geral'}
                            </div>
                          </td>

                          {/* Large, Easy-to-Tap Stock Controls */}
                          <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => onAddStock(item.id, -1)}
                                disabled={item.stock <= 0}
                                className="w-9 h-9 rounded-xl bg-[#F1F4F7] hover:bg-[#E6EAF0] text-[#14181F] flex items-center justify-center font-semibold text-base disabled:opacity-35 cursor-pointer transition-colors"
                                title="Retirar 1 unidade"
                              >
                                −
                              </button>
                              <div className="min-w-[74px] text-center">
                                <span className={`font-semibold text-base tabular-nums ${isLowStock ? 'text-[#EA580C]' : 'text-[#14181F]'}`}>
                                  {item.stock}
                                </span>
                                <span className="text-xs text-[#647082] ml-1">{item.unit}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onAddStock(item.id, 1)}
                                className="w-9 h-9 rounded-xl bg-[#3795AE]/12 hover:bg-[#3795AE]/20 text-[#1F6F85] flex items-center justify-center font-semibold text-base cursor-pointer transition-colors"
                                title="Adicionar 1 unidade"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-xs text-[#94A0B2] mt-1 tabular-nums">
                              Mínimo: {item.minStock}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="font-semibold text-[#14181F] tabular-nums">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-[#647082] tabular-nums">
                              Total R$ {(item.stock * item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          <td className="py-4 px-5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="h-9 px-3 text-[#4B5563] hover:text-[#3795AE] hover:bg-[#3795AE]/10 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Editar dados e validade"
                              >
                                <Edit3 size={14} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickLaunchExpenseFromStock(item)}
                                className="w-9 h-9 text-[#4B5563] hover:text-[#15803D] hover:bg-[#ECFDF5] rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                title="Lançar reposição nas compras"
                              >
                                <ShoppingBag size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(item.id, item.name)}
                                className="w-9 h-9 text-[#94A0B2] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                title="Excluir produto"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: LANÇAMENTO DE COMPRAS & DESPESAS (TRADICIONAL) */}
      {/* ========================================================= */}
      {activeSubTab === 'compras' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Month Selector Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Lançamentos Financeiros de Materiais</h3>
              <p className="text-xs text-gray-500 font-medium">Selecione o mês para visualizar e registrar despesas com insumos.</p>
            </div>

            <div className="flex items-center bg-white border border-[#E6EAF0] px-3 py-1.5 rounded-xl select-none">
              <button 
                onClick={handlePrevMonth}
                className="text-[#647082] hover:text-[#14181F] p-2 rounded-lg hover:bg-[#F1F4F7] transition-colors cursor-pointer"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-[#14181F] px-4 min-w-[150px] text-center">
                {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </span>
              <button 
                onClick={handleNextMonth}
                className="text-[#647082] hover:text-[#14181F] p-2 rounded-lg hover:bg-[#F1F4F7] transition-colors cursor-pointer"
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Lançar Compra Form Box */}
          <div className="bg-white border border-[#E6EAF0] p-6 rounded-2xl space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#14181F]">Registrar nova compra de materiais</h3>
              <p className="text-sm text-[#647082] mt-0.5">Preencha os campos abaixo e clique em Lançar.</p>
            </div>
            <form onSubmit={handleLaunchPurchase} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              {/* Data Input */}
              <div className="lg:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-[#374151]">Data</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="01/07/2026"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full min-h-[44px] bg-white border border-[#D9E0E8] hover:border-[#94A3B8] rounded-xl py-2.5 pl-3.5 pr-10 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                  />
                  <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>

              {/* Item Input */}
              <div className="lg:col-span-3 space-y-1.5">
                <label className="block text-sm font-medium text-[#374151]">Produto comprado</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resina composta, luvas..."
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-[#D9E0E8] hover:border-[#94A3B8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>

              {/* Valor (R$) Input */}
              <div className="lg:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-[#374151]">Valor (R$)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-[#D9E0E8] hover:border-[#94A3B8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>

              {/* Fornecedor Input */}
              <div className="lg:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-[#374151]">Fornecedor</label>
                <input
                  type="text"
                  placeholder="Ex: Dental Cremer"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-[#D9E0E8] hover:border-[#94A3B8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all"
                />
              </div>

              {/* Categoria Selection */}
              <div className="lg:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-[#374151]">Categoria</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-[#D9E0E8] hover:border-[#94A3B8] rounded-xl py-2.5 px-3 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 transition-all cursor-pointer"
                >
                  <option value="Descartáveis">Descartáveis</option>
                  <option value="Consumíveis">Consumíveis</option>
                  <option value="Anestésicos">Anestésicos</option>
                  <option value="Ortodontia">Ortodontia</option>
                  <option value="Cirúrgico">Cirúrgico</option>
                  <option value="Estética">Estética</option>
                </select>
              </div>

              {/* Launch Button */}
              <div className="lg:col-span-1">
                <button
                  type="submit"
                  className="w-full min-h-[44px] bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Lançar
                </button>
              </div>
            </form>
          </div>

          {/* Columns Grid: Compras List vs category charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (List of Compras) */}
            <div className="lg:col-span-2 bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#EEF2F6]">
                <h3 className="font-display text-base font-semibold text-[#14181F]">
                  Compras de {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
                </h3>
                <span className="text-sm font-semibold text-[#1F6F85] tabular-nums">
                  Total do mês: R$ {totalMonthlySum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {monthlyPurchases.length === 0 ? (
                <div className="text-center py-12 space-y-1.5">
                  <h4 className="font-semibold text-base text-[#14181F]">Nenhuma compra registrada neste mês</h4>
                  <p className="text-sm text-[#647082]">Use o formulário acima para lançar a primeira compra de materiais.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#E6EAF0] font-medium text-[#647082] text-xs">
                        <th className="py-3 px-2 text-center w-10">
                          <input
                            type="checkbox"
                            checked={monthlyPurchases.length > 0 && selectedPurchaseIds.length === monthlyPurchases.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPurchaseIds(monthlyPurchases.map(p => p.id));
                              } else {
                                setSelectedPurchaseIds([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CBD5E1] text-[#3795AE] focus:ring-[#3795AE] cursor-pointer"
                            title="Selecionar todos os lançamentos"
                          />
                        </th>
                        <th className="py-3 px-2.5">Data</th>
                        <th className="py-3 px-2.5">Produto</th>
                        <th className="py-3 px-2.5">Fornecedor</th>
                        <th className="py-3 px-2.5">Categoria</th>
                        <th className="py-3 px-2.5 text-right">Valor</th>
                        <th className="py-3 px-2 text-center">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F4F7] text-sm text-[#14181F]">
                      {monthlyPurchases.map((purchase) => {
                        let displayDate = purchase.date;
                        if (purchase.date.includes('-')) {
                          const parts = purchase.date.split('-');
                          if (parts.length === 3) {
                            displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                        }
                        const isSelected = selectedPurchaseIds.includes(purchase.id);
                        return (
                          <tr 
                            key={purchase.id} 
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPurchaseIds(selectedPurchaseIds.filter(id => id !== purchase.id));
                              } else {
                                setSelectedPurchaseIds([...selectedPurchaseIds, purchase.id]);
                              }
                            }}
                            className={`hover:bg-[#F7F9FB] transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#3795AE]/8' : ''
                            }`}
                          >
                            <td className="py-3.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPurchaseIds([...selectedPurchaseIds, purchase.id]);
                                  } else {
                                    setSelectedPurchaseIds(selectedPurchaseIds.filter(id => id !== purchase.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-[#CBD5E1] text-[#3795AE] focus:ring-[#3795AE] cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-2.5 text-[#647082] tabular-nums whitespace-nowrap">{displayDate}</td>
                            <td className="py-3.5 px-2.5 font-medium text-[#14181F]">{purchase.description}</td>
                            <td className="py-3.5 px-2.5 text-[#647082]">{purchase.supplier || '—'}</td>
                            <td className="py-3.5 px-2.5 text-[#4B5563]">
                              {purchase.subcategory || 'Descartáveis'}
                            </td>
                            <td className="py-3.5 px-2.5 text-right font-semibold text-[#14181F] tabular-nums whitespace-nowrap">
                              R$ {purchase.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center">
                                <button 
                                  onClick={() => handleDeleteClick(purchase.id)}
                                  className="text-[#94A3B8] hover:text-[#DC2626] p-2 rounded-lg hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                                  title="Excluir lançamento"
                                  aria-label="Excluir lançamento"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {monthlyPurchases.length > 0 && (
                <div className="pt-4 border-t border-[#EEF2F6] flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-[#647082]">
                    {selectedPurchaseIds.length > 0 ? (
                      <span className="text-[#1F6F85] font-semibold">
                        {selectedPurchaseIds.length} de {monthlyPurchases.length} selecionado(s)
                      </span>
                    ) : (
                      <span>Marque os itens acima para enviar direto para o estoque</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleAddToStockSelected}
                      className="min-h-[44px] flex items-center gap-2 bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer no-print"
                      title="Adicionar produtos selecionados ao controle de estoque"
                    >
                      <PackagePlus size={16} />
                      Enviar ao estoque {selectedPurchaseIds.length > 0 ? `(${selectedPurchaseIds.length})` : ''}
                    </button>

                    <button
                      onClick={() => setShowReportModal(true)}
                      className="min-h-[44px] flex items-center gap-2 bg-white hover:bg-[#F1F4F7] border border-[#D9E0E8] text-[#14181F] font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer no-print"
                    >
                      <Printer size={16} className="text-[#3795AE]" />
                      Relatório em PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Category breakdown) */}
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-[#14181F] pb-3 border-b border-[#EEF2F6]">
                Gastos por categoria
              </h3>
              {monthlyPurchases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#647082]">Sem compras neste mês.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(categoryTotals).map(([cat, amount]) => {
                    const percentage = totalMonthlySum > 0 ? (amount / totalMonthlySum) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-[#14181F]">{cat}</span>
                          <span className="text-[#647082] tabular-nums">
                            R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#EEF2F6] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#3795AE] rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CADASTRAR NOVO PRODUTO COM REGISTRO DE VALIDADE  */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-[#E6EAF0] my-8"
            >
              <div className="flex justify-between items-center bg-[#F7F9FB] border-b border-[#E6EAF0] px-6 py-4">
                <div className="flex items-center gap-2.5 text-[#14181F]">
                  <PackagePlus size={20} className="text-[#3795AE]" />
                  <h3 className="font-display text-base font-semibold">Cadastrar novo produto</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-[#647082] hover:text-[#14181F] rounded-xl hover:bg-white cursor-pointer"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNewItem} className="p-6 space-y-4">
                {/* Nome do Produto */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#374151]">Nome do produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Anestésico Mepivacaína 3%"
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                    className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Categoria *</label>
                    <select
                      value={newItemData.category}
                      onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    >
                      <option value="Consumíveis">Consumíveis</option>
                      <option value="Anestésicos">Anestésicos</option>
                      <option value="Descartáveis">Descartáveis</option>
                      <option value="Instrumentos">Instrumentos</option>
                      <option value="Agulhas">Agulhas</option>
                      <option value="Ortodontia">Ortodontia</option>
                      <option value="Cirúrgico">Cirúrgico</option>
                      <option value="Estética">Estética</option>
                    </select>
                  </div>

                  {/* Validade */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Data de validade</label>
                    <input
                      type="date"
                      value={newItemData.expirationDate}
                      onChange={(e) => setNewItemData({ ...newItemData, expirationDate: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Número do lote</label>
                    <input
                      type="text"
                      placeholder="Ex: L-2026-99"
                      value={newItemData.batchNumber}
                      onChange={(e) => setNewItemData({ ...newItemData, batchNumber: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Onde fica guardado</label>
                    <input
                      type="text"
                      placeholder="Ex: Gaveta A2 ou Geladeira"
                      value={newItemData.location}
                      onChange={(e) => setNewItemData({ ...newItemData, location: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Quantidade atual</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemData.stock}
                      onChange={(e) => setNewItemData({ ...newItemData, stock: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Mínimo para aviso</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemData.minStock}
                      onChange={(e) => setNewItemData({ ...newItemData, minStock: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Unidade</label>
                    <input
                      type="text"
                      placeholder="Ex: caixas, tubetes"
                      value={newItemData.unit}
                      onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Preço por unidade (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItemData.price}
                      onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Fornecedor</label>
                    <input
                      type="text"
                      placeholder="Ex: Dental Cremer"
                      value={newItemData.supplier}
                      onChange={(e) => setNewItemData({ ...newItemData, supplier: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 flex justify-end gap-3 border-t border-[#EEF2F6]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="min-h-[44px] px-5 py-2.5 bg-white border border-[#D9E0E8] hover:bg-[#F7F9FB] text-[#374151] text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-6 py-2.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Salvar produto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: EDITAR PRODUTO / ATUALIZAR REGISTRO DE VALIDADE */}
      {/* ========================================================= */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-[#E6EAF0] my-8"
            >
              <div className="flex justify-between items-center bg-[#F7F9FB] border-b border-[#E6EAF0] px-6 py-4">
                <div className="flex items-center gap-2.5 text-[#14181F]">
                  <Edit3 size={20} className="text-[#3795AE]" />
                  <h3 className="font-display text-base font-semibold">Editar produto e validade</h3>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-2 text-[#647082] hover:text-[#14181F] rounded-xl hover:bg-white cursor-pointer"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveItemEdit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#374151]">Nome do produto</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Categoria</label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    >
                      <option value="Consumíveis">Consumíveis</option>
                      <option value="Anestésicos">Anestésicos</option>
                      <option value="Descartáveis">Descartáveis</option>
                      <option value="Instrumentos">Instrumentos</option>
                      <option value="Agulhas">Agulhas</option>
                      <option value="Ortodontia">Ortodontia</option>
                      <option value="Cirúrgico">Cirúrgico</option>
                      <option value="Estética">Estética</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#1F6F85]">Data de validade</label>
                    <input
                      type="date"
                      value={editingItem.expirationDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, expirationDate: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#3795AE]/40 rounded-xl py-2.5 px-3.5 text-sm font-medium text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Número do lote</label>
                    <input
                      type="text"
                      value={editingItem.batchNumber || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, batchNumber: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Onde fica guardado</label>
                    <input
                      type="text"
                      value={editingItem.location || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Quantidade atual</label>
                    <input
                      type="number"
                      min="0"
                      value={editingItem.stock}
                      onChange={(e) => setEditingItem({ ...editingItem, stock: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Mínimo para aviso</label>
                    <input
                      type="number"
                      min="0"
                      value={editingItem.minStock}
                      onChange={(e) => setEditingItem({ ...editingItem, minStock: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Unidade</label>
                    <input
                      type="text"
                      value={editingItem.unit}
                      onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Preço por unidade (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] tabular-nums focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[#374151]">Fornecedor</label>
                    <input
                      type="text"
                      value={editingItem.supplier || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                      className="w-full min-h-[44px] bg-white border border-[#D9E0E8] rounded-xl py-2.5 px-3.5 text-sm text-[#14181F] focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 flex justify-end gap-3 border-t border-[#EEF2F6]">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="min-h-[44px] px-5 py-2.5 bg-white border border-[#D9E0E8] hover:bg-[#F7F9FB] text-[#374151] text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-6 py-2.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Salvar alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL PRINTABLE REPORT FOR COMPRAS (REQUIREMENT)         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 border border-gray-200"
            >
              <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200/60 px-6 py-4">
                <div className="flex items-center gap-2 text-[#2d8096]">
                  <FileText size={18} />
                  <span className="text-xs font-extrabold uppercase tracking-wider">Visualização do Relatório de Compras</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadReportPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-1.5 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        Baixar PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openPrintWindow('printable-report', 'Relatório de Compras - Seja Mais Odontologia')}
                    className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                    title="Imprimir no navegador"
                  >
                    <Printer size={13} />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] bg-white print-container" id="printable-report">
                <div className="space-y-8 max-w-3xl mx-auto">
                  
                  {/* Clinic Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-gray-800 pb-6 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <ClinicLogo className="w-10 h-10 shrink-0" />
                        <span className="text-xl font-black text-gray-900 tracking-tight">Seja Mais Odontologia</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        Rua Vergueiro, 1200 • Paraíso, São Paulo - SP • CEP 01504-001
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        CNPJ: 44.245.543/0001-44 • Telefone: (11) 5575-9000
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">
                        Relatório de Compras
                      </h2>
                      <p className="text-[11px] text-gray-500 font-bold mt-1">
                        Período: {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>

                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Investido</span>
                      <span className="text-lg font-bold text-gray-900 block mt-1">
                        R$ {totalMonthlySum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Lançamentos</span>
                      <span className="text-lg font-bold text-gray-900 block mt-1">
                        {monthlyPurchases.length} itens
                      </span>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl col-span-2">
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Maior Despesa</span>
                      <span className="text-xs font-bold text-gray-800 block mt-1 truncate">
                        {monthlyPurchases.length > 0 
                          ? `${[...monthlyPurchases].sort((a,b) => b.value - a.value)[0].description} (R$ ${[...monthlyPurchases].sort((a,b) => b.value - a.value)[0].value.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`
                          : 'Nenhum'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Purchases Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest pl-2 border-l-2 border-[#3795AE]">
                      Detalhamento dos Itens Comprados
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-[9px]">
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 px-3">Material</th>
                            <th className="py-2.5 px-3">Categoria</th>
                            <th className="py-2.5 px-3">Fornecedor</th>
                            <th className="py-2.5 px-3 text-right">Valor Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                          {monthlyPurchases.map((p) => {
                            let displayDate = p.date;
                            if (p.date.includes('-')) {
                              const parts = p.date.split('-');
                              if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                            return (
                              <tr key={p.id}>
                                <td className="py-3 px-3 font-mono text-gray-500 whitespace-nowrap">{displayDate}</td>
                                <td className="py-3 px-3 font-semibold text-gray-950">{p.description}</td>
                                <td className="py-3 px-3 text-gray-600">{p.subcategory || 'Descartáveis'}</td>
                                <td className="py-3 px-3 text-gray-600">{p.supplier || 'N/A'}</td>
                                <td className="py-3 px-3 text-right font-semibold text-gray-950">
                                  R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-bold border-t border-gray-200">
                            <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-[10px] text-gray-600">Total do Período:</td>
                            <td className="py-3 px-3 text-right text-xs text-gray-950">
                              R$ {totalMonthlySum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Category Breakdown list */}
                  <div className="space-y-3 bg-gray-50 border border-gray-100 rounded-xl p-5">
                    <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-widest">
                      Resumo Consolidado por Subcategoria
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {Object.entries(categoryTotals).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between items-center py-1 border-b border-gray-200/60 font-medium">
                          <span className="text-gray-600">{cat}</span>
                          <span className="font-bold text-gray-900">
                            R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signatures Footer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 text-center">
                    <div className="space-y-1 md:col-start-2">
                      <div className="border-t border-gray-900 w-64 mx-auto pt-2">
                        <p className="text-xs font-extrabold text-gray-900">Responsável pela Gestão</p>
                        <p className="text-[10px] text-gray-500 font-semibold">Diretora Técnica • CRO-SP 98765</p>
                        <p className="text-[10px] text-gray-400 font-medium">Seja Mais Odontologia Ltda.</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
