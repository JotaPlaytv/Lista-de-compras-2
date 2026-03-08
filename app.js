// =====================
// ESTADO & STORAGE
// =====================

let state = {
  listas: [],       // Array de listas
  listaAtualId: null,
  itemModalId: null,
};

const STORAGE_KEY = 'compras_v2';

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.listas));
}

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.listas = JSON.parse(raw);
  } catch(e) { state.listas = []; }
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getLista(id) {
  return state.listas.find(l => l.id === id);
}

function getItem(listaId, itemId) {
  const lista = getLista(listaId);
  return lista?.itens.find(i => i.id === itemId);
}

// =====================
// NAVEGAÇÃO
// =====================

function irParaTela(id) {
  const telaAtual = document.querySelector('.tela.ativa');
  const telaNova = document.getElementById(id);
  if (telaAtual === telaNova) return;
  telaAtual?.classList.add('saindo');
  setTimeout(() => telaAtual?.classList.remove('ativa', 'saindo'), 280);
  telaNova.classList.add('ativa');
}

// =====================
// TELA: LISTAS
// =====================

function renderListas() {
  const container = document.getElementById('listas-container');
  const empty = document.getElementById('empty-listas');
  container.innerHTML = '';

  if (state.listas.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  state.listas.slice().reverse().forEach(lista => {
    const card = document.createElement('div');
    card.className = 'lista-card';

    const totalItens = lista.itens.length;
    const totalComprados = lista.itens.filter(i => i.comprado).length;
    const totalEst = lista.itens.reduce((s, i) => s + (i.precoEst * i.qtd || 0), 0);

    let faseLabel = 'Planejamento';
    let faseClass = 'plan';
    if (lista.fase === 'compra') { faseLabel = 'Comprando'; faseClass = 'comp'; }
    if (lista.fase === 'finalizado') { faseLabel = 'Finalizado'; faseClass = 'fin'; }

    card.innerHTML = `
      <div class="lista-card-emoji">${lista.emoji || '🛒'}</div>
      <div class="lista-card-info">
        <div class="lista-card-nome">${lista.nome}</div>
        <div class="lista-card-meta">${totalItens} ${totalItens === 1 ? 'item' : 'itens'}${totalEst > 0 ? ' · ' + formatReal(totalEst) : ''}${lista.fase !== 'planejamento' ? ` · ${totalComprados}/${totalItens} comprados` : ''}</div>
      </div>
      <span class="lista-card-fase ${faseClass}">${faseLabel}</span>
      <button class="btn-del-lista" data-id="${lista.id}" aria-label="Excluir lista">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    `;

    card.querySelector('.lista-card-info, .lista-card-emoji, .lista-card-fase').addEventListener?.('click', () => abrirLista(lista.id));
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-del-lista')) abrirLista(lista.id);
    });
    card.querySelector('.btn-del-lista').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Excluir a lista "${lista.nome}"?`)) {
        state.listas = state.listas.filter(l => l.id !== lista.id);
        salvar();
        renderListas();
      }
    });

    container.appendChild(card);
  });
}

function abrirLista(id) {
  state.listaAtualId = id;
  const lista = getLista(id);
  if (!lista) return;

  if (lista.fase === 'finalizado') {
    mostrarResumo(id);
    return;
  }
  if (lista.fase === 'compra') {
    mostrarCompra(id);
    return;
  }
  mostrarPlanejamento(id);
}

// =====================
// TELA: PLANEJAMENTO
// =====================

function mostrarPlanejamento(id) {
  state.listaAtualId = id;
  const lista = getLista(id);
  document.getElementById('plan-titulo').textContent = lista.nome;
  renderPlanejamento();
  irParaTela('tela-planejamento');
}

function renderPlanejamento() {
  const lista = getLista(state.listaAtualId);
  if (!lista) return;
  const ul = document.getElementById('plan-lista');
  const empty = document.getElementById('empty-plan');
  ul.innerHTML = '';

  if (lista.itens.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    lista.itens.forEach(item => {
      const li = document.createElement('li');
      li.className = 'item-card';
      const qtdStr = item.qtd ? `${item.qtd} ${item.unidade}` : '';
      const precoStr = item.precoEst ? formatReal(item.precoEst) + '/un' : '';
      const totalEst = item.precoEst && item.qtd ? formatReal(item.precoEst * item.qtd) : '';
      li.innerHTML = `
        <div class="item-card-body">
          <div class="item-nome">${item.nome}</div>
          <div class="item-detalhes">
            ${qtdStr ? `<span class="item-chip">${qtdStr}</span>` : ''}
            ${precoStr ? `<span class="item-chip preco-est">${precoStr}</span>` : ''}
            ${item.obs ? `<span class="item-chip obs">"${item.obs}"</span>` : ''}
          </div>
          ${totalEst ? `<div class="item-total">${totalEst}</div>` : ''}
        </div>
        <div class="item-acoes">
          <button class="btn-del-item" data-id="${item.id}" aria-label="Remover">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      li.querySelector('.btn-del-item').addEventListener('click', () => {
        lista.itens = lista.itens.filter(i => i.id !== item.id);
        salvar();
        renderPlanejamento();
        atualizarStatsPlan();
      });
      ul.appendChild(li);
    });
  }
  atualizarStatsPlan();
}

