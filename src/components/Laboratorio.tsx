/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LabProcedure, Doctor } from '../types';
import { jsPDF } from 'jspdf';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  User, 
  FlaskConical, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  DollarSign, 
  Clock, 
  HelpCircle, 
  RefreshCw,
  Clipboard,
  ShieldAlert,
  Archive,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileDown,
  Printer,
  Download,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadElementAsPDF, openPrintWindow, sharePDFToWhatsApp } from '../lib/pdfUtils';
import { ClinicLogo } from './Sidebar';

interface LaboratorioProps {
  doctors: Doctor[];
}

const INITIAL_LAB_PROCEDURES: LabProcedure[] = [
  {
    id: 'lab-1',
    patientName: 'Roberto Alencar',
    procedureType: 'Coroa',
    laboratoryName: 'Premium Dental Lab',
    sentDate: '2026-07-10',
    expectedReturnDate: '2026-07-20',
    doctorName: 'Dra. Camila Souza',
    status: 'No Laboratório',
    value: 450,
    notes: 'Coroa metalocerâmica dente 36.',
    shade: 'A2'
  },
  {
    id: 'lab-2',
    patientName: 'Maria Antônia',
    procedureType: 'Faceta',
    laboratoryName: 'Estética Oral Lab',
    sentDate: '2026-07-15',
    expectedReturnDate: '2026-07-24',
    doctorName: 'Dra. Beatriz Lima',
    status: 'No Laboratório',
    value: 1200,
    notes: '4 facetas em cerâmica nos dentes 12, 11, 21, 22. Cimentação agendada.',
    shade: 'A1 (E-Max)'
  },
  {
    id: 'lab-3',
    patientName: 'Carlos Eduardo',
    procedureType: 'Implante',
    laboratoryName: 'Titanium Pro Lab',
    sentDate: '2026-07-01',
    expectedReturnDate: '2026-07-12',
    actualReturnDate: '2026-07-10',
    doctorName: 'Dra. Camila Souza',
    status: 'Recebido',
    value: 850,
    notes: 'Pilar e coroa sobre implante dente 46. Validação clínica OK.',
    shade: 'A3'
  },
  {
    id: 'lab-4',
    patientName: 'Juliana Paes',
    procedureType: 'Prótese',
    laboratoryName: 'Art & Dente Próteses',
    sentDate: '2026-07-16',
    expectedReturnDate: '2026-07-28',
    doctorName: 'Dra. Fernanda Costa',
    status: 'A Enviar',
    value: 600,
    notes: 'Prótese parcial removível superior. Enviar modelo com grampos.',
    shade: 'Bleach BL2'
  },
  {
    id: 'lab-5',
    patientName: 'Pedro Cavalcanti',
    procedureType: 'Onlay/Inlay',
    laboratoryName: 'Premium Dental Lab',
    sentDate: '2026-06-25',
    expectedReturnDate: '2026-07-05',
    actualReturnDate: '2026-07-04',
    doctorName: 'Dra. Fernanda Costa',
    status: 'Instalado',
    value: 350,
    notes: 'Onlay em cerômero dente 26 cimentada. Paciente satisfeito.',
    shade: 'A2'
  },
  {
    id: 'lab-6',
    patientName: 'Gisela Prado',
    procedureType: 'Placa Alinhadora/Miorrelaxante',
    laboratoryName: 'OrthoAligner Tech',
    sentDate: '2026-07-02',
    expectedReturnDate: '2026-07-11',
    doctorName: 'Dra. Beatriz Lima',
    status: 'Ajuste',
    value: 280,
    notes: 'Placa miorrelaxante para bruxismo dente superior. Ajustar oclusão dente 16.',
    shade: 'Transparente'
  }
];

