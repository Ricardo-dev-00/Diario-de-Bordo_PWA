/* ============================================================
   Diario de Bordo - script.js
   1. Registrar o Service Worker
   2. Capturar beforeinstallprompt
   3. CRUD no localStorage
   4. Renderizar a interface com paginacao
============================================================ */

'use strict';

// -- 1. Service Worker -----------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(reg => console.log('[SW] Registrado com escopo:', reg.scope))
      .catch(err => console.error('[SW] Falha no registro:', err));
  });
}

// -- 2. Botao de instalacao ------------------------------------
let deferredPrompt = null;
const btnInstall = document.getElementById('btn-install');
const installStatus = document.getElementById('install-status');
const installDialog = document.getElementById('install-dialog');
const installOverlay = document.getElementById('install-overlay');
const btnInstallCancel = document.getElementById('btn-install-cancel');
const btnInstallConfirm = document.getElementById('btn-install-confirm');
const installDialogTitle = document.getElementById('install-dialog-title');
const installDialogText = document.getElementById('install-dialog-text');
let installStatusTimer = null;

// Garante o estado inicial correto mesmo com cache antigo ou restauracao de pagina.
installDialog.hidden = true;
installStatus.hidden = true;
btnInstall.hidden = true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.hidden = false;
  btnInstall.disabled = false;
  btnInstall.textContent = '⬇ Instalar App';
});

function showInstallStatus(message, tone, autoHideMs = 0) {
  if (installStatusTimer) {
    window.clearTimeout(installStatusTimer);
    installStatusTimer = null;
  }

  installStatus.textContent = message;
  installStatus.dataset.tone = tone;
  installStatus.hidden = false;

  if (autoHideMs > 0) {
    installStatusTimer = window.setTimeout(() => {
      hideInstallStatus();
    }, autoHideMs);
  }
}

function hideInstallStatus() {
  if (installStatusTimer) {
    window.clearTimeout(installStatusTimer);
    installStatusTimer = null;
  }

  installStatus.hidden = true;
  installStatus.textContent = '';
  delete installStatus.dataset.tone;
}

function openInstallDialog() {
  hideInstallStatus();
  if (deferredPrompt) {
    installDialogTitle.textContent = 'Instalar Diario de Bordo';
    installDialogText.textContent = 'O navegador vai abrir a confirmacao de instalacao. Depois disso, o app podera ser usado direto da tela inicial.';
    btnInstallConfirm.hidden = false;
  } else {
    installDialogTitle.textContent = 'Instalacao indisponivel agora';
    installDialogText.textContent = 'O navegador nao liberou a instalacao neste momento. Atualize a pagina ou abra o menu do navegador e procure por Instalar aplicativo.';
    btnInstallConfirm.hidden = true;
  }
  installDialog.hidden = false;
}

function closeInstallDialog() {
  installDialog.hidden = true;
}

async function triggerInstallPrompt() {
  if (!deferredPrompt) {
    openInstallDialog();
    return;
  }

  closeInstallDialog();
  btnInstall.disabled = true;
  btnInstall.textContent = 'Aguardando...';

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] Resultado da instalacao:', outcome);

  deferredPrompt = null;
  btnInstall.hidden = true;
  btnInstall.disabled = false;
  btnInstall.textContent = '⬇ Instalar App';

  if (outcome === 'accepted') {
    showInstallStatus('Instalacao iniciada. Se o navegador pedir confirmacao final, conclua para adicionar o app a tela inicial.', 'success');
  } else {
    showInstallStatus('Instalacao cancelada. Quando quiser, tente novamente pelo navegador.', 'info', 5000);
  }
}

btnInstall.addEventListener('click', openInstallDialog);
btnInstallCancel.addEventListener('click', closeInstallDialog);
btnInstallConfirm.addEventListener('click', triggerInstallPrompt);
installOverlay.addEventListener('click', closeInstallDialog);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !installDialog.hidden) {
    closeInstallDialog();
  }
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  btnInstall.hidden = true;
  closeInstallDialog();
  showInstallStatus('Diario de Bordo instalado com sucesso. Agora ele pode ser aberto como aplicativo.', 'success');
});

// -- 3. Persistencia - localStorage ----------------------------
const STORAGE_KEY = 'diario-de-bordo:entries';
const THEME_STORAGE_KEY = 'diario-de-bordo:theme';

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function addEntry(entry) {
  const entries = getEntries();
  entries.unshift(entry);
  saveEntries(entries);
}

