import express from 'express';
import { prisma } from './src/lib/db';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

(Prisma.Decimal.prototype as any).toJSON = function() {
  return this.toNumber();
};

const app = express();
const PORT = process.env.PORT || 3000;

const sanitizeJSON = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object') {
    if (typeof obj.toNumber === 'function') return obj.toNumber();
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeJSON);
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (['estoque_atual', 'estoque_minimo', 'estoque_maximo', 'preco_custo', 'preco_venda', 'quantidade', 'estoque_anterior', 'estoque_novo', 'preco_unitario', 'preco_total', 'quantidade_pedida', 'quantidade_baixada', 'quantidade_devolvida', 'custo_total', 'quantidade_total'].includes(key) && obj[key] !== null) {
        res[key] = Number(obj[key]);
      } else {
        res[key] = sanitizeJSON(obj[key]);
      }
    }
    return res;
  }
  return obj;
};

// Intercept all JSON responses to cast Decimals to Numbers
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    return originalJson.call(this, sanitizeJSON(obj));
  };
  next();
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_industrial_mro_salt_2026').digest('hex');
}

const mapUser = (u: any) => ({
  id: u.codusuario,
  name: u.nome,
  username: u.username,
  email: u.email,
  role: u.role,
  active: u.ativo,
  avatarColor: u.cor_avatar,
  department: u.departamento,
  createdAt: u.data_criacao,
  lastLogin: u.ultimo_login
});

const mapProduct = (p: any) => ({
  id: p.codproduto,
  code: p.codigo_interno,
  barcode: p.codigo_barras,
  name: p.nome,
  description: p.descricao,
  imageUrl: p.url_imagem,
  category: p.categoria?.nome || p.categoria_nome || 'Geral',
  unit: p.unidade_medida,
  equipmentTag: p.tag_equipamento,
  operationalArea: p.area_operacional,
  criticality: p.criticidade,
  currentStock: Number(p.estoque_atual || 0),
  minStock: Number(p.estoque_minimo || 0),
  maxStock: p.estoque_maximo ? Number(p.estoque_maximo) : undefined,
  costPrice: Number(p.preco_custo || 0),
  supplier: p.fornecedor?.nome_fantasia || p.fornecedor_nome,
  location: p.localizacao_estoque,
  createdAt: p.data_criacao,
  updatedAt: p.data_atualizacao
});

const mapMovement = (m: any) => ({
  id: m.codmovimentacao,
  productId: m.codproduto,
  productCode: m.produto?.codigo_interno || m.produto_codigo,
  productName: m.produto?.nome || m.produto_nome,
  type: m.tipo_movimentacao === 'ENTRADA' ? 'IN' : m.tipo_movimentacao === 'SAIDA' ? 'OUT' : 'ADJUST',
  quantity: Number(m.quantidade || 0),
  previousStock: Number(m.estoque_anterior || 0),
  newStock: Number(m.estoque_novo || 0),
  unitPrice: Number(m.preco_unitario || 0),
  totalPrice: Number(m.preco_total || 0),
  reason: m.motivo_descricao,
  documentNumber: m.numero_documento,
  contactName: m.nome_contato,
  operationalArea: m.area_operacional,
  responsible: m.usuario?.nome || 'Sistema',
  notes: m.observacoes,
  timestamp: m.data_movimentacao
});

const mapArea = (a: any) => ({
  id: a.codarea,
  name: a.nome,
  type: a.tipo,
  code: a.codigo,
  description: a.descricao,
  active: a.ativo,
  createdAt: a.data_criacao,
  updatedAt: a.data_atualizacao
});

const mapWorkOrderItem = (i: any) => ({
  productId: i.codproduto,
  productCode: i.produto?.codigo_interno || '',
  productName: i.produto?.nome || '',
  quantity: Number(i.quantidade_pedida || 0),
  dischargedQuantity: Number(i.quantidade_baixada || 0),
  returnedQuantity: Number(i.quantidade_devolvida || 0),
  unit: i.produto?.unidade_medida || 'UN',
  unitPrice: Number(i.preco_unitario || 0),
  totalPrice: Number(i.preco_total || 0),
  currentStock: Number(i.produto?.estoque_atual || 0)
});

