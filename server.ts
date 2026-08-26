import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Database file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'inventory-db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBStructure {
  products: Array<{
    id: string;
    code: string;
    barcode?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    category: string;
    unit: string;
    currentStock: number;
    minStock: number;
    maxStock?: number;
    costPrice: number;
    sellingPrice: number;
    supplier?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  movements: Array<{
    id: string;
    productId: string;
    productCode: string;
    productName: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    quantity: number;
    previousStock: number;
    newStock: number;
    unitPrice: number;
    totalPrice: number;
    reason: string;
    documentNumber?: string;
    contactName?: string;
    responsible: string;
    notes?: string;
    timestamp: string;
  }>;
}

const initialSeedData: DBStructure = {
  products: [
    {
      id: 'prod-1',
      code: 'EST-001',
      barcode: '7891000100011',
      name: 'Parafuso Sextavado Aço Inox 1/4 x 2',
      description: 'Caixa com 100 parafusos sextavados de aço inox 304',
      category: 'Fixação e Ferragens',
      unit: 'CX',
      currentStock: 45,
      minStock: 15,
      maxStock: 100,
      costPrice: 28.5,
      sellingPrice: 49.9,
      supplier: 'Metálica Parafusos Brasil',
      location: 'Prateleira A-02',
      createdAt: '2026-08-01T08:30:00.000Z',
      updatedAt: '2026-08-20T10:15:00.000Z',
    },
    {
      id: 'prod-2',
      code: 'EST-002',
      barcode: '7891000100028',
      name: 'Luva de Proteção Nitrílica G',
      description: 'Par de luvas para manuseio químico e mecânico',
      category: 'EPI & Segurança',
      unit: 'PAR',
      currentStock: 8,
      minStock: 20,
      maxStock: 150,
      costPrice: 6.2,
      sellingPrice: 14.5,
      supplier: 'Segurança Total EPIs',
      location: 'Prateleira C-01',
      createdAt: '2026-08-02T09:00:00.000Z',
      updatedAt: '2026-08-25T14:20:00.000Z',
    },
    {
      id: 'prod-3',
      code: 'EST-003',
      barcode: '7891000100035',
      name: 'Óleo Lubrificante Sintético 5W30',
      description: 'Galão de 1 Litro para alta performance',
      category: 'Lubrificantes & Químicos',
      unit: 'L',
      currentStock: 32,
      minStock: 10,
      maxStock: 80,
      costPrice: 34.0,
      sellingPrice: 58.0,
      supplier: 'Distribuidora Petromax',
      location: 'Prateleira D-04',
      createdAt: '2026-08-03T11:00:00.000Z',
      updatedAt: '2026-08-22T16:00:00.000Z',
    },
    {
      id: 'prod-4',
      code: 'EST-004',
      barcode: '7891000100042',
      name: 'Fita Isolante 3M Alta Fusão 19mm x 20m',
      description: 'Fita isolante preta anti-chama',
      category: 'Elétrica',
      unit: 'ROLO',
      currentStock: 0,
      minStock: 12,
      maxStock: 60,
      costPrice: 9.8,
      sellingPrice: 19.9,
      supplier: 'Eletro Peças Express',
      location: 'Prateleira B-03',
      createdAt: '2026-08-04T10:30:00.000Z',
      updatedAt: '2026-08-26T08:00:00.000Z',
    },
    {
      id: 'prod-5',
      code: 'EST-005',
      barcode: '7891000100059',
      name: 'Disco de Corte Inox 4.1/2 Polegadas',
      description: 'Disco fino 1.0mm para esmerilhadeira',
      category: 'Ferramentas & Abrasivos',
      unit: 'UN',
      currentStock: 110,
      minStock: 30,
      maxStock: 200,
      costPrice: 3.4,
      sellingPrice: 7.5,
      supplier: 'Abrasivos & Ferramentas S/A',
      location: 'Prateleira A-05',
      createdAt: '2026-08-05T13:45:00.000Z',
      updatedAt: '2026-08-24T11:30:00.000Z',
    },
    {
      id: 'prod-6',
      code: 'EST-006',
      barcode: '7891000100066',
      name: 'Tubo PVC Soldável 25mm 3/4 (Barra 6m)',
      description: 'Tubo marrom para água fria predial',
      category: 'Hidráulica',
      unit: 'M',
      currentStock: 36,
      minStock: 24,
      maxStock: 120,
      costPrice: 18.2,
      sellingPrice: 32.0,
      supplier: 'HidroTubos Distribuição',
      location: 'Depósito Lateral - Tubos',
      createdAt: '2026-08-06T15:00:00.000Z',
      updatedAt: '2026-08-21T09:10:00.000Z',
    }
  ],
  movements: [
    {
      id: 'mov-1',
      productId: 'prod-1',
      productCode: 'EST-001',
      productName: 'Parafuso Sextavado Aço Inox 1/4 x 2',
      type: 'IN',
      quantity: 50,
      previousStock: 0,
      newStock: 50,
      unitPrice: 28.5,
      totalPrice: 1425.0,
      reason: 'Compra de Fornecedor',
      documentNumber: 'NF-10492',
      contactName: 'Metálica Parafusos Brasil',
      responsible: 'Almoxarife Carlos',
      notes: 'Lote inicial para estoque de segurança',
      timestamp: '2026-08-01T09:00:00.000Z',
    },
    {
      id: 'mov-2',
      productId: 'prod-1',
      productCode: 'EST-001',
      productName: 'Parafuso Sextavado Aço Inox 1/4 x 2',
      type: 'OUT',
      quantity: 5,
      previousStock: 50,
      newStock: 45,
      unitPrice: 49.9,
      totalPrice: 249.5,
      reason: 'Venda / Pedido',
      documentNumber: 'PED-3091',
      contactName: 'Oficina Mecânica São José',
      responsible: 'Vendedor Lucas',
      notes: 'Retirada balcão',
      timestamp: '2026-08-20T10:15:00.000Z',
    },
    {
      id: 'mov-3',
      productId: 'prod-2',
      productCode: 'EST-002',
      productName: 'Luva de Proteção Nitrílica G',
      type: 'IN',
      quantity: 30,
      previousStock: 0,
      newStock: 30,
      unitPrice: 6.2,
      totalPrice: 186.0,
      reason: 'Compra de Fornecedor',
      documentNumber: 'NF-10512',
      contactName: 'Segurança Total EPIs',
      responsible: 'Almoxarife Carlos',
      notes: 'Reposição mensal de EPI',
      timestamp: '2026-08-02T10:00:00.000Z',
    },
    {
      id: 'mov-4',
      productId: 'prod-2',
      productCode: 'EST-002',
      productName: 'Luva de Proteção Nitrílica G',
      type: 'OUT',
      quantity: 22,
      previousStock: 30,
      newStock: 8,
      unitPrice: 14.5,
      totalPrice: 319.0,
      reason: 'Uso e Consumo Interno',
      documentNumber: 'REQ-4421',
      contactName: 'Equipe de Manutenção Industrial',
      responsible: 'Supervisor Roberto',
      notes: 'Entrega para equipe do turno da noite',
      timestamp: '2026-08-25T14:20:00.000Z',
    },
    {
      id: 'mov-5',
      productId: 'prod-4',
      productCode: 'EST-004',
      productName: 'Fita Isolante 3M Alta Fusão 19mm x 20m',
      type: 'OUT',
      quantity: 15,
      previousStock: 15,
      newStock: 0,
      unitPrice: 19.9,
      totalPrice: 298.5,
      reason: 'Venda / Pedido',
      documentNumber: 'PED-3120',
      contactName: 'Instaladora Elétrica Watts',
      responsible: 'Vendedor Lucas',
      notes: 'Estoque esgotado, necessita compra urgente',
      timestamp: '2026-08-26T08:00:00.000Z',
    }
  ]
};

