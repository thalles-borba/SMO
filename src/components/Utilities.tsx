import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Receipt, 
  FileText, 
  Calculator, 
  ShieldCheck, 
  Copy, 
  Check, 
  Printer, 
  Download, 
  Send, 
  DollarSign, 
  User, 
  Calendar, 
  Clock, 
  Stethoscope, 
  Percent, 
  Sparkles,
  Info,
  RefreshCw,
  FileCheck2,
  Share2
} from 'lucide-react';
import { Doctor } from '../types';
import { 
  generateNativeReceiptPDF, 
  openPrintWindow, 
  sharePDFToWhatsApp 
} from '../lib/pdfUtils';

interface UtilitiesProps {
  doctors: Doctor[];
}

export default function Utilities({ doctors }: UtilitiesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pix' | 'recibo' | 'atestado' | 'calculadora' | 'tcle'>('pix');

  // ==========================================
  // 1. PIX COPIA E COLA STATE & LOGIC
  // ==========================================
  const [pixKeyType, setPixKeyType] = useState<'cnpj' | 'email' | 'phone' | 'random'>('cnpj');
  const [pixKey, setPixKey] = useState('44245543000144');
  const [pixMerchantName, setPixMerchantName] = useState('SEJA MAIS ODONTOLOGIA');
  const [pixCity, setPixCity] = useState('SAO PAULO');
  const [pixPatientName, setPixPatientName] = useState('');
  const [pixAmount, setPixAmount] = useState('');
  const [pixDescription, setPixDescription] = useState('');
  const [pixQrCodeDataUrl, setPixQrCodeDataUrl] = useState('');
  const [copiedPixPayload, setCopiedPixPayload] = useState(false);
  const [copiedPixKey, setCopiedPixKey] = useState(false);

  // Helper to generate EMV PIX Payload
  const generatePixPayload = () => {
    const cleanKey = pixKey.trim().replace(/[^a-zA-Z0-9@._-]/g, '');
    const cleanName = pixMerchantName.trim().substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() || 'SEJA MAIS ODONTOLOGIA';
    const cleanCity = pixCity.trim().substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() || 'SAO PAULO';
    
    // Format amount to 2 decimal places if present
    let formattedAmount = '';
    if (pixAmount && !isNaN(parseFloat(pixAmount))) {
      formattedAmount = parseFloat(pixAmount).toFixed(2);
    }

    // Helper EMV TLV (Type-Length-Value)
    const tlv = (id: string, val: string) => {
      const len = val.length.toString().padStart(2, '0');
      return `${id}${len}${val}`;
    };

    // Merchant Account Information - Pix
    const gui = tlv('00', 'br.gov.bcb.pix');
    const keyTlv = tlv('01', cleanKey);
    const descTlv = pixDescription ? tlv('02', pixDescription.substring(0, 40)) : '';
    const merchantAccountInfo = tlv('26', `${gui}${keyTlv}${descTlv}`);

    // Build Payload without CRC
    let rawPayload = 
      tlv('00', '01') + // Format Indicator
      tlv('01', formattedAmount ? '12' : '11') + // Point of Initiation Method (12 = dynamic/single, 11 = static)
      merchantAccountInfo +
      tlv('52', '0000') + // Merchant Category Code
      tlv('53', '986') + // Transaction Currency (986 = BRL)
      (formattedAmount ? tlv('54', formattedAmount) : '') +
      tlv('58', 'BR') + // Country Code
      tlv('59', cleanName) + // Merchant Name
      tlv('60', cleanCity) + // Merchant City
      tlv('62', tlv('05', '***')) + // Additional Data Field (Reference)
      '6304'; // CRC16 Header

    // Compute CRC16 (CCITT-FALSE)
    const computeCRC16 = (str: string) => {
      let crc = 0xFFFF;
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if ((crc & 0x8000) !== 0) {
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
          } else {
            crc = (crc << 1) & 0xFFFF;
          }
        }
      }
      return crc.toString(16).toUpperCase().padStart(4, '0');
    };

    const crc = computeCRC16(rawPayload);
    return rawPayload + crc;
  };

  const currentPixPayload = generatePixPayload();

  useEffect(() => {
    if (activeSubTab === 'pix' && currentPixPayload) {
      QRCode.toDataURL(currentPixPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      })
      .then(url => setPixQrCodeDataUrl(url))
      .catch(err => console.error('Erro ao gerar QR Code Pix:', err));
    }
  }, [currentPixPayload, activeSubTab]);

  const handleCopyPixPayload = () => {
    navigator.clipboard.writeText(currentPixPayload);
    setCopiedPixPayload(true);
    setTimeout(() => setCopiedPixPayload(false), 2500);
  };

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPixKey(true);
    setTimeout(() => setCopiedPixKey(false), 2500);
  };

  const handleSendPixWhatsApp = () => {
    const amountText = pixAmount ? `\n💰 *Valor:* R$ ${parseFloat(pixAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
    const descText = pixDescription ? `\n📝 *Referente a:* ${pixDescription}` : '';
    const patientText = pixPatientName ? `Olá, *${pixPatientName}*!` : 'Olá!';

    const message = `${patientText}\n\nSegue os dados para pagamento via *PIX* da *Seja Mais Odontologia*:${amountText}${descText}\n\n🔑 *Chave PIX (${pixKeyType.toUpperCase()}):*\n\`${pixKey}\`\n\n📲 *Código Pix Copia e Cola:*\n\`${currentPixPayload}\`\n\n_Basta copiar o código acima e colar na opção "Pix Copia e Cola" no seu aplicativo de banco!_`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // ==========================================
  // 2. RECIBO ODONTOLÓGICO STATE & LOGIC
  // ==========================================
  const [reciboNum, setReciboNum] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [reciboDate, setReciboDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reciboPatientName, setReciboPatientName] = useState('');
  const [reciboPatientCPF, setReciboPatientCPF] = useState('');
  const [reciboAmount, setReciboAmount] = useState('');
  const [reciboDescription, setReciboDescription] = useState('Tratamento Odontológico Integrado');
  const [reciboDoctor, setReciboDoctor] = useState(doctors[0]?.name || '');
  const [reciboPaymentMethod, setReciboPaymentMethod] = useState('Pix');
  const [reciboPatientPhone, setReciboPatientPhone] = useState('');

  const getReceiptDataObj = () => ({
    receiptNum: reciboNum,
    dateStr: new Date(reciboDate + 'T12:00:00').toLocaleDateString('pt-BR'),
    clientName: reciboPatientName || 'Nome do Paciente',
    clientCPF: reciboPatientCPF || '000.000.000-00',
    valueStr: reciboAmount ? parseFloat(reciboAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
    description: reciboDescription || 'Tratamento Odontológico',
    doctorName: reciboDoctor || 'Seja Mais Odontologia',
    paymentMethod: reciboPaymentMethod
  });

  const handleDownloadReceiptPDF = () => {
    generateNativeReceiptPDF(getReceiptDataObj());
  };

  const handlePrintReceipt = () => {
    openPrintWindow('printable-receipt-preview', `Recibo_Odontologico_ODO-${reciboNum}`);
  };

  const handleSendReceiptWhatsApp = () => {
    const textMsg = `Olá *${reciboPatientName || 'Paciente'}*!\n\nSegue o seu *Recibo de Pagamento* da Seja Mais Odontologia no valor de *R$ ${reciboAmount ? parseFloat(reciboAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}*.`;
    
    sharePDFToWhatsApp({
      elementId: 'printable-receipt-preview',
      receiptData: getReceiptDataObj(),
      filename: `Recibo_SejaMais_ODO-${reciboNum}.pdf`,
      phone: reciboPatientPhone,
      textMessage: textMsg
    });
  };

  // ==========================================
  // 3. ATESTADO & DECLARAÇÃO STATE & LOGIC
  // ==========================================
  const [docType, setDocType] = useState<'atestado' | 'declaracao'>('atestado');
  const [docPatientName, setDocPatientName] = useState('');
  const [docPatientCPF, setDocPatientCPF] = useState('');
  const [docDoctorName, setDocDoctorName] = useState(doctors[0]?.name || '');
  const [docDoctorCRO, setDocDoctorCRO] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [docRestDays, setDocRestDays] = useState('1');
  const [docStartTime, setDocStartTime] = useState('09:00');
  const [docEndTime, setDocEndTime] = useState('11:00');
  const [docCid, setDocCid] = useState('K08.9 (Afeção dos dentes e estruturas de sustentação)');
  const [docObservations, setDocObservations] = useState('');

  const handlePrintDocument = () => {
    const title = docType === 'atestado' ? 'Atestado_Odontologico' : 'Declaracao_de_Comparecimento';
    openPrintWindow('printable-medical-document', title);
  };

  // ==========================================
  // 4. CALCULADORA DE PARCELAMENTO STATE & LOGIC
  // ==========================================
  const [calcTotalAmount, setCalcTotalAmount] = useState('');
  const [calcCashDiscountPercent, setCalcCashDiscountPercent] = useState('5');
  const [calcMaxInstallments, setCalcMaxInstallments] = useState('12');
  const [calcInterestRatePercent, setCalcInterestRatePercent] = useState('0'); // 0 = sem juros
  const [copiedCalcPlan, setCopiedCalcPlan] = useState(false);

  const getCalcResults = () => {
    const total = parseFloat(calcTotalAmount) || 0;
    const descPercent = parseFloat(calcCashDiscountPercent) || 0;
    const cashValue = total - (total * (descPercent / 100));
    const maxInst = parseInt(calcMaxInstallments) || 1;
    const interest = parseFloat(calcInterestRatePercent) || 0;

    const installmentList = [];
    for (let i = 1; i <= maxInst; i++) {
      let instTotal = total;
      if (interest > 0 && i > 1) {
        instTotal = total * (1 + (interest / 100) * i);
      }
      const valPerInst = instTotal / i;
      installmentList.push({
        num: i,
        valPerInst,
        total: instTotal,
        hasInterest: interest > 0 && i > 1
      });
    }

    return {
      originalTotal: total,
      cashValue,
      discountAmount: total * (descPercent / 100),
      installmentList
    };
  };

  const calcResults = getCalcResults();

  const handleCopyCalcPlanWhatsApp = () => {
    const total = calcResults.originalTotal;
    if (!total) return;

    let msg = `🦷 *SEJA MAIS ODONTOLOGIA - Orçamento & Condições de Pagamento*\n\n`;
    msg += `💵 *Valor Total do Tratamento:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    msg += `✨ *OPÇÃO À VISTA (Pix / Dinheiro / Débito - ${calcCashDiscountPercent}% de Desconto):*\n`;
    msg += `👉 *R$ ${calcResults.cashValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* (Economia de R$ ${calcResults.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n\n`;
    msg += `💳 *OPÇÕES DE PARCELAMENTO NO CARTÃO DE CRÉDITO:*\n`;

    calcResults.installmentList.forEach(inst => {
      msg += `• *${inst.num}x* de *R$ ${inst.valPerInst.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* ${inst.hasInterest ? '(com juros)' : '(sem juros)'}\n`;
    });

    msg += `\n_Aguardamos seu retorno para agendar seu tratamento!_ 😊`;

    navigator.clipboard.writeText(msg);
    setCopiedCalcPlan(true);
    setTimeout(() => setCopiedCalcPlan(false), 2500);
  };

  // ==========================================
  // 5. TCLE (TERMO DE CONSENTIMENTO) STATE & LOGIC
  // ==========================================
  const [tcleProcedure, setTcleProcedure] = useState<'siso' | 'implante' | 'canal' | 'orto' | 'clareamento' | 'protese'>('siso');
  const [tclePatientName, setTclePatientName] = useState('');
  const [tclePatientCPF, setTclePatientCPF] = useState('');
  const [tcleDoctorName, setTcleDoctorName] = useState(doctors[0]?.name || '');

  const TCLE_TEMPLATES = {
    siso: {
      title: 'TERMO DE CONSENTIMENTO PARA CIRURGIA / EXTRAÇÃO DE SISO',
      text: 'Declaro que fui devidamente informado(a) sobre a necessidade do procedimento cirúrgico para exodontia (extração) do(s) dente(s) siso(s). Fui esclarecido(a) quanto aos riscos inerentes tais como inchaço (edema), dor temporária, sangramento pós-operatório, parestesia (perda temporária ou definitiva da sensibilidade nervosa no lábio ou língua) e limitação de abertura bucal (trismo). Comprometo-me a seguir rigorosamente todas as prescrições médicas e orientações pós-operatórias informadas pelo Cirurgião-Dentista.'
    },
    implante: {
      title: 'TERMO DE CONSENTIMENTO PARA IMPLANTE ODONTOLÓGICO',
      text: 'Declaro que fui informado(a) sobre o tratamento de reabilitação oral através de implantes osseointegráveis. Fui esclarecido(a) sobre o procedimento cirúrgico, tempo de cicatrização, necessidade de higiene bucal rigorosa e controle periódico. Fui alertado(a) de que fatores como tabagismo, diabetes descompensada e falta de higienização podem comprometer a osseointegração e a longevidade do implante.'
    },
    canal: {
      title: 'TERMO DE CONSENTIMENTO PARA TRATAMENTO ENDODÔNTICO (CANAL)',
      text: 'Declaro que compreendi a necessidade do tratamento endodôntico (canal) para preservação do elemento dental. Fui informado(a) que o tratamento visa remover a polpa inflamada ou infectada e selar os condutos. Fui alertado(a) de que dentes despolpados tornam-se mais frágeis, necessitando de restauração definitiva ou prótese/coroa adequada para evitar fraturas, e que em casos complexos pode ser necessário retratamento ou cirurgia parendodôntica.'
    },
    orto: {
      title: 'TERMO DE CONSENTIMENTO PARA TRATAMENTO ORTODÔNTICO',
      text: 'Declaro que fui informado(a) sobre os objetivos, duração estimada e cuidados do tratamento ortodôntico com aparelho fixo, móvel ou alinhadores. Compreendo que a higienização bucal rigorosa é indispensável para evitar cáries, gengivite e manchas descalcificantes. Estou ciente de que o não uso de contenção ao final do tratamento pode acarretar na recidiva e movimentação indesejada dos dentes.'
    },
    clareamento: {
      title: 'TERMO DE CONSENTIMENTO PARA CLAREAMENTO DENTAL',
      text: 'Declaro que fui orientado(a) sobre o procedimento de clareamento dental (de consultório e/ou caseiro). Fui informado(a) que pode ocorrer sensibilidade dentinária temporária e irritação gengival durante ou após o tratamento. Comprometo-me a evitar alimentos e bebidas fortemente pigmentados (café, vinho, refrigerantes escuros, molhos) e o uso de tabaco durante o período de clareamento.'
    },
    protese: {
      title: 'TERMO DE CONSENTIMENTO PARA PRÓTESE E COROAS DENTAIS',
      text: 'Declaro que fui informado(a) sobre a confecção de prótese/coroa dental para restauração da função mastigatória e estética. Compreendo as etapas de preparo, moldagem, provisório e instalação final. Fui orientado(a) sobre a necessidade de adaptação funcional inicial e de consultas periódicas para ajustes e manutenção da saúde gengival.'
    }
  };

  const handlePrintTCLE = () => {
    openPrintWindow('printable-tcle-document', 'Termo_de_Consentimento_TCLE');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full select-none pb-12">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#E6EAF0] flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#3795AE]/10 text-[#3795AE] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold font-display text-[#14181F]">Documentos e cobranças</h2>
            <p className="text-sm text-[#647082]">Escolha a ferramenta que precisa usar para atender o paciente</p>
          </div>
        </div>

        {/* Sub-Tabs Selector Bar */}
        <div className="flex items-center gap-1.5 bg-[#F1F4F7] p-1.5 rounded-xl w-full lg:w-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('pix')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'pix'
                ? 'bg-white text-[#14181F] font-semibold shadow-2xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <QrCode size={16} className={activeSubTab === 'pix' ? 'text-[#3795AE]' : ''} />
            <span>Cobrança Pix</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recibo')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'recibo'
                ? 'bg-white text-[#14181F] font-semibold shadow-2xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <Receipt size={16} className={activeSubTab === 'recibo' ? 'text-[#3795AE]' : ''} />
            <span>Recibo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('atestado')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'atestado'
                ? 'bg-white text-[#14181F] font-semibold shadow-2xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <FileText size={16} className={activeSubTab === 'atestado' ? 'text-[#3795AE]' : ''} />
            <span>Atestado</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calculadora')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'calculadora'
                ? 'bg-white text-[#14181F] font-semibold shadow-2xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <Calculator size={16} className={activeSubTab === 'calculadora' ? 'text-[#3795AE]' : ''} />
            <span>Parcelas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tcle')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'tcle'
                ? 'bg-white text-[#14181F] font-semibold shadow-2xs'
                : 'text-[#647082] hover:text-[#14181F]'
            }`}
          >
            <ShieldCheck size={16} className={activeSubTab === 'tcle' ? 'text-[#3795AE]' : ''} />
            <span>Termo</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. TAB: PIX COPIA E COLA GENERATOR          */}
      {/* ========================================== */}
      {activeSubTab === 'pix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Form Side */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E6EAF0] space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#EEF2F6] pb-3.5">
              <QrCode size={18} className="text-[#3795AE]" />
              <h3 className="font-display font-semibold text-base text-[#14181F]">Gerar cobrança Pix para o paciente</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tipo de Chave Pix</label>
                <select
                  value={pixKeyType}
                  onChange={e => setPixKeyType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                >
                  <option value="cnpj">CNPJ da Clínica</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Chave PIX Cadastrada</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="Ex: 44245543000144 ou 44.245.543/0001-44"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Favorecido (Titular)</label>
                <input
                  type="text"
                  value={pixMerchantName}
                  onChange={e => setPixMerchantName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Paciente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={pixPatientName}
                  onChange={e => setPixPatientName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Valor da Cobrança (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00 (deixe em branco se livre)"
                    value={pixAmount}
                    onChange={e => setPixAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Descrição / Procedimento</label>
                <input
                  type="text"
                  placeholder="Ex: Sinal de Tratamento - Orto"
                  value={pixDescription}
                  onChange={e => setPixDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Valores Frequentes:</span>
              <div className="flex flex-wrap gap-2">
                {['50', '100', '150', '200', '300', '500', '1000'].map(v => (
                  <button
                    key={v}
                    onClick={() => setPixAmount(v)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-[#2d8096]/10 hover:text-[#2d8096] text-gray-700 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    R$ {v},00
                  </button>
                ))}
                <button
                  onClick={() => setPixAmount('')}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 text-gray-500 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCopyPixPayload}
                className="py-2.5 px-4 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {copiedPixPayload ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedPixPayload ? 'Código Copiado!' : 'Copiar Pix Copia e Cola'}</span>
              </button>

              <button
                onClick={handleSendPixWhatsApp}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send size={16} />
                <span>Enviar Pix pelo WhatsApp</span>
              </button>
            </div>
          </div>

          {/* QR Code Preview Side */}
          <div className="lg:col-span-5 bg-white border border-[#EBEBED] p-6 rounded-2xl flex flex-col items-center justify-between space-y-4 text-center">
            <div className="w-full">
              <span className="inline-flex bg-[#3795AE]/10 text-[#3795AE] text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                QR Code Pix do paciente
              </span>
              <h4 className="font-display font-semibold text-base mt-2 text-[#18181B]">Escaneie para pagar</h4>
              <p className="text-xs text-[#71717A] mt-0.5">Abra o aplicativo do banco e aponte a câmera</p>
            </div>

            {/* QR Code Container */}
            <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-[#EBEBED] my-2">
              {pixQrCodeDataUrl ? (
                <img src={pixQrCodeDataUrl} alt="QR Code Pix" className="w-52 h-52 object-contain rounded-lg" />
              ) : (
                <div className="w-52 h-52 bg-[#F4F4F6] flex items-center justify-center text-[#A1A1AA] text-xs rounded-lg">
                  Gerando QR...
                </div>
              )}
            </div>

            {/* Amount display */}
            <div className="w-full bg-[#FAFAFA] rounded-xl p-3.5 border border-[#EBEBED]">
              <p className="text-xs text-[#71717A] font-medium">Valor do pagamento</p>
              <p className="text-xl font-semibold text-[#16A34A] font-display tabular-nums mt-0.5">
                {pixAmount ? `R$ ${parseFloat(pixAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor livre / A definir'}
              </p>
            </div>

            {/* Copy key quick button */}
            <button
              onClick={handleCopyPixKey}
              className="text-xs font-medium text-[#52525B] hover:text-[#18181B] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copiedPixKey ? <Check size={14} className="text-[#16A34A]" /> : <Copy size={14} className="text-[#71717A]" />}
              <span>{copiedPixKey ? 'Chave copiada!' : `Copiar chave Pix: ${pixKey}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. TAB: EMITIR RECIBO ODONTOLÓGICO          */}
      {/* ========================================== */}
      {activeSubTab === 'recibo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Form Side */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-level-2 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-[#2d8096]" />
                <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Dados do Recibo</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                Nº ODO-{reciboNum}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo do Paciente</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Eduarda Santos"
                  value={reciboPatientName}
                  onChange={e => setReciboPatientName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CPF do Paciente</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={reciboPatientCPF}
                    onChange={e => setReciboPatientCPF(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">WhatsApp (Envio Direct)</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={reciboPatientPhone}
                    onChange={e => setReciboPatientPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Valor do Recibo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={reciboAmount}
                    onChange={e => setReciboAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data da Emissão</label>
                  <input
                    type="date"
                    value={reciboDate}
                    onChange={e => setReciboDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Referente ao Procedimento</label>
                <input
                  type="text"
                  placeholder="Ex: Tratamento Endodôntico no Dente 26"
                  value={reciboDescription}
                  onChange={e => setReciboDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cirurgião-Dentista</label>
                  <select
                    value={reciboDoctor}
                    onChange={e => setReciboDoctor(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    <option value="Seja Mais Odontologia">Clínica Geral (Seja Mais)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Forma de Pagamento</label>
                  <select
                    value={reciboPaymentMethod}
                    onChange={e => setReciboPaymentMethod(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro em Espécie</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadReceiptPDF}
                  className="py-2.5 px-3 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download size={14} />
                  <span>Baixar PDF</span>
                </button>

                <button
                  onClick={handlePrintReceipt}
                  className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>
              </div>

              <button
                onClick={handleSendReceiptWhatsApp}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Share2 size={15} />
                <span>Enviar Recibo PDF por WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Live Document Visual Preview Side */}
          <div className="lg:col-span-7 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <FileCheck2 size={13} className="text-[#2d8096]" /> Preview em Tempo Real do Recibo
                </span>
                <button 
                  onClick={() => setReciboNum(Math.floor(100000 + Math.random() * 900000).toString())}
                  className="text-[10px] text-[#2d8096] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} /> Gerar Novo Nº
                </button>
              </div>

              {/* PRINTABLE PREVIEW CONTAINER (Full A4 Layout) */}
              <div id="printable-receipt-preview" className="bg-white rounded-2xl border border-gray-300 shadow-lg space-y-6 text-gray-900 overflow-hidden text-sm w-full max-w-[680px] mx-auto">
                {/* Header Band */}
                <div className="bg-[#2d8096] text-white p-6 md:p-8 border-b-4 border-[#1e5c6d] flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-black text-xl md:text-2xl tracking-tight leading-tight">SEJA MAIS ODONTOLOGIA</h3>
                    <p className="text-xs text-white/90 font-medium mt-1">Gestão e Cuidado Odontológico Integrado • CNPJ: 44.245.543/0001-44</p>
                  </div>
                  <div className="bg-white text-[#2d8096] px-4 py-2 rounded-xl text-right shadow-xs shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8096]">RECIBO OFICIAL</p>
                    <p className="text-sm font-mono font-extrabold">Nº ODO-{reciboNum}</p>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Declaramos para os devidos fins de direito, em especial para comprovação fiscal ou solicitação de reembolso junto a convênios e planos de saúde, que recebemos a importância discriminada abaixo:
                  </p>

                  {/* Value Box */}
                  <div className="bg-[#f0f7f8] border-2 border-[#2d8096]/40 rounded-2xl p-5 text-center shadow-2xs">
                    <span className="text-xs font-extrabold text-[#2d8096] uppercase tracking-widest block mb-1">VALOR TOTAL RECEBIDO</span>
                    <span className="text-3xl md:text-4xl font-black font-display text-[#2d8096]">
                      R$ {reciboAmount ? parseFloat(reciboAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </span>
                  </div>

                  {/* Procedure */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-extrabold text-slate-500 uppercase block mb-1">REFERENTE AO PROCEDIMENTO:</span>
                    <p className="text-sm md:text-base font-bold text-gray-900">{reciboDescription || 'Tratamento Odontológico Integrado'}</p>
                  </div>

                  {/* Patient & Details Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm border border-gray-200 rounded-xl p-4 bg-white">
                    <div>
                      <span className="text-xs font-extrabold text-gray-400 uppercase block">PACIENTE / EMITIDO PARA:</span>
                      <p className="font-bold text-gray-900 truncate">{reciboPatientName || 'Nome do Paciente'}</p>
                      <p className="text-xs text-gray-500 font-mono">CPF: {reciboPatientCPF || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-gray-400 uppercase block">DATA DE EMISSÃO:</span>
                      <p className="font-bold text-gray-900">{new Date(reciboDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-gray-600 font-semibold">Forma: {reciboPaymentMethod}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Profissional Responsável:</span>
                      <span className="font-bold text-gray-900">{reciboDoctor}</span>
                    </div>
                  </div>

                  {/* Quitado Badge */}
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                    <span className="text-sm">✓</span> <span>PAGAMENTO CONFIRMADO E QUITADO</span>
                  </div>

                  {/* Signature Block */}
                  <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                    <div className="border-t border-gray-300 pt-2">
                      <p className="font-bold text-gray-800">Seja Mais Odontologia</p>
                      <p className="text-xs text-gray-400">Assinatura da Clínica / Carimbo</p>
                    </div>
                    <div className="border-t border-gray-300 pt-2">
                      <p className="font-bold text-gray-800">{reciboDoctor}</p>
                      <p className="text-xs text-gray-400">Cirurgião-Dentista Responsável</p>
                    </div>
                  </div>

                  {/* Footer Disclaimer */}
                  <div className="text-xs text-gray-400 text-center border-t border-gray-100 pt-3">
                    Seja Mais Odontologia • CNPJ: 44.245.543/0001-44 • Documento emitido em Formato A4
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. TAB: ATESTADO & DECLARAÇÃO DE COMPARECIMENTO */}
      {/* ========================================== */}
      {activeSubTab === 'atestado' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Form Side */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-level-2 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText size={18} className="text-[#2d8096]" />
              <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Documentos Médicos Odontológicos</h3>
            </div>

            {/* Document Type Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Documento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDocType('atestado')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    docType === 'atestado'
                      ? 'bg-[#2d8096] text-white border-[#2d8096] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Atestado Odontológico
                </button>
                <button
                  onClick={() => setDocType('declaracao')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    docType === 'declaracao'
                      ? 'bg-[#2d8096] text-white border-[#2d8096] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Declaração de Comparecimento
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Paciente</label>
                <input
                  type="text"
                  placeholder="Ex: Gabriel Alves Ferreira"
                  value={docPatientName}
                  onChange={e => setDocPatientName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CPF / RG do Paciente</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={docPatientCPF}
                    onChange={e => setDocPatientCPF(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data do Atendimento</label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={e => setDocDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>
              </div>

              {/* Conditional fields based on type */}
              {docType === 'atestado' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dias de Repouso</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={docRestDays}
                      onChange={e => setDocRestDays(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: K08.9"
                      value={docCid}
                      onChange={e => setDocCid(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Horário Início</label>
                    <input
                      type="time"
                      value={docStartTime}
                      onChange={e => setDocStartTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Horário Fim</label>
                    <input
                      type="time"
                      value={docEndTime}
                      onChange={e => setDocEndTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cirurgião-Dentista</label>
                  <select
                    value={docDoctorName}
                    onChange={e => setDocDoctorName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Número CRO</label>
                  <input
                    type="text"
                    value={docDoctorCRO}
                    onChange={e => setDocDoctorCRO(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Observações Adicionais</label>
                <input
                  type="text"
                  placeholder="Ex: Paciente submetido à cirurgia oral menor"
                  value={docObservations}
                  onChange={e => setDocObservations(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>
            </div>

            {/* Print button */}
            <button
              onClick={handlePrintDocument}
              className="w-full py-2.5 px-4 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer pt-3"
            >
              <Printer size={16} />
              <span>Imprimir / Gerar Documento Oficial</span>
            </button>
          </div>

          {/* Printable Document Preview Side */}
          <div className="lg:col-span-7 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-3">
              Preview do Documento a Ser Impresso
            </span>

            <div id="printable-medical-document" className="bg-white p-8 rounded-xl border border-gray-300 shadow-sm space-y-8 text-gray-900 font-serif">
              {/* Official Clinic Letterhead Header */}
              <div className="text-center border-b-2 border-[#2d8096] pb-4 font-sans">
                <h2 className="font-display font-black text-xl text-[#2d8096] tracking-tight">SEJA MAIS ODONTOLOGIA</h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Clínica de Odontologia Integrada & Especialidades</p>
                <p className="text-[9px] text-gray-400 mt-1">Atendimento Odontológico de Excelência • CRO-SP nº 98765</p>
              </div>

              {/* Title */}
              <div className="text-center font-sans">
                <h3 className="font-display font-black text-lg uppercase tracking-wider text-gray-900 underline decoration-[#2d8096] decoration-2 underline-offset-4">
                  {docType === 'atestado' ? 'ATESTADO ODONTOLÓGICO' : 'DECLARAÇÃO DE COMPARECIMENTO'}
                </h3>
              </div>

              {/* Body Content */}
              <div className="text-sm leading-relaxed text-justify space-y-4 font-sans px-4">
                {docType === 'atestado' ? (
                  <p>
                    Atesto, para os devidos fins de direito, que o(a) Sr(a). <strong className="uppercase">{docPatientName || '________________________'}</strong>, inscrito(a) no CPF/RG sob nº <strong>{docPatientCPF || '___________________'}</strong>, esteve sob meus cuidados profissionais no dia <strong>{new Date(docDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>, necessitando de <strong>{docRestDays} ({docRestDays === '1' ? 'um' : docRestDays}) dia(s)</strong> de repouso para recuperação de sua saúde bucal.
                  </p>
                ) : (
                  <p>
                    Declaro, para os devidos fins, que o(a) Sr(a). <strong className="uppercase">{docPatientName || '________________________'}</strong>, inscrito(a) no CPF/RG sob nº <strong>{docPatientCPF || '___________________'}</strong>, compareceu a esta clínica para realização de consulta/tratamento odontológico no dia <strong>{new Date(docDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>, no período compreendido entre <strong>{docStartTime}h</strong> e <strong>{docEndTime}h</strong>.
                  </p>
                )}

                {docType === 'atestado' && docCid && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <strong>CID:</strong> {docCid}
                  </p>
                )}

                {docObservations && (
                  <p className="text-xs text-gray-700 italic">
                    <strong>Observações:</strong> {docObservations}
                  </p>
                )}
              </div>

              {/* Date & Location */}
              <div className="text-right text-xs font-sans text-gray-600 pr-4 pt-4">
                São Paulo, {new Date(docDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </div>

              {/* Dentist Signature */}
              <div className="pt-12 text-center font-sans space-y-1">
                <div className="w-64 mx-auto border-t border-gray-900 pt-2" />
                <p className="font-bold text-xs text-gray-900">{docDoctorName}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cirurgião-Dentista • {docDoctorCRO}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. TAB: CALCULADORA DE PARCELAMENTO         */}
      {/* ========================================== */}
      {activeSubTab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Form Controls */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-level-2 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Calculator size={18} className="text-[#2d8096]" />
              <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Calculadora de Tratamentos</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Valor Total do Orçamento / Tratamento (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={calcTotalAmount}
                    onChange={e => setCalcTotalAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Desconto à Vista (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={calcCashDiscountPercent}
                      onChange={e => setCalcCashDiscountPercent(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Máx. de Parcelas</label>
                  <select
                    value={calcMaxInstallments}
                    onChange={e => setCalcMaxInstallments(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>{n}x no Cartão</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Taxa de Juros Mensal (% - opcional)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0 = Sem juros"
                    value={calcInterestRatePercent}
                    onChange={e => setCalcInterestRatePercent(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">% a.m.</span>
                </div>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Valores Típicos:</span>
              <div className="flex flex-wrap gap-1.5">
                {['500', '1200', '2500', '4000', '8000', '15000'].map(val => (
                  <button
                    key={val}
                    onClick={() => setCalcTotalAmount(val)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-[#2d8096]/10 hover:text-[#2d8096] text-gray-700 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    R$ {parseInt(val).toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>
            </div>

            {/* Copy options for WhatsApp */}
            <button
              onClick={handleCopyCalcPlanWhatsApp}
              disabled={!calcResults.originalTotal}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer pt-3"
            >
              {copiedCalcPlan ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCalcPlan ? 'Opções Copiadas!' : 'Copiar Simulação Formatada para WhatsApp'}</span>
            </button>
          </div>

          {/* Table Results Side */}
          <div className="lg:col-span-7 space-y-4">
            {/* Cash Highlight Card */}
            <div className="bg-white border border-[#EBEBED] p-5 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex text-[11px] font-semibold bg-[#ECFDF5] text-[#16A34A] px-2.5 py-0.5 rounded-md">
                  Pagamento à vista ({calcCashDiscountPercent}% de desconto)
                </span>
                <h4 className="text-2xl font-semibold text-[#18181B] font-display tabular-nums mt-2">
                  R$ {calcResults.cashValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xs text-[#71717A] mt-0.5 tabular-nums">
                  Economia direta de R$ {calcResults.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para o paciente
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
                <Percent size={20} />
              </div>
            </div>

            {/* Installment Table */}
            <div className="bg-white rounded-2xl border border-[#EBEBED] p-5">
              <h4 className="font-display font-semibold text-sm text-[#18181B] mb-3.5">
                Opções de parcelamento no cartão de crédito
              </h4>

              {calcResults.originalTotal > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {calcResults.installmentList.map(inst => (
                    <div 
                      key={inst.num}
                      className="bg-gray-50 hover:bg-[#2d8096]/5 p-3 rounded-xl border border-gray-200 hover:border-[#2d8096]/40 transition-all text-center"
                    >
                      <span className="text-xs font-black text-[#2d8096] uppercase">{inst.num}x Sem Juros</span>
                      <p className="text-sm font-black text-gray-900 font-display mt-0.5">
                        R$ {inst.valPerInst.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-gray-400 font-medium">Total: R$ {inst.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400 font-medium">
                  Digite o valor total do orçamento ao lado para ver o detalhamento das parcelas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. TAB: GERADOR DE TCLE                     */}
      {/* ========================================== */}
      {activeSubTab === 'tcle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Form Side */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-level-2 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck size={18} className="text-[#2d8096]" />
              <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Termo de Consentimento Livre e Esclarecido</h3>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Selecione o Procedimento</label>
              <select
                value={tcleProcedure}
                onChange={e => setTcleProcedure(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
              >
                <option value="siso">Extração / Cirurgia de Siso</option>
                <option value="implante">Implante Odontológico</option>
                <option value="canal">Tratamento de Canal (Endodontia)</option>
                <option value="orto">Tratamento Ortodôntico / Alinhadores</option>
                <option value="clareamento">Clareamento Dental</option>
                <option value="protese">Próteses e Coroas Dentais</option>
              </select>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Paciente</label>
                <input
                  type="text"
                  placeholder="Ex: Lucas Mendes Ribeiro"
                  value={tclePatientName}
                  onChange={e => setTclePatientName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CPF / RG do Paciente</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={tclePatientCPF}
                  onChange={e => setTclePatientCPF(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cirurgião-Dentista Responsável</label>
                <select
                  value={tcleDoctorName}
                  onChange={e => setTcleDoctorName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d8096]/20"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handlePrintTCLE}
              className="w-full py-2.5 px-4 bg-[#2d8096] hover:bg-[#23677a] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer pt-3"
            >
              <Printer size={16} />
              <span>Imprimir Termo para Assinatura do Paciente</span>
            </button>
          </div>

          {/* Printable TCLE Document Preview */}
          <div className="lg:col-span-7 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-3">
              Preview do Termo de Consentimento
            </span>

            <div id="printable-tcle-document" className="bg-white p-8 rounded-xl border border-gray-300 shadow-sm space-y-6 text-gray-900">
              <div className="text-center border-b border-gray-200 pb-4">
                <h3 className="font-display font-black text-[#2d8096] text-base">SEJA MAIS ODONTOLOGIA</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Consentimento Informado do Paciente</p>
              </div>

              <h4 className="font-display font-black text-sm text-center uppercase tracking-wide">
                {TCLE_TEMPLATES[tcleProcedure].title}
              </h4>

              <div className="text-xs text-gray-700 leading-relaxed text-justify space-y-3">
                <p>
                  Eu, <strong className="uppercase">{tclePatientName || '________________________'}</strong>, portador(a) do documento CPF/RG nº <strong>{tclePatientCPF || '___________________'}</strong>, declaro que fui devidamente esclarecido(a) pelo(a) cirurgião-dentista <strong>{tcleDoctorName}</strong> quanto ao meu diagnóstico e ao plano de tratamento recomendado.
                </p>

                <p className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-800">
                  {TCLE_TEMPLATES[tcleProcedure].text}
                </p>

                <p>
                  Confirmo que tive a oportunidade de fazer todas as perguntas necessárias e que todas as minhas dúvidas foram sanadas de forma clara e compreensível. Dou meu consentimento livre e esclarecido para a realização do procedimento.
                </p>
              </div>

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
                <div className="border-t border-gray-900 pt-2">
                  <p className="font-bold text-gray-900 uppercase">{tclePatientName || 'Assinatura do Paciente / Responsável'}</p>
                  <p className="text-gray-500">Paciente / Responsável Legal</p>
                </div>

                <div className="border-t border-gray-900 pt-2">
                  <p className="font-bold text-gray-900 uppercase">{tcleDoctorName}</p>
                  <p className="text-gray-500">Cirurgião-Dentista Responsável</p>
                </div>
              </div>

              <div className="text-right text-[10px] text-gray-500 pt-4">
                São Paulo, {new Date().toLocaleDateString('pt-BR')}.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