function removeEntry(id) {
  saveEntries(getEntries().filter(e => e.id !== id));
}

function updateEntry(id, fields) {
  saveEntries(
    getEntries().map(e => e.id === id ? { ...e, ...fields, updatedAt: new Date().toISOString() } : e)
  );
}

// -- 4. Referencias ao DOM -------------------------------------
const form             = document.getElementById('form-entry');
const inputTitle       = document.getElementById('input-title');
const inputDate        = document.getElementById('input-date');
const inputDescription = document.getElementById('input-description');
const entriesList      = document.getElementById('entries-list');
const entriesCount     = document.getElementById('entries-count');
const formError        = document.getElementById('form-error');
const formHeading      = document.getElementById('form-heading');
const btnSubmit        = document.getElementById('btn-submit');
const btnCancelEdit    = document.getElementById('btn-cancel-edit');
const btnTheme         = document.getElementById('btn-theme');
const themeMeta        = document.querySelector('meta[name="theme-color"]');

inputDate.value = new Date().toISOString().split('T')[0];

// -- Tema claro / escuro --------------------------------------
function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeButton(theme) {
  if (theme === 'dark') {
    btnTheme.textContent = '☀️ Modo claro';
    btnTheme.setAttribute('aria-label', 'Ativar modo claro');
  } else {
    btnTheme.textContent = '🌙 Modo escuro';
    btnTheme.setAttribute('aria-label', 'Ativar modo escuro');
  }
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateThemeButton(theme);
  if (themeMeta) {
    themeMeta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#1a1a2e');
  }
}

btnTheme.addEventListener('click', () => {
  const nextTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});

applyTheme(getPreferredTheme());

// -- Estado de edicao / paginacao ------------------------------
let editingId   = null;
const PAGE_SIZE  = 5;
let visibleCount = PAGE_SIZE;

function enterEditMode(entry) {
  editingId              = entry.id;
  inputTitle.value       = entry.title;
  inputDate.value        = entry.date;
  inputDescription.value = entry.description;
  formHeading.textContent = String.fromCodePoint(0x270F, 0xFE0F) + ' Editar Entrada';
  btnSubmit.textContent   = 'Salvar Alteracoes';
  btnCancelEdit.hidden    = false;
  clearError();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  inputTitle.focus();
}

function exitEditMode() {
  editingId              = null;
  inputTitle.value       = '';
  inputDate.value        = new Date().toISOString().split('T')[0];
  inputDescription.value = '';
  formHeading.textContent = 'Nova Entrada';
  btnSubmit.textContent   = '\uFF0B Adicionar Entrada';
  btnCancelEdit.hidden    = true;
  clearError();
}

btnCancelEdit.addEventListener('click', exitEditMode);

// -- 5. Utilitarios --------------------------------------------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(text)));
  return div.innerHTML;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return d + '/' + m + '/' + y;
}

// -- 6. Ordenacao por proximidade de data ----------------------
function sortByProximity(entries) {
  const todayStr = new Date().toISOString().split('T')[0];
  return [...entries].sort((a, b) => {
    const aFuture = a.date >= todayStr;
    const bFuture = b.date >= todayStr;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    if (aFuture) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
  });
}

