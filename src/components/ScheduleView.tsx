import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Printer, Edit2, Save, RotateCcw, Check, User, Sparkles, Clock, MapPin, Stethoscope, ChevronRight } from 'lucide-react';
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
    periodLabel: string; // 'Manhã', 'Tarde', 'Noite'
    timeRange: string;   // '08:00 - 12:00', etc.
    days: {
      segunda: ScheduleCell | null;
      terca: ScheduleCell | null;
      quarta: ScheduleCell | null;
      quinta: ScheduleCell | null;
      sexta: ScheduleCell | null;
    };
  }[];
}

const INITIAL_SCHEDULES: RoomSchedule[] = [
  {
    id: 1,
    name: 'CONSULTÓRIO 1',
    shifts: [
      {
        period: 'M',
        periodLabel: 'Manhã',
        timeRange: '08:00 - 12:00',
        days: {
          segunda: { doctor: 'CAMILA' },
          terca: null,
          quarta: null,
          quinta: { doctor: 'MURILO', focus: 'APENAS COROA' },
          sexta: { doctor: 'AMANDA', focus: 'FOCO EM ORTO' }
        }
      },
      {
        period: 'T',
        periodLabel: 'Tarde',
        timeRange: '13:00 - 17:00',
        days: {
          segunda: { doctor: 'CAROL', focus: 'FOCO EM CIRURGIA' },
          terca: { doctor: 'AMANDA', focus: 'FOCO EM CIRURGIA DE IMPLANTE' },
          quarta: { doctor: 'CAROL', focus: 'FOCO EM CIRURGIA' },
          quinta: { doctor: 'MURILO', focus: 'CIRURGIA DE IMPLANTE' },
          sexta: { doctor: 'AMANDA' }
        }
      },
      {
        period: 'N',
        periodLabel: 'Noite',
        timeRange: '18:00 - 21:00',
        days: {
          segunda: { doctor: 'CAROL', focus: 'FOCO EM CIRURGIA' },
          terca: null,
          quarta: { doctor: 'CAROL', focus: 'FOCO EM CIRURGIA' },
          quinta: null,
          sexta: null
        }
      }
    ]
  },
  {
    id: 2,
    name: 'CONSULTÓRIO 2',
    badge: 'SÓ PROCEDIMENTO',
    shifts: [
      {
        period: 'M',
        periodLabel: 'Manhã',
        timeRange: '08:00 - 12:00',
        days: {
          segunda: null,
          terca: { doctor: 'EWELYN', focus: 'FOCO EM ORTO' },
          quarta: { doctor: 'EWELYN', focus: 'FOCO EM ENDO' },
          quinta: null,
          sexta: { doctor: 'EWELYN', focus: 'FOCO EM ENDO' }
        }
      },
      {
        period: 'T',
        periodLabel: 'Tarde',
        timeRange: '13:00 - 17:00',
        days: {
          segunda: { doctor: 'AMANDA', focus: 'FOCO EM ORTO' },
          terca: { doctor: 'EWELYN', focus: 'FOCO EM ORTO' },
          quarta: { doctor: 'AMANDA', focus: 'FOCO EM ORTO' },
          quinta: { doctor: 'CAMILA', focus: 'SÓ PROCEDIMENTO' },
          sexta: { doctor: 'CARLOS' }
        }
      },
      {
        period: 'N',
        periodLabel: 'Noite',
        timeRange: '18:00 - 21:00',
        days: {
          segunda: { doctor: 'AMANDA', focus: 'FOCO EM ORTO' },
          terca: null,
          quarta: null,
          quinta: null,
          sexta: null
        }
      }
    ]
  },
  {
    id: 3,
    name: 'CONSULTÓRIO 3',
    shifts: [
      {
        period: 'M',
        periodLabel: 'Manhã',
        timeRange: '08:00 - 12:00',
        days: {
          segunda: { doctor: 'NICOLE' },
          terca: { doctor: 'AMANDA' },
          quarta: { doctor: 'AMANDA' },
          quinta: { doctor: 'CAMILA' },
          sexta: { doctor: 'CAMILA' }
        }
      },
      {
        period: 'T',
        periodLabel: 'Tarde',
        timeRange: '13:00 - 17:00',
        days: {
          segunda: { doctor: 'NICOLE' },
          terca: { doctor: 'CAROL' },
          quarta: { doctor: 'CAMILA' },
          quinta: { doctor: 'CAROL' },
          sexta: { doctor: 'CAMILA' }
        }
      },
      {
        period: 'N',
        periodLabel: 'Noite',
        timeRange: '18:00 - 21:00',
        days: {
          segunda: null,
          terca: { doctor: 'CAROL' },
          quarta: { doctor: 'CAMILA' },
          quinta: { doctor: 'CAROL' },
          sexta: { doctor: 'CAMILA' }
        }
      }
    ]
  },
  {
    id: 4,
    name: 'CONSULTÓRIO 4',
    shifts: [
      {
        period: 'M',
        periodLabel: 'Manhã',
        timeRange: '08:00 - 12:00',
        days: {
          segunda: { doctor: 'KAREN', focus: 'APENAS AVALIAÇÃO' },
          terca: { doctor: 'KAREN' },
          quarta: { doctor: 'KAREN', focus: 'APENAS AVALIAÇÃO' },
          quinta: { doctor: 'KAREN', focus: 'APENAS AVALIAÇÃO' },
          sexta: { doctor: 'NICOLE' }
        }
      },
      {
        period: 'T',
        periodLabel: 'Tarde',
        timeRange: '13:00 - 17:00',
        days: {
          segunda: { doctor: 'KAREN', focus: 'APENAS AVALIAÇÃO' },
          terca: { doctor: 'KAREN' },
          quarta: { doctor: 'KAREN', focus: 'APENAS AVALIAÇÃO' },
          quinta: { doctor: 'KAREN', focus: 'APENAS AVALIAÇÃO' },
          sexta: { doctor: 'NICOLE' }
        }
      },
      {
        period: 'N',
        periodLabel: 'Noite',
        timeRange: '18:00 - 21:00',
        days: {
          segunda: null,
          terca: null,
          quarta: null,
          quinta: null,
          sexta: null
        }
      }
    ]
  }
];

