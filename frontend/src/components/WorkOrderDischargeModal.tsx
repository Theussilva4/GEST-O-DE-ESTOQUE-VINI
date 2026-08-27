import React, { useState, useMemo } from 'react';
import {
  X,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  Tag,
  User,
  Wrench,
  ArrowRight,
  Info,
} from 'lucide-react';
import { WorkOrder, Produto, User as UserType } from '../types';
import { formatCurrency } from '../lib/utils';

interface WorkOrderDischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  products: Produto[];
  currentUser?: UserType | null;
  onConfirmDischarge: (
    workOrderId: string,
    dischargeData: {
      itemsToDischarge: Array<{ codproduto: string; quantity: number }>;
      dischargedBy: string;
      observacoes?: string;
    }
  ) => Promise<void>;
}

export const WorkOrderDischargeModal: React.FC<WorkOrderDischargeModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  products,
  currentUser,
  onConfirmDischarge,
}) => {
  // Map of item quantities to discharge: { [codproduto]: number }
  const [quantitiesToDischarge, setQuantitiesToDischarge] = useState<{ [key: string]: number }>(() => {
    const initial: { [key: string]: number } = {};
    workOrder.items.forEach((item) => {
      const alreadyDischarged = item.dischargedQuantity || 0;
      const remaining = Math.max(0, item.quantity - alreadyDischarged);
      initial[item.codproduto] = remaining;
    });
    return initial;
  });

  const [dischargedBy, setDischargedBy] = useState(
    workOrder.requesterName || currentUser?.name || 'Mecânico / Técnico'
  );
  const [observacoes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate totals for this discharge
  const itemsWithDetails = useMemo(() => {
    return workOrder.items.map((item) => {
      const product = products.find((p) => p.id === item.codproduto || p.code === item.codigo_interno);
      const alreadyDischarged = item.dischargedQuantity || 0;
      const remainingToDischarge = Math.max(0, item.quantity - alreadyDischarged);
      const currentInputQty = quantitiesToDischarge[item.codproduto] ?? remainingToDischarge;
      const estoque_atual = product ? product.estoque_atual : item.estoque_atual || 0;
      const isInsufficientStock = currentInputQty > estoque_atual;

      return {
        ...item,
        product,
        alreadyDischarged,
        remainingToDischarge,
        currentInputQty,
        estoque_atual,
        isInsufficientStock,
      };
    });
  }, [workOrder, products, quantitiesToDischarge]);

  const totalItemsToDischarge = useMemo(() => {
    return Object.values(quantitiesToDischarge).reduce<number>((sum: number, q: number) => sum + (Number(q) || 0), 0);
  }, [quantitiesToDischarge]);

  const hasInsufficientStock = useMemo(() => {
    return itemsWithDetails.some((it) => it.currentInputQty > 0 && it.isInsufficientStock);
  }, [itemsWithDetails]);

  const handleQtyChange = (codproduto: string, newQty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(newQty, maxQty));
    setQuantitiesToDischarge((prev) => ({
      ...prev,
      [codproduto]: validQty,
    }));
  };

  const handleSetAllToMax = () => {
    const updated: { [key: string]: number } = {};
    workOrder.items.forEach((item) => {
      const alreadyDischarged = item.dischargedQuantity || 0;
      const remaining = Math.max(0, item.quantity - alreadyDischarged);
      updated[item.codproduto] = remaining;
    });
    setQuantitiesToDischarge(updated);
  };

  const handleSetAllToZero = () => {
    const updated: { [key: string]: number } = {};
    workOrder.items.forEach((item) => {
      updated[item.codproduto] = 0;
    });
    setQuantitiesToDischarge(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (totalItemsToDischarge <= 0) {
      setErrorMsg('Informe ao menos 1 item com quantidade maior que zero para realizar a baixa.');
      return;
    }

    if (!dischargedBy.trim()) {
      setErrorMsg('Informe o nome do responsável pela retirada/aplicação dos materiais.');
      return;
    }

    const itemsPayload = itemsWithDetails
      .filter((it) => it.currentInputQty > 0)
      .map((it) => ({
        codproduto: it.codproduto,
        quantity: it.currentInputQty,
      }));

    setIsSubmitting(true);
    try {
      await onConfirmDischarge(workOrder.id, {
        itemsToDischarge: itemsPayload,
        dischargedBy: dischargedBy.trim(),
        observacoes: observacoes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar baixa dos materiais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="work-order-discharge-modal"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 dark:bg-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center border border-white/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Baixa / Aplicação de Materiais da O.S.
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white text-emerald-800 font-extrabold">
                  {workOrder.osNumber}
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Efetiva a saída física dos materiais requisitados no almoxarifado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Work Order Info Banner */}
        <div className="px-6 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold">{workOrder.operationalArea || 'Local Geral'}</span>
            </div>
            {workOrder.tag_equipamento && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-mono font-bold">TAG: {workOrder.tag_equipamento}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Solicitante: <strong>{workOrder.requesterName}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Tipo: {workOrder.serviceType}
            </span>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick instructions & Bulk actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Confira a quantidade de cada material que está sendo fisicamente entregue/retirada agora:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAllToMax}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
              >
                Baixar Tudo
              </button>
              <button
                type="button"
                onClick={handleSetAllToZero}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors"
              >
                Zerar Seleção
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Código & Material</th>
                  <th className="py-2.5 px-2 text-center">Qtd Guia</th>
                  <th className="py-2.5 px-2 text-center">Já Baixado</th>
                  <th className="py-2.5 px-2 text-center">Saldo Pendente</th>
                  <th className="py-2.5 px-2 text-center">Estoque Almox.</th>
                  <th className="py-2.5 px-3 text-right">Qtd a Baixar Agora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itemsWithDetails.map((item, idx) => {
                  const isFullyDone = item.remainingToDischarge <= 0;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isFullyDone ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 min-w-[160px]">
                        <div className="font-medium text-slate-900 dark:text-white break-words whitespace-normal leading-snug">
                          {item.nome}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 break-words whitespace-normal mt-0.5">
                          {item.codigo_interno} • {formatCurrency(item.preco_unitario)}/{item.unidade_medida || 'UN'}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                        {item.quantity} {item.unidade_medida || 'UN'}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.alreadyDischarged} {item.unidade_medida || 'UN'}
                      </td>
                      <td className="py-3 px-2 text-center font-mono">
                        {item.remainingToDischarge > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                            {item.remainingToDischarge} {item.unidade_medida || 'UN'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>100% Baixado</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono">
                        <span
                          className={`font-semibold ${
                            item.estoque_atual < item.currentInputQty
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.estoque_atual} {item.unidade_medida || 'UN'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isFullyDone ? (
                          <span className="text-xs text-slate-400 italic">Concluído</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={item.remainingToDischarge}
                              step="any"
                              value={item.currentInputQty}
                              onChange={(e) =>
                                handleQtyChange(
                                  item.codproduto,
                                  parseFloat(e.target.value) || 0,
                                  item.remainingToDischarge
                                )
                              }
                              className={`w-20 px-2 py-1.5 rounded-lg border text-center font-mono font-bold text-xs bg-white dark:bg-slate-800 ${
                                item.isInsufficientStock
                                  ? 'border-red-500 text-red-600 dark:text-red-400 focus:ring-red-500'
                                  : 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 focus:ring-emerald-500'
                              } focus:outline-hidden focus:ring-2`}
                            />
                            <span className="text-[11px] font-bold text-slate-500 w-6 text-left">
                              {item.unidade_medida || 'UN'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasInsufficientStock && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção ao saldo do almoxarifado:</strong> A quantidade selecionada para um ou mais itens excede o saldo físico atual em estoque. O estoque ficará zerado ou no limite.
              </div>
            </div>
          )}

          {/* Form Fields: Responsible & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Responsável pela Retirada / Execução <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dischargedBy}
                onChange={(e) => setDischargedBy(e.target.value)}
                placeholder="Nome do mecânico ou técnico que retirou"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações da Baixa / Retirada (Opcional)
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Entregue na bancada da oficina para montagem imediata"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Total a retirar nesta baixa: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{totalItemsToDischarge} itens</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || totalItemsToDischarge <= 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Gravando baixa...</span>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirmar Baixa & Debitar Estoque</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