function atualizarStatsPlan() {
  const lista = getLista(state.listaAtualId);
  if (!lista) return;
  document.getElementById('plan-count').textContent = lista.itens.length;
  const total = lista.itens.reduce((s, i) => s + (i.precoEst * i.qtd || 0), 0);
  document.getElementById('plan-total').textContent = formatReal(total);
}

// =====================
// TELA: COMPRA
// =====================

function mostrarCompra(id) {
  state.listaAtualId = id;
  const lista = getLista(id);
  lista.fase = 'compra';
  salvar();
  document.getElementById('compra-titulo').textContent = lista.nome;
  renderCompra();
  irParaTela('tela-compra');
}

function renderCompra() {
  const lista = getLista(state.listaAtualId);
  if (!lista) return;

  const pendentes = lista.itens.filter(i => !i.comprado);
  const feitos = lista.itens.filter(i => i.comprado);

  const ulPend = document.getElementById('compra-lista-pendente');
  const ulFeita = document.getElementById('compra-lista-feita');
  const sep = document.getElementById('compra-separador');
  ulPend.innerHTML = '';
  ulFeita.innerHTML = '';

  pendentes.forEach(item => ulPend.appendChild(criarItemCompra(item)));
  feitos.forEach(item => ulFeita.appendChild(criarItemCompra(item)));

  sep.classList.toggle('hidden', feitos.length === 0);

  // Stats — preço × quantidade real (ou planejada se não informada)
  const totalReal = lista.itens.reduce((s, i) => s + (i.precoReal ? i.precoReal * (i.qtdReal || i.qtd || 1) : 0), 0);
  const totalEst = lista.itens.reduce((s, i) => s + (i.precoEst * i.qtd || 0), 0);
  document.getElementById('compra-total-real').textContent = formatReal(totalReal);
  document.getElementById('compra-total-est').textContent = formatReal(totalEst);
  document.getElementById('compra-faltam').textContent = pendentes.length;

  const pct = lista.itens.length > 0 ? (feitos.length / lista.itens.length) * 100 : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-texto').textContent = `${feitos.length} / ${lista.itens.length} itens`;
}

