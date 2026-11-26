/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction } from '../types';
import { 
  Search, 
  Trash2, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  CheckCircle,
  FileText,
  Printer,
  MessageSquare,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadElementAsPDF, generateNativeReceiptPDF, openPrintWindow, sharePDFToWhatsApp } from '../lib/pdfUtils';
import { ClinicLogo } from './Sidebar';

interface HistoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

export default function History({ transactions, onDeleteTransaction }: HistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Consultas' | 'Procedimentos' | 'Materiais'>('all');
  const [selectedReceiptTrans, setSelectedReceiptTrans] = useState<Transaction | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientCPF, setClientCPF] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleShareWhatsAppPDF = async () => {
    if (!selectedReceiptTrans) return;
    setIsSendingWhatsApp(true);

    const formattedVal = selectedReceiptTrans.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const formattedDate = selectedReceiptTrans.date.split('-').reverse().join('/');
    const cleanPatient = (clientName || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Recibo_SejaMais_ODO-${selectedReceiptTrans.id.toUpperCase()}_${cleanPatient}.pdf`;

    const messageText = `*Recibo de Atendimento - Seja Mais Odontologia*

*Clínica:* Seja Mais Odontologia
*Nº do Recibo:* ODO-${selectedReceiptTrans.id.toUpperCase()}
*Data de Emissão:* ${formattedDate}

*Paciente:* ${clientName}
*CPF:* ${clientCPF}

*Procedimento Realizado:* ${selectedReceiptTrans.description}
*Profissional Responsável:* ${selectedReceiptTrans.doctorName}
*Valor Recebido:* R$ ${formattedVal}

Agradecemos a confiança em nossos serviços de saúde bucal!`;

    await sharePDFToWhatsApp({
      elementId: 'receipt-print-area',
      receiptData: {
        receiptNum: selectedReceiptTrans.id,
        dateStr: formattedDate,
        clientName: clientName || 'Paciente',
        clientCPF: clientCPF || '',
        valueStr: formattedVal,
        description: selectedReceiptTrans.description,
        doctorName: selectedReceiptTrans.doctorName || 'Seja Mais Odontologia',
        paymentMethod: selectedReceiptTrans.category || 'Consulta/Procedimento'
      },
      filename,
      phone: clientPhone,
      textMessage: messageText
    });

    setIsSendingWhatsApp(false);
  };

  const handleDownloadPDF = async () => {
    if (!selectedReceiptTrans) return;
    setIsGeneratingPDF(true);
    
    // First attempt native vector PDF generation for maximum reliability
    const formattedVal = selectedReceiptTrans.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const formattedDate = selectedReceiptTrans.date.split('-').reverse().join('/');
    
    const nativeOk = generateNativeReceiptPDF({
      receiptNum: selectedReceiptTrans.id,
      dateStr: formattedDate,
      clientName: clientName || 'Paciente',
      clientCPF: clientCPF || '',
      valueStr: formattedVal,
      description: selectedReceiptTrans.description,
      doctorName: selectedReceiptTrans.doctorName || 'Seja Mais Odontologia',
      paymentMethod: selectedReceiptTrans.category || 'Consulta/Procedimento'
    });

    if (!nativeOk) {
      // Fallback to html2canvas PDF rendering
      const cleanPatient = (clientName || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Recibo_SejaMais_ODO-${selectedReceiptTrans.id.toUpperCase()}_${cleanPatient}.pdf`;
      const canvasOk = await downloadElementAsPDF('receipt-print-area', filename);
      if (!canvasOk) {
        openPrintWindow('receipt-print-area', `Recibo ODO-${selectedReceiptTrans.id.toUpperCase()}`);
      }
    }
    
    setIsGeneratingPDF(false);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (t.patientName && t.patientName.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q) ||
      t.doctorName.toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Search & Filter Header bar */}
      <div className="bg-white border border-[#E6EAF0] rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A0B2]" size={17} />
          <input
            type="text"
            placeholder="Pesquisar por procedimento, material ou dentista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] bg-[#F7F8FA] border border-[#DCE2EA] rounded-xl pl-11 pr-4 py-2.5 text-sm text-[#14181F] placeholder:text-[#94A0B2] focus:outline-none focus:bg-white focus:border-[#3795AE]"
          />
        </div>

        {/* Filters panel */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filter Type */}
          <div className="flex bg-[#F1F4F7] p-1 rounded-xl text-[13.5px] font-medium text-[#647082]">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                  : 'hover:text-[#14181F]'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('receita')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'receita'
                  ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                  : 'hover:text-[#14181F]'
              }`}
            >
              Entradas
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('despesa')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'despesa'
                  ? 'bg-white text-[#14181F] font-semibold shadow-xs'
                  : 'hover:text-[#14181F]'
              }`}
            >
              Saídas
            </button>
          </div>

          {/* Filter Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="min-h-[44px] bg-white border border-[#DCE2EA] rounded-xl px-4 py-2 text-sm font-medium text-[#374151] focus:outline-none focus:border-[#3795AE]"
          >
            <option value="all">Todas as categorias</option>
            <option value="Consultas">Consultas</option>
            <option value="Procedimentos">Procedimentos</option>
            <option value="Materiais">Materiais</option>
          </select>
        </div>
      </div>

      {/* Main Transactions Log Table */}
      <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#ECEFF3] text-[13px] font-medium text-[#647082]">
                <th className="py-4 px-6 font-medium">Data</th>
                <th className="py-4 px-6 font-medium">Descrição</th>
                <th className="py-3.5 px-6 font-medium">Responsável</th>
                <th className="py-3.5 px-6 font-medium">Categoria</th>
                <th className="py-3.5 px-6 font-medium text-right">Valor</th>
                <th className="py-3.5 px-6 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F3] text-[13px]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-xs text-[#71717A]">
                    Nenhum lançamento financeiro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => {
                  const isRevenue = item.type === 'receita';
                  return (
                    <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3.5 px-6 text-xs text-[#71717A] tabular-nums whitespace-nowrap">
                        {item.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2.5">
                          {isRevenue ? (
                            <span className="w-6 h-6 rounded-lg bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
                              <ArrowUpRight size={13} />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
                              <ArrowDownLeft size={13} />
                            </span>
                          )}
                          <span className="text-[#18181B] truncate font-medium">
                            {item.patientName ? `${item.patientName} · ${item.description}` : item.description}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-[#52525B] text-xs">{item.doctorName}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                            item.category === 'Procedimentos'
                              ? 'bg-[#3795AE]/10 text-[#3795AE]'
                              : item.category === 'Consultas'
                              ? 'bg-[#F4F4F6] text-[#3F3F46]'
                              : 'bg-[#FEF2F2] text-[#DC2626]'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-6 text-right font-semibold tabular-nums whitespace-nowrap ${
                          isRevenue ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {isRevenue ? '+' : '−'} R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-1">
                          {isRevenue && (
                            <button
                              onClick={() => {
                                setClientName(item.patientName || '');
                                setSelectedReceiptTrans(item);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#F4F4F6] text-[#71717A] hover:text-[#3795AE] transition-colors cursor-pointer"
                              title="Emitir recibo de atendimento"
                            >
                              <Receipt size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTransaction(item.id)}
                            className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#71717A] hover:text-[#DC2626] transition-colors cursor-pointer"
                            title="Remover lançamento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT EMISSION MODAL */}
      <AnimatePresence>
        {selectedReceiptTrans && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-[#EBEBED] w-full max-w-4xl shadow-xl relative flex flex-col md:flex-row overflow-hidden"
            >
              {/* Left Column: Input Form (no-print) */}
              <div className="p-6 md:p-7 bg-[#FAFAFA] border-r border-[#EBEBED] w-full md:w-5/12 flex flex-col justify-between gap-6 no-print">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#3795AE]">
                    <Receipt size={17} />
                    <h3 className="font-display font-semibold text-base text-[#18181B]">Customizar recibo</h3>
                  </div>
                  <p className="text-xs text-[#71717A]">
                    Preencha os dados do paciente abaixo para gerar o recibo em tempo real.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#52525B]">Nome do paciente</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Mariana de Oliveira"
                      className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2 text-xs text-[#18181B] focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#52525B]">CPF do paciente</label>
                    <input
                      type="text"
                      value={clientCPF}
                      onChange={(e) => setClientCPF(e.target.value)}
                      placeholder="Ex: 321.456.987-11"
                      className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2 text-xs text-[#18181B] tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#52525B]">WhatsApp para envio</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="DDD + Número (Ex: 11999999999)"
                      className="w-full bg-white border border-[#E4E4E7] rounded-xl px-3.5 py-2 text-xs text-[#18181B] tabular-nums focus:outline-none focus:border-[#3795AE] focus:ring-2 focus:ring-[#3795AE]/15"
                    />
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-4 border-t border-[#EBEBED]">
                  <button
                    onClick={handleShareWhatsAppPDF}
                    disabled={isSendingWhatsApp}
                    className="w-full py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSendingWhatsApp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={14} />
                        Enviar recibo no WhatsApp
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="w-full py-2.5 bg-[#3795AE] hover:bg-[#2B7E94] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        Baixar recibo (PDF)
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openPrintWindow('receipt-print-area', `Recibo ODO-${selectedReceiptTrans.id.toUpperCase()} - Seja Mais`)}
                    className="w-full py-2.5 bg-white border border-[#E4E4E7] hover:bg-[#F4F4F6] text-[#3F3F46] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer size={14} />
                    Imprimir no navegador
                  </button>

                  <button
                    onClick={() => setSelectedReceiptTrans(null)}
                    className="w-full py-2 text-[#71717A] hover:text-[#18181B] text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {/* Right Column: Receipt Layout (Print Area) */}
              <div id="receipt-print-area" className="p-8 md:p-12 flex-1 bg-white print-container flex flex-col justify-between min-h-[500px]">
                
                {/* Receipt Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <ClinicLogo className="w-10 h-10 shrink-0" />
                      <div>
                        <h3 className="font-display font-black text-lg text-gray-900 tracking-tight leading-tight">Seja Mais Odontologia</h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Gestão e Cuidado Odontológico Integrado</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium pl-0.5 mt-1">CNPJ: 44.245.543/0001-44 • Tel: (11) 5575-9000</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-md uppercase tracking-wider">
                      Recibo Oficial
                    </span>
                    <p className="text-[9px] text-gray-500 font-mono mt-2 font-bold">Nº ODO-{selectedReceiptTrans.id.toUpperCase()}</p>
                  </div>
                </div>

                {/* Receipt Body text */}
                <div className="space-y-6 text-xs text-gray-800 py-6 font-medium leading-relaxed">
                  <p>
                    Declaramos para os devidos fins de direito, em especial para comprovação fiscal ou solicitação de reembolso junto a convênios e planos de assistência à saúde, que recebemos a importância de:
                  </p>
                  
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-center font-mono font-black text-lg text-gray-950">
                    R$ {selectedReceiptTrans.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100/40 space-y-1.5">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Referente ao Procedimento:</p>
                    <p className="font-bold text-gray-950 text-sm">
                      {selectedReceiptTrans.description}
                    </p>
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Profissional Responsável</p>
                      <p className="font-bold text-gray-950">{selectedReceiptTrans.doctorName}</p>
                      <p className="text-[9px] text-gray-500 font-bold font-mono">Seja Mais Odontologia</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Beneficiário / Paciente</p>
                      <p className="font-bold text-gray-950">{clientName || 'Paciente Não Identificado'}</p>
                      <p className="text-[9px] text-gray-500 font-mono">CPF: {clientCPF || '***.***.***-**'}</p>
                    </div>
                  </div>
                </div>

                {/* Receipt Footer & Signatures */}
                <div className="pt-8 flex flex-col items-center border-t border-gray-100 mt-auto">
                  <div className="w-56 border-b border-gray-900"></div>
                  <p className="text-xs font-bold text-gray-900 mt-2">{selectedReceiptTrans.doctorName}</p>
                  <p className="text-[9px] text-gray-400 font-semibold">Assinatura do Profissional Responsável</p>
                  <p className="text-[9px] text-gray-400 font-mono mt-4">
                    Emitido em: {selectedReceiptTrans.date.split('-').reverse().join('/')}
                  </p>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