const mapWorkOrder = (w: any) => ({
  id: w.codordem,
  osNumber: w.numero_os,
  date: w.data_abertura || w.data_criacao,
  serviceType: w.tipo_servico,
  application: w.aplicacao,
  equipmentTag: w.tag_equipamento,
  operationalArea: w.area_operacional,
  requesterName: w.nome_requisitante,
  requesterRole: w.cargo_requisitante,
  authorizedBy: w.autorizado_por,
  warehouseKeeper: w.almoxarife,
  sector: w.setor,
  priority: w.prioridade,
  items: (w.itens || []).map(mapWorkOrderItem),
  totalCost: Number(w.custo_total || 0),
  totalQuantity: Number(w.quantidade_total || 0),
  status: w.status,
  dischargedAt: w.data_baixa,
  dischargedBy: w.baixado_por,
  returns: [],
  notes: w.observacoes,
  createdAt: w.data_criacao
});

// ---------------------------------------------
// ENDPOINTS GERAIS
// ---------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok', serverTime: new Date().toISOString() }));

app.get('/api/inventory', async (req, res) => {
  try {
    const produtos = await prisma.produtos.findMany({ include: { categoria: true, fornecedor: true }, orderBy: { data_criacao: 'desc' }});
    const movimentacoes = await prisma.movimentacoes.findMany({ include: { produto: true, usuario: true }, orderBy: { data_movimentacao: 'desc' }});
    const usuarios = await prisma.usuarios.findMany({ select: { codusuario: true, nome: true, username: true, email: true, role: true, ativo: true, departamento: true, cor_avatar: true, ultimo_login: true, data_criacao: true }});
    const areas = await prisma.areas_operacionais.findMany({ orderBy: { nome: 'asc' }});
    const workOrders = await prisma.ordens_servico.findMany({ include: { itens: { include: { produto: true } } }, orderBy: { data_criacao: 'desc' }});

    res.json({
      products: produtos.map(mapProduct),
      movements: movimentacoes.map(mapMovement),
      users: usuarios.map(mapUser),
      areas: areas.map(mapArea),
      workOrders: workOrders.map(mapWorkOrder)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar inventário completo.' });
  }
});

// ---------------------------------------------
// PRODUTOS
// ---------------------------------------------
app.post('/api/products', async (req, res) => {
  const { code, barcode, name, description, imageUrl, category, unit, currentStock, minStock, maxStock, costPrice, location, equipmentTag, criticality, operationalArea } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

  try {
    let categoriaId = undefined;
    if (category) {
      const cat = await prisma.categorias.upsert({ where: { nome: category }, update: {}, create: { nome: category } });
      categoriaId = cat.codcategoria;
    } else {
      const defaultCat = await prisma.categorias.upsert({ where: { nome: 'Geral' }, update: {}, create: { nome: 'Geral' } });
      categoriaId = defaultCat.codcategoria;
    }

    const initialQty = Number(currentStock) || 0;
    const cost = Number(costPrice) || 0;
    
    const newProduct = await prisma.produtos.create({
      data: {
        codigo_interno: code?.trim() || `MNT-${Date.now().toString().slice(-6)}`,
        codigo_barras: barcode?.trim() || null,
        nome: name.trim(),
        descricao: description?.trim() || null,
        url_imagem: imageUrl?.trim() || null,
        codcategoria: categoriaId,
        unidade_medida: (unit || 'UN').toUpperCase(),
        estoque_atual: initialQty,
        estoque_minimo: Number(minStock) || 0,
        estoque_maximo: maxStock ? Number(maxStock) : null,
        preco_custo: cost,
        preco_venda: cost,
        localizacao_estoque: location?.trim() || null,
        tag_equipamento: equipmentTag?.trim() || null,
        criticidade: criticality || 'BAIXA',
        area_operacional: operationalArea || null
      }
    });

    if (initialQty > 0) {
      await prisma.movimentacoes.create({
        data: {
          codproduto: newProduct.codproduto,
          tipo_movimentacao: 'ENTRADA',
          quantidade: initialQty,
          estoque_anterior: 0,
          estoque_novo: initialQty,
          preco_unitario: cost,
          preco_total: initialQty * cost,
          motivo_descricao: 'Cadastro Inicial',
        }
      });
    }

    const productWithRelations = await prisma.produtos.findUnique({ where: { codproduto: newProduct.codproduto }, include: { categoria: true, fornecedor: true } });
    res.status(201).json(mapProduct(productWithRelations));
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao criar produto.' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const p = req.body;
    
    let categoriaId = undefined;
    if (p.category) {
      const cat = await prisma.categorias.upsert({ where: { nome: p.category }, update: {}, create: { nome: p.category } });
      categoriaId = cat.codcategoria;
    }

    const updated = await prisma.produtos.update({
      where: { codproduto: req.params.id },
      data: {
        nome: p.name,
        descricao: p.description,
        preco_custo: p.costPrice !== undefined ? Number(p.costPrice) : undefined,
        estoque_minimo: p.minStock !== undefined ? Number(p.minStock) : undefined,
        estoque_maximo: p.maxStock !== undefined ? Number(p.maxStock) : undefined,
        localizacao_estoque: p.location,
        tag_equipamento: p.equipmentTag,
        criticidade: p.criticality,
        codcategoria: categoriaId || undefined,
        unidade_medida: p.unit,
        area_operacional: p.operationalArea
      },
      include: { categoria: true, fornecedor: true }
    });
    res.json(mapProduct(updated));
  } catch (error) {
    res.status(404).json({ error: 'Produto não encontrado.' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.movimentacoes.deleteMany({ where: { codproduto: req.params.id } });
    await prisma.produtos.delete({ where: { codproduto: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Não foi possível deletar o produto.' });
  }
});

// ---------------------------------------------
// MOVIMENTACOES
// ---------------------------------------------
app.post('/api/movements', async (req, res) => {
  const { productId, type, quantity, unitPrice, reason, documentNumber, contactName, notes, operationalArea, responsible } = req.body;
  const qty = Number(quantity);
  if (!productId || !type || isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Dados inválidos.' });
  
  const tipo_movimentacao = type === 'IN' ? 'ENTRADA' : type === 'OUT' ? 'SAIDA' : 'AJUSTE';

  try {
    const result = await prisma.$transaction(async (tx) => {
      const p = await tx.produtos.findUnique({ where: { codproduto: productId }});
      if (!p) throw new Error('Produto não encontrado');

      const prev = Number(p.estoque_atual);
      let next = prev;
      if (tipo_movimentacao === 'ENTRADA') next = prev + qty;
      else if (tipo_movimentacao === 'SAIDA') next = Math.max(0, prev - qty);
      else if (tipo_movimentacao === 'AJUSTE') next = qty;

      const finalQty = tipo_movimentacao === 'AJUSTE' ? Math.abs(next - prev) : qty;
      const price = Number(unitPrice) || Number(p.preco_custo);

      const m = await tx.movimentacoes.create({
        data: {
          codproduto: productId,
          codusuario: null, // can't reliably map "responsible" string to user ID unless we look it up
          tipo_movimentacao,
          quantidade: finalQty,
          estoque_anterior: prev,
          estoque_novo: next,
          preco_unitario: price,
          preco_total: finalQty * price,
          motivo_descricao: reason || tipo_movimentacao,
          numero_documento: documentNumber, nome_contato: contactName, observacoes: notes, area_operacional: operationalArea
        }
      });
      await tx.produtos.update({ where: { codproduto: productId }, data: { estoque_atual: next, preco_custo: (tipo_movimentacao === 'ENTRADA' && price > 0) ? price : undefined } });
      return m;
    });
    res.status(201).json(mapMovement(result));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/movements/:id', async (req, res) => {
  try {
    const mov = await prisma.movimentacoes.findUnique({ where: { codmovimentacao: req.params.id }});
    if (!mov) return res.status(404).json({ error: 'Não encontrado' });
    
    await prisma.$transaction(async (tx) => {
      const p = await tx.produtos.findUnique({ where: { codproduto: mov.codproduto }});
      if (p) {
        let rev = Number(p.estoque_atual);
        if (mov.tipo_movimentacao === 'ENTRADA') rev -= Number(mov.quantidade);
        if (mov.tipo_movimentacao === 'SAIDA') rev += Number(mov.quantidade);
        await tx.produtos.update({ where: { codproduto: mov.codproduto }, data: { estoque_atual: Math.max(0, rev) } });
      }
      await tx.movimentacoes.delete({ where: { codmovimentacao: req.params.id } });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao estornar movimentação' });
  }
});

// ---------------------------------------------
// AREAS OPERACIONAIS
// ---------------------------------------------
app.get('/api/areas', async (req, res) => {
  const areas = await prisma.areas_operacionais.findMany({ orderBy: { nome: 'asc' }});
  res.json(areas.map(mapArea));
});
app.post('/api/areas', async (req, res) => {
  try {
    const area = await prisma.areas_operacionais.create({ 
      data: {
        nome: req.body.name,
        tipo: req.body.type,
        codigo: req.body.code,
        descricao: req.body.description,
        ativo: req.body.active
      } 
    });
    res.status(201).json(mapArea(area));
  } catch (err) { res.status(400).json({ error: 'Erro ao criar área (nome duplicado?)' }); }
});
app.put('/api/areas/:id', async (req, res) => {
  try {
    const area = await prisma.areas_operacionais.update({ 
      where: { codarea: req.params.id }, 
      data: {
        nome: req.body.name,
        tipo: req.body.type,
        codigo: req.body.code,
        descricao: req.body.description,
        ativo: req.body.active
      } 
    });
    res.json(mapArea(area));
  } catch (err) { res.status(400).json({ error: 'Erro ao atualizar' }); }
});
app.delete('/api/areas/:id', async (req, res) => {
  try {
    await prisma.areas_operacionais.delete({ where: { codarea: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: 'Não é possível deletar área em uso' }); }
});

// ---------------------------------------------
// USERS (ADMIN)
// ---------------------------------------------
app.get('/api/users', async (req, res) => {
  const users = await prisma.usuarios.findMany();
  res.json(users.map(mapUser));
});
app.put('/api/users/:id', async (req, res) => {
  try {
    const updated = await prisma.usuarios.update({ where: { codusuario: req.params.id }, data: { nome: req.body.name, role: req.body.role, ativo: req.body.active, departamento: req.body.department } });
    res.json(mapUser(updated));
  } catch (err) { res.status(400).json({ error: 'Erro ao atualizar' }); }
});
app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.usuarios.delete({ where: { codusuario: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: 'Não é possível deletar usuário com histórico' }); }
});

// ---------------------------------------------
// WORK ORDERS (ORDENS DE SERVICO)
// ---------------------------------------------
app.get('/api/work-orders/next-number', async (req, res) => {
  const last = await prisma.ordens_servico.findFirst({ orderBy: { data_criacao: 'desc' } });
  let next = 1;
  if (last && last.numero_os.startsWith('OS-')) next = parseInt(last.numero_os.replace('OS-', '')) + 1;
  res.json({ nextNumber: `OS-${String(next).padStart(5, '0')}` });
});

app.post('/api/work-orders', async (req, res) => {
  try {
    const woData = req.body;
    const items = woData.items || [];
    const wo = await prisma.$transaction(async (tx) => {
      let cost = 0;
      let qty = 0;
      
      const newWo = await tx.ordens_servico.create({
        data: {
          numero_os: woData.osNumber || `OS-${Date.now()}`,
          tipo_servico: woData.serviceType || 'MANUTENCAO',
          aplicacao: woData.application || '',
          tag_equipamento: woData.equipmentTag,
          area_operacional: woData.operationalArea,
          nome_requisitante: woData.requesterName || '',
          cargo_requisitante: woData.requesterRole,
          autorizado_por: woData.authorizedBy || '',
          prioridade: woData.priority || 'MEDIA',
          status: 'ABERTA'
        }
      });

      if (items && items.length > 0) {
        for (const item of items) {
          const product = await tx.produtos.findUnique({ where: { codproduto: item.productId }});
          if (product) {
            const requested = Number(item.quantity);
            const price = Number(product.preco_custo);
            await tx.itens_ordem_servico.create({
              data: {
                codordem: newWo.codordem,
                codproduto: product.codproduto,
                quantidade_pedida: requested,
                preco_unitario: price,
                preco_total: requested * price
              }
            });
            cost += (requested * price);
            qty += requested;
          }
        }
      }
      
      return await tx.ordens_servico.update({
        where: { codordem: newWo.codordem },
        data: { custo_total: cost, quantidade_total: qty },
        include: { itens: { include: { produto: true } } }
      });
    });
    res.status(201).json(mapWorkOrder(wo));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/work-orders/:id/return', async (req, res) => {
  try {
    const wo = await prisma.ordens_servico.findUnique({ where: { codordem: req.params.id }, include: { itens: true } });
    if (!wo) return res.status(404).json({ error: 'OS não encontrada' });

    const updated = await prisma.ordens_servico.update({
      where: { codordem: req.params.id },
      data: { status: 'CONCLUIDA', data_baixa: new Date() },
      include: { itens: { include: { produto: true } } }
    });
    res.json(mapWorkOrder(updated));
  } catch (err) {
    res.status(400).json({ error: 'Erro ao baixar OS' });
  }
});

// ---------------------------------------------
// AUTH & USERS (LOGIN E CADASTRO)
// ---------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });

  const cleanUser = username.trim().toLowerCase();
  const user = await prisma.usuarios.findFirst({ where: { OR: [{ username: cleanUser }, { email: cleanUser }] } });

  if (!user || (user.senha_hash !== hashPassword(password) && user.senha_hash !== password)) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  if (!user.ativo) return res.status(403).json({ error: 'Usuário inativo.' });

  await prisma.usuarios.update({ where: { codusuario: user.codusuario }, data: { ultimo_login: new Date() } });
  
  res.json({ success: true, user: mapUser(user), token: `auth-token-${user.codusuario}-${Date.now()}` });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password, role, department } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios.' });

  const cleanUser = username.trim().toLowerCase();
  const exists = await prisma.usuarios.findFirst({ where: { OR: [{ username: cleanUser }, { email: email?.trim().toLowerCase() }] } });
  
  if (exists) return res.status(409).json({ error: 'Usuário ou email já cadastrado.' });

  const roleColors: Record<string, string> = { ADMIN: 'bg-purple-600', ALMOXARIFE: 'bg-emerald-600', PCM_ENG: 'bg-blue-600', MECANICO: 'bg-amber-600', CONSULTA: 'bg-slate-600' };

  const newUser = await prisma.usuarios.create({
    data: {
      nome: name.trim(),
      username: cleanUser,
      email: email?.trim(),
      role: role || 'ALMOXARIFE',
      senha_hash: hashPassword(password),
      departamento: department?.trim() || 'Manutenção',
      cor_avatar: roleColors[role || 'ALMOXARIFE'] || 'bg-slate-600'
    }
  });

  res.status(201).json({ success: true, user: mapUser(newUser), token: `auth-token-${newUser.codusuario}-${Date.now()}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory Backend API running on http://localhost:${PORT}`);
});
