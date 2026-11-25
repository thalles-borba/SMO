/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  PenTool,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChecklistItem {
  id: string;
  category: string;
  text: string;
  desc: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Esterilização e Autoclave
  {
    id: 'san-1',
    category: 'Esterilização e Autoclave',
    text: 'Registrar o ciclo da autoclave',
    desc: 'Anotar data, número do ciclo, temperatura (121°C ou 134°C), pressão e tempo no caderno ou registro digital.'
  },
  {
    id: 'san-2',
    category: 'Esterilização e Autoclave',
    text: 'Colocar indicador químico nos pacotes',
    desc: 'Conferir se cada pacote esterilizado possui indicador químico interno (Classe 5 ou 6) mudando de cor.'
  },
  {
    id: 'san-3',
    category: 'Esterilização e Autoclave',
    text: 'Teste biológico semanal',
    desc: 'Realizar a ampola semanal na autoclave e incubar por 24/48h conforme rotina.'
  },
  {
    id: 'san-4',
    category: 'Esterilização e Autoclave',
    text: 'Limpeza interna da autoclave',
    desc: 'Trocar a água e limpar a parte interna com água destilada e pano sem fiapos toda semana.'
  },

  // Consultórios e Superfícies
  {
    id: 'san-5',
    category: 'Consultórios e Superfícies',
    text: 'Limpar bancadas e cadeira com Álcool 70%',
    desc: 'Friccionar álcool 70% em bancadas, braço do refletor, mesa de equipo e cadeira entre cada atendimento.'
  },
  {
    id: 'san-6',
    category: 'Consultórios e Superfícies',
    text: 'Trocar barreiras plásticas (PVC)',
    desc: 'Trocar o plástico de proteção do refletor, comandos da cadeira, sugadores e canetas a cada paciente.'
  },
  {
    id: 'san-7',
    category: 'Consultórios e Superfícies',
    text: 'Higienizar mangueiras de sucção',
    desc: 'Passar solução desinfetante enzimática nas mangueiras de sugadores ao fim do turno.'
  },
  {
    id: 'san-8',
    category: 'Consultórios e Superfícies',
    text: 'Limpar pias e ralos dos consultórios',
    desc: 'Confirmar que as pias estão limpas, desobstruídas e higienizadas ao final do dia.'
  },

  // Proteção da Equipe (EPIs)
  {
    id: 'san-9',
    category: 'Proteção da Equipe (EPIs)',
    text: 'Uso completo de EPIs durante atendimentos',
    desc: 'Jaleco, máscara, óculos de proteção, gorro e luvas descartáveis em todos os atendimentos.'
  },
  {
    id: 'san-10',
    category: 'Proteção da Equipe (EPIs)',
    text: 'Higienização correta das mãos',
    desc: 'Lavar as mãos com sabonete antisséptico antes e depois das luvas e finalizar com álcool 70%.'
  },
  {
    id: 'san-11',
    category: 'Proteção da Equipe (EPIs)',
    text: 'Atendimento sem anéis, pulseiras ou relógios',
    desc: 'Garantir que a equipe esteja sem adornos nas mãos e punhos durante o atendimento.'
  },

  // Lixo e Descarte Seguro
  {
    id: 'san-12',
    category: 'Lixo e Descarte Seguro',
    text: 'Lixo contaminado em saco branco identificado',
    desc: 'Descartar gases, algodões e luvas usadas na lixeira de pedal com saco branco leitoso.'
  },
  {
    id: 'san-13',
    category: 'Lixo e Descarte Seguro',
    text: 'Caixa de perfurocortantes dentro do limite',
    desc: 'Conferir se a caixa Descarpack está fixa no suporte e abaixo da linha limite (2/3).'
  },
  {
    id: 'san-14',
    category: 'Lixo e Descarte Seguro',
    text: 'Descarte seguro de agulhas sem recapar com as mãos',
    desc: 'Não recapar agulhas manualmente com as duas mãos; usar o suporte ou descarte direto.'
  },

  // Documentos da Clínica
  {
    id: 'san-15',
    category: 'Documentos da Clínica',
    text: 'Alvará sanitário atualizado e visível',
    desc: 'Manter a licença sanitária em dia e em local visível na recepção.'
  },
  {
    id: 'san-16',
    category: 'Documentos da Clínica',
    text: 'Comprovante de coleta de resíduos em dia',
    desc: 'Confirmar que o contrato e os comprovantes de coleta especializada estão atualizados.'
  },
  {
    id: 'san-17',
    category: 'Documentos da Clínica',
    text: 'Certificado de dedetização válido',
    desc: 'Verificar se o controle de pragas da clínica está dentro da validade.'
  }
];

