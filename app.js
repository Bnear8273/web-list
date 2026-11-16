(() => {
  'use strict';

  const STORAGE_KEY = 'what-to-eat.dishes.v1';
  const MAX_NAME_LENGTH = 24;
  const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  const ICONS = {
    edit: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m14.8 5.2 4 4M5 19l3.7-.8L19 7.9a1.4 1.4 0 0 0 0-2L18.1 5a1.4 1.4 0 0 0-2 0L5.8 15.3 5 19Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    delete: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.5 7.5h13M9.5 7.5V5.8c0-.7.5-1.3 1.2-1.3h2.6c.7 0 1.2.6 1.2 1.3v1.7M8 7.5l.7 10c0 .8.7 1.5 1.6 1.5h4.4c.9 0 1.6-.7 1.6-1.5l.7-10M10.2 11v4.4M13.8 11v4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    check: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m5.5 12.5 4.2 4.2 8.8-9.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    close: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `,
  };

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    saveIndicator: $('#saveIndicator'),
    saveText: $('#saveText'),
    todayLabel: $('#todayLabel'),
    randomButton: $('#randomButton'),
    randomButtonText: $('#randomButtonText'),
    randomHint: $('#randomHint'),
    resultStage: $('#resultStage'),
    stageLabel: $('#stageLabel'),
    stagePlaceholder: $('#stagePlaceholder'),
    stageName: $('#stageName'),
    selectionAnnouncement: $('#selectionAnnouncement'),
    dishCount: $('#dishCount'),
    addForm: $('#addForm'),
    dishInput: $('#dishInput'),
    formMessage: $('#formMessage'),
    dishList: $('#dishList'),
    listScroll: $('#listScroll'),
    emptyState: $('#emptyState'),
    copyButton: $('#copyButton'),
    pasteButton: $('#pasteButton'),
    pasteDialog: $('#pasteDialog'),
    pasteDialogTitle: $('#pasteDialogTitle'),
    pasteDialogDesc: $('#pasteDialogDesc'),
    pastePreview: $('#pastePreview'),
    pasteCancel: $('#pasteCancel'),
    pasteReplace: $('#pasteReplace'),
    pasteAppend: $('#pasteAppend'),
    toastRegion: $('#toastRegion'),
  };

  const state = {
    dishes: [],
    editingId: null,
    deleteConfirmId: null,
    lastPickedId: null,
    rolling: false,
    rollTimer: null,
    pickToken: 0,
    storageAvailable: true,
    loadMessage: '',
    pendingPaste: null,
  };

  function createId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (error) {
      // Use a simple fallback when crypto is unavailable.
    }
    return `dish-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });
  }

  function cleanName(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function nameKey(value) {
    return cleanName(value).toLocaleLowerCase('zh-CN');
  }

  function randomIndex(length) {
    if (length <= 0) {
      return 0;
    }
    try {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % length;
    } catch (error) {
      return Math.floor(Math.random() * length);
    }
  }

  function normalizeDish(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    const name = cleanName(raw.name).slice(0, MAX_NAME_LENGTH);
    if (!name) {
      return null;
    }
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
      name,
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
    };
  }

  function loadDishes() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      state.storageAvailable = false;
      state.loadMessage = '浏览器禁用了本地存储，菜单改动将无法保存。';
      return [];
    }

    if (raw === null) {
      try {
        window.localStorage.setItem(STORAGE_KEY, '[]');
      } catch (error) {
        state.storageAvailable = false;
        state.loadMessage = '浏览器禁用了本地存储，菜单改动将无法保存。';
      }
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid menu data');
      }

      const usedIds = new Set();
      return parsed
        .map(normalizeDish)
        .filter(Boolean)
        .map((dish) => {
          if (usedIds.has(dish.id)) {
            dish.id = createId();
          }
          usedIds.add(dish.id);
          return dish;
        });
    } catch (error) {
      state.loadMessage = '本地菜单读取失败，已从空菜单开始。';
      return [];
    }
  }

  function setSaveStatus(type, message) {
    elements.saveIndicator.classList.toggle('is-error', type === 'error');
    elements.saveText.textContent = message;
  }

  function showFormMessage(message) {
    elements.formMessage.textContent = message;
    elements.formMessage.hidden = !message;
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' is-error' : ''}`;
    toast.textContent = message;
    elements.toastRegion.append(toast);

    while (elements.toastRegion.children.length > 3) {
      elements.toastRegion.firstElementChild.remove();
    }

    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 240);
    }, 3000);
  }

  function clearFormMessage() {
    elements.formMessage.textContent = '';
    elements.formMessage.hidden = true;
  }

  function markAddInputInvalid(message) {
    elements.dishInput.setAttribute('aria-invalid', 'true');
    elements.dishInput.focus();
    showFormMessage(message);
  }

  function saveDishes() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dishes));
      state.storageAvailable = true;
      setSaveStatus('saved', '已保存到本地');
      clearFormMessage();
      return true;
    } catch (error) {
      state.storageAvailable = false;
      setSaveStatus('error', '本地保存失败');
      showFormMessage('改动暂时无法保存，请检查浏览器的存储设置。');
      return false;
    }
  }

  function updateDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    elements.todayLabel.dateTime = [
      year,
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
    ].join('-');
    elements.todayLabel.textContent = `${month}月${day}日 · ${WEEKDAYS[now.getDay()]}`;
  }

  function setStageName(name) {
    elements.stageName.textContent = name;
    elements.stageName.classList.toggle('is-long', [...name].length > 8);
  }

  function getDish(id) {
    return state.dishes.find((dish) => dish.id === id) || null;
  }

  function randomButtonHint() {
    const count = state.dishes.length;
    if (count === 0) {
      return '先添加几道菜，再来抽选';
    }
    if (count === 1) {
      return state.lastPickedId ? '菜单里只有这一道，就是它啦' : '菜单里只有这一道，抽到就是它';
    }
    return state.lastPickedId ? '不满意？再抽一次，不会连续重复' : `菜单里有 ${count} 道菜，交给运气决定`;
  }

  function updateRandomAvailability() {
    const count = state.dishes.length;
    elements.randomButton.disabled = count === 0 || state.rolling;
    elements.randomButtonText.textContent = state.rolling
      ? '正在挑选…'
      : state.lastPickedId
        ? '换一道'
        : '帮我选一道';
    if (!state.rolling) {
      elements.randomHint.textContent = randomButtonHint();
    }
  }

  function updateCounts() {
    const count = state.dishes.length;
    elements.dishCount.textContent = `${count} 道菜`;
    elements.copyButton.disabled = count === 0;
    elements.emptyState.hidden = count > 0;
    elements.dishList.hidden = count === 0;
  }

  function rowMarkup(dish, index) {
    const isPicked = state.lastPickedId === dish.id;
    const rowNumber = String(index + 1).padStart(2, '0');

    if (state.editingId === dish.id) {
      return `
        <li class="dish-row is-editing" data-id="${escapeHTML(dish.id)}">
          <span class="row-number" aria-hidden="true">${rowNumber}</span>
          <form class="edit-form" data-edit-form data-id="${escapeHTML(dish.id)}" novalidate>
            <label class="sr-only" for="edit-${escapeHTML(dish.id)}">修改「${escapeHTML(dish.name)}」的菜名</label>
            <input
              class="edit-input"
              id="edit-${escapeHTML(dish.id)}"
              type="text"
              value="${escapeHTML(dish.name)}"
              maxlength="${MAX_NAME_LENGTH}"
              autocomplete="off"
              spellcheck="false"
              required
            >
            <span class="edit-actions">
              <button type="submit" class="mini-action is-save" aria-label="保存修改" title="保存修改">${ICONS.check}</button>
              <button type="button" class="mini-action is-cancel" data-action="cancel-edit" aria-label="取消修改" title="取消修改">${ICONS.close}</button>
            </span>
          </form>
        </li>
      `;
    }

    if (state.deleteConfirmId === dish.id) {
      return `
        <li class="dish-row is-confirming" data-id="${escapeHTML(dish.id)}">
          <span class="row-number" aria-hidden="true">${rowNumber}</span>
          <span class="confirm-copy">删除 <strong>「${escapeHTML(dish.name)}」</strong>？</span>
          <span class="confirm-actions">
            <button type="button" class="text-action is-danger" data-action="confirm-delete">删除</button>
            <button type="button" class="text-action" data-action="cancel-delete">取消</button>
          </span>
        </li>
      `;
    }

    return `
      <li class="dish-row${isPicked ? ' is-picked' : ''}" data-id="${escapeHTML(dish.id)}">
        <span class="row-number" aria-hidden="true">${rowNumber}</span>
        <span class="dish-name">${escapeHTML(dish.name)}</span>
        ${isPicked ? '<span class="picked-tag">已选</span>' : ''}
        <span class="row-actions">
          <button type="button" class="row-action" data-action="edit" aria-label="修改「${escapeHTML(dish.name)}」" title="修改">${ICONS.edit}</button>
          <button type="button" class="row-action is-delete" data-action="delete" aria-label="删除「${escapeHTML(dish.name)}」" title="删除">${ICONS.delete}</button>
        </span>
      </li>
    `;
  }

  function renderList({ manageFocus = true } = {}) {
    updateCounts();
    elements.dishList.innerHTML = state.dishes.map(rowMarkup).join('');

    if (!manageFocus) {
      return;
    }

    if (state.editingId) {
      window.requestAnimationFrame(() => {
        const input = elements.dishList.querySelector(`[data-id="${cssEscape(state.editingId)}"] .edit-input`);
        if (input) {
          input.focus();
          input.select();
        }
      });
    } else if (state.deleteConfirmId) {
      window.requestAnimationFrame(() => {
        const button = elements.dishList.querySelector(`[data-id="${cssEscape(state.deleteConfirmId)}"] [data-action="confirm-delete"]`);
        button?.focus();
      });
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function render() {
    renderList();
    updateRandomAvailability();
  }

  function resetPicker() {
    state.pickToken += 1;
    if (state.rollTimer) {
      window.clearInterval(state.rollTimer);
      state.rollTimer = null;
    }
    state.rolling = false;
    state.lastPickedId = null;
    elements.stagePlaceholder.hidden = false;
    elements.stageName.hidden = true;
    elements.stageName.textContent = '';
    elements.stageName.classList.remove('is-long');
    elements.stageLabel.textContent = '今日之选';
    elements.resultStage.classList.remove('is-rolling', 'is-revealed');
    elements.randomButton.classList.remove('is-picking');
    elements.selectionAnnouncement.textContent = '';
    updateRandomAvailability();
  }

  function syncPickedName() {
    if (!state.lastPickedId) {
      return;
    }
    const picked = getDish(state.lastPickedId);
    if (!picked) {
      resetPicker();
      return;
    }
    setStageName(picked.name);
  }

  function chooseDish() {
    const candidates = state.dishes.length > 1 && state.lastPickedId
      ? state.dishes.filter((dish) => dish.id !== state.lastPickedId)
      : state.dishes;
    if (!candidates.length) {
      return null;
    }
    return candidates[randomIndex(candidates.length)];
  }

  function finishRandomPick(token) {
    if (token !== state.pickToken) {
      return;
    }
    if (state.rollTimer) {
      window.clearInterval(state.rollTimer);
      state.rollTimer = null;
    }

    if (!state.dishes.length) {
      resetPicker();
      renderList();
      return;
    }

    const picked = chooseDish();
    if (!picked) {
      resetPicker();
      renderList();
      return;
    }

    state.rolling = false;
    state.lastPickedId = picked.id;
    elements.resultStage.classList.remove('is-rolling');
    elements.resultStage.classList.add('is-revealed');
    elements.stageLabel.textContent = '今天就吃';
    setStageName(picked.name);
    elements.randomButton.classList.remove('is-picking');
    elements.selectionAnnouncement.textContent = `今天就吃${picked.name}`;
    updateRandomAvailability();
    renderList({ manageFocus: false });
    scrollPickedRowIntoView(picked.id);
  }

  function scrollPickedRowIntoView(id) {
    window.requestAnimationFrame(() => {
      const row = [...elements.dishList.querySelectorAll('.dish-row')]
        .find((item) => item.dataset.id === id);
      if (!row) {
        return;
      }
      const rowTop = row.offsetTop;
      const rowBottom = rowTop + row.offsetHeight;
      const visibleTop = elements.listScroll.scrollTop;
      const visibleBottom = visibleTop + elements.listScroll.clientHeight;
      if (rowTop < visibleTop || rowBottom > visibleBottom) {
        elements.listScroll.scrollTo({
          top: Math.max(0, rowTop - elements.listScroll.clientHeight / 2 + row.offsetHeight / 2),
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      }
    });
  }

  function startRandomPick() {
    if (state.rolling || state.dishes.length === 0) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const token = state.pickToken + 1;
    state.pickToken = token;
    state.rolling = true;
    elements.resultStage.classList.remove('is-revealed');
    elements.resultStage.classList.add('is-rolling');
    elements.stagePlaceholder.hidden = true;
    elements.stageName.hidden = false;
    elements.stageLabel.textContent = '正在挑选';
    elements.randomButton.classList.add('is-picking');
    elements.randomButton.disabled = true;
    elements.randomButtonText.textContent = '正在挑选…';
    elements.randomHint.textContent = '让运气替你决定';
    elements.selectionAnnouncement.textContent = '';

    const showRollingDish = () => {
      if (!state.dishes.length) {
        return;
      }
      const dish = state.dishes[randomIndex(state.dishes.length)];
      setStageName(dish.name);
    };

    if (reduceMotion) {
      window.setTimeout(() => finishRandomPick(token), 0);
      return;
    }

    showRollingDish();
    state.rollTimer = window.setInterval(showRollingDish, 70);
    window.setTimeout(() => finishRandomPick(token), 850);
  }

  function cancelRowStates() {
    state.editingId = null;
    state.deleteConfirmId = null;
  }

  function handleAddDish(event) {
    event.preventDefault();
    const name = cleanName(elements.dishInput.value);

    if (!name) {
      markAddInputInvalid('先写下一道菜名吧。');
      return;
    }

    if ([...name].length > MAX_NAME_LENGTH) {
      markAddInputInvalid(`菜名不能超过 ${MAX_NAME_LENGTH} 个字。`);
      return;
    }

    if (state.dishes.some((dish) => nameKey(dish.name) === nameKey(name))) {
      markAddInputInvalid(`「${name}」已经在菜单里啦。`);
      return;
    }

    cancelRowStates();
    state.dishes.push({
      id: createId(),
      name,
      createdAt: Date.now(),
    });
    clearFormMessage();
    elements.dishInput.removeAttribute('aria-invalid');
    saveDishes();
    render();
    elements.dishInput.value = '';
    elements.dishInput.focus();

    window.requestAnimationFrame(() => {
      elements.listScroll.scrollTop = elements.listScroll.scrollHeight;
    });
  }

  function startEditing(id) {
    if (!getDish(id)) {
      return;
    }
    state.editingId = id;
    state.deleteConfirmId = null;
    clearFormMessage();
    renderList();
  }

  function cancelEditing() {
    const previousId = state.editingId;
    state.editingId = null;
    renderList({ manageFocus: false });
    focusRowAction(previousId, 'edit');
  }

  function handleEditSubmit(event) {
    const form = event.target.closest('[data-edit-form]');
    if (!form) {
      return;
    }
    event.preventDefault();

    const id = form.dataset.id;
    const dish = getDish(id);
    const input = form.querySelector('.edit-input');
    if (!dish || !input) {
      return;
    }

    const name = cleanName(input.value);
    if (!name) {
      input.setCustomValidity('菜名不能为空。');
      input.reportValidity();
      input.focus();
      return;
    }
    if ([...name].length > MAX_NAME_LENGTH) {
      input.setCustomValidity(`菜名不能超过 ${MAX_NAME_LENGTH} 个字。`);
      input.reportValidity();
      input.focus();
      return;
    }
    if (state.dishes.some((item) => item.id !== id && nameKey(item.name) === nameKey(name))) {
      input.setCustomValidity('菜单里已经有同名的菜了。');
      input.reportValidity();
      input.focus();
      return;
    }

    input.setCustomValidity('');
    dish.name = name;
    state.editingId = null;
    saveDishes();
    syncPickedName();
    renderList({ manageFocus: false });
    focusRowAction(id, 'edit');
  }

  function startDeleteConfirmation(id) {
    if (!getDish(id)) {
      return;
    }
    state.deleteConfirmId = id;
    state.editingId = null;
    clearFormMessage();
    renderList();
  }

  function cancelDeleteConfirmation() {
    const previousId = state.deleteConfirmId;
    state.deleteConfirmId = null;
    renderList({ manageFocus: false });
    focusRowAction(previousId, 'delete');
  }

  function confirmDelete() {
    const id = state.deleteConfirmId;
    if (!id) {
      return;
    }
    const removedDish = getDish(id);
    state.dishes = state.dishes.filter((dish) => dish.id !== id);
    state.deleteConfirmId = null;
    state.editingId = null;

    if (state.lastPickedId === id) {
      resetPicker();
    }

    saveDishes();
    render();
    elements.dishInput.focus();
    if (removedDish) {
      elements.selectionAnnouncement.textContent = `已删除${removedDish.name}`;
    }
  }

  function focusRowAction(id, action) {
    if (!id) {
      elements.dishInput?.focus();
      return;
    }
    window.requestAnimationFrame(() => {
      const button = elements.dishList.querySelector(
        `[data-id="${cssEscape(id)}"] [data-action="${action}"]`,
      );
      if (button) {
        button.focus();
      } else {
        elements.dishInput.focus();
      }
    });
  }

  function handleListClick(event) {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) {
      return;
    }
    const row = actionButton.closest('.dish-row');
    if (!row) {
      return;
    }
    const id = row.dataset.id;

    switch (actionButton.dataset.action) {
      case 'edit':
        startEditing(id);
        break;
      case 'delete':
        startDeleteConfirmation(id);
        break;
      case 'cancel-edit':
        cancelEditing();
        break;
      case 'confirm-delete':
        confirmDelete();
        break;
      case 'cancel-delete':
        cancelDeleteConfirmation();
        break;
      default:
        break;
    }
  }

  function copyTextFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }

  async function copyMenuToClipboard() {
    if (!state.dishes.length) {
      return;
    }

    const text = state.dishes.map((dish) => dish.name).join('\n');
    let copied = false;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (error) {
      copied = false;
    }

    if (!copied) {
      copied = copyTextFallback(text);
    }

    if (copied) {
      showToast(`已复制 ${state.dishes.length} 道菜`);
    } else {
      showToast('复制失败，请允许浏览器访问剪贴板后重试。', 'error');
    }
  }

  function parseClipboardMenu(text) {
    const content = String(text ?? '').trim();
    if (!content) {
      throw new Error('剪贴板里没有菜单内容。');
    }

    let rawDishes;
    if (content.startsWith('[') || content.startsWith('{')) {
      let payload;
      try {
        payload = JSON.parse(content);
      } catch (error) {
        throw new Error('剪贴板里的 JSON 格式不正确。');
      }
      rawDishes = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray(payload.dishes)
          ? payload.dishes
          : null;
      if (!rawDishes) {
        throw new Error('没有找到可导入的菜品数据。');
      }
    } else {
      rawDishes = content.split(/\r?\n/);
    }

    const dishes = [];
    const usedNames = new Set();

    rawDishes.forEach((entry) => {
      const rawName = typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object'
          ? entry.name
          : '';
      const name = cleanName(rawName);
      if (!name || [...name].length > MAX_NAME_LENGTH) {
        return;
      }
      const key = nameKey(name);
      if (usedNames.has(key)) {
        return;
      }
      usedNames.add(key);
      dishes.push({
        id: createId(),
        name,
        createdAt: entry && typeof entry === 'object' && Number.isFinite(Number(entry.createdAt))
          ? Number(entry.createdAt)
          : Date.now(),
      });
    });

    if (dishes.length === 0) {
      throw new Error('没有找到有效的菜名。');
    }

    return {
      dishes,
      skipped: rawDishes.length - dishes.length,
    };
  }

  async function readMenuClipboard() {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        return await navigator.clipboard.readText();
      }
    } catch (error) {
      // Fall back to a manual paste box when the browser denies clipboard access.
    }

    return window.prompt('无法直接读取剪贴板，请把菜单粘贴到这里（每行一道菜）：', '');
  }

  function askPasteMode(dishes) {
    return new Promise((resolve) => {
      state.pendingPaste = resolve;
      const previewNames = dishes.slice(0, 8).map((dish) => dish.name);
      const extraCount = dishes.length - previewNames.length;
      elements.pasteDialogTitle.textContent = `导入 ${dishes.length} 道菜`;
      elements.pasteDialogDesc.textContent = `当前菜单已有 ${state.dishes.length} 道菜。追加会保留现有菜品并自动去重，覆盖会替换全部菜品。`;
      elements.pastePreview.textContent = `${previewNames.join('、')}${extraCount > 0 ? ` 等 ${dishes.length} 道` : ''}`;

      if (!elements.pasteDialog.open) {
        elements.pasteDialog.showModal();
      }

      window.requestAnimationFrame(() => elements.pasteAppend.focus());
    });
  }

  function settlePasteDialog(mode) {
    const resolve = state.pendingPaste;
    state.pendingPaste = null;
    if (elements.pasteDialog.open) {
      elements.pasteDialog.close();
    }
    resolve?.(mode);
  }

  async function pasteMenuFromClipboard() {
    const text = await readMenuClipboard();
    if (text === null) {
      return;
    }

    try {
      const { dishes, skipped } = parseClipboardMenu(text);
      let mode = 'replace';
      if (state.dishes.length > 0) {
        mode = await askPasteMode(dishes);
        if (!mode) {
          return;
        }
      }

      const existingNames = new Set(state.dishes.map((dish) => nameKey(dish.name)));
      const appendedDishes = mode === 'append'
        ? dishes.filter((dish) => !existingNames.has(nameKey(dish.name)))
        : dishes;
      const nextDishes = mode === 'append' ? [...state.dishes, ...appendedDishes] : dishes;
      const existingDuplicates = mode === 'append' ? dishes.length - appendedDishes.length : 0;
      const skippedTotal = skipped + existingDuplicates;

      state.dishes = nextDishes;
      cancelRowStates();
      resetPicker();
      const saved = saveDishes();
      render();
      elements.listScroll.scrollTop = 0;
      const skippedMessage = skippedTotal > 0 ? `，跳过 ${skippedTotal} 条重复或无效内容` : '';

      if (!saved) {
        showToast('菜单已更新，但无法保存到本地存储。', 'error');
      } else if (mode === 'append' && appendedDishes.length === 0) {
        showToast('没有新增菜品，粘贴内容都已存在。');
      } else if (mode === 'append') {
        showToast(`已追加 ${appendedDishes.length} 道菜${skippedMessage}`);
      } else {
        showToast(`已覆盖菜单，共 ${dishes.length} 道菜${skippedMessage}`);
      }
    } catch (error) {
      showToast(error.message || '粘贴失败，请检查剪贴板内容。', 'error');
    }
  }

  function bindEvents() {
    elements.addForm.addEventListener('submit', handleAddDish);
    elements.dishInput.addEventListener('input', () => {
      elements.dishInput.removeAttribute('aria-invalid');
      clearFormMessage();
    });

    elements.dishList.addEventListener('click', handleListClick);
    elements.dishList.addEventListener('submit', handleEditSubmit);
    elements.dishList.addEventListener('input', (event) => {
      if (event.target.matches('.edit-input')) {
        event.target.setCustomValidity('');
      }
    });

    elements.randomButton.addEventListener('click', startRandomPick);
    elements.copyButton.addEventListener('click', copyMenuToClipboard);
    elements.pasteButton.addEventListener('click', pasteMenuFromClipboard);

    elements.pasteCancel.addEventListener('click', () => settlePasteDialog(null));
    elements.pasteReplace.addEventListener('click', () => settlePasteDialog('replace'));
    elements.pasteAppend.addEventListener('click', () => settlePasteDialog('append'));
    elements.pasteDialog.addEventListener('click', (event) => {
      if (event.target === elements.pasteDialog) {
        settlePasteDialog(null);
      }
    });
    elements.pasteDialog.addEventListener('close', () => {
      if (state.pendingPaste) {
        const resolve = state.pendingPaste;
        state.pendingPaste = null;
        resolve(null);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (state.editingId) {
        cancelEditing();
      } else if (state.deleteConfirmId) {
        cancelDeleteConfirmation();
      }
    });
  }

  function init() {
    updateDate();
    state.dishes = loadDishes();
    bindEvents();
    resetPicker();
    render();
    updateRandomAvailability();

    if (state.loadMessage) {
      setSaveStatus('error', '本地数据读取异常');
      showFormMessage(state.loadMessage);
    } else if (state.storageAvailable) {
      setSaveStatus('saved', '已保存到本地');
    } else {
      setSaveStatus('error', '本地存储不可用');
    }
  }

  init();
})();
