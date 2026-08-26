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
    equipmentTag?: string;
    criticality?: 'HIGH' | 'MEDIUM' | 'LOW';
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
      code: 'MNT-001',
      barcode: '7891000100011',
      name: 'Rolamento Autocompensador 22216 EK',
      description: 'Rolamento de rolos esféricos para redutor principal de esteira',
      category: 'Rolamentos & Mancais',
      unit: 'UN',
      currentStock: 6,
      minStock: 2,
      maxStock: 10,
      costPrice: 420.0,
      sellingPrice: 420.0,
      supplier: 'SKF Distribuidora Brasil',
      location: 'Gaveteiro M-02 / Prateleira A',
      equipmentTag: 'EST-CV-01 / RED-04',
      criticality: 'HIGH',
      createdAt: '2026-08-01T08:30:00.000Z',
      updatedAt: '2026-08-20T10:15:00.000Z',
    },
    {
      id: 'prod-2',
      code: 'MNT-002',
      barcode: '7891000100028',
      name: 'Válvula Solenoide Direcional 5/2 Vias 24VCC',
      description: 'Válvula pneumática para acionamento de cilindro alimentador',
      category: 'Pneumática',
      unit: 'UN',
      currentStock: 1,
      minStock: 3,
      maxStock: 8,
      costPrice: 285.0,
      sellingPrice: 285.0,
      supplier: 'Festo Automação Industrial',
      location: 'Prateleira P-03',
      equipmentTag: 'PRE-HY-02 / EMB-01',
      criticality: 'HIGH',
      createdAt: '2026-08-02T09:00:00.000Z',
      updatedAt: '2026-08-25T14:20:00.000Z',
    },
    {
      id: 'prod-3',
      code: 'MNT-003',
      barcode: '7891000100035',
      name: 'Óleo Lubrificante Sintético ISO VG 220',
      description: 'Tambor/Bombona de 20 Litros para engrenagens fechadas e redutores',
      category: 'Lubrificantes & Químicos',
      unit: 'L',
      currentStock: 60,
      minStock: 20,
      maxStock: 120,
      costPrice: 38.5,
      sellingPrice: 38.5,
      supplier: 'Mobil Lubrificantes Industriais',
      location: 'Bacia de Contenção Q-01',
      equipmentTag: 'Linha Geral de Britagem',
      criticality: 'MEDIUM',
      createdAt: '2026-08-03T11:00:00.000Z',
      updatedAt: '2026-08-22T16:00:00.000Z',
    },
    {
      id: 'prod-4',
      code: 'MNT-004',
      barcode: '7891000100042',
      name: 'Contator de Potência Tripolar 32A 220V (Siemens)',
      description: 'Contator auxiliar para acionamento de motor bomba d’água',
      category: 'Elétrica & Painéis',
      unit: 'UN',
      currentStock: 0,
      minStock: 2,
      maxStock: 6,
      costPrice: 195.0,
      sellingPrice: 195.0,
      supplier: 'Siemens Brasil / Eletro Peças',
      location: 'Armário Elétrico E-01',
      equipmentTag: 'CCM-02 / BOM-05',
      criticality: 'HIGH',
      createdAt: '2026-08-04T10:30:00.000Z',
      updatedAt: '2026-08-26T08:00:00.000Z',
    },
    {
      id: 'prod-5',
      code: 'MNT-005',
      barcode: '7891000100059',
      name: 'Correia em V Perfil B-68 Gates',
      description: 'Correia de transmissão de alta resistência a calor e óleo',
      category: 'Correias & Polias',
      unit: 'UN',
      currentStock: 12,
      minStock: 4,
      maxStock: 20,
      costPrice: 46.0,
      sellingPrice: 46.0,
      supplier: 'Gates Transmissões Brasil',
      location: 'Ganchos Prateleira T-04',
      equipmentTag: 'EXA-VEN-03 / COM-01',
      criticality: 'MEDIUM',
      createdAt: '2026-08-05T13:45:00.000Z',
      updatedAt: '2026-08-24T11:30:00.000Z',
    },
    {
      id: 'prod-6',
      code: 'MNT-006',
      barcode: '7891000100066',
      name: 'Retentor Radial de Óleo 45x65x10 NBR (Sabó)',
      description: 'Vedação para eixo de bomba centrífuga',
      category: 'Vedações & Retentores',
      unit: 'UN',
      currentStock: 18,
      minStock: 5,
      maxStock: 30,
      costPrice: 22.8,
      sellingPrice: 22.8,
      supplier: 'Sabó Vedação Industrial',
      location: 'Gaveteiro V-01',
      equipmentTag: 'BOM-01 a BOM-08',
      criticality: 'LOW',
      createdAt: '2026-08-06T15:00:00.000Z',
      updatedAt: '2026-08-21T09:10:00.000Z',
    }
  ],
  movements: [
    {
      id: 'mov-1',
      productId: 'prod-1',
      productCode: 'MNT-001',
      productName: 'Rolamento Autocompensador 22216 EK',
      type: 'IN',
      quantity: 8,
      previousStock: 0,
      newStock: 8,
      unitPrice: 420.0,
      totalPrice: 3360.0,
      reason: 'Compra / Reposição de Sobressalentes',
      documentNumber: 'NF-10492',
      contactName: 'SKF Distribuidora Brasil',
      responsible: 'Almoxarife Carlos',
      notes: 'Recebimento de lote para estoque de segurança preventiva',
      timestamp: '2026-08-01T09:00:00.000Z',
    },
    {
      id: 'mov-2',
      productId: 'prod-1',
      productCode: 'MNT-001',
      productName: 'Rolamento Autocompensador 22216 EK',
      type: 'OUT',
      quantity: 2,
      previousStock: 8,
      newStock: 6,
      unitPrice: 420.0,
      totalPrice: 840.0,
      reason: 'Aplicação em O.S. Preventiva',
      documentNumber: 'OS-2026-089',
      contactName: 'TAG: EST-CV-01 (Esteira Transportadora 1)',
      responsible: 'Mecânico André / L. Silva',
      notes: 'Troca preventiva de rolamentos da esteira principal',
      timestamp: '2026-08-20T10:15:00.000Z',
    },
    {
      id: 'mov-3',
      productId: 'prod-2',
      productCode: 'MNT-002',
      productName: 'Válvula Solenoide Direcional 5/2 Vias 24VCC',
      type: 'IN',
      quantity: 3,
      previousStock: 0,
      newStock: 3,
      unitPrice: 285.0,
      totalPrice: 855.0,
      reason: 'Compra / Reposição de Sobressalentes',
      documentNumber: 'NF-10512',
      contactName: 'Festo Automação Industrial',
      responsible: 'Almoxarife Carlos',
      notes: 'Aquisição de sobressalentes pneumáticos para prensas',
      timestamp: '2026-08-02T10:00:00.000Z',
    },
    {
      id: 'mov-4',
      productId: 'prod-2',
      productCode: 'MNT-002',
      productName: 'Válvula Solenoide Direcional 5/2 Vias 24VCC',
      type: 'OUT',
      quantity: 2,
      previousStock: 3,
      newStock: 1,
      unitPrice: 285.0,
      totalPrice: 570.0,
      reason: 'Aplicação em O.S. Corretiva (Urgente)',
      documentNumber: 'OS-2026-114',
      contactName: 'TAG: PRE-HY-02 (Prensa Hidráulica 2)',
      responsible: 'Téc. Mecatrônico Marcos',
      notes: 'Troca imediata por falha na bobina durante o turno produtivo',
      timestamp: '2026-08-25T14:20:00.000Z',
    },
    {
      id: 'mov-5',
      productId: 'prod-4',
      productCode: 'MNT-004',
      productName: 'Contator de Potência Tripolar 32A 220V (Siemens)',
      type: 'OUT',
      quantity: 2,
      previousStock: 2,
      newStock: 0,
      unitPrice: 195.0,
      totalPrice: 390.0,
      reason: 'Aplicação em O.S. Corretiva (Urgente)',
      documentNumber: 'OS-2026-121',
      contactName: 'TAG: CCM-02 / BOM-05',
      responsible: 'Eletricista Renato',
      notes: 'Item esgotado no almoxarifado, requisitada compra urgente',
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
    equipmentTag,
    criticality,
    responsible,
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Nome e Categoria são obrigatórios.' });
  }

  const db = readDB();
  const now = new Date().toISOString();
  const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const finalCode = code?.trim() || `MNT-${String(db.products.length + 1).padStart(3, '0')}`;
  const initialQty = Number(initialStock) || 0;
  const cost = Number(costPrice) || 0;
  const sell = Number(sellingPrice) || cost;
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
    equipmentTag: equipmentTag?.trim() || '',
    criticality: (criticality as 'HIGH' | 'MEDIUM' | 'LOW') || 'LOW',
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
      reason: 'Cadastro Inicial de Sobressalente',
      documentNumber: 'CADASTRO-INICIAL',
      contactName: supplier?.trim() || 'Estoque Inicial de Manutenção',
      responsible: responsible || 'Almoxarife / PCM',
      notes: 'Entrada automática gerada no cadastro do item de manutenção',
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
