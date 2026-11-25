import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  Edit2,
  Check,
  RotateCcw,
  Clock,
  Plus,
  X
} from 'lucide-react';
import { openPrintWindow } from '../lib/pdfUtils';

export interface ScheduleCell {
  doctor: string;
  focus?: string;
}

export interface RoomSchedule {
  id: number;
  name: string;
  badge?: string;
  shifts: {
    period: 'M' | 'T' | 'N';
    periodLabel: string;
    timeRange: string;
    days: {
      segunda: ScheduleCell | null;
      terca: ScheduleCell | null;
      quarta: ScheduleCell | null;
      quinta: ScheduleCell | null;
      sexta: ScheduleCell | null;
    };
  }[];
}

const createEmptyRoom = (id: number, name: string): RoomSchedule => ({
  id,
  name,
  shifts: [
    {
      period: 'M',
      periodLabel: 'Manhã',
      timeRange: '08h às 12h',
      days: { segunda: null, terca: null, quarta: null, quinta: null, sexta: null }
    },
    {
      period: 'T',
      periodLabel: 'Tarde',
      timeRange: '13h às 17h',
      days: { segunda: null, terca: null, quarta: null, quinta: null, sexta: null }
    },
    {
      period: 'N',
      periodLabel: 'Noite',
      timeRange: '18h às 21h',
      days: { segunda: null, terca: null, quarta: null, quinta: null, sexta: null }
    }
  ]
});

const INITIAL_SCHEDULES: RoomSchedule[] = [
  createEmptyRoom(1, 'Consultório 1'),
  createEmptyRoom(2, 'Consultório 2'),
  createEmptyRoom(3, 'Consultório 3'),
  createEmptyRoom(4, 'Consultório 4')
];

type DayKey = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta';

interface DayConfig {
  key: DayKey;
  label: string;
  fullName: string;
}

