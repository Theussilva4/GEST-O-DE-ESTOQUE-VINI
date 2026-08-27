import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkOrder, Produto } from '../types';
import { formatCurrency, formatDateTime } from './utils';

export function generateWorkOrderPDF(
  workOrder: WorkOrder,
  download = true,
  includePrices = false
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unidade_medida: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, 12, pageWidth - margin * 2, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const mainTitle = includePrices
    ? 'ORDEM DE SERVIÇO & REQUISIÇÃO (VIA CONTROLE / ALMOXARIFADO)'
    : 'ORDEM DE SERVIÇO & REQUISIÇÃO DE MATERIAIS';
  doc.text(mainTitle, margin + 6, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  const subTitle = includePrices
    ? 'SISTEMA DE CONTROLE DE ALMOXARIFADO & CUSTOS OPERACIONAIS DE SANEAMENTO'
    : 'SISTEMA DE CONTROLE DE ALMOXARIFADO & OPERAÇÃO DE SANEAMENTO (VIA DE CAMPO)';
  doc.text(subTitle, margin + 6, 28);

  // OS Badge on Header right
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(pageWidth - margin - 52, 16, 46, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('NÚMERO DA O.S.', pageWidth - margin - 29, 21, { align: 'center' });
  doc.setFontSize(11);
  doc.text(workOrder.osNumber, pageWidth - margin - 29, 28, { align: 'center' });

  // Main Info Box
  let currentY = 41;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 45, 2, 2, 'FD');

  // Info Grid - Row 1
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DATA / HORA DE EMISSÃO:', margin + 4, currentY + 6);
  doc.text('TIPO DE MANUTENÇÃO:', margin + 70, currentY + 6);
  doc.text('PRIORIDADE:', margin + 130, currentY + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDateTime(workOrder.date), margin + 4, currentY + 11);
  doc.text(workOrder.serviceType || 'CORRETIVA', margin + 70, currentY + 11);
  doc.text(workOrder.priority || 'ALTA', margin + 130, currentY + 11);

  // Info Grid - Row 2
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('SOLICITANTE / EXECUTOR:', margin + 4, currentY + 18);
  doc.text('QUEM AUTORIZOU:', margin + 70, currentY + 18);
  doc.text('LOCAL / ÁREA OPERACIONAL:', margin + 130, currentY + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(workOrder.requesterName || 'Não especificado', margin + 4, currentY + 23);
  doc.text(workOrder.authorizedBy || 'Não especificado', margin + 70, currentY + 23);
  
  // Highlighting Operational Area
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(workOrder.operationalArea || 'Geral / Fábrica', margin + 130, currentY + 23);

  // Info Grid - Row 3: Application / Machine TAG & Sector
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('APLICAÇÃO / EQUIPAMENTO / TAG:', margin + 4, currentY + 30);
  doc.text('SETOR:', margin + 130, currentY + 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const tagText = workOrder.tag_equipamento ? `[TAG: ${workOrder.tag_equipamento}] ` : '';
  const fullAppText = `${tagText}${workOrder.application}`;
  const splitApp = doc.splitTextToSize(fullAppText, 120);
  doc.text(splitApp[0] || '', margin + 4, currentY + 35);
  doc.text(workOrder.sector || 'Oficina Mecânica', margin + 130, currentY + 35);

  // Section: Materials Table
  currentY = 91;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('MATERIAIS REQUISITADOS & BAIXADOS DO ESTOQUE', margin, currentY);

  if (includePrices) {
    const tableBody = workOrder.items.map((item, idx) => [
      String(idx + 1).padStart(2, '0'),
      item.codigo_interno || '-',
      item.nome,
      `${item.quantity} ${item.unidade_medida || 'UN'}`,
      formatCurrency(item.preco_unitario),
      formatCurrency(item.preco_total),
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['ITEM', 'CÓDIGO', 'DESCRIÇÃO DO MATERIAL / COMPONENTE', 'QTD', 'CUSTO UNIT.', 'SUBTOTAL']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
  } else {
    const tableBody = workOrder.items.map((item, idx) => [
      String(idx + 1).padStart(2, '0'),
      item.codigo_interno || '-',
      item.nome,
      item.unidade_medida || 'UN',
      `${item.quantity} ${item.unidade_medida || 'UN'}`,
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['ITEM', 'CÓDIGO', 'DESCRIÇÃO DO MATERIAL / COMPONENTE', 'UNIDADE', 'QTD REQUISITADA']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 36, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 140;

  // Totals Box
  if (includePrices) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(241, 245, 249);
    doc.rect(pageWidth - margin - 80, finalY + 4, 80, 16, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL DE ITENS:', pageWidth - margin - 75, finalY + 10);
    doc.text(`${workOrder.items.length} itens (${workOrder.totalQuantity} un)`, pageWidth - margin - 5, finalY + 10, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CUSTO TOTAL APLICADO:', pageWidth - margin - 75, finalY + 16);
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(formatCurrency(workOrder.totalCost), pageWidth - margin - 5, finalY + 16, { align: 'right' });
  } else {
    // Maintenance Copy (clean - no prices)
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(241, 245, 249);
    doc.rect(pageWidth - margin - 85, finalY + 4, 85, 14, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL DE ITENS DISTINTOS:', pageWidth - margin - 80, finalY + 9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${workOrder.items.length} materiais`, pageWidth - margin - 5, finalY + 9, { align: 'right' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL DE PEÇAS REQUISITADAS:', pageWidth - margin - 80, finalY + 15);
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`${workOrder.totalQuantity || workOrder.items.reduce((a, b) => a + b.quantity, 0)} unidades`, pageWidth - margin - 5, finalY + 15, { align: 'right' });
  }

  // Notes Box
  let noteY = finalY + (includePrices ? 26 : 24);
  if (workOrder.observacoes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('OBSERVAÇÕES TÉCNICAS / SERVIÇO EXECUTADO:', margin, noteY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitNotes = doc.splitTextToSize(workOrder.observacoes, pageWidth - margin * 2);
    doc.text(splitNotes, margin, noteY + 5);
    noteY += 6 + splitNotes.length * 4;
  }

  // Signature Section
  const signY = Math.max(noteY + 8, 232);

  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.5);

  const colWidth = (pageWidth - margin * 2 - 16) / 3;

  // Sign 1: Solicitante / Executor
  const x1 = margin;
  doc.line(x1, signY + 14, x1 + colWidth, signY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(workOrder.requesterName, x1 + colWidth / 2, signY + 19, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('SOLICITANTE / EXECUTOR', x1 + colWidth / 2, signY + 23, { align: 'center' });

  // Sign 2: Autorizado Por
  const x2 = margin + colWidth + 8;
  doc.line(x2, signY + 14, x2 + colWidth, signY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(workOrder.authorizedBy, x2 + colWidth / 2, signY + 19, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('AUTORIZADO POR (SUPERVISÃO)', x2 + colWidth / 2, signY + 23, { align: 'center' });

  // Sign 3: Almoxarife
  const x3 = margin + (colWidth + 8) * 2;
  doc.line(x3, signY + 14, x3 + colWidth, signY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(workOrder.warehouseKeeper || 'Almoxarifado', x3 + colWidth / 2, signY + 19, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ALMOXARIFADO / BAIXA DE ESTOQUE', x3 + colWidth / 2, signY + 23, { align: 'center' });

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento gerado automaticamente pelo EstoquePro MRO em ${formatDateTime(new Date().toISOString())}. Baixa integrada no estoque realizada com sucesso.`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  if (download) {
    const filenameSuffix = includePrices ? 'Controle_Custos' : 'Requisicao_Materiais';
    doc.save(`${workOrder.osNumber}_${filenameSuffix}.pdf`);
  }

  return doc;
}

export function generateInventoryReportPDF(
  products: Produto[],
  filterTitle = 'Inventário Geral de Almoxarifado MRO'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unidade_medida: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, 10, pageWidth - margin * 2, 22, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO GERAL DE ALMOXARIFADO & INVENTÁRIO MRO', margin + 6, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `CONTROLE DE ESTOQUE & SOBRESSALENTES DE SANEAMENTO | EMITIDO EM: ${formatDateTime(new Date().toISOString())} | TOTAL DE ITENS: ${products.length}`,
    margin + 6,
    25
  );

  // Summary Metrics Banner
  const totalStockItems = products.reduce((acc, p) => acc + p.estoque_atual, 0);
  const totalStockValue = products.reduce((acc, p) => acc + p.estoque_atual * p.preco_custo, 0);
  const lowStockCount = products.filter((p) => p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0).length;
  const outOfStockCount = products.filter((p) => p.estoque_atual === 0).length;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, 35, pageWidth - margin * 2, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Peças: ${totalStockItems} un`, margin + 6, 42.5);
  doc.text(`Valor Total em Estoque: ${formatCurrency(totalStockValue)}`, margin + 65, 42.5);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`Ponto de Pedido / Baixo: ${lowStockCount}`, margin + 145, 42.5);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(`Estoque Zerado: ${outOfStockCount}`, margin + 215, 42.5);

  // Inventory Table
  const tableBody = products.map((p, idx) => {
    const isOut = p.estoque_atual === 0;
    const isLow = p.estoque_atual <= p.estoque_minimo && !isOut;
    const statusText = isOut ? 'ZERADO' : isLow ? 'REPOSIÇÃO' : 'NORMAL';
    const critLabel = p.criticidade === 'HIGH' ? 'ALTA' : p.criticidade === 'MEDIUM' ? 'MÉDIA' : 'BAIXA';

    return [
      String(idx + 1).padStart(2, '0'),
      p.code || '-',
      p.name,
      p.tag_equipamento || '-',
      critLabel,
      p.codcategoria,
      p.localizacao_estoque || '-',
      `${p.estoque_atual} ${p.unidade_medida || 'UN'}`,
      `${p.estoque_minimo} ${p.unidade_medida || 'UN'}`,
      formatCurrency(p.preco_custo),
      formatCurrency(p.estoque_atual * p.preco_custo),
      statusText,
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [[
      '#',
      'CÓDIGO',
      'PEÇA / SOBRESSALENTE',
      'TAG EQUIP.',
      'CRIT.',
      'CATEGORIA',
      'LOCALIZAÇÃO',
      'ESTOQUE',
      'MÍN.',
      'CUSTO UNIT.',
      'VALOR TOTAL',
      'STATUS',
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 24 },
      6: { cellWidth: 22 },
      7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 22, halign: 'right' },
      10: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      11: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  const filename = `Relatorio_Almoxarifado_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return doc;
}
