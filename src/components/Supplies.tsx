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
  userRole: 'gerente' | 'funcionario' | null;
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

  // Date State - Defaults to July 2026 as per the requested mockup
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // 0-indexed month, 6 is July
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Form Inputs State (Lançar Compra)
  const [formDate, setFormDate] = useState('01/07/2026');
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
        alert("Nenhuma compra registrada neste mês para adicionar ao estoque.");
        return;
      }
      const confirmAddAll = window.confirm(
        "Nenhum produto foi selecionado especificamente. Deseja adicionar TODOS os produtos comprados neste mês ao Estoque?"
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
      `📦 ${totalProcessed} produto(s) adicionado(s) ao Estoque! Clique no produto para registrar/editar a data de validade.`
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
    <div className="space-y-6 max-w-[1400px] mx-auto w-full font-sans select-none pb-12">
      
      {/* Dynamic Success Notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#3795AE]/10 border border-[#3795AE] text-[#2d8096] text-sm font-bold p-4 rounded-xl flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#3795AE]" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-[#2d8096] hover:opacity-75">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Area with Sub-Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-[#EBEBED]">
        <div>
          <h2 className="text-[17px] font-semibold text-[#18181B] tracking-tight flex items-center gap-2">
            Compras e estoque
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Gestão de suprimentos, registro de validade de produtos e compras da clínica.
          </p>
        </div>

        {/* Sub-Tab Selector Toggle */}
        <div className="flex items-center bg-[#F4F4F6] p-1 rounded-xl border border-[#EBEBED] w-full sm:w-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('estoque')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'estoque'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            <Boxes size={15} className={activeSubTab === 'estoque' ? 'text-[#3795AE]' : ''} />
            <span>Estoque</span>
            <span className="hidden sm:inline">de materiais</span>
            {(expiredCount > 0 || expiringSoonCount > 0) && (
              <span className="bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums">
                {expiredCount + expiringSoonCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('compras')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'compras'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            <ShoppingBag size={15} className={activeSubTab === 'compras' ? 'text-[#3795AE]' : ''} />
            <span>Compras</span>
            <span className="hidden sm:inline">realizadas</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: ESTOQUE DE MATERIAIS & REGISTRO DE VALIDADE   */}
      {/* ========================================================= */}
      {activeSubTab === 'estoque' && (
        <div className="space-y-6 animate-fade-in">

          {/* High Priority Expiration Alert Banner */}
          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-[#FDE68A] text-[#D97706] rounded-xl shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-[#92400E]">
                    Alerta de controle sanitário e validade
                  </h4>
                  <p className="text-xs text-[#92400E]/90 mt-0.5">
                    {expiredCount > 0 && <span className="font-semibold text-[#DC2626]">{expiredCount} produto(s) vencido(s)</span>}
                    {expiredCount > 0 && expiringSoonCount > 0 && ' e '}
                    {expiringSoonCount > 0 && <span className="font-semibold text-[#B45309]">{expiringSoonCount} produto(s) com validade nos próximos 30-60 dias</span>}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExpirationFilter('vencidos')}
                className="bg-white hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                Filtrar vencidos
              </button>
            </div>
          )}

          {/* Top Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Items SKU */}
            <div className="bg-white p-5 rounded-2xl border border-[#EBEBED] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#71717A]">Produtos em estoque</span>
                <div className="w-7 h-7 rounded-lg bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center">
                  <Boxes size={15} />
                </div>
              </div>
              <div className="text-[26px] font-bold text-[#18181B] tracking-tight tabular-nums leading-none">
                {supplies.length} <span className="text-xs font-medium text-[#71717A]">SKUs</span>
              </div>
              <p className="text-[11px] text-[#71717A] tabular-nums">
                Valor total: R$ {supplies.reduce((acc, i) => acc + (i.stock * i.price), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Vencidos (Expired) */}
            <div className={`p-5 rounded-2xl border bg-white space-y-2 ${
              expiredCount > 0 ? 'border-[#FECACA]' : 'border-[#EBEBED]'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#71717A]">Produtos vencidos</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  expiredCount > 0 ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F4F4F6] text-[#A1A1AA]'
                }`}>
                  <AlertTriangle size={15} />
                </div>
              </div>
              <div className={`text-[26px] font-bold tracking-tight tabular-nums leading-none ${
                expiredCount > 0 ? 'text-[#DC2626]' : 'text-[#18181B]'
              }`}>
                {expiredCount} <span className="text-xs font-medium text-[#71717A]">itens</span>
              </div>
              <p className="text-[11px] text-[#71717A]">
                {expiredCount > 0 ? 'Requer descarte imediato' : 'Nenhum produto vencido'}
              </p>
            </div>

            {/* A Vencer (Expiring Soon) */}
            <div className={`p-5 rounded-2xl border bg-white space-y-2 ${
              expiringSoonCount > 0 ? 'border-[#FDE68A]' : 'border-[#EBEBED]'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#71717A]">A vencer (≤ 60 dias)</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  expiringSoonCount > 0 ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#F4F4F6] text-[#A1A1AA]'
                }`}>
                  <Clock size={15} />
                </div>
              </div>
              <div className={`text-[26px] font-bold tracking-tight tabular-nums leading-none ${
                expiringSoonCount > 0 ? 'text-[#D97706]' : 'text-[#18181B]'
              }`}>
                {expiringSoonCount} <span className="text-xs font-medium text-[#71717A]">itens</span>
              </div>
              <p className="text-[11px] text-[#71717A]">
                {expiringSoonCount > 0 ? 'Priorizar utilização nos atendimentos' : 'Sem alertas de validade'}
              </p>
            </div>

            {/* Estoque Crítico (Low Stock) */}
            <div className={`p-5 rounded-2xl border bg-white space-y-2 ${
              lowStockCount > 0 ? 'border-[#FED7AA]' : 'border-[#EBEBED]'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#71717A]">Estoque crítico</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  lowStockCount > 0 ? 'bg-[#FFF7ED] text-[#EA580C]' : 'bg-[#F4F4F6] text-[#A1A1AA]'
                }`}>
                  <PackageCheck size={15} />
                </div>
              </div>
              <div className={`text-[26px] font-bold tracking-tight tabular-nums leading-none ${
                lowStockCount > 0 ? 'text-[#EA580C]' : 'text-[#18181B]'
              }`}>
                {lowStockCount} <span className="text-xs font-medium text-[#71717A]">abaixo do mínimo</span>
              </div>
              <p className="text-[11px] text-[#71717A]">
                {lowStockCount > 0 ? 'Aguardando novas compras' : 'Estoque em quantidade ideal'}
              </p>
            </div>

          </div>

          {/* Filters, Search and Actions Bar */}
          <div className="bg-white border border-[#EBEBED] p-4 rounded-2xl space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              
              {/* Search Bar */}
              <div className="relative w-full lg:w-96">
                <Search size={15} className="absolute left-3.5 top-2.5 text-[#A1A1AA] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar produto, nº lote, armário ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-[#EBEBED] hover:border-[#D4D4D8] rounded-xl py-2 pl-10 pr-4 text-xs text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:bg-white focus:border-[#3795AE] transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-[#A1A1AA] hover:text-[#18181B]">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Action: Add Product */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full lg:w-auto flex items-center justify-center gap-2 bg-[#3795AE] hover:bg-[#2d8096] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Cadastrar produto com validade</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Filter size={12} /> Filtros:
              </span>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3795AE]"
              >
                <option value="Todas">Todas as Categorias</option>
                <option value="Consumíveis">Consumíveis</option>
                <option value="Anestésicos">Anestésicos</option>
                <option value="Descartáveis">Descartáveis</option>
                <option value="Instrumentos">Instrumentos</option>
                <option value="Agulhas">Agulhas</option>
                <option value="Ortodontia">Ortodontia</option>
                <option value="Cirúrgico">Cirúrgico</option>
                <option value="Estética">Estética</option>
              </select>

              {/* Expiration Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setExpirationFilter('todos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    expirationFilter === 'todos' ? 'bg-[#3795AE] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Validade: Todas
                </button>
                <button
                  onClick={() => setExpirationFilter('vencidos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    expirationFilter === 'vencidos' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  🚨 Vencidos ({expiredCount})
                </button>
                <button
                  onClick={() => setExpirationFilter('a_vencer')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    expirationFilter === 'a_vencer' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  ⚠️ A Vencer ({expiringSoonCount})
                </button>
                <button
                  onClick={() => setExpirationFilter('ok')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    expirationFilter === 'ok' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  ✅ Válidos
                </button>
              </div>

              {/* Stock Filter */}
              <button
                onClick={() => setStockFilter(prev => prev === 'baixo' ? 'todos' : 'baixo')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ml-auto ${
                  stockFilter === 'baixo' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                ⚠️ Apenas Estoque Baixo ({lowStockCount})
              </button>
            </div>
          </div>

          {/* Main Inventory Table */}
          <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden shadow-2xs">
            {filteredSupplies.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Boxes size={40} className="mx-auto text-gray-300" />
                <h4 className="font-semibold text-sm text-gray-800">Nenhum produto encontrado</h4>
                <p className="text-xs text-gray-400 font-medium">Tente ajustar seus filtros de busca ou cadastre um novo material.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Produto & Categoria</th>
                      <th className="py-3.5 px-3">Registro de Validade</th>
                      <th className="py-3.5 px-3">Lote & Fornecedor</th>
                      <th className="py-3.5 px-3">Localização</th>
                      <th className="py-3.5 px-3 text-center">Qtd. / Mínimo</th>
                      <th className="py-3.5 px-3 text-right">Preço Un.</th>
                      <th className="py-3.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {filteredSupplies.map(item => {
                      const expInfo = getExpirationInfo(item.expirationDate);
                      const isLowStock = item.stock <= item.minStock;

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setEditingItem(item)}
                          className="hover:bg-[#3795AE]/5 transition-colors cursor-pointer group"
                          title="Clique em qualquer lugar da linha para editar ou informar a validade"
                        >
                          
                          {/* Item Name & Category */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900 text-xs group-hover:text-[#2d8096] transition-colors">{item.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                {item.category}
                              </span>
                              {isLowStock && (
                                <span className="bg-orange-100 text-orange-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                                  Estoque Mínimo
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Expiration Date Registration Column */}
                          <td className="py-3.5 px-3">
                            {item.expirationDate ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-800">
                                  <Calendar size={13} className="text-[#2d8096]" />
                                  <span>{item.expirationDate.split('-').reverse().join('/')}</span>
                                  <Edit3 size={11} className="text-gray-400 group-hover:text-[#2d8096] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                {expInfo.status === 'vencido' && (
                                  <span className="inline-flex items-center gap-1 bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <AlertTriangle size={11} /> {expInfo.label}
                                  </span>
                                )}

                                {['a_vencer', 'a_vencer_60'].includes(expInfo.status) && (
                                  <span className="inline-flex items-center gap-1 bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <Clock size={11} /> {expInfo.label}
                                  </span>
                                )}

                                {expInfo.status === 'ok' && (
                                  <span className="inline-flex items-center gap-1 bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <CheckCircle2 size={11} /> Validade OK
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                }}
                                className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                title="Clique para cadastrar a data de validade"
                              >
                                <Calendar size={13} className="text-amber-600 shrink-0" />
                                <span>+ Inserir Validade</span>
                              </button>
                            )}
                          </td>

                          {/* Batch & Supplier */}
                          <td className="py-3.5 px-3">
                            <div className="text-xs text-gray-800 font-medium">
                              {item.batchNumber ? (
                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                                  Lote: {item.batchNumber}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[11px]">N/I</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                              <Building2 size={11} className="text-gray-400" />
                              {item.supplier || 'Fornecedor não informado'}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-3 text-xs text-gray-600">
                            {item.location ? (
                              <div className="flex items-center gap-1 font-medium">
                                <MapPin size={12} className="text-[#3795AE] shrink-0" />
                                <span>{item.location}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Geral</span>
                            )}
                          </td>

                          {/* Stock Controls */}
                          <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onAddStock(item.id, -1)}
                                disabled={item.stock <= 0}
                                className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 cursor-pointer"
                                title="Subtrair 1 un"
                              >
                                -
                              </button>
                              <span className={`font-mono text-sm font-bold ${
                                isLowStock ? 'text-orange-600' : 'text-gray-900'
                              }`}>
                                {item.stock} <span className="text-[10px] font-normal text-gray-500">{item.unit}</span>
                              </span>
                              <button
                                onClick={() => onAddStock(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-[#3795AE]/10 hover:bg-[#3795AE]/20 text-[#2d8096] flex items-center justify-center font-bold text-xs cursor-pointer"
                                title="Adicionar 1 un"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                              Mínimo: {item.minStock} {item.unit}
                            </div>
                          </td>

                          {/* Unit Price & Total */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="font-mono font-bold text-gray-800">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400">
                              Total: R$ {(item.stock * item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              
                              {/* Edit Modal Button */}
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1.5 text-gray-500 hover:text-[#2d8096] hover:bg-[#3795AE]/10 rounded-lg transition-colors cursor-pointer"
                                title="Editar validade, lote e dados do produto"
                              >
                                <Edit3 size={14} />
                              </button>

                              {/* Quick Expense Launch */}
                              <button
                                onClick={() => handleQuickLaunchExpenseFromStock(item)}
                                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Lançar compra de reposição no financeiro"
                              >
                                <ShoppingBag size={14} />
                              </button>

                              {/* Delete Product */}
                              <button
                                onClick={() => handleDeleteProduct(item.id, item.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir produto do estoque"
                              >
                                <Trash2 size={14} />
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

            <div className="flex items-center bg-white border border-gray-200 px-4 py-2 rounded-full shadow-2xs select-none">
              <button 
                onClick={handlePrevMonth}
                className="text-gray-400 hover:text-gray-800 p-1 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-gray-800 px-4 min-w-[120px] text-center">
                {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </span>
              <button 
                onClick={handleNextMonth}
                className="text-gray-400 hover:text-gray-800 p-1 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Lançar Compra Form Box */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 pl-1">Lançar compra de materiais</h3>
            <div className="bg-white border border-gray-200/60 p-5 rounded-2xl shadow-2xs">
              <form onSubmit={handleLaunchPurchase} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                
                {/* Data Input */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500 pl-0.5">Data</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="01/07/2026"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 pl-3 pr-10 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3795AE] transition-all"
                    />
                    <Calendar size={14} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Item Input */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500 pl-0.5">Item / Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Resina composta Z350"
                    value={formItem}
                    onChange={(e) => setFormItem(e.target.value)}
                    className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 px-3.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3795AE] transition-all"
                  />
                </div>

                {/* Valor (R$) Input */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500 pl-0.5">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 px-3.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3795AE] transition-all text-left"
                  />
                </div>

                {/* Fornecedor Input */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500 pl-0.5">Fornecedor</label>
                  <input
                    type="text"
                    placeholder="Ex: Dental Cremer"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 px-3.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3795AE] transition-all"
                  />
                </div>

                {/* Categoria Selection */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500 pl-0.5">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 px-3 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3795AE] transition-all cursor-pointer"
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
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full bg-[#2d8096] hover:bg-[#23677a] text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                  >
                    Lançar
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Columns Grid: Compras List vs category charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (List of Compras) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-baseline justify-between pl-1">
                <h3 className="text-sm font-semibold text-gray-800">
                  Compras de {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
                </h3>
                <span className="text-xs font-bold text-[#2d8096]">
                  Total do Mês: R$ {totalMonthlySum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 min-h-[300px] flex flex-col justify-center">
                {monthlyPurchases.length === 0 ? (
                  <div className="text-center py-12 space-y-1.5">
                    <h4 className="font-semibold text-sm text-gray-800">Nenhuma compra lançada neste mês</h4>
                    <p className="text-xs text-gray-400 font-medium">Use o formulário acima para registrar a primeira compra.</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 font-semibold text-gray-400 uppercase tracking-wider text-[10px] pb-2">
                          <th className="py-2.5 px-2 text-center w-8">
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
                              className="rounded border-gray-300 text-[#2d8096] focus:ring-[#3795AE] cursor-pointer"
                              title="Selecionar todos os lançamentos"
                            />
                          </th>
                          <th className="py-2.5 px-2">Data</th>
                          <th className="py-2.5 px-2">Item / Produto</th>
                          <th className="py-2.5 px-2">Fornecedor</th>
                          <th className="py-2.5 px-2">Categoria</th>
                          <th className="py-2.5 px-2 text-right">Valor</th>
                          <th className="py-2.5 px-2 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
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
                              className={`hover:bg-[#3795AE]/5 transition-colors cursor-pointer ${
                                isSelected ? 'bg-[#3795AE]/10 font-semibold' : ''
                              }`}
                            >
                              <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
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
                                  className="rounded border-gray-300 text-[#2d8096] focus:ring-[#3795AE] cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-2 font-mono text-gray-500 whitespace-nowrap">{displayDate}</td>
                              <td className="py-3 px-2 font-semibold text-gray-800">{purchase.description}</td>
                              <td className="py-3 px-2 text-gray-500">{purchase.supplier || 'Opcional'}</td>
                              <td className="py-3 px-2">
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                  {purchase.subcategory || 'Descartáveis'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-semibold text-gray-800">
                                R$ {purchase.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center">
                                  <button 
                                    onClick={() => handleDeleteClick(purchase.id)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Excluir lançamento"
                                  >
                                    <Trash2 size={13} />
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
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                      {selectedPurchaseIds.length > 0 ? (
                        <span className="bg-[#3795AE]/10 text-[#2d8096] font-bold px-2.5 py-1 rounded-lg border border-[#3795AE]/20">
                          ✓ {selectedPurchaseIds.length} de {monthlyPurchases.length} selecionado(s)
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Selecione os produtos para adicionar ao estoque
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddToStockSelected}
                        className="flex items-center gap-2 bg-[#2d8096] hover:bg-[#23677a] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] no-print"
                        title="Adicionar produtos selecionados ao Controle de Estoque"
                      >
                        <PackagePlus size={15} />
                        Adicionar ao estoque {selectedPurchaseIds.length > 0 ? `(${selectedPurchaseIds.length})` : ''}
                      </button>

                      <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-2 bg-[#3795AE]/10 hover:bg-[#3795AE]/20 text-[#2d8096] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer no-print"
                      >
                        <Printer size={14} />
                        Gerar Relatório de Compras
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (Category breakdown charts) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800 pl-1">Por subcategoria</h3>
              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 min-h-[300px] flex flex-col justify-center">
                {monthlyPurchases.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-gray-400 font-medium">Sem lançamentos.</p>
                  </div>
                ) : (
                  <div className="space-y-4 w-full self-start">
                    {Object.entries(categoryTotals).map(([cat, amount]) => {
                      const percentage = totalMonthlySum > 0 ? (amount / totalMonthlySum) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-700">{cat}</span>
                            <span className="font-mono text-gray-500">
                              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#3795AE] rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CADASTRAR NOVO PRODUTO COM REGISTRO DE VALIDADE  */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 my-8"
            >
              <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-2 text-[#2d8096]">
                  <PackagePlus size={20} />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Cadastrar Produto no Estoque</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNewItem} className="p-6 space-y-4">
                
                {/* Nome do Produto */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Nome do Produto / Material *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Anestésico Mepivacaína 3%"
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Categoria *</label>
                    <select
                      value={newItemData.category}
                      onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
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

                  {/* REGISTRO DE VALIDADE (Data) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Calendar size={13} className="text-[#3795AE]" />
                      Data de Validade (Registro)
                    </label>
                    <input
                      type="date"
                      value={newItemData.expirationDate}
                      onChange={(e) => setNewItemData({ ...newItemData, expirationDate: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Número do Lote */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Nº do Lote</label>
                    <input
                      type="text"
                      placeholder="Ex: L-2026-99"
                      value={newItemData.batchNumber}
                      onChange={(e) => setNewItemData({ ...newItemData, batchNumber: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Localização / Armário */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Armário / Local de Estoque</label>
                    <input
                      type="text"
                      placeholder="Ex: Gaveta A2 / Geladeira"
                      value={newItemData.location}
                      onChange={(e) => setNewItemData({ ...newItemData, location: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quantidade Inicial */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Qtd. Inicial</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemData.stock}
                      onChange={(e) => setNewItemData({ ...newItemData, stock: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Estoque Mínimo */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Estoque Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={newItemData.minStock}
                      onChange={(e) => setNewItemData({ ...newItemData, minStock: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Unidade */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Unidade</label>
                    <input
                      type="text"
                      placeholder="Ex: caixas, tubetes"
                      value={newItemData.unit}
                      onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preço Unitário */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Preço Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItemData.price}
                      onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Fornecedor */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Fornecedor Principal</label>
                    <input
                      type="text"
                      placeholder="Ex: Dental Cremer"
                      value={newItemData.supplier}
                      onChange={(e) => setNewItemData({ ...newItemData, supplier: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    Salvar Produto
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 my-8"
            >
              <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-2 text-[#2d8096]">
                  <Edit3 size={20} />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Editar Produto e Registro de Validade</h3>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveItemEdit} className="p-6 space-y-4">
                
                {/* Nome do Produto */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Categoria</label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
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

                  {/* REGISTRO DE VALIDADE */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#2d8096] flex items-center gap-1">
                      <Calendar size={13} />
                      Data de Validade (Registro)
                    </label>
                    <input
                      type="date"
                      value={editingItem.expirationDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, expirationDate: e.target.value })}
                      className="w-full bg-white border border-[#3795AE]/40 rounded-xl py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nº do Lote */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Nº do Lote</label>
                    <input
                      type="text"
                      value={editingItem.batchNumber || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, batchNumber: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Armário / Localização */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Armário / Local de Estoque</label>
                    <input
                      type="text"
                      value={editingItem.location || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Qtd. Estoque */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Qtd. em Estoque</label>
                    <input
                      type="number"
                      min="0"
                      value={editingItem.stock}
                      onChange={(e) => setEditingItem({ ...editingItem, stock: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Estoque Mínimo */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Estoque Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={editingItem.minStock}
                      onChange={(e) => setEditingItem({ ...editingItem, minStock: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Unidade */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Unidade de Medida</label>
                    <input
                      type="text"
                      value={editingItem.unit}
                      onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preço Unitário */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Preço Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none font-mono"
                    />
                  </div>

                  {/* Fornecedor */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Fornecedor Principal</label>
                    <input
                      type="text"
                      value={editingItem.supplier || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-[#3795AE] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    Salvar Alterações
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
                        <p className="text-xs font-extrabold text-gray-900">Dra. Karen Borba</p>
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
