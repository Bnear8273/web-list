(() => {
  'use strict';

  const STORAGE_KEY = 'random-picker.lists.v1';
  const LEGACY_STORAGE_KEY = 'random-picker.items.v1';
  const LEGACY_FOOD_KEY = 'what-to-eat.dishes.v1';
  const MAX_NAME_LENGTH = 24;
  const MAX_LIST_NAME_LENGTH = 12;
  const MAX_LISTS = 12;
  const DEFAULT_LIST_NAME = '我的清单';
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
    eye: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3.5 12s3.2-5.2 8.5-5.2 8.5 5.2 8.5 5.2-3.2 5.2-8.5 5.2S3.5 12 3.5 12Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.7"/>
      </svg>
    `,
    eyeOff: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.2 4.6 19.8 19.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M9.4 7.2c.8-.2 1.7-.4 2.6-.4 5.3 0 8.5 5.2 8.5 5.2a15.6 15.6 0 0 1-2.9 3.4M6.3 8.4C4.6 9.7 3.5 12 3.5 12s3.2 5.2 8.5 5.2c1 0 2-.2 2.8-.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10.2 10.3a2.6 2.6 0 0 0 3.6 3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    `,
  };

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    saveIndicator: $('#saveIndicator'),
    saveText: $('#saveText'),
    todayLabel: $('#todayLabel'),
    pickerListName: $('#pickerListName'),
    randomButton: $('#randomButton'),
    randomButtonText: $('#randomButtonText'),
    randomHint: $('#randomHint'),
    resultStage: $('#resultStage'),
    stageLabel: $('#stageLabel'),
    stagePlaceholder: $('#stagePlaceholder'),
    stageName: $('#stageName'),
    selectionAnnouncement: $('#selectionAnnouncement'),
    listTabs: $('#listTabs'),
    addListButton: $('#addListButton'),
    activeListName: $('#activeListName'),
    renameListButton: $('#renameListButton'),
    deleteListButton: $('#deleteListButton'),
    enableSummary: $('#enableSummary'),
    enableAllButton: $('#enableAllButton'),
    disableAllButton: $('#disableAllButton'),
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
    listDialog: $('#listDialog'),
    listDialogKicker: $('#listDialogKicker'),
    listDialogTitle: $('#listDialogTitle'),
    listDialogDesc: $('#listDialogDesc'),
    listDialogForm: $('#listDialogForm'),
    listNameField: $('#listNameField'),
    listNameInput: $('#listNameInput'),
    listDialogMessage: $('#listDialogMessage'),
    listDialogCancel: $('#listDialogCancel'),
    listDialogSubmit: $('#listDialogSubmit'),
    toastRegion: $('#toastRegion'),
  };

  const state = {
    lists: [],
    activeListId: null,
    editingId: null,
    deleteConfirmId: null,
    rolling: false,
    rollTimer: null,
    pickToken: 0,
    storageAvailable: true,
    loadMessage: '',
    pendingPaste: null,
    listDialogMode: null,
    listDialogListId: null,
  };

  function createId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (error) {
      // Use a simple fallback when crypto is unavailable.
    }
    return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
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

  function createList(name, dishes = []) {
    return {
      id: createId(),
      name,
      createdAt: Date.now(),
      dishes,
      lastPickedId: null,
    };
  }

  function activeList() {
    return state.lists.find((list) => list.id === state.activeListId) || state.lists[0] || null;
  }

  function activeDishes() {
    const list = activeList();
    return list ? list.dishes : [];
  }

  function enabledDishes() {
    return activeDishes().filter((dish) => !dish.disabled);
  }

  function getList(id) {
    return state.lists.find((list) => list.id === id) || null;
  }

  function getDish(id) {
    return activeDishes().find((dish) => dish.id === id) || null;
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
      disabled: raw.disabled === true,
    };
  }

  function normalizeDishes(rawDishes) {
    if (!Array.isArray(rawDishes)) {
      return [];
    }
    const usedIds = new Set();
    return rawDishes
      .map(normalizeDish)
      .filter(Boolean)
      .map((dish) => {
        if (usedIds.has(dish.id)) {
          dish.id = createId();
        }
        usedIds.add(dish.id);
        return dish;
      });
  }

  function normalizeList(raw, usedIds) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    const name = cleanName(raw.name).slice(0, MAX_LIST_NAME_LENGTH) || DEFAULT_LIST_NAME;
    let id = typeof raw.id === 'string' && raw.id ? raw.id : createId();
    if (usedIds.has(id)) {
      id = createId();
    }
    usedIds.add(id);
    return {
      id,
      name,
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
      dishes: normalizeDishes(raw.dishes),
      lastPickedId: null,
    };
  }

  function parseLegacyDishes(raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function loadData() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        const legacyItems = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        const legacyFood = legacyItems === null
          ? window.localStorage.getItem(LEGACY_FOOD_KEY)
          : null;
        const legacyRaw = legacyItems ?? legacyFood;
        if (legacyRaw !== null) {
          return {
            lists: [createList(DEFAULT_LIST_NAME, normalizeDishes(parseLegacyDishes(legacyRaw)))],
            activeListId: null,
          };
        }
        return { lists: [], activeListId: null };
      }
    } catch (error) {
      state.storageAvailable = false;
      state.loadMessage = '浏览器禁用了本地存储，清单改动将无法保存。';
      return { lists: [], activeListId: null };
    }

    try {
      const parsed = JSON.parse(raw);
      let rawLists = null;
      let activeListId = null;

      if (Array.isArray(parsed)) {
        rawLists = [{ name: DEFAULT_LIST_NAME, dishes: parsed }];
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.lists)) {
        rawLists = parsed.lists;
        activeListId = typeof parsed.activeListId === 'string' ? parsed.activeListId : null;
      }

      if (!rawLists) {
        throw new Error('Invalid list data');
      }

      const usedIds = new Set();
      const lists = rawLists
        .map((item) => normalizeList(item, usedIds))
        .filter(Boolean)
        .slice(0, MAX_LISTS);

      return { lists, activeListId };
    } catch (error) {
      state.loadMessage = '本地清单读取失败，已从空清单开始。';
      return { lists: [], activeListId: null };
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

  function showListDialogError(message) {
    elements.listDialogMessage.textContent = message;
    elements.listDialogMessage.hidden = !message;
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

  function persistLists() {
    try {
      const payload = {
        version: 2,
        activeListId: state.activeListId,
        lists: state.lists.map((list) => ({
          id: list.id,
          name: list.name,
          createdAt: list.createdAt,
          dishes: list.dishes,
        })),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      state.storageAvailable = true;
      return true;
    } catch (error) {
      state.storageAvailable = false;
      return false;
    }
  }

  function saveLists() {
    if (persistLists()) {
      setSaveStatus('saved', '已保存到本地');
      clearFormMessage();
      return true;
    }
    setSaveStatus('error', '本地保存失败');
    showFormMessage('改动暂时无法保存，请检查浏览器的存储设置。');
    return false;
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

  function randomButtonHint() {
    const list = activeList();
    const total = list ? list.dishes.length : 0;
    const count = list ? list.dishes.filter((dish) => !dish.disabled).length : 0;
    const hasPicked = Boolean(list && list.lastPickedId);
    if (total === 0) {
      return '先添加几个选项，再来抽选';
    }
    if (count === 0) {
      return '所有选项都已禁用，启用一些再来抽选';
    }
    if (count === 1) {
      return hasPicked ? '只有 1 个选项参与抽选，就是它啦' : '只有 1 个选项参与抽选，抽到就是它';
    }
    return hasPicked ? '不满意？再抽一次，不会连续重复' : `有 ${count} 个选项参与抽选，交给运气决定`;
  }

  function updateRandomAvailability() {
    const list = activeList();
    const count = list ? list.dishes.filter((dish) => !dish.disabled).length : 0;
    const hasPicked = Boolean(list && list.lastPickedId);
    elements.randomButton.disabled = count === 0 || state.rolling;
    elements.randomButtonText.textContent = state.rolling
      ? '正在挑选…'
      : hasPicked
        ? '换一个'
        : '帮我选一个';
    if (!state.rolling) {
      elements.randomHint.textContent = randomButtonHint();
    }
  }

  function updateCounts() {
    const dishes = activeDishes();
    const count = dishes.length;
    const enabledCount = dishes.filter((dish) => !dish.disabled).length;
    elements.enableSummary.textContent = `参与抽选 ${enabledCount} / ${count}`;
    elements.enableAllButton.disabled = count === 0 || enabledCount === count;
    elements.disableAllButton.disabled = count === 0 || enabledCount === 0;
    elements.copyButton.disabled = count === 0;
    elements.emptyState.hidden = count > 0;
    elements.dishList.hidden = count === 0;
  }

  function updatePickerContext() {
    const list = activeList();
    const name = list ? list.name : DEFAULT_LIST_NAME;
    elements.pickerListName.textContent = name;
    document.title = `${name} · 随机选择器`;
    elements.activeListName.textContent = name;
    elements.renameListButton.disabled = !list;
    elements.deleteListButton.disabled = state.lists.length <= 1;
    elements.deleteListButton.title = state.lists.length <= 1
      ? '至少保留一个清单'
      : '删除当前清单';
    elements.addListButton.disabled = state.lists.length >= MAX_LISTS;
    elements.addListButton.title = state.lists.length >= MAX_LISTS
      ? `最多可以创建 ${MAX_LISTS} 个清单`
      : '新建清单';
  }

  function renderTabs() {
    const list = activeList();
    elements.listTabs.innerHTML = state.lists
      .map((item) => {
        const isActive = Boolean(list) && item.id === list.id;
        const count = item.dishes.length;
        return `
          <button
            type="button"
            class="list-tab${isActive ? ' is-active' : ''}"
            data-list-id="${escapeHTML(item.id)}"
            aria-pressed="${isActive}"
            tabindex="${isActive ? '0' : '-1'}"
            title="${escapeHTML(item.name)}"
          >
            <span class="list-tab-name">${escapeHTML(item.name)}</span>
            <span class="list-tab-count" aria-hidden="true">${count}</span>
            <span class="sr-only">，${count} 个选项</span>
          </button>
        `;
      })
      .join('');
  }

  function rowMarkup(dish, index) {
    const list = activeList();
    const isPicked = Boolean(list && list.lastPickedId === dish.id);
    const rowNumber = String(index + 1).padStart(2, '0');

    if (state.editingId === dish.id) {
      return `
        <li class="dish-row is-editing" data-id="${escapeHTML(dish.id)}">
          <span class="row-number" aria-hidden="true">${rowNumber}</span>
          <form class="edit-form" data-edit-form data-id="${escapeHTML(dish.id)}" novalidate>
            <label class="sr-only" for="edit-${escapeHTML(dish.id)}">修改「${escapeHTML(dish.name)}」的名称</label>
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
      <li class="dish-row${isPicked ? ' is-picked' : ''}${dish.disabled ? ' is-disabled' : ''}" data-id="${escapeHTML(dish.id)}">
        <span class="row-number" aria-hidden="true">${rowNumber}</span>
        <span class="dish-name">${escapeHTML(dish.name)}</span>
        ${isPicked ? '<span class="picked-tag">已选</span>' : ''}
        ${dish.disabled ? '<span class="disabled-tag">已禁用</span>' : ''}
        <span class="row-actions">
          <button
            type="button"
            class="row-action is-toggle"
            data-action="toggle-draw"
            role="switch"
            aria-checked="${dish.disabled ? 'false' : 'true'}"
            aria-label="「${escapeHTML(dish.name)}」参与抽选"
            title="${dish.disabled ? '启用抽选' : '禁用抽选'}"
          >${dish.disabled ? ICONS.eyeOff : ICONS.eye}</button>
          <button type="button" class="row-action" data-action="edit" aria-label="修改「${escapeHTML(dish.name)}」" title="修改">${ICONS.edit}</button>
          <button type="button" class="row-action is-delete" data-action="delete" aria-label="删除「${escapeHTML(dish.name)}」" title="删除">${ICONS.delete}</button>
        </span>
      </li>
    `;
  }

  function renderList({ manageFocus = true } = {}) {
    updateCounts();
    elements.dishList.innerHTML = activeDishes().map(rowMarkup).join('');

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
    renderTabs();
    updatePickerContext();
    renderList();
    updateRandomAvailability();
  }

  function clearStage() {
    elements.stagePlaceholder.hidden = false;
    elements.stageName.hidden = true;
    elements.stageName.textContent = '';
    elements.stageName.classList.remove('is-long');
    elements.stageLabel.textContent = '随机选择';
    elements.resultStage.classList.remove('is-rolling', 'is-revealed');
    elements.randomButton.classList.remove('is-picking');
    elements.selectionAnnouncement.textContent = '';
  }

  function cancelRoll() {
    state.pickToken += 1;
    if (state.rollTimer) {
      window.clearInterval(state.rollTimer);
      state.rollTimer = null;
    }
    if (state.rolling) {
      state.rolling = false;
      elements.resultStage.classList.remove('is-rolling');
      elements.randomButton.classList.remove('is-picking');
    }
  }

  function resetPicker() {
    cancelRoll();
    const list = activeList();
    if (list) {
      list.lastPickedId = null;
    }
    clearStage();
    updateRandomAvailability();
  }

  function syncStageToList() {
    cancelRoll();
    const list = activeList();
    const picked = list && list.lastPickedId ? getDish(list.lastPickedId) : null;

    if (picked && !picked.disabled) {
      elements.resultStage.classList.remove('is-rolling');
      elements.resultStage.classList.add('is-revealed');
      elements.stagePlaceholder.hidden = true;
      elements.stageName.hidden = false;
      elements.stageLabel.textContent = '上次选的是';
      setStageName(picked.name);
      elements.selectionAnnouncement.textContent = '';
    } else {
      clearStage();
    }

    updateRandomAvailability();
  }

  function syncPickedName() {
    const list = activeList();
    if (!list || !list.lastPickedId) {
      return;
    }
    const picked = getDish(list.lastPickedId);
    if (!picked || picked.disabled) {
      resetPicker();
      return;
    }
    setStageName(picked.name);
  }

  function chooseDish() {
    const list = activeList();
    if (!list) {
      return null;
    }
    const pool = list.dishes.filter((dish) => !dish.disabled);
    const lastPicked = pool.find((dish) => dish.id === list.lastPickedId);
    const candidates = pool.length > 1 && lastPicked
      ? pool.filter((dish) => dish.id !== lastPicked.id)
      : pool;
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

    const list = activeList();
    if (!list || !list.dishes.some((dish) => !dish.disabled)) {
      resetPicker();
      render();
      return;
    }

    const picked = chooseDish();
    if (!picked) {
      resetPicker();
      render();
      return;
    }

    state.rolling = false;
    list.lastPickedId = picked.id;
    elements.resultStage.classList.remove('is-rolling');
    elements.resultStage.classList.add('is-revealed');
    elements.stageLabel.textContent = '就选这个';
    setStageName(picked.name);
    elements.randomButton.classList.remove('is-picking');
    elements.selectionAnnouncement.textContent = `就选这个：${picked.name}`;
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
    const dishes = enabledDishes();
    if (state.rolling || dishes.length === 0) {
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
      const pool = enabledDishes();
      if (!pool.length) {
        return;
      }
      const dish = pool[randomIndex(pool.length)];
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

  function focusListTab(id) {
    window.requestAnimationFrame(() => {
      const tab = elements.listTabs.querySelector(`[data-list-id="${cssEscape(id)}"]`);
      if (!tab) {
        return;
      }
      tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function activateList(id, { focusTab = false, focusInput = false } = {}) {
    const target = getList(id);
    if (!target) {
      return;
    }
    if (target.id === state.activeListId) {
      if (focusTab) {
        focusListTab(target.id);
      }
      return;
    }

    cancelRoll();
    state.activeListId = target.id;
    state.editingId = null;
    state.deleteConfirmId = null;
    clearFormMessage();
    elements.dishInput.value = '';
    elements.dishInput.removeAttribute('aria-invalid');
    saveLists();
    render();
    syncStageToList();
    elements.listScroll.scrollTop = 0;

    if (focusInput) {
      elements.dishInput.focus();
    }
    if (focusTab) {
      focusListTab(target.id);
    }
  }

  function cancelRowStates() {
    state.editingId = null;
    state.deleteConfirmId = null;
  }

  function handleAddDish(event) {
    event.preventDefault();
    const list = activeList();
    if (!list) {
      return;
    }
    const name = cleanName(elements.dishInput.value);

    if (!name) {
      markAddInputInvalid('先写下一个选项名称吧。');
      return;
    }

    if ([...name].length > MAX_NAME_LENGTH) {
      markAddInputInvalid(`选项名称不能超过 ${MAX_NAME_LENGTH} 个字。`);
      return;
    }

    if (list.dishes.some((dish) => nameKey(dish.name) === nameKey(name))) {
      markAddInputInvalid(`「${name}」已经在清单里啦。`);
      return;
    }

    cancelRowStates();
    list.dishes.push({
      id: createId(),
      name,
      createdAt: Date.now(),
      disabled: false,
    });
    clearFormMessage();
    elements.dishInput.removeAttribute('aria-invalid');
    saveLists();
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
      input.setCustomValidity('选项名称不能为空。');
      input.reportValidity();
      input.focus();
      return;
    }
    if ([...name].length > MAX_NAME_LENGTH) {
      input.setCustomValidity(`选项名称不能超过 ${MAX_NAME_LENGTH} 个字。`);
      input.reportValidity();
      input.focus();
      return;
    }
    if (activeDishes().some((item) => item.id !== id && nameKey(item.name) === nameKey(name))) {
      input.setCustomValidity('清单里已经有同名的选项了。');
      input.reportValidity();
      input.focus();
      return;
    }

    input.setCustomValidity('');
    dish.name = name;
    state.editingId = null;
    saveLists();
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
    const list = activeList();
    if (!id || !list) {
      return;
    }
    const removedDish = getDish(id);
    list.dishes = list.dishes.filter((dish) => dish.id !== id);
    state.deleteConfirmId = null;
    state.editingId = null;

    if (list.lastPickedId === id) {
      resetPicker();
    }

    saveLists();
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

  function toggleDishDraw(id) {
    const list = activeList();
    const dish = getDish(id);
    if (!list || !dish) {
      return;
    }

    dish.disabled = !dish.disabled;
    if (dish.disabled && list.lastPickedId === dish.id) {
      resetPicker();
    }

    saveLists();
    render();
    focusRowAction(id, 'toggle-draw');
    elements.selectionAnnouncement.textContent = dish.disabled
      ? `已禁用「${dish.name}」的抽选`
      : `「${dish.name}」已参与抽选`;
  }

  function setAllDishesDisabled(disabled) {
    const list = activeList();
    if (!list || !list.dishes.length) {
      return;
    }

    const enabledCount = list.dishes.filter((dish) => !dish.disabled).length;
    const alreadyDone = disabled
      ? enabledCount === 0
      : enabledCount === list.dishes.length;
    if (alreadyDone) {
      return;
    }

    list.dishes.forEach((dish) => {
      dish.disabled = disabled;
    });

    if (disabled) {
      resetPicker();
    }

    saveLists();
    render();
    updateRandomAvailability();
    elements.selectionAnnouncement.textContent = disabled
      ? '已禁用全部选项的抽选'
      : '已启用全部选项的抽选';

    window.requestAnimationFrame(() => {
      const nextButton = disabled ? elements.enableAllButton : elements.disableAllButton;
      if (!nextButton.disabled) {
        nextButton.focus();
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
      case 'toggle-draw':
        toggleDishDraw(id);
        break;
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

  function handleTabsClick(event) {
    const tab = event.target.closest('[data-list-id]');
    if (!tab) {
      return;
    }
    activateList(tab.dataset.listId, { focusTab: true });
  }

  function handleTabsKeydown(event) {
    const tab = event.target.closest('[data-list-id]');
    if (!tab) {
      return;
    }
    const isArrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (!isArrow && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();

    const index = state.lists.findIndex((list) => list.id === tab.dataset.listId);
    if (index < 0) {
      return;
    }

    let nextIndex;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = state.lists.length - 1;
    } else {
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      nextIndex = (index + delta + state.lists.length) % state.lists.length;
    }

    const nextList = state.lists[nextIndex];
    activateList(nextList.id, { focusTab: true });
  }

  function validateListName(name, ignoreId = null) {
    if (!name) {
      return '先给清单起个名字吧。';
    }
    if ([...name].length > MAX_LIST_NAME_LENGTH) {
      return `清单名称不能超过 ${MAX_LIST_NAME_LENGTH} 个字。`;
    }
    if (state.lists.some((list) => list.id !== ignoreId && nameKey(list.name) === nameKey(name))) {
      return `已经有叫「${name}」的清单了。`;
    }
    return '';
  }

  function openListDialog(mode, listId = null) {
    const list = listId ? getList(listId) : null;
    if (mode !== 'create' && !list) {
      return;
    }

    state.listDialogMode = mode;
    state.listDialogListId = listId;
    showListDialogError('');
    elements.listNameInput.removeAttribute('aria-invalid');
    elements.listNameField.hidden = mode === 'delete';
    elements.listDialogSubmit.classList.toggle('is-danger', mode === 'delete');
    elements.listDialogSubmit.classList.toggle('is-append', mode !== 'delete');

    if (mode === 'delete') {
      elements.listDialogKicker.textContent = 'DELETE LIST';
      elements.listDialogTitle.textContent = '删除这个清单？';
      elements.listDialogDesc.textContent = `「${list.name}」里的 ${list.dishes.length} 个选项会一起删除，无法恢复。`;
      elements.listDialogSubmit.textContent = '删除';
    } else {
      const isRename = mode === 'rename';
      elements.listDialogKicker.textContent = isRename ? 'RENAME LIST' : 'NEW LIST';
      elements.listDialogTitle.textContent = isRename ? '重命名清单' : '新建清单';
      elements.listDialogDesc.textContent = isRename
        ? '换个名字，清单里的选项不会变化。'
        : `每个清单的选项和随机抽选互不影响，最多可以创建 ${MAX_LISTS} 个清单。`;
      elements.listDialogSubmit.textContent = isRename ? '保存' : '创建清单';
      elements.listNameInput.value = isRename ? list.name : '';
    }

    if (!elements.listDialog.open) {
      elements.listDialog.showModal();
    }

    window.requestAnimationFrame(() => {
      if (mode === 'delete') {
        elements.listDialogCancel.focus();
      } else {
        elements.listNameInput.focus();
        elements.listNameInput.select();
      }
    });
  }

  function closeListDialog() {
    if (elements.listDialog.open) {
      elements.listDialog.close();
    }
  }

  function deleteList(id) {
    const index = state.lists.findIndex((list) => list.id === id);
    if (index < 0 || state.lists.length <= 1) {
      return;
    }

    cancelRoll();
    const [removed] = state.lists.splice(index, 1);
    const nextList = state.lists[Math.min(index, state.lists.length - 1)];
    state.activeListId = nextList.id;
    state.editingId = null;
    state.deleteConfirmId = null;
    clearFormMessage();
    elements.dishInput.value = '';
    elements.dishInput.removeAttribute('aria-invalid');
    saveLists();
    render();
    syncStageToList();
    elements.listScroll.scrollTop = 0;
    focusListTab(nextList.id);
    showToast(`已删除清单「${removed.name}」`);
  }

  function handleListDialogSubmit(event) {
    event.preventDefault();
    const mode = state.listDialogMode;

    if (mode === 'delete') {
      const list = getList(state.listDialogListId);
      if (!list) {
        closeListDialog();
        return;
      }
      if (state.lists.length <= 1) {
        showListDialogError('至少需要保留一个清单。');
        return;
      }
      closeListDialog();
      deleteList(list.id);
      return;
    }

    if (mode !== 'create' && mode !== 'rename') {
      return;
    }

    const name = cleanName(elements.listNameInput.value);
    const error = validateListName(name, mode === 'rename' ? state.listDialogListId : null);
    if (error) {
      elements.listNameInput.setAttribute('aria-invalid', 'true');
      showListDialogError(error);
      elements.listNameInput.focus();
      return;
    }

    if (mode === 'rename') {
      const list = getList(state.listDialogListId);
      if (!list) {
        closeListDialog();
        return;
      }
      const previousName = list.name;
      list.name = name;
      const saved = saveLists();
      closeListDialog();
      render();
      focusListTab(list.id);
      if (saved) {
        showToast(`已将「${previousName}」重命名为「${name}」`);
      } else {
        showToast('清单已重命名，但无法保存到本地存储。', 'error');
      }
      return;
    }

    if (state.lists.length >= MAX_LISTS) {
      showListDialogError(`最多只能创建 ${MAX_LISTS} 个清单。`);
      return;
    }

    const list = createList(name);
    state.lists.push(list);
    closeListDialog();
    activateList(list.id, { focusInput: true });
    showToast(`已新建清单「${name}」`);
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
    const list = activeList();
    if (!list || !list.dishes.length) {
      return;
    }

    const text = list.dishes.map((dish) => dish.name).join('\n');
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
      showToast(`已复制「${list.name}」的 ${list.dishes.length} 个选项`);
    } else {
      showToast('复制失败，请允许浏览器访问剪贴板后重试。', 'error');
    }
  }

  function parseClipboardMenu(text) {
    const content = String(text ?? '').trim();
    if (!content) {
      throw new Error('剪贴板里没有内容。');
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
        throw new Error('没有找到可导入的选项数据。');
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
        disabled: false,
      });
    });

    if (dishes.length === 0) {
      throw new Error('没有找到有效的选项名称。');
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

    return window.prompt('无法直接读取剪贴板，请把选项粘贴到这里（每行一个）：', '');
  }

  function askPasteMode(dishes) {
    return new Promise((resolve) => {
      state.pendingPaste = resolve;
      const list = activeList();
      const previewNames = dishes.slice(0, 8).map((dish) => dish.name);
      const extraCount = dishes.length - previewNames.length;
      elements.pasteDialogTitle.textContent = `导入 ${dishes.length} 个选项`;
      elements.pasteDialogDesc.textContent = `当前清单「${list ? list.name : DEFAULT_LIST_NAME}」已有 ${activeDishes().length} 个选项。追加会保留现有选项并自动去重，覆盖会替换当前清单的全部选项。`;
      elements.pastePreview.textContent = `${previewNames.join('、')}${extraCount > 0 ? ` 等 ${dishes.length} 个` : ''}`;

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
    const list = activeList();
    if (!list) {
      return;
    }

    const text = await readMenuClipboard();
    if (text === null) {
      return;
    }

    try {
      const { dishes, skipped } = parseClipboardMenu(text);
      let mode = 'replace';
      if (list.dishes.length > 0) {
        mode = await askPasteMode(dishes);
        if (!mode) {
          return;
        }
      }

      const existingNames = new Set(list.dishes.map((dish) => nameKey(dish.name)));
      const appendedDishes = mode === 'append'
        ? dishes.filter((dish) => !existingNames.has(nameKey(dish.name)))
        : dishes;
      const nextDishes = mode === 'append' ? [...list.dishes, ...appendedDishes] : dishes;
      const existingDuplicates = mode === 'append' ? dishes.length - appendedDishes.length : 0;
      const skippedTotal = skipped + existingDuplicates;

      list.dishes = nextDishes;
      cancelRowStates();
      resetPicker();
      const saved = saveLists();
      render();
      elements.listScroll.scrollTop = 0;
      const skippedMessage = skippedTotal > 0 ? `，跳过 ${skippedTotal} 条重复或无效内容` : '';

      if (!saved) {
        showToast('清单已更新，但无法保存到本地存储。', 'error');
      } else if (mode === 'append' && appendedDishes.length === 0) {
        showToast('没有新增选项，粘贴内容都已存在。');
      } else if (mode === 'append') {
        showToast(`已向「${list.name}」追加 ${appendedDishes.length} 个选项${skippedMessage}`);
      } else {
        showToast(`已覆盖「${list.name}」，共 ${dishes.length} 个选项${skippedMessage}`);
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

    elements.listTabs.addEventListener('click', handleTabsClick);
    elements.listTabs.addEventListener('keydown', handleTabsKeydown);
    elements.addListButton.addEventListener('click', () => openListDialog('create'));
    elements.renameListButton.addEventListener('click', () => {
      openListDialog('rename', state.activeListId);
    });
    elements.deleteListButton.addEventListener('click', () => {
      openListDialog('delete', state.activeListId);
    });
    elements.enableAllButton.addEventListener('click', () => setAllDishesDisabled(false));
    elements.disableAllButton.addEventListener('click', () => setAllDishesDisabled(true));

    elements.listDialogForm.addEventListener('submit', handleListDialogSubmit);
    elements.listDialogCancel.addEventListener('click', closeListDialog);
    elements.listNameInput.addEventListener('input', () => {
      elements.listNameInput.removeAttribute('aria-invalid');
      showListDialogError('');
    });
    elements.listDialog.addEventListener('click', (event) => {
      if (event.target === elements.listDialog) {
        closeListDialog();
      }
    });
    elements.listDialog.addEventListener('close', () => {
      state.listDialogMode = null;
      state.listDialogListId = null;
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
      if (elements.listDialog.open || elements.pasteDialog.open) {
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
    const loaded = loadData();
    state.lists = loaded.lists.length ? loaded.lists : [createList(DEFAULT_LIST_NAME)];
    state.activeListId = loaded.activeListId && state.lists.some((list) => list.id === loaded.activeListId)
      ? loaded.activeListId
      : state.lists[0].id;

    bindEvents();

    if (!state.loadMessage) {
      persistLists();
    }

    render();
    syncStageToList();

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