function dateLabel(dateStr) {
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Hoje';
  const msPerDay = 86400000;
  const diff = Math.round(
    (new Date(dateStr + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / msPerDay
  );
  if (diff === 1)  return 'Amanha';
  if (diff === -1) return 'Ontem';
  if (diff > 1)    return 'Em ' + diff + ' dias';
  return 'Ha ' + Math.abs(diff) + ' dias';
}

// -- 7. Renderizacao com paginacao -----------------------------
function buildCardHtml(entry) {
  const todayStr   = new Date().toISOString().split('T')[0];
  const isPast     = entry.date < todayStr;
  const isToday    = entry.date === todayStr;
  const badgeClass = isToday ? 'badge--today' : isPast ? 'badge--past' : 'badge--future';
  const editing    = editingId === entry.id ? ' entry-card--editing' : '';
  return '<article class="entry-card' + editing + '" data-id="' + escapeHtml(entry.id) + '">'
    + '<div class="entry-header">'
    +   '<h3 class="entry-title">' + escapeHtml(entry.title) + '</h3>'
    +   '<div class="entry-date-group">'
    +     '<time class="entry-date" datetime="' + escapeHtml(entry.date) + '">' + formatDate(entry.date) + '</time>'
    +     '<span class="entry-badge ' + badgeClass + '">' + dateLabel(entry.date) + '</span>'
    +   '</div>'
    + '</div>'
    + '<p class="entry-description">' + escapeHtml(entry.description) + '</p>'
    + '<div class="entry-actions">'
    +   '<button class="btn-edit" data-id="' + escapeHtml(entry.id) + '" aria-label="Editar: ' + escapeHtml(entry.title) + '">\u270F\uFE0F Editar</button>'
    +   '<button class="btn-delete" data-id="' + escapeHtml(entry.id) + '" aria-label="Remover: ' + escapeHtml(entry.title) + '">\uD83D\uDDD1 Remover</button>'
    + '</div>'
    + '</article>';
}

function renderEntries() {
  const entries = sortByProximity(getEntries());
  const total   = entries.length;

  entriesCount.textContent = total > 0 ? '(' + total + ')' : '';

  if (total === 0) {
    entriesList.innerHTML = '<p class="empty-message">Nenhuma entrada registrada ainda.</p>';
    return;
  }

  if (visibleCount > total) visibleCount = total;

  const visible     = entries.slice(0, visibleCount);
  const hidden      = total - visibleCount;
  const hasMore     = hidden > 0;
  const canCollapse = visibleCount > PAGE_SIZE;
  const nextBatch   = Math.min(hidden, PAGE_SIZE);

  let footerHtml = '';
  if (hasMore) {
    footerHtml = '<div class="pagination-bar">'
      + '<span class="pagination-info">' + visibleCount + ' de ' + total + ' registros</span>'
      + '<button class="btn-show-more" id="btn-show-more">Ver mais ' + nextBatch + ' registro' + (nextBatch !== 1 ? 's' : '') + ' \u25BC</button>'
      + '</div>';
  } else if (canCollapse) {
    footerHtml = '<div class="pagination-bar">'
      + '<span class="pagination-info">' + total + ' de ' + total + ' exibidos</span>'
      + '<button class="btn-show-less" id="btn-show-less">Ver menos \u25B2</button>'
      + '</div>';
  }

  entriesList.innerHTML = visible.map(buildCardHtml).join('') + footerHtml;

  document.getElementById('btn-show-more')?.addEventListener('click', () => {
    visibleCount = Math.min(visibleCount + PAGE_SIZE, total);
    renderEntries();
  });

  document.getElementById('btn-show-less')?.addEventListener('click', () => {
    visibleCount = PAGE_SIZE;
    renderEntries();
    entriesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// -- 8. Validacao e envio do formulario ------------------------
function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = '';
  formError.hidden = true;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  const title       = inputTitle.value.trim();
  const date        = inputDate.value;
  const description = inputDescription.value.trim();

  if (!title)       return showError('O titulo e obrigatorio.');
  if (!date)        return showError('A data e obrigatoria.');
  if (!description) return showError('A descricao e obrigatoria.');

  if (editingId) {
    updateEntry(editingId, { title, date, description });
    exitEditMode();
  } else {
    addEntry({
      id:        String(Date.now()),
      title,
      date,
      description,
      createdAt: new Date().toISOString(),
    });
    visibleCount = PAGE_SIZE; // volta para a primeira pagina ao adicionar
    inputTitle.value       = '';
    inputDescription.value = '';
    inputTitle.focus();
  }

  renderEntries();
});

// -- 9. Acoes nos cards via delegacao --------------------------
entriesList.addEventListener('click', (e) => {
  const btnDel = e.target.closest('.btn-delete');
  if (btnDel) {
    const { id } = btnDel.dataset;
    const card   = btnDel.closest('.entry-card');
    const name   = card?.querySelector('.entry-title')?.textContent ?? 'esta entrada';
    if (window.confirm('Deseja remover "' + name + '"?')) {
      if (editingId === id) exitEditMode();
      removeEntry(id);
      if (visibleCount > PAGE_SIZE) visibleCount = Math.max(PAGE_SIZE, visibleCount - 1);
      renderEntries();
    }
    return;
  }

  const btnEdit = e.target.closest('.btn-edit');
  if (btnEdit) {
    const { id } = btnEdit.dataset;
    const entry  = getEntries().find(en => en.id === id);
    if (entry) enterEditMode(entry);
  }
});

// -- 10. Inicializacao -----------------------------------------
renderEntries();