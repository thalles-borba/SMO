import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Opens a clean printable popup window for printing HTML content directly.
 * Bypasses iframe restrictions on window.print().
 */
export function openPrintWindow(elementId: string, title: string = 'Documento - Seja Mais Odontologia') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert(`Não foi possível encontrar o documento (${elementId}) para impressão.`);
    return;
  }

  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    alert('O seu navegador bloqueou a janela de impressão. Por favor, permita pop-ups para este site.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 12mm; 
          }
          @media print {
            html, body {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .a4-container {
              width: 100% !important;
              max-width: 210mm !important;
              min-height: 280mm !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }
          }
          body { 
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
            background: #f1f5f9; 
            color: #0f172a; 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 28px; 
            min-height: 100vh;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 24px; width: 100%; max-width: 210mm; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size:13px; font-weight:bold; color:#475569;">📄 Formato A4 Padrão (210 x 297 mm)</span>
          <button onclick="window.print()" style="background:#2d8096; color:white; border:none; padding:12px 28px; border-radius:12px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow: 0 4px 14px rgba(45,128,150,0.3);">
            🖨️ Imprimir Recibo A4 / Salvar PDF
          </button>
        </div>
        <div class="a4-container" style="width: 100%; max-width: 210mm; background: white; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.12); overflow: hidden;">
          ${element.innerHTML}
        </div>
        <script>
          setTimeout(() => {
            window.print();
          }, 800);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Creates a clean vector jsPDF instance for Financial Receipts in standard A4 Size (210mm x 297mm)
 */
export function buildNativeReceiptPDFDoc(data: {
  receiptNum: string;
  dateStr: string;
  clientName: string;
  clientCPF: string;
  valueStr: string;
  description: string;
  doctorName: string;
  paymentMethod: string;
}): jsPDF {
  // A4 Portrait Dimensions: 210mm width x 297mm height
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;

  // Top Header band
  doc.setFillColor(45, 128, 150); // #2d8096
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Header bottom accent line
  doc.setFillColor(30, 92, 109);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Title & CNPJ
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SEJA MAIS ODONTOLOGIA', 16, 17);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestão e Cuidado Odontológico Integrado • CNPJ: 44.245.543/0001-44', 16, 26);

  // Receipt Badge Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 68, 7, 52, 22, 3, 3, 'F');
  doc.setTextColor(45, 128, 150);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RECIBO OFICIAL', pageWidth - 42, 15, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`Nº ODO-${data.receiptNum.toUpperCase()}`, pageWidth - 42, 23, { align: 'center' });

  let y = 52;

  // Declaration text
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const textLines = doc.splitTextToSize(
    'Declaramos para os devidos fins de direito, em especial para comprovação fiscal ou solicitação de reembolso junto a convênios e planos de saúde, que recebemos a importância discriminada abaixo:',
    pageWidth - 32
  );
  doc.text(textLines, 16, y);

  y += textLines.length * 6 + 10;

  // Value Box (A4 proportional)
  doc.setFillColor(240, 247, 248);
  doc.setDrawColor(45, 128, 150);
  doc.setLineWidth(0.4);
  doc.roundedRect(16, y, pageWidth - 32, 26, 3, 3, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VALOR TOTAL RECEBIDO', pageWidth / 2, y + 8, { align: 'center' });

  doc.setTextColor(45, 128, 150);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`R$ ${data.valueStr}`, pageWidth / 2, y + 19, { align: 'center' });

  y += 36;

  // Procedure details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, y, pageWidth - 32, 24, 3, 3, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('REFERENTE AO PROCEDIMENTO:', 22, y + 8);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const procLines = doc.splitTextToSize(data.description || 'Tratamento Odontológico Integrado', pageWidth - 44);
  doc.text(procLines[0] || '', 22, y + 17);

  y += 34;

  // Table Details Grid Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(16, y, pageWidth - 32, 48, 3, 3, 'D');

  // Divider lines inside table
  doc.line(16, y + 24, pageWidth - 16, y + 24); // horizontal
  doc.line(pageWidth / 2, y, pageWidth / 2, y + 48); // vertical

  // Row 1 Left: Patient Name & CPF
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PACIENTE / EMITIDO PARA:', 22, y + 7);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const clientNameCut = data.clientName.length > 32 ? data.clientName.substring(0, 32) + '...' : data.clientName;
  doc.text(clientNameCut || 'Nome do Paciente', 22, y + 14);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`CPF: ${data.clientCPF || 'Não informado'}`, 22, y + 20);

  // Row 1 Right: Emission Date
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA DE EMISSÃO:', pageWidth / 2 + 6, y + 7);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dateStr, pageWidth / 2 + 6, y + 15);

  // Row 2 Left: Doctor Name
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFISSIONAL RESPONSÁVEL:', 22, y + 31);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const docNameCut = data.doctorName.length > 32 ? data.doctorName.substring(0, 32) + '...' : data.doctorName;
  doc.text(docNameCut || 'Seja Mais Odontologia', 22, y + 39);

  // Row 2 Right: Payment Method
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMA DE PAGAMENTO:', pageWidth / 2 + 6, y + 31);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.paymentMethod || 'Pix', pageWidth / 2 + 6, y + 39);

  y += 58;

  // Quitado Stamp Badge
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(16, y, pageWidth - 32, 14, 2.5, 2.5, 'FD');
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('✓ PAGAMENTO CONFIRMADO E QUITADO', pageWidth / 2, y + 9, { align: 'center' });

  y += 38;

  // Signatures Section
  doc.setDrawColor(203, 213, 225);
  doc.line(22, y, 92, y);
  doc.line(pageWidth - 92, y, pageWidth - 22, y);

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Seja Mais Odontologia', 57, y, { align: 'center' });
  doc.text(data.doctorName || 'Profissional Responsável', pageWidth - 57, y, { align: 'center' });

  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura da Clínica / Carimbo', 57, y, { align: 'center' });
  doc.text('Cirurgião-Dentista Responsável', pageWidth - 57, y, { align: 'center' });

  // Footer
  y = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(16, y - 4, pageWidth - 16, y - 4);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Seja Mais Odontologia • CNPJ: 44.245.543/0001-44 • Documento gerado eletronicamente em Formato A4', pageWidth / 2, y, { align: 'center' });

  return doc;
}

/**
 * Creates a clean vector PDF directly for Financial Receipts (downloads automatically)
 */
export function generateNativeReceiptPDF(data: {
  receiptNum: string;
  dateStr: string;
  clientName: string;
  clientCPF: string;
  valueStr: string;
  description: string;
  doctorName: string;
  paymentMethod: string;
}): boolean {
  try {
    const doc = buildNativeReceiptPDFDoc(data);
    const filename = `Recibo_SejaMais_ODO-${data.receiptNum.toUpperCase()}.pdf`;
    
    try {
      doc.save(filename);
    } catch {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (err) {
    console.error('Erro gerando PDF nativo do recibo:', err);
    return false;
  }
}

/**
 * Generates a PDF Blob from an HTML Element ID via html2canvas
 */
export async function getElementPDFBlob(elementId: string): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.maxHeight = 'none';
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.background = '#ffffff';
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfPageHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfPageHeight;
    }

    return pdf.output('blob');
  } catch (err) {
    console.error('Erro gerando Blob PDF do elemento:', err);
    return null;
  }
}

/**
 * Captures an HTML element by ID and downloads it as a PDF
 */
export async function downloadElementAsPDF(
  elementId: string, 
  filename: string
): Promise<boolean> {
  const blob = await getElementPDFBlob(elementId);
  if (!blob) {
    openPrintWindow(elementId, filename);
    return false;
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  return true;
}

/**
 * Sends PDF file directly to WhatsApp:
 * 1. Uses Web Share API (native share) if supported, so WhatsApp opens with the PDF attached directly.
 * 2. Fallback: Downloads PDF file automatically to device and opens WhatsApp Web with an explanatory message.
 */
export async function sharePDFToWhatsApp({
  elementId,
  receiptData,
  filename,
  phone,
  textMessage
}: {
  elementId?: string;
  receiptData?: any;
  filename: string;
  phone: string;
  textMessage: string;
}): Promise<boolean> {
  let pdfBlob: Blob | null = null;

  // Build PDF Blob either from vector receipt generator or element canvas
  if (receiptData) {
    try {
      const doc = buildNativeReceiptPDFDoc(receiptData);
      pdfBlob = doc.output('blob');
    } catch (e) {
      console.warn('Erro ao gerar native PDF blob, tentando canvas:', e);
    }
  }

  if (!pdfBlob && elementId) {
    pdfBlob = await getElementPDFBlob(elementId);
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const cleanPhone = phone.replace(/\D/g, '');

  if (pdfBlob) {
    const pdfFile = new File([pdfBlob], cleanFilename, { type: 'application/pdf' });

    // Try Web Share API (mobile devices / supported browsers) for direct file sharing
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: cleanFilename,
          text: textMessage
        });
        return true;
      } catch (shareErr) {
        console.warn('Web Share API cancelado ou não suportado para arquivo, usando fallback:', shareErr);
      }
    }

    // Fallback for Desktop Web / Browsers without native file sharing:
    // 1. Force download of the PDF file to user device
    const blobUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = cleanFilename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  // 2. Open WhatsApp with pre-populated message indicating the PDF file attachment
  const fullMessage = `${textMessage}\n\n📄 *Arquivo PDF Anexo:* ${cleanFilename}\n*(O arquivo PDF foi baixado automaticamente na sua pasta de downloads. Basta clicar no clipe 📎 no WhatsApp e anexar o arquivo!)*`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(fullMessage)}`;
  window.open(whatsappUrl, '_blank');

  return true;
}