const DAYS_CONFIG: DayConfig[] = [
  { key: 'segunda', label: 'Segunda', fullName: 'Segunda-feira' },
  { key: 'terca', label: 'Terça', fullName: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta', fullName: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta', fullName: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta', fullName: 'Sexta-feira' }
];

const QUICK_FOCUS_SUGGESTIONS = [
  'Clínico geral',
  'Avaliação',
  'Cirurgia / Implante',
  'Ortodontia',
  'Canal (Endo)',
  'Prótese / Coroa'
];

export default function ScheduleView() {
  const [schedules, setSchedules] = useState<RoomSchedule[]>(() => {
    const saved = localStorage.getItem('sejamais_escala_consultorios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading saved schedule:', e);
      }
    }
    return INITIAL_SCHEDULES;
  });

  const getInitialDay = (): DayKey | 'TODOS' => {
    const today = new Date().getDay();
    if (today === 1) return 'segunda';
    if (today === 2) return 'terca';
    if (today === 3) return 'quarta';
    if (today === 4) return 'quinta';
    if (today === 5) return 'sexta';
    return 'segunda';
  };

  const [selectedDay, setSelectedDay] = useState<DayKey | 'TODOS'>(getInitialDay);
  const [filterDoctor, setFilterDoctor] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [editingCell, setEditingCell] = useState<{
    roomId: number;
    roomName: string;
    period: 'M' | 'T' | 'N';
    day: DayKey;
  } | null>(null);

  const [editDocName, setEditDocName] = useState('');
  const [editDocFocus, setEditDocFocus] = useState('');

  useEffect(() => {
    localStorage.setItem('sejamais_escala_consultorios', JSON.stringify(schedules));
  }, [schedules]);

  const allDoctorNames = Array.from(
    new Set(
      schedules.flatMap(room =>
        room.shifts.flatMap(shift =>
          Object.values(shift.days)
            .filter((cell): cell is ScheduleCell => cell !== null)
            .map(cell => cell.doctor)
        )
      )
    )
  ).sort();

  const handleOpenCellEditor = (
    roomId: number,
    roomName: string,
    period: 'M' | 'T' | 'N',
    day: DayKey,
    current: ScheduleCell | null
  ) => {
    if (!isEditing) return;
    setEditingCell({ roomId, roomName, period, day });
    setEditDocName(current?.doctor || '');
    setEditDocFocus(current?.focus || '');
  };

  const handleSaveCell = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingCell) return;
    setSchedules(prev =>
      prev.map(room => {
        if (room.id !== editingCell.roomId) return room;
        return {
          ...room,
          shifts: room.shifts.map(shift => {
            if (shift.period !== editingCell.period) return shift;
            return {
              ...shift,
              days: {
                ...shift.days,
                [editingCell.day]: editDocName.trim()
                  ? { doctor: editDocName.trim(), focus: editDocFocus.trim() || undefined }
                  : null
              }
            };
          })
        };
      })
    );
    setEditingCell(null);
  };

  const handleClearCell = () => {
    if (!editingCell) return;
    setEditDocName('');
    setEditDocFocus('');
    setSchedules(prev =>
      prev.map(room => {
        if (room.id !== editingCell.roomId) return room;
        return {
          ...room,
          shifts: room.shifts.map(shift => {
            if (shift.period !== editingCell.period) return shift;
            return {
              ...shift,
              days: {
                ...shift.days,
                [editingCell.day]: null
              }
            };
          })
        };
      })
    );
    setEditingCell(null);
  };

  const handleResetSchedule = () => {
    if (window.confirm('Deseja limpar toda a escala dos consultórios?')) {
      setSchedules(INITIAL_SCHEDULES);
      localStorage.removeItem('sejamais_escala_consultorios');
    }
  };

  const matchesFilter = (cell: ScheduleCell | null) => {
    if (!cell) return false;
    if (filterDoctor !== 'TODOS' && cell.doctor !== filterDoctor) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const docMatch = cell.doctor.toLowerCase().includes(q);
      const focusMatch = (cell.focus || '').toLowerCase().includes(q);
      if (!docMatch && !focusMatch) return false;
    }
    return true;
  };

  const getDaySummary = (dayKey: DayKey) => {
    const doctors = new Set<string>();
    schedules.forEach(room => {
      room.shifts.forEach(shift => {
        const cell = shift.days[dayKey];
        if (cell) doctors.add(cell.doctor);
      });
    });
    return {
      doctorCount: doctors.size,
      doctorList: Array.from(doctors)
    };
  };

  const daysToRender: DayKey[] =
    selectedDay === 'TODOS' ? ['segunda', 'terca', 'quarta', 'quinta', 'sexta'] : [selectedDay];

  const periodLabelMap = { M: 'Manhã (08h às 12h)', T: 'Tarde (13h às 17h)', N: 'Noite (18h às 21h)' };

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <section className="bg-white rounded-2xl border border-[#E6EAF0] p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-[#14181F]">
              Escala semanal dos consultórios
            </h2>
            <p className="text-sm text-[#647082] mt-0.5">
              Escolha o dia da semana abaixo para ver ou editar quem atende em cada sala.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {allDoctorNames.length > 0 && (
              <select
                value={filterDoctor}
                onChange={e => setFilterDoctor(e.target.value)}
                className="min-h-[42px] bg-[#F7F8FA] border border-[#DCE2EA] rounded-xl px-3.5 py-2 text-sm text-[#14181F] focus:outline-none focus:bg-white focus:border-[#3795AE] cursor-pointer"
              >
                <option value="TODOS">Todas as dentistas</option>
                {allDoctorNames.map(doc => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A0B2]" />
              <input
                type="text"
                placeholder="Buscar dentista..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="min-h-[42px] bg-[#F7F8FA] border border-[#DCE2EA] text-sm rounded-xl pl-10 pr-3.5 py-2 w-44 sm:w-52 focus:outline-none focus:bg-white focus:border-[#3795AE]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`min-h-[42px] px-4 py-2 text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isEditing
                  ? 'bg-[#15803D] hover:bg-[#166534] text-white'
                  : 'bg-[#3795AE] hover:bg-[#2B7E94] text-white'
              }`}
            >
              {isEditing ? <Check size={16} /> : <Edit2 size={15} />}
              <span>{isEditing ? 'Concluir edição' : 'Editar escala'}</span>
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleResetSchedule}
                className="min-h-[42px] px-3.5 py-2 text-sm font-medium text-[#647082] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-[#DCE2EA] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="Limpar escala"
              >
                <RotateCcw size={15} />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                openPrintWindow('escala-print-area', 'Escala dos Consultórios - Seja Mais Odontologia')
              }
              className="min-h-[42px] px-4 py-2 bg-white hover:bg-[#F7F8FA] border border-[#DCE2EA] text-[#374151] text-sm font-medium rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Helpful Editing Instruction Banner */}
        {isEditing && (
          <div className="bg-[#3795AE]/8 border border-[#3795AE]/25 rounded-xl px-4 py-3 text-sm text-[#1F6F85] font-medium">
            Modo de edição ativado: toque em qualquer horário abaixo para colocar ou alterar a dentista daquele turno.
          </div>
        )}

        {/* Day Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {DAYS_CONFIG.map(day => {
            const summary = getDaySummary(day.key);
            const isSelected = selectedDay === day.key;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(day.key)}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer min-w-[130px] ${
                  isSelected
                    ? 'bg-[#3795AE] text-white border-[#3795AE]'
                    : 'bg-[#F7F8FA] hover:bg-[#F1F4F7] border-[#E6EAF0] text-[#374151]'
                }`}
              >
                <div className="font-semibold text-sm">{day.label}</div>
                <div
                  className={`text-xs mt-0.5 tabular-nums ${
                    isSelected ? 'text-white/85' : 'text-[#647082]'
                  }`}
                >
                  {summary.doctorCount === 0
                    ? 'Sem escala'
                    : `${summary.doctorCount} ${summary.doctorCount === 1 ? 'dentista' : 'dentistas'}`}
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedDay('TODOS')}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer min-w-[140px] ${
              selectedDay === 'TODOS'
                ? 'bg-[#14181F] text-white border-[#14181F]'
                : 'bg-[#F7F8FA] hover:bg-[#F1F4F7] border-[#E6EAF0] text-[#374151]'
            }`}
          >
            <div className="font-semibold text-sm">Semana inteira</div>
            <div className={`text-xs mt-0.5 ${selectedDay === 'TODOS' ? 'text-white/80' : 'text-[#647082]'}`}>
              Segunda a Sexta
            </div>
          </button>
        </div>
      </section>

      {/* Main Schedule Area */}
      <div id="escala-print-area" className="space-y-6">
        {daysToRender.map(dayKey => {
          const config = DAYS_CONFIG.find(d => d.key === dayKey)!;
          const summary = getDaySummary(dayKey);

          return (
            <section
              key={dayKey}
              className="bg-white rounded-2xl border border-[#E6EAF0] overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ECEFF3] bg-[#F8FAFC]">
                <div>
                  <h3 className="font-display font-semibold text-base text-[#14181F]">
                    {config.fullName}
                  </h3>
                  <p className="text-[13px] text-[#647082]">
                    {summary.doctorCount > 0
                      ? `Em atendimento: ${summary.doctorList.join(' · ')}`
                      : 'Nenhum atendimento definido ainda para este dia'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#ECEFF3] text-[13px] text-[#647082] font-medium bg-white">
                      <th className="py-3.5 px-6 w-44 border-r border-[#ECEFF3]">Consultório</th>
                      <th className="py-3.5 px-4 border-r border-[#ECEFF3] text-center w-1/3">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-[#3795AE]" />
                          Manhã (08h às 12h)
                        </span>
                      </th>
                      <th className="py-3.5 px-4 border-r border-[#ECEFF3] text-center w-1/3">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-[#3795AE]" />
                          Tarde (13h às 17h)
                        </span>
                      </th>
                      <th className="py-3.5 px-4 text-center w-1/3">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-[#3795AE]" />
                          Noite (18h às 21h)
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#ECEFF3] text-sm">
                    {schedules.map(room => {
                      const morningCell = room.shifts.find(s => s.period === 'M')?.days[dayKey] || null;
                      const afternoonCell = room.shifts.find(s => s.period === 'T')?.days[dayKey] || null;
                      const nightCell = room.shifts.find(s => s.period === 'N')?.days[dayKey] || null;

                      return (
                        <tr key={room.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                          <td className="py-5 px-6 border-r border-[#ECEFF3] bg-[#F8FAFC]/60 font-semibold text-[#14181F] whitespace-nowrap">
                            {room.name}
                          </td>
                          {renderScheduleCell(room.id, room.name, 'M', dayKey, morningCell)}
                          {renderScheduleCell(room.id, room.name, 'T', dayKey, afternoonCell)}
                          {renderScheduleCell(room.id, room.name, 'N', dayKey, nightCell)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* Cell Editor Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-[#14181F]/35 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveCell}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-xl border border-[#E6EAF0]"
          >
            <div className="flex justify-between items-start gap-3">
              <div>
                <h4 className="font-display font-semibold text-lg text-[#14181F]">
                  Definir atendimento
                </h4>
                <p className="text-[13px] text-[#647082] mt-0.5">
                  {DAYS_CONFIG.find(d => d.key === editingCell.day)?.fullName} · {editingCell.roomName} ·{' '}
                  {periodLabelMap[editingCell.period]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="w-9 h-9 rounded-xl text-[#647082] hover:text-[#14181F] hover:bg-[#F1F4F7] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Nome da dentista
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Digite o nome da dentista"
                  value={editDocName}
                  onChange={e => setEditDocName(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Tipo de atendimento <span className="text-[#94A0B2] font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Avaliação, Ortodontia, Cirurgia"
                  value={editDocFocus}
                  onChange={e => setEditDocFocus(e.target.value)}
                  className="w-full min-h-[46px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2.5 text-sm text-[#14181F] focus:outline-none focus:border-[#3795AE]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {QUICK_FOCUS_SUGGESTIONS.map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setEditDocFocus(sug)}
                      className="text-xs bg-[#F1F4F7] hover:bg-[#E6EAF0] text-[#374151] px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              {editDocName && (
                <button
                  type="button"
                  onClick={handleClearCell}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] text-sm font-medium cursor-pointer"
                >
                  Remover
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="flex-1 min-h-[46px] py-2.5 border border-[#DCE2EA] text-[#4B5563] text-sm font-medium rounded-xl hover:bg-[#F7F8FA] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[46px] py-2.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  function renderScheduleCell(
    roomId: number,
    roomName: string,
    period: 'M' | 'T' | 'N',
    dayKey: DayKey,
    cell: ScheduleCell | null
  ) {
    const isHighlighted = matchesFilter(cell);
    const isFilteredActive = filterDoctor !== 'TODOS' || searchTerm.trim() !== '';

    return (
      <td
        onClick={() => handleOpenCellEditor(roomId, roomName, period, dayKey, cell)}
        className={`py-4 px-4 border-r border-[#ECEFF3] last:border-r-0 text-center align-middle transition-colors ${
          isEditing ? 'cursor-pointer hover:bg-[#3795AE]/8' : ''
        } ${isFilteredActive && isHighlighted ? 'bg-[#3795AE]/10' : ''} ${
          isFilteredActive && !isHighlighted && cell ? 'opacity-30' : ''
        }`}
      >
        {cell ? (
          <div className="space-y-1">
            <p className="font-semibold text-[#14181F] text-sm">{cell.doctor}</p>
            {cell.focus && <p className="text-xs text-[#647082]">{cell.focus}</p>}
          </div>
        ) : isEditing ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3795AE] bg-[#3795AE]/8 px-3 py-1.5 rounded-lg">
            <Plus size={14} />
            <span>Definir dentista</span>
          </span>
        ) : (
          <span className="text-xs text-[#94A0B2]">Livre</span>
        )}
      </td>
    );
  }
}