// Helper to read DB
function readDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSeedData, null, 2), 'utf-8');
      return initialSeedData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.products) data.products = [];
    if (!data.movements) data.movements = [];
    return data;
  } catch (err) {
    console.error('Error reading database file, returning fallback data:', err);
    return initialSeedData;
  }
}

// Helper to write DB
function writeDB(data: DBStructure): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET complete inventory state
app.get('/api/inventory', (req, res) => {
  const db = readDB();
  res.json({
    products: db.products,
    movements: db.movements,
  });
});

// POST Create new product
app.post('/api/products', (req, res) => {
  const {
    code,
    barcode,
    name,
    description,
    imageUrl,
    category,
    unit,
    initialStock,
    minStock,
    maxStock,
    costPrice,
    sellingPrice,
    supplier,
    location,
    responsible,
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Nome e Categoria são obrigatórios.' });
  }

  const db = readDB();
  const now = new Date().toISOString();
  const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const finalCode = code?.trim() || `EST-${String(db.products.length + 1).padStart(3, '0')}`;
  const initialQty = Number(initialStock) || 0;
  const cost = Number(costPrice) || 0;
  const sell = Number(sellingPrice) || 0;
  const min = Number(minStock) || 0;

  const newProduct = {
    id,
    code: finalCode,
    barcode: barcode?.trim() || undefined,
    name: name.trim(),
    description: description?.trim() || '',
    imageUrl: imageUrl?.trim() || undefined,
    category: category.trim(),
    unit: (unit || 'UN').toUpperCase(),
    currentStock: initialQty,
    minStock: min,
    maxStock: maxStock ? Number(maxStock) : undefined,
    costPrice: cost,
    sellingPrice: sell,
    supplier: supplier?.trim() || '',
    location: location?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  db.products.unshift(newProduct);

  // If initial stock was given > 0, log an initial IN movement
  if (initialQty > 0) {
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    db.movements.unshift({
      id: movementId,
      productId: id,
      productCode: finalCode,
      productName: newProduct.name,
      type: 'IN',
      quantity: initialQty,
      previousStock: 0,
      newStock: initialQty,
      unitPrice: cost,
      totalPrice: initialQty * cost,
      reason: 'Cadastro Inicial de Estoque',
      documentNumber: 'CADASTRO',
      contactName: supplier?.trim() || 'Estoque Inicial',
      responsible: responsible || 'Almoxarife / Sistema',
      notes: 'Entrada automática gerada no cadastro do item',
      timestamp: now,
    });
  }

  writeDB(db);
  res.status(201).json({ product: newProduct, movements: db.movements });
});

// PUT Update existing product
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.products.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const existing = db.products[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id, // cannot change id
    currentStock: existing.currentStock, // stock changes must go through movements
    updatedAt: new Date().toISOString(),
  };

  // Convert numbers
  if (req.body.costPrice !== undefined) updated.costPrice = Number(req.body.costPrice);
  if (req.body.sellingPrice !== undefined) updated.sellingPrice = Number(req.body.sellingPrice);
  if (req.body.minStock !== undefined) updated.minStock = Number(req.body.minStock);
  if (req.body.maxStock !== undefined) updated.maxStock = Number(req.body.maxStock);

  db.products[index] = updated;
  writeDB(db);
  res.json({ product: updated });
});

