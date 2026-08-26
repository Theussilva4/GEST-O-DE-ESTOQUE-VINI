export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export type EntryReason = 
  | 'Compra de Fornecedor'
  | 'Devolução de Cliente'
  | 'Entrada de Produção'
  | 'Ajuste de Balanço (+)'
  | 'Transferência Recebida'
  | 'Outros';

export type ExitReason = 
  | 'Venda / Pedido'
  | 'Uso e Consumo Interno'
  | 'Avaria / Vencimento / Perda'
  | 'Devolução a Fornecedor'
  | 'Amostra Grátis / Brinde'
  | 'Ajuste de Balanço (-)'
  | 'Transferência Enviada'
  | 'Outros';

export type ProductUnit = 'UN' | 'KG' | 'L' | 'CX' | 'M' | 'PAR' | 'PCT' | 'ROLO' | 'KIT';

export interface Product {
  id: string;
  code: string; // SKU or internal code
  barcode?: string;
  name: string;
  description?: string;
  imageUrl?: string; // Product photo (base64 or URL)
  category: string;
  unit: ProductUnit;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  location?: string; // Prateleira/Corredor
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice: number;
  totalPrice: number;
  reason: string;
  documentNumber?: string; // NF, recibo, pedido
  contactName?: string; // Fornecedor ou Cliente ou Solicitante
  responsible: string; // Quem lançou
  notes?: string;
  timestamp: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCostValue: number;
  totalSellingValue: number;
  potentialProfit: number;
  entriesTodayCount: number;
  exitsTodayCount: number;
}

export interface StockAuditItem {
  productId: string;
  systemStock: number;
  countedStock: number;
  difference: number;
  costDifference: number;
}