function criarItemCompra(item) {
  const li = document.createElement('li');
  li.className = 'item-card' + (item.comprado ? ' comprado' : '');
  const qtdPlan = item.qtd ? `${item.qtd} ${item.unidade}` : '';
  const chips = [];
  if (qtdPlan) chips.push(`<span class="item-chip">${qtdPlan}</span>`);
  if (item.precoEst) chips.push(`<span class="item-chip preco-est">est. ${formatReal(item.precoEst)}/un</span>`);
  if (item.precoReal) chips.push(`<span class="item-chip preco-real">pago ${formatReal(item.precoReal)}</span>`);
  if (item.obs) chips.push(`<span class="item-chip obs">"${item.obs}"</span>`);
  const totalReal = item.precoReal ? formatReal(item.precoReal * (item.qtdReal || item.qtd || 1)) : '';

  li.innerHTML = `
    <button class="btn-check ${item.comprado ? 'checked' : ''}" data-id="${item.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <div class="item-card-body">
      <div class="item-nome">${item.nome}</div>
      <div class="item-detalhes">${chips.join('')}</div>
      ${totalReal ? `<div class="item-total">${totalReal}</div>` : ''}
    </div>
    <div class="item-acoes">
      <button class="btn-del-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  li.querySelector('.btn-check').addEventListener('click', () => {
    if (!item.comprado) {
      abrirModalPreco(item.id);
    } else {
      item.comprado = false;
      item.precoReal = null;
      item.qtdReal = null;
      salvar();
      renderCompra();
    }
  });

  li.querySelector('.btn-del-item').addEventListener('click', () => {
    const lista = getLista(state.listaAtualId);
    lista.itens = lista.itens.filter(i => i.id !== item.id);
    salvar();
    renderCompra();
  });

  return li;
}

// =====================
// MODAL PREÇO
// =====================

function abrirModalPreco(itemId) {
  state.itemModalId = itemId;
  const lista = getLista(state.listaAtualId);
  const item = getItem(state.listaAtualId, itemId);

  document.getElementById('modal-preco-nome').textContent = item.nome;
  document.getElementById('modal-preco-sub').textContent =
    item.qtd ? `Planejado: ${item.qtd} ${item.unidade}` : '';
  document.getElementById('modal-qtd-real').value = item.qtdReal || item.qtd || '';
  document.getElementById('modal-preco-input').value = item.precoReal || item.precoEst || '';
  document.getElementById('modal-unidade-label').textContent = item.unidade || 'un';

  document.getElementById('modal-preco').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-preco-input').focus(), 100);
}

function confirmarPreco() {
  const item = getItem(state.listaAtualId, state.itemModalId);
  if (!item) return;

  const qtdInput = parseFloat(document.getElementById('modal-qtd-real').value);
  const precoInput = parseFloat(document.getElementById('modal-preco-input').value);

  if (isNaN(precoInput) || precoInput < 0) {
    toast('Digite um preço válido');
    return;
  }

  item.qtdReal = isNaN(qtdInput) ? item.qtd : qtdInput;
  item.precoReal = precoInput;
  item.comprado = true;

  fecharModalPreco();
  salvar();
  renderCompra();
}

function fecharModalPreco() {
  document.getElementById('modal-preco').classList.add('hidden');
  state.itemModalId = null;
}

// =====================
// TELA: RESUMO
// =====================

function mostrarResumo(id) {
  const lista = getLista(id || state.listaAtualId);
  lista.fase = 'finalizado';
  salvar();

  document.getElementById('resumo-titulo-lista').textContent = lista.nome;
  const comprados = lista.itens.filter(i => i.comprado);
  const pendentes = lista.itens.filter(i => !i.comprado);
  const totalReal = comprados.reduce((s, i) => s + (i.precoReal * (i.qtdReal || i.qtd || 1) || 0), 0);
  const totalEst = lista.itens.reduce((s, i) => s + (i.precoEst * i.qtd || 0), 0);

  document.getElementById('resumo-total-real').textContent = formatReal(totalReal);
  document.getElementById('resumo-total-est').textContent = formatReal(totalEst);
  document.getElementById('resumo-comprados').textContent = comprados.length;
  document.getElementById('resumo-pendentes').textContent = pendentes.length;

  const wrap = document.getElementById('resumo-pendentes-lista');
  const ul = document.getElementById('resumo-pendentes-itens');
  ul.innerHTML = '';
  if (pendentes.length > 0) {
    wrap.classList.remove('hidden');
    pendentes.forEach(i => {
      const li = document.createElement('li');
      li.textContent = i.nome + (i.qtd ? ` (${i.qtd} ${i.unidade})` : '');
      ul.appendChild(li);
    });
  } else {
    wrap.classList.add('hidden');
  }

  irParaTela('tela-resumo');
}

// =====================
// NOVA LISTA (MODAL)
// =====================

const EMOJIS = ['🛒','🥩','🥦','🍕','🧴','💊','🏠','🐾','🍺','🎁'];

function abrirModalNovaLista() {
  document.getElementById('modal-nova-lista').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-nome-lista').focus(), 100);
}

function fecharModalNovaLista() {
  document.getElementById('modal-nova-lista').classList.add('hidden');
  document.getElementById('modal-nome-lista').value = '';
}

function criarLista(nome) {
  if (!nome.trim()) return;
  const lista = {
    id: gerarId(),
    nome: nome.trim(),
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    fase: 'planejamento',
    criadaEm: Date.now(),
    itens: [],
  };
  state.listas.push(lista);
  salvar();
  fecharModalNovaLista();
  mostrarPlanejamento(lista.id);
}

// =====================
// ADD ITEM
// =====================

function adicionarItem() {
  const nome = document.getElementById('input-nome').value.trim();
  if (!nome) { toast('Digite o nome do item'); return; }

  const qtd = parseFloat(document.getElementById('input-qtd').value) || null;
  const unidade = document.getElementById('input-unidade').value;
  const precoEst = parseFloat(document.getElementById('input-preco-est').value) || null;
  const obs = document.getElementById('input-obs').value.trim() || null;

  const lista = getLista(state.listaAtualId);
  lista.itens.push({ id: gerarId(), nome, qtd, unidade, precoEst, obs, comprado: false, precoReal: null, qtdReal: null });
  salvar();

  // Limpar campos
  document.getElementById('input-nome').value = '';
  document.getElementById('input-qtd').value = '';
  document.getElementById('input-preco-est').value = '';
  document.getElementById('input-obs').value = '';
  document.getElementById('input-nome').focus();

  renderPlanejamento();
}

// =====================
// UTILS
// =====================

function formatReal(v) {
  return 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 300);
  }, 2200);
}

// =====================
// EVENTS
// =====================

document.addEventListener('DOMContentLoaded', () => {
  carregar();
  renderListas();

  // === LISTAS ===
  document.getElementById('btn-nova-lista').addEventListener('click', abrirModalNovaLista);
  document.getElementById('btn-modal-cancelar').addEventListener('click', fecharModalNovaLista);
  document.getElementById('btn-modal-criar').addEventListener('click', () => {
    criarLista(document.getElementById('modal-nome-lista').value);
  });
  document.getElementById('modal-nome-lista').addEventListener('keydown', e => {
    if (e.key === 'Enter') criarLista(e.target.value);
  });
  document.getElementById('modal-nova-lista').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModalNovaLista();
  });

  // === PLANEJAMENTO ===
  document.getElementById('btn-back-listas').addEventListener('click', () => {
    irParaTela('tela-listas');
    renderListas();
  });
  document.getElementById('plan-titulo').addEventListener('input', (e) => {
    const lista = getLista(state.listaAtualId);
    if (lista) { lista.nome = e.target.textContent.trim(); salvar(); }
  });
  document.getElementById('btn-add-item').addEventListener('click', adicionarItem);
  document.getElementById('input-nome').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('input-qtd').focus();
  });
  document.getElementById('btn-iniciar-compra').addEventListener('click', () => {
    const lista = getLista(state.listaAtualId);
    if (!lista || lista.itens.length === 0) { toast('Adicione pelo menos um item'); return; }
    mostrarCompra(state.listaAtualId);
  });

  // === COMPRA ===
  document.getElementById('btn-back-plan').addEventListener('click', () => {
    mostrarPlanejamento(state.listaAtualId);
  });
  document.getElementById('btn-finalizar').addEventListener('click', () => {
    const lista = getLista(state.listaAtualId);
    if (!lista) return;
    const comprados = lista.itens.filter(i => i.comprado).length;
    if (comprados === 0) { toast('Marque pelo menos um item'); return; }
    mostrarResumo(state.listaAtualId);
  });

  // Adicionar item durante a compra
  function adicionarItemCompra() {
    const nome = document.getElementById('compra-input-nome').value.trim();
    if (!nome) return;
    const lista = getLista(state.listaAtualId);
    lista.itens.push({ id: gerarId(), nome, qtd: null, unidade: 'un', precoEst: null, obs: null, comprado: false, precoReal: null, qtdReal: null });
    salvar();
    document.getElementById('compra-input-nome').value = '';
    renderCompra();
    toast(`"${nome}" adicionado!`);
  }
  document.getElementById('btn-add-compra').addEventListener('click', adicionarItemCompra);
  document.getElementById('compra-input-nome').addEventListener('keydown', e => {
    if (e.key === 'Enter') adicionarItemCompra();
  });

  // === MODAL PREÇO ===
  document.getElementById('btn-preco-cancelar').addEventListener('click', fecharModalPreco);
  document.getElementById('btn-preco-confirmar').addEventListener('click', confirmarPreco);
  document.getElementById('modal-preco').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModalPreco();
  });
  document.getElementById('modal-preco-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmarPreco();
  });

  // === RESUMO ===
  document.getElementById('btn-nova-lista-resumo').addEventListener('click', () => {
    irParaTela('tela-listas');
    renderListas();
    setTimeout(abrirModalNovaLista, 300);
  });
  document.getElementById('btn-refazer').addEventListener('click', () => {
    const listaOriginal = getLista(state.listaAtualId);
    if (!listaOriginal) return;
    const novaLista = {
      id: gerarId(),
      nome: listaOriginal.nome + ' (cópia)',
      emoji: listaOriginal.emoji,
      fase: 'planejamento',
      criadaEm: Date.now(),
      itens: listaOriginal.itens.map(i => ({
        id: gerarId(),
        nome: i.nome,
        qtd: i.qtd,
        unidade: i.unidade,
        precoEst: i.precoReal || i.precoEst,
        obs: i.obs,
        comprado: false,
        precoReal: null,
        qtdReal: null,
      }))
    };
    state.listas.push(novaLista);
    salvar();
    mostrarPlanejamento(novaLista.id);
    toast('Lista copiada como template!');
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});