interface LogAssinatura {
  id: string;
  data: string;
  horario: string;
  responsavel: string;
  cargo: string;
  conformidade: number;
}

export default function Sanitizacao() {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [responsavelName, setResponsavelName] = useState('');
  const [cargo, setCargo] = useState('Funcionário');
  const [logs, setLogs] = useState<LogAssinatura[]>([]);
  const [successSign, setSuccessSign] = useState<string | null>(null);
  const [viewInfoId, setViewInfoId] = useState<string | null>(null);

  useEffect(() => {
    const savedChecks = localStorage.getItem('clinica_sanitizacao_checks');
    if (savedChecks) {
      try {
        setCheckedIds(JSON.parse(savedChecks));
      } catch {
        setCheckedIds([]);
      }
    }

    const savedLogs = localStorage.getItem('clinica_sanitizacao_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch {
        setLogs([]);
      }
    }
  }, []);

  const toggleCheck = (id: string) => {
    const updated = checkedIds.includes(id)
      ? checkedIds.filter(item => item !== id)
      : [...checkedIds, id];
    setCheckedIds(updated);
    localStorage.setItem('clinica_sanitizacao_checks', JSON.stringify(updated));
  };

  const checkAll = () => {
    const allIds = CHECKLIST_ITEMS.map(item => item.id);
    setCheckedIds(allIds);
    localStorage.setItem('clinica_sanitizacao_checks', JSON.stringify(allIds));
  };

  const resetAll = () => {
    setCheckedIds([]);
    localStorage.setItem('clinica_sanitizacao_checks', JSON.stringify([]));
  };

  const categories = Array.from(new Set(CHECKLIST_ITEMS.map(item => item.category)));
  const totalItemsCount = CHECKLIST_ITEMS.length;
  const checkedCount = checkedIds.length;
  const compliancePercent = Math.round((checkedCount / totalItemsCount) * 100);

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsavelName.trim()) return;

    const dataObj = new Date();
    const dataFormatted = dataObj.toISOString().split('T')[0];
    const horarioFormatted = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newLog: LogAssinatura = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      data: dataFormatted,
      horario: horarioFormatted,
      responsavel: responsavelName.trim(),
      cargo,
      conformidade: compliancePercent
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('clinica_sanitizacao_logs', JSON.stringify(updatedLogs));

    setSuccessSign(`Conferência de hoje assinada por ${responsavelName.trim()}!`);
    setTimeout(() => setSuccessSign(null), 5000);
    setResponsavelName('');
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Deseja excluir este registro de assinatura?')) {
      const updated = logs.filter(l => l.id !== id);
      setLogs(updated);
      localStorage.setItem('clinica_sanitizacao_logs', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-7 sm:space-y-8 w-full select-none font-sans">
      {/* Success Banner */}
      <AnimatePresence>
        {successSign && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] text-sm font-semibold px-5 py-4 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle size={20} className="shrink-0" />
            <span>{successSign}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Step-by-Step Progress Card */}
      <section className="bg-white border border-[#E6EAF0] rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-[#14181F]">
                Conferência diária de limpeza e biossegurança
              </h2>
              <p className="text-sm text-[#647082]">
                Toque nos itens abaixo conforme for conferindo e assine ao final do dia.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1 max-w-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#374151] tabular-nums">
                {checkedCount} de {totalItemsCount} itens conferidos
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  compliancePercent === 100
                    ? 'text-[#15803D]'
                    : compliancePercent >= 60
                    ? 'text-[#3795AE]'
                    : 'text-[#B45309]'
                }`}
              >
                {compliancePercent}% concluído
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#F1F4F7] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  compliancePercent === 100 ? 'bg-[#15803D]' : 'bg-[#3795AE]'
                }`}
                style={{ width: `${compliancePercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={checkAll}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Marcar todos
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-[#F7F8FA] border border-[#DCE2EA] text-[#4B5563] text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw size={15} />
            <span>Desmarcar todos</span>
          </button>
        </div>
      </section>

      {/* Main Content: Spacious Checklist + Signature Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
        {/* Left 8 columns: Clean Categorized Checklist */}
        <div className="xl:col-span-8 space-y-6">
          {categories.map(category => {
            const items = CHECKLIST_ITEMS.filter(item => item.category === category);
            const doneInCat = items.filter(i => checkedIds.includes(i.id)).length;

            return (
              <section key={category} className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ECEFF3] flex items-center justify-between gap-3 bg-[#F8FAFC]">
                  <h3 className="font-display font-semibold text-[15.5px] text-[#14181F]">
                    {category}
                  </h3>
                  <span className="text-[13px] font-medium text-[#647082] tabular-nums">
                    {doneInCat} de {items.length} feitos
                  </span>
                </div>

                <div className="divide-y divide-[#ECEFF3]">
                  {items.map(item => {
                    const isChecked = checkedIds.includes(item.id);
                    const isInfoOpen = viewInfoId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`transition-colors ${isChecked ? 'bg-[#F8FCFA]' : 'bg-white'}`}
                      >
                        <div className="px-5 sm:px-6 py-4 flex items-start gap-4">
                          <button
                            type="button"
                            onClick={() => toggleCheck(item.id)}
                            className="flex-1 flex items-start gap-3.5 text-left cursor-pointer min-w-0"
                          >
                            <span className="mt-0.5 shrink-0">
                              {isChecked ? (
                                <CheckSquare size={22} className="text-[#15803D]" />
                              ) : (
                                <Square size={22} className="text-[#94A0B2]" />
                              )}
                            </span>
                            <span
                              className={`text-[15px] leading-snug ${
                                isChecked
                                  ? 'text-[#647082] line-through'
                                  : 'text-[#14181F] font-medium'
                              }`}
                            >
                              {item.text}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewInfoId(isInfoOpen ? null : item.id)}
                            className="shrink-0 h-9 px-2.5 rounded-lg text-xs font-medium text-[#647082] hover:text-[#3795AE] hover:bg-[#F1F4F7] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ver orientação"
                          >
                            <HelpCircle size={15} />
                            <span className="hidden sm:inline">Como fazer</span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${isInfoOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>

                        {isInfoOpen && (
                          <div className="px-6 pb-4 pl-14 text-[13.5px] text-[#4B5563] leading-relaxed">
                            {item.desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right 4 columns: Signature Form + Signed History */}
        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white border border-[#E6EAF0] rounded-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
                <PenTool size={18} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base text-[#14181F]">
                  Assinar conferência de hoje
                </h3>
                <p className="text-[13px] text-[#647082] mt-0.5">
                  Salve quem fez a verificação hoje para manter o histórico em dia.
                </p>
              </div>
            </div>

            <form onSubmit={handleSignSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Seu nome
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite seu nome completo"
                  value={responsavelName}
                  onChange={e => setResponsavelName(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:border-[#3795AE]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Sua função
                </label>
                <select
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-3.5 py-2.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE]"
                >
                  <option value="Funcionário">Funcionário</option>
                  <option value="Dentista">Dentista</option>
                  <option value="Gestão">Gestão</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Registrar assinatura de hoje ({compliancePercent}%)
              </button>
            </form>
          </section>

          {/* Signed History */}
          <section className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ECEFF3] flex items-center justify-between">
              <h3 className="font-display font-semibold text-[15px] text-[#14181F]">
                Últimas assinaturas
              </h3>
              <span className="text-xs text-[#647082] tabular-nums">{logs.length} registros</span>
            </div>

            <div className="divide-y divide-[#ECEFF3] max-h-[380px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#647082]">
                  Nenhuma conferência assinada ainda.
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="px-6 py-4 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14181F] truncate">{log.responsavel}</p>
                      <p className="text-xs text-[#647082] tabular-nums">
                        {log.data.split('-').reverse().join('/')} às {log.horario} · {log.cargo}
                      </p>
                      <p
                        className={`text-xs font-semibold tabular-nums ${
                          log.conformidade === 100 ? 'text-[#15803D]' : 'text-[#B45309]'
                        }`}
                      >
                        {log.conformidade}% dos itens conferidos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="w-9 h-9 rounded-lg text-[#94A0B2] hover:text-[#DC2626] hover:bg-[#FEF2F2] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Excluir assinatura"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