const COLUMNS: { id: LabProcedure['status']; label: string; bg: string; border: string; text: string; ring: string }[] = [
  { id: 'A Enviar', label: 'A Enviar (Moldagem)', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', ring: 'ring-slate-400' },
  { id: 'No Laboratório', label: 'No Laboratório', bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-800', ring: 'ring-amber-500' },
  { id: 'Recebido', label: 'Recebido na Clínica', bg: 'bg-indigo-50/40', border: 'border-indigo-200', text: 'text-indigo-800', ring: 'ring-indigo-500' },
  { id: 'Ajuste', label: 'Ajuste / Correção', bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-800', ring: 'ring-rose-500' },
  { id: 'Instalado', label: 'Instalado (Finalizado)', bg: 'bg-emerald-50/40', border: 'border-emerald-200', text: 'text-emerald-800', ring: 'ring-emerald-500' }
];

export default function Laboratorio({ doctors }: LaboratorioProps) {
  const [procedures, setProcedures] = useState<LabProcedure[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [laboratoryFilter, setLaboratoryFilter] = useState('Todos');

  // Interactive Kanban expansion state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<LabProcedure | null>(null);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [termoPatientName, setTermoPatientName] = useState('Juliana Paes');
  const [termoProsthesisType, setTermoProsthesisType] = useState('Prótese Parcial Removível Superior');
  const [termoDoctorName, setTermoDoctorName] = useState('Dra. Karen Borba');
  const [termoDate, setTermoDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [isGeneratingTermoPDF, setIsGeneratingTermoPDF] = useState(false);
  const [isSendingTermoWhatsApp, setIsSendingTermoWhatsApp] = useState(false);

  const handleShareTermoWhatsApp = async () => {
    setIsSendingTermoWhatsApp(true);
    const cleanPatient = (termoPatientName || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Termo_Ciencia_Laboratorio_${cleanPatient}.pdf`;

    const messageText = `*Termo de Ciência de Entrega do Trabalho de Prótese / Laboratório*

*Clínica:* Seja Mais Odontologia
*Paciente:* ${termoPatientName}
*Trabalho Protético:* ${termoProsthesisType}
*Doutor(a) Responsável:* ${termoDoctorName}
*Data:* ${termoDate}

Agradecemos pela preferência e cuidado com sua saúde bucal!`;

    await sharePDFToWhatsApp({
      elementId: 'termo-print-area',
      filename,
      phone: '11999999999', // default patient contact
      textMessage: messageText
    });

    setIsSendingTermoWhatsApp(false);
  };

  const handleDownloadTermoPDF = async () => {
    setIsGeneratingTermoPDF(true);
    const cleanPatient = (termoPatientName || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Termo_Ciencia_Laboratorio_${cleanPatient}.pdf`;
    const success = await downloadElementAsPDF('termo-print-area', filename);
    if (!success) {
      openPrintWindow('termo-print-area', `Termo de Ciência - ${termoPatientName}`);
    }
    setIsGeneratingTermoPDF(false);
  };
  const [procedureType, setProcedureType] = useState<LabProcedure['procedureType']>('Coroa');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [sentDate, setSentDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [actualReturnDate, setActualReturnDate] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [status, setStatus] = useState<LabProcedure['status']>('A Enviar');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [shade, setShade] = useState('');

  // Toast / notification
  const [notification, setNotification] = useState<string | null>(null);

  // Load procedures
  useEffect(() => {
    const saved = localStorage.getItem('clinica_lab_procedures');
    if (saved) {
      try {
        setProcedures(JSON.parse(saved));
      } catch (e) {
        setProcedures(INITIAL_LAB_PROCEDURES);
      }
    } else {
      setProcedures(INITIAL_LAB_PROCEDURES);
      localStorage.setItem('clinica_lab_procedures', JSON.stringify(INITIAL_LAB_PROCEDURES));
    }
  }, []);

  const saveProcedures = (updated: LabProcedure[]) => {
    setProcedures(updated);
    localStorage.setItem('clinica_lab_procedures', JSON.stringify(updated));
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to check delay
  const isDelayed = (expectedDate: string, currentStatus: LabProcedure['status']) => {
    if (['Recebido', 'Instalado'].includes(currentStatus)) return false;
    const today = new Date().toISOString().split('T')[0];
    return expectedDate < today;
  };

  // Calculate stats
  const totalInProduction = procedures.filter(p => p.status === 'No Laboratório').length;
  const totalValueFiltered = procedures.reduce((sum, p) => sum + p.value, 0);
  const delayedCount = procedures.filter(p => isDelayed(p.expectedReturnDate, p.status)).length;
  const receivedThisMonth = procedures.filter(p => p.status === 'Recebido').length;

  // Add Procedure handler
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !laboratoryName.trim() || !sentDate || !expectedReturnDate) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const defaultDoctor = doctorName || (doctors[0] ? doctors[0].name : 'Dra. Camila Souza');

    const newProcedure: LabProcedure = {
      id: 'lab-' + Math.random().toString(36).substr(2, 9),
      patientName: patientName.trim(),
      procedureType,
      laboratoryName: laboratoryName.trim(),
      sentDate,
      expectedReturnDate,
      doctorName: defaultDoctor,
      status,
      value: parseFloat(value) || 0,
      notes: notes.trim(),
      shade: shade.trim() || undefined
    };

    const updated = [newProcedure, ...procedures];
    saveProcedures(updated);
    setShowAddModal(false);
    clearForm();
    showToast(`Procedimento para o paciente ${newProcedure.patientName} criado com sucesso!`);
  };

  // Edit Procedure loader
  const openEditModal = (procedure: LabProcedure) => {
    setSelectedProcedure(procedure);
    setPatientName(procedure.patientName);
    setProcedureType(procedure.procedureType);
    setLaboratoryName(procedure.laboratoryName);
    setSentDate(procedure.sentDate);
    setExpectedReturnDate(procedure.expectedReturnDate);
    setActualReturnDate(procedure.actualReturnDate || '');
    setDoctorName(procedure.doctorName);
    setStatus(procedure.status);
    setValue(procedure.value.toString());
    setNotes(procedure.notes || '');
    setShade(procedure.shade || '');
    setShowEditModal(true);
  };

  // Save Edit handler
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcedure) return;

    const updatedProcedures = procedures.map(p => {
      if (p.id === selectedProcedure.id) {
        return {
          ...p,
          patientName: patientName.trim(),
          procedureType,
          laboratoryName: laboratoryName.trim(),
          sentDate,
          expectedReturnDate,
          actualReturnDate: status === 'Recebido' || status === 'Instalado' 
            ? (actualReturnDate || new Date().toISOString().split('T')[0]) 
            : undefined,
          doctorName,
          status,
          value: parseFloat(value) || 0,
          notes: notes.trim(),
          shade: shade.trim() || undefined
        };
      }
      return p;
    });

    saveProcedures(updatedProcedures);
    setShowEditModal(false);
    setSelectedProcedure(null);
    clearForm();
    showToast("Alterações do procedimento salvas com sucesso!");
  };

  // Delete handler
  const handleDelete = (id: string) => {
    if (window.confirm("Deseja realmente remover este procedimento do painel de laboratório?")) {
      const updated = procedures.filter(p => p.id !== id);
      saveProcedures(updated);
      setShowEditModal(false);
      setSelectedProcedure(null);
      clearForm();
      showToast("Procedimento removido.");
    }
  };

  // Clear Form fields
  const clearForm = () => {
    setPatientName('');
    setProcedureType('Coroa');
    setLaboratoryName('');
    setSentDate(new Date().toISOString().split('T')[0]);
    // Default expected date 7 days from now
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    setExpectedReturnDate(sevenDaysLater.toISOString().split('T')[0]);
    setActualReturnDate('');
    setDoctorName(doctors[0] ? doctors[0].name : 'Dra. Camila Souza');
    setStatus('A Enviar');
    setValue('');
    setNotes('');
    setShade('');
  };

  // Move card left/right or change status manually
  const moveCardStatus = (id: string, currentStatus: LabProcedure['status'], direction: 'next' | 'prev') => {
    const statusOrder: LabProcedure['status'][] = ['A Enviar', 'No Laboratório', 'Recebido', 'Ajuste', 'Instalado'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    let newIndex = currentIndex;
    if (direction === 'next' && currentIndex < statusOrder.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }

    if (newIndex !== currentIndex) {
      const nextStatus = statusOrder[newIndex];
      const updated = procedures.map(p => {
        if (p.id === id) {
          const retDate = (nextStatus === 'Recebido' || nextStatus === 'Instalado') 
            ? new Date().toISOString().split('T')[0] 
            : p.actualReturnDate;
          return { ...p, status: nextStatus, actualReturnDate: retDate };
        }
        return p;
      });
      saveProcedures(updated);
      showToast(`Procedimento movido para "${nextStatus}"`);
    }
  };

  // Fast direct status change dropdown inside card
  const changeCardStatusDirect = (id: string, nextStatus: LabProcedure['status']) => {
    const updated = procedures.map(p => {
      if (p.id === id) {
        const retDate = (nextStatus === 'Recebido' || nextStatus === 'Instalado') 
          ? new Date().toISOString().split('T')[0] 
          : undefined;
        return { ...p, status: nextStatus, actualReturnDate: retDate };
      }
      return p;
    });
    saveProcedures(updated);
    showToast(`Status alterado para "${nextStatus}"`);
  };

  // Generate a beautiful, clinic-branded PDF Order Form for partner labs
  const generatePDF = (proc: LabProcedure) => {
    // Initialize A4 PDF: portrait, millimeters, a4
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const formatDateBR = (dateStr?: string) => {
      if (!dateStr) return 'Não informada';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    // Color definitions
    const primaryColor = [55, 149, 174]; // #3795AE (Teal)
    const darkColor = [31, 41, 55]; // #1F2937 (Charcoal)
    const lightColor = [243, 244, 246]; // #F3F4F6 (Soft gray)
    const grayColor = [107, 114, 128]; // #6B7280 (Gray)
    const highlightBg = [230, 245, 249]; // Soft teal bg for shade

    const marginX = 20;
    let currentY = 15;

    // --- HEADER / LOGO ---
    // Draw logo symbol (Stylized tooth / clinic geometric emblem)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    // Rounded circle for logo backdrop
    doc.ellipse(marginX + 8, currentY + 10, 8, 8, 'F');
    
    // Draw a stylized white tooth shape inside the emblem using lines
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    // Draw crown and roots (tooth outline)
    doc.line(marginX + 6, currentY + 7, marginX + 10, currentY + 7); // top
    doc.line(marginX + 10, currentY + 7, marginX + 11, currentY + 11); // right
    doc.line(marginX + 11, currentY + 11, marginX + 9, currentY + 14); // root right
    doc.line(marginX + 9, currentY + 14, marginX + 8, currentY + 12); // root indent
    doc.line(marginX + 8, currentY + 12, marginX + 7, currentY + 14); // root left
    doc.line(marginX + 7, currentY + 14, marginX + 5, currentY + 11); // root left up
    doc.line(marginX + 5, currentY + 11, marginX + 6, currentY + 7); // left up

    // Clinic Branding Text
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Seja Mais Odontologia', marginX + 20, currentY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('Sorrisos que inspiram | Gestão Integrada de Próteses', marginX + 20, currentY + 13);
    doc.text('Telefone: (11) 3254-9889 | contato@sejamaisodontologia.com.br', marginX + 20, currentY + 17);

    // Decorative horizontal header bar
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY + 22, 210 - marginX, currentY + 22);

    currentY += 30;

    // --- TITLE OF DOCUMENT ---
    doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
    doc.rect(marginX, currentY, 210 - (marginX * 2), 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('PEDIDO DE TRABALHO DE LABORATÓRIO / ORDEM DE SERVIÇO', 210 / 2, currentY + 8, { align: 'center' });

    currentY += 18;

    // --- SECTION 1: DETALHES GERAIS (Table Layout) ---
    // Table border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    
    // Rows
    const drawRow = (label1: string, val1: string, label2: string, val2: string, yPos: number) => {
      // Row Background for Labels
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX, yPos, 40, 9, 'F');
      doc.rect(marginX + 85, yPos, 40, 9, 'F');
      
      // Outer border box
      doc.rect(marginX, yPos, 210 - (marginX * 2), 9, 'S');
      // Inner divider line
      doc.line(marginX + 85, yPos, marginX + 85, yPos + 9);
      // Divider between label and value
      doc.line(marginX + 40, yPos, marginX + 40, yPos + 9);
      doc.line(marginX + 125, yPos, marginX + 125, yPos + 9);

      // Text Labels
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(label1, marginX + 3, yPos + 6);
      doc.text(label2, marginX + 88, yPos + 6);

      // Text Values
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(val1, marginX + 43, yPos + 6);
      doc.text(val2, marginX + 128, yPos + 6);
    };

    drawRow('Paciente:', proc.patientName, 'Procedimento:', proc.procedureType, currentY);
    currentY += 9;
    drawRow('Dentista Resp.:', proc.doctorName, 'Laboratório:', proc.laboratoryName, currentY);
    currentY += 15;

    // --- CRITICAL SECTION: TOOTH SHADE / COR DA PEÇA (Highlighted) ---
    doc.setFillColor(highlightBg[0], highlightBg[1], highlightBg[2]);
    doc.rect(marginX, currentY, 210 - (marginX * 2), 16, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.rect(marginX, currentY, 210 - (marginX * 2), 16, 'S');

    // Shade Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('COR / SHADE REQUISITADA DA PEÇA (DENTE):', marginX + 5, currentY + 10);

    // Large Bold Shade Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const toothShade = proc.shade ? proc.shade.toUpperCase() : 'NÃO ESPECIFICADA';
    doc.text(toothShade, 210 - marginX - 5, currentY + 11, { align: 'right' });

    currentY += 23;

    // --- SECTION 3: DATAS E VALOR (Table Layout) ---
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);

    drawRow('Data de Envio:', formatDateBR(proc.sentDate), 'Previsão de Retorno:', formatDateBR(proc.expectedReturnDate), currentY);
    currentY += 9;
    
    // Status & Value row
    const formattedVal = `R$ ${proc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    drawRow('Status Atual:', proc.status, 'Custo do Serviço:', formattedVal, currentY);
    
    currentY += 18;

    // --- SECTION 4: INSTRUÇÕES E OBSERVAÇÕES CLÍNICAS ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INSTRUÇÕES ADICIONAIS E OBSERVAÇÕES CLÍNICAS:', marginX, currentY);

    currentY += 4;

    // Inner grey instruction box
    const boxHeight = 45;
    doc.setFillColor(249, 250, 251);
    doc.rect(marginX, currentY, 210 - (marginX * 2), boxHeight, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.rect(marginX, currentY, 210 - (marginX * 2), boxHeight, 'S');

    // Notes text wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    
    const clinicalNotes = proc.notes || 'Nenhuma instrução adicional informada. Seguir padrão do modelo e preparo anatômico enviado.';
    const splitNotes = doc.splitTextToSize(clinicalNotes, 210 - (marginX * 2) - 10);
    doc.text(splitNotes, marginX + 5, currentY + 6);

    currentY += boxHeight + 25;

    // --- FOOTER: SIGNATURES & TERM ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('Declaro que os moldes e especificações fornecidos estão em conformidade com o planejamento clínico realizado.', marginX, currentY);

    currentY += 18;

    // Left Signature
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, marginX + 65, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(proc.doctorName, marginX, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Cirurgião-Dentista Solicitante', marginX, currentY + 8.5);

    // Right Signature
    doc.line(210 - marginX - 65, currentY, 210 - marginX, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(proc.laboratoryName, 210 - marginX - 65, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Técnico em Prótese Dentária', 210 - marginX - 65, currentY + 8.5);

    // Bottom brand stamp
    currentY += 22;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.25);
    doc.line(marginX, currentY, 210 - marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('Ficha gerada em ' + new Date().toLocaleString('pt-BR') + ' | Seja Mais Odontologia - Portal de Gestão de Laboratório', marginX, currentY + 4);

    // Save/Download PDF
    const safePatientName = proc.patientName.replace(/\s+/g, '_');
    doc.save(`Ficha_Lab_${safePatientName}_${proc.procedureType.replace(/\s+/g, '_')}.pdf`);
    showToast(`PDF da Ficha de Trabalho exportado com sucesso!`);
  };

  // Generate a beautiful clinic-branded general dispatch list report of all active work items currently shown
  const generateFilteredReportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape', // Landscape is perfect for wide tables!
      unit: 'mm',
      format: 'a4'
    });

    const formatDateBR = (dateStr?: string) => {
      if (!dateStr) return 'Não informada';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const primaryColor = [55, 149, 174]; // #3795AE (Teal)
    const darkColor = [31, 41, 55]; // #1F2937 (Charcoal)
    const lightColor = [243, 244, 246]; // #F3F4F6 (Soft gray)
    const grayColor = [107, 114, 128]; // #6B7280 (Gray)

    const marginX = 15;
    let currentY = 15;

    // --- LANDSCAPE HEADER / LOGO ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.ellipse(marginX + 8, currentY + 8, 7, 7, 'F');
    
    // Simple white tooth symbol
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.line(marginX + 6, currentY + 5, marginX + 10, currentY + 5);
    doc.line(marginX + 10, currentY + 5, marginX + 11, currentY + 9);
    doc.line(marginX + 11, currentY + 9, marginX + 9, currentY + 12);
    doc.line(marginX + 9, currentY + 12, marginX + 8, currentY + 10);
    doc.line(marginX + 8, currentY + 10, marginX + 7, currentY + 12);
    doc.line(marginX + 7, currentY + 12, marginX + 5, currentY + 9);
    doc.line(marginX + 5, currentY + 9, marginX + 6, currentY + 5);

    // Title & Brand
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Seja Mais Odontologia', marginX + 18, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('Relatório Integrado de Próteses e Pedidos de Laboratório', marginX + 18, currentY + 12);

    const filterInfo = `Filtros Aplicados - Dentista: ${doctorFilter} | Trabalho: ${typeFilter} | Laboratório: ${laboratoryFilter}`;
    doc.text(filterInfo, 297 - marginX, currentY + 12, { align: 'right' });

    // Header dividing line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY + 17, 297 - marginX, currentY + 17);

    currentY += 25;

    // --- REPORT TITLE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RELATÓRIO GERAL E RESUMO DE TRABALHOS ATIVOS', marginX, currentY);

    // Total stats in summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`Total de Peças Exibidas: ${filteredProcedures.length} | Custo Acumulado Total: R$ ${totalValueFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 297 - marginX, currentY, { align: 'right' });

    currentY += 6;

    // --- MASTER TABLE HEADER ---
    const columns = [
      { name: 'Paciente', width: 45 },
      { name: 'Procedimento', width: 35 },
      { name: 'Laboratório', width: 40 },
      { name: 'Cor/Shade', width: 25 },
      { name: 'Dentista', width: 40 },
      { name: 'Envio', width: 22 },
      { name: 'Previsão', width: 22 },
      { name: 'Valor', width: 23 },
      { name: 'Status', width: 18 }
    ];

    let startX = marginX;
    doc.setFillColor(55, 149, 174); // primary color
    doc.rect(marginX, currentY, 297 - (marginX * 2), 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    columns.forEach(col => {
      doc.text(col.name, startX + 2, currentY + 5.5);
      startX += col.width;
    });

    currentY += 8;

    // --- MASTER TABLE ROWS ---
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);

    filteredProcedures.forEach((proc, index) => {
      // Alternating row bg colors
      if (index % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(marginX, currentY, 297 - (marginX * 2), 7.5, 'F');
      }

      // Draw bottom line
      doc.line(marginX, currentY + 7.5, 297 - marginX, currentY + 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);

      let rowX = marginX;
      
      // Patient Name
      doc.text(proc.patientName.substring(0, 24), rowX + 2, currentY + 5);
      rowX += columns[0].width;

      // Procedure
      doc.text(proc.procedureType, rowX + 2, currentY + 5);
      rowX += columns[1].width;

      // Lab
      doc.text(proc.laboratoryName.substring(0, 22), rowX + 2, currentY + 5);
      rowX += columns[2].width;

      // Shade
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(proc.shade || 'N/A', rowX + 2, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      rowX += columns[3].width;

      // Doctor
      doc.text(proc.doctorName.substring(0, 22), rowX + 2, currentY + 5);
      rowX += columns[4].width;

      // Envio
      doc.text(formatDateBR(proc.sentDate), rowX + 2, currentY + 5);
      rowX += columns[5].width;

      // Previsão
      const delayed = isDelayed(proc.expectedReturnDate, proc.status);
      if (delayed) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // red for delayed
      }
      doc.text(formatDateBR(proc.expectedReturnDate), rowX + 2, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      rowX += columns[6].width;

      // Valor
      const valStr = `R$ ${proc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      doc.setFont('helvetica', 'bold');
      doc.text(valStr, rowX + 2, currentY + 5);
      doc.setFont('helvetica', 'normal');
      rowX += columns[7].width;

      // Status
      doc.text(proc.status, rowX + 2, currentY + 5);

      currentY += 7.5;

      // Page overflow check (Landscape A4 is 210mm high, margin 15, so 195 maxY)
      if (currentY > 180 && index < filteredProcedures.length - 1) {
        doc.addPage();
        currentY = 20;
        // Redraw table header on new page
        startX = marginX;
        doc.setFillColor(55, 149, 174);
        doc.rect(marginX, currentY, 297 - (marginX * 2), 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        columns.forEach(col => {
          doc.text(col.name, startX + 2, currentY + 5.5);
          startX += col.width;
        });
        currentY += 8;
      }
    });

    // Draw simple footer
    currentY += 15;
    if (currentY > 195) {
      doc.addPage();
      currentY = 20;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(marginX, 195, 297 - marginX, 195);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('Relatório de Próteses Gerado em: ' + new Date().toLocaleString('pt-BR') + ' | Seja Mais Odontologia', marginX, 199);
    doc.text('Este documento é de uso interno clínico e serve para controle de prazos e auditorias de faturamento laboratorial.', 297 - marginX, 199, { align: 'right' });

    doc.save('Relatorio_Laboratorio_SejaMaisOdontologia.pdf');
    showToast('Relatório geral de trabalhos em PDF baixado com sucesso!');
  };

  // Safe click handler to toggle card expansion
  const handleCardClick = (e: React.MouseEvent, id: string) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('option') || 
      target.closest('a')
    ) {
      return;
    }
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  // Drag and Drop implementation
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LabProcedure['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (!id) return;

    const updated = procedures.map(p => {
      if (p.id === id) {
        const retDate = (targetStatus === 'Recebido' || targetStatus === 'Instalado') 
          ? new Date().toISOString().split('T')[0] 
          : undefined;
        return { ...p, status: targetStatus, actualReturnDate: retDate };
      }
      return p;
    });
    saveProcedures(updated);
    setDraggingId(null);
    showToast(`Procedimento atualizado para: "${targetStatus}"`);
  };

  // Reset demo data
  const handleResetLabData = () => {
    if (window.confirm("Deseja restaurar a lista inicial de simulação de laboratório?")) {
      saveProcedures(INITIAL_LAB_PROCEDURES);
      showToast("Lista de simulação restaurada!");
    }
  };

  // Prepare list of unique laboratories for filters
  const uniqueLaboratories = Array.from(new Set(procedures.map(p => p.laboratoryName)));

  // Filter & Search application
  const filteredProcedures = procedures.filter(p => {
    const matchesSearch = p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.laboratoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDoctor = doctorFilter === 'Todos' || p.doctorName === doctorFilter;
    const matchesType = typeFilter === 'Todos' || p.procedureType === typeFilter;
    const matchesLab = laboratoryFilter === 'Todos' || p.laboratoryName === laboratoryFilter;

    return matchesSearch && matchesDoctor && matchesType && matchesLab;
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full select-none font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-[#3795AE] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 border border-white/20"
          >
            <CheckCircle2 size={16} />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER WITH ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-base text-[#18181B] flex items-center gap-2">
            <FlaskConical className="text-[#3795AE]" size={18} />
            <span>Painel de laboratório (Kanban)</span>
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Prazos e controle financeiro de próteses, facetas e peças enviadas para produção
          </p>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleResetLabData}
            className="bg-white border border-[#E4E4E7] hover:bg-[#FAFAFA] text-[#52525B] font-medium text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restaurar dados padrão de laboratório"
          >
            <RefreshCw size={13} />
            Restaurar
          </button>

          <button
            onClick={generateFilteredReportPDF}
            className="bg-white border border-[#E4E4E7] hover:border-[#3795AE]/40 text-[#3F3F46] hover:text-[#3795AE] font-medium text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar relatório de todos os trabalhos visíveis em PDF"
          >
            <FileDown size={13} />
            Exportar PDF
          </button>

          <button
            onClick={() => {
              const firstProsthesis = procedures.find(p => p.procedureType === 'Prótese');
              if (firstProsthesis) {
                setTermoPatientName(firstProsthesis.patientName);
                setTermoProsthesisType(`${firstProsthesis.procedureType} (${firstProsthesis.notes.substring(0, 40)})`);
                setTermoDoctorName(firstProsthesis.doctorName);
              } else if (procedures.length > 0) {
                setTermoPatientName(procedures[0].patientName);
                setTermoProsthesisType(`${procedures[0].procedureType} (${procedures[0].notes.substring(0, 40)})`);
                setTermoDoctorName(procedures[0].doctorName);
              }
              setTermoDate(new Date().toLocaleDateString('pt-BR'));
              setShowTermoModal(true);
            }}
            className="bg-white border border-[#E4E4E7] hover:border-[#3795AE]/40 text-[#3F3F46] hover:text-[#3795AE] font-medium text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Gerar termo de entrega de prótese para assinatura do paciente"
          >
            <Clipboard size={13} />
            Termo de satisfação
          </button>

          <button
            onClick={() => {
              clearForm();
              setShowAddModal(true);
            }}
            className="bg-[#3795AE] hover:bg-[#2B7E94] text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Nova peça
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EBEBED] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
            <FlaskConical size={17} />
          </div>
          <div>
            <p className="text-xs text-[#71717A] font-medium">No laboratório</p>
            <p className="font-display font-semibold text-lg text-[#18181B] tabular-nums">{totalInProduction} peças</p>
            <p className="text-[11px] text-[#71717A]">Em confecção externa</p>
          </div>
        </div>

        <div className="bg-white border border-[#EBEBED] rounded-2xl p-4 flex items-center gap-3.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              delayedCount > 0 ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F4F4F6] text-[#71717A]'
            }`}
          >
            <AlertTriangle size={17} />
          </div>
          <div>
            <p className="text-xs text-[#71717A] font-medium">Atrasados</p>
            <p className={`font-display font-semibold text-lg tabular-nums ${delayedCount > 0 ? 'text-[#DC2626]' : 'text-[#18181B]'}`}>
              {delayedCount} {delayedCount === 1 ? 'peça' : 'peças'}
            </p>
            <p className="text-[11px] text-[#71717A]">
              {delayedCount > 0 ? 'Excederam a previsão' : 'Dentro do prazo'}
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-level-2 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Recebidos Clínica</p>
            <p className="font-display font-bold text-lg text-on-surface mt-0.5">{receivedThisMonth} pendentes</p>
            <p className="text-[9px] text-on-surface-variant mt-0.5 font-medium">Aguardando cimentação final</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-level-2 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Custo de Próteses</p>
            <p className="font-display font-bold text-lg text-on-surface mt-0.5">
              R$ {totalValueFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5 font-medium">Custo acumulado total das peças</p>
          </div>
        </div>

      </div>

      {/* FILTER BAR PANEL */}
      <section className="bg-white border border-level-2 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          
          {/* Left search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por paciente, laboratório ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-level-1/40 border border-level-2 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant font-medium"
            />
          </div>

          {/* Right Dropdowns */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-on-surface-variant" />
              <span className="text-[11px] text-on-surface-variant font-bold uppercase">Filtros:</span>
            </div>

            {/* Doctor Filter */}
            <div>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="bg-white border border-level-2 rounded-lg py-1.5 px-3 text-[11px] font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Todos">Todos Dentistas</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-level-2 rounded-lg py-1.5 px-3 text-[11px] font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Todos">Todos Procedimentos</option>
                <option value="Prótese">Prótese</option>
                <option value="Coroa">Coroa</option>
                <option value="Faceta">Faceta</option>
                <option value="Implante">Implante</option>
                <option value="Onlay/Inlay">Onlay/Inlay</option>
                <option value="Placa Alinhadora/Miorrelaxante">Placa/Alinhador</option>
                <option value="Outro">Outros</option>
              </select>
            </div>

            {/* Laboratory Filter */}
            <div>
              <select
                value={laboratoryFilter}
                onChange={(e) => setLaboratoryFilter(e.target.value)}
                className="bg-white border border-level-2 rounded-lg py-1.5 px-3 text-[11px] font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Todos">Todos Laboratórios</option>
                {uniqueLaboratories.map((lab, idx) => (
                  <option key={idx} value={lab}>{lab}</option>
                ))}
              </select>
            </div>

            {(doctorFilter !== 'Todos' || typeFilter !== 'Todos' || laboratoryFilter !== 'Todos' || searchTerm !== '') && (
              <button
                onClick={() => {
                  setDoctorFilter('Todos');
                  setTypeFilter('Todos');
                  setLaboratoryFilter('Todos');
                  setSearchTerm('');
                }}
                className="text-xs text-primary hover:underline font-bold"
              >
                Limpar
              </button>
            )}

          </div>

        </div>
      </section>

      {/* KANBAN BOARD CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start min-h-[600px] select-none">
        {COLUMNS.map((col) => {
          const colProcedures = filteredProcedures.filter(p => p.status === col.id);
          const colSum = colProcedures.reduce((sum, p) => sum + p.value, 0);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-xl border ${col.border} ${col.bg} p-3 min-h-[600px] flex flex-col space-y-3 relative transition-all duration-250 ${
                draggingId ? 'ring-1 ring-dashed ring-slate-300' : ''
              }`}
            >
              
              {/* Column Header */}
              <div className="flex justify-between items-center border-b border-level-2 pb-2">
                <div>
                  <h3 className={`text-xs font-bold ${col.text} flex items-center gap-1.5`}>
                    <span className={`w-2 h-2 rounded-full bg-current`} />
                    <span>{col.label}</span>
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
                    {colProcedures.length} {colProcedures.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[10px] font-bold text-on-surface-variant block">
                    R$ {colSum.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Cards list container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-0.5">
                {colProcedures.length === 0 ? (
                  <div className="h-28 border border-dashed border-level-2/80 rounded-lg flex flex-col items-center justify-center p-3 text-center text-[10px] text-on-surface-variant font-medium">
                    <Archive size={14} className="opacity-40 mb-1" />
                    <span>Nenhum caso nesta coluna</span>
                  </div>
                ) : (
                  colProcedures.map((proc) => {
                    const delayed = isDelayed(proc.expectedReturnDate, proc.status);
                    const isExpanded = expandedCardId === proc.id;
                    
                    // Format dates beautifully
                    const formattedSent = proc.sentDate.split('-').reverse().join('/');
                    const formattedExpected = proc.expectedReturnDate.split('-').reverse().join('/');

                    return (
                      <div
                        key={proc.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, proc.id)}
                        onClick={(e) => handleCardClick(e, proc.id)}
                        className={`bg-white border rounded-lg p-3 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing relative group ${
                          delayed ? 'border-rose-300 bg-rose-50/10' : 'border-level-2'
                        } ${isExpanded ? 'ring-2 ring-[#3795AE]/20 border-[#3795AE]/40 shadow-sm' : ''}`}
                      >
                        {/* Delayed Alert Badge */}
                        {delayed && (
                          <div className="absolute top-2.5 right-2.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-semibold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                            <ShieldAlert size={8} />
                            Atrasado
                          </div>
                        )}

                        {/* Collapsed Header View (Always Clean & Minimalist) */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center pr-16">
                            <h4 className="text-xs font-bold text-on-surface leading-tight truncate">
                              {proc.patientName}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex flex-wrap gap-1">
                              <span className="bg-[#3795AE]/10 text-[#3795AE] font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                                {proc.procedureType}
                              </span>
                              <span className="bg-level-1 text-on-surface-variant font-medium text-[9px] px-1 py-0.5 rounded">
                                {proc.laboratoryName}
                              </span>
                            </div>
                            
                            {/* Visual Expand Chevron */}
                            <div className="text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity">
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details view with Framer Motion */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="expanded-details"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-level-1 space-y-2.5">
                                {/* Color / Shade of the Piece (CRITICAL USER REQUEST) */}
                                <div className="flex items-center justify-between bg-[#3795AE]/5 border border-[#3795AE]/20 rounded-md p-1.5">
                                  <span className="text-[10px] text-[#3795AE] font-bold flex items-center gap-1">
                                    <Sparkles size={11} />
                                    Cor da Peça:
                                  </span>
                                  <span className="bg-[#3795AE] text-white font-mono text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
                                    {proc.shade || 'Não informada'}
                                  </span>
                                </div>

                                {/* Metadata fields */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant">
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 block">Dentista:</span>
                                    <span className="font-bold text-on-surface flex items-center gap-1">
                                      <User size={10} className="text-[#3795AE]" />
                                      {proc.doctorName}
                                    </span>
                                  </div>
                                  <div className="space-y-0.5 text-right">
                                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 block">Custo:</span>
                                    <span className="font-mono font-bold text-on-surface">
                                      R$ {proc.value.toLocaleString('pt-BR')}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant border-t border-level-1/50 pt-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 block">Enviado:</span>
                                    <span className="font-semibold text-on-surface flex items-center gap-1">
                                      <Clock size={10} className="opacity-60" />
                                      {formattedSent}
                                    </span>
                                  </div>
                                  <div className="space-y-0.5 text-right">
                                    <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 block">Previsão:</span>
                                    <span className={`font-bold flex items-center gap-1 justify-end ${delayed ? 'text-rose-600' : 'text-on-surface'}`}>
                                      <Calendar size={10} className="opacity-60" />
                                      {formattedExpected}
                                    </span>
                                  </div>
                                </div>

                                {/* Notes if present */}
                                {proc.notes && (
                                  <div className="bg-level-1/40 border border-level-2/30 rounded p-2 text-[10px] text-on-surface-variant">
                                    <span className="font-bold text-on-surface block mb-0.5">Observações:</span>
                                    <p className="font-medium leading-relaxed break-words">{proc.notes}</p>
                                  </div>
                                )}

                                {/* Card Actions */}
                                <div className="pt-2.5 border-t border-level-1 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openEditModal(proc)}
                                      className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Edit2 size={10} />
                                      Detalhes / Editar
                                    </button>
                                    
                                    <span className="text-level-2 select-none text-on-surface-variant/30">|</span>

                                    <button
                                      onClick={(e) => { e.stopPropagation(); generatePDF(proc); }}
                                      className="text-[10px] text-[#3795AE] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                      title="Exportar ficha de envio para PDF"
                                    >
                                      <FileDown size={11} />
                                      Salvar PDF
                                    </button>
                                  </div>

                                  {/* Quick status navigation */}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => moveCardStatus(proc.id, proc.status, 'prev')}
                                      disabled={proc.status === 'A Enviar'}
                                      className={`p-1 rounded transition-colors ${
                                        proc.status === 'A Enviar' 
                                          ? 'text-level-2 cursor-not-allowed' 
                                          : 'text-on-surface-variant hover:bg-level-1'
                                      }`}
                                      title="Recuar status"
                                    >
                                      <ChevronLeft size={13} />
                                    </button>

                                    <select
                                      value={proc.status}
                                      onChange={(e) => changeCardStatusDirect(proc.id, e.target.value as any)}
                                      className="text-[9px] font-bold bg-level-1 text-on-surface-variant border-none rounded py-0.5 px-1 outline-none cursor-pointer"
                                    >
                                      <option value="A Enviar">A Enviar</option>
                                      <option value="No Laboratório">No Lab</option>
                                      <option value="Recebido">Recebido</option>
                                      <option value="Ajuste">Ajuste</option>
                                      <option value="Instalado">Instalado</option>
                                    </select>

                                    <button
                                      onClick={() => moveCardStatus(proc.id, proc.status, 'next')}
                                      disabled={proc.status === 'Instalado'}
                                      className={`p-1 rounded transition-colors ${
                                        proc.status === 'Instalado' 
                                          ? 'text-level-2 cursor-not-allowed' 
                                          : 'text-on-surface-variant hover:bg-level-1'
                                      }`}
                                      title="Avançar status"
                                    >
                                      <ChevronRight size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD NEW LAB PROCEDURE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0e1f1a]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-level-2 w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4 border-b border-level-2 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="text-[#3795AE]" size={18} />
                <h3 className="font-display font-bold text-base text-primary">Novo Controle de Laboratório</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:text-on-surface text-lg font-bold cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Nome do Paciente *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do paciente"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Procedimento *</label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value as any)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                  >
                    <option value="Coroa">Coroa</option>
                    <option value="Prótese">Prótese</option>
                    <option value="Faceta">Faceta</option>
                    <option value="Implante">Implante</option>
                    <option value="Onlay/Inlay">Onlay / Inlay</option>
                    <option value="Placa Alinhadora/Miorrelaxante">Placa / Alinhador</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Valor do Trabalho (R$)</label>
                  <input
                    type="number"
                    placeholder="Valor pago ao laboratório"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Laboratório Parceiro *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Premium Dental Lab"
                  value={laboratoryName}
                  onChange={(e) => setLaboratoryName(e.target.value)}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Cor / Shade da Peça</label>
                <input
                  type="text"
                  placeholder="Ex: A2, A1 (E-Max), Bleach BL2, Transparente..."
                  value={shade}
                  onChange={(e) => setShade(e.target.value)}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Data de Envio *</label>
                  <input
                    type="date"
                    required
                    value={sentDate}
                    onChange={(e) => setSentDate(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Previsão de Retorno *</label>
                  <input
                    type="date"
                    required
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Dentista Resp.</label>
                  <select
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Status de Início</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                  >
                    <option value="A Enviar">A Enviar (Pendente)</option>
                    <option value="No Laboratório">No Laboratório</option>
                    <option value="Recebido">Recebido na Clínica</option>
                    <option value="Ajuste">Ajuste / Correção</option>
                    <option value="Instalado">Instalado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Observações do Caso</label>
                <textarea
                  placeholder="Indicar elemento dentário, cor desejada (ex: A1, A2, Bleach), detalhes anatômicos e o que acompanhar com o modelo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-level-2 text-xs font-bold text-on-surface-variant hover:bg-level-1 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer transition-colors"
                >
                  Adicionar ao Kanban
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: EDIT / VIEW LAB PROCEDURE */}
      {showEditModal && selectedProcedure && (
        <div className="fixed inset-0 bg-[#0e1f1a]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-level-2 w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-4 border-b border-level-2 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="text-[#3795AE]" size={18} />
                <h3 className="font-display font-bold text-base text-primary">Detalhes do Procedimento</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-on-surface-variant hover:text-on-surface text-lg font-bold cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Nome do Paciente *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Procedimento *</label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value as any)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                  >
                    <option value="Coroa">Coroa</option>
                    <option value="Prótese">Prótese</option>
                    <option value="Faceta">Faceta</option>
                    <option value="Implante">Implante</option>
                    <option value="Onlay/Inlay">Onlay / Inlay</option>
                    <option value="Placa Alinhadora/Miorrelaxante">Placa / Alinhador</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Valor do Trabalho (R$)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Laboratório Parceiro *</label>
                <input
                  type="text"
                  required
                  value={laboratoryName}
                  onChange={(e) => setLaboratoryName(e.target.value)}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Cor / Shade da Peça</label>
                <input
                  type="text"
                  placeholder="Ex: A2, A1 (E-Max), Bleach BL2, Transparente..."
                  value={shade}
                  onChange={(e) => setShade(e.target.value)}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Data de Envio *</label>
                  <input
                    type="date"
                    required
                    value={sentDate}
                    onChange={(e) => setSentDate(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Previsão de Retorno *</label>
                  <input
                    type="date"
                    required
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                  />
                </div>
              </div>

              {/* Only show return date if status allows */}
              {['Recebido', 'Instalado'].includes(status) && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Data de Retorno Efetivo</label>
                  <input
                    type="date"
                    value={actualReturnDate}
                    onChange={(e) => setActualReturnDate(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-semibold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Dentista Resp.</label>
                  <select
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Status Atual</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                  >
                    <option value="A Enviar">A Enviar (Pendente)</option>
                    <option value="No Laboratório">No Laboratório</option>
                    <option value="Recebido">Recebido na Clínica</option>
                    <option value="Ajuste">Ajuste / Correção</option>
                    <option value="Instalado">Instalado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Observações do Caso</label>
                <textarea
                  placeholder="Indicar elemento dentário, cor desejada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-level-1/30 border border-level-2 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    generatePDF({
                      id: selectedProcedure?.id || 'temp',
                      patientName: patientName.trim(),
                      procedureType: procedureType as any,
                      laboratoryName: laboratoryName.trim(),
                      sentDate,
                      expectedReturnDate,
                      doctorName,
                      status,
                      value: parseFloat(value) || 0,
                      notes: notes.trim(),
                      shade: shade.trim() || undefined
                    });
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#3795AE] hover:bg-[#2c778b] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <FileDown size={15} />
                  Gerar Ficha de Envio (PDF)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedProcedure.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs p-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer border border-rose-200"
                    title="Remover procedimento"
                  >
                    <Trash2 size={15} />
                    Remover
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-level-2 text-xs font-bold text-on-surface-variant hover:bg-level-1 cursor-pointer"
                  >
                    Voltar
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Termo de Satisfação da Prótese (Requirement J) */}
      <AnimatePresence>
        {showTermoModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-level-2 w-full max-w-4xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden"
            >
              {/* Left Column: Form Controls */}
              <div className="p-6 md:p-8 bg-gray-50 border-r border-level-2 w-full md:w-5/12 flex flex-col justify-between gap-6 no-print">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#2d8096]">
                    <Clipboard size={18} />
                    <h3 className="font-display font-bold text-base text-gray-900">Termo de Satisfação</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Preencha ou selecione os dados abaixo para gerar o termo oficial de entrega e satisfação da prótese.
                  </p>

                  {/* Quick Select from Active Procedures */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider pl-0.5">Selecionar Paciente Ativo</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const found = procedures.find(p => p.id === val);
                        if (found) {
                          setTermoPatientName(found.patientName);
                          setTermoProsthesisType(`${found.procedureType} (${found.notes || 'Trabalho de Laboratório'})`);
                          setTermoDoctorName(found.doctorName);
                        }
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none"
                    >
                      <option value="">-- Selecione ou digite manualmente abaixo --</option>
                      {procedures.map(p => (
                        <option key={p.id} value={p.id}>{p.patientName} - {p.procedureType}</option>
                      ))}
                    </select>
                  </div>

                  {/* Patient Name Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider pl-0.5 font-sans">Nome do Paciente</label>
                    <input
                      type="text"
                      value={termoPatientName}
                      onChange={(e) => setTermoPatientName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800"
                    />
                  </div>

                  {/* Prosthesis Description Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider pl-0.5">Descrição da Prótese / Peça</label>
                    <input
                      type="text"
                      value={termoProsthesisType}
                      onChange={(e) => setTermoProsthesisType(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800"
                    />
                  </div>

                  {/* Doctor selection input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider pl-0.5">Doutora Responsável</label>
                    <select
                      value={termoDoctorName}
                      onChange={(e) => setTermoDoctorName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleShareTermoWhatsApp}
                    disabled={isSendingTermoWhatsApp}
                    className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {isSendingTermoWhatsApp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Gerando PDF e Abrindo WhatsApp...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={14} />
                        Enviar Termo (PDF) no WhatsApp
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadTermoPDF}
                    disabled={isGeneratingTermoPDF}
                    className="w-full py-3 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isGeneratingTermoPDF ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Gerando e Baixando PDF...
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        Baixar Termo (PDF)
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openPrintWindow('termo-print-area', `Termo de Ciência - ${termoPatientName}`)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer size={14} />
                    Imprimir no Navegador
                  </button>

                  <button
                    onClick={() => setShowTermoModal(false)}
                    className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {/* Right Column: Printable Document Template */}
              <div id="termo-print-area" className="p-8 md:p-12 flex-1 bg-white print-container overflow-y-auto max-h-[85vh] flex flex-col justify-between my-2">
                <div className="space-y-6 max-w-2xl mx-auto">
                  
                  {/* Clinic Heading */}
                  <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <ClinicLogo className="w-10 h-10 shrink-0" />
                        <div>
                          <h4 className="font-display font-black text-lg text-gray-900 tracking-tight leading-tight">Seja Mais Odontologia</h4>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Gestão e Cuidado Odontológico Integrado</p>
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-400 pl-0.5 mt-1">Rua Vergueiro, 1200 • Paraíso, São Paulo - SP • CEP 01504-001</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-gray-900 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Documento Oficial
                      </span>
                    </div>
                  </div>

                  {/* Title of Document */}
                  <div className="text-center space-y-1">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                      Termo de Entrega e Satisfação de Prótese Dentária
                    </h2>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Declaração de Consentimento Informado</p>
                  </div>

                  {/* Declaration text */}
                  <div className="text-xs text-gray-800 leading-relaxed space-y-4 font-medium">
                    <p>
                      Eu, <strong className="text-gray-950 font-bold underline">{termoPatientName || '____________________________________________________'}</strong>, declaro para os devidos fins de registro clínico e legal que recebi nesta data a instalação e entrega final da prótese dentária especificada como: <strong className="text-gray-950 font-bold underline">{termoProsthesisType || '____________________________________________________'}</strong>, confeccionada sob a responsabilidade profissional de <strong className="text-gray-950 font-bold">{termoDoctorName}</strong>.
                    </p>

                    <p>
                      Declaro estar plenamente satisfeito(a) com os resultados obtidos, tendo avaliado conjuntamente com o(a) profissional cirurgião-dentista os seguintes aspectos:
                    </p>

                    {/* Checkboxes List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 py-2">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 border border-gray-900 rounded shrink-0 flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <p className="font-bold text-gray-900">Estética e Cosmética</p>
                          <p className="text-[10px] text-gray-500">Cor, formato e alinhamento dos dentes artificiais.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 border border-gray-900 rounded shrink-0 flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <p className="font-bold text-gray-900">Oclusão e Mastigação</p>
                          <p className="text-[10px] text-gray-500">Encaixe da mordida e conforto funcional.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 border border-gray-900 rounded shrink-0 flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <p className="font-bold text-gray-900">Fonética e Adaptação</p>
                          <p className="text-[10px] text-gray-500">Ausência de interferências na fala ou dicção.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 border border-gray-900 rounded shrink-0 flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <p className="font-bold text-gray-900">Instruções de Higiene</p>
                          <p className="text-[10px] text-gray-500">Orientações claras de conservação e limpeza.</p>
                        </div>
                      </div>
                    </div>

                    <p>
                      Estou ciente de que as próteses dentárias necessitam de um período de adaptação neuromuscular e de que consultas de controle e ajustes subsequentes podem ser necessárias, comprometendo-me a retornar à clínica para as revisões periódicas recomendadas.
                    </p>
                  </div>

                  <p className="text-[10px] text-right font-bold text-gray-500 pt-2">
                    São Paulo, {termoDate}
                  </p>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                    <div className="space-y-1">
                      <div className="border-t border-gray-900 pt-1.5 font-bold text-gray-900">
                        {termoPatientName || 'Assinatura do Paciente'}
                      </div>
                      <p className="text-[9px] text-gray-500 font-semibold">Paciente / Responsável Legal</p>
                    </div>

                    <div className="space-y-1">
                      <div className="border-t border-gray-900 pt-1.5 font-bold text-gray-900">
                        {termoDoctorName}
                      </div>
                      <p className="text-[9px] text-gray-500 font-semibold">Cirurgião-Dentista • Seja Mais</p>
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
