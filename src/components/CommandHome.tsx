/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Mic,
  MicOff,
  AudioLines,
  ArrowUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  DollarSign,
  Package,
  Stethoscope,
  FlaskConical,
  Target,
  X
} from 'lucide-react';
import {
  Transaction,
  Doctor,
  SupplyItem,
  TeamGoal,
  TeamMember,
  LabProcedure
} from '../types';
import { UserRole } from '../lib/firebase';
import { canAccessTab } from './Sidebar';

export interface ExecutedActionResult {
  id: string;
  ok: boolean;
  title: string;
  detail: string;
  targetTab?: string;
  targetTabLabel?: string;
}

interface CommandEntry {
  id: string;
  prompt: string;
  reply: string;
  actions: ExecutedActionResult[];
  error?: string;
  timestamp: string;
}

interface CommandHomeProps {
  firstName: string;
  userRole: UserRole;
  linkedDoctorId?: string;
  transactions: Transaction[];
  doctors: Doctor[];
  supplies: SupplyItem[];
  goals: TeamGoal[];
  teamMembers: TeamMember[];
  monthlyGoal: number;
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'> & { date?: string }) => void;
  onDeleteTransaction: (id: string) => void;
  onAddSupplyItem: (item: Omit<SupplyItem, 'id'>) => void;
  onUpdateSupplyItem: (id: string, fields: Partial<SupplyItem>) => void;
  onDeleteSupplyItem: (id: string) => void;
  onAddStock: (id: string, qty: number) => void;
  onRecordPurchaseExpense: (
    description: string,
    value: number,
    customDate?: string,
    supplier?: string,
    subcategory?: string
  ) => void;
  onAddDoctor: (doc: Omit<Doctor, 'id'>) => void;
  onUpdateDoctorTarget: (id: string, target: number) => void;
  onUpdateDoctorStats: (
    id: string,
    stats: { evaluations: number; closures: number; monthlyTarget: number }
  ) => void;
  onSetMonthlyGoal: (val: number) => void;
  onAddGoal: (goal: Omit<TeamGoal, 'id'>) => void;
  onUpdateGoalProgress: (id: string, delta: number) => void;
  onAddMember: (member: Omit<TeamMember, 'id'>) => void;
  onToggleMemberStatus: (id: string, status: 'Ativo' | 'Em plantão' | 'Ausente') => void;
  onNavigate: (tab: string) => void;
  onLabChanged?: () => void;
}

