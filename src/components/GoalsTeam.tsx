/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TeamGoal, TeamMember, Doctor, Transaction } from '../types';
import { 
  Plus, 
  Target, 
  Users, 
  Calendar, 
  CheckCircle2, 
  UserPlus, 
  Sparkles, 
  Award, 
  TrendingUp, 
  Trophy,
  Zap,
  Gift,
  Heart,
  TrendingDown,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalsTeamProps {
  goals: TeamGoal[];
  teamMembers: TeamMember[];
  doctors: Doctor[];
  transactions: Transaction[];
  onAddGoal: (g: Omit<TeamGoal, 'id'>) => void;
  onAddMember: (m: Omit<TeamMember, 'id'>) => void;
  onUpdateGoalProgress: (id: string, progressDelta: number) => void;
  onToggleStatus: (id: string, status: 'Ativo' | 'Em plantão' | 'Ausente') => void;
}

function MemberAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const initials = name
    .replace(/^(Dra?\.?\s+)/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || 'E';

  if (avatar && !avatar.includes('unsplash.com')) {
    return (
      <img
        src={avatar}
        alt={name}
        referrerPolicy="no-referrer"
        className="w-11 h-11 rounded-full object-cover border border-[#E6EAF0] shrink-0"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-[#3795AE]/12 text-[#1F6F85] font-semibold text-sm flex items-center justify-center shrink-0 border border-[#3795AE]/20">
      {initials}
    </div>
  );
}

interface MemberStats {
  xp: number;
  level: number;
  badges: string[];
}

export default function GoalsTeam({ 
  goals, 
  teamMembers, 
  doctors, 
  transactions,
  onAddGoal, 
  onAddMember, 
  onUpdateGoalProgress,
  onToggleStatus 
}: GoalsTeamProps) {
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Form states - Member
  const [name, setName] = useState('');
  const [role, setRole] = useState('Dentista');
  const [status, setStatus] = useState<'Ativo' | 'Em plantão' | 'Ausente'>('Ativo');

  // Form states - Goal
  const [goalTitle, setGoalTitle] = useState('');
  const [targetVal, setTargetVal] = useState('');
  const [currentVal, setCurrentVal] = useState('');
  const [assigned, setAssigned] = useState('Toda a Equipe');

  // Gamification state
  const [gamification, setGamification] = useState<{ [id: string]: MemberStats }>({});
  
  // Award state
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('👑 Campeã de Faturamento');
  const [xpAward, setXpAward] = useState('300');
  const [celebratingMember, setCelebratingMember] = useState<string | null>(null);

  // Initialize and load gamification stats
  useEffect(() => {
    const saved = localStorage.getItem('clinica_gamification_v3');
    if (saved) {
      try {
        setGamification(JSON.parse(saved));
      } catch {
        setGamification({});
      }
    } else {
      setGamification({});
    }
  }, []);

  const saveGamification = (updated: { [id: string]: MemberStats }) => {
    setGamification(updated);
    localStorage.setItem('clinica_gamification_v3', JSON.stringify(updated));
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddMember({ name: name.trim(), role: role.trim() || 'Equipe', avatar: '', status });
    setName('');
    setShowMemberModal(false);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !targetVal) return;
    
    onAddGoal({
      title: goalTitle,
      targetValue: parseFloat(targetVal),
      currentValue: parseFloat(currentVal || '0'),
      deadline: '2026-03-31',
      assignedTo: assigned
    });

    setGoalTitle('');
    setTargetVal('');
    setCurrentVal('');
    setShowGoalModal(false);
  };

  // Award XP and badges to team members (Gamification)
  const handleAwardRecognition = (e: React.FormEvent) => {
    e.preventDefault();
    const mId = selectedMember || (teamMembers[0] ? teamMembers[0].id : '');
    if (!mId) return;

    const currentStats = gamification[mId] || { xp: 0, level: 1, badges: [] };
    const xpToAdd = parseInt(xpAward) || 100;
    
    let newXp = currentStats.xp + xpToAdd;
    let newLevel = currentStats.level;
    
    // Level up mechanic: 1000 XP per level
    const requiredXpForNext = newLevel * 1000;
    if (newXp >= requiredXpForNext) {
      newLevel += 1;
    }

    // Add badge if not already present
    const newBadges = [...currentStats.badges];
    if (selectedBadge && !newBadges.includes(selectedBadge)) {
      newBadges.push(selectedBadge);
    }

    const updated = {
      ...gamification,
      [mId]: {
        xp: newXp,
        level: newLevel,
        badges: newBadges
      }
    };

    saveGamification(updated);
    
    // Trigger burst animation for the card
    setCelebratingMember(mId);
    setTimeout(() => setCelebratingMember(null), 3000);
  };

  // Dynamic Metrics Calculations
  const totalRevenue = doctors.reduce((sum, d) => {
    const docRev = transactions
      .filter(t => t.doctorName === d.name && t.type === 'receita')
      .reduce((s, t) => s + t.value, 0);
    return sum + docRev;
  }, 0);

  const materialsExpense = transactions
    .filter(t => t.type === 'despesa' && t.category === 'Materiais')
    .reduce((sum, t) => sum + t.value, 0);

  const materialsPercent = totalRevenue > 0 ? Math.round((materialsExpense / totalRevenue) * 100) : 0;

  const doctorsWithEvals = doctors.filter(d => d.evaluations && d.evaluations > 0);
  const avgConversionRate = doctorsWithEvals.length > 0 
    ? Math.round(doctorsWithEvals.reduce((sum, d) => sum + (((d.closures || 0) / (d.evaluations || 1)) * 100), 0) / doctorsWithEvals.length)
    : 0;

  // Campaigns definitions (derived dynamically from real goals when present)
  const targetRevenueGoal = goals.reduce((sum, g) => sum + g.targetValue, 0);
  const targetConversionGoal = 65;
  const targetMaterialsLimit = 15;

  const revPercent = targetRevenueGoal > 0 ? Math.min(Math.round((totalRevenue / targetRevenueGoal) * 100), 100) : 0;
  const convPercent = Math.min(Math.round((avgConversionRate / targetConversionGoal) * 100), 100);
  const materialsScorePercent =
    totalRevenue === 0
      ? 0
      : materialsPercent <= targetMaterialsLimit
      ? 100
      : Math.max(0, 100 - (materialsPercent - targetMaterialsLimit) * 10);

  return (
    <div className="space-y-5 w-full select-none font-sans">
      {/* Top 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Card: Goals overview */}
        <section className="bg-white border border-[#E6EAF0] rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-display font-semibold text-base text-[#14181F]">Metas do mês</h3>
                <p className="text-sm text-[#647082] mt-0.5">Acompanhe os objetivos de faturamento e equipe</p>
              </div>
              <button
                onClick={() => setShowGoalModal(true)}
                className="min-h-[42px] bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus size={16} />
                Nova meta
              </button>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {goals.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl border border-dashed border-[#D9E0E8] bg-[#F7F9FB] space-y-2">
                  <p className="text-sm font-semibold text-[#14181F]">Nenhuma meta cadastrada ainda</p>
                  <p className="text-xs text-[#647082]">Clique em &quot;Nova meta&quot; acima para criar o primeiro objetivo da clínica.</p>
                </div>
              ) : goals.map((goal) => {
                const percent = goal.targetValue > 0 ? Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100) : 0;
                const isComplete = percent >= 100;
                return (
                  <div key={goal.id} className="p-4 bg-[#F7F9FB] border border-[#E6EAF0] rounded-xl space-y-2.5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-[13px] font-semibold text-[#18181B] flex items-center gap-1.5">
                          {isComplete ? (
                            <CheckCircle2 size={14} className="text-[#16A34A] shrink-0" />
                          ) : (
                            <Target size={14} className="text-[#3795AE] shrink-0" />
                          )}
                          <span>{goal.title}</span>
                        </h4>
                        <p className="text-xs text-[#71717A] mt-1">
                          Responsável: <span className="font-medium text-[#3F3F46]">{goal.assignedTo}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-[#18181B] tabular-nums">
                          R$ {goal.currentValue.toLocaleString('pt-BR')} / R$ {goal.targetValue.toLocaleString('pt-BR')}
                        </p>
                        <p className={`text-[11px] font-semibold mt-0.5 tabular-nums ${isComplete ? 'text-[#16A34A]' : 'text-[#3795AE]'}`}>
                          {percent}% atingida
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 bg-[#EAEAEF] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-[#16A34A]' : 'bg-[#3795AE]'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onUpdateGoalProgress(goal.id, 500)}
                          className="text-[11px] bg-white border border-[#E4E4E7] hover:border-[#3795AE] text-[#3F3F46] hover:text-[#3795AE] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer tabular-nums"
                          title="Simular +R$ 500 na meta"
                        >
                          +500
                        </button>
                        <button
                          onClick={() => onUpdateGoalProgress(goal.id, 2000)}
                          className="text-[11px] bg-white border border-[#E4E4E7] hover:border-[#3795AE] text-[#3F3F46] hover:text-[#3795AE] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer tabular-nums"
                          title="Simular +R$ 2000 na meta"
                        >
                          +2k
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Card: Team Presence Board */}
        <section className="bg-white border border-[#E6EAF0] rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-display font-semibold text-base text-[#14181F]">Equipe da clínica</h3>
                <p className="text-sm text-[#647082] mt-0.5">Quem está atendendo ou em plantão hoje</p>
              </div>
              <button
                onClick={() => setShowMemberModal(true)}
                className="min-h-[42px] bg-white border border-[#D9E0E8] hover:bg-[#F7F9FB] text-[#14181F] font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <UserPlus size={16} className="text-[#3795AE]" />
                Adicionar pessoa
              </button>
            </div>

            {teamMembers.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-[#D9E0E8] bg-[#F7F9FB] space-y-2">
                <p className="text-sm font-semibold text-[#14181F]">Nenhum colaborador cadastrado</p>
                <p className="text-xs text-[#647082]">Adicione as pessoas da equipe para acompanhar presença e plantões.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 bg-[#F7F9FB] border border-[#E6EAF0] rounded-xl flex items-center gap-3 transition-colors"
                >
                  <MemberAvatar name={member.name} avatar={member.avatar} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#14181F] truncate">{member.name}</h4>
                    <p className="text-xs text-[#647082] truncate mt-0.5">{member.role}</p>

                    <div className="mt-2 flex gap-1">
                      {(['Ativo', 'Em plantão', 'Ausente'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => onToggleStatus(member.id, st)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            member.status === st
                              ? st === 'Ativo'
                                ? 'bg-[#ECFDF5] text-[#16A34A]'
                                : st === 'Em plantão'
                                ? 'bg-[#3795AE]/12 text-[#3795AE]'
                                : 'bg-[#FFFBEB] text-[#D97706]'
                              : 'bg-white border border-[#EBEBED] text-[#71717A] hover:text-[#18181B]'
                          }`}
                        >
                          {st === 'Ativo' ? 'Ativo' : st === 'Em plantão' ? 'Plantão' : 'Ausente'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </section>
      </div>

      {/* COLLECTIVE INCENTIVE REWARDS PANEL */}
      <section className="bg-white border border-[#EBEBED] rounded-2xl p-6 space-y-5">
        <div>
          <h3 className="font-display font-semibold text-[15px] text-[#18181B] flex items-center gap-2">
            <Gift className="text-[#3795AE]" size={17} />
            <span>Campanha de prêmios coletivos</span>
          </h3>
          <p className="text-xs text-[#71717A] mt-0.5">
            Metas da clínica que destravam incentivos especiais para toda a equipe
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Goal 1 */}
          <div className="bg-[#FAFAFA] border border-[#EBEBED] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#3795AE]">Super faturamento</span>
                <Trophy size={16} className="text-[#D97706]" />
              </div>
              <h4 className="text-sm font-semibold text-[#18181B]">Day Use no SPA para a equipe</h4>
              <p className="text-xs text-[#647082] leading-relaxed">
                {targetRevenueGoal > 0 ? (
                  <>Atingindo um faturamento consolidado de <strong className="text-[#14181F]">R$ {targetRevenueGoal.toLocaleString('pt-BR')}</strong> no mês.</>
                ) : (
                  <>Crie uma meta acima para definir o valor de faturamento desta campanha.</>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium tabular-nums">
                <span className="text-[#647082]">R$ {totalRevenue.toLocaleString('pt-BR')}</span>
                <span className="text-[#3795AE] font-semibold">{revPercent}%</span>
              </div>
              <div className="bg-[#E6EAF0] h-2 rounded-full overflow-hidden">
                <div className="bg-[#3795AE] h-full rounded-full transition-all duration-300" style={{ width: `${revPercent}%` }} />
              </div>
              <p className="text-xs text-[#647082] text-right tabular-nums">
                {targetRevenueGoal === 0
                  ? 'Defina a meta para acompanhar'
                  : revPercent >= 100
                  ? 'Meta alcançada'
                  : `Faltam R$ ${Math.max(0, targetRevenueGoal - totalRevenue).toLocaleString('pt-BR')}`}
              </p>
            </div>
          </div>

          {/* Goal 2 */}
          <div className="bg-[#FAFAFA] border border-[#EBEBED] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#3795AE]">Excelência em vendas</span>
                <Zap size={16} className="text-[#D97706]" />
              </div>
              <h4 className="text-sm font-semibold text-[#18181B]">Bônus extra de R$ 500</h4>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Alcançando taxa média de fechamentos acima de <strong className="text-[#18181B]">{targetConversionGoal}%</strong> das avaliações.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium tabular-nums">
                <span className="text-[#71717A]">{avgConversionRate}% conversão média</span>
                <span className="text-[#3795AE] font-semibold">{convPercent}%</span>
              </div>
              <div className="bg-[#EAEAEF] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#3795AE] h-full rounded-full transition-all duration-300" style={{ width: `${convPercent}%` }} />
              </div>
              <p className="text-[11px] text-[#71717A] text-right tabular-nums">
                {avgConversionRate >= targetConversionGoal
                  ? 'Conversão excelente — bônus destravado'
                  : `Faltam ${targetConversionGoal - avgConversionRate}% de conversão`}
              </p>
            </div>
          </div>

          {/* Goal 3 */}
          <div className="bg-[#FAFAFA] border border-[#EBEBED] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[#16A34A]">Economia inteligente</span>
                <Heart size={16} className="text-[#DC2626]" />
              </div>
              <h4 className="text-sm font-semibold text-[#18181B]">Jantar comemorativo</h4>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Manter o custo de materiais abaixo de <strong className="text-[#18181B]">{targetMaterialsLimit}%</strong> do faturamento consolidado.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium tabular-nums">
                <span className="text-[#71717A]">{materialsPercent}% gasto atual</span>
                <span className={materialsPercent <= targetMaterialsLimit ? 'text-[#16A34A] font-semibold' : 'text-[#D97706] font-semibold'}>
                  {materialsPercent <= targetMaterialsLimit ? 'No limite' : 'Ajustar compras'}
                </span>
              </div>
              <div className="bg-[#EAEAEF] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    materialsPercent <= targetMaterialsLimit ? 'bg-[#16A34A]' : 'bg-[#D97706]'
                  }`}
                  style={{ width: `${materialsScorePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-[#71717A] text-right">
                {materialsPercent <= targetMaterialsLimit
                  ? 'Custos controlados — prêmio destravado'
                  : 'Otimizar reposição no catálogo'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GAMIFICATION PANEL */}
      <section className="bg-white border border-[#EBEBED] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Trophy className="text-[#D97706]" size={18} />
          <div>
            <h3 className="font-display font-semibold text-[15px] text-[#18181B]">
              Mural de conquistas e reconhecimento
            </h3>
            <p className="text-xs text-[#71717A] mt-0.5">
              Medalhas e níveis de excelência do time clínico e administrativo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[450px] overflow-y-auto pr-1">
            {teamMembers.length === 0 ? (
              <div className="md:col-span-2 py-12 px-6 text-center rounded-xl border border-dashed border-[#D9E0E8] bg-[#F7F9FB] space-y-1.5">
                <p className="text-sm font-semibold text-[#14181F]">Adicione colaboradores para reconhecer a equipe</p>
                <p className="text-xs text-[#647082]">Assim que cadastrar os membros acima, você poderá registrar conquistas aqui.</p>
              </div>
            ) : teamMembers.map((member) => {
              const stats = gamification[member.id] || { xp: 0, level: 1, badges: [] };
              const isCelebrating = celebratingMember === member.id;

              const xpNeeded = stats.level * 1000;
              const xpPrev = (stats.level - 1) * 1000;
              const currentXpInLevel = Math.max(0, stats.xp - xpPrev);
              const xpRange = xpNeeded - xpPrev;
              const pct = Math.min(Math.round((currentXpInLevel / xpRange) * 100), 100);

              return (
                <div
                  key={member.id}
                  className={`p-4 border rounded-xl flex flex-col justify-between gap-3 relative transition-all ${
                    isCelebrating
                      ? 'bg-[#FFFBEB] border-[#D97706]/40 ring-1 ring-[#D97706]/30'
                      : 'bg-[#F7F9FB] border-[#E6EAF0]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <MemberAvatar name={member.name} avatar={member.avatar} />
                      <span className="absolute -bottom-1 -right-1 bg-[#3795AE] text-white text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center border border-white tabular-nums">
                        N{stats.level}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[13px] font-semibold text-[#18181B] truncate">{member.name}</h4>
                        <span className="text-[11px] font-semibold text-[#D97706] tabular-nums shrink-0">
                          {stats.xp} XP
                        </span>
                      </div>
                      <p className="text-[11px] text-[#71717A] mt-0.5 truncate">{member.role}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#71717A] tabular-nums">
                      <span>Nível {stats.level}</span>
                      <span>{pct}% para L{stats.level + 1}</span>
                    </div>
                    <div className="bg-[#EAEAEF] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#3795AE] h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#EBEBED]/80">
                    <p className="text-[11px] text-[#71717A]">Medalhas atribuídas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.badges.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="bg-white border border-[#EBEBED] text-[11px] font-medium text-[#3F3F46] px-2 py-0.5 rounded-md"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Award Panel Form */}
          <div className="bg-[#FAFAFA] border border-[#EBEBED] rounded-xl p-5 flex flex-col justify-between">
            <form onSubmit={handleAwardRecognition} className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="text-[#3795AE]" size={17} />
                <h4 className="text-sm font-semibold text-[#18181B]">Conceder reconhecimento</h4>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Membro da equipe</label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Medalha de produtividade</label>
                <select
                  value={selectedBadge}
                  onChange={(e) => setSelectedBadge(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                >
                  <option value="👑 Campeã de Faturamento">👑 Campeã de Faturamento</option>
                  <option value="⭐ Estrela de Invisalign">⭐ Estrela de Invisalign</option>
                  <option value="📦 Mestre da Economia">📦 Mestre da Economia (Custos)</option>
                  <option value="📞 Atendimento de Excelência">📞 Atendimento de Excelência</option>
                  <option value="❤️ Encantadora de Pacientes">❤️ Encantadora de Pacientes</option>
                  <option value="🔥 Meta Batida!">🔥 Meta Batida!</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Recompensa (Pontos XP)</label>
                <select
                  value={xpAward}
                  onChange={(e) => setXpAward(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                >
                  <option value="100">100 XP (Agradecimento simples)</option>
                  <option value="300">300 XP (Meta intermediária)</option>
                  <option value="500">500 XP (Meta atingida)</option>
                  <option value="1000">1000 XP (Destaque do Mês)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Registrar conquista
              </button>
            </form>

            <div className="bg-white p-3 rounded-xl border border-[#EBEBED] text-[11px] text-[#71717A] leading-relaxed mt-4">
              <span className="text-[#3795AE] font-semibold">Progressão:</span> cada 1.000 XP acumula um novo nível no mural da clínica.
            </div>
          </div>
        </div>
      </section>

      {/* MODAL 1: ADD NEW MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-[#EBEBED] w-full max-w-sm p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold text-base text-[#18181B]">Novo colaborador</h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="text-[#71717A] hover:text-[#18181B] text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Nome completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Roberto Silveira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Cargo / Função</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ortodontista, ASB, Recepcionista"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Status inicial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em plantão">Em plantão</option>
                  <option value="Ausente">Ausente</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold text-[#52525B] hover:bg-[#FAFAFA] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-xs font-semibold cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADD NEW GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-[#EBEBED] w-full max-w-sm p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold text-base text-[#18181B]">Criar objetivo clínico</h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-[#71717A] hover:text-[#18181B] text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Título do objetivo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Captar 50 novos pacientes de Invisalign"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1.5">Valor alvo (R$)</label>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={targetVal}
                    onChange={(e) => setTargetVal(e.target.value)}
                    className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1.5">Valor inicial (R$)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={currentVal}
                    onChange={(e) => setCurrentVal(e.target.value)}
                    className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5">Atribuído a</label>
                <select
                  value={assigned}
                  onChange={(e) => setAssigned(e.target.value)}
                  className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                >
                  <option value="Toda a Equipe">Toda a Equipe</option>
                  <option value="Equipe de Compras">Equipe de Compras</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold text-[#52525B] hover:bg-[#FAFAFA] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-xs font-semibold cursor-pointer"
                >
                  Criar objetivo
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