// DELETE Product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.products.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const deleted = db.products.splice(index, 1)[0];
  writeDB(db);
  res.json({ success: true, deletedProduct: deleted });
});

// POST Register Movement (Stock IN or Stock OUT or Adjust)
app.post('/api/movements', (req, res) => {
  const {
    productId,
    type, // 'IN' | 'OUT' | 'ADJUST'
    quantity,
    unitPrice,
    reason,
    documentNumber,
    contactName,
    responsible,
    notes,
    timestamp,
  } = req.body;

  const qty = Number(quantity);
  if (!productId || !type || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Produto, tipo e quantidade positiva são obrigatórios.' });
  }

  const db = readDB();
  const product = db.products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado para movimentação.' });
  }

  const prevStock = product.currentStock;
  let newStock = prevStock;

  if (type === 'IN') {
    newStock = prevStock + qty;
  } else if (type === 'OUT') {
    if (prevStock < qty) {
      // We allow warning or negative if intended, but let's prevent accidental overdraft
      // Or calculate newStock and let user know
    }
    newStock = Math.max(0, prevStock - qty);
  } else if (type === 'ADJUST') {
    newStock = qty; // For direct balance adjustment
  }

  const price = Number(unitPrice) || (type === 'IN' ? product.costPrice : product.sellingPrice);
  const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = timestamp || new Date().toISOString();

  const movement = {
    id: movementId,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    type: type as 'IN' | 'OUT' | 'ADJUST',
    quantity: type === 'ADJUST' ? Math.abs(newStock - prevStock) : qty,
    previousStock: prevStock,
    newStock: newStock,
    unitPrice: price,
    totalPrice: (type === 'ADJUST' ? Math.abs(newStock - prevStock) : qty) * price,
    reason: reason || (type === 'IN' ? 'Entrada Diversa' : 'Saída Diversa'),
    documentNumber: documentNumber?.trim() || undefined,
    contactName: contactName?.trim() || undefined,
    responsible: responsible?.trim() || 'Usuário Atual',
    notes: notes?.trim() || undefined,
    timestamp: now,
  };

  // Update product stock and timestamp
  product.currentStock = newStock;
  product.updatedAt = now;

  // If IN and new cost provided, optionally update cost price
  if (type === 'IN' && Number(unitPrice) > 0) {
    product.costPrice = Number(unitPrice);
  }

  db.movements.unshift(movement);
  writeDB(db);

  res.status(201).json({
    movement,
    product,
    products: db.products,
    movements: db.movements,
  });
});