const TAB_LABELS: Record<string, string> = {
  'visao-geral': 'Visão geral',
  financeiro: 'Financeiro',
  doutora: 'Dentistas e escala',
  'metas-equipe': 'Metas e equipe',
  compras: 'Estoque e compras',
  sanitizacao: 'Limpeza e sanitização',
  laboratorio: 'Laboratório',
  utilitarios: 'Documentos e Pix',
  historico: 'Histórico',
  acessos: 'Controle de acessos'
};

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function readLabProcedures(): LabProcedure[] {
  try {
    const raw = localStorage.getItem('clinica_lab_procedures');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLabProcedures(list: LabProcedure[]) {
  try {
    localStorage.setItem('clinica_lab_procedures', JSON.stringify(list));
  } catch (e) {
    console.error('[Lab] Erro ao salvar procedimentos:', e);
  }
}

function renderCleanReplyText(text: string) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return (
    <div className="space-y-1.5 text-[14.5px] leading-relaxed text-[#2D3540]">
      {lines.map((line, i) => {
        const cleaned = line.replace(/^[-*•]\s+/, '');
        const isBullet = /^[-*•]\s+/.test(line.trim());
        const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p
            key={i}
            className={
              isBullet
                ? 'pl-3 relative before:content-["•"] before:absolute before:left-0 before:text-[#8A94A6]'
                : ''
            }
          >
            {parts.map((part, idx) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={idx} className="font-semibold text-[#14181F]">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <React.Fragment key={idx}>{part}</React.Fragment>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

interface QuickTemplate {
  label: string;
  prefix: string;
  icon: React.ElementType;
}

export default function CommandHome({
  firstName,
  userRole,
  linkedDoctorId,
  transactions,
  doctors,
  supplies,
  goals,
  teamMembers,
  monthlyGoal,
  onAddTransaction,
  onDeleteTransaction,
  onAddSupplyItem,
  onUpdateSupplyItem,
  onDeleteSupplyItem,
  onAddStock,
  onRecordPurchaseExpense,
  onAddDoctor,
  onUpdateDoctorTarget,
  onUpdateDoctorStats,
  onSetMonthlyGoal,
  onAddGoal,
  onUpdateGoalProgress,
  onAddMember,
  onToggleMemberStatus,
  onNavigate,
  onLabChanged
}: CommandHomeProps) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [entries, setEntries] = useState<CommandEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup error
      }
    };
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [entries, isProcessing]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [showPlusMenu]);

  const quickTemplates: QuickTemplate[] =
    userRole === 'gestao'
      ? [
          { label: 'Lançar receita', prefix: 'Lançar receita de R$ ', icon: DollarSign },
          { label: 'Lançar despesa', prefix: 'Lançar despesa de R$ ', icon: DollarSign },
          { label: 'Cadastrar ou editar estoque', prefix: 'No estoque, ', icon: Package },
          { label: 'Cadastrar dentista', prefix: 'Cadastrar dentista Dra. ', icon: Stethoscope },
          { label: 'Definir meta', prefix: 'Definir meta mensal em R$ ', icon: Target },
          { label: 'Pedido de laboratório', prefix: 'Criar pedido de laboratório para o paciente ', icon: FlaskConical }
        ]
      : userRole === 'funcionario'
      ? [
          { label: 'Adicionar item no estoque', prefix: 'Cadastrar no estoque ', icon: Package },
          { label: 'Dar baixa no estoque', prefix: 'Dar baixa no estoque de ', icon: Package },
          { label: 'Registrar compra de materiais', prefix: 'Registrar compra de materiais de R$ ', icon: DollarSign },
          { label: 'Pedido de laboratório', prefix: 'Criar pedido de laboratório para o paciente ', icon: FlaskConical }
        ]
      : [
          { label: 'Pedido de laboratório', prefix: 'Criar pedido de laboratório para o paciente ', icon: FlaskConical },
          { label: 'Atualizar avaliações do mês', prefix: 'Atualizar minhas avaliações para ', icon: Stethoscope }
        ];

  const examplePrompts =
    userRole === 'gestao'
      ? [
          'Lançar receita de R$ 450 de limpeza no Pix',
          'Cadastrar 20 caixas de luva M no estoque',
          'Dar baixa em 3 unidades de resina no estoque',
          'Cadastrar dentista Dra. Carla em Ortodontia',
          'Definir meta do mês em R$ 50.000',
          'Quais itens estão com estoque baixo?'
        ]
      : userRole === 'funcionario'
      ? [
          'Cadastrar 15 caixas de máscara no estoque',
          'Dar baixa em 2 caixas de luva M no estoque',
          'Registrar compra de materiais de R$ 380 na Dental Cremer',
          'Criar pedido de coroa no laboratório para Maria Silva',
          'Quais itens estão com estoque baixo?'
        ]
      : [
          'Criar pedido de coroa no laboratório para Maria Silva',
          'Atualizar minhas avaliações do mês para 12 e fechamentos para 8',
          'Abrir tela do laboratório'
        ];

  const toggleVoiceInput = () => {
    setVoiceNotice('');
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceNotice('Seu navegador não suporta comando por voz. Digite seu pedido na barra.');
      setTimeout(() => setVoiceNotice(''), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript);
      };
      recognition.onerror = () => {
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
        inputRef.current?.focus();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Não foi possível iniciar o microfone.');
      setTimeout(() => setVoiceNotice(''), 3500);
    }
  };

  const executeFunctionCall = (
    call: { name: string; args: Record<string, any> },
    labSnapshot: LabProcedure[]
  ): ExecutedActionResult => {
    const id = 'act-' + Math.random().toString(36).slice(2, 9);
    const args = call.args || {};
    const todayStr = new Date().toISOString().split('T')[0];

    switch (call.name) {
      case 'add_transaction': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas o perfil Gestão pode registrar lançamentos financeiros.'
          };
        }
        const value = Number(args.value);
        if (!args.description || Number.isNaN(value) || value <= 0) {
          return {
            id,
            ok: false,
            title: 'Dados incompletos no lançamento',
            detail: 'Informe descrição e valor maior que zero.'
          };
        }
        const type: 'receita' | 'despesa' = args.type === 'despesa' ? 'despesa' : 'receita';
        const category = args.category || (type === 'receita' ? 'Consultas' : 'Outros');
        const doctorName = args.doctorName || 'Administração';
        const paymentMethod = (args.paymentMethod || 'Pix') as Transaction['paymentMethod'];
        const status: 'pago' | 'pendente' = args.status === 'pendente' ? 'pendente' : 'pago';
        const date = args.date || todayStr;

        onAddTransaction({
          description: String(args.description),
          value,
          type,
          category,
          doctorName,
          paymentMethod,
          status,
          date,
          supplier: args.supplier ? String(args.supplier) : undefined
        });

        return {
          id,
          ok: true,
          title: type === 'receita' ? 'Receita registrada' : 'Despesa registrada',
          detail: `${args.description} · ${formatCurrency(value)} · ${category} (${paymentMethod})`,
          targetTab: 'financeiro',
          targetTabLabel: 'Ver no Financeiro'
        };
      }

      case 'delete_transaction': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode excluir lançamentos.'
          };
        }
        const target = transactions.find(t => t.id === args.transactionId);
        if (!target) {
          return {
            id,
            ok: false,
            title: 'Lançamento não encontrado',
            detail: 'Não foi possível localizar o lançamento informado.'
          };
        }
        onDeleteTransaction(target.id);
        return {
          id,
          ok: true,
          title: 'Lançamento excluído',
          detail: `${target.description} (${formatCurrency(target.value)}) removido do financeiro.`,
          targetTab: 'financeiro',
          targetTabLabel: 'Abrir Financeiro'
        };
      }

      case 'add_supply_item': {
        if (userRole === 'dentista') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'O perfil Dentista não altera o estoque.'
          };
        }
        const name = String(args.name || '').trim();
        const stock = Math.max(0, Number(args.stock ?? 0));
        const minStock = Math.max(0, Number(args.minStock ?? 5));
        const unit = String(args.unit || 'un');
        const price = Math.max(0, Number(args.price ?? 0));
        const category = String(args.category || 'Outros');
        if (!name) {
          return {
            id,
            ok: false,
            title: 'Nome do produto ausente',
            detail: 'Não foi possível cadastrar o item sem nome.'
          };
        }

        onAddSupplyItem({
          name,
          category,
          stock,
          minStock,
          unit,
          price,
          supplier: args.supplier ? String(args.supplier) : undefined,
          location: args.location ? String(args.location) : undefined,
          expirationDate: args.expirationDate ? String(args.expirationDate) : undefined,
          batchNumber: args.batchNumber ? String(args.batchNumber) : undefined
        });

        return {
          id,
          ok: true,
          title: 'Item cadastrado no estoque',
          detail: `${name} · ${stock} ${unit} (mín. ${minStock} ${unit})${price > 0 ? ` · ${formatCurrency(price)}` : ''}`,
          targetTab: 'compras',
          targetTabLabel: 'Ver no Estoque'
        };
      }

      case 'update_supply_item': {
        if (userRole === 'dentista') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'O perfil Dentista não altera o estoque.'
          };
        }
        const target = supplies.find(s => s.id === args.itemId);
        if (!target) {
          return {
            id,
            ok: false,
            title: 'Item de estoque não encontrado',
            detail: 'Não localizei esse produto no estoque atual.'
          };
        }
        const updatedFields: Partial<SupplyItem> = {};
        const changes: string[] = [];
        if (args.name !== undefined) {
          updatedFields.name = String(args.name);
          changes.push(`nome: ${args.name}`);
        }
        if (args.category !== undefined) {
          updatedFields.category = String(args.category);
          changes.push(`categoria: ${args.category}`);
        }
        if (args.stock !== undefined) {
          updatedFields.stock = Math.max(0, Number(args.stock));
          changes.push(`quantidade: ${updatedFields.stock} ${args.unit || target.unit}`);
        }
        if (args.minStock !== undefined) {
          updatedFields.minStock = Math.max(0, Number(args.minStock));
          changes.push(`mínimo: ${updatedFields.minStock}`);
        }
        if (args.unit !== undefined) {
          updatedFields.unit = String(args.unit);
        }
        if (args.price !== undefined) {
          updatedFields.price = Math.max(0, Number(args.price));
          changes.push(`preço: ${formatCurrency(updatedFields.price)}`);
        }
        if (args.supplier !== undefined) {
          updatedFields.supplier = String(args.supplier);
          changes.push(`fornecedor: ${args.supplier}`);
        }
        if (args.location !== undefined) {
          updatedFields.location = String(args.location);
          changes.push(`local: ${args.location}`);
        }
        if (args.expirationDate !== undefined) {
          updatedFields.expirationDate = String(args.expirationDate);
          changes.push(`validade: ${args.expirationDate.split('-').reverse().join('/')}`);
        }
        if (args.batchNumber !== undefined) {
          updatedFields.batchNumber = String(args.batchNumber);
          changes.push(`lote: ${args.batchNumber}`);
        }

        onUpdateSupplyItem(target.id, updatedFields);

        return {
          id,
          ok: true,
          title: 'Item de estoque atualizado',
          detail: `${updatedFields.name || target.name}${changes.length > 0 ? ` · ${changes.join(', ')}` : ''}`,
          targetTab: 'compras',
          targetTabLabel: 'Ver no Estoque'
        };
      }

      case 'adjust_supply_stock': {
        if (userRole === 'dentista') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'O perfil Dentista não altera o estoque.'
          };
        }
        const target = supplies.find(s => s.id === args.itemId);
        const delta = Number(args.delta);
        if (!target || Number.isNaN(delta) || delta === 0) {
          return {
            id,
            ok: false,
            title: 'Não foi possível ajustar o estoque',
            detail: 'Item não localizado ou quantidade inválida.'
          };
        }
        const nextStock = Math.max(0, target.stock + delta);
        onAddStock(target.id, delta);
        return {
          id,
          ok: true,
          title: delta > 0 ? 'Entrada registrada no estoque' : 'Baixa registrada no estoque',
          detail: `${target.name}: ${delta > 0 ? `+${delta}` : delta} ${target.unit} (agora ${nextStock} ${target.unit})`,
          targetTab: 'compras',
          targetTabLabel: 'Ver no Estoque'
        };
      }

      case 'delete_supply_item': {
        if (userRole === 'dentista') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'O perfil Dentista não pode remover itens do estoque.'
          };
        }
        const target = supplies.find(s => s.id === args.itemId);
        if (!target) {
          return {
            id,
            ok: false,
            title: 'Item não encontrado',
            detail: 'Não encontrei esse item no estoque.'
          };
        }
        onDeleteSupplyItem(target.id);
        return {
          id,
          ok: true,
          title: 'Item removido do estoque',
          detail: `${target.name} foi excluído da lista de materiais.`,
          targetTab: 'compras',
          targetTabLabel: 'Abrir Estoque'
        };
      }

      case 'record_purchase_expense': {
        if (userRole === 'dentista') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'O perfil Dentista não pode registrar compras de materiais.'
          };
        }
        const value = Number(args.value);
        if (!args.description || Number.isNaN(value) || value <= 0) {
          return {
            id,
            ok: false,
            title: 'Dados incompletos na compra',
            detail: 'Informe descrição e valor da compra.'
          };
        }
        onRecordPurchaseExpense(
          String(args.description),
          value,
          args.date ? String(args.date) : todayStr,
          args.supplier ? String(args.supplier) : undefined,
          args.subcategory ? String(args.subcategory) : undefined
        );
        return {
          id,
          ok: true,
          title: 'Compra de materiais lançada',
          detail: `${args.description} · ${formatCurrency(value)}${args.supplier ? ` · ${args.supplier}` : ''}`,
          targetTab: 'compras',
          targetTabLabel: 'Ver em Compras'
        };
      }

      case 'add_doctor': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode cadastrar dentistas.'
          };
        }
        const name = String(args.name || '').trim();
        if (!name) {
          return {
            id,
            ok: false,
            title: 'Nome da dentista ausente',
            detail: 'Informe o nome da profissional para cadastrar.'
          };
        }
        const specialty = String(args.specialty || 'Clínica Geral');
        const monthlyTarget = Math.max(0, Number(args.monthlyTarget ?? 0));
        onAddDoctor({
          name,
          avatar: '',
          role: String(args.role || 'Dentista'),
          monthlyTarget,
          currentEarnings: 0,
          specialty,
          cro: String(args.cro || 'A informar'),
          email: String(args.email || ''),
          evaluations: 0,
          closures: 0
        });
        return {
          id,
          ok: true,
          title: 'Dentista cadastrada',
          detail: `${name} · ${specialty}${monthlyTarget > 0 ? ` · Meta ${formatCurrency(monthlyTarget)}` : ''}`,
          targetTab: 'doutora',
          targetTabLabel: 'Ver Dentistas'
        };
      }

      case 'update_doctor_target': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode alterar metas das dentistas.'
          };
        }
        const doc = doctors.find(d => d.id === args.doctorId);
        const monthlyTarget = Math.max(0, Number(args.monthlyTarget));
        if (!doc || Number.isNaN(monthlyTarget)) {
          return {
            id,
            ok: false,
            title: 'Dentista não encontrada',
            detail: 'Verifique o nome da dentista cadastrada.'
          };
        }
        onUpdateDoctorTarget(doc.id, monthlyTarget);
        return {
          id,
          ok: true,
          title: 'Meta da dentista atualizada',
          detail: `${doc.name} · Nova meta: ${formatCurrency(monthlyTarget)}`,
          targetTab: 'doutora',
          targetTabLabel: 'Ver Dentistas'
        };
      }

      case 'update_doctor_stats': {
        const doc = doctors.find(d => d.id === args.doctorId);
        if (!doc) {
          return {
            id,
            ok: false,
            title: 'Dentista não encontrada',
            detail: 'Não localizei essa dentista cadastrada.'
          };
        }
        if (userRole === 'dentista' && linkedDoctorId && linkedDoctorId !== doc.id) {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Você só pode atualizar seus próprios indicadores.'
          };
        }
        if (userRole === 'funcionario') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'O perfil Funcionário não altera desempenho de dentistas.'
          };
        }
        const evaluations =
          args.evaluations !== undefined ? Math.max(0, Number(args.evaluations)) : doc.evaluations || 0;
        const closures =
          args.closures !== undefined ? Math.max(0, Number(args.closures)) : doc.closures || 0;
        const monthlyTarget =
          userRole === 'gestao' && args.monthlyTarget !== undefined
            ? Math.max(0, Number(args.monthlyTarget))
            : doc.monthlyTarget;

        onUpdateDoctorStats(doc.id, { evaluations, closures, monthlyTarget });
        return {
          id,
          ok: true,
          title: 'Indicadores da dentista atualizados',
          detail: `${doc.name} · ${evaluations} avaliações · ${closures} fechamentos`,
          targetTab: 'doutora',
          targetTabLabel: 'Ver Desempenho'
        };
      }

      case 'set_monthly_goal': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode definir a meta geral da clínica.'
          };
        }
        const val = Math.max(0, Number(args.value));
        if (Number.isNaN(val)) {
          return {
            id,
            ok: false,
            title: 'Valor inválido',
            detail: 'Informe um valor numérico para a meta.'
          };
        }
        onSetMonthlyGoal(val);
        return {
          id,
          ok: true,
          title: 'Meta mensal da clínica atualizada',
          detail: `Nova meta geral definida em ${formatCurrency(val)}.`,
          targetTab: 'visao-geral',
          targetTabLabel: 'Ver Visão geral'
        };
      }

      case 'add_team_goal': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode criar metas de equipe.'
          };
        }
        const title = String(args.title || '').trim();
        const targetValue = Math.max(0, Number(args.targetValue ?? 0));
        if (!title || targetValue <= 0) {
          return {
            id,
            ok: false,
            title: 'Dados incompletos na meta',
            detail: 'Informe o título e o valor alvo da meta.'
          };
        }
        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 30);
        onAddGoal({
          title,
          targetValue,
          currentValue: Math.max(0, Number(args.currentValue ?? 0)),
          deadline: args.deadline ? String(args.deadline) : defaultDeadline.toISOString().split('T')[0],
          assignedTo: String(args.assignedTo || 'Toda a Equipe')
        });
        return {
          id,
          ok: true,
          title: 'Meta criada',
          detail: `${title} · Alvo: ${targetValue.toLocaleString('pt-BR')} · ${args.assignedTo || 'Toda a Equipe'}`,
          targetTab: 'metas-equipe',
          targetTabLabel: 'Ver Metas'
        };
      }

      case 'update_goal_progress': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode alterar metas.'
          };
        }
        const goal = goals.find(g => g.id === args.goalId);
        const delta = Number(args.progressDelta);
        if (!goal || Number.isNaN(delta)) {
          return {
            id,
            ok: false,
            title: 'Meta não encontrada',
            detail: 'Não foi possível localizar essa meta.'
          };
        }
        onUpdateGoalProgress(goal.id, delta);
        return {
          id,
          ok: true,
          title: 'Progresso da meta atualizado',
          detail: `${goal.title} · ${delta >= 0 ? `+${delta}` : delta} (agora ${(goal.currentValue + delta).toLocaleString('pt-BR')})`,
          targetTab: 'metas-equipe',
          targetTabLabel: 'Ver Metas'
        };
      }

      case 'add_team_member': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode cadastrar membros da equipe.'
          };
        }
        const name = String(args.name || '').trim();
        const role = String(args.role || 'Equipe').trim();
        if (!name) {
          return {
            id,
            ok: false,
            title: 'Nome ausente',
            detail: 'Informe o nome do profissional.'
          };
        }
        const status: TeamMember['status'] =
          args.status === 'Em plantão' || args.status === 'Ausente' ? args.status : 'Ativo';
        onAddMember({ name, role, avatar: '', status });
        return {
          id,
          ok: true,
          title: 'Membro da equipe cadastrado',
          detail: `${name} · ${role} (${status})`,
          targetTab: 'metas-equipe',
          targetTabLabel: 'Ver Equipe'
        };
      }

      case 'update_team_member_status': {
        if (userRole !== 'gestao') {
          return {
            id,
            ok: false,
            title: 'Ação restrita',
            detail: 'Apenas a Gestão pode alterar o status da equipe.'
          };
        }
        const member = teamMembers.find(m => m.id === args.memberId);
        const status: TeamMember['status'] =
          args.status === 'Em plantão' || args.status === 'Ausente' ? args.status : 'Ativo';
        if (!member) {
          return {
            id,
            ok: false,
            title: 'Membro não encontrado',
            detail: 'Não localizei essa pessoa na equipe.'
          };
        }
        onToggleMemberStatus(member.id, status);
        return {
          id,
          ok: true,
          title: 'Status atualizado',
          detail: `${member.name} agora está como "${status}".`,
          targetTab: 'metas-equipe',
          targetTabLabel: 'Ver Equipe'
        };
      }

      case 'add_lab_procedure': {
        const patientName = String(args.patientName || '').trim();
        const laboratoryName = String(args.laboratoryName || 'Laboratório Parceiro').trim();
        if (!patientName) {
          return {
            id,
            ok: false,
            title: 'Nome do paciente ausente',
            detail: 'Informe o nome do paciente para cadastrar o pedido de laboratório.'
          };
        }
        const allowedTypes: LabProcedure['procedureType'][] = [
          'Prótese',
          'Coroa',
          'Faceta',
          'Implante',
          'Onlay/Inlay',
          'Placa Alinhadora/Miorrelaxante',
          'Outro'
        ];
        const procedureType: LabProcedure['procedureType'] = allowedTypes.includes(args.procedureType)
          ? args.procedureType
          : 'Outro';

        const allowedStatuses: LabProcedure['status'][] = [
          'A Enviar',
          'No Laboratório',
          'Recebido',
          'Instalado',
          'Ajuste'
        ];
        const status: LabProcedure['status'] = allowedStatuses.includes(args.status)
          ? args.status
          : 'A Enviar';

        const defaultReturn = new Date();
        defaultReturn.setDate(defaultReturn.getDate() + 7);
        const newProc: LabProcedure = {
          id: 'lab-' + Math.random().toString(36).slice(2, 10),
          patientName,
          procedureType,
          laboratoryName,
          sentDate: todayStr,
          expectedReturnDate: args.expectedReturnDate
            ? String(args.expectedReturnDate)
            : defaultReturn.toISOString().split('T')[0],
          doctorName: String(args.doctorName || doctors[0]?.name || firstName),
          status,
          value: Math.max(0, Number(args.value ?? 0)),
          shade: args.shade ? String(args.shade) : undefined,
          notes: args.notes ? String(args.notes) : undefined
        };

        const updatedList = [newProc, ...labSnapshot];
        labSnapshot.unshift(newProc);
        saveLabProcedures(updatedList);
        onLabChanged?.();

        return {
          id,
          ok: true,
          title: 'Pedido de laboratório cadastrado',
          detail: `${patientName} · ${procedureType} (${laboratoryName}) · ${status}`,
          targetTab: 'laboratorio',
          targetTabLabel: 'Ver no Laboratório'
        };
      }

      case 'update_lab_procedure_status': {
        const allowedStatuses: LabProcedure['status'][] = [
          'A Enviar',
          'No Laboratório',
          'Recebido',
          'Instalado',
          'Ajuste'
        ];
        const idx = labSnapshot.findIndex(p => p.id === args.procedureId);
        if (idx === -1 || !allowedStatuses.includes(args.status)) {
          return {
            id,
            ok: false,
            title: 'Trabalho de laboratório não encontrado',
            detail: 'Não localizei esse pedido no laboratório.'
          };
        }
        const target = labSnapshot[idx];
        const updatedProc: LabProcedure = {
          ...target,
          status: args.status,
          actualReturnDate:
            args.status === 'Recebido' || args.status === 'Instalado' ? todayStr : target.actualReturnDate
        };
        labSnapshot[idx] = updatedProc;
        saveLabProcedures([...labSnapshot]);
        onLabChanged?.();

        return {
          id,
          ok: true,
          title: 'Status do laboratório atualizado',
          detail: `${target.patientName} (${target.procedureType}) → ${args.status}`,
          targetTab: 'laboratorio',
          targetTabLabel: 'Ver no Laboratório'
        };
      }

      case 'navigate_to_tab': {
        const tab = String(args.tab || '');
        if (!TAB_LABELS[tab] || !canAccessTab(userRole, tab)) {
          return {
            id,
            ok: false,
            title: 'Tela indisponível',
            detail: 'Você não tem acesso a essa tela com seu perfil atual.'
          };
        }
        onNavigate(tab);
        return {
          id,
          ok: true,
          title: `Abrindo ${TAB_LABELS[tab]}`,
          detail: 'Você foi direcionado para a tela solicitada.',
          targetTab: tab,
          targetTabLabel: TAB_LABELS[tab]
        };
      }

      default:
        return {
          id,
          ok: false,
          title: 'Comando não reconhecido',
          detail: 'Tente reformular seu pedido com mais detalhes.'
        };
    }
  };

  const handleSubmit = async (customPrompt?: string) => {
    const text = (customPrompt ?? query).trim();
    if (!text || isProcessing) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    setQuery('');
    setShowSuggestions(false);
    setShowPlusMenu(false);
    setIsProcessing(true);

    const labProcedures = readLabProcedures();
    const todayDate = new Date().toISOString().split('T')[0];

    const contextPayload = {
      todayDate,
      userRole,
      linkedDoctorId: linkedDoctorId || null,
      monthlyGoal,
      doctors: doctors.map(d => ({
        id: d.id,
        name: d.name,
        specialty: d.specialty,
        monthlyTarget: d.monthlyTarget,
        currentEarnings: d.currentEarnings,
        evaluations: d.evaluations || 0,
        closures: d.closures || 0
      })),
      supplies: supplies.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        stock: s.stock,
        minStock: s.minStock,
        unit: s.unit,
        price: s.price,
        supplier: s.supplier || '',
        expirationDate: s.expirationDate || ''
      })),
      recentTransactions: transactions.slice(0, 40).map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        value: t.value,
        type: t.type,
        category: t.category,
        doctorName: t.doctorName,
        paymentMethod: t.paymentMethod || 'Pix',
        status: t.status || 'pago'
      })),
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        deadline: g.deadline,
        assignedTo: g.assignedTo
      })),
      teamMembers: teamMembers.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        status: m.status
      })),
      labProcedures: labProcedures.slice(0, 30).map(p => ({
        id: p.id,
        patientName: p.patientName,
        procedureType: p.procedureType,
        laboratoryName: p.laboratoryName,
        doctorName: p.doctorName,
        status: p.status,
        expectedReturnDate: p.expectedReturnDate,
        value: p.value
      }))
    };

    const historyPayload = entries.slice(-4).flatMap(entry => {
      const actionSummary =
        entry.actions.length > 0
          ? entry.actions.map(a => `${a.title}: ${a.detail}`).join(' | ')
          : '';
      const assistantText = [entry.reply, actionSummary].filter(Boolean).join('\n');
      return [
        { role: 'user' as const, text: entry.prompt },
        ...(assistantText ? [{ role: 'assistant' as const, text: assistantText }] : [])
      ];
    });

    const timestamp = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    try {
      const response = await fetch('/api/gemini/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: contextPayload,
          history: historyPayload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setEntries(prev => [
          ...prev,
          {
            id: 'cmd-' + Date.now(),
            prompt: text,
            reply: '',
            actions: [],
            error: data?.error || 'Não foi possível concluir o pedido agora.',
            timestamp
          }
        ]);
        return;
      }

      const calls: Array<{ name: string; args: Record<string, any> }> = Array.isArray(data.functionCalls)
        ? data.functionCalls
        : [];

      const workingLabList = [...labProcedures];
      const executedResults = calls.map(call => executeFunctionCall(call, workingLabList));

      const aiText = typeof data.text === 'string' ? data.text.trim() : '';
      const fallbackReply =
        executedResults.length > 0
          ? executedResults.every(a => a.ok)
            ? executedResults.length === 1
              ? 'Pronto, executei o seu pedido no aplicativo.'
              : `Pronto, executei as ${executedResults.length} ações solicitadas.`
            : 'Algumas ações não puderam ser concluídas. Veja os detalhes abaixo.'
          : 'Não encontrei uma ação específica para executar. Tente dizer o que deseja cadastrar, lançar ou editar.';

      setEntries(prev => [
        ...prev,
        {
          id: 'cmd-' + Date.now(),
          prompt: text,
          reply: aiText || fallbackReply,
          actions: executedResults,
          timestamp
        }
      ]);
    } catch {
      setEntries(prev => [
        ...prev,
        {
          id: 'cmd-' + Date.now(),
          prompt: text,
          reply: '',
          actions: [],
          error: 'Sem conexão com o servidor. Tente novamente em instantes.',
          timestamp
        }
      ]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const renderPillBar = (placeholderText: string) => {
    const hasText = query.trim().length > 0;

    return (
      <div className="relative w-full" ref={plusMenuRef}>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full"
        >
          <div className="flex items-center gap-2 bg-white border border-[#E2E5EA] hover:border-[#D0D5DD] focus-within:border-[#C5CCD6] rounded-full pl-3 pr-2.5 h-[56px] shadow-[0_2px_12px_rgba(15,23,42,0.06)] transition-all">
            {/* Left + quick action button */}
            <button
              type="button"
              onClick={() => setShowPlusMenu(prev => !prev)}
              aria-label="Atalhos de pedidos"
              title="Escolher tipo de pedido"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                showPlusMenu
                  ? 'bg-[#F1F4F7] text-[#14181F]'
                  : 'text-[#14181F] hover:bg-[#F3F4F6]'
              }`}
            >
              <Plus size={20} strokeWidth={1.9} />
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isListening ? 'Ouvindo seu pedido...' : placeholderText}
              disabled={isProcessing}
              className="flex-1 min-w-0 bg-transparent text-[15.5px] text-[#14181F] placeholder:text-[#8E95A0] px-1 focus:outline-none disabled:opacity-60"
              autoComplete="off"
            />

            {/* Right Mic button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={isListening ? 'Parar ditado por voz' : 'Ditar pedido por voz'}
              title={isListening ? 'Parar microfone' : 'Falar pedido'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-[#FEF2F2] text-[#DC2626]'
                  : 'text-[#14181F] hover:bg-[#F3F4F6]'
              }`}
            >
              {isListening ? <MicOff size={19} strokeWidth={1.9} /> : <Mic size={19} strokeWidth={1.9} />}
            </button>

            {/* Right circular primary action button */}
            {hasText ? (
              <button
                type="submit"
                disabled={isProcessing}
                aria-label="Enviar pedido"
                title="Executar pedido"
                className="w-9 h-9 rounded-full bg-[#3795AE] hover:bg-[#2B7E94] disabled:bg-[#CBD5E1] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {isProcessing ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <ArrowUp size={18} strokeWidth={2.2} />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleVoiceInput}
                aria-label="Ativar comando por voz"
                title="Falar comando"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#3795AE] hover:bg-[#2B7E94] text-white'
                }`}
              >
                <AudioLines size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        </form>

        {/* Quick action popover opened by + */}
        {showPlusMenu && (
          <div className="absolute left-0 mt-2 w-72 bg-white border border-[#E6EAF0] rounded-xl shadow-[0_8px_28px_rgba(15,23,42,0.10)] py-1.5 z-30">
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-[#F1F4F7]">
              <span className="text-[12px] font-medium text-[#647082]">Ações rápidas</span>
              <button
                type="button"
                onClick={() => setShowPlusMenu(false)}
                className="text-[#8A94A6] hover:text-[#14181F] p-0.5 cursor-pointer"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>
            <div className="py-1">
              {quickTemplates.map(tpl => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      setQuery(tpl.prefix);
                      setShowPlusMenu(false);
                      setTimeout(() => inputRef.current?.focus(), 20);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-[13.5px] font-medium text-[#14181F] hover:bg-[#F7F8FA] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Icon size={16} className="text-[#3795AE] shrink-0" />
                    <span className="truncate">{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {voiceNotice && (
          <p className="text-center text-[12.5px] text-[#B45309] mt-2.5">{voiceNotice}</p>
        )}
      </div>
    );
  };

  const hasHistory = entries.length > 0 || isProcessing;

  return (
    <div className="w-full min-h-[calc(100dvh-112px)] flex flex-col justify-between bg-white">
      {!hasHistory ? (
        /* ULTRA-MINIMAL BLANK CANVAS MATCHING REFERENCE DESIGN */
        <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 pb-20 pt-6">
          <div className="w-full max-w-[700px] flex flex-col items-center">
            <h1 className="font-display font-normal text-[28px] sm:text-[31px] text-[#14181F] tracking-[-0.02em] text-center mb-7 text-balance">
              Por onde começamos?
            </h1>

            {renderPillBar('Faça um pedido para o sistema')}

            {/* Single centered pill button matching "O que posso perguntar?" */}
            <div className="mt-5 flex flex-col items-center w-full">
              <button
                type="button"
                onClick={() => setShowSuggestions(prev => !prev)}
                className={`px-5 py-2.5 rounded-full border text-[13.5px] font-medium transition-colors cursor-pointer ${
                  showSuggestions
                    ? 'bg-[#F5F7FA] border-[#CBD5E1] text-[#14181F]'
                    : 'bg-white border-[#E2E5EA] hover:border-[#CBD5E1] hover:bg-[#FAFBFD] text-[#14181F]'
                }`}
              >
                O que posso pedir?
              </button>

              {showSuggestions && (
                <div className="mt-4 w-full max-w-[540px] bg-white border border-[#E6EAF0] rounded-xl shadow-[0_6px_24px_rgba(15,23,42,0.06)] divide-y divide-[#F1F4F7] overflow-hidden">
                  {examplePrompts.map(example => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setQuery(example);
                        setShowSuggestions(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full px-4 py-3 text-left text-[13.5px] text-[#2D3540] hover:bg-[#F7F8FA] hover:text-[#14181F] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{example}</span>
                      <ArrowRight size={14} className="text-[#94A0B2] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE COMMAND EXECUTION STREAM + PILL BOTTOM BAR */
        <div className="flex-1 flex flex-col w-full max-w-[700px] mx-auto">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#F1F4F7]">
            <span className="text-[13px] text-[#647082]">Pedidos executados</span>
            <button
              type="button"
              onClick={() => {
                setEntries([]);
                setQuery('');
                setShowSuggestions(false);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#647082] hover:text-[#14181F] transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-[#F3F4F6]"
            >
              <RotateCcw size={13.5} />
              <span>Limpar tela</span>
            </button>
          </div>

          <div className="flex-1 space-y-6 pb-8">
            {entries.map(entry => (
              <div key={entry.id} className="space-y-3">
                {/* User request */}
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[15px] font-semibold text-[#14181F] leading-snug">
                    {entry.prompt}
                  </p>
                  <span className="text-[12px] text-[#94A0B2] tabular-nums shrink-0">
                    {entry.timestamp}
                  </span>
                </div>

                {/* Error message */}
                {entry.error && (
                  <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[13.5px]">
                    <AlertCircle size={17} className="shrink-0 mt-0.5 text-[#DC2626]" />
                    <span>{entry.error}</span>
                  </div>
                )}

                {/* Executed concrete actions */}
                {entry.actions.length > 0 && (
                  <div className="divide-y divide-[#ECEFF3] border border-[#E6EAF0] rounded-xl bg-[#FAFBFD]">
                    {entry.actions.map(action => (
                      <div
                        key={action.id}
                        className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {action.ok ? (
                            <CheckCircle2 size={17} className="text-[#15803D] shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle size={17} className="text-[#B45309] shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-[#14181F]">
                              {action.title}
                            </p>
                            <p className="text-[13px] text-[#525E70] leading-relaxed">
                              {action.detail}
                            </p>
                          </div>
                        </div>

                        {action.ok && action.targetTab && (
                          <button
                            type="button"
                            onClick={() => onNavigate(action.targetTab!)}
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3795AE] hover:text-[#2B7E94] transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center pl-6 sm:pl-0"
                          >
                            <span>{action.targetTabLabel || 'Abrir'}</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Assistant text response */}
                {entry.reply && <div className="pt-0.5">{renderCleanReplyText(entry.reply)}</div>}

                <div className="border-b border-[#F1F4F7] pt-3" />
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2.5 text-[14px] text-[#647082] py-2">
                <Loader2 size={17} className="animate-spin text-[#3795AE]" />
                <span>Executando seu pedido...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Sticky bottom pill bar */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-3 pb-4">
            {renderPillBar('Faça outro pedido...')}
          </div>
        </div>
      )}
    </div>
  );
}
