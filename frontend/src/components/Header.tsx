import React, { useState, useRef, useEffect } from 'react';
import {
  Boxes,
  Database,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  User as UserIcon,
  Users,
  LogOut,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  UserPlus,
  FileText,
  MapPin,
} from 'lucide-react';
import { User } from '../types';
import { getUserRoleInfo, getInitials } from '../lib/utils';

interface HeaderProps {
  onOpenBackup: () => void;
  onNewProduct: () => void;
  onNewEntry: () => void;
  onNewExit: () => void;
  onOpenWorkOrderGenerator: () => void;
  onOpenAudit: () => void;
  onOpenUsersManagement: () => void;
  onOpenAreasManagement?: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  currentUser: User | null;
  isOnline: boolean;
  totalProducts: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBackup,
  onNewProduct,
  onNewEntry,
  onNewExit,
  onOpenWorkOrderGenerator,
  onOpenAudit,
  onOpenUsersManagement,
  onOpenAreasManagement,
  onOpenLogin,
  onLogout,
  currentUser,
  isOnline,
  totalProducts,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleInfo = currentUser ? getUserRoleInfo(currentUser.role) : null;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Saneamento, Água & Manutenção Operacional
              </p>
            </div>
          </div>

          {/* Actions & User Menu */}
          <div className="flex items-center gap-2">
            <button
              id="header-backup-btn"
              type="button"
              onClick={onOpenBackup}
              title="Backup e Dados do Sistema"
              className="hidden sm:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors items-center gap-1.5 text-xs font-semibold"
            >
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">Backup</span>
            </button>

            {/* Gerador de O.S. Prominent Button */}
            <button
              id="header-gerar-os-btn"
              type="button"
              onClick={onOpenWorkOrderGenerator}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Gerar O.S. (PDF)</span>
            </button>

            <button
              id="header-new-entry-btn"
              type="button"
              onClick={onNewEntry}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-semibold transition-colors"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Entrada</span>
            </button>

            <button
              id="header-new-product-btn"
              type="button"
              onClick={onNewProduct}
              className="flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Cadastrar Item</span>
            </button>

            {/* Active User Avatar & Menu */}
            <div className="relative" ref={menuRef}>
              {currentUser ? (
                <button
                  id="user-profile-menu-btn"
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <div
                    className={`w-7 h-7 rounded-lg ${
                      currentUser.avatarColor || 'bg-slate-700'
                    } text-white font-bold text-xs flex items-center justify-center shadow-xs`}
                  >
                    {getInitials(currentUser.name)}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[110px]">
                      {currentUser.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {roleInfo?.label.split('/')[0]}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>
              ) : (
                <button
                  id="header-login-btn"
                  type="button"
                  onClick={onOpenLogin}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Entrar</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {isUserMenuOpen && currentUser && (
                <div
                  id="user-dropdown-menu"
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">@{currentUser.username}</div>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo?.badgeBg} ${roleInfo?.badgeColor} ${roleInfo?.badgeBorder}`}
                      >
                        {roleInfo?.label}
                      </span>
                    </div>
                    {currentUser.department && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {currentUser.department}
                      </div>
                    )}
                  </div>

                  <div className="py-1">
                    {onOpenAreasManagement && (
                      <button
                        id="menu-manage-areas-btn"
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAreasManagement();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Locais & Áreas Operacionais
                          </div>
                          <div className="text-[10px] text-slate-400">ETA, ETE, Estações, Poços</div>
                        </div>
                      </button>
                    )}

                    <button
                      id="menu-manage-users-btn"
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenUsersManagement();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Gerenciar Usuários
                        </div>
                        <div className="text-[10px] text-slate-400">Cadastros e senhas</div>
                      </div>
                    </button>

                    <button
                      id="menu-switch-user-btn"
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenLogin();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Trocar de Usuário
                        </div>
                        <div className="text-[10px] text-slate-400">Acessar outra conta</div>
                      </div>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      id="menu-logout-btn"
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair da Conta (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
