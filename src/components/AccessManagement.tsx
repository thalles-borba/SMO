/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  Briefcase,
  UserCog,
  RefreshCw,
  Check,
  Ban
} from 'lucide-react';
import { Doctor } from '../types';
import {
  UserRole,
  ROLE_LABELS,
  ClinicMember,
  ClinicInvite,
  listClinicMembers,
  listClinicInvites,
  upsertClinicInvite,
  deleteClinicInvite,
  updateMemberAccess
} from '../lib/firebase';

interface AccessManagementProps {
  clinicId: string;
  currentUserUid: string;
  doctors: Doctor[];
}

const ROLE_STYLES: Record<UserRole, { badge: string; dot: string; desc: string }> = {
  gestao: {
    badge: 'bg-[#3795AE]/10 text-[#2B7E94] border-[#3795AE]/20',
    dot: 'bg-[#3795AE]',
    desc: 'Acesso total: Visão Geral, Financeiro, Dentistas, Metas & Equipe, Compras, Operações, Histórico e Controle de Acessos.'
  },
  dentista: {
    badge: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
    desc: 'Acesso clínico: próprio desempenho e metas (quando vinculado), Escala dos Consultórios, Sanitização, Laboratório e Utilitários.'
  },
  funcionario: {
    badge: 'bg-[#F4F4F6] text-[#3F3F46] border-[#E4E4E7]',
    dot: 'bg-[#71717A]',
    desc: 'Acesso operacional: Compras e Estoque, Escala dos Consultórios, Sanitização, Laboratório e Utilitários. Sem acesso financeiro.'
  }
};

