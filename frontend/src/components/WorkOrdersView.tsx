import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  Calendar,
  User,
  Wrench,
  ChevronRight,
  Sparkles,
  Layers,
  Clock,
  Package,
  Cpu,
  DollarSign,
  MapPin,
  Map,
  RotateCcw,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Ban,
} from 'lucide-react';
import { WorkOrder, Produto, OperationalArea, User as AppUser } from '../types';
import { formatCurrency, formatDateTime } from '../lib/utils';
import { generateWorkOrderPDF } from '../lib/pdfGenerator';
import { WorkOrderReturnModal } from './WorkOrderReturnModal';
import { WorkOrderDischargeModal } from './WorkOrderDischargeModal';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  products: Produto[];
  areas?: OperationalArea[];
  currentUser?: AppUser | null;
  onOpenGenerator: () => void;
  onOpenAreasManagement?: () => void;
  onConfirmReturn?: (
    workOrderId: string,
    returnData: {
      codproduto: string;
      quantity: number;
      returnedBy: string;
      reason: string;
      observacoes?: string;
    }
  ) => Promise<void>;
  onConfirmDischarge?: (
    workOrderId: string,
    dischargeData: {
      itemsToDischarge: Array<{ codproduto: string; quantity: number }>;
      dischargedBy: string;
      observacoes?: string;
    }
  ) => Promise<void>;
  onCancelWorkOrder?: (workOrderId: string, reason?: string) => Promise<void>;
  canManage: boolean;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workOrders,
  products,
  areas = [],
  currentUser = null,
  onOpenGenerator,
  onOpenAreasManagement,
  onConfirmReturn,
  onConfirmDischarge,
  onCancelWorkOrder,
  canManage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [returnModalWorkOrder, setReturnModalWorkOrder] = useState<WorkOrder | null>(null);
  const [dischargeModalWorkOrder, setDischargeModalWorkOrder] = useState<WorkOrder | null>(null);

  // Filtered list
  const filteredOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchSearch =
        wo.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wo.operationalArea && wo.operationalArea.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (wo.tag_equipamento && wo.tag_equipamento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (wo.authorizedBy && wo.authorizedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        wo.items.some((it) => it.nome.toLowerCase().includes(searchTerm.toLowerCase()) || it.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase()));

      const status = wo.status || 'CONCLUIDA';
      const matchStatus = selectedStatus === 'ALL' || status === selectedStatus;
      const matchType = selectedServiceType === 'ALL' || wo.serviceType === selectedServiceType;
      const matchArea = selectedArea === 'ALL' || wo.operationalArea === selectedArea;
      return matchSearch && matchStatus && matchType && matchArea;
    });
  }, [workOrders, searchTerm, selectedStatus, selectedServiceType, selectedArea]);

  // Metrics
  const distinctRequesters = useMemo(() => {
    const setReq = new Set(workOrders.map((w) => w.requesterName.trim()).filter(Boolean));
    return setReq.size;
  }, [workOrders]);

  const openOrdersCount = useMemo(() => {
    return workOrders.filter((w) => (w.status || 'CONCLUIDA') === 'ABERTA' || (w.status || 'CONCLUIDA') === 'PARCIAL').length;
  }, [workOrders]);

  const totalPartsDeducted = useMemo(() => {
    return workOrders.reduce((acc, curr) => {
      // Sum discharged quantities
      const discharged = curr.items.reduce((s, i) => s + (i.dischargedQuantity !== undefined ? i.dischargedQuantity : i.quantity), 0);
      return acc + discharged;
    }, 0);
  }, [workOrders]);

  const totalCostApplied = useMemo(() => {
    return workOrders.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
  }, [workOrders]);

  const getStatusBadge = (status?: string) => {
    const s = status || 'CONCLUIDA';
    switch (s) {
      case 'ABERTA':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>ABERTA (Aguardando Baixa)</span>
          </span>
        );
      case 'PARCIAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>BAIXA PARCIAL</span>
          </span>
        );
      case 'CONCLUIDA':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>CONCLUÍDA</span>
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            CANCELADA
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
              MRO & PCM
            </span>
            <span className="text-xs text-slate-400 font-medium">• Controle de Requisições & Custos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Ordens de Serviço & Requisições de Peças
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Geração de O.S., baixa simultânea no estoque, controle financeiro para almoxarifado/engenharia e emissão de via de campo para as estações e redes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {onOpenAreasManagement && (
            <button
              type="button"
              onClick={onOpenAreasManagement}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Locais Operacionais</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onOpenGenerator}
              className="grow sm:grow-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Gerar Nova Ordem de Serviço</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total de O.S. Emitidas</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {workOrders.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {openOrdersCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono">
                {openOrdersCount} aberta(s) aguardando baixa
              </span>
            ) : (
              'Todas baixadas/concluídas'
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Peças Efetivamente Baixadas</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalPartsDeducted} <span className="text-xs text-slate-400 font-normal">un</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Debitadas fisicamente</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Custo em O.S. (Almoxarifado)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalCostApplied)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Investimento aplicado em MRO</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Solicitantes / Executores</span>
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {distinctRequesters} <span className="text-xs text-slate-400 font-normal">mecânicos</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Equipe de manutenção</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative grow">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nº da O.S. (ex: OS-2026-0001), solicitante, máquina, peça..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="ALL">Status: Todos</option>
            <option value="ABERTA">🟡 ABERTAS (Aguardando Baixa)</option>
            <option value="PARCIAL">🔵 BAIXA PARCIAL</option>
            <option value="CONCLUIDA">🟢 CONCLUÍDAS (100% Baixadas)</option>
            <option value="CANCELADA">⚪ CANCELADAS</option>
          </select>

          {/* Filter by Operational Area */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="ALL">📍 Todos os Locais / Unidades</option>
            {areas && areas.length > 0
              ? areas.map((ar) => (
                  <option key={ar.id} value={ar.name}>
                    {ar.name}
                  </option>
                ))
              : Array.from(new Set(workOrders.map((wo) => wo.operationalArea).filter(Boolean))).map((areaName) => (
                  <option key={areaName} value={areaName}>
                    {areaName}
                  </option>
                ))}
          </select>

          {/* Filter by Service Type */}
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="ALL">Todos os Tipos de Manutenção</option>
            <option value="CORRETIVA">Corretiva</option>
            <option value="PREVENTIVA">Preventiva</option>
            <option value="PREDITIVA">Preditiva</option>
            <option value="EMERGENCIAL">Emergencial</option>
            <option value="REFORMA">Reforma / Melhoria</option>
          </select>
        </div>
      </div>

      {/* Work Orders List / Grid */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Nenhuma Ordem de Serviço encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Gere a primeira O.S. para requisitar materiais com baixa automática no estoque e geração de PDF.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onOpenGenerator}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Gerar Nova O.S.</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredOrders.map((wo) => (
            <div
              key={wo.id}
              onClick={() => setSelectedWorkOrder(wo)}
              className="group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {wo.osNumber}
                      </span>
                      {getStatusBadge(wo.status)}
                      {wo.operationalArea && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0 text-blue-500" />
                          <span>{wo.operationalArea}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {wo.serviceType}
                      </span>
                      {wo.priority === 'URGENTE' || wo.priority === 'ALTA' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          {wo.priority}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(wo.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-sm font-mono text-slate-900 dark:text-white">
                      {formatCurrency(wo.totalCost)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono border ${
                        (wo.status || 'CONCLUIDA') === 'ABERTA'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {(wo.status || 'CONCLUIDA') === 'ABERTA'
                        ? '0 un baixadas (Pendente)'
                        : `${wo.totalQuantity || wo.items.reduce((s, i) => s + (i.dischargedQuantity ?? i.quantity), 0)} un baixadas`}
                    </span>
                  </div>
                </div>

                {/* Application & TAG */}
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words leading-snug">
                    {wo.tag_equipamento && <span className="text-emerald-600 dark:text-emerald-400 font-mono mr-1.5">[{wo.tag_equipamento}]</span>}
                    {wo.application}
                  </div>
                  {wo.observacoes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic break-words leading-relaxed">
                      "{wo.observacoes}"
                    </p>
                  )}
                </div>

                {/* People Involved */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Solicitante:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <User className="w-3 h-3 text-emerald-600" />
                      {wo.requesterName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-semibold">Autorizado Por:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {wo.authorizedBy}
                    </span>
                  </div>
                </div>

                {/* Material Pill summary */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-between">
                    <span>Materiais Solicitados ({wo.items.length} itens):</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {wo.items.reduce((s, i) => s + i.quantity, 0)} un total
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wo.items.map((it, idx) => {
                      const discharged = it.dischargedQuantity !== undefined ? it.dischargedQuantity : (wo.status === 'ABERTA' ? 0 : it.quantity);
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                        >
                          <span>{it.quantity}x {it.nome.split('(')[0]}</span>
                          {discharged < it.quantity && (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              (bx: {discharged})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Primary Discharge Button for Open/Partial Work Orders */}
                  {((wo.status || 'CONCLUIDA') === 'ABERTA' || wo.status === 'PARCIAL') && onConfirmDischarge && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDischargeModalWorkOrder(wo);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs transition-colors text-xs"
                      title="Dar baixa dos materiais usados no estoque"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Dar Baixa</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateWorkOrderPDF(wo, true, false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Guia/O.S.</span>
                  </button>

                  {onConfirmReturn && (wo.status === 'CONCLUIDA' || wo.status === 'PARCIAL') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReturnModalWorkOrder(wo);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors border border-slate-200 dark:border-slate-700"
                      title="Devolver sobras de material não utilizado ao almoxarifado"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Sobra</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-600 transition-colors font-semibold text-[11px]">
                  <span>Ver Detalhes</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Ordem de Serviço</span>
                    <span className="font-mono text-emerald-400">{selectedWorkOrder.osNumber}</span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    Emitida em {formatDateTime(selectedWorkOrder.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => generateWorkOrderPDF(selectedWorkOrder, true, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  title="Baixar via padrão da Ordem de Serviço sem valores"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar O.S. (Sem Valores)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const doc = generateWorkOrderPDF(selectedWorkOrder, false);
                    doc.autoPrint();
                    window.open(doc.output('bloburl'), '_blank');
                  }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Imprimir"
                >
                  <Printer className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setSelectedWorkOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200 text-xs">
              {/* Alert banner if O.S. is Open */}
              {((selectedWorkOrder.status || 'CONCLUIDA') === 'ABERTA' || selectedWorkOrder.status === 'PARCIAL') && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                        {selectedWorkOrder.status === 'PARCIAL' ? 'Baixa Parcial Registrada' : 'Ordem de Serviço Aberta (Aguardando Baixa Física)'}
                      </h4>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                        Esta O.S. gerou a Guia de Campo/Liberação. Registre a baixa física dos itens realmente utilizados para debitar do estoque.
                      </p>
                    </div>
                  </div>
                  {onConfirmDischarge && (
                    <button
                      type="button"
                      onClick={() => {
                        const wo = selectedWorkOrder;
                        setSelectedWorkOrder(null);
                        setDischargeModalWorkOrder(wo);
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Dar Baixa nos Materiais</span>
                    </button>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Solicitante</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedWorkOrder.requesterName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Autorizado Por</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedWorkOrder.authorizedBy}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Local Operacional</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {selectedWorkOrder.operationalArea || 'Geral'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TAG / Equipamento</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedWorkOrder.tag_equipamento || 'Geral'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status / Tipo</span>
                  <div className="mt-0.5">
                    {getStatusBadge(selectedWorkOrder.status)}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                    {selectedWorkOrder.serviceType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Custo Total (ADM)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    {formatCurrency(selectedWorkOrder.totalCost)}
                  </span>
                </div>
              </div>

              {/* Application */}
              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                  Aplicação / Descrição do Destino:
                </h4>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white">
                  {selectedWorkOrder.application}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] uppercase font-bold text-slate-400">
                    Materiais da Ordem de Serviço ({selectedWorkOrder.items.length} itens):
                  </h4>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                    Valores visíveis para Almoxarifado e ADM
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Material / Peça</th>
                        <th className="py-2.5 px-3 text-center">Unidade</th>
                        <th className="py-2.5 px-3 text-center">Qtd Solicitada</th>
                        <th className="py-2.5 px-3 text-center">Qtd Baixada</th>
                        <th className="py-2.5 px-3 text-center">Saldo Pendente</th>
                        <th className="py-2.5 px-3 text-center">Qtd Devolvida</th>
                        <th className="py-2.5 px-3 text-right">Custo Unit. (ADM)</th>
                        <th className="py-2.5 px-3 text-right">Subtotal (ADM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedWorkOrder.items.map((it, idx) => {
                        const returned = it.returnedQuantity || 0;
                        const discharged = it.dischargedQuantity !== undefined ? it.dischargedQuantity : (selectedWorkOrder.status === 'ABERTA' ? 0 : it.quantity);
                        const pending = Math.max(0, it.quantity - discharged);
                        const actualUsed = Math.max(0, discharged - returned);
                        const actualSubtotal = (selectedWorkOrder.status === 'ABERTA' ? it.quantity : actualUsed) * it.preco_unitario;

                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold">{it.codigo_interno}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white break-words whitespace-normal">
                              {it.nome}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                              {it.unidade_medida || 'UN'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {it.quantity} {it.unidade_medida || 'UN'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {discharged} {it.unidade_medida || 'UN'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {pending > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                  {pending} {it.unidade_medida || 'UN'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {returned > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800">
                                  -{returned} {it.unidade_medida || 'UN'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {formatCurrency(it.preco_unitario)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(actualSubtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={4} className="py-3 px-3">
                          Total da Ordem de Serviço
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {selectedWorkOrder.items.reduce((s, i) => s + (i.dischargedQuantity !== undefined ? i.dischargedQuantity : (selectedWorkOrder.status === 'ABERTA' ? 0 : i.quantity)), 0)} un baixadas
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-center text-xs text-slate-500 font-mono">
                          {selectedWorkOrder.totalQuantity} un solicitadas
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-right text-sm text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {formatCurrency(selectedWorkOrder.totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Returns History Section */}
              {selectedWorkOrder.returns && selectedWorkOrder.returns.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                    <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Histórico de Devoluções / Ajuste de Sobras ({selectedWorkOrder.returns.length} registros)</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {selectedWorkOrder.returns.map((ret) => (
                      <div
                        key={ret.id}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {ret.quantityReturned}x {ret.nome}
                          </span>
                          <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                            Devolvido por <strong>{ret.returnedBy}</strong> • Motivo: <em>{ret.reason || 'Sobra de O.S.'}</em>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(ret.data_movimentacao)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedWorkOrder.observacoes && (
                <div>
                  <h4 className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                    Observações Técnicas:
                  </h4>
                  <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 italic">
                    "{selectedWorkOrder.observacoes}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                A via de manutenção oculta os valores para uso da equipe técnica.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkOrder(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Fechar
                </button>

                {/* Discharge Action inside Modal */}
                {((selectedWorkOrder.status || 'CONCLUIDA') === 'ABERTA' || selectedWorkOrder.status === 'PARCIAL') && onConfirmDischarge && (
                  <button
                    type="button"
                    onClick={() => {
                      const wo = selectedWorkOrder;
                      setSelectedWorkOrder(null);
                      setDischargeModalWorkOrder(wo);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all"
                    title="Realizar a baixa física dos materiais utilizados"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Dar Baixa Física no Estoque</span>
                  </button>
                )}

                {onConfirmReturn && (selectedWorkOrder.status === 'CONCLUIDA' || selectedWorkOrder.status === 'PARCIAL') && (
                  <button
                    type="button"
                    onClick={() => {
                      const wo = selectedWorkOrder;
                      setSelectedWorkOrder(null);
                      setReturnModalWorkOrder(wo);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs shadow-sm transition-all"
                    title="Devolver sobra não utilizada ao estoque"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Devolver Sobra</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => generateWorkOrderPDF(selectedWorkOrder, true, true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs transition-all"
                  title="Via interna para Almoxarifado / Contabilidade com valores"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Via Almoxarifado (Com Custos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateWorkOrderPDF(selectedWorkOrder, true, false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                  title="Via padrão para o mecânico (sem valores)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Guia/O.S.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISCHARGE WORK ORDER MODAL */}
      {dischargeModalWorkOrder && onConfirmDischarge && (
        <WorkOrderDischargeModal
          isOpen={!!dischargeModalWorkOrder}
          onClose={() => setDischargeModalWorkOrder(null)}
          workOrder={dischargeModalWorkOrder}
          products={products}
          currentUser={currentUser}
          onConfirmDischarge={onConfirmDischarge}
        />
      )}

      {/* RETURN MATERIAL MODAL */}
      {returnModalWorkOrder && onConfirmReturn && (
        <WorkOrderReturnModal
          isOpen={!!returnModalWorkOrder}
          onClose={() => setReturnModalWorkOrder(null)}
          workOrder={returnModalWorkOrder}
          currentUser={currentUser}
          onConfirmReturn={onConfirmReturn}
        />
      )}
    </div>
  );
};
