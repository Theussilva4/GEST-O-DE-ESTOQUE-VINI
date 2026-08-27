import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  RefreshCw,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { Produto, Movimentacao } from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Produto[];
  movements: Movimentacao[];
  onImportBackup: (data: { products: Produto[]; movements: Movimentacao[] }) => Promise<void>;
  onResetSample: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  products,
  movements,
  onImportBackup,
  onResetSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        products,
        movements,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `Backup_Estoque_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMsg({ type: 'success', text: 'Backup em JSON baixado com sucesso!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Erro ao gerar arquivo de backup.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        setStatusMsg(null);
        const parsed = JSON.parse(event.target?.result as string);

        if (!Array.isArray(parsed.products) || !Array.isArray(parsed.movements)) {
          throw new Error('O arquivo selecionado não contém uma estrutura de backup válida.');
        }

        await onImportBackup({
          products: parsed.products,
          movements: parsed.movements,
        });

        setStatusMsg({
          type: 'success',
          text: `Backup restaurado com sucesso! (${parsed.products.length} produtos e ${parsed.movements.length} movimentações)`,
        });
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: err?.message || 'Falha ao restaurar arquivo de backup.' });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Tem certeza de que deseja restaurar os dados de exemplo padrão? Os dados atuais serão substituídos.'
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMsg(null);
      await onResetSample();
      setStatusMsg({ type: 'success', text: 'Base de dados restaurada com os dados de demonstração!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Erro ao restaurar dados de exemplo.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="backup-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Banco de Dados & Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie a persistência, exportação e restauração dos dados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Database info card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Armazenamento Local & Online
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-mono">
              {products.length} produtos | {movements.length} movimentos
            </span>
          </div>

          <div className="space-y-3">
            {/* Export JSON */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-indigo-600" /> Exportar Backup Completo (.JSON)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Baixe todos os produtos e movimentações para segurança.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar
              </button>
            </div>

            {/* Import JSON */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-600" /> Restaurar Backup (.JSON)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Importe um arquivo de backup previamente exportado.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> Restaurar
                </button>
              </div>
            </div>

            {/* Reset to Factory Mode */}
            <div className="p-4 rounded-xl border border-dashed border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-red-600" /> Zerar Tudo (Base Limpa)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Zera todos os produtos, movimentações, O.S. e locais para iniciar o cadastro do zero.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Zerar Sistema
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
