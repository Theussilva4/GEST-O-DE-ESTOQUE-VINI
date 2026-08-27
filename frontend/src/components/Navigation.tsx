import React from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  ClipboardList,
} from 'lucide-react';

export type TabType = 'inventory' | 'entries' | 'exits';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenNewProduct: () => void;
  totalProducts: number;
  totalEntries: number;
  totalExits: number;
  alertCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenNewProduct,
  totalProducts,
  totalEntries,
  totalExits,
  alertCount,
}) => {
  return (
    <>
      {/* Desktop Tabs Bar */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          {/* Tab 1: Inventário Geral */}
          <button
            id="tab-inventory"
            type="button"
            onClick={() => onChangeTab('inventory')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-t-xl'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventário Geral</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {totalProducts}
            </span>
            {alertCount > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-amber-500"
                title={`${alertCount} itens com estoque baixo/esgotado`}
              />
            )}
          </button>

          {/* Tab 2: Histórico de Entradas */}
          <button
            id="tab-entries"
            type="button"
            onClick={() => onChangeTab('entries')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'entries'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-t-xl'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Histórico de Entradas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'entries'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {totalEntries}
            </span>
          </button>

          {/* Tab 3: Histórico de Saídas */}
          <button
            id="tab-exits"
            type="button"
            onClick={() => onChangeTab('exits')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'exits'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-t-xl'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Histórico de Saídas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'exits'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {totalExits}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sticky Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-3 py-2">
        <div className="grid grid-cols-4 items-center gap-1">
          <button
            id="mobile-nav-inventory"
            type="button"
            onClick={() => onChangeTab('inventory')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'inventory'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Inventário</span>
          </button>

          <button
            id="mobile-nav-entries"
            type="button"
            onClick={() => onChangeTab('entries')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'entries'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <ArrowDownLeft className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Entradas</span>
          </button>

          <button
            id="mobile-nav-exits"
            type="button"
            onClick={() => onChangeTab('exits')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'exits'
                ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <ArrowUpRight className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Saídas</span>
          </button>

          <button
            id="mobile-nav-cadastrar"
            type="button"
            onClick={onOpenNewProduct}
            className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-emerald-600 dark:text-emerald-400 font-semibold"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Novo Item</span>
          </button>
        </div>
      </div>
    </>
  );
};
