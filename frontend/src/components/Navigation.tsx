import React from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  FileText,
} from 'lucide-react';

export type TabType = 'inventory' | 'entries' | 'exits' | 'work-orders';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenNewProduct: () => void;
  onOpenWorkOrderGenerator?: () => void;
  totalProducts: number;
  totalEntries: number;
  totalExits: number;
  totalWorkOrders?: number;
  alertCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenNewProduct,
  onOpenWorkOrderGenerator,
  totalProducts,
  totalEntries,
  totalExits,
  totalWorkOrders = 0,
  alertCount,
}) => {
  return (
    <>
      {/* Desktop Tabs Bar */}
      <div className="hidden sm:block w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 mt-6">
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
          </button>

          {/* Tab 2: Ordens de Serviço (O.S.) */}
          <button
            id="tab-work-orders"
            type="button"
            onClick={() => onChangeTab('work-orders')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'work-orders'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-t-xl'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Ordens de Serviço (O.S.)</span>
          </button>

          {/* Tab 3: Histórico de Entradas */}
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
          </button>

          {/* Tab 4: Histórico de Saídas */}
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
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sticky Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5">
        <div className="grid grid-cols-5 items-center gap-0.5">
          <button
            id="mobile-nav-inventory"
            type="button"
            onClick={() => onChangeTab('inventory')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              activeTab === 'inventory'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Itens</span>
          </button>

          <button
            id="mobile-nav-work-orders"
            type="button"
            onClick={() => onChangeTab('work-orders')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              activeTab === 'work-orders'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">O.S.</span>
          </button>

          <button
            id="mobile-nav-entries"
            type="button"
            onClick={() => onChangeTab('entries')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              activeTab === 'entries'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Entradas</span>
          </button>

          <button
            id="mobile-nav-exits"
            type="button"
            onClick={() => onChangeTab('exits')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              activeTab === 'exits'
                ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Saídas</span>
          </button>

          <button
            id="mobile-nav-gerar-os"
            type="button"
            onClick={onOpenWorkOrderGenerator || onOpenNewProduct}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Nova OS</span>
          </button>
        </div>
      </div>
    </>
  );
};

