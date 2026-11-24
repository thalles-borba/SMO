/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Doctor, Transaction } from '../types';
import { 
  Plus, 
  Stethoscope, 
  Target, 
  DollarSign, 
  Mail, 
  ShieldAlert,
  Percent,
  CalendarDays,
  UserCheck,
  TrendingUp,
  Award,
  Users,
  ChevronRight,
  Calculator,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ScheduleView from './ScheduleView';

interface DoctorsProps {
  doctors: Doctor[];
  transactions: Transaction[];
  onUpdateTarget: (id: string, newTarget: number) => void;
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  onAddDoctor: (doc: Omit<Doctor, 'id'>) => void;
  onUpdateDoctorStats: (id: string, stats: { evaluations: number; closures: number; monthlyTarget: number }) => void;
}

export default function Doctors({ 
  doctors, 
  transactions, 
  onUpdateTarget, 
  onAddTransaction,
  onAddDoctor,
  onUpdateDoctorStats
}: DoctorsProps) {
  const [selectedDocId, setSelectedDocId] = useState(doctors[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'escala'>('overview');
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [customProcedure, setCustomProcedure] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Stats direct entry edit states
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [directEvalsInput, setDirectEvalsInput] = useState('');
  const [directClosuresInput, setDirectClosuresInput] = useState('');

  // Add Doctor Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocRole, setNewDocRole] = useState('Doutora / Clinica Geral');
  const [newDocCro, setNewDocCro] = useState('');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocTarget, setNewDocTarget] = useState('15000');
  const [newDocEvaluations, setNewDocEvaluations] = useState('15');
  const [newDocClosures, setNewDocClosures] = useState('8');

  const selectedDoc = doctors.find(d => d.id === selectedDocId) || doctors[0];

  // Calculate doctor-specific total revenue dynamically from transactions
  const getDocRevenueSum = (doc: Doctor) => {
    return transactions
      .filter(t => t.doctorName === doc.name && t.type === 'receita')
      .reduce((sum, t) => sum + t.value, 0);
  };

  const docTransactions = selectedDoc ? transactions.filter(t => t.doctorName === selectedDoc.name && t.type === 'receita') : [];
  const docRevenueSum = selectedDoc ? getDocRevenueSum(selectedDoc) : 0;
  const docTargetPercent = selectedDoc ? Math.round((docRevenueSum / selectedDoc.monthlyTarget) * 100) : 0;

  // Parse evaluations and closures safely
  const docEvaluations = selectedDoc && selectedDoc.evaluations !== undefined ? selectedDoc.evaluations : 0;
  const docClosures = selectedDoc && selectedDoc.closures !== undefined ? selectedDoc.closures : 0;
  const docConversionRate = docEvaluations > 0 ? Math.round((docClosures / docEvaluations) * 100) : 0;

  // Common quick procedures list for fast simulation logging
  const quickProcedures = [
    { name: 'Consulta Inicial Diagnóstica', price: 250, category: 'Consultas' },
    { name: 'Limpeza e Profilaxia', price: 350, category: 'Consultas' },
    { name: 'Clareamento Dental Laser', price: 1500, category: 'Procedimentos' },
    { name: 'Restauração Estética Resina', price: 450, category: 'Procedimentos' },
    { name: 'Tratamento de Canal (Endo)', price: 2000, category: 'Procedimentos' },
    { name: 'Implante de Titânio', price: 6000, category: 'Procedimentos' },
  ];

  const handleUpdateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(targetValue);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateTarget(selectedDoc.id, parsed);
      setEditingTarget(false);
    }
  };

  const handleLogQuickProcedure = (name: string, price: number, cat: any) => {
    onAddTransaction({
      description: name,
      doctorName: selectedDoc.name,
      value: price,
      category: cat,
      type: 'receita'
    });
  };

  const handleCustomProcedureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProcedure || !customPrice) return;
    onAddTransaction({
      description: customProcedure,
      doctorName: selectedDoc.name,
      value: parseFloat(customPrice),
      category: 'Procedimentos',
      type: 'receita'
    });
    setCustomProcedure('');
    setCustomPrice('');
  };

  // Adjust Stats directly (Evaluations and Closures)
  const handleAdjustStats = (key: 'evaluations' | 'closures', delta: number) => {
    const currentEvals = selectedDoc.evaluations !== undefined ? selectedDoc.evaluations : 10;
    const currentClosures = selectedDoc.closures !== undefined ? selectedDoc.closures : 5;

    let updatedEvals = currentEvals;
    let updatedClosures = currentClosures;

    if (key === 'evaluations') {
      updatedEvals = Math.max(0, currentEvals + delta);
      // Ensure closures does not exceed evaluations
      if (updatedClosures > updatedEvals) {
        updatedClosures = updatedEvals;
      }
    } else {
      updatedClosures = Math.max(0, Math.min(currentEvals, currentClosures + delta));
    }

    onUpdateDoctorStats(selectedDoc.id, {
      evaluations: updatedEvals,
      closures: updatedClosures,
      monthlyTarget: selectedDoc.monthlyTarget
    });
  };

  // Handle direct save of stats (evaluations & closures)
  const handleSaveStatsDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const evals = parseInt(directEvalsInput);
    const closures = parseInt(directClosuresInput);
    if (!isNaN(evals) && !isNaN(closures) && evals >= 0 && closures >= 0) {
      onUpdateDoctorStats(selectedDoc.id, {
        evaluations: evals,
        closures: Math.min(evals, closures), // Keep closures <= evaluations
        monthlyTarget: selectedDoc.monthlyTarget
      });
      setIsEditingStats(false);
    }
  };

  const startEditingStats = () => {
    setDirectEvalsInput((selectedDoc.evaluations !== undefined ? selectedDoc.evaluations : 0).toString());
    setDirectClosuresInput((selectedDoc.closures !== undefined ? selectedDoc.closures : 0).toString());
    setIsEditingStats(true);
  };

  // Handle Add Doctor Submit
  const handleAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpecialty.trim()) return;

    // Doctor Avatars Selection List
    const doctorAvatars = [
      'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200'
    ];
    const avatar = doctorAvatars[doctors.length % doctorAvatars.length];

    onAddDoctor({
      name: newDocName,
      avatar,
      role: newDocRole,
      monthlyTarget: parseFloat(newDocTarget) || 15000,
      currentEarnings: 0,
      specialty: newDocSpecialty,
      cro: newDocCro || 'CRO-SP ' + Math.floor(10000 + Math.random() * 90000),
      email: newDocEmail || `${newDocName.toLowerCase().replace(/\s+/g, '.')}@clinica.com`,
      evaluations: parseInt(newDocEvaluations) || 10,
      closures: parseInt(newDocClosures) || 5
    });

    // Reset fields
    setNewDocName('');
    setNewDocSpecialty('');
    setNewDocCro('');
    setNewDocEmail('');
    setNewDocTarget('15000');
    setNewDocEvaluations('15');
    setNewDocClosures('8');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full select-none">
      
      {/* Navigation Sub-Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-level-2 shadow-xs">
        <div className="flex items-center gap-1.5 bg-level-1 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users size={15} />
            <span>Desempenho & Metas</span>
          </button>
          <button
            onClick={() => setActiveTab('escala')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'escala'
                ? 'bg-white text-primary shadow-xs ring-1 ring-primary/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <CalendarDays size={15} />
            <span>Escala dos Consultórios</span>
            <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
              Procedimentos
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Cadastrar Dentista</span>
          </button>
        </div>
      </div>

      {activeTab === 'escala' ? (
        <ScheduleView />
      ) : (
        <>
          {/* Clinician Selector Grid with "Escala" shortcut & "+ Cadastrar" card */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.map((doc) => {
              const isSelected = doc.id === selectedDocId;
              const currentSum = getDocRevenueSum(doc);
              const percent = Math.round((currentSum / doc.monthlyTarget) * 100);

              return (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDocId(doc.id); setEditingTarget(false); }}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer relative overflow-hidden bg-white ${
                    isSelected
                      ? 'border-[#3795AE] ring-2 ring-[#3795AE]/10'
                      : 'border-[#EBEBED] hover:border-[#D4D4D8] text-[#18181B]'
                  }`}
                >
                  <img
                    src={doc.avatar}
                    alt={doc.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-[#EBEBED] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[13.5px] text-[#18181B] truncate">{doc.name}</h4>
                    <p className="text-[11px] text-[#71717A] truncate font-medium mt-0.5">{doc.specialty}</p>
                    
                    {/* Micro goal bar */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#71717A] font-medium tabular-nums">
                      <span className="text-[#18181B] font-semibold">R$ {currentSum.toLocaleString('pt-BR')}</span>
                      <span className={percent < 70 ? 'text-[#D97706] font-semibold' : 'text-[#16A34A] font-semibold'}>{percent}%</span>
                    </div>
                    <div className="w-full bg-[#F4F4F6] h-1.5 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="bg-[#3795AE] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Escala dos Consultórios Action Card */}
            <button
              onClick={() => setActiveTab('escala')}
              className="p-4 rounded-2xl border border-dashed border-[#D4D4D8] hover:border-[#3795AE] bg-[#FAFAFA] hover:bg-white text-[#18181B] transition-all flex items-center justify-center gap-3 cursor-pointer min-h-[88px] group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0 group-hover:bg-[#3795AE]/15 transition-colors">
                <CalendarDays size={17} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-[#18181B]">Escala dos consultórios</p>
                <p className="text-[11px] text-[#71717A] mt-0.5">Ver por sala e procedimento</p>
              </div>
            </button>

            {/* Add Clinician Action Card */}
            <button
              onClick={() => setShowAddModal(true)}
              className="p-4 rounded-2xl border border-dashed border-[#D4D4D8] hover:border-[#3795AE] bg-[#FAFAFA] hover:bg-white text-[#18181B] transition-all flex items-center justify-center gap-3 cursor-pointer min-h-[88px] group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0 group-hover:bg-[#3795AE]/15 transition-colors">
                <UserPlus size={17} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-[#18181B]">Cadastrar dentista</p>
                <p className="text-[11px] text-[#71717A] mt-0.5">Adicionar especialista e metas</p>
              </div>
            </button>
          </div>

      {/* Main Selected Clinician Dashboard */}
      {selectedDoc ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Doctor Profile & Target Settings */}
        <div className="bg-white rounded-card border border-level-2 p-6 flex flex-col justify-between shadow-xs space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center relative">
              <img
                src={selectedDoc.avatar}
                alt={selectedDoc.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-4 border-level-1 shadow-sm mb-3"
              />
              <h3 className="font-display font-bold text-base text-on-surface">{selectedDoc.name}</h3>
              <p className="text-xs text-primary font-bold uppercase tracking-wider">{selectedDoc.specialty}</p>
              
              <div className="flex items-center gap-1.5 mt-2 text-xs text-on-surface-variant font-medium">
                <Mail size={13} />
                <span>{selectedDoc.email}</span>
              </div>
              <div className="text-[11px] text-on-surface-variant font-mono bg-level-1 px-2.5 py-1 rounded-full mt-2 border border-level-2">
                {selectedDoc.cro}
              </div>
            </div>

            <div className="border-t border-level-1 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant font-semibold">Meta de Produção</span>
                {!editingTarget ? (
                  <button 
                    onClick={() => { setTargetValue(selectedDoc.monthlyTarget.toString()); setEditingTarget(true); }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Ajustar
                  </button>
                ) : null}
              </div>

              {editingTarget ? (
                <form onSubmit={handleUpdateTarget} className="flex gap-2">
                  <input
                    type="number"
                    required
                    min="1000"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="flex-1 bg-level-1 border border-outline-variant rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center font-bold"
                  />
                  <button type="submit" className="bg-primary text-on-primary font-bold px-3 py-1 rounded-lg text-xs">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setEditingTarget(false)} className="border border-outline-variant px-2.5 py-1 rounded-lg text-xs">
                    ×
                  </button>
                </form>
              ) : (
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xl font-bold text-on-surface">
                    R$ {selectedDoc.monthlyTarget.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-semibold">Mensal</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                  <span>Produção Atual</span>
                  <span>{docTargetPercent}% atingido</span>
                </div>
                <div className="w-full bg-level-1 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(docTargetPercent, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Conversion Performance Tracking Section */}
          <div className="border-t border-level-1 pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Calculator size={14} className="text-primary" />
                <span>Conversão de Vendas</span>
              </h4>
              <div className="flex items-center gap-1.5">
                {!isEditingStats ? (
                  <button 
                    onClick={startEditingStats}
                    className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                    title="Digitar valores manualmente"
                    type="button"
                  >
                    Digitar
                  </button>
                ) : null}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  docConversionRate >= 65 ? 'bg-good/10 text-good' : docConversionRate >= 45 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {docConversionRate}% Conversão
                </span>
              </div>
            </div>

            {isEditingStats ? (
              <form onSubmit={handleSaveStatsDirect} className="space-y-3 bg-level-1/40 border border-level-2 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Avaliações</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={directEvalsInput}
                      onChange={(e) => setDirectEvalsInput(e.target.value)}
                      className="w-full bg-white border border-outline-variant rounded-lg p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Fechamentos</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={directClosuresInput}
                      onChange={(e) => setDirectClosuresInput(e.target.value)}
                      className="w-full bg-white border border-outline-variant rounded-lg p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center font-bold"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1 bg-primary hover:bg-primary/90 text-on-primary text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingStats(false)}
                    className="flex-1 py-1 border border-outline-variant text-on-surface-variant text-[10px] font-bold rounded-md hover:bg-level-1 cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-center">
                
                {/* Evaluations Meter */}
                <div className="bg-level-1/40 border border-level-2 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Avaliações</span>
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleAdjustStats('evaluations', -1)}
                      className="w-5 h-5 bg-white border border-level-2 hover:bg-level-1 hover:text-primary rounded flex items-center justify-center text-xs font-bold cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-on-surface w-6">{docEvaluations}</span>
                    <button 
                      onClick={() => handleAdjustStats('evaluations', 1)}
                      className="w-5 h-5 bg-white border border-level-2 hover:bg-level-1 hover:text-primary rounded flex items-center justify-center text-xs font-bold cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-semibold">consultas por mês</p>
                </div>

                {/* Closures Meter */}
                <div className="bg-level-1/40 border border-level-2 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Fechamentos</span>
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleAdjustStats('closures', -1)}
                      className="w-5 h-5 bg-white border border-level-2 hover:bg-level-1 hover:text-primary rounded flex items-center justify-center text-xs font-bold cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-on-surface w-6">{docClosures}</span>
                    <button 
                      onClick={() => handleAdjustStats('closures', 1)}
                      className="w-5 h-5 bg-white border border-level-2 hover:bg-level-1 hover:text-primary rounded flex items-center justify-center text-xs font-bold cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-semibold">tratamentos fechados</p>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Column 2: Log Treatments directly (Simulation Engine) */}
        <div className="bg-white rounded-card border border-level-2 p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-on-surface">Lançar Atendimento</h3>
              <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Selecione procedimentos frequentes ou insira um novo atendimento para somar ao faturamento da doutora.</p>
            </div>

            {/* Quick Procedure Grid */}
            <div className="grid grid-cols-2 gap-2">
              {quickProcedures.map((proc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLogQuickProcedure(proc.name, proc.price, proc.category)}
                  className="p-2 text-left bg-level-1/30 hover:bg-level-1/70 border border-level-2 hover:border-outline-variant rounded-lg transition-all text-[11px] group cursor-pointer"
                >
                  <p className="font-semibold text-on-surface truncate group-hover:text-primary">{proc.name}</p>
                  <p className="font-mono text-xs text-on-surface-variant mt-1">R$ {proc.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom treatment logger */}
          <form onSubmit={handleCustomProcedureSubmit} className="pt-4 border-t border-level-1 space-y-3">
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Outro Procedimento</h4>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ex: Ortodontia Manutenção"
                value={customProcedure}
                onChange={(e) => setCustomProcedure(e.target.value)}
                className="flex-1 bg-level-1 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                required
                min="50"
                placeholder="R$ 150"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-20 bg-level-1 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center"
              />
              <button type="submit" className="bg-primary hover:bg-primary-container text-on-primary font-bold rounded-lg p-2.5 flex items-center justify-center transition-colors cursor-pointer">
                <Plus size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* Column 3: Doctor Patient History / Worklog */}
        <div className="bg-white rounded-card border border-level-2 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-on-surface">Histórico de Produção</h3>
              <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Lançamentos de {selectedDoc.name} neste mês.</p>
            </div>

            {docTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-on-surface-variant gap-2 bg-level-1/30 rounded-lg border border-dashed border-outline-variant">
                <CalendarDays size={24} className="opacity-40 text-primary" />
                <p className="text-xs font-medium">Sem lançamentos para este período.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {docTransactions.map((item) => (
                  <div key={item.id} className="p-3 bg-level-1/30 border border-level-2 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-on-surface">{item.description}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{item.category} • {item.date}</p>
                    </div>
                    <span className="font-mono font-bold text-good">
                      + R$ {item.value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-level-1 flex justify-between text-xs text-on-surface-variant font-medium">
            <span>Faturamento Total do Mês:</span>
            <strong className="text-on-surface font-mono font-bold text-sm">
              R$ {docRevenueSum.toLocaleString('pt-BR')}
            </strong>
          </div>
        </div>

      </div>
      ) : (
        <div className="bg-white rounded-card border border-level-2 p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <UserPlus size={28} />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-display font-bold text-base text-on-surface">Nenhuma Dentista Cadastrada</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Não há nenhuma profissional cadastrada no sistema de gerenciamento clínico atualmente.
            </p>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Cadastre sua primeira cirurgiã-dentista para poder definir metas, acompanhar faturamento, registrar atendimentos e monitorar o funil de avaliações e fechamentos.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-on-primary font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
          >
            <Plus size={14} />
            <span>Cadastrar Primeira Dentista</span>
          </button>
        </div>
      )}

      {/* SECTION: CLINICAL CONVERSION DASHBOARD COMPARISON (Requirements H, I, J) */}
      <div className="bg-white rounded-card border border-level-2 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-on-surface">Painel Geral de Avaliações e Conversões</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">Visão consolidada do funil de vendas e conversão de consultas para todas as dentistas.</p>
          </div>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Consolidado Mensal
          </span>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-level-1/30 border border-level-2 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total de Avaliações</p>
              <p className="text-lg font-mono font-bold text-on-surface mt-0.5">
                {doctors.reduce((sum, d) => sum + (d.evaluations || 0), 0)}
              </p>
              <p className="text-[9px] text-on-surface-variant font-semibold">consultas agendadas</p>
            </div>
          </div>

          <div className="bg-level-1/30 border border-level-2 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-good/10 text-good flex items-center justify-center font-bold">
              <UserCheck size={18} />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total de Fechamentos</p>
              <p className="text-lg font-mono font-bold text-on-surface mt-0.5">
                {doctors.reduce((sum, d) => sum + (d.closures || 0), 0)}
              </p>
              <p className="text-[9px] text-on-surface-variant font-semibold">tratamentos iniciados</p>
            </div>
          </div>

          <div className="bg-level-1/30 border border-level-2 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Percent size={18} />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Conversão Média</p>
              <p className="text-lg font-mono font-bold text-on-surface mt-0.5">
                {(() => {
                  const evs = doctors.reduce((sum, d) => sum + (d.evaluations || 0), 0);
                  const cls = doctors.reduce((sum, d) => sum + (d.closures || 0), 0);
                  return evs > 0 ? Math.round((cls / evs) * 100) : 0;
                })()}%
              </p>
              <p className="text-[9px] text-on-surface-variant font-semibold">média geral da clínica</p>
            </div>
          </div>

          <div className="bg-level-1/30 border border-level-2 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Award size={18} />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Maior Conversora</p>
              <p className="text-sm font-bold text-on-surface mt-0.5 truncate max-w-[140px]">
                {(() => {
                  const ranked = [...doctors].map(d => {
                    const ev = d.evaluations || 0;
                    const cl = d.closures || 0;
                    const rate = ev > 0 ? Math.round((cl / ev) * 100) : 0;
                    return { name: d.name, rate };
                  }).sort((a, b) => b.rate - a.rate);
                  return ranked[0]?.name || 'N/A';
                })()}
              </p>
              <p className="text-[9px] text-on-surface-variant font-semibold">
                Taxa: {(() => {
                  const ranked = [...doctors].map(d => {
                    const ev = d.evaluations || 0;
                    const cl = d.closures || 0;
                    const rate = ev > 0 ? Math.round((cl / ev) * 100) : 0;
                    return { rate };
                  }).sort((a, b) => b.rate - a.rate);
                  return ranked[0]?.rate || 0;
                })()}%
              </p>
            </div>
          </div>
        </div>

        {/* Consolidated Comparison Table */}
        <div className="border border-level-2 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-level-1/60 border-b border-level-2 font-bold text-on-surface-variant text-[10px] uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Dentista</th>
                  <th className="p-3.5">Especialidade</th>
                  <th className="p-3.5 text-center">Avaliações</th>
                  <th className="p-3.5 text-center">Fechamentos</th>
                  <th className="p-3.5">Funil de Conversão (%)</th>
                  <th className="p-3.5 text-right">Faturamento</th>
                  <th className="p-3.5 text-center pr-5">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-level-1 font-medium">
                {doctors.map((doc) => {
                  const evs = doc.evaluations || 0;
                  const cls = doc.closures || 0;
                  const rate = evs > 0 ? Math.round((cls / evs) * 100) : 0;
                  const rev = getDocRevenueSum(doc);
                  const isSelected = doc.id === selectedDocId;

                  return (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-level-1/20 transition-colors ${
                        isSelected ? 'bg-primary/5 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-5 flex items-center gap-3">
                        <img 
                          src={doc.avatar} 
                          alt={doc.name} 
                          className="w-8 h-8 rounded-full object-cover border border-level-2"
                        />
                        <div>
                          <p className="text-on-surface font-bold">{doc.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{doc.cro}</p>
                        </div>
                      </td>
                      <td className="p-3.5 text-on-surface-variant font-semibold">{doc.specialty}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-on-surface">{evs}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-on-surface">{cls}</td>
                      <td className="p-3.5">
                        <div className="space-y-1 max-w-[180px]">
                          <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                            <span className={rate >= 65 ? 'text-good font-bold' : rate >= 45 ? 'text-amber-500 font-bold' : 'text-red-500 font-bold'}>
                              {rate}%
                            </span>
                            <span>{cls} de {evs}</span>
                          </div>
                          <div className="w-full bg-level-1 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                rate >= 65 ? 'bg-good' : rate >= 45 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-on-surface">
                        R$ {rev.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3.5 text-center pr-5">
                        <button
                          onClick={() => {
                            setSelectedDocId(doc.id);
                            setIsEditingStats(false);
                            // Scroll up smoothly to selected profile
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-primary text-on-primary shadow-xs' 
                              : 'bg-level-1 hover:bg-level-2 border border-outline-variant text-on-surface-variant'
                          }`}
                        >
                          {isSelected ? 'Selecionado' : 'Selecionar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}

      {/* MODAL: ADD DENTIST / CADASTRO */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-card border border-level-2 w-full max-w-md p-6 shadow-xl relative"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface text-lg font-bold cursor-pointer"
              >
                ×
              </button>

              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">Cadastrar Nova Dentista</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Cadastre o perfil profissional da nova especialista de sua equipe e defina metas iniciais.</p>
                </div>

                <form onSubmit={handleAddDoctorSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dra. Mariana Costa"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Especialidade Principal</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ortodontia"
                        value={newDocSpecialty}
                        onChange={(e) => setNewDocSpecialty(e.target.value)}
                        className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">CRO (Nº Registro)</label>
                      <input
                        type="text"
                        placeholder="Ex: CRO-SP 12345"
                        value={newDocCro}
                        onChange={(e) => setNewDocCro(e.target.value)}
                        className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">E-mail Profissional</label>
                    <input
                      type="email"
                      placeholder="Ex: mariana.costa@clinica.com"
                      value={newDocEmail}
                      onChange={(e) => setNewDocEmail(e.target.value)}
                      className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Meta Mensal (R$)</label>
                      <input
                        type="number"
                        required
                        min="5000"
                        step="1000"
                        value={newDocTarget}
                        onChange={(e) => setNewDocTarget(e.target.value)}
                        className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Avaliações/Mês</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newDocEvaluations}
                        onChange={(e) => setNewDocEvaluations(e.target.value)}
                        className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Fechamentos/Mês</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newDocClosures}
                        onChange={(e) => setNewDocClosures(e.target.value)}
                        className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-level-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Cadastrar Dentista
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