type DayKey = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta';

interface DayConfig {
  key: DayKey;
  label: string;
  fullName: string;
  badge: string;
}

const DAYS_CONFIG: DayConfig[] = [
  { key: 'segunda', label: 'Segunda', fullName: 'Segunda-feira', badge: 'Início da Semana' },
  { key: 'terca', label: 'Terça', fullName: 'Terça-feira', badge: 'Atendimentos' },
  { key: 'quarta', label: 'Quarta', fullName: 'Quarta-feira', badge: 'Meio da Semana' },
  { key: 'quinta', label: 'Quinta', fullName: 'Quinta-feira', badge: 'Atendimentos' },
  { key: 'sexta', label: 'Sexta', fullName: 'Sexta-feira', badge: 'Encerramento' },
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

  // Default day based on real current day of week (Monday = 1, Friday = 5)
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
  const [filterProcedure, setFilterProcedure] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const [editingCell, setEditingCell] = useState<{
    roomId: number;
    period: 'M' | 'T' | 'N';
    day: DayKey;
  } | null>(null);

  const [editDocName, setEditDocName] = useState('');
  const [editDocFocus, setEditDocFocus] = useState('');

  useEffect(() => {
    localStorage.setItem('sejamais_escala_consultorios', JSON.stringify(schedules));
  }, [schedules]);

  // Extract all unique doctor names for filter
  const allDoctorNames = Array.from(
    new Set(
      schedules.flatMap(room =>
        room.shifts.flatMap(shift =>
          Object.values(shift.days)
            .filter((cell): cell is ScheduleCell => cell !== null)
            .map(cell => cell.doctor.toUpperCase())
        )
      )
    )
  ).sort();

  // Color helper for procedure tags
  const getFocusBadgeStyle = (focus?: string) => {
    if (!focus) return 'bg-gray-100 text-gray-700 border-gray-200';
    const upper = focus.toUpperCase();
    if (upper.includes('CIRURGIA') || upper.includes('IMPLANTE')) {
      return 'bg-purple-100 text-purple-800 border-purple-200 font-bold';
    }
    if (upper.includes('ORTO')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 font-bold';
    }
    if (upper.includes('ENDO')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
    }
    if (upper.includes('AVALIAÇÃO') || upper.includes('AVALIACAO')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
    }
    if (upper.includes('COROA') || upper.includes('PRÓTESE')) {
      return 'bg-cyan-100 text-cyan-800 border-cyan-200 font-bold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
  };

  const handleOpenCellEditor = (roomId: number, period: 'M' | 'T' | 'N', day: DayKey, current: ScheduleCell | null) => {
    if (!isEditing) return;
    setEditingCell({ roomId, period, day });
    setEditDocName(current?.doctor || '');
    setEditDocFocus(current?.focus || '');
  };

  const handleSaveCell = () => {
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
                  ? { doctor: editDocName.trim().toUpperCase(), focus: editDocFocus.trim() || undefined }
                  : null
              }
            };
          })
        };
      })
    );
    setEditingCell(null);
  };

  const handleResetSchedule = () => {
    if (window.confirm('Deseja restaurar a escala original do documento impresso?')) {
      setSchedules(INITIAL_SCHEDULES);
      localStorage.removeItem('sejamais_escala_consultorios');
    }
  };

  const matchesFilter = (cell: ScheduleCell | null) => {
    if (!cell) return false;
    if (filterDoctor !== 'TODOS' && cell.doctor.toUpperCase() !== filterDoctor) return false;
    if (filterProcedure !== 'TODOS') {
      const focusUpper = (cell.focus || '').toUpperCase();
      if (filterProcedure === 'CIRURGIA' && !focusUpper.includes('CIRURGIA') && !focusUpper.includes('IMPLANTE')) return false;
      if (filterProcedure === 'ORTO' && !focusUpper.includes('ORTO')) return false;
      if (filterProcedure === 'ENDO' && !focusUpper.includes('ENDO')) return false;
      if (filterProcedure === 'AVALIACAO' && !focusUpper.includes('AVALIAÇÃO') && !focusUpper.includes('AVALIACAO')) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const docMatch = cell.doctor.toLowerCase().includes(q);
      const focusMatch = (cell.focus || '').toLowerCase().includes(q);
      if (!docMatch && !focusMatch) return false;
    }
    return true;
  };

  // Helper to get stats for a day
  const getDaySummary = (dayKey: DayKey) => {
    const doctors = new Set<string>();
    const procedures = new Set<string>();

    schedules.forEach(room => {
      room.shifts.forEach(shift => {
        const cell = shift.days[dayKey];
        if (cell) {
          doctors.add(cell.doctor);
          if (cell.focus) procedures.add(cell.focus);
        }
      });
    });

    return {
      doctorCount: doctors.size,
      doctorList: Array.from(doctors),
      proceduresList: Array.from(procedures)
    };
  };

  const daysToRender: DayKey[] = selectedDay === 'TODOS'
    ? ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
    : [selectedDay];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Controls Header Bar */}
      <div className="bg-white rounded-2xl border border-level-2 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2d8096]/10 text-[#2d8096] flex items-center justify-center font-bold shadow-2xs">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black font-display text-gray-900 tracking-tight">Escala da Recepção (Por Dia da Semana)</h2>
                <p className="text-xs text-gray-500 font-medium">Identificação rápida de dentistas, consultórios e procedimentos por dia</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Filter Doctor Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
              <User size={13} className="text-gray-400" />
              <select
                value={filterDoctor}
                onChange={e => setFilterDoctor(e.target.value)}
                className="bg-transparent font-bold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos Dentistas</option>
                {allDoctorNames.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            {/* Filter Procedure Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
              <Filter size={13} className="text-gray-400" />
              <select
                value={filterProcedure}
                onChange={e => setFilterProcedure(e.target.value)}
                className="bg-transparent font-bold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todas Especialidades</option>
                <option value="CIRURGIA">Cirurgia / Implante</option>
                <option value="ORTO">Ortodontia</option>
                <option value="ENDO">Endodontia</option>
                <option value="AVALIACAO">Apenas Avaliação</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar dentista..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs rounded-xl pl-8 pr-3 py-1.5 w-32 focus:w-40 transition-all focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20 font-medium"
              />
            </div>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                isEditing 
                  ? 'bg-amber-500 text-white shadow-xs' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {isEditing ? <Save size={13} /> : <Edit2 size={13} />}
              <span>{isEditing ? 'Concluir Edição' : 'Editar Escala'}</span>
            </button>

            {/* Reset Button */}
            {isEditing && (
              <button
                onClick={handleResetSchedule}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                title="Restaurar padrão original da foto"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={() => openPrintWindow('escala-print-area', 'Escala por Dia da Semana - Seja Mais Odontologia')}
              className="px-3 py-1.5 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer size={13} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* DAY SELECTOR TABS (SMART RECEPTION NAVIGATOR) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DAYS_CONFIG.map((day) => {
              const summary = getDaySummary(day.key);
              const isSelected = selectedDay === day.key;

              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedDay(day.key)}
                  className={`px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer min-w-[150px] ${
                    isSelected
                      ? 'bg-[#2d8096] text-white border-[#2d8096] shadow-sm ring-2 ring-[#2d8096]/20'
                      : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase tracking-wider">{day.label}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {summary.doctorCount} Dr.
                    </span>
                  </div>
                  <p className={`text-[10px] font-medium mt-1 truncate ${
                    isSelected ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {summary.doctorList.slice(0, 3).join(', ')}
                    {summary.doctorList.length > 3 ? '...' : ''}
                  </p>
                </button>
              );
            })}

            {/* ALL DAYS / VISÃO SEMANAL COMPLETA */}
            <button
              onClick={() => setSelectedDay('TODOS')}
              className={`px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer min-w-[150px] ${
                selectedDay === 'TODOS'
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm ring-2 ring-gray-900/20'
                  : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-black text-xs uppercase tracking-wider">Ver Semana Toda</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                  selectedDay === 'TODOS' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  5 Dias
                </span>
              </div>
              <p className={`text-[10px] font-medium mt-1 truncate ${
                selectedDay === 'TODOS' ? 'text-white/80' : 'text-gray-500'
              }`}>
                Segunda a Sexta
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN PRINTABLE SCHEDULE SECTION */}
      <div id="escala-print-area" className="space-y-8">
        {daysToRender.map((dayKey) => {
          const config = DAYS_CONFIG.find(d => d.key === dayKey)!;
          const summary = getDaySummary(dayKey);

          return (
            <div
              key={dayKey}
              className="bg-white rounded-2xl border border-[#EBEBED] overflow-hidden transition-all"
            >
              {/* Day Section Header */}
              <div className="bg-[#FAFAFA] px-5 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#EBEBED]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] font-semibold font-display text-xs flex items-center justify-center uppercase shrink-0">
                    {config.label.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold text-sm text-[#18181B]">
                        {config.fullName}
                      </h3>
                      <span className="text-[11px] font-medium bg-[#ECFDF5] text-[#16A34A] px-2 py-0.5 rounded-md tabular-nums">
                        {summary.doctorCount} dentistas no dia
                      </span>
                    </div>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Distribuição nos consultórios 1, 2, 3 e 4
                    </p>
                  </div>
                </div>

                {/* Quick Doctor Badges for Day */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-[#71717A] mr-1">Equipe:</span>
                  {summary.doctorList.map(docName => (
                    <span
                      key={docName}
                      className="bg-white text-[#3F3F46] text-[11px] font-medium px-2.5 py-0.5 rounded-md border border-[#EBEBED]"
                    >
                      Dr(a). {docName}
                    </span>
                  ))}
                </div>
              </div>

              {/* TABLE BY DAY: CONSULTÓRIOS X TURNO */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/90 border-b border-gray-200 text-[11px] text-gray-700 font-black uppercase tracking-wider">
                      <th className="py-3 px-4 w-44 border-r border-gray-200 bg-gray-100/90">
                        Consultório / Sala
                      </th>
                      <th className="py-3 px-4 border-r border-gray-200 text-center w-1/3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock size={13} className="text-amber-600" />
                          <span>MANHÃ (08h - 12h)</span>
                        </div>
                      </th>
                      <th className="py-3 px-4 border-r border-gray-200 text-center w-1/3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock size={13} className="text-blue-600" />
                          <span>TARDE (13h - 17h)</span>
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center w-1/3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock size={13} className="text-purple-600" />
                          <span>NOITE (18h - 21h)</span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 text-xs">
                    {schedules.map((room) => {
                      const morningCell = room.shifts.find(s => s.period === 'M')?.days[dayKey] || null;
                      const afternoonCell = room.shifts.find(s => s.period === 'T')?.days[dayKey] || null;
                      const nightCell = room.shifts.find(s => s.period === 'N')?.days[dayKey] || null;

                      return (
                        <tr key={room.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Consultório Title Header Cell */}
                          <td className="py-4 px-4 border-r border-gray-200 bg-gray-50/70 align-middle">
                            <div className="flex flex-col">
                              <span className="font-display font-black text-xs text-gray-900 uppercase tracking-tight flex items-center gap-1.5">
                                <MapPin size={13} className="text-[#2d8096] shrink-0" />
                                {room.name}
                              </span>
                              {room.badge && (
                                <span className="text-[9px] font-bold text-[#2d8096] bg-[#2d8096]/10 px-2 py-0.5 rounded-md mt-1 w-fit uppercase tracking-wider">
                                  {room.badge}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* MANHÃ CELL */}
                          {renderScheduleCell(room.id, 'M', dayKey, morningCell)}

                          {/* TARDE CELL */}
                          {renderScheduleCell(room.id, 'T', dayKey, afternoonCell)}

                          {/* NOITE CELL */}
                          {renderScheduleCell(room.id, 'N', dayKey, nightCell)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* CELL EDITOR MODAL */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-display font-bold text-sm text-gray-900">Editar Escala de Horário</h4>
                <p className="text-[10px] text-gray-500 font-medium">
                  {editingCell.day.toUpperCase()} • Consultório {editingCell.roomId} • Turno {editingCell.period}
                </p>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome da Doutora / Dentista</label>
                <input
                  type="text"
                  placeholder="Ex: CAMILA, CAROL, AMANDA, MURILO"
                  value={editDocName}
                  onChange={e => setEditDocName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Foco do Atendimento / Procedimento</label>
                <input
                  type="text"
                  placeholder="Ex: FOCO EM CIRURGIA, APENAS AVALIAÇÃO"
                  value={editDocFocus}
                  onChange={e => setEditDocFocus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {['FOCO EM CIRURGIA', 'FOCO EM ORTO', 'FOCO EM ENDO', 'APENAS AVALIAÇÃO', 'CIRURGIA DE IMPLANTE', 'APENAS COROA'].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setEditDocFocus(sug)}
                      className="text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-medium cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveCell}
                className="flex-1 py-2 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check size={14} />
                <span>Salvar Alteração</span>
              </button>
              <button
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLOR LEGEND FOOTER */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-xs space-y-2">
        <span className="font-bold text-gray-700 uppercase text-[10px] tracking-wider block">Legenda das Especialidades e Procedimentos:</span>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
          <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 border border-purple-200">Cirurgia / Implante</span>
          <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200">Ortodontia (Orto)</span>
          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200">Endodontia (Endo)</span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">Apenas Avaliação</span>
          <span className="px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200">Prótese / Coroa</span>
        </div>
      </div>

    </div>
  );

  // Helper render for schedule cell
  function renderScheduleCell(roomId: number, period: 'M' | 'T' | 'N', dayKey: DayKey, cell: ScheduleCell | null) {
    const isHighlighted = matchesFilter(cell);
    const isFilteredActive = (filterDoctor !== 'TODOS' || filterProcedure !== 'TODOS' || searchTerm.trim() !== '');

    return (
      <td
        onClick={() => handleOpenCellEditor(roomId, period, dayKey, cell)}
        className={`py-3.5 px-4 border-r border-gray-200 last:border-r-0 text-center align-middle transition-all relative ${
          isEditing ? 'cursor-pointer hover:bg-amber-50/50' : ''
        } ${
          isFilteredActive && isHighlighted ? 'bg-amber-100/60 ring-2 ring-amber-400 font-bold' : ''
        } ${
          isFilteredActive && !isHighlighted && cell ? 'opacity-30' : ''
        }`}
      >
        {cell ? (
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center gap-1">
              <Stethoscope size={12} className="text-[#2d8096]" />
              <span className="font-black text-gray-900 tracking-tight text-xs uppercase font-display">
                {cell.doctor}
              </span>
            </div>
            {cell.focus && (
              <span className={`text-[9px] px-2 py-0.5 rounded-md border tracking-wider uppercase leading-tight ${getFocusBadgeStyle(cell.focus)}`}>
                ({cell.focus})
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-300 font-bold text-xs select-none">- sem atendimento -</span>
        )}
      </td>
    );
  }
}
