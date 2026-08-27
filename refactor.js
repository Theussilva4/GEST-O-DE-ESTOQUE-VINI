import fs from 'fs';
import path from 'path';

const dir = './frontend/src';

const replacements = [
  ['currentStock', 'estoque_atual'],
  ['minStock', 'estoque_minimo'],
  ['maxStock', 'estoque_maximo'],
  ['costPrice', 'preco_custo'],
  ['sellingPrice', 'preco_venda'],
  ['imageUrl', 'url_imagem'],
  ['equipmentTag', 'tag_equipamento'],
  ['criticality', 'criticidade'],
  ['unitPrice', 'preco_unitario'],
  ['totalPrice', 'preco_total'],
  ['previousStock', 'estoque_anterior'],
  ['newStock', 'estoque_novo'],
  ['documentNumber', 'numero_documento'],
  ['contactName', 'nome_contato'],
  ['responsible', 'codusuario'],
  ['notes', 'observacoes'],
  ['productId', 'codproduto'],
  ['productCode', 'codigo_interno'],
  ['productName', 'nome'],
  ['category', 'codcategoria'],
  ['unit', 'unidade_medida'],
  ['supplier', 'codfornecedor'],
  ['location', 'localizacao_estoque'],
  ['MovementType', 'TipoMovimentacao'],
  ['MaintenanceCriticality', 'CriticidadeManutencao'],
  ['ProductUnit', 'UnidadeProduto'],
  ['Product', 'Produto'],
  ['Movement', 'Movimentacao'],
  ['timestamp', 'data_movimentacao'],
  ['createdAt', 'data_criacao'],
  ['updatedAt', 'data_atualizacao']
];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (file === 'types.ts') continue; // Já editamos manualmente
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      for (const [oldName, newName] of replacements) {
        // Regex to match exact property names and types
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        content = content.replace(regex, newName);
      }
      
      fs.writeFileSync(fullPath, content);
      console.log(`Atualizado: ${fullPath}`);
    }
  }
}

processDir(dir);
console.log('Refatoração concluída!');
