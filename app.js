(() => {
  'use strict';

  // ===== 定数 =====
  const STORAGE_KEY = 'kaigyo-note:data';
  const DATA_VERSION = 1;
  const SOON_DAYS = 7;
  const CATS = [
    { id: 'property', name: '物件・内装', color: '#e8590c' },
    { id: 'kitchen', name: '厨房機器', color: '#1c7ed6' },
    { id: 'permit', name: '許認可', color: '#c2255c' },
    { id: 'supply', name: '仕入れ', color: '#2f9e44' },
    { id: 'menu', name: 'メニュー・原価', color: '#f08c00' },
    { id: 'staff', name: '採用・研修', color: '#7048e8' },
    { id: 'promo', name: '販促', color: '#0c8599' },
    { id: 'trial', name: '試運転', color: '#5c7cfa' }
  ];
  const CAT_MAP = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const TEMPLATE = window.KAIGYO_TEMPLATE || [];

  // ===== ユーティリティ =====
  const $ = (s, el = document) => el.querySelector(s);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s));
  function toUTC(s) { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }
  function today() { const d = new Date(); return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  function addDays(s, n) { const t = new Date(toUTC(s) + n * 86400000); return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  function diffDays(a, b) { return Math.round((toUTC(a) - toUTC(b)) / 86400000); } // a - b
  const WEEK = '日月火水木金土';
  function fmtDate(s, withYear) {
    const t = new Date(toUTC(s));
    const y = t.getUTCFullYear();
    const showYear = withYear || y !== new Date().getFullYear();
    return `${showYear ? y + '/' : ''}${t.getUTCMonth() + 1}/${t.getUTCDate()}(${WEEK[t.getUTCDay()]})`;
  }
  function fmtDateLong(s) {
    const t = new Date(toUTC(s));
    return `${t.getUTCFullYear()}年${t.getUTCMonth() + 1}月${t.getUTCDate()}日(${WEEK[t.getUTCDay()]})`;
  }
  const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);
  const clampInt = (v, min, max, def) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

  // ===== データ =====
  function emptyState() {
    return { version: DATA_VERSION, currentStoreId: null, stores: [], assignees: [], lastExportAt: null };
  }

  function normalizeTask(t, i) {
    t = t && typeof t === 'object' ? t : {};
    const dueMode = ['auto', 'manual', 'none'].includes(t.dueMode) ? t.dueMode : 'none';
    return {
      id: typeof t.id === 'string' && t.id ? t.id : uid(),
      cat: CAT_MAP[t.cat] ? t.cat : 'property',
      title: String(t.title ?? '').slice(0, 200) || '（無題のタスク）',
      done: !!t.done,
      doneAt: typeof t.doneAt === 'string' ? t.doneAt : null,
      assignee: String(t.assignee ?? '').slice(0, 50),
      memo: String(t.memo ?? '').slice(0, 5000),
      dueMode,
      offset: clampInt(t.offset, -999, 9999, 0),
      dueDate: isDate(t.dueDate) ? t.dueDate : '',
      order: Number.isFinite(t.order) ? t.order : i
    };
  }

  function normalizeStore(s) {
    s = s && typeof s === 'object' ? s : {};
    return {
      id: typeof s.id === 'string' && s.id ? s.id : uid(),
      name: String(s.name ?? '').slice(0, 100) || '名称未設定の店舗',
      openDate: isDate(s.openDate) ? s.openDate : '',
      createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
      tasks: (Array.isArray(s.tasks) ? s.tasks : []).map(normalizeTask)
    };
  }

  function normalizeState(raw) {
    const st = emptyState();
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.stores)) return null;
    st.stores = raw.stores.map(normalizeStore);
    st.assignees = Array.isArray(raw.assignees) ? [...new Set(raw.assignees.map((a) => String(a).trim()).filter(Boolean))] : [];
    st.currentStoreId = st.stores.some((s) => s.id === raw.currentStoreId) ? raw.currentStoreId : (st.stores[0]?.id ?? null);
    st.lastExportAt = typeof raw.lastExportAt === 'string' ? raw.lastExportAt : null;
    return st;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeState(JSON.parse(raw)) || emptyState();
    } catch (e) { console.error(e); }
    return emptyState();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
      toast('保存に失敗しました。容量が不足している可能性があります');
    }
  }

  let state = load();
  const ui = { tab: 'home', cat: 'all', filter: 'all', assignee: '' };

  const currentStore = () => state.stores.find((s) => s.id === state.currentStoreId) || null;

  function dueOf(task, store) {
    if (task.dueMode === 'auto') return store.openDate ? addDays(store.openDate, -task.offset) : null;
    if (task.dueMode === 'manual') return task.dueDate || null;
    return null;
  }

  // 期限の状態: done / overdue / today / soon / later / none
  function statusOf(task, store, t = today()) {
    if (task.done) return 'done';
    const due = dueOf(task, store);
    if (!due) return 'none';
    const d = diffDays(due, t);
    if (d < 0) return 'overdue';
    if (d === 0) return 'today';
    if (d <= SOON_DAYS) return 'soon';
    return 'later';
  }

  function sortTasks(tasks, store) {
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const da = dueOf(a, store), db = dueOf(b, store);
      if (da !== db) { if (!da) return 1; if (!db) return -1; return da < db ? -1 : 1; }
      return a.order - b.order;
    });
  }

  function storeStats(store) {
    const t = today();
    const total = store.tasks.length;
    const done = store.tasks.filter((x) => x.done).length;
    let overdue = 0, soon = 0;
    store.tasks.forEach((x) => {
      const s = statusOf(x, store, t);
      if (s === 'overdue') overdue++;
      else if (s === 'today' || s === 'soon') soon++;
    });
    return { total, done, overdue, soon, rate: pct(done, total) };
  }

  function templateTasks() {
    return TEMPLATE.map((t, i) => normalizeTask({ cat: t.cat, title: t.title, memo: t.memo || '', dueMode: 'auto', offset: t.offset, order: i }, i));
  }

  function allAssignees() {
    const set = new Set(state.assignees);
    state.stores.forEach((s) => s.tasks.forEach((t) => t.assignee && set.add(t.assignee)));
    return [...set];
  }

  // ===== 表示部品 =====
  const CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';

  function dueLabel(task, store) {
    if (task.done) return `<span class="due">完了${task.doneAt ? ' ' + esc(fmtDate(task.doneAt.slice(0, 10))) : ''}</span>`;
    const due = dueOf(task, store);
    if (!due) {
      if (task.dueMode === 'auto') return '<span class="due">期限：オープン日未設定</span>';
      return '';
    }
    const d = diffDays(due, today());
    let cls = '', rel;
    if (d < 0) { cls = 'overdue'; rel = `${-d}日超過`; }
    else if (d === 0) { cls = 'today'; rel = '今日まで'; }
    else if (d <= SOON_DAYS) { cls = 'soon'; rel = `あと${d}日`; }
    else rel = `あと${d}日`;
    return `<span class="due ${cls}">${esc(fmtDate(due))}・${rel}</span>`;
  }

  function taskRow(task, store, showCat) {
    const cat = CAT_MAP[task.cat];
    return `<div class="task ${task.done ? 'done' : ''}">
      <button class="check" data-action="toggle" data-id="${task.id}" aria-label="${task.done ? '未完了に戻す' : '完了にする'}">${CHECK_SVG}</button>
      <button class="open-btn" data-action="open-task" data-id="${task.id}">
        <span class="title">${esc(task.title)}</span>
        <span class="meta">
          ${dueLabel(task, store)}
          ${showCat ? `<span class="tag"><span class="dot" style="--c:${cat.color}"></span>${esc(cat.name)}</span>` : ''}
          ${task.assignee ? `<span>👤 ${esc(task.assignee)}</span>` : ''}
          ${task.memo ? '<span class="memo-ico" title="メモあり">📝</span>' : ''}
        </span>
      </button>
    </div>`;
  }

  function ring(rate) {
    const r = 52, c = 2 * Math.PI * r;
    return `<div class="ring" role="img" aria-label="全体の進捗 ${rate}%">
      <svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="${r}" fill="none" stroke-width="12"/>
      <circle class="fg" cx="60" cy="60" r="${r}" fill="none" stroke-width="12" stroke-linecap="${rate > 0 ? 'round' : 'butt'}"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - rate / 100)).toFixed(2)}"/></svg>
      <div class="val"><b>${rate}%</b><span>全体の進捗</span></div></div>`;
  }

  // ===== 画面 =====
  function renderAppbar() {
    const store = currentStore();
    const el = $('#appbar');
    if (!store) { el.innerHTML = '<div class="app-title">開業準備ノート</div>'; return; }
    let cd;
    if (!store.openDate) cd = '<span class="countdown muted">オープン日未設定</span>';
    else {
      const d = diffDays(store.openDate, today());
      if (d > 0) cd = `<span class="countdown">オープンまで <b>${d}</b>日</span>`;
      else if (d === 0) cd = '<span class="countdown">本日オープン</span>';
      else cd = `<span class="countdown muted">オープンから${-d}日</span>`;
    }
    el.innerHTML = `<div class="store-select-wrap">
        <select class="store-select" id="storeSelect" aria-label="店舗を切り替え">
          ${state.stores.map((s) => `<option value="${s.id}" ${s.id === store.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
        </select></div>${cd}`;
  }

  function welcome() {
    return `<div class="card welcome">
      <div class="big">🍳</div>
      <h2>開業準備ノートへようこそ</h2>
      <p>まず店舗とオープン予定日を登録しましょう。<br>開業準備の一般的なタスク${TEMPLATE.length}件を最初から入れられます。</p>
      <button class="btn primary" data-action="new-store">店舗を登録する</button>
    </div>`;
  }

  function viewHome() {
    const store = currentStore();
    if (!store) return welcome();
    const st = storeStats(store);
    const t = today();
    const overdue = sortTasks(store.tasks.filter((x) => statusOf(x, store, t) === 'overdue'), store);
    const soon = sortTasks(store.tasks.filter((x) => ['today', 'soon'].includes(statusOf(x, store, t))), store);

    const catRows = CATS.map((c) => {
      const list = store.tasks.filter((x) => x.cat === c.id);
      const done = list.filter((x) => x.done).length;
      const od = list.filter((x) => statusOf(x, store, t) === 'overdue').length;
      const rate = pct(done, list.length);
      return `<button class="cat-row" data-action="go-cat" data-cat="${c.id}">
        <span class="name"><span class="dot" style="--c:${c.color}"></span>${esc(c.name)}</span>
        <span class="num">${od ? `<span class="od">期限切れ${od}</span>` : ''}${done}/${list.length}（${rate}%）</span>
        <span class="bar"><i style="width:${rate}%;--c:${c.color}"></i></span>
      </button>`;
    }).join('');

    const listBlock = (items, limit, filter) => {
      if (!items.length) return '';
      const more = items.length > limit ? `<button class="btn sm block" style="margin-top:10px" data-action="go-filter" data-filter="${filter}">すべて見る（${items.length}件）</button>` : '';
      return `<div class="task-list">${items.slice(0, limit).map((x) => taskRow(x, store, true)).join('')}</div>${more}`;
    };

    return `
      <section class="card">
        <div class="overall">
          ${ring(st.rate)}
          <div class="overall-stats">
            <div class="stat-row"><span>完了</span><b>${st.done} / ${st.total}</b></div>
            <div class="stat-row danger"><span>期限切れ</span><b>${st.overdue}件</b></div>
            <div class="stat-row warn"><span>${SOON_DAYS}日以内が期限</span><b>${st.soon}件</b></div>
            <div class="open-date">${store.openDate ? 'オープン予定：' + esc(fmtDateLong(store.openDate)) : '<button class="btn sm" data-action="edit-store" data-id="' + store.id + '">オープン日を設定</button>'}</div>
          </div>
        </div>
      </section>
      <section class="card">
        <h2>⚠️ 期限切れ <span class="count ${overdue.length ? 'danger' : ''}">${overdue.length}</span></h2>
        ${overdue.length ? listBlock(overdue, 10, 'overdue') : '<div class="empty">期限切れのタスクはありません</div>'}
      </section>
      <section class="card">
        <h2>⏰ ${SOON_DAYS}日以内が期限 <span class="count ${soon.length ? 'warn' : ''}">${soon.length}</span></h2>
        ${soon.length ? listBlock(soon, 5, 'soon') : '<div class="empty">直近の期限のタスクはありません</div>'}
      </section>
      <section class="card">
        <h2>カテゴリ別の進捗</h2>
        <div class="cat-progress">${catRows}</div>
      </section>`;
  }

  function viewTasks() {
    const store = currentStore();
    if (!store) return welcome();
    const t = today();
    const chips = [{ id: 'all', name: 'すべて' }, ...CATS].map((c) => {
      const list = c.id === 'all' ? store.tasks : store.tasks.filter((x) => x.cat === c.id);
      const left = list.filter((x) => !x.done).length;
      return `<button class="chip ${ui.cat === c.id ? 'on' : ''}" data-action="cat" data-cat="${c.id}">
        ${c.color ? `<span class="dot" style="--c:${c.color}"></span>` : ''}${esc(c.name)}<span class="n">${left}</span></button>`;
    }).join('');

    const filters = [['all', 'すべて'], ['open', '未完了'], ['overdue', '期限切れ'], ['soon', `${SOON_DAYS}日以内`]];
    const assignees = [...new Set(store.tasks.map((x) => x.assignee).filter(Boolean))];
    if (ui.assignee && ui.assignee !== '__none' && !assignees.includes(ui.assignee)) ui.assignee = '';

    let list = store.tasks.filter((x) => ui.cat === 'all' || x.cat === ui.cat);
    list = list.filter((x) => {
      const s = statusOf(x, store, t);
      if (ui.filter === 'open') return !x.done;
      if (ui.filter === 'overdue') return s === 'overdue';
      if (ui.filter === 'soon') return s === 'today' || s === 'soon';
      return true;
    });
    if (ui.assignee === '__none') list = list.filter((x) => !x.assignee);
    else if (ui.assignee) list = list.filter((x) => x.assignee === ui.assignee);

    let body;
    if (!list.length) {
      body = `<div class="card empty" style="text-align:center">${store.tasks.length ? '条件に合うタスクはありません' : 'タスクがありません。右下の＋から追加できます'}</div>`;
    } else if (ui.cat === 'all') {
      body = CATS.map((c) => {
        const items = list.filter((x) => x.cat === c.id);
        if (!items.length) return '';
        return `<div class="group-title"><span class="dot" style="--c:${c.color}"></span>${esc(c.name)}（${items.length}）</div>
          <div class="task-list">${sortTasks(items, store).map((x) => taskRow(x, store, false)).join('')}</div>`;
      }).join('');
    } else {
      body = `<div class="task-list">${sortTasks(list, store).map((x) => taskRow(x, store, false)).join('')}</div>`;
    }

    return `
      <div class="chips" id="catChips">${chips}</div>
      <div class="toolbar">
        <div class="segmented">${filters.map(([k, n]) => `<button class="${ui.filter === k ? 'on' : ''}" data-action="filter" data-filter="${k}">${n}</button>`).join('')}</div>
        <select class="select-sm" id="assigneeFilter" aria-label="担当者で絞り込み">
          <option value="">担当：全員</option>
          ${assignees.map((a) => `<option value="${esc(a)}" ${ui.assignee === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          <option value="__none" ${ui.assignee === '__none' ? 'selected' : ''}>未割り当て</option>
        </select>
      </div>
      ${body}
      <button class="fab" data-action="new-task" aria-label="タスクを追加">＋</button>`;
  }

  function viewStores() {
    const cards = state.stores.map((s) => {
      const st = storeStats(s);
      const cur = s.id === state.currentStoreId;
      return `<section class="card store-card ${cur ? 'current' : ''}">
        <div class="info">
          <div class="name">${esc(s.name)}${cur ? '<span class="badge">表示中</span>' : ''}</div>
          <div class="small muted">${s.openDate ? 'オープン予定 ' + esc(fmtDateLong(s.openDate)) : 'オープン日未設定'}</div>
          <div class="small muted">進捗 ${st.rate}%（${st.done}/${st.total}）${st.overdue ? `・<span style="color:var(--danger)">期限切れ${st.overdue}件</span>` : ''}</div>
          <div class="bar"><i style="width:${st.rate}%"></i></div>
        </div>
        <div style="display:grid;gap:6px">
          ${cur ? '' : `<button class="btn sm primary" data-action="switch-store" data-id="${s.id}">表示</button>`}
          <button class="btn sm" data-action="edit-store" data-id="${s.id}">編集</button>
        </div>
      </section>`;
    }).join('');
    return `${cards || '<div class="card empty" style="text-align:center">店舗が登録されていません</div>'}
      <button class="btn primary block" data-action="new-store">＋ 店舗を追加</button>`;
  }

  function viewSettings() {
    const names = state.assignees;
    const last = state.lastExportAt ? new Date(state.lastExportAt).toLocaleString('ja-JP') : 'まだありません';
    return `
      <section class="card">
        <h2>データの書き出し・読み込み</h2>
        <p class="small muted" style="margin-top:0">データはこの端末のブラウザ内だけに保存されています。機種変更やブラウザのデータ削除に備えて、定期的にJSONファイルへ書き出してください。</p>
        <div class="btn-row">
          <button class="btn primary" data-action="export">JSONを書き出す</button>
          <button class="btn" data-action="import">JSONを読み込む</button>
        </div>
        <div class="hint">最後に書き出した日時：${esc(last)}</div>
      </section>
      <section class="card">
        <h2>担当者の候補</h2>
        <p class="small muted" style="margin-top:0">タスクの担当者を入力するときの候補に表示されます。</p>
        <div class="name-chips">
          ${names.length ? names.map((n) => `<span class="name-chip">${esc(n)}<button data-action="remove-assignee" data-name="${esc(n)}" aria-label="${esc(n)}を削除">×</button></span>`).join('') : '<span class="empty">まだ登録されていません</span>'}
        </div>
        <form class="inline" data-form="assignee">
          <input class="input" style="flex:1;width:auto;text-align:left" name="name" maxlength="50" placeholder="例：店長、田中" required>
          <button class="btn" type="submit">追加</button>
        </form>
      </section>
      <section class="card">
        <h2>データの削除</h2>
        <p class="small muted" style="margin-top:0">すべての店舗とタスクを削除します。元に戻せません。</p>
        <button class="btn danger block" data-action="reset">すべてのデータを削除</button>
      </section>
      <p class="small muted" style="text-align:center">開業準備ノート ・ テンプレート${TEMPLATE.length}件</p>`;
  }

  const VIEWS = { home: viewHome, tasks: viewTasks, stores: viewStores, settings: viewSettings };

  function render() {
    renderAppbar();
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
    $('#view').innerHTML = VIEWS[ui.tab]();
    if (ui.tab === 'tasks') {
      const on = $('#catChips .chip.on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function setTab(tab) {
    ui.tab = tab;
    try { history.replaceState(null, '', '#' + tab); } catch (e) { /* noop */ }
    render();
    window.scrollTo(0, 0);
  }

  // ===== シート =====
  let sheetSubmit = null;
  function openSheet(title, html, onSubmit, onMount) {
    const sheet = $('#sheet');
    sheet.innerHTML = `<div class="sheet-handle"></div>
      <div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-action="sheet-close" aria-label="閉じる">✕</button></div>
      ${html}`;
    sheetSubmit = onSubmit;
    $('#sheetBackdrop').hidden = false;
    sheet.hidden = false;
    sheet.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    if (onMount) onMount(sheet);
  }
  function closeSheet() {
    $('#sheet').hidden = true;
    $('#sheetBackdrop').hidden = true;
    $('#sheet').innerHTML = '';
    sheetSubmit = null;
    document.body.style.overflow = '';
  }

  // タスク編集
  function openTaskSheet(taskId) {
    const store = currentStore();
    if (!store) return;
    const existing = store.tasks.find((x) => x.id === taskId);
    const task = existing || normalizeTask({
      cat: ui.cat !== 'all' ? ui.cat : 'property',
      dueMode: store.openDate ? 'auto' : 'manual',
      offset: 7
    }, 0);
    const names = allAssignees();

    const html = `<form data-form="task" autocomplete="off">
      <label class="field"><span class="label">タスク名</span>
        <input class="input" name="title" required maxlength="200" value="${existing ? esc(task.title) : ''}" placeholder="例：営業許可の申請"></label>
      <label class="field"><span class="label">カテゴリ</span>
        <select name="cat">${CATS.map((c) => `<option value="${c.id}" ${c.id === task.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <div class="field"><span class="label">期限</span>
        <div class="segmented" style="margin-bottom:10px">
          ${[['auto', 'オープン日から逆算'], ['manual', '日付を指定'], ['none', 'なし']].map(([k, n]) =>
            `<label><input type="radio" name="dueMode" value="${k}" ${task.dueMode === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}
        </div>
        <div data-mode="auto">
          <div class="inline">オープンの<input class="input" type="number" name="offset" inputmode="numeric" min="-999" max="9999" value="${task.offset}">日前</div>
          <div class="hint" id="autoPreview"></div>
        </div>
        <div data-mode="manual"><input class="input" type="date" name="dueDate" value="${esc(task.dueDate || (existing ? dueOf(task, store) || '' : ''))}"></div>
      </div>
      <label class="field"><span class="label">担当者</span>
        <input class="input" name="assignee" list="assigneeList" maxlength="50" value="${esc(task.assignee)}" placeholder="未割り当て">
        <datalist id="assigneeList">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="field"><span class="label">メモ</span>
        <textarea name="memo" maxlength="5000" placeholder="連絡先、費用、注意点など">${esc(task.memo)}</textarea></label>
      ${existing ? `<label class="checkline"><input type="checkbox" name="done" ${task.done ? 'checked' : ''}>完了にする</label>` : ''}
      <div class="btn-row">
        ${existing ? '<button type="button" class="btn danger" data-action="delete-task">削除</button>' : ''}
        <button type="submit" class="btn primary">${existing ? '保存' : '追加'}</button>
      </div>
    </form>`;

    openSheet(existing ? 'タスクを編集' : 'タスクを追加', html, (fd) => {
      const title = String(fd.get('title') || '').trim();
      if (!title) return false;
      const data = {
        title,
        cat: CAT_MAP[fd.get('cat')] ? fd.get('cat') : 'property',
        dueMode: fd.get('dueMode') || 'none',
        offset: clampInt(fd.get('offset'), -999, 9999, 0),
        dueDate: isDate(fd.get('dueDate')) ? fd.get('dueDate') : '',
        assignee: String(fd.get('assignee') || '').trim().slice(0, 50),
        memo: String(fd.get('memo') || '')
      };
      if (data.dueMode === 'manual' && !data.dueDate) data.dueMode = 'none';
      if (existing) {
        const done = fd.get('done') === 'on';
        if (done !== existing.done) existing.doneAt = done ? today() : null;
        Object.assign(existing, data, { done });
        toast('保存しました');
      } else {
        const order = store.tasks.reduce((m, x) => Math.max(m, x.order), -1) + 1;
        store.tasks.push(normalizeTask({ ...data, order }, order));
        toast('タスクを追加しました');
      }
      save();
      return true;
    }, (sheet) => {
      const form = $('form', sheet);
      const update = () => {
        const mode = form.dueMode.value;
        sheet.querySelectorAll('[data-mode]').forEach((el) => { el.hidden = el.dataset.mode !== mode; });
        const off = clampInt(form.offset.value, -999, 9999, 0);
        const p = $('#autoPreview', sheet);
        if (!store.openDate) p.innerHTML = 'オープン日が未設定のため、期限はまだ決まりません。店舗画面で設定してください。';
        else {
          const d = addDays(store.openDate, -off);
          p.innerHTML = `期限：<b>${esc(fmtDate(d, true))}</b>（オープン日を変更すると自動で変わります${off < 0 ? '。マイナスはオープン後' : ''}）`;
        }
      };
      form.addEventListener('input', update);
      form.addEventListener('change', update);
      update();
      if (!existing) setTimeout(() => form.title.focus(), 250);
    });
    $('#sheet').dataset.taskId = existing ? existing.id : '';
  }

  // 店舗編集
  function openStoreSheet(storeId) {
    const existing = state.stores.find((s) => s.id === storeId);
    const html = `<form data-form="store" autocomplete="off">
      <label class="field"><span class="label">店舗名</span>
        <input class="input" name="name" required maxlength="100" value="${existing ? esc(existing.name) : ''}" placeholder="例：〇〇食堂 駅前店"></label>
      <label class="field"><span class="label">オープン予定日</span>
        <input class="input" type="date" name="openDate" value="${existing ? esc(existing.openDate) : ''}">
        <div class="hint">「オープン日から逆算」に設定したタスクの期限は、この日付から自動で計算されます。</div></label>
      ${existing ? '' : `<label class="checkline"><input type="checkbox" name="useTemplate" checked>
        <span>開業準備の一般的なタスク（${TEMPLATE.length}件）を入れる<br><span class="small muted">あとから編集・削除できます</span></span></label>`}
      <div class="btn-row">
        ${existing ? '<button type="button" class="btn danger" data-action="delete-store">削除</button>' : ''}
        <button type="submit" class="btn primary">${existing ? '保存' : '登録'}</button>
      </div>
    </form>`;
    openSheet(existing ? '店舗を編集' : '店舗を追加', html, (fd) => {
      const name = String(fd.get('name') || '').trim();
      if (!name) return false;
      const openDate = isDate(fd.get('openDate')) ? fd.get('openDate') : '';
      if (existing) {
        const changed = existing.openDate !== openDate;
        existing.name = name.slice(0, 100);
        existing.openDate = openDate;
        toast(changed && openDate ? '保存しました。逆算の期限を更新しました' : '保存しました');
      } else {
        const s = normalizeStore({ name, openDate, tasks: fd.get('useTemplate') === 'on' ? templateTasks() : [] });
        state.stores.push(s);
        state.currentStoreId = s.id;
        toast('店舗を登録しました');
      }
      save();
      return true;
    });
    $('#sheet').dataset.storeId = existing ? existing.id : '';
  }

  // ===== 書き出し・読み込み =====
  function exportJSON() {
    state.lastExportAt = new Date().toISOString();
    save();
    const data = { app: 'kaigyo-note', version: DATA_VERSION, exportedAt: state.lastExportAt, stores: state.stores, assignees: state.assignees };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const d = new Date();
    const name = `kaigyo-note-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('書き出しました');
    render();
  }

  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let incoming;
      try { incoming = normalizeState(JSON.parse(reader.result)); } catch (e) { incoming = null; }
      if (!incoming) { toast('読み込めませんでした。このアプリで書き出したJSONを選んでください'); return; }
      const taskCount = incoming.stores.reduce((n, s) => n + s.tasks.length, 0);
      openSheet('JSONを読み込む', `
        <p>ファイルには <b>${incoming.stores.length}店舗・${taskCount}件のタスク</b> が含まれています。</p>
        <div style="display:grid;gap:10px">
          <button class="btn primary" data-action="import-append">今のデータに追加する</button>
          <button class="btn danger" data-action="import-replace">今のデータを置き換える</button>
          <button class="btn" data-action="sheet-close">キャンセル</button>
        </div>
        <p class="hint">置き換えると、今この端末にあるデータは消えます。先に書き出しておくと安全です。</p>`);
      pendingImport = incoming;
    };
    reader.onerror = () => toast('ファイルを読み込めませんでした');
    reader.readAsText(file);
  }
  let pendingImport = null;

  // ===== トースト =====
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ===== イベント =====
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    const store = currentStore();
    switch (action) {
      case 'tab': setTab(el.dataset.tab); break;
      case 'sheet-close': closeSheet(); pendingImport = null; break;
      case 'toggle': {
        const t = store?.tasks.find((x) => x.id === id);
        if (!t) break;
        t.done = !t.done;
        t.doneAt = t.done ? today() : null;
        save(); render();
        break;
      }
      case 'open-task': openTaskSheet(id); break;
      case 'new-task': openTaskSheet(null); break;
      case 'delete-task': {
        const tid = $('#sheet').dataset.taskId;
        if (!store || !confirm('このタスクを削除しますか？')) break;
        store.tasks = store.tasks.filter((x) => x.id !== tid);
        save(); closeSheet(); render(); toast('削除しました');
        break;
      }
      case 'cat': ui.cat = el.dataset.cat; render(); break;
      case 'filter': ui.filter = el.dataset.filter; render(); break;
      case 'go-cat': ui.cat = el.dataset.cat; ui.filter = 'all'; ui.assignee = ''; setTab('tasks'); break;
      case 'go-filter': ui.cat = 'all'; ui.filter = el.dataset.filter; ui.assignee = ''; setTab('tasks'); break;
      case 'new-store': openStoreSheet(null); break;
      case 'edit-store': openStoreSheet(id); break;
      case 'switch-store': state.currentStoreId = id; save(); ui.cat = 'all'; render(); toast('店舗を切り替えました'); break;
      case 'delete-store': {
        const sid = $('#sheet').dataset.storeId;
        const s = state.stores.find((x) => x.id === sid);
        if (!s || !confirm(`「${s.name}」とそのタスク${s.tasks.length}件を削除しますか？元に戻せません。`)) break;
        state.stores = state.stores.filter((x) => x.id !== sid);
        if (state.currentStoreId === sid) state.currentStoreId = state.stores[0]?.id ?? null;
        save(); closeSheet(); render(); toast('店舗を削除しました');
        break;
      }
      case 'export': exportJSON(); break;
      case 'import': $('#importFile').click(); break;
      case 'import-append':
      case 'import-replace': {
        if (!pendingImport) break;
        if (action === 'import-replace') {
          if (!confirm('今のデータをすべて置き換えます。よろしいですか？')) break;
          state = pendingImport;
        } else {
          // ID の重複を避けるため新しい ID を振り直す
          const added = pendingImport.stores.map((s) => ({ ...s, id: uid(), tasks: s.tasks.map((t) => ({ ...t, id: uid() })) }));
          state.stores.push(...added);
          state.assignees = [...new Set([...state.assignees, ...pendingImport.assignees])];
          if (added[0]) state.currentStoreId = added[0].id;
        }
        pendingImport = null;
        save(); closeSheet(); ui.cat = 'all'; render(); toast('読み込みました');
        break;
      }
      case 'remove-assignee':
        state.assignees = state.assignees.filter((n) => n !== el.dataset.name);
        save(); render();
        break;
      case 'reset':
        if (!confirm('すべての店舗とタスクを削除します。元に戻せません。よろしいですか？')) break;
        state = emptyState();
        save(); ui.cat = 'all'; setTab('home'); toast('すべてのデータを削除しました');
        break;
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form);
    if (form.dataset.form === 'assignee') {
      const name = String(fd.get('name') || '').trim().slice(0, 50);
      if (name && !state.assignees.includes(name)) { state.assignees.push(name); save(); }
      render();
      return;
    }
    if (sheetSubmit && sheetSubmit(fd)) { closeSheet(); render(); }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'storeSelect') {
      state.currentStoreId = e.target.value; ui.cat = 'all'; ui.assignee = '';
      save(); render();
    } else if (e.target.id === 'assigneeFilter') {
      ui.assignee = e.target.value; render();
    } else if (e.target.id === 'importFile') {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) handleImportFile(f);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  });

  // 他のタブで変更されたら反映
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) { state = load(); render(); }
  });

  // 日付が変わったら表示を更新（アプリを開いたまま翌日になった場合）
  let lastDay = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && today() !== lastDay) { lastDay = today(); render(); }
  });

  // ===== 起動 =====
  const initial = location.hash.slice(1);
  if (VIEWS[initial]) ui.tab = initial;
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
