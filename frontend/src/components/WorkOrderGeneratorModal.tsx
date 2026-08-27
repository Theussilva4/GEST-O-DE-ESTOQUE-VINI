import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Download,
  AlertTriangle,
  Search,
  Wrench,
  UserCheck,
  Building,
  Layers,
  ArrowRight,
  MapPin,
  Settings,
} from 'lucide-react';
import { Produto, WorkOrder, WorkOrderItem, User, OperationalArea } from '../types';
import { formatCurrency } from '../lib/utils';
import { generateWorkOrderPDF } from '../lib/pdfGenerator';

interface WorkOrderGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Produto[];
  currentUser: User | null;
  users: User[];
  areas?: OperationalArea[];
  onOpenAreasManagement?: () => void;
  onWorkOrderCreated: (workOrder: WorkOrder, updatedProducts: Produto[]) => void;
  onRequestOpenLogin?: () => void;
}

interface DraftItem {
  codproduto: string;
  quantity: number;
  customPrice?: number;
}

export const WorkOrderGeneratorModal: React.FC<WorkOrderGeneratorModalProps> = ({
  isOpen,
  onClose,
  products,
  currentUser,
  users,
  areas = [],
  onOpenAreasManagement,
  onWorkOrderCreated,
}) => {
  // OS Fields
  const [osNumber, setOsNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [serviceType, setServiceType] = useState<WorkOrder['serviceType']>('CORRETIVA');
  const [priority, setPriority] = useState<WorkOrder['priority']>('ALTA');
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState('Mecânico / Técnico');
  const [authorizedBy, setAuthorizedBy] = useState(currentUser?.name ? `${currentUser.name} (Gestor)` : 'Supervisão / Almoxarifado');
  const [sector, setSector] = useState('Oficina Mecânica');
  const [operationalArea, setOperationalArea] = useState(areas.length > 0 ? areas[0].name : '');
  const [tag_equipamento, setEquipmentTag] = useState('');
  const [application, setApplication] = useState('');
  const [observacoes, setNotes] = useState('');

  // Set default operational area if areas provided
  useEffect(() => {
    if (areas.length > 0 && !operationalArea) {
      setOperationalArea(areas[0].name);
    }
  }, [areas, operationalArea]);

  // Items in O.S.
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [autoDischarge, setAutoDischarge] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<WorkOrder | null>(null);

  // Load next OS number preview
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setCreatedOrder(null);
      fetchNextNumber();
    }
  }, [isOpen]);

  const fetchNextNumber = async () => {
    try {
      const res = await fetch('/api/work-orders/next-number');
      if (res.ok) {
        const data = await res.json();
        if (data.nextNumber) {
          setOsNumber(data.nextNumber);
        }
      }
    } catch {
      const year = new Date().getFullYear();
      setOsNumber(`OS-${year}-0001`);
    }
  };

  // Filtered products for selector
  const availableProducts = useMemo(() => {
    if (!searchTerm.trim()) return products.slice(0, 15);
    const lower = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.code.toLowerCase().includes(lower) ||
        (p.tag_equipamento && p.tag_equipamento.toLowerCase().includes(lower))
    );
  }, [products, searchTerm]);

  // Handle adding an item to the draft list
  const handleAddItem = (codproduto: string, qty = 1) => {
    if (!codproduto) return;
    const existingIndex = draftItems.findIndex((i) => i.codproduto === codproduto);
    if (existingIndex >= 0) {
      const updated = [...draftItems];
      updated[existingIndex].quantity += qty;
      setDraftItems(updated);
    } else {
      setDraftItems([...draftItems, { codproduto, quantity: qty }]);
    }
    setSelectedProductToAdd('');
    setSearchTerm('');
    setQuantityToAdd(1);
  };

  const handleUpdateQuantity = (codproduto: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(codproduto);
      return;
    }
    setDraftItems(
      draftItems.map((item) =>
        item.codproduto === codproduto ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (codproduto: string) => {
    setDraftItems(draftItems.filter((i) => i.codproduto !== codproduto));
  };

  // Detailed items calculation
  const calculatedItems = useMemo(() => {
    return draftItems
      .map((draft) => {
        const product = products.find((p) => p.id === draft.codproduto);
        if (!product) return null;
        const price = draft.customPrice !== undefined ? draft.customPrice : product.preco_custo || product.preco_venda || 0;
        const total = price * draft.quantity;
        const isStockLow = product.estoque_atual < draft.quantity;
        return {
          product,
          quantity: draft.quantity,
          preco_unitario: price,
          preco_total: total,
          isStockLow,
        };
      })
      .filter(Boolean) as Array<{
      product: Produto;
      quantity: number;
      preco_unitario: number;
      preco_total: number;
      isStockLow: boolean;
    }>;
  }, [draftItems, products]);

  const totalCost = useMemo(() => {
    return calculatedItems.reduce((acc, curr) => acc + curr.preco_total, 0);
  }, [calculatedItems]);

  const totalItemsCount = useMemo(() => {
    return calculatedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [calculatedItems]);

  // Submit Work Order (generate & deduct stock)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!requesterName.trim()) {
      setErrorMsg('Informe o nome do funcionário solicitante/executor.');
      return;
    }
    if (!authorizedBy.trim()) {
      setErrorMsg('Informe quem autorizou a requisição dos materiais.');
      return;
    }
    if (!application.trim()) {
      setErrorMsg('Informe a aplicação do material / TAG do equipamento.');
      return;
    }
    if (draftItems.length === 0) {
      setErrorMsg('Adicione ao menos um material/peça para a Ordem de Serviço.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        osNumber: osNumber.trim(),
        date: new Date(date).toISOString(),
        serviceType,
        priority,
        requesterName: requesterName.trim(),
        requesterRole: requesterRole.trim(),
        authorizedBy: authorizedBy.trim(),
        warehouseKeeper: currentUser?.name || 'Carlos Almoxarife',
        sector: sector.trim(),
        operationalArea: operationalArea.trim(),
        tag_equipamento: tag_equipamento.trim(),
        application: application.trim(),
        observacoes: observacoes.trim(),
        autoDischarge,
        items: calculatedItems.map((item) => ({
          codproduto: item.product.id,
          codigo_interno: item.product.code,
          nome: item.product.name,
          quantity: item.quantity,
          unidade_medida: item.product.unidade_medida,
          preco_unitario: item.preco_unitario,
          preco_total: item.preco_total,
          estoque_atual: item.product.estoque_atual,
        })),
      };

      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar Ordem de Serviço.');
      }

      setCreatedOrder(data.workOrder);
      onWorkOrderCreated(data.workOrder, data.products);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="work-order-generator-modal"
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Gerador de Ordem de Serviço (O.S.)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500 text-slate-950 font-bold">
                  {osNumber || 'NOVA O.S.'}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Requisição multi-item com baixa automática no estoque e emissão instantânea de PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grow space-y-6 text-slate-800 dark:text-slate-200">
          {createdOrder ? (
            /* SUCCESS VIEW WITH PDF DOWNLOAD & PRINT */
            <div className="py-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <span>Status: {createdOrder.status || 'ABERTA'}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Ordem de Serviço {createdOrder.osNumber} Gerada!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {createdOrder.status === 'CONCLUIDA' ? (
                    <>
                      A baixa de <strong>{createdOrder.totalQuantity} unidade(s)</strong> de materiais foi
                      processada e debitada do estoque físico do almoxarifado.
                    </>
                  ) : (
                    <>
                      Guia de Separação/Campo emitida para <strong>{createdOrder.totalQuantity} unidade(s)</strong> de materiais liberados. Status <strong>ABERTA</strong> (Aguardando Baixa física na retirada).
                    </>
                  )}
                </p>
              </div>

              {/* OS Summary Pill */}
              <div className="max-w-xl mx-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Solicitante</span>
                    <span className="font-bold text-slate-900 dark:text-white">{createdOrder.requesterName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Autorizado Por</span>
                    <span className="font-bold text-slate-900 dark:text-white">{createdOrder.authorizedBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Local / Estação</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {createdOrder.operationalArea || 'Geral'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">TAG Equipamento</span>
                    <span className="font-bold text-slate-900 dark:text-white">{createdOrder.tag_equipamento || 'Geral'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Custo Total (ADM)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(createdOrder.totalCost)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({createdOrder.totalQuantity} un baixadas)
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    Materiais Baixados ({createdOrder.items.length} itens):
                  </span>
                  <div className="space-y-1">
                    {createdOrder.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {it.nome} ({it.codigo_interno}) - {it.quantity} {it.unidade_medida || 'UN'}
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {formatCurrency(it.preco_total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => generateWorkOrderPDF(createdOrder, true, false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  title="Documento sem valores, padrão para entregar à equipe de manutenção"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar O.S. (Via Mecânico / Sem Valores)</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateWorkOrderPDF(createdOrder, true, true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs transition-all cursor-pointer"
                  title="Via com valores financeiros para o almoxarife/administração"
                >
                  <Download className="w-4 h-4 text-purple-600" />
                  <span>Via Almoxarifado (Com Custos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const doc = generateWorkOrderPDF(createdOrder, false, false);
                    doc.autoPrint();
                    window.open(doc.output('bloburl'), '_blank');
                  }}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-all"
                >
                  Concluir & Fechar
                </button>
              </div>
            </div>
          ) : (
            /* WORK ORDER FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* SECTION 1: CABEÇALHO & RESPONSÁVEIS */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    1. Dados da O.S. & Responsáveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Número da OS */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nº da O.S. (Automático)
                    </label>
                    <input
                      type="text"
                      value={osNumber}
                      onChange={(e) => setOsNumber(e.target.value)}
                      placeholder="Ex: OS-2026-0042"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  {/* Data e Hora */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Data e Hora de Emissão
                    </label>
                    <input
                      type="datetime-local"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Tipo de Manutenção */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Tipo de Manutenção
                    </label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                    >
                      <option value="CORRETIVA">🚨 Manutenção Corretiva</option>
                      <option value="PREVENTIVA">🛡️ Manutenção Preventiva</option>
                      <option value="PREDITIVA">📈 Manutenção Preditiva</option>
                      <option value="EMERGENCIAL">⚡ Emergencial / Parada de Estação / Falta d'Água</option>
                      <option value="REFORMA">🔨 Reforma / Capex / Melhoria</option>
                      <option value="INSTALACAO">🔌 Nova Instalação</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Solicitante / Executor */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Funcionário Solicitante / Executor *
                    </label>
                    <input
                      type="text"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="Ex: João Silva (Mecânico)"
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Quem Autorizou */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quem Autorizou (Supervisor / Eng) *
                    </label>
                    <input
                      type="text"
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      placeholder="Ex: Supervisor de Manutenção / PCM"
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Setor / Oficina */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Setor / Oficina
                    </label>
                    <input
                      type="text"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      placeholder="Ex: Oficina Mecânica, Usinagem, Linha 01"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: APLICAÇÃO, LOCAL OPERACIONAL & ESCOPO DO SERVIÇO */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    2. Localização Operacional, TAG & Aplicação
                  </span>
                  {onOpenAreasManagement && (
                    <button
                      type="button"
                      onClick={onOpenAreasManagement}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cadastrar / Gerenciar Locais</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Local Operacional */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Local Operacional / Unidade *</span>
                    </label>
                    <div className="flex gap-1.5">
                      <div className="relative grow">
                        <select
                          value={operationalArea}
                          onChange={(e) => setOperationalArea(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                        >
                          {areas && areas.length > 0 ? (
                            areas.map((ar) => (
                              <option key={ar.id} value={ar.name}>
                                {ar.name} {ar.code ? `(${ar.code})` : ''}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Geral / Fábrica">Geral / Fábrica</option>
                              <option value="Oficina Central">Oficina Central</option>
                              <option value="Almoxarifado Central">Almoxarifado Central</option>
                            </>
                          )}
                        </select>
                      </div>
                      {onOpenAreasManagement && (
                        <button
                          type="button"
                          onClick={onOpenAreasManagement}
                          title="Gerenciar Locais"
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TAG Equipamento */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      TAG Equipamento
                    </label>
                    <input
                      type="text"
                      value={tag_equipamento}
                      onChange={(e) => setEquipmentTag(e.target.value)}
                      placeholder="Ex: BOM-03, TOR-01"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Aplicação */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Aplicação do Material *
                    </label>
                    <input
                      type="text"
                      value={application}
                      onChange={(e) => setApplication(e.target.value)}
                      placeholder="Ex: Troca de rolamentos e vedação"
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Serviço a ser Executado / Detalhes Técnicos
                  </label>
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções de montagem, folga axial, torque de aperto ou motivo da quebra..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>

              {/* SECTION 3: SELEÇÃO DE MATERIAIS REQUISITADOS */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    3. Materiais Requisitados & Baixa de Estoque
                  </span>
                  <span className="text-xs text-slate-500">
                    {draftItems.length} material(is) selecionado(s)
                  </span>
                </div>

                {/* Quick Item Picker Box */}
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Search / Select Material */}
                    <div className="relative grow">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar peça por nome (ex: Rolamento 3311, Retentor, Selo)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={quantityToAdd}
                        onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center text-slate-900 dark:text-slate-100"
                        title="Quantidade a requisitar"
                      />

                      {/* Select from dropdown */}
                      <select
                        value={selectedProductToAdd}
                        onChange={(e) => {
                          setSelectedProductToAdd(e.target.value);
                          if (e.target.value) {
                            handleAddItem(e.target.value, quantityToAdd);
                          }
                        }}
                        className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        <option value="">+ Selecionar & Adicionar Peça</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name} (Saldo: {p.estoque_atual} {p.unidade_medida})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fast Suggested Chips (Rolamento 3311, Rolamento 3310, Retentor 47x36x10, Selo Mecanico) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Sugestões Rápidas:</span>
                    {products
                      .filter(
                        (p) =>
                          p.name.includes('3311') ||
                          p.name.includes('3310') ||
                          p.name.includes('47x36x10') ||
                          p.name.toLowerCase().includes('selo mec')
                      )
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddItem(p.id, 1)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-600 transition-colors text-[11px] font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-emerald-600" />
                          <span>{p.name.split('(')[0]}</span>
                          <span className="text-[10px] font-mono text-slate-400">({p.estoque_atual} un)</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Table of Chosen Items */}
                {calculatedItems.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nenhum material adicionado à O.S. ainda. Selecione os itens no campo acima e clique em "Adicionar à Lista".
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Material / Peça</th>
                          <th className="py-2.5 px-3 text-center">Saldo Atual</th>
                          <th className="py-2.5 px-3 text-center w-32">Qtd a Baixar</th>
                          <th className="py-2.5 px-3 text-right">
                            <span className="flex items-center justify-end gap-1">
                              <span>Custo Unit.</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-normal">ADM</span>
                            </span>
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            <span className="flex items-center justify-end gap-1">
                              <span>Subtotal</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-normal">ADM</span>
                            </span>
                          </th>
                          <th className="py-2.5 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {calculatedItems.map(({ product, quantity, preco_unitario, preco_total, isStockLow }) => (
                          <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {product.code}
                            </td>
                            <td className="py-2.5 px-3 min-w-[160px]">
                              <div className="font-semibold text-slate-900 dark:text-white break-words whitespace-normal leading-snug">{product.name}</div>
                              <div className="text-[10px] text-slate-400 break-words whitespace-normal mt-0.5">
                                {product.localizacao_estoque ? `Loc: ${product.localizacao_estoque}` : product.codcategoria}
                                {product.codfornecedor ? ` • ${product.codfornecedor}` : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                  isStockLow
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {product.estoque_atual} {product.unidade_medida}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={quantity}
                                  onChange={(e) => handleUpdateQuantity(product.id, Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                />
                                <span className="text-[11px] text-slate-500 font-bold">{product.unidade_medida}</span>
                              </div>
                              {isStockLow && (
                                <span className="text-[9px] text-rose-500 font-semibold block mt-0.5">
                                  Saldo insuficiente!
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {formatCurrency(preco_unitario)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(preco_total)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(product.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary Bar */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                        <span>
                          Materiais: <strong>{calculatedItems.length} itens</strong>
                        </span>
                        <span>
                          Total de peças: <strong className="text-emerald-600 dark:text-emerald-400">{totalItemsCount} un</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500 uppercase text-[10px]">
                            Custo Total Almoxarifado:
                          </span>
                          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalCost)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
                          Ocultado na via física do mecânico
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto discharge toggle option */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoDischarge}
                    onChange={(e) => setAutoDischarge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Dar baixa física imediata no estoque no ato da emissão
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {autoDischarge
                        ? 'O estoque físico do almoxarifado será debitado agora e a O.S. será marcada como CONCLUÍDA.'
                        : 'Padrão recomendado: Apenas emite a O.S. e a Guia de Separação (status ABERTA). A baixa física é feita quando os materiais forem retirados no balcão/campo.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || draftItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Processando & Gerando PDF...</span>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>
                        {autoDischarge
                          ? 'Gerar O.S., Baixar Estoque & Emitir PDF'
                          : 'Gerar O.S. & Liberar Guia de Materiais'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