// DELETE Movement (undo movement and revert stock)
app.delete('/api/movements/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.movements.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Movimentação não encontrada.' });
  }

  const movement = db.movements[index];
  const product = db.products.find((p) => p.id === movement.productId);

  if (product) {
    // Revert stock
    if (movement.type === 'IN') {
      product.currentStock = Math.max(0, product.currentStock - movement.quantity);
    } else if (movement.type === 'OUT') {
      product.currentStock = product.currentStock + movement.quantity;
    }
    product.updatedAt = new Date().toISOString();
  }

  db.movements.splice(index, 1);
  writeDB(db);

  res.json({
    success: true,
    deletedMovement: movement,
    product,
    products: db.products,
    movements: db.movements,
  });
});

// POST Reconcile / Batch physical inventory audit
app.post('/api/inventory/reconcile', (req, res) => {
  const { audits, responsible } = req.body; // Array of { productId, countedStock, notes }
  if (!Array.isArray(audits) || audits.length === 0) {
    return res.status(400).json({ error: 'Lista de contagem é necessária.' });
  }

  const db = readDB();
  const now = new Date().toISOString();
  const recordedMovements = [];

  for (const item of audits) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;

    const counted = Number(item.countedStock);
    if (isNaN(counted) || counted < 0) continue;

    const diff = counted - product.currentStock;
    if (diff === 0) continue; // No change

    const type = diff > 0 ? 'IN' : 'OUT';
    const absQty = Math.abs(diff);

    const mov = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      type: 'ADJUST' as const,
      quantity: absQty,
      previousStock: product.currentStock,
      newStock: counted,
      unitPrice: product.costPrice,
      totalPrice: absQty * product.costPrice,
      reason: diff > 0 ? 'Ajuste de Balanço / Sobra (+)' : 'Ajuste de Balanço / Perda (-)',
      documentNumber: 'BALANCO-AUDIT',
      contactName: 'Contagem Física de Inventário',
      responsible: responsible || 'Auditor de Estoque',
      notes: item.notes || `Ajuste automático de balanço. Diferença: ${diff > 0 ? '+' : ''}${diff} ${product.unit}`,
      timestamp: now,
    };

    product.currentStock = counted;
    product.updatedAt = now;
    db.movements.unshift(mov);
    recordedMovements.push(mov);
  }

  writeDB(db);
  res.json({
    success: true,
    adjustedCount: recordedMovements.length,
    products: db.products,
    movements: db.movements,
  });
});

// Reset to initial sample data
app.post('/api/inventory/reset-sample', (req, res) => {
  writeDB(initialSeedData);
  res.json({
    success: true,
    products: initialSeedData.products,
    movements: initialSeedData.movements,
  });
});

// Full Backup Export / Import
app.get('/api/backup', (req, res) => {
  const db = readDB();
  res.json(db);
});

app.post('/api/backup', (req, res) => {
  const { products, movements } = req.body;
  if (!Array.isArray(products) || !Array.isArray(movements)) {
    return res.status(400).json({ error: 'Formato de backup inválido.' });
  }

  const cleanDB: DBStructure = {
    products,
    movements,
  };

  writeDB(cleanDB);
  res.json({ success: true, countProducts: products.length, countMovements: movements.length });
});

// Vite & Static server setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inventory server running on http://localhost:${PORT}`);
  });
}

startServer();
