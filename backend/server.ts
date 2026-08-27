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
      products: produtos.map(p => ({ ...p, id: p.codproduto, name: p.nome, code: p.codigo_interno, barcode: p.codigo_barras, description: p.descricao, category: p.categoria?.nome, categoria_nome: p.categoria?.nome, fornecedor_nome: p.fornecedor?.nome_fantasia })),
      movements: movimentacoes.map(m => ({ ...m, id: m.codmovimentacao, type: m.tipo_movimentacao === 'ENTRADA' ? 'IN' : m.tipo_movimentacao === 'SAIDA' ? 'OUT' : 'ADJUST', quantity: m.quantidade, reason: m.motivo_descricao, nome: m.produto?.nome, codigo_interno: m.produto?.codigo_interno, codusuario: m.usuario?.nome || 'Sistema', produto_nome: m.produto?.nome, produto_codigo: m.produto?.codigo_interno })),
      users: usuarios.map(mapUser),
      areas: areas.map(a => ({ ...a, id: a.codarea })),
      workOrders: workOrders.map(w => ({ ...w, id: w.codordem }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar inventÃ¡rio completo.' });
  }
});

// ---------------------------------------------
// PRODUTOS
// ---------------------------------------------
app.post('/api/products', async (req, res) => {
  const { codigo_interno, codigo_barras, nome, descricao, url_imagem, codcategoria, unidade_medida, estoque_atual, estoque_minimo, estoque_maximo, preco_custo, preco_venda, localizacao_estoque, tag_equipamento, criticidade, area_operacional } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome Ã© obrigatÃ³rio.' });

  try {
    let categoriaId = codcategoria;
    if (codcategoria && !codcategoria.includes('-')) {
      const cat = await prisma.categorias.upsert({ where: { nome: codcategoria }, update: {}, create: { nome: codcategoria } });
      categoriaId = cat.codcategoria;
    }
    
    // fallback if no category
    if (!categoriaId) {
      const defaultCat = await prisma.categorias.upsert({ where: { nome: 'Geral' }, update: {}, create: { nome: 'Geral' } });
      categoriaId = defaultCat.codcategoria;
    }

    const initialQty = Number(estoque_atual) || 0;
    const cost = Number(preco_custo) || 0;
    
    const newProduct = await prisma.produtos.create({
      data: {
        codigo_interno: codigo_interno?.trim() || `MNT-${Date.now().toString().slice(-6)}`,
        codigo_barras: codigo_barras?.trim() || null,
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        url_imagem: url_imagem?.trim() || null,
        codcategoria: categoriaId,
        unidade_medida: (unidade_medida || 'UN').toUpperCase(),
        estoque_atual: initialQty,
        estoque_minimo: Number(estoque_minimo) || 0,
        estoque_maximo: estoque_maximo ? Number(estoque_maximo) : null,
        preco_custo: cost,
        preco_venda: Number(preco_venda) || cost,
        localizacao_estoque: localizacao_estoque?.trim() || null,
        tag_equipamento: tag_equipamento?.trim() || null,
        criticidade: criticidade || 'BAIXA',
        area_operacional: area_operacional || null
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
    res.status(201).json({ ...productWithRelations, id: productWithRelations?.codproduto, name: productWithRelations?.nome, code: productWithRelations?.codigo_interno, barcode: productWithRelations?.codigo_barras, description: productWithRelations?.descricao, category: productWithRelations?.categoria?.nome, categoria_nome: productWithRelations?.categoria?.nome, fornecedor_nome: productWithRelations?.fornecedor?.nome_fantasia });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao criar produto.' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const p = req.body;
    
    let categoriaId = p.codcategoria;
    if (p.codcategoria && !p.codcategoria.includes('-')) {
      const cat = await prisma.categorias.upsert({ where: { nome: p.codcategoria }, update: {}, create: { nome: p.codcategoria } });
      categoriaId = cat.codcategoria;
    }

    const updated = await prisma.produtos.update({
      where: { codproduto: req.params.id },
      data: {
        nome: p.nome,
        descricao: p.descricao,
        preco_custo: p.preco_custo !== undefined ? Number(p.preco_custo) : undefined,
        preco_venda: p.preco_venda !== undefined ? Number(p.preco_venda) : undefined,
        estoque_minimo: p.estoque_minimo !== undefined ? Number(p.estoque_minimo) : undefined,
        estoque_maximo: p.estoque_maximo !== undefined ? Number(p.estoque_maximo) : undefined,
        localizacao_estoque: p.localizacao_estoque,
        tag_equipamento: p.tag_equipamento,
        criticidade: p.criticidade,
        codcategoria: categoriaId || undefined,
        unidade_medida: p.unidade_medida,
        area_operacional: p.area_operacional
      },
      include: { categoria: true, fornecedor: true }
    });
    res.json({ ...updated, id: updated.codproduto, name: updated.nome, code: updated.codigo_interno, barcode: updated.codigo_barras, description: updated.descricao, category: updated.categoria?.nome, categoria_nome: updated.categoria?.nome, fornecedor_nome: updated.fornecedor?.nome_fantasia });
  } catch (error) {
    res.status(404).json({ error: 'Produto nÃ£o encontrado.' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.movimentacoes.deleteMany({ where: { codproduto: req.params.id } });
    await prisma.produtos.delete({ where: { codproduto: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'NÃ£o foi possÃ­vel deletar o produto.' });
  }
});

// ---------------------------------------------
// MOVIMENTACOES
// ---------------------------------------------
app.post('/api/movements', async (req, res) => {
  const { codproduto, tipo_movimentacao, quantidade, preco_unitario, motivo_descricao, numero_documento, nome_contato, observacoes, area_operacional, codusuario } = req.body;
  const qty = Number(quantidade);
  if (!codproduto || !tipo_movimentacao || isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Dados invÃ¡lidos.' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const p = await tx.produtos.findUnique({ where: { codproduto }});
      if (!p) throw new Error('Produto nÃ£o encontrado');

      const prev = Number(p.estoque_atual);
      let next = prev;
      if (tipo_movimentacao === 'ENTRADA') next = prev + qty;
      else if (tipo_movimentacao === 'SAIDA') next = Math.max(0, prev - qty);
      else if (tipo_movimentacao === 'AJUSTE') next = qty;

      const finalQty = tipo_movimentacao === 'AJUSTE' ? Math.abs(next - prev) : qty;
      const price = Number(preco_unitario) || Number(p.preco_custo);

      const m = await tx.movimentacoes.create({
        data: {
          codproduto,
          codusuario: codusuario || null,
          tipo_movimentacao,
          quantidade: finalQty,
          estoque_anterior: prev,
          estoque_novo: next,
          preco_unitario: price,
          preco_total: finalQty * price,
          motivo_descricao: motivo_descricao || tipo_movimentacao,
          numero_documento, nome_contato, observacoes, area_operacional
        }
      });
      await tx.produtos.update({ where: { codproduto }, data: { estoque_atual: next, preco_custo: (tipo_movimentacao === 'ENTRADA' && price > 0) ? price : undefined } });
      return m;
    });
    res.status(201).json({ ...result, id: result.codmovimentacao });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/movements/:id', async (req, res) => {
  try {
    const mov = await prisma.movimentacoes.findUnique({ where: { codmovimentacao: req.params.id }});
    if (!mov) return res.status(404).json({ error: 'NÃ£o encontrado' });
    
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
    res.status(400).json({ error: 'Erro ao estornar movimentaÃ§Ã£o' });
  }
});

// ---------------------------------------------
// AREAS OPERACIONAIS
// ---------------------------------------------
app.get('/api/areas', async (req, res) => {
  const areas = await prisma.areas_operacionais.findMany({ orderBy: { nome: 'asc' }});
  res.json(areas);
});
app.post('/api/areas', async (req, res) => {
  try {
    const area = await prisma.areas_operacionais.create({ data: req.body });
    res.status(201).json(area);
  } catch (err) { res.status(400).json({ error: 'Erro ao criar Ã¡rea (nome duplicado?)' }); }
});
app.put('/api/areas/:id', async (req, res) => {
  try {
    const area = await prisma.areas_operacionais.update({ where: { codarea: req.params.id }, data: req.body });
    res.json(area);
  } catch (err) { res.status(400).json({ error: 'Erro ao atualizar' }); }
});
app.delete('/api/areas/:id', async (req, res) => {
  try {
    await prisma.areas_operacionais.delete({ where: { codarea: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: 'NÃ£o Ã© possÃ­vel deletar Ã¡rea em uso' }); }
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
  } catch (err) { res.status(400).json({ error: 'NÃ£o Ã© possÃ­vel deletar usuÃ¡rio com histÃ³rico' }); }
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
    const { items, ...woData } = req.body;
    const wo = await prisma.$transaction(async (tx) => {
      let cost = 0;
      let qty = 0;
      
      const newWo = await tx.ordens_servico.create({
        data: {
          numero_os: woData.numero_os || `OS-${Date.now()}`,
          tipo_servico: woData.tipo_servico || 'MANUTENCAO',
          aplicacao: woData.aplicacao || '',
          tag_equipamento: woData.tag_equipamento,
          area_operacional: woData.area_operacional,
          nome_requisitante: woData.nome_requisitante || '',
          autorizado_por: woData.autorizado_por || '',
          prioridade: woData.prioridade || 'MEDIA',
          status: 'ABERTA'
        }
      });

      if (items && items.length > 0) {
        for (const item of items) {
          const product = await tx.produtos.findUnique({ where: { codproduto: item.codproduto }});
          if (product) {
            const requested = Number(item.quantidade_pedida);
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
        include: { itens: true }
      });
    });
    res.status(201).json(wo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/work-orders/:id/return', async (req, res) => {
  try {
    const wo = await prisma.ordens_servico.findUnique({ where: { codordem: req.params.id }, include: { itens: true } });
    if (!wo) return res.status(404).json({ error: 'OS nÃ£o encontrada' });

    const updated = await prisma.ordens_servico.update({
      where: { codordem: req.params.id },
      data: { status: 'CONCLUIDA', data_baixa: new Date() },
      include: { itens: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao baixar OS' });
  }
});

// ---------------------------------------------
// AUTH & USERS (LOGIN E CADASTRO)
// ---------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'UsuÃ¡rio e senha sÃ£o obrigatÃ³rios.' });

  const cleanUser = username.trim().toLowerCase();
  const user = await prisma.usuarios.findFirst({ where: { OR: [{ username: cleanUser }, { email: cleanUser }] } });

  if (!user || (user.senha_hash !== hashPassword(password) && user.senha_hash !== password)) {
    return res.status(401).json({ error: 'UsuÃ¡rio ou senha incorretos.' });
  }

  if (!user.ativo) return res.status(403).json({ error: 'UsuÃ¡rio inativo.' });

  await prisma.usuarios.update({ where: { codusuario: user.codusuario }, data: { ultimo_login: new Date() } });
  
  res.json({ success: true, user: mapUser(user), token: `auth-token-${user.codusuario}-${Date.now()}` });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password, role, department } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Nome, usuÃ¡rio e senha sÃ£o obrigatÃ³rios.' });

  const cleanUser = username.trim().toLowerCase();
  const exists = await prisma.usuarios.findFirst({ where: { OR: [{ username: cleanUser }, { email: email?.trim().toLowerCase() }] } });
  
  if (exists) return res.status(409).json({ error: 'UsuÃ¡rio ou email jÃ¡ cadastrado.' });

  const roleColors: Record<string, string> = { ADMIN: 'bg-purple-600', ALMOXARIFE: 'bg-emerald-600', PCM_ENG: 'bg-blue-600', MECANICO: 'bg-amber-600', CONSULTA: 'bg-slate-600' };

  const newUser = await prisma.usuarios.create({
    data: {
      nome: name.trim(),
      username: cleanUser,
      email: email?.trim(),
      role: role || 'ALMOXARIFE',
      senha_hash: hashPassword(password),
      departamento: department?.trim() || 'ManutenÃ§Ã£o',
      cor_avatar: roleColors[role || 'ALMOXARIFE'] || 'bg-slate-600'
    }
  });

  res.status(201).json({ success: true, user: mapUser(newUser), token: `auth-token-${newUser.codusuario}-${Date.now()}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory Backend API running on http://localhost:${PORT}`);
});