export default function AccessManagement({
  clinicId,
  currentUserUid,
  doctors
}: AccessManagementProps) {
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [invites, setInvites] = useState<ClinicInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMemberUid, setSavingMemberUid] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('dentista');
  const [inviteDoctorId, setInviteDoctorId] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchAccessData = useCallback(async () => {
    setLoading(true);
    try {
      const [memberList, inviteList] = await Promise.all([
        listClinicMembers(clinicId),
        listClinicInvites(clinicId)
      ]);
      // Sort: Gestão first, then Dentista, then Funcionário
      const roleOrder: Record<UserRole, number> = { gestao: 0, dentista: 1, funcionario: 2 };
      memberList.sort((a, b) => {
        if (roleOrder[a.role] !== roleOrder[b.role]) {
          return roleOrder[a.role] - roleOrder[b.role];
        }
        return a.displayName.localeCompare(b.displayName);
      });
      setMembers(memberList);
      setInvites(inviteList.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (err) {
      console.error('[AccessManagement] Erro ao carregar acessos:', err);
      showFeedback('error', 'Não foi possível carregar os usuários e convites.');
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchAccessData();
  }, [fetchAccessData]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedEmail = inviteEmail.trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      showFeedback('error', 'Informe um endereço de e-mail Google válido.');
      return;
    }

    setSubmittingInvite(true);
    try {
      const saved = await upsertClinicInvite(clinicId, currentUserUid, {
        email: cleanedEmail,
        role: inviteRole,
        linkedDoctorId: inviteRole === 'dentista' ? inviteDoctorId || undefined : undefined
      });

      setInvites(prev => {
        const filtered = prev.filter(i => i.id !== saved.id);
        return [...filtered, saved].sort((a, b) => a.email.localeCompare(b.email));
      });
      setInviteEmail('');
      setInviteDoctorId('');
      showFeedback(
        'success',
        `Acesso pré-autorizado para ${cleanedEmail} como ${ROLE_LABELS[inviteRole]}.`
      );
    } catch (err) {
      console.error('[AccessManagement] Erro ao criar convite:', err);
      showFeedback('error', 'Erro ao pré-autorizar o e-mail. Tente novamente.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleDeleteInvite = async (invite: ClinicInvite) => {
    setDeletingInviteId(invite.id);
    try {
      await deleteClinicInvite(clinicId, invite.id);
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      showFeedback('success', `Pré-autorização de ${invite.email} removida.`);
    } catch (err) {
      console.error('[AccessManagement] Erro ao remover convite:', err);
      showFeedback('error', 'Não foi possível remover a pré-autorização.');
    } finally {
      setDeletingInviteId(null);
    }
  };

  const handleMemberChange = async (
    member: ClinicMember,
    changes: Partial<{ role: UserRole; active: boolean; linkedDoctorId: string }>
  ) => {
    if (member.uid === currentUserUid) return;

    const nextRole = changes.role ?? member.role;
    const nextActive = changes.active ?? member.active;
    const nextLinkedDoctorId =
      nextRole === 'dentista'
        ? changes.linkedDoctorId !== undefined
          ? changes.linkedDoctorId
          : member.linkedDoctorId || ''
        : '';

    setSavingMemberUid(member.uid);
    try {
      await updateMemberAccess(clinicId, member.uid, {
        role: nextRole,
        active: nextActive,
        linkedDoctorId: nextLinkedDoctorId
      });

      setMembers(prev =>
        prev.map(m =>
          m.uid === member.uid
            ? {
                ...m,
                role: nextRole,
                active: nextActive,
                linkedDoctorId: nextLinkedDoctorId || undefined
              }
            : m
        )
      );
      showFeedback('success', `Permissões de ${member.displayName} atualizadas.`);
    } catch (err) {
      console.error('[AccessManagement] Erro ao atualizar membro:', err);
      showFeedback('error', 'Não foi possível atualizar as permissões deste usuário.');
    } finally {
      setSavingMemberUid(null);
    }
  };

  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return null;
    return doctors.find(d => d.id === doctorId)?.name || null;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full select-none">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <AlertCircle size={15} className="shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Role Summary Matrix (3 Minimalist Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(
          [
            { role: 'gestao' as UserRole, icon: UserCog, title: 'Gestão' },
            { role: 'dentista' as UserRole, icon: Stethoscope, title: 'Dentista' },
            { role: 'funcionario' as UserRole, icon: Briefcase, title: 'Funcionário' }
          ] as const
        ).map(card => {
          const Icon = card.icon;
          const count = members.filter(m => m.role === card.role && m.active).length;
          return (
            <div
              key={card.role}
              className="bg-white border border-[#EBEBED] rounded-2xl p-5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F4F4F6] text-[#3795AE] flex items-center justify-center shrink-0">
                    <Icon size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#18181B]">{card.title}</h3>
                    <p className="text-[11px] text-[#71717A] tabular-nums">
                      {count} {count === 1 ? 'ativo' : 'ativos'}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${ROLE_STYLES[card.role].badge}`}
                >
                  {card.title}
                </span>
              </div>
              <p className="text-xs text-[#52525B] leading-relaxed">{ROLE_STYLES[card.role].desc}</p>
            </div>
          );
        })}
      </div>

      {/* Section 1: Pre-Authorize Google Email */}
      <div className="bg-white border border-[#EBEBED] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-semibold text-base text-[#18181B] flex items-center gap-2">
              <UserPlus size={17} className="text-[#3795AE]" />
              <span>Pré-autorizar acesso por e-mail Google</span>
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Defina o perfil antes do primeiro login. Quando a pessoa entrar com o Google, receberá essas permissões automaticamente.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className={inviteRole === 'dentista' ? 'md:col-span-4' : 'md:col-span-6'}>
            <label className="block text-xs font-medium text-[#52525B] mb-1.5">
              E-mail da conta Google
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
              <input
                type="email"
                required
                placeholder="ex: dra.camila@gmail.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full bg-white border border-[#E4E4E7] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-[#52525B] mb-1.5">
              Perfil de acesso
            </label>
            <select
              value={inviteRole}
              onChange={e => {
                const next = e.target.value as UserRole;
                setInviteRole(next);
                if (next !== 'dentista') setInviteDoctorId('');
              }}
              className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
            >
              <option value="gestao">Gestão</option>
              <option value="dentista">Dentista</option>
              <option value="funcionario">Funcionário</option>
            </select>
          </div>

          {inviteRole === 'dentista' && (
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                Vincular dentista <span className="text-[#A1A1AA]">(opcional)</span>
              </label>
              <select
                value={inviteDoctorId}
                onChange={e => setInviteDoctorId(e.target.value)}
                className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
              >
                <option value="">Selecionar depois</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={inviteRole === 'dentista' ? 'md:col-span-2' : 'md:col-span-3'}>
            <button
              type="submit"
              disabled={submittingInvite}
              className="w-full py-2.5 px-4 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[42px]"
            >
              {submittingInvite ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <Check size={15} />
                  <span>Autorizar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Pending Invites List */}
        {invites.length > 0 && (
          <div className="pt-4 border-t border-[#F1F1F3] space-y-2.5">
            <p className="text-xs font-semibold text-[#52525B]">
              Aguardando primeiro acesso ({invites.length})
            </p>
            <div className="divide-y divide-[#F1F1F3] border border-[#EBEBED] rounded-xl overflow-hidden">
              {invites.map(inv => {
                const linkedName = getDoctorName(inv.linkedDoctorId);
                return (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#18181B] truncate">{inv.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${ROLE_STYLES[inv.role].badge}`}
                        >
                          {ROLE_LABELS[inv.role]}
                        </span>
                        {linkedName && (
                          <span className="text-[11px] text-[#71717A]">
                            Vinculado a: <strong className="text-[#3F3F46] font-medium">{linkedName}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteInvite(inv)}
                      disabled={deletingInviteId === inv.id}
                      className="self-end sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                    >
                      {deletingInviteId === inv.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      <span>Remover</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Registered Clinic Users */}
      <div className="bg-white border border-[#EBEBED] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-base text-[#18181B] flex items-center gap-2">
              <ShieldCheck size={17} className="text-[#3795AE]" />
              <span>Usuários cadastrados na clínica</span>
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Altere o perfil entre Gestão, Dentista e Funcionário ou desative acessos a qualquer momento.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAccessData}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBEBED] hover:border-[#D4D4D8] bg-white text-xs font-medium text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar lista</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#71717A]">
            <Loader2 size={18} className="animate-spin text-[#3795AE]" />
            <span>Carregando usuários...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#71717A] border border-dashed border-[#E4E4E7] rounded-xl">
            Nenhum usuário cadastrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-[#F1F1F3] border border-[#EBEBED] rounded-xl overflow-hidden">
            {members.map(member => {
              const isSelf = member.uid === currentUserUid;
              const isSaving = savingMemberUid === member.uid;
              const initials =
                member.displayName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(p => p[0]?.toUpperCase() || '')
                  .join('') || 'U';

              return (
                <div
                  key={member.uid}
                  className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    member.active ? 'bg-white' : 'bg-[#FAFAFA] opacity-80'
                  }`}
                >
                  {/* User Identity */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-[#EBEBED] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#3795AE]/10 text-[#3795AE] font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#18181B] truncate">
                          {member.displayName}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F4F4F6] text-[#52525B]">
                            Você
                          </span>
                        )}
                        {!member.active && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                            Desativado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#71717A] truncate mt-0.5">
                        {member.specialty || ROLE_LABELS[member.role]}
                      </p>
                    </div>
                  </div>

                  {/* Role & Doctor Link Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    {/* Role Selector */}
                    <select
                      aria-label={`Perfil de ${member.displayName}`}
                      value={member.role}
                      disabled={isSelf || isSaving}
                      onChange={e =>
                        handleMemberChange(member, { role: e.target.value as UserRole })
                      }
                      className="bg-white border border-[#E4E4E7] disabled:bg-[#F7F7F8] disabled:text-[#71717A] rounded-xl px-3 py-2 text-xs font-medium text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 min-w-[135px]"
                    >
                      <option value="gestao">Gestão</option>
                      <option value="dentista">Dentista</option>
                      <option value="funcionario">Funcionário</option>
                    </select>

                    {/* Linked Doctor Selector (shown for Dentista) */}
                    {member.role === 'dentista' && (
                      <select
                        aria-label={`Dentista vinculado a ${member.displayName}`}
                        value={member.linkedDoctorId || ''}
                        disabled={isSelf || isSaving}
                        onChange={e =>
                          handleMemberChange(member, { linkedDoctorId: e.target.value })
                        }
                        className="bg-white border border-[#E4E4E7] disabled:bg-[#F7F7F8] rounded-xl px-3 py-2 text-xs font-medium text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15 min-w-[180px]"
                      >
                        <option value="">Sem dentista vinculada</option>
                        {doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Active / Inactive Toggle */}
                    <button
                      type="button"
                      disabled={isSelf || isSaving}
                      onClick={() => handleMemberChange(member, { active: !member.active })}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors min-w-[104px] ${
                        isSelf
                          ? 'bg-[#F7F7F8] border-[#EBEBED] text-[#A1A1AA] cursor-not-allowed'
                          : member.active
                            ? 'bg-white border-[#E4E4E7] text-[#52525B] hover:text-[#DC2626] hover:border-[#FECACA] hover:bg-[#FEF2F2] cursor-pointer'
                            : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857] hover:bg-[#D1FAE5] cursor-pointer'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : member.active ? (
                        <>
                          <Ban size={13} />
                          <span>Desativar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Reativar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
