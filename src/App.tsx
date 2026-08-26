import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Movement, MovementType } from './types';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { InventoryView } from './components/InventoryView';
import { EntriesView } from './components/EntriesView';
import { ExitsView } from './components/ExitsView';
import { ProductFormModal } from './components/ProductFormModal';
import { MovementModal } from './components/MovementModal';
import { AuditReconcileModal } from './components/AuditReconcileModal';
import { BackupModal } from './components/BackupModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'estoquepro_cached_db_v1';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementInitialType, setMovementInitialType] = useState<MovementType>('IN');
  const [movementPreselectedProduct, setMovementPreselectedProduct] = useState<Product | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Fetch initial data from server
  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Falha ao conectar com o servidor.');
      const data = await res.json();
      setProducts(data.products || []);
      setMovements(data.movements || []);
      setIsOnline(true);

      // Cache locally
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        // localStorage quota error ignore
      }
    } catch (err) {
      console.warn('Using local storage fallback:', err);
      setIsOnline(false);
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setProducts(data.products || []);
          setMovements(data.movements || []);
        } catch (e) {
          console.error('Failed to parse cached data');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Product CRUD
  const handleSaveProduct = async (formData: any) => {
    try {
      if (productToEdit) {
        // PUT update
        const res = await fetch(`/api/products/${productToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao atualizar produto.');
        }
        const data = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === data.product.id ? data.product : p)));
        showToast('Produto atualizado com sucesso!', 'success');
      } else {
        // POST create
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao cadastrar produto.');
        }
        const data = await res.json();
        setProducts(data.products || ((prev) => [data.product, ...prev]));
        if (data.movements) setMovements(data.movements);
        showToast('Produto cadastrado com sucesso!', 'success');
      }
    } catch (err: any) {
      // Offline fallback
      if (productToEdit) {
        const updated = {
          ...productToEdit,
          ...formData,
          updatedAt: new Date().toISOString(),
        };
        setProducts((prev) => prev.map((p) => (p.id === productToEdit.id ? updated : p)));
        showToast('Produto salvo localmente (modo offline)', 'info');
      } else {
        const newId = `prod-${Date.now()}`;
        const newProd: Product = {
          id: newId,
          code: formData.code || `MAN-${products.length + 1}`,
          barcode: formData.barcode,
          name: formData.name,
          equipmentTag: formData.equipmentTag,
          criticality: formData.criticality || 'LOW',
          imageUrl: formData.imageUrl,
          description: formData.description,
          category: formData.category,
          unit: formData.unit,
          currentStock: formData.initialStock || 0,
          minStock: formData.minStock || 5,
          maxStock: formData.maxStock,
          costPrice: formData.costPrice || 0,
          supplier: formData.supplier,
          location: formData.location,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProducts((prev) => [newProd, ...prev]);
        showToast('Sobressalente cadastrado localmente (modo offline)', 'info');
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir no servidor.');
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Produto excluído com sucesso!', 'success');
    } catch (err) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Produto excluído localmente', 'info');
    }
  };

  // Movement handler (Entry / Exit)
  const handleSaveMovement = async (movementData: any) => {
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao lançar movimentação.');
      }
      const data = await res.json();
      if (data.products) setProducts(data.products);
      if (data.movements) setMovements(data.movements);

      showToast(
        movementData.type === 'IN'
          ? `Entrada de +${movementData.quantity} registrada com sucesso!`
          : `Saída de -${movementData.quantity} registrada com sucesso!`,
        'success'
      );
    } catch (err: any) {
      // Offline simulation
      const prod = products.find((p) => p.id === movementData.productId);
      if (prod) {
        const qty = Number(movementData.quantity);
        const prev = prod.currentStock;
        const newStock =
          movementData.type === 'IN' ? prev + qty : Math.max(0, prev - qty);
        const updatedProd = {
          ...prod,
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        };

        const newMov: Movement = {
          id: `mov-${Date.now()}`,
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          type: movementData.type,
          quantity: qty,
          previousStock: prev,
          newStock,
          unitPrice: movementData.unitPrice || prod.costPrice,
          totalPrice: qty * (movementData.unitPrice || prod.costPrice),
          reason: movementData.reason,
          documentNumber: movementData.documentNumber,
          contactName: movementData.contactName,
          responsible: movementData.responsible,
          notes: movementData.notes,
          timestamp: movementData.timestamp || new Date().toISOString(),
        };

        setProducts((prevP) => prevP.map((p) => (p.id === prod.id ? updatedProd : p)));
        setMovements((prevM) => [newMov, ...prevM]);
        showToast('Movimentação salva localmente (modo offline)', 'info');
      }
    }
  };

  const handleDeleteMovement = async (movementId: string) => {
    try {
      const res = await fetch(`/api/movements/${movementId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao estornar movimentação.');
      const data = await res.json();
      if (data.products) setProducts(data.products);
      if (data.movements) setMovements(data.movements);
      showToast('Movimentação estornada e estoque recalculado!', 'success');
    } catch (err) {
      setMovements((prev) => prev.filter((m) => m.id !== movementId));
      showToast('Lançamento removido', 'info');
    }
  };

  // Audit Reconcile
  const handleSaveAudit = async (
    audits: Array<{ productId: string; countedStock: number; notes?: string }>,
    responsible: string
  ) => {
    try {
      const res = await fetch('/api/inventory/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audits, responsible }),
      });
      if (!res.ok) throw new Error('Erro ao reconciliar inventário.');
      const data = await res.json();
      if (data.products) setProducts(data.products);
      if (data.movements) setMovements(data.movements);
      showToast('Balanço físico aplicado com sucesso!', 'success');
    } catch (err) {
      // Local fallback
      audits.forEach((item) => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === item.productId
              ? { ...p, currentStock: item.countedStock, updatedAt: new Date().toISOString() }
              : p
          )
        );
      });
      showToast('Contagens atualizadas localmente', 'info');
    }
  };

  // Backup Import & Reset
  const handleImportBackup = async (data: { products: Product[]; movements: Movement[] }) => {
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Falha ao restaurar no servidor.');
      setProducts(data.products);
      setMovements(data.movements);
      showToast('Backup restaurado com sucesso!', 'success');
    } catch (err) {
      setProducts(data.products);
      setMovements(data.movements);
      showToast('Backup carregado na sessão local', 'info');
    }
  };

  const handleResetSample = async () => {
    try {
      const res = await fetch('/api/inventory/reset-sample', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao resetar no servidor.');
      const data = await res.json();
      setProducts(data.products || []);
      setMovements(data.movements || []);
      showToast('Dados de demonstração restaurados!', 'success');
    } catch (err) {
      showToast('Erro ao resetar base', 'error');
    }
  };

  // Open modal helpers
  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleOpenNewEntry = (prod?: Product) => {
    setMovementInitialType('IN');
    setMovementPreselectedProduct(prod || null);
    setIsMovementModalOpen(true);
  };

  const handleOpenNewExit = (prod?: Product) => {
    setMovementInitialType('OUT');
    setMovementPreselectedProduct(prod || null);
    setIsMovementModalOpen(true);
  };

  // Counts
  const existingCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  const alertCount = useMemo(() => {
    return products.filter((p) => p.currentStock <= p.minStock).length;
  }, [products]);

  const entriesCount = useMemo(() => {
    return movements.filter((m) => m.type === 'IN').length;
  }, [movements]);

  const exitsCount = useMemo(() => {
    return movements.filter((m) => m.type === 'OUT').length;
  }, [movements]);

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-20 sm:pb-12">
      {/* Toast alert */}
      {toast && (
        <div
          id="app-toast-notification"
          className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-3 fade-in duration-200"
        >
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-600/95 text-white border-emerald-500 shadow-emerald-900/20'
                : toast.type === 'error'
                ? 'bg-red-600/95 text-white border-red-500 shadow-red-900/20'
                : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-900/20'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-200" />
            ) : (
              <Info className="w-4 h-4 text-blue-300" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:opacity-70 transition-opacity ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onNewProduct={handleOpenNewProduct}
        onNewEntry={() => handleOpenNewEntry()}
        onNewExit={() => handleOpenNewExit()}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        isOnline={isOnline}
        totalProducts={products.length}
      />

      {/* Navigation Tabs (Inventário Geral, Histórico de Entradas, Histórico de Saídas) */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenNewProduct={handleOpenNewProduct}
        totalProducts={products.length}
        totalEntries={entriesCount}
        totalExits={exitsCount}
        alertCount={alertCount}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 flex-1 w-full">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Carregando dados do estoque...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'inventory' && (
              <InventoryView
                products={products}
                movements={movements}
                onNewProduct={handleOpenNewProduct}
                onEditProduct={handleOpenEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onNewEntry={(p) => handleOpenNewEntry(p)}
                onNewExit={(p) => handleOpenNewExit(p)}
                onOpenAudit={() => setIsAuditModalOpen(true)}
              />
            )}

            {activeTab === 'entries' && (
              <EntriesView
                movements={movements}
                products={products}
                onNewEntry={() => handleOpenNewEntry()}
                onDeleteMovement={handleDeleteMovement}
              />
            )}

            {activeTab === 'exits' && (
              <ExitsView
                movements={movements}
                products={products}
                onNewExit={() => handleOpenNewExit()}
                onDeleteMovement={handleDeleteMovement}
              />
            )}
          </>
        )}
      </main>

      {/* Modal: Product Registration & Edit */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        existingCategories={existingCategories}
      />

      {/* Modal: Movement (Entry or Exit) */}
      <MovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSave={handleSaveMovement}
        products={products}
        initialType={movementInitialType}
        preselectedProduct={movementPreselectedProduct}
      />

      {/* Modal: Physical Audit / Balance Reconciliation */}
      <AuditReconcileModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        products={products}
        onSaveAudit={handleSaveAudit}
      />

      {/* Modal: Database Backup & Restore */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        products={products}
        movements={movements}
        onImportBackup={handleImportBackup}
        onResetSample={handleResetSample}
      />
    </div>
  );
}
