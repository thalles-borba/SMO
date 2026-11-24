/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  Sparkles, 
  CalendarDays, 
  PenTool, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChecklistItem {
  id: string;
  category: string;
  text: string;
  desc: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Esterilização & Autoclave
  {
    id: 'san-1',
    category: 'Esterilização & Autoclave',
    text: 'Registro do ciclo da autoclave',
    desc: 'Registrar data, número do ciclo, temperatura (121°C ou 134°C), pressão e tempo de exposição no livro físico/digital.'
  },
  {
    id: 'san-2',
    category: 'Esterilização & Autoclave',
    text: 'Indicador químico integrado (Classe 5 ou 6)',
    desc: 'Colocar indicador químico interno em cada pacote esterilizado para certificar que a temperatura e o vapor penetraram o envelope.'
  },
  {
    id: 'san-3',
    category: 'Esterilização & Autoclave',
    text: 'Teste biológico semanal',
    desc: 'Inserir ampola de esporos bacterianos (Geobacillus stearothermophilus) na autoclave e incubar por 24/48h para atestar morte microbiana.'
  },
  {
    id: 'san-4',
    category: 'Esterilização & Autoclave',
    text: 'Limpeza interna semanal da autoclave',
    desc: 'Drenar a água antiga, limpar a câmara de aço inox com água destilada e pano que não solte fiapos para evitar oxidação.'
  },

  // Consultórios & Superfícies
  {
    id: 'san-5',
    category: 'Consultórios & Superfícies',
    text: 'Desinfecção de superfícies com Álcool 70%',
    desc: 'Limpar e friccionar álcool 70% em todas as bancadas, braço do refletor, mesa de equipo e cadeira entre cada atendimento.'
  },
  {
    id: 'san-6',
    category: 'Consultórios & Superfícies',
    text: 'Troca de barreiras plásticas de proteção',
    desc: 'Trocar o filme plástico de PVC do refletor, comandos da cadeira, painel de equipo, sugadores e canetas odontológicas a cada paciente.'
  },
  {
    id: 'san-7',
    category: 'Consultórios & Superfícies',
    text: 'Desinfecção e descarga das mangueiras de sucção',
    desc: 'Aspirar solução desinfetante enzimática biodegradável em todas as mangueiras de sugadores ao final do período operacional.'
  },
  {
    id: 'san-8',
    category: 'Consultórios & Superfícies',
    text: 'Limpeza e desinfecção de pias e ralos',
    desc: 'Verificar se as pias de atendimento estão limpas, desobstruídas e sanitizadas com hipoclorito ao final do dia.'
  },

  // EPIs & Higiene da Equipe
  {
    id: 'san-9',
    category: 'EPIs & Higiene da Equipe',
    text: 'Paramentação completa da equipe',
    desc: 'Uso obrigatório de jaleco impermeável, máscara de proteção (PFF2/N95 ou cirúrgica dupla), óculos de segurança, gorro e luvas descartáveis.'
  },
  {
    id: 'san-10',
    category: 'EPIs & Higiene da Equipe',
    text: 'Higienização das mãos (Técnica de 7 passos)',
    desc: 'Lavar as mãos com sabonete antisséptico líquido antes e após calçar as luvas, seguido de aplicação de álcool gel 70%.'
  },
  {
    id: 'san-11',
    category: 'EPIs & Higiene da Equipe',
    text: 'Remoção completa de adornos clínicos',
    desc: 'Garantir que nenhum profissional use anéis, alianças, pulseiras, relógios ou colares durante o atendimento (exigência da NR-32).'
  },

  // Gestão de Resíduos & Perfurocortantes
  {
    id: 'san-12',
    category: 'Gestão de Resíduos & Perfurocortantes',
    text: 'Coleta de lixo biológico (Saco Branco)',
    desc: 'Descartar gases, algodões e luvas contaminadas em lixeira acionada por pedal com saco leitoso identificado de resíduos do Grupo A.'
  },
  {
    id: 'san-13',
    category: 'Gestão de Resíduos & Perfurocortantes',
    text: 'Segurança com Perfurocortantes (Descarpack)',
    desc: 'Verificar se as caixas coletoras estão fixadas em suporte próprio, longe de pias e trocadas antes de atingir a linha limite de 2/3.'
  },
  {
    id: 'san-14',
    category: 'Gestão de Resíduos & Perfurocortantes',
    text: 'Ausência de recapeamento manual de agulhas',
    desc: 'Proibir terminantemente o recapeamento ativo de agulhas com as duas mãos. Usar técnicas de recapeamento passivo ou dispositivo próprio.'
  },

  // Documentação & Licenças
  {
    id: 'san-15',
    category: 'Documentação & Licenças',
    text: 'Exibição de Alvará Sanitário Atualizado',
    desc: 'Manter a licença expedida pela Vigilância Sanitária local em local visível ao público geral na recepção da clínica.'
  },
  {
    id: 'san-16',
    category: 'Documentação & Licenças',
    text: 'Contrato de Coleta de Resíduos (PGRSS)',
    desc: 'Comprovante semestral de destinação final e coleta por empresa certificada de resíduos odontológicos infectantes e químicos.'
  },
  {
    id: 'san-17',
    category: 'Documentação & Licenças',
    text: 'Certificado de controle integrado de pragas',
    desc: 'Certificado de dedetização e desratização anual ou semestral realizado em todas as salas e depósitos da clínica.'
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
  const [cargo, setCargo] = useState('Gerente');
  const [logs, setLogs] = useState<LogAssinatura[]>([]);
  const [successSign, setSuccessSign] = useState<string | null>(null);
  const [viewInfoId, setViewInfoId] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const savedChecks = localStorage.getItem('clinica_sanitizacao_checks');
    if (savedChecks) {
      setCheckedIds(JSON.parse(savedChecks));
    }

    const savedLogs = localStorage.getItem('clinica_sanitizacao_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      // Seed some historic compliance logs
      const seedLogs: LogAssinatura[] = [
        {
          id: 'log-1',
          data: '2024-03-15',
          horario: '18:15',
          responsavel: 'Dra. Ana Silva',
          cargo: 'Gerente / Gestora Clínica',
          conformidade: 100
        },
        {
          id: 'log-2',
          data: '2024-03-16',
          horario: '18:00',
          responsavel: 'Mariana Santos',
          cargo: 'Funcionária / Secretária',
          conformidade: 94
        },
        {
          id: 'log-3',
          data: '2024-03-17',
          horario: '17:45',
          responsavel: 'Dra. Ana Silva',
          cargo: 'Gerente / Gestora Clínica',
          conformidade: 100
        }
      ];
      setLogs(seedLogs);
      localStorage.setItem('clinica_sanitizacao_logs', JSON.stringify(seedLogs));
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

  // Group items by category
  const categories = Array.from(new Set(CHECKLIST_ITEMS.map(item => item.category)));

  const totalItemsCount = CHECKLIST_ITEMS.length;
  const checkedCount = checkedIds.length;
  const compliancePercent = Math.round((checkedCount / totalItemsCount) * 100);

  // Submit Daily Audit Signature
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
      responsavel: responsavelName,
      cargo: cargo === 'Gerente' ? 'Gerente / Gestora Clínica' : 'Funcionária / Auxiliar',
      conformidade: compliancePercent
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('clinica_sanitizacao_logs', JSON.stringify(updatedLogs));

    setSuccessSign(`Auditoria de conformidade sanitária assinada digitalmente por ${responsavelName}!`);
    setTimeout(() => setSuccessSign(null), 5000);

    // Clear form but keep checklist for reference, or reset? Let's keep checklist checked as is
    setResponsavelName('');
  };

  // Delete signature log
  const handleDeleteLog = (id: string) => {
    if (window.confirm("Deseja mesmo excluir este registro de auditoria histórico?")) {
      const updated = logs.filter(l => l.id !== id);
      setLogs(updated);
      localStorage.setItem('clinica_sanitizacao_logs', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full select-none font-sans">
      
      {/* Success Banner */}
      <AnimatePresence>
        {successSign && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-good/10 border border-good text-good text-sm font-bold p-4 rounded-lg flex items-center gap-3 shadow-xs"
          >
            <CheckCircle size={18} />
            <span>{successSign}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stats Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-stretch gap-6">
        
        {/* Compliance Progress Card */}
        <div className="flex-1 bg-white border border-level-2 rounded-card p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          
          {/* Circular compliance visualizer */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="54"
                className="stroke-level-1"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="54"
                className="stroke-primary transition-all duration-700"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - compliancePercent / 100)}`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute text-center">
              <span className="font-mono text-3xl font-bold text-on-surface">{compliancePercent}</span>
              <span className="text-sm font-semibold text-on-surface-variant">%</span>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold mt-0.5">Conforme</p>
            </div>
          </div>

          <div className="space-y-3 text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <ShieldCheck className="text-primary" size={22} />
              <h2 className="font-display font-bold text-lg text-on-surface">Auditoria Sanitária Preventiva</h2>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-lg">
              Checklist oficial obrigatório de rotina para atendimento odontológico clínico segundo regras da <strong className="text-[#3795AE]">Vigilância Sanitária (ANVISA)</strong>. Mantenha os registros sempre assinados e em dia para vistorias oficiais periódicas.
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <button 
                onClick={checkAll}
                className="bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                ✓ Marcar todos como Conforme
              </button>
              <button 
                onClick={resetAll}
                className="border border-outline-variant hover:bg-level-1 text-on-surface-variant font-semibold text-[11px] px-3.5 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Limpar todos
              </button>
            </div>
          </div>
        </div>

        {/* Right side minimalist status card */}
        <div className="w-full md:w-80 bg-white border border-[#EBEBED] rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#3795AE]">Status geral</span>
            <h3 className="font-display font-semibold text-lg text-[#18181B]">
              {compliancePercent === 100
                ? 'Clínica 100% conforme'
                : compliancePercent >= 80
                  ? 'Alto índice de conformidade'
                  : 'Ajustes necessários'}
            </h3>
            <p className="text-xs text-[#71717A] leading-relaxed">
              {compliancePercent === 100
                ? 'Todos os parâmetros de vigilância e esterilização estão conformes para operações e vistorias da ANVISA.'
                : `${checkedCount} de ${totalItemsCount} controles validados hoje. Conclua as pendências antes do encerramento do turno.`}
            </p>
          </div>
          <div className="pt-3 border-t border-[#F1F1F3] flex justify-between items-center text-xs">
            <span className="text-[#71717A]">Último teste biológico</span>
            <span className="bg-[#ECFDF5] text-[#16A34A] px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
              Negativo (OK)
            </span>
          </div>
        </div>
      </div>

      {/* Main List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Side: Category Accordion Checks */}
        <div className="lg:col-span-2 space-y-5">
          {categories.map((cat, catIdx) => {
            const catItems = CHECKLIST_ITEMS.filter(item => item.category === cat);
            const catCheckedCount = catItems.filter(item => checkedIds.includes(item.id)).length;
            const isCatComplete = catCheckedCount === catItems.length;

            return (
              <section key={catIdx} className="bg-white border border-[#EBEBED] rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-[#F1F1F3] pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm text-[#18181B]">{cat}</h3>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md tabular-nums ${isCatComplete ? 'bg-[#ECFDF5] text-[#16A34A]' : 'bg-[#3795AE]/10 text-[#3795AE]'}`}>
                    {catCheckedCount} de {catItems.length} conformes
                  </span>
                </div>

                <div className="divide-y divide-level-1">
                  {catItems.map((item) => {
                    const isChecked = checkedIds.includes(item.id);
                    const isViewingInfo = viewInfoId === item.id;
                    return (
                      <div key={item.id} className="py-3 flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <button 
                            onClick={() => toggleCheck(item.id)}
                            className="mt-0.5 text-primary hover:text-primary-container shrink-0 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="text-primary fill-primary/5" size={19} />
                            ) : (
                              <Square className="text-on-surface-variant hover:text-primary" size={19} />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span 
                                onClick={() => toggleCheck(item.id)}
                                className={`text-xs font-bold leading-normal cursor-pointer ${
                                  isChecked ? 'text-on-surface-variant line-through opacity-85' : 'text-on-surface'
                                }`}
                              >
                                {item.text}
                              </span>
                              <button 
                                onClick={() => setViewInfoId(isViewingInfo ? null : item.id)}
                                className="text-on-surface-variant hover:text-primary cursor-pointer p-0.5"
                                title="Mostrar requisitos e orientações regulatórias detalhadas"
                              >
                                <HelpCircle size={12} className="opacity-60" />
                              </button>
                            </div>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        {/* Interactive info container */}
                        <AnimatePresence>
                          {isViewingInfo && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-level-1/50 border border-level-2 p-3 rounded-lg text-[10px] text-on-surface-variant font-medium space-y-1.5 ml-8 mt-1">
                                <p className="text-primary font-bold">Roteiro Regulatório ANVISA:</p>
                                <p>• O descumprimento deste parâmetro em inspeções oficiais pode acarretar em multas administrativas, advertências ou interdição temporária da sala clínica.</p>
                                <p>• <strong>Evidência Recomendada:</strong> Guarde sempre os envelopes datados e testados por pelo menos 5 anos em arquivo morto de esterilização.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right Side: Log Auditoria & Assinatura */}
        <div className="space-y-6">
          
          {/* Sign Auditoria Daily Audit */}
          <section className="bg-white border border-level-2 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-level-2 pb-3">
              <PenTool className="text-primary" size={17} />
              <h3 className="font-display font-bold text-sm text-on-surface">Assinar Livro de Auditoria</h3>
            </div>
            
            <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
              Ao final do turno, o responsável técnico ou administrativo deve conferir a conformidade sanitária e registrar a assinatura digital de controle no banco de dados.
            </p>

            <form onSubmit={handleSignSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Nome do Responsável</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Santos"
                  value={responsavelName}
                  onChange={(e) => setResponsavelName(e.target.value)}
                  className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Cargo / Função</label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full bg-level-2 border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                >
                  <option value="Gerente">Gerente / Dra. Ana Silva</option>
                  <option value="Funcionaria">Funcionária / Colaborador</option>
                </select>
              </div>

              <div className="bg-level-1/60 p-3 rounded-lg flex items-center justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">Índice Concluído:</span>
                <span className={`font-mono font-bold ${compliancePercent === 100 ? 'text-good' : 'text-primary'}`}>
                  {compliancePercent}% Conforme
                </span>
              </div>

              <button
                type="submit"
                disabled={checkedCount === 0}
                className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  checkedCount > 0
                    ? 'bg-primary hover:bg-primary-container text-on-primary shadow-xs cursor-pointer active:scale-95'
                    : 'bg-level-1 text-on-surface-variant border border-level-2 cursor-not-allowed opacity-65'
                }`}
              >
                <PenTool size={13} />
                <span>Registrar Assinatura Digital</span>
              </button>
            </form>
          </section>

          {/* History of Audit signatures */}
          <section className="bg-white border border-level-2 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-level-2 pb-3">
              <CalendarDays className="text-primary" size={17} />
              <h3 className="font-display font-bold text-sm text-on-surface">Histórico de Assinaturas</h3>
            </div>

            {logs.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant py-4 text-center">Nenhuma assinatura registrada ainda.</p>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 bg-level-1/30 border border-level-2 rounded-lg text-xs relative group">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-on-surface">{log.responsavel}</p>
                        <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5">{log.cargo}</p>
                        <p className="text-[9px] text-on-surface-variant font-mono mt-1">{log.data} às {log.horario}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                          log.conformidade === 100 
                            ? 'bg-good/10 text-good' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {log.conformidade}% OK
                        </span>
                        
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="block text-[10px] text-red-600 hover:underline mt-1.5 font-bold cursor-pointer text-right ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>

    </div>
  );
}
