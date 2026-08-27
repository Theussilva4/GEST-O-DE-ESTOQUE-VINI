import React from 'react';
import {
  Boxes,
  Database,
  Cloud,
  CheckCircle2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';

interface HeaderProps {
  onOpenBackup: () => void;
  onNewProduct: () => void;
  onNewEntry: () => void;
  onNewExit: () => void;
  onOpenAudit: () => void;
  isOnline: boolean;
  totalProducts: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBackup,
  onNewProduct,
  onNewEntry,
  onNewExit,
  onOpenAudit,
  isOnline,
  totalProducts,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
                  EstoquePRO
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block">
                Sistema Integrado de Gestão & Inventário
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              id="header-backup-btn"
              type="button"
              onClick={onOpenBackup}
              title="Backup e Dados do Sistema"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Backup & Dados</span>
            </button>

            <button
              id="header-new-entry-btn"
              type="button"
              onClick={onNewEntry}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-semibold transition-colors"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Entrada</span>
            </button>

            <button
              id="header-new-exit-btn"
              type="button"
              onClick={onNewExit}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-xs font-semibold transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Saída</span>
            </button>

            <button
              id="header-new-product-btn"
              type="button"
              onClick={onNewProduct}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Cadastrar</span> Produto
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
