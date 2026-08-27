import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Package,
  User,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Tag,
  DollarSign,
  Info,
} from 'lucide-react';
import { WorkOrder, WorkOrderItem, User as AppUser } from '../types';
import { formatCurrency } from '../lib/utils';

interface WorkOrderReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  currentUser?: AppUser | null;
  onConfirmReturn: (
    workOrderId: string,
    returnData: {
      codproduto: string;
      quantity: number;
      returnedBy: string;
      reason: string;
      observacoes?: string;
    }
  ) => Promise<void>;
}

export const WorkOrderReturnModal: React.FC<WorkOrderReturnModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  currentUser,
  onConfirmReturn,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [returnQuantity, setReturnQuantity] = useState<string>('1');
  const [returnedBy, setReturnedBy] = useState<string>('');
  const [reason, setReason] = useState<string>('Sobra de serviço (usou menos do que o requisitado)');
  const [observacoes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen && workOrder) {
      setErrorMsg(null);
      setReturnedBy(currentUser?.name || workOrder.requesterName || '');
      setReason('Sobra de serviço (usou menos do que o requisitado)');
      setNotes('');

      // Find first item with remaining quantity
      const firstAvailableItem = workOrder.items.find(
        (it) => it.quantity - (it.returnedQuantity || 0) > 0
      );

      if (firstAvailableItem) {
        setSelectedProductId(firstAvailableItem.codproduto);
        setReturnQuantity('1');
      } else if (workOrder.items.length > 0) {
        setSelectedProductId(workOrder.items[0].codproduto);
        setReturnQuantity('1');
      } else {
        setSelectedProductId('');
        setReturnQuantity('1');
      }
    }
  }, [isOpen, workOrder, currentUser]);

  if (!isOpen || !workOrder) return null;

  const selectedItem: WorkOrderItem | undefined = workOrder.items.find(
    (it) => it.codproduto === selectedProductId
  );

  const initialQty = selectedItem ? selectedItem.quantity : 0;
  const previouslyReturned = selectedItem ? selectedItem.returnedQuantity || 0 : 0;
  const remainingInField = Math.max(0, initialQty - previouslyReturned);
  const parsedQty = parseFloat(returnQuantity) || 0;
  const resultingActualUsed = Math.max(0, remainingInField - parsedQty);
  const preco_unitario = selectedItem ? selectedItem.preco_unitario : 0;
  const returnedValue = parsedQty * preco_unitario;
  const newTotalOrderCost = Math.max(0, workOrder.totalCost - returnedValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg('Selecione o material a ser devolvido.');
      return;
    }
    if (parsedQty <= 0) {
      setErrorMsg('A quantidade a devolver deve ser maior que zero.');
      return;
    }
    if (parsedQty > remainingInField) {
      setErrorMsg(
        `A quantidade a devolver (${parsedQty}) não pode exceder o saldo em campo (${remainingInField} ${selectedItem?.unidade_medida || 'UN'}).`
      );
      return;
    }
    if (!returnedBy.trim()) {
      setErrorMsg('Informe o nome do técnico/responsável pela devolução.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmReturn(workOrder.id, {
        codproduto: selectedProductId,
        quantity: parsedQty,
        returnedBy: returnedBy.trim(),
        reason,
        observacoes: observacoes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar devolução de sobra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Devolver Sobra ao Almoxarifado</span>
                <span className="font-mono text-amber-400 text-sm">{workOrder.osNumber}</span>
              </h2>
              <p className="text-xs text-slate-300">
                Ajuste de consumo real — as sobras retornam imediatamente ao saldo físico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* OS Context Summary Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {workOrder.osNumber}
                </span>
                {workOrder.operationalArea && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                    <MapPin className="w-2.5 h-2.5" />
                    {workOrder.operationalArea}
                  </span>
                )}
                {workOrder.tag_equipamento && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                    <Tag className="w-2.5 h-2.5" />
                    {workOrder.tag_equipamento}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Aplicação: <strong>{workOrder.application}</strong> • Solicitado por: <strong>{workOrder.requesterName}</strong>
              </div>
            </div>
          </div>

          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Qual material / sobressalente teve sobra? *
            </label>
            <div className="space-y-2">
              {workOrder.items.map((item) => {
                const rem = item.quantity - (item.returnedQuantity || 0);
                const isSelected = selectedProductId === item.codproduto;
                const isFullyReturned = rem <= 0;

                return (
                  <div
                    key={item.codproduto}
                    onClick={() => {
                      if (!isFullyReturned) {
                        setSelectedProductId(item.codproduto);
                        setReturnQuantity('1');
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20'
                        : isFullyReturned
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.nome}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.codigo_interno} • {formatCurrency(item.preco_unitario)} / {item.unidade_medida || 'UN'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Requisitado: <strong>{item.quantity} {item.unidade_medida || 'UN'}</strong>
                      </div>
                      {item.returnedQuantity && item.returnedQuantity > 0 ? (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          Devolvido antes: {item.returnedQuantity} {item.unidade_medida || 'UN'}
                        </div>
                      ) : null}
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Restante na O.S.: {rem} {item.unidade_medida || 'UN'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity to Return & Live Impact Preview */}
          {selectedItem && (
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    Quantidade a Devolver ao Almoxarifado ({selectedItem.unidade_medida || 'UN'}) *
                  </label>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    Máximo disponível para devolução: <strong>{remainingInField} {selectedItem.unidade_medida || 'UN'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    max={remainingInField}
                    step="any"
                    required
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                  />
                  {remainingInField > 1 && (
                    <button
                      type="button"
                      onClick={() => setReturnQuantity(String(remainingInField))}
                      className="px-2.5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 font-bold rounded-xl text-[11px] transition-colors"
                    >
                      Tudo ({remainingInField})
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Calculation summary */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-800/80 text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    Quantidade devolvida ao estoque físico:
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                    +{parsedQty} {selectedItem.unidade_medida || 'UN'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Consumo efetivo na O.S. (recalculado):</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {resultingActualUsed} {selectedItem.unidade_medida || 'UN'} (era {remainingInField})
                  </strong>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/80 pt-1.5 font-bold">
                  <span>Custo estornado ao almoxarifado:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(returnedValue)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Responsible and Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Técnico / Responsável pela Devolução *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: João Mecânico / Carlos Técnico"
                  value={returnedBy}
                  onChange={(e) => setReturnedBy(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo da Devolução *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="Sobra de serviço (usou menos do que o requisitado)">
                  Sobra de serviço (usou menos do que o requisitado)
                </option>
                <option value="Peça não necessária após intervenção no local">
                  Peça não necessária após intervenção no local
                </option>
                <option value="Substituição por modelo diferente">
                  Substituição por modelo diferente
                </option>
                <option value="Cancelamento parcial da O.S.">
                  Cancelamento parcial da O.S.
                </option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações / Detalhes da Sobra
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Requisitados 5 rolamentos para os dois mancais, porém apenas 4 foram necessários; 1 devolvido intacto na caixa original."
              value={observacoes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || remainingInField <= 0}
              className="px-5 py-2 text-white text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isSubmitting ? 'Processando Devolução...' : 'Confirmar Devolução & Atualizar Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
