(function () {
  'use strict';

  // ================= Telegram =================
  const tg = window.Telegram && window.Telegram.WebApp;
  try {
    if (tg) {
      tg.ready(); tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#04050c');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#04050c');
      if (tg.setBottomBarColor) tg.setBottomBarColor('#04050c');
    }
  } catch (e) {}
  const haptic = k => { try { tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} };
  const notify = k => { try { tg.HapticFeedback.notificationOccurred(k); } catch (e) {} };

  // ================= Источники данных =================
  const params = new URLSearchParams(location.search);
  let SOURCES = params.get('src') ? [params.get('src')] : [
    'https://raw.githubusercontent.com/AntonyPerez0/cs2-pro-configs/main/',
    'https://copyprosta.com/'
  ];
  SOURCES = SOURCES.map(s => s.endsWith('/') ? s : s + '/');
  const TTL = 6 * 3600 * 1000;
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  function fetchText(rel) {
    let i = 0;
    const next = err => {
      if (i >= SOURCES.length) return Promise.reject(err || new Error('нет источников'));
      const url = SOURCES[i++] + rel;
      return fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(t => ({ text: t, base: url.slice(0, url.length - rel.length) })).catch(next);
    };
    return next();
  }
  function cached(rel, key) {
    const c = lsGet(key);
    if (c && Date.now() - c.t < TTL) return Promise.resolve(c.d);
    return fetchText(rel).then(res => { const d = JSON.parse(res.text); lsSet(key, { t: Date.now(), d }); return d; })
      .catch(e => { if (c) { S.stale = true; return c.d; } throw e; });
  }
  function loadMeta() {   // аналитика лежит рядом с приложением (meta.json), необязательна
    return fetch('meta.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  // ================= Состояние =================
  const S = { stale: false, simW: null, players: [], by: {}, xh: {}, top: null, generated: '', meta: null, F: {}, teamOf: {}, inTeam: new Set(),
    mode: 'all', sort: 'az', q: '', favs: lsGet('favs') || [], shown: 0, view: [], base: SOURCES[0], nav: 'players',
    flt: {}, pop: 'all', popTab: 'mouse', cmp: { a: null, b: null, only: false }, updFilter: 'all', updShown: 40, full: {} };
  const $ = id => document.getElementById(id);
  const PAGE = 30;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/[^0-9a-zа-яё]+/g, '');
  const numOf = x => { const v = parseFloat(String(x == null ? '' : x).replace(',', '.')); return isFinite(v) ? v : null; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ================= Звёздное небо =================
  (function sky() {
    const c = $('sky'), x = c.getContext('2d');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars = [], W = 0, H = 0, shoot = null, last = 0, running = true;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(150, W * H / 7000));
      stars = [];
      for (let i = 0; i < n; i++) {
        const z = Math.random();
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: .3 + z * 1.2, v: 2 + z * 9, ph: Math.random() * 6.28, sp: .6 + Math.random() * 1.8,
          hue: Math.random() < .2 ? '170,210,255' : (Math.random() < .15 ? '255,200,240' : '255,255,255') });
      }
    }
    function frame(t) {
      if (!running) return;
      const dt = Math.min((t - last) / 1000, .05); last = t;
      x.clearRect(0, 0, W, H);
      for (const s of stars) {
        if (!reduce) { s.y += s.v * dt; if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; } }
        const a = .45 + .55 * Math.abs(Math.sin(t / 1000 * s.sp + s.ph));
        x.fillStyle = 'rgba(' + s.hue + ',' + (a * (.35 + s.r / 2)).toFixed(3) + ')';
        x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill();
      }
      if (!reduce) {
        if (!shoot && Math.random() < .004) shoot = { x: Math.random() * W * .8 + W * .2, y: Math.random() * H * .35, l: 0 };
        if (shoot) {
          shoot.x -= 520 * dt; shoot.y += 260 * dt; shoot.l += dt;
          const g = x.createLinearGradient(shoot.x, shoot.y, shoot.x + 90, shoot.y - 45);
          g.addColorStop(0, 'rgba(160,230,255,.9)'); g.addColorStop(1, 'rgba(160,230,255,0)');
          x.strokeStyle = g; x.lineWidth = 1.6; x.beginPath(); x.moveTo(shoot.x, shoot.y); x.lineTo(shoot.x + 90, shoot.y - 45); x.stroke();
          if (shoot.l > 1.1) shoot = null;
        }
      }
      requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });
    requestAnimationFrame(frame);
  })();

  // ================= Подписи =================
  const LABELS = {
    'DPI': 'DPI', 'Mouse Sensitivity': 'Чувствительность', 'Zoom Sensitivity Multiplier': 'Множитель прицеливания', 'Polling rate': 'Частота опроса',
    'Brightness': 'Яркость', 'Scaling mode': 'Режим масштабирования', 'Aspect Ratio': 'Соотношение сторон', 'Resolution': 'Разрешение', 'Display Mode': 'Режим экрана',
    'Boost Player Contrast': 'Контрастность игроков', 'V-Sync': 'Верт. синхронизация', 'Multisampling Anti-Aliasing Mode': 'Сглаживание (MSAA)',
    'Global Shadow Quality': 'Качество теней', 'Model / Texture Detail': 'Модели / текстуры', 'Texture Filtering Mode': 'Фильтрация текстур',
    'Shader Detail': 'Шейдеры', 'Particle Detail': 'Частицы', 'Dynamic Shadows': 'Динамические тени', 'Ambient Occlusion': 'Ambient Occlusion',
    'High Dynamic Range': 'HDR', 'FidelityFX Super Resolution': 'FSR', 'NVIDIA Reflex Low Latency': 'NVIDIA Reflex'
  };
  const VALUES = { 'Enabled': 'Вкл', 'Disabled': 'Выкл', 'Fullscreen': 'Полный экран', 'Stretched': 'Растянутый', 'Black Bars': 'Чёрные полосы', 'Windowed': 'Оконный',
    'Fullscreen Windowed': 'Окно без рамки', 'Low': 'Низко', 'Medium': 'Средне', 'High': 'Высоко', 'Very High': 'Очень высоко', 'Quality': 'Качество', 'Performance': 'Производительность',
    'All': 'Все', 'Bilinear': 'Билинейная', 'Trilinear': 'Трилинейная', 'Enabled + Boost': 'Вкл + Boost' };
  const CV = { 'sensitivity': 'Чувствительность', 'zoom_sensitivity_ratio': 'Множитель прицеливания', 'm_yaw': 'm_yaw', 'm_pitch': 'm_pitch', 'viewmodel_fov': 'Viewmodel FOV',
    'viewmodel_offset_x': 'Viewmodel X', 'viewmodel_offset_y': 'Viewmodel Y', 'viewmodel_offset_z': 'Viewmodel Z', 'viewmodel_presetpos': 'Пресет viewmodel', 'fps_max': 'fps_max',
    'cl_radar_scale': 'Масштаб радара', 'cl_hud_color': 'Цвет HUD', 'hud_scaling': 'Масштаб HUD', 'cl_radar_rotate': 'Вращение радара', 'launch': 'Параметры запуска', 'xh': 'Прицел' };
  const WARN = {
    'pixel-centering-shift': 'нечётная ширина линий: прицел в новой игре может сместиться на 1 px',
    'visible-minimum': 'у старого прицела толщина 0 всё равно рисовала тонкую линию, толщина увеличена',
    'outline-zero-width': 'нулевая обводка выключена', 'outline-half-mapping': 'тонкая обводка заменена половинной',
    'outline-replacement-unverified': 'полная обводка не сверена со скриншотами игры', 'additive-blend-approximated': 'прозрачность пересчитана приблизительно',
    'crossed-arms-folded': 'отрицательный зазор пересчитан (линии были перекрещены)', 'weapon-gap-dropped': 'зазор «по оружию» убран: в новой игре он один',
    'outline-overpaint-lost': 'мелкие отличия в обводке', 'legacy-style-5-gap': 'стиль 5: зазор вычислен по старой формуле, не проверено в игре',
    'style-family-experimental': 'динамический стиль: насколько расширяется при стрельбе, не проверено',
    'dot-only-as-arms': 'была только точка: добавлены нулевые линии', 'old-shape-not-drawable': 'точно такой же прицел в новой игре нарисовать нельзя, подобран ближайший',
    'aim-shape-preserved': 'приоритет отдан центру прицела, обводка может отличаться', 'zero-length-outline-dropped': 'обводка вокруг нулевых линий не поддерживается, подобран ближайший вариант',
    'style-dynamic-at-rest': 'старый динамический стиль заменён статичным', 'appearance-refined': 'размеры слегка подобраны под внешний вид',
    'outline-asymmetric-approx': 'асимметричная обводка заменена симметричной 1 px', 'color-index-default': 'нестандартный индекс цвета, использован зелёный по умолчанию'
  };
  const XSTYLE = { 4: 'Static Cross (4)', 5: 'Dynamic Cross (5)' };
  const XOUT = { 0: 'нет', 1: 'полная', 2: 'половинная' };
  const PRESET = { 1: 'Desktop', 2: 'Couch', 3: 'Classic' };
  const GFX = [['msaa', 'Сглаживание (MSAA)'], ['shq', 'Качество теней'], ['tex', 'Модели / текстуры'], ['flt', 'Фильтрация текстур'], ['shd', 'Шейдеры'], ['prt', 'Частицы'],
    ['dsh', 'Динамические тени'], ['ao', 'Ambient Occlusion'], ['hdr', 'HDR'], ['fsr', 'FSR'], ['bpc', 'Контрастность игроков'], ['vs', 'V-Sync'], ['rfx', 'NVIDIA Reflex']];
  const tr = v => VALUES[v] || v;

  // ================= Вспомогательное =================
  function parseCfg(t) { return t.split(/\r?\n/).map(l => l.trim()).filter(l => l && l.indexOf('//') !== 0); }
  function chunk(cmds, limit) {
    limit = limit || 500; const parts = []; let cur = [];
    cmds.forEach(c => { if (cur.length && cur.concat([c]).join('; ').length > limit) { parts.push(cur); cur = []; } cur.push(c); });
    if (cur.length) parts.push(cur);
    return parts.map(p => p.join('; '));
  }
  function splitSections(cmds) {
    const r = { xh: [], ms: [], vm: [], hud: [] };
    cmds.forEach(c => {
      const k = c.split(/\s+/)[0];
      if (/^(cl_crosshair|cl_ironsight)/.test(k)) r.xh.push(c);
      else if (/^(sensitivity|zoom_sensitivity_ratio|m_yaw|m_pitch)$/.test(k)) r.ms.push(c);
      else if (/^viewmodel_/.test(k)) r.vm.push(c);
      else r.hud.push(c);
    });
    return r;
  }
  const kvOf = cmds => { const o = {}; cmds.forEach(c => { const p = c.split(/\s+/); o[p[0]] = p.slice(1).join(' '); }); return o; };
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const quant = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : null; };
  const ruDate = d => { const p = String(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d; };
  const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };

  let toastT;
  function toast(msg, bad) {
    const t = $('toast'); t.textContent = msg; t.style.background = bad ? 'var(--amber)' : ''; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2000);
  }
  function copyText(text) {
    const done = () => { toast('Скопировано — вставьте в консоль CS2'); notify('success'); };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(ta);
        ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
      } catch (e) { toast('Не удалось скопировать — выделите текст вручную', true); }
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }

  // ---- аватар / строка игрока
  const initial = p => esc((p.nick || '?').charAt(0).toUpperCase());
  function avatarHtml(p, cls) {
    const src = p.avatar ? S.base + p.avatar : '';
    return '<div class="av ' + (cls || '') + '">' + (src ? '<img loading="lazy" alt="' + initial(p) + '" src="' + esc(src) + '" onerror="var d=document.createElement(\'div\');d.textContent=this.alt;this.replaceWith(d)">' : '<div>' + initial(p) + '</div>') + '</div>';
  }
  function teamName(slug) { const t = S.teamOf[slug]; return t ? t.n : ''; }
  function rowHtml(p, i, right, extraCls) {
    const sub = p._team || teamName(p.slug) || p.real_name || '';
    const r = right === undefined ? (p.edpi ? '<span class="pill">eDPI ' + esc(p.edpi) + '</span>' : '') : right;
    return '<button class="row ' + (extraCls || '') + '" type="button" data-s="' + esc(p.slug) + '" style="animation-delay:' + Math.min(i % PAGE, 12) * 18 + 'ms">' +
      (p._rank ? '<span class="rank">' + p._rank + '</span>' : '') + avatarHtml(p) +
      '<span class="who"><b>' + esc(p.nick) + (S.favs.indexOf(p.slug) >= 0 ? ' <span class="fav">★</span>' : '') + '</b><small>' + esc(sub) + '</small></span>' + r + '</button>';
  }
  function emptyHtml(icon, title, text) { return '<div class="empty"><div class="big">' + icon + '</div><b>' + esc(title) + '</b><p>' + esc(text) + '</p></div>'; }

  // ================= Игроки: список, поиск, фильтры =================
  function matchRank(p, q) {
    const n = norm(p.nick), s = norm(p.slug), r = norm(p.real_name), t = norm(teamName(p.slug));
    if (q === n || q === s) return 0;
    if (n.indexOf(q) === 0 || s.indexOf(q) === 0) return 1;
    if (n.indexOf(q) >= 0 || s.indexOf(q) >= 0) return 2;
    if (r.indexOf(q) >= 0) return 3;
    if (t && t.indexOf(q) >= 0) return 4;
    return -1;
  }
  const fltActive = () => Object.keys(S.flt).filter(k => S.flt[k] !== '' && S.flt[k] != null && S.flt[k] !== false && k !== 'near').length;
  function passFilter(p) {
    const f = S.flt, x = S.F[p.slug] || {};
    if (f.team && !S.inTeam.has(p.slug)) return false;
    const e = x.edpi;
    if (f.emin !== '' && f.emin != null && !(e >= +f.emin)) return false;
    if (f.emax !== '' && f.emax != null && !(e <= +f.emax)) return false;
    if (f.fmin !== '' && f.fmin != null && !(x.fov >= +f.fmin)) return false;
    if (f.fmax !== '' && f.fmax != null && !(x.fov <= +f.fmax)) return false;
    if (f.res && x.res !== f.res) return false;
    if (f.ar && x.ar !== f.ar) return false;
    if (f.ps && String(x.ps) !== f.ps) return false;
    if (f.xs && String(x.xs) !== f.xs) return false;
    if (f.xc && x.xc !== f.xc) return false;
    return true;
  }
  function buildView() {
    const q = norm(S.q); let list;
    if (S.mode === 'top') {
      list = ((S.top && S.top.players) || []).map(t => { const p = S.by[t.slug]; return p ? Object.assign({ _rank: t.rank, _team: teamName(t.slug) || t.team }, p) : null; }).filter(Boolean);
    } else if (S.mode === 'fav') list = S.favs.map(s => S.by[s]).filter(Boolean);
    else list = S.players.slice();
    if (fltActive()) list = list.filter(passFilter);
    if (q) {
      list = list.map(p => ({ p, r: matchRank(p, q) })).filter(o => o.r >= 0)
        .sort((a, b) => a.r - b.r || a.p.nick.toLowerCase().localeCompare(b.p.nick.toLowerCase())).map(o => o.p);
    } else if (S.mode !== 'top') {
      const near = S.flt.near === 'edpi' && (S.flt.emin !== '' || S.flt.emax !== '');
      if (near) {
        const lo = numOf(S.flt.emin), hi = numOf(S.flt.emax), mid = lo != null && hi != null ? (lo + hi) / 2 : (lo != null ? lo : hi);
        list.sort((a, b) => Math.abs((a.edpi || 1e9) - mid) - Math.abs((b.edpi || 1e9) - mid));
      } else if (S.sort === 'az') list.sort((a, b) => a.nick.toLowerCase().localeCompare(b.nick.toLowerCase()));
      else list.sort((a, b) => S.sort === 'lo' ? (a.edpi || 1e9) - (b.edpi || 1e9) : (b.edpi || 0) - (a.edpi || 0));
    }
    S.view = list;
  }
  function renderList(reset) {
    const el = $('list');
    if (reset) { buildView(); S.shown = 0; el.innerHTML = ''; }
    const next = S.view.slice(S.shown, S.shown + PAGE);
    el.insertAdjacentHTML('beforeend', next.map((p, i) => rowHtml(p, S.shown + i)).join(''));
    S.shown += next.length;
    $('count').textContent = S.view.length ? 'Игроков: ' + S.view.length : '';
    if (reset && !S.view.length) {
      el.innerHTML = S.mode === 'fav' && !S.q && !fltActive() ? emptyHtml('★', 'Пока пусто', 'Откройте игрока и нажмите звёздочку, чтобы сохранить его здесь.')
        : emptyHtml('🔭', 'В этой галактике никого нет', fltActive() ? 'Попробуйте ослабить фильтры.' : 'Попробуйте другой ник, имя или команду.');
    }
    const b = $('fltBtn'); const n = fltActive();
    b.textContent = '🔧 Подбор по параметрам' + (n ? ' · ' + n : ''); b.classList.toggle('on', n > 0 && !$('fltPanel').hidden);
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(e => { if (e[0].isIntersecting && S.nav === 'players' && S.shown < S.view.length) renderList(false); }, { rootMargin: '400px' }) : null;
  if (io) io.observe($('more'));

  function fillFilterOptions() {
    const count = key => { const m = {}; Object.keys(S.F).forEach(s => { const v = S.F[s][key]; if (v != null && v !== '') m[v] = (m[v] || 0) + 1; }); return Object.keys(m).sort((a, b) => m[b] - m[a]).map(v => [v, m[v]]); };
    const opt = (rows, any, fmt) => '<option value="">' + any + '</option>' + rows.map(r => '<option value="' + esc(r[0]) + '">' + esc(fmt ? fmt(r[0]) : r[0]) + ' · ' + r[1] + '</option>').join('');
    const q = k => document.querySelector('[data-f="' + k + '"]');
    q('res').innerHTML = opt(count('res').slice(0, 14), 'любое');
    q('ar').innerHTML = opt(count('ar'), 'любое');
    q('xs').innerHTML = opt(count('xs'), 'любой', v => XSTYLE[v] || 'Стиль ' + v);
    q('xc').innerHTML = opt(count('xc'), 'любой');
  }

  // ================= Команды =================
  function renderTeams() {
    const el = $('tlist'), m = S.meta;
    if (!m || !m.teams) { el.innerHTML = emptyHtml('🛰', 'Данные о командах недоступны', 'Файл meta.json не найден рядом с приложением. Загрузите его на GitHub Pages (см. инструкцию).'); $('tcount').textContent = ''; return; }
    const q = norm($('tq').value);
    const list = m.teams.list.map((t, i) => ({ t, i })).filter(o => {
      if (!q) return true;
      if (norm(o.t.n).indexOf(q) >= 0) return true;
      return o.t.p.some(s => norm(S.by[s] && S.by[s].nick).indexOf(q) >= 0) || o.t.m.some(n => norm(n).indexOf(q) >= 0);
    });
    $('tcount').textContent = 'Команд: ' + list.length + (m.teams.asOf ? ' · составы на ' + ruDate(m.teams.asOf) : '');
    el.innerHTML = list.length ? list.map((o, k) => {
      const t = o.t, ps = t.p.map(s => S.by[s]).filter(Boolean);
      return '<button class="team" type="button" data-team="' + o.i + '" style="animation-delay:' + Math.min(k, 12) * 18 + 'ms"><span class="rank">' + t.r + '</span>' +
        '<span class="stack">' + ps.slice(0, 5).map(p => avatarHtml(p, 'sm')).join('') + '</span>' +
        '<span class="who"><b>' + esc(t.n) + '</b><small>' + ps.length + ' из ' + (ps.length + t.m.length) + ' в базе' + '</small></span><span class="pill">#' + t.r + '</span></button>';
    }).join('') : emptyHtml('🔭', 'Ничего не найдено', 'Попробуйте другое название или ник.');
  }

  // ================= Популярное =================
  const POP = {
    mouse: [['dpi', 'DPI'], ['sens', 'Чувствительность в игре'], ['eb', 'eDPI (диапазоны по 100)'], ['poll', 'Частота опроса мыши']],
    screen: [['res', 'Разрешение'], ['ar', 'Соотношение сторон'], ['sc', 'Режим масштабирования'], ['dm', 'Режим экрана']],
    vm: [['fov', 'Viewmodel FOV'], ['ps', 'Пресет позиции'], ['off', 'Сдвиг X / Y / Z']],
    xh: [['xs', 'Стиль'], ['xc', 'Цвет'], ['xl', 'Длина'], ['xt', 'Толщина'], ['xg', 'Зазор'], ['xd', 'Центральная точка'], ['xo', 'Обводка']],
    gfx: GFX.concat([['fps', 'fps_max'], ['lo', 'Параметры запуска']])
  };
  function dispVal(key, v) {
    if (key === 'xs') return XSTYLE[v] || 'Стиль ' + v;
    if (key === 'ps') return v + ' · ' + (PRESET[v] || 'свой');
    if (key === 'xd') return +v ? 'есть' : 'нет';
    if (key === 'xo') return XOUT[v] != null ? XOUT[v] : v;
    if (key === 'dpi') return v + ' DPI';
    return tr(v);
  }
  const popPlayers = () => S.pop === 'team' ? S.players.filter(p => S.inTeam.has(p.slug)) : S.players;
  function valueMap(key, pop) {
    const m = {};
    pop.forEach(p => { const v = (S.F[p.slug] || {})[key]; if (v != null && v !== '') (m[v] = m[v] || []).push(p.slug); });
    return m;
  }
  function renderPop() {
    const el = $('v-pop');
    if (!S.meta) { el.innerHTML = emptyHtml('📊', 'Аналитика недоступна', 'Файл meta.json не найден рядом с приложением.'); return; }
    const pop = popPlayers();
    const ed = pop.map(p => (S.F[p.slug] || {}).edpi).filter(v => v != null);
    const tabs = [['mouse', '🖱 Мышь'], ['screen', '🖥 Экран'], ['vm', '🔫 Viewmodel'], ['xh', '🎯 Прицел'], ['gfx', '⚙️ Графика']];
    let h = '<div class="seg"><button type="button" data-popsel="all" class="' + (S.pop === 'all' ? 'on' : '') + '">Все (' + S.players.length + ')</button>' +
      '<button type="button" data-popsel="team" class="' + (S.pop === 'team' ? 'on' : '') + '">Игроки команд (' + S.inTeam.size + ')</button></div>';
    h += '<div class="stat3"><div class="tile"><b>' + (median(ed) != null ? Math.round(median(ed)) : '—') + '</b><span>медиана eDPI</span></div>' +
      '<div class="tile"><b>' + (ed.length ? Math.round(quant(ed, .25)) + '–' + Math.round(quant(ed, .75)) : '—') + '</b><span>у половины игроков</span></div>' +
      '<div class="tile"><b>' + pop.length + '</b><span>в выборке</span></div></div>';
    h += '<div class="chips">' + tabs.map(t => '<button class="chip' + (S.popTab === t[0] ? ' on' : '') + '" type="button" data-poptab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    POP[S.popTab].forEach(def => {
      const key = def[0];
      let vm = key === 'eb' ? (() => { const m = {}; pop.forEach(p => { const e = (S.F[p.slug] || {}).edpi; if (e != null) { const b = Math.floor(e / 100) * 100; (m[b + '–' + (b + 99)] = m[b + '–' + (b + 99)] || []).push(p.slug); } }); return m; })() : valueMap(key, pop);
      const entries = Object.keys(vm).map(v => [v, vm[v]]).sort((a, b) => b[1].length - a[1].length);
      const total = entries.reduce((s, e) => s + e[1].length, 0);
      if (!total) return;
      const top = entries.slice(0, 6), maxN = top[0][1].length;
      h += '<div class="card"><h3>' + esc(def[1]) + '</h3>' + top.map(e => {
        const n = e[1].length, pct = Math.round(n * 100 / total);
        return '<button class="pb" type="button" data-pop="' + esc(key) + '|' + esc(e[0]) + '" style="--w:' + (n * 100 / maxN).toFixed(1) + '%"><i></i><span>' + esc(key === 'eb' ? e[0] : dispVal(key, e[0])) + '</span><b>' + n + ' · ' + pct + '%</b></button>';
      }).join('') + (entries.length > 6 ? '<p class="hint">и ещё ' + (entries.length - 6) + ' ' + plural(entries.length - 6, 'значение', 'значения', 'значений') + '</p>' : '') + '</div>';
    });
    h += '<div class="note">Нажмите на строку, чтобы увидеть игроков с этим значением. Статистика считается по данным от ' + esc(ruDate(S.meta.source_generated)) + '.</div>';
    el.innerHTML = h;
  }
  function popList(key, val) {
    const pop = popPlayers(); let slugs;
    if (key === 'eb') { const lo = parseInt(val, 10); slugs = pop.filter(p => { const e = (S.F[p.slug] || {}).edpi; return e != null && e >= lo && e <= lo + 99; }).map(p => p.slug); }
    else slugs = pop.filter(p => String((S.F[p.slug] || {})[key]) === String(val)).map(p => p.slug);
    const def = [].concat.apply([], Object.keys(POP).map(k => POP[k])).filter(d => d[0] === key)[0] || [key, key];
    openOv({ t: 'list', title: (key === 'eb' ? 'eDPI ' + val : dispVal(key, val)), sub: def[1] + ' · игроков: ' + slugs.length, slugs });
  }

  // ================= Похожие игроки =================
  const CATS = [['sens', '🖱 Чувствительность'], ['scr', '🖥 Экран'], ['vm', '🔫 Viewmodel'], ['xh', '🎯 Прицел'], ['gfx', '⚙️ Графика']];
  const clamp01 = x => Math.max(0, Math.min(1, x));
  function simCat(cat, a, b) {
    if (cat === 'sens') { if (!a.edpi || !b.edpi) return null; return clamp01(1 - Math.abs(Math.log(a.edpi / b.edpi)) / 0.4); }
    if (cat === 'scr') {
      if (!a.res && !a.ar) return null;
      const base = a.res && a.res === b.res ? 1 : (a.ar && a.ar === b.ar ? .55 : 0);
      return a.sc && b.sc ? .85 * base + .15 * (a.sc === b.sc ? 1 : 0) : base;
    }
    if (cat === 'vm') {
      if (a.fov == null || b.fov == null) return null;
      const fovS = clamp01(1 - Math.abs(a.fov - b.fov) / 15);
      if (a.ox == null || b.ox == null) return fovS;
      const dist = Math.sqrt(Math.pow(a.ox - b.ox, 2) + Math.pow((a.oy || 0) - (b.oy || 0), 2) + Math.pow((a.oz || 0) - (b.oz || 0), 2));
      return .35 * fovS + .65 * clamp01(1 - dist / 5);
    }
    if (cat === 'xh') {
      if (a.xs == null || b.xs == null) return null;
      const parts = [[.2, a.xs === b.xs ? 1 : 0], [.2, a.xl != null && b.xl != null ? clamp01(1 - Math.abs(a.xl - b.xl) / 4) : null],
        [.15, a.xt != null && b.xt != null ? clamp01(1 - Math.abs(a.xt - b.xt) / 3) : null], [.15, a.xg != null && b.xg != null ? clamp01(1 - Math.abs(a.xg - b.xg) / 6) : null],
        [.15, a.xc && b.xc ? (a.xc === b.xc ? 1 : 0) : null], [.075, a.xd != null && b.xd != null ? (a.xd === b.xd ? 1 : 0) : null], [.075, a.xo != null && b.xo != null ? (a.xo === b.xo ? 1 : 0) : null]];
      let w = 0, s = 0; parts.forEach(p => { if (p[1] != null) { w += p[0]; s += p[0] * p[1]; } });
      return w ? s / w : null;
    }
    if (cat === 'gfx') {
      let n = 0, m = 0; GFX.forEach(g => { if (a[g[0]] != null && b[g[0]] != null) { n++; if (a[g[0]] === b[g[0]]) m++; } });
      return n >= 4 ? m / n : null;
    }
    return null;
  }
  const CAT_INFO = {
    sens: 'eDPI: чем ближе значения (в процентах), тем выше сходство. Разница в 40% и больше даёт 0.',
    scr: 'Совпадение разрешения (полное) или хотя бы соотношения сторон (частичное), плюс режим масштабирования.',
    vm: 'Viewmodel: FOV (35%) и расстояние между позициями X/Y/Z (65%).',
    xh: 'Прицел: стиль, длина, толщина, зазор, цвет, точка, обводка. Близкие числа дают частичные баллы.',
    gfx: 'Доля совпавших пунктов расширенных видеонастроек (тени, MSAA, шейдеры и т. д.). Нужно минимум 4 известных пункта.'
  };
  function simWeights() {
    if (!S.simW) { S.simW = lsGet('simw') || {}; CATS.forEach(c => { if (typeof S.simW[c[0]] !== 'number') S.simW[c[0]] = 1; }); }
    return S.simW;
  }
  function similar(slug, onlyTeams) {
    const a = S.F[slug]; if (!a) return [];
    const W = simWeights(), out = [];
    S.players.forEach(p => {
      if (p.slug === slug || (onlyTeams && !S.inTeam.has(p.slug))) return;
      const b = S.F[p.slug]; if (!b) return;
      const per = {}; let sum = 0, w = 0;
      CATS.forEach(c => { const k = c[0]; if (!W[k]) return; const v = simCat(k, a, b); if (v != null) { per[k] = v; sum += v * W[k]; w += W[k]; } });
      if (w) out.push({ p, score: sum / w, per });
    });
    return out.sort((x, y) => y.score - x.score).slice(0, 15);
  }

  // ================= Сравнение =================
  function loadFull(slug) {
    if (S.full[slug]) return Promise.resolve(S.full[slug]);
    return Promise.all([
      fetchText('data/players/' + encodeURIComponent(slug) + '.json').then(r => JSON.parse(r.text)),
      fetchText('cfg/' + encodeURIComponent(slug) + '.cfg').then(r => r.text).catch(() => '')
    ]).then(r => (S.full[slug] = { p: S.by[slug], d: r[0], cfg: parseCfg(r[1]) }));
  }
  function groupsFor(L) {
    const p = L.p, d = L.d, T = d.tables || {}, M = T.Mouse || {}, V = T['Video Settings'] || {}, A = T['Advanced Video'] || {};
    const cfg = kvOf(L.cfg), xhk = kvOf(L.cfg.filter(c => /^(cl_crosshair|cl_ironsight)/.test(c.split(/\s+/)[0])));
    const xhS = S.xh[p.slug] || {}, xk = Object.keys(xhk).length ? xhk : kvOf(xhS.commands || []);
    const sens = numOf(M['Mouse Sensitivity'] || p.sens), dpi = numOf(M.DPI || p.dpi), yaw = numOf(cfg.m_yaw) || 0.022;
    const cm = sens && dpi ? (360 / (yaw * sens * dpi) * 2.54).toFixed(1) : null;
    const G = [];
    G.push(['🖱 Мышь', [['DPI', M.DPI || p.dpi], ['Чувствительность', M['Mouse Sensitivity'] || p.sens], ['eDPI', p.edpi], ['См на 360°', cm],
      ['Множитель прицеливания', M['Zoom Sensitivity Multiplier'] || cfg.zoom_sensitivity_ratio], ['Частота опроса', M['Polling rate']], ['m_yaw', cfg.m_yaw]]]);
    G.push(['🖥 Экран', Object.keys(V).map(k => [LABELS[k] || k, tr(V[k])])]);
    G.push(['🔫 Viewmodel', [['FOV', cfg.viewmodel_fov], ['Сдвиг X', cfg.viewmodel_offset_x], ['Сдвиг Y', cfg.viewmodel_offset_y], ['Сдвиг Z', cfg.viewmodel_offset_z],
      ['Пресет', cfg.viewmodel_presetpos ? cfg.viewmodel_presetpos + ' · ' + (PRESET[cfg.viewmodel_presetpos] || 'свой') : null]]]);
    const rgb = xk.cl_crosshaircolor_r != null ? [xk.cl_crosshaircolor_r, xk.cl_crosshaircolor_g, xk.cl_crosshaircolor_b].join(',') : null;
    G.push(['🎯 Прицел (CS2)', [['Стиль', xk.cl_crosshairstyle != null ? (XSTYLE[xk.cl_crosshairstyle] || 'Стиль ' + xk.cl_crosshairstyle) : null], ['Длина', xk.cl_crosshair_length], ['Толщина', xk.cl_crosshair_thickness],
      ['Зазор', xk.cl_crosshair_gap], ['Цвет (RGB)', rgb], ['Прозрачность', xk.cl_crosshaircolor_a], ['Точка', xk.cl_crosshairdot != null ? (+xk.cl_crosshairdot ? 'да' : 'нет') : null],
      ['T-стиль', xk.cl_crosshair_t != null ? (+xk.cl_crosshair_t ? 'да' : 'нет') : null], ['Обводка', xk.cl_crosshair_drawoutline != null ? (XOUT[xk.cl_crosshair_drawoutline] || xk.cl_crosshair_drawoutline) : null],
      ['Отдача', xk.cl_crosshair_recoil != null ? (+xk.cl_crosshair_recoil ? 'да' : 'нет') : null], ['Высота экрана для прицела', xk.cl_crosshair_screen_height]]]);
    G.push(['⚙️ Графика', Object.keys(A).map(k => [LABELS[k] || k, tr(A[k])]).concat([['fps_max', cfg.fps_max], ['Параметры запуска', d.launch_options]])]);
    const handled = /^(cl_crosshair|cl_ironsight|sensitivity|zoom_sensitivity_ratio|m_yaw|m_pitch|viewmodel_|fps_max)/;
    const other = L.cfg.filter(c => !handled.test(c.split(/\s+/)[0])).map(c => { const q = c.split(/\s+/); return [q[0], q.slice(1).join(' ')]; });
    G.push(['🧭 HUD, радар и прочее', other]);
    return G;
  }
  const sameVal = (a, b) => { if (a == null || b == null) return false; const x = numOf(a), y = numOf(b); return x != null && y != null && /^-?[\d.,]+$/.test(String(a).trim()) && /^-?[\d.,]+$/.test(String(b).trim()) ? x === y : String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); };
  function cellHtml(label, v, hi) {
    if (v == null || v === '') return '<b class="d">—</b>';
    if (/^Цвет/.test(label) && /^\d+,\d+,\d+$/.test(v)) return '<b' + (hi ? ' class="hi"' : '') + '><span class="sw" style="background:rgb(' + v + ')"></span>' + esc(v.replace(/,/g, ' '))+ '</b>';
    return '<b' + (hi ? ' class="hi"' : '') + '>' + esc(v) + '</b>';
  }
  function slotHtml(which) {
    const slug = S.cmp[which], p = slug && S.by[slug];
    if (!p) return '<button class="slot" type="button" data-act="pick" data-slot="' + which + '"><span class="plus">+</span><b>Игрок ' + (which === 'a' ? '1' : '2') + '</b><small>выбрать</small></button>';
    return '<button class="slot has" type="button" data-act="pick" data-slot="' + which + '">' + avatarHtml(p) + '<b>' + esc(p.nick) + '</b><small>' + esc(teamName(slug) || p.real_name || '') + '</small></button>';
  }
  function renderCmp() {
    const el = $('v-cmp'), a = S.cmp.a, b = S.cmp.b;
    let h = '<div class="slots">' + slotHtml('a') + '<button class="round swap" type="button" data-act="swap" aria-label="Поменять местами">⇄</button>' + slotHtml('b') + '</div>';
    if (!a || !b) {
      h += emptyHtml('⚖️', 'Выберите двух игроков', 'Сравним мышь, экран, viewmodel, прицел, графику и HUD по всем параметрам. Игрока можно добавить и из его карточки кнопкой «Сравнить».');
      el.innerHTML = h; return;
    }
    el.innerHTML = h + '<div class="sk"></div><div class="sk" style="margin-top:9px"></div>';
    Promise.all([loadFull(a), loadFull(b)]).then(r => {
      if (S.cmp.a !== a || S.cmp.b !== b || S.nav !== 'cmp') return;
      const GA = groupsFor(r[0]), GB = groupsFor(r[1]);
      let total = 0, same = 0, body = '';
      GA.forEach((ga, gi) => {
        const mb = {}; GB[gi][1].forEach(x => { mb[x[0]] = x[1]; });
        const labels = ga[1].map(x => x[0]); GB[gi][1].forEach(x => { if (labels.indexOf(x[0]) < 0) labels.push(x[0]); });
        const ma = {}; ga[1].forEach(x => { ma[x[0]] = x[1]; });
        let rows = '', gDiff = 0;
        labels.forEach(l => {
          const va = ma[l], vb = mb[l];
          if ((va == null || va === '') && (vb == null || vb === '')) return;
          const eq = sameVal(va, vb); total++; if (eq) same++; else gDiff++;
          if (S.cmp.only && eq) return;
          rows += '<div class="cr' + (eq ? '' : ' diff') + '"><span class="lb">' + esc(l) + '</span>' + cellHtml(l, va, !eq) + cellHtml(l, vb, !eq) + '</div>';
        });
        if (rows) body += '<div class="card"><h3>' + esc(ga[0]) + (gDiff ? ' · различий: ' + gDiff : '') + '</h3>' + rows + '</div>';
      });
      const pc = total ? Math.round(same * 100 / total) : 0;
      el.innerHTML = h + '<div class="card"><div class="cmp-sum"><div style="flex:none"><b style="font-size:26px;font-family:var(--mono);color:var(--cyan)">' + pc + '%</b><div class="hint" style="margin:0">совпадает</div></div>' +
        '<div style="flex:1"><div class="meter" style="--w:' + pc + '%"><i></i></div><p class="hint">Совпало ' + same + ' из ' + total + ' параметров. Различия подсвечены.</p></div></div>' +
        '<div class="acts" style="margin-top:10px"><button class="btn ' + (S.cmp.only ? '' : 'ghost') + ' sm" type="button" data-act="only">' + (S.cmp.only ? '✓ ' : '') + 'Только различия</button></div></div>' + (body || emptyHtml('🎉', 'Настройки совпадают', 'Различий не найдено.'));
    }).catch(() => { if (S.nav === 'cmp') el.innerHTML = h + '<div class="error"><p>Не удалось загрузить настройки игроков.</p><button class="btn" type="button" data-act="cmpretry">Повторить</button></div>'; });
  }

  // ================= Обновления =================
  const seenKey = 'seen_upd';
  function newestEventDate() { const c = (S.meta && S.meta.changes) || []; return c.reduce((m, e) => e.d > m ? e.d : m, ''); }
  function unseenCount() { const seen = lsGet(seenKey); if (!seen) return 0; return ((S.meta && S.meta.changes) || []).filter(e => e.d > seen).length; }
  function updateBadge() { const n = unseenCount(), b = $('badge'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; }
  function chLabel(k) {
    if (CV[k]) return CV[k];
    if (k.indexOf('cv.') === 0) return CV[k.slice(3)] || k.slice(3);
    const i = k.indexOf('.'); if (i > 0) { const row = k.slice(i + 1); return LABELS[row] || row; }
    return k;
  }
  const chVal = v => { if (v == null || v === '') return '—'; v = String(tr(v)); return v.length > 70 ? v.slice(0, 67) + '…' : v; };
  function eventHtml(e, fresh, compact) {
    const p = S.by[e.s]; if (!p) return '';
    let body = '';
    if (e.n) body = '<ul><li>🆕 Игрок добавлен в базу</li></ul>';
    else {
      const items = (e.k || []).slice(0, 6).map(c => c[0] === 'xh' ? '<li>🎯 Изменён прицел</li>' : '<li>' + esc(chLabel(c[0])) + ': <s>' + esc(chVal(c[1])) + '</s> → <em>' + esc(chVal(c[2])) + '</em></li>').join('');
      const more = (e.k || []).length > 6 ? '<li>…и ещё ' + ((e.k || []).length - 6) + '</li>' : '';
      body = '<ul>' + items + more + '</ul>';
    }
    if (compact) return '<div class="ev' + (fresh ? ' fresh' : '') + '"><div class="day" style="margin:0 0 6px">' + esc(ruDate(e.d)) + '</div>' + body + '</div>';
    return '<button class="ev' + (fresh ? ' fresh' : '') + '" type="button" data-s="' + esc(e.s) + '"><div class="h">' + avatarHtml(p, 'sm') + '<b>' + esc(p.nick) + '</b>' + (fresh ? '<span class="pill n">новое</span>' : '') + '</div>' + body + '</button>';
  }
  function renderUpd() {
    const el = $('v-upd');
    if (!S.meta) { el.innerHTML = emptyHtml('🔔', 'История недоступна', 'Файл meta.json не найден рядом с приложением.'); return; }
    const all = S.meta.changes || [], seen = lsGet(seenKey) || '9999';
    const list = S.updFilter === 'fav' ? all.filter(e => S.favs.indexOf(e.s) >= 0) : all;
    const first = all.length ? all[all.length - 1].d : null;
    let h = '<div class="card"><h3>Слежение за настройками</h3><div class="kv">' +
      '<div><span>Данные источника от</span><b>' + esc(ruDate(S.meta.source_generated)) + '</b></div>' +
      '<div><span>Игроков под наблюдением</span><b>' + Object.keys(S.F).length + '</b></div>' +
      '<div><span>Событий в журнале</span><b>' + all.length + '</b></div></div>' +
      '<p class="hint">Источник собирает настройки раз в неделю. Мы сравниваем каждый новый снимок с предыдущим и записываем, у кого что изменилось.</p></div>';
    h += '<div class="chips"><button class="chip' + (S.updFilter === 'all' ? ' on' : '') + '" type="button" data-updf="all">Все</button><button class="chip' + (S.updFilter === 'fav' ? ' on' : '') + '" type="button" data-updf="fav">★ Избранные</button></div>';
    if (!list.length) {
      h += S.updFilter === 'fav' ? emptyHtml('★', 'У избранных игроков изменений нет', 'Добавьте игроков в избранное — их обновления появятся здесь.')
        : emptyHtml('🛰', 'Изменений пока не было', 'За период наблюдения настройки игроков в источнике не менялись. Новые изменения появятся здесь автоматически.');
    } else {
      let day = '';
      list.slice(0, S.updShown).forEach(e => {
        if (e.d !== day) { day = e.d; h += '<div class="day">' + esc(ruDate(day)) + '</div>'; }
        h += eventHtml(e, e.d > seen);
      });
      if (list.length > S.updShown) h += '<div style="text-align:center"><button class="btn ghost sm" type="button" data-act="updmore">Показать ещё</button></div>';
    }
    if (first) h += '<div class="note">История ведётся с ' + esc(ruDate(first)) + '. Если за недели накопилось мало событий, значит игроки действительно редко меняют настройки.</div>';
    el.innerHTML = h;
  }

  // ================= Оверлей (стек экранов) =================
  const ov = []; let ovTok = 0;
  const sheet = $('sheet'), scroller = $('scroll'), sheetIn = $('sheetIn');
  function openOv(entry) {
    if (ov.length) ov[ov.length - 1].st = scroller.scrollTop;
    ov.push(entry);
    try { history.pushState({ d: ov.length }, '', entry.t === 'player' ? '#/' + encodeURIComponent(entry.slug) : '#o'); } catch (e) {}
    renderOv(); haptic('light');
  }
  function back() { if (ov.length) { try { history.back(); } catch (e) { ov.pop(); renderOv(); } } }
  function renderOv() {
    const top = ov[ov.length - 1], tok = ++ovTok;
    if (!top) {
      sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
      if (tg && tg.BackButton) { try { tg.BackButton.hide(); } catch (e) {} }
      return;
    }
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    if (tg && tg.BackButton) { try { tg.BackButton.show(); } catch (e) {} }
    if (top.t === 'player') renderPlayerOv(top, tok);
    else if (top.t === 'team') renderTeamOv(top);
    else if (top.t === 'list') renderListOv(top);
    else if (top.t === 'sim') renderSimOv(top);
    else if (top.t === 'pick') renderPickOv(top);
    scroller.scrollTop = top.st || 0;
  }
  const barHtml = (right) => '<div class="bar"><button class="round" type="button" data-act="back" aria-label="Назад">←</button><div class="r">' + (right || '') + '</div></div>';

  // ---- игрок
  function renderPlayerOv(top, tok) {
    const p = S.by[top.slug]; if (!p) { back(); return; }
    const t = S.teamOf[p.slug];
    sheetIn.innerHTML = barHtml('<button class="round" type="button" data-act="rand" aria-label="Случайный игрок">🎲</button><button class="round' + (S.favs.indexOf(p.slug) >= 0 ? ' on' : '') + '" type="button" data-act="fav" aria-label="В избранное">★</button>') +
      '<div class="hero">' + avatarHtml(p) + '<h2>' + esc(p.nick) + '</h2><p>' + esc(p.real_name || '') + '</p>' +
      (t ? '<button class="teamchip" type="button" data-team="' + t.i + '">🛰 ' + esc(t.n) + ' · #' + t.r + '</button>' : '') + '</div>' +
      '<div class="skel"><div class="sk"></div><div class="sk" style="margin-top:9px"></div></div>';
    loadFull(p.slug).then(L => { if (tok !== ovTok) return; renderPlayerBody(p, L); })
      .catch(() => { if (tok !== ovTok) return; const sk = document.querySelector('.skel'); if (sk) sk.innerHTML = '<div class="error"><p>Не удалось загрузить настройки игрока.<br>Проверьте интернет.</p><button class="btn" type="button" data-act="retry">Повторить</button></div>'; });
  }
  function codeBlocks(cmds) { return chunk(cmds).map(c => '<div class="code">' + esc(c) + '<button class="copy" type="button" data-copy="' + esc(c) + '">Копировать</button></div>').join(''); }
  function kv(rows) { const h = rows.filter(r => r[1] != null && r[1] !== '').map(r => '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>').join(''); return h ? '<div class="kv">' + h + '</div>' : ''; }
  const tableRows = t => Object.keys(t || {}).map(k => [LABELS[k] || k, tr(t[k])]);

  function drawCrosshair(cv, xh) {
    const pv = xh && xh.preview; if (!pv || !cv) return;
    const rects = (pv.fill || []).concat(pv.outline || []); let ext = 1;
    rects.forEach(r => { ext = Math.max(ext, Math.abs(r[0]), Math.abs(r[1]), Math.abs(r[0] + r[2]), Math.abs(r[1] + r[3])); });
    const k = Math.max(2, Math.min(10, Math.floor(84 / ext)));
    const w = cv.width = 190, h = cv.height = 190, ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, rgba = (a, fb) => a ? 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + (a[3] / 255) + ')' : fb;
    ctx.fillStyle = rgba(pv.outlineRgba, '#000'); (pv.outline || []).forEach(r => ctx.fillRect(cx + r[0] * k, cy + r[1] * k, r[2] * k, r[3] * k));
    ctx.fillStyle = rgba(pv.rgba, '#fff'); (pv.fill || []).forEach(r => ctx.fillRect(cx + r[0] * k, cy + r[1] * k, r[2] * k, r[3] * k));
    const lab = $('zoomlab'); if (lab) lab.textContent = 'предпросмотр ×' + k;
  }

  function historyCard(slug) {
    if (!S.meta) return '<div class="card"><h3>История</h3><p class="hint">Файл meta.json не найден рядом с приложением.</p></div>';
    const ev = (S.meta.changes || []).filter(e => e.s === slug);
    return '<div class="card"><h3>История изменений</h3>' + (ev.length ? ev.map(e => eventHtml(e, false, true)).join('') :
      '<p class="hint">С ' + esc(ruDate((S.meta.changes || []).length ? S.meta.changes[S.meta.changes.length - 1].d : S.meta.source_generated)) + ' настройки этого игрока в источнике не менялись. Данные источника от ' + esc(ruDate(S.meta.source_generated)) + '.</p>') + '</div>';
  }

  function renderPlayerBody(p, L) {
    const d = L.d, cmds = L.cfg, sec = splitSections(cmds), xh = S.xh[p.slug] || {};
    const T = d.tables || {}, M = T.Mouse || {};
    const yaw = numOf(kvOf(cmds).m_yaw) || 0.022, sens = numOf(M['Mouse Sensitivity'] || p.sens), dpi = numOf(M.DPI || p.dpi);
    const cm = sens && dpi ? 360 / (yaw * sens * dpi) * 2.54 : null;
    const tiles = '<div class="tiles"><div class="tile"><b>' + esc(p.edpi || '—') + '</b><span>eDPI</span></div><div class="tile"><b>' + esc(p.res || '—') + '</b><span>разрешение</span></div>' +
      '<div class="tile"><b>' + (cm ? cm.toFixed(1) : '—') + '</b><span>см / 360°</span></div></div>' +
      '<div class="acts"><button class="btn ghost sm" type="button" data-act="cmpwith">⚖️ Сравнить</button><button class="btn ghost sm" type="button" data-act="sim">🧬 Похожие игроки</button></div>';
    const xhCmds = (xh.commands && xh.commands.length) ? xh.commands : sec.xh;
    const warns = (xh.warnings || []).slice(0, 5).map(w => '<li>' + esc(WARN[w.code] || 'прицел пересчитан приблизительно') + '</li>').join('');
    const panelXh = '<div class="card"><h3>Прицел</h3><div class="stage" id="stage" style="background:#1b2a33"><canvas id="xhc"></canvas><div class="bgs">' +
      [['#1b2a33', 'Тёмный'], ['#6d7a6a', 'Серый'], ['#c9b98a', 'Песок'], ['#2e4a8c', 'Небо']].map((b, i) => '<button type="button" class="' + (i ? '' : 'on') + '" style="background:' + b[0] + '" data-bg="' + b[0] + '" aria-label="' + b[1] + '"></button>').join('') +
      '</div><span class="lab" id="zoomlab">предпросмотр</span></div>' +
      (xhCmds.length ? codeBlocks(xhCmds) + '<p class="hint">Откройте консоль CS2 (клавиша <code>~</code>), вставьте команды и нажмите Enter. Старые коды <code>CSGO-…</code> после обновления прицела больше не импортируются.</p>' : '<p class="hint">Данных о прицеле нет.</p>') +
      (warns ? '<ul class="warn">' + warns + '</ul>' : '') + '</div>';
    const panelMs = '<div class="card"><h3>Мышь</h3>' + kv(tableRows(M).concat([['eDPI', p.edpi], ['См на 360°', cm ? cm.toFixed(1) + ' см' : '']])) + '</div>' + (sec.ms.length ? '<div class="card"><h3>Команды консоли</h3>' + codeBlocks(sec.ms) + '</div>' : '');
    const vmRows = sec.vm.map(c => { const q = c.split(/\s+/); return [q[0].replace('viewmodel_', ''), q.slice(1).join(' ')]; });
    const panelVm = '<div class="card"><h3>Viewmodel</h3>' + (vmRows.length ? kv(vmRows) : '<p class="hint">Данных нет.</p>') + '</div>' + (sec.vm.length ? '<div class="card"><h3>Команды консоли</h3>' + codeBlocks(sec.vm) +
      '<p class="hint"><code>fov</code> — угол обзора оружия, <code>offset_x/y/z</code> — сдвиг по горизонтали, глубине и высоте, <code>presetpos</code> — пресет позиции (1 Desktop, 2 Couch, 3 Classic).</p></div>' : '');
    const fps = (d.convars || {}).fps_max;
    const panelVd = '<div class="card"><h3>Видео</h3>' + kv(tableRows(T['Video Settings'])) + '</div><div class="card"><h3>Дополнительно</h3>' + kv(tableRows(T['Advanced Video']).concat(fps ? [['fps_max', fps]] : [])) + '</div>' +
      (d.launch_options ? '<div class="card"><h3>Параметры запуска</h3><div class="code">' + esc(d.launch_options) + '<button class="copy" type="button" data-copy="' + esc(d.launch_options) + '">Копировать</button></div></div>' : '') +
      '<p class="hint">Выставляются в меню «Настройки → Видео» самой игры.</p>';
    const panelHud = '<div class="card"><h3>HUD, радар и прочее</h3>' + (sec.hud.length ? codeBlocks(sec.hud) : '<p class="hint">Данных нет.</p>') + '</div>';
    const all = xhCmds.concat(cmds.filter(c => !/^(cl_crosshair|cl_ironsight)/.test(c.split(/\s+/)[0])));
    const cfgUrl = S.base + 'cfg/' + encodeURIComponent(p.slug) + '.cfg';
    const panelAll = '<div class="card"><h3>Полный конфиг</h3>' + (all.length ? codeBlocks(all) +
      '<p class="hint">Вставляйте блоки по очереди (консоль принимает не больше ~500 символов за раз). Или скачайте файл, положите в <code>game/csgo/cfg/</code> и выполните <code>exec ' + esc(p.slug) + '</code>.</p>' +
      '<div class="acts"><button class="btn" type="button" data-copyall="1">Скопировать всё</button><button class="btn ghost" type="button" data-dl="' + esc(cfgUrl) + '">Скачать .cfg</button></div>' : '<p class="hint">Конфиг недоступен.</p>') + '</div>';
    const tabs = [['xh', '🎯 Прицел', panelXh], ['ms', '🖱 Мышь', panelMs], ['vm', '🔫 Viewmodel', panelVm], ['vd', '🖥 Графика', panelVd], ['hud', '🧭 HUD', panelHud], ['all', '📦 Всё', panelAll], ['hist', '🔔 История', historyCard(p.slug)]];
    const sk = document.querySelector('.skel');
    if (sk) sk.outerHTML = tiles + '<div class="tabs" id="tabs">' + tabs.map((t, i) => '<button class="tab' + (i ? '' : ' on') + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      tabs.map((t, i) => '<section class="panel' + (i ? '' : ' on') + '" id="pn-' + t[0] + '">' + t[2] + '</section>').join('');
    ov[ov.length - 1].all = all; ov[ov.length - 1].xh = xh;
    drawCrosshair($('xhc'), xh);
  }

  // ---- команда
  function renderTeamOv(top) {
    const t = S.meta.teams.list[top.i];
    const found = t.p.map(s => S.by[s]).filter(Boolean);
    sheetIn.innerHTML = barHtml() + '<div class="hero"><div class="stack" style="justify-content:center;margin-bottom:12px">' + found.slice(0, 5).map(p => avatarHtml(p, 'sm')).join('') + '</div><h2>' + esc(t.n) + '</h2>' +
      '<p>#' + t.r + ' в рейтинге Valve · составы на ' + esc(ruDate(S.meta.teams.asOf)) + '</p></div>' +
      '<div class="list">' + found.map((p, i) => rowHtml(p, i)).join('') + t.m.map(n => '<div class="row dim"><div class="av"><div>' + esc(n.charAt(0).toUpperCase()) + '</div></div><span class="who"><b>' + esc(n) + '</b><small>нет в базе настроек</small></span></div>').join('') + '</div>' +
      '<div class="note">Составы взяты из <a style="color:var(--cyan)" href="' + esc(S.meta.teams.url || '#') + '" target="_blank" rel="noopener">' + esc(S.meta.teams.source || 'рейтинга') + '</a> и со временем устаревают: команды меняют игроков.</div>';
  }
  // ---- список
  function renderListOv(top) {
    const ps = top.slugs.map(s => S.by[s]).filter(Boolean);
    sheetIn.innerHTML = barHtml() + '<div class="hero" style="padding-bottom:6px"><h2>' + esc(top.title) + '</h2><p>' + esc(top.sub || '') + '</p></div><div class="list">' + (ps.length ? ps.map((p, i) => rowHtml(p, i)).join('') : emptyHtml('🔭', 'Никого нет', '')) + '</div>';
  }
  // ---- похожие
  function renderSimOv(top) {
    const p = S.by[top.slug], W = simWeights(), res = similar(top.slug, top.onlyTeams);
    const WL = ['выкл', 'мало', 'обычно', 'сильно'];
    const sliders = CATS.map(c => '<div class="wrow"><span>' + c[1] + '</span><b>' + WL[W[c[0]]] + '</b><input type="range" min="0" max="3" step="1" value="' + W[c[0]] + '" data-w="' + c[0] + '" aria-label="' + esc(c[1]) + '"><small>' + esc(CAT_INFO[c[0]]) + '</small></div>').join('');
    sheetIn.innerHTML = barHtml() + '<div class="hero" style="padding-bottom:8px"><h2>Похожие на ' + esc(p.nick) + '</h2><p>Итоговый процент — среднее по выбранным критериям с учётом их важности</p></div>' +
      '<div class="card"><h3>Критерии и вес</h3>' + sliders + '<div class="chips" style="margin-top:10px;flex-wrap:wrap"><button class="chip' + (top.onlyTeams ? ' on' : '') + '" type="button" data-cat="__team">🛰 Только игроки команд</button><button class="chip" type="button" data-cat="__reset">↺ Сбросить</button></div>' +
      '<p class="hint">Высокий процент означает, что цифры в настройках близки, но не гарантирует, что вам подойдёт: ориентируйтесь на разбивку по критериям под ником.</p></div><div class="list" style="margin-top:8px">' +
      (res.length ? res.map((r, i) => rowHtml(r.p, i, '<span class="pill g">' + Math.round(r.score * 100) + '%</span>')
        .replace('</small></span>', '</small><span class="mini">' + CATS.filter(c => r.per[c[0]] != null).map(c => '<i class="' + (r.per[c[0]] >= .8 ? 'hi' : '') + '">' + c[1].split(' ')[0] + ' ' + Math.round(r.per[c[0]] * 100) + '</i>').join('') + '</span></span>')).join('') : emptyHtml('🔭', 'Не нашлось похожих', 'Включите больше критериев.')) + '</div>';
  }
  // ---- выбор игрока для сравнения
  function renderPickOv(top) {
    sheetIn.innerHTML = barHtml() + '<div class="hero" style="padding-bottom:6px"><h2>Игрок ' + (top.slot === 'a' ? '1' : '2') + '</h2><p>Найдите игрока для сравнения</p></div>' +
      '<div class="field" style="margin-bottom:10px"><input id="pq" type="search" placeholder="Ник, имя или команда" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(top.q || '') + '"></div><div class="list" id="plist"></div>';
    const fill = () => {
      const q = norm($('pq').value); top.q = $('pq').value;
      const list = (q ? S.players.map(p => ({ p, r: matchRank(p, q) })).filter(o => o.r >= 0).sort((a, b) => a.r - b.r || a.p.nick.toLowerCase().localeCompare(b.p.nick.toLowerCase())).map(o => o.p)
        : S.favs.map(s => S.by[s]).filter(Boolean).concat(((S.top && S.top.players) || []).map(t => S.by[t.slug]).filter(Boolean))).filter((p, i, a) => a.indexOf(p) === i).slice(0, 40);
      $('plist').innerHTML = (q ? '' : '<div class="sub">Избранные и топ-10 HLTV — или начните вводить ник</div>') + list.map((p, i) => rowHtml(p, i, '<span class="pill">выбрать</span>').replace('data-s=', 'data-pickp=')).join('');
    };
    $('pq').addEventListener('input', fill); fill(); setTimeout(() => { try { $('pq').focus(); } catch (e) {} }, 350);
  }

  // ================= События =================
  const openPlayer = slug => { if (S.by[slug]) openOv({ t: 'player', slug }); };
  function randomPlayer(replace) {
    const cur = ov.length && ov[ov.length - 1].t === 'player' ? ov[ov.length - 1].slug : null;
    const pool = S.players.filter(p => p.slug !== cur); if (!pool.length) return;
    const p = pool[Math.floor(Math.random() * pool.length)];
    haptic('medium');
    if (replace && cur) { ov[ov.length - 1] = { t: 'player', slug: p.slug }; try { history.replaceState({ d: ov.length }, '', '#/' + encodeURIComponent(p.slug)); } catch (e) {} renderOv(); }
    else openPlayer(p.slug);
    toast('🎲 Случайный игрок: ' + p.nick);
  }
  function showView(v) {
    S.nav = v;
    ['players', 'teams', 'pop', 'cmp', 'upd'].forEach(n => $('v-' + n).classList.toggle('on', n === v));
    [].forEach.call(document.querySelectorAll('.nav button'), b => b.classList.toggle('on', b.getAttribute('data-nav') === v));
    window.scrollTo(0, 0); haptic('light');
    if (v === 'teams') renderTeams();
    else if (v === 'pop') renderPop();
    else if (v === 'cmp') renderCmp();
    else if (v === 'upd') { renderUpd(); const n = newestEventDate(); if (n) { lsSet(seenKey, n); setTimeout(updateBadge, 0); } }
    else if (v === 'players' && S.shown < PAGE) renderList(true);
  }

  document.addEventListener('click', e => {
    const t = e.target; let el;
    if ((el = t.closest('[data-pickp]'))) {
      const top = ov[ov.length - 1]; S.cmp[top.slot] = el.getAttribute('data-pickp'); back(); setTimeout(() => { showView('cmp'); }, 60); return;
    }
    if ((el = t.closest('[data-s]'))) { openPlayer(el.getAttribute('data-s')); return; }
    if ((el = t.closest('[data-team]'))) { if (S.meta) openOv({ t: 'team', i: +el.getAttribute('data-team') }); return; }
    if ((el = t.closest('[data-nav]'))) { if (ov.length) { ov.length = 0; renderOv(); } showView(el.getAttribute('data-nav')); return; }
    if ((el = t.closest('[data-act]'))) {
      const a = el.getAttribute('data-act'), top = ov[ov.length - 1];
      if (a === 'back') back();
      else if (a === 'rand') randomPlayer(!!(top && top.t === 'player'));
      else if (a === 'retry' && top) { renderOv(); }
      else if (a === 'fav' && top) {
        const i = S.favs.indexOf(top.slug); if (i >= 0) S.favs.splice(i, 1); else S.favs.push(top.slug);
        lsSet('favs', S.favs); el.classList.toggle('on', i < 0); haptic('medium'); toast(i < 0 ? '★ Добавлено в избранное' : 'Убрано из избранного');
        if (S.nav === 'players' && (S.mode === 'fav')) renderList(true);
      }
      else if (a === 'cmpwith' && top) { S.cmp.a = top.slug; if (S.cmp.b === top.slug) S.cmp.b = null; ov.length = 0; renderOv(); try { history.go(-(history.state && history.state.d || 0)); } catch (x) {} setTimeout(() => showView('cmp'), 80); }
      else if (a === 'sim' && top) openOv({ t: 'sim', slug: top.slug, onlyTeams: false });
      else if (a === 'flt') { const pn = $('fltPanel'); pn.hidden = !pn.hidden; el.classList.toggle('on', !pn.hidden && fltActive() > 0); }
      else if (a === 'fltreset') { S.flt = {}; [].forEach.call(document.querySelectorAll('[data-f]'), i => { if (i.type === 'checkbox') i.checked = false; else i.value = ''; }); renderList(true); }
      else if (a === 'pick') openOv({ t: 'pick', slot: el.getAttribute('data-slot') });
      else if (a === 'swap') { const x = S.cmp.a; S.cmp.a = S.cmp.b; S.cmp.b = x; renderCmp(); }
      else if (a === 'only') { S.cmp.only = !S.cmp.only; renderCmp(); }
      else if (a === 'cmpretry') renderCmp();
      else if (a === 'updmore') { S.updShown += 40; renderUpd(); }
      return;
    }
    if ((el = t.closest('[data-popsel]'))) { S.pop = el.getAttribute('data-popsel'); renderPop(); return; }
    if ((el = t.closest('[data-poptab]'))) { S.popTab = el.getAttribute('data-poptab'); renderPop(); return; }
    if ((el = t.closest('[data-pop]'))) { const s = el.getAttribute('data-pop'), i = s.indexOf('|'); popList(s.slice(0, i), s.slice(i + 1)); return; }
    if ((el = t.closest('[data-updf]'))) { S.updFilter = el.getAttribute('data-updf'); S.updShown = 40; renderUpd(); return; }
    if ((el = t.closest('[data-cat]'))) {
      const top = ov[ov.length - 1], c = el.getAttribute('data-cat');
      if (c === '__team') top.onlyTeams = !top.onlyTeams;
      else if (c === '__reset') { CATS.forEach(x => { S.simW[x[0]] = 1; }); lsSet('simw', S.simW); }
      renderOv(); return;
    }
    if ((el = t.closest('[data-tab]'))) {
      const id = el.getAttribute('data-tab');
      [].forEach.call(document.querySelectorAll('.tab'), b => b.classList.toggle('on', b === el));
      [].forEach.call(document.querySelectorAll('.panel'), p => p.classList.toggle('on', p.id === 'pn-' + id));
      haptic('light'); if (id === 'xh') { const top = ov[ov.length - 1]; if (top && top.xh) drawCrosshair($('xhc'), top.xh); } return;
    }
    if ((el = t.closest('[data-copy]'))) { copyText(el.getAttribute('data-copy')); el.classList.add('done'); el.textContent = 'Готово ✓'; setTimeout(() => { el.classList.remove('done'); el.textContent = 'Копировать'; }, 1500); return; }
    if (t.closest('[data-copyall]')) { const top = ov[ov.length - 1]; if (top && top.all) copyText(top.all.join('; ')); return; }
    if ((el = t.closest('[data-dl]'))) {
      const url = el.getAttribute('data-dl'), top = ov[ov.length - 1];
      try { if (tg && tg.downloadFile) tg.downloadFile({ url, file_name: (top && top.slug ? top.slug : 'pro') + '.cfg' }); else if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank'); } catch (x) { window.open(url, '_blank'); }
      return;
    }
    if ((el = t.closest('[data-bg]'))) { $('stage').style.background = el.getAttribute('data-bg'); [].forEach.call(document.querySelectorAll('.bgs button'), b => b.classList.toggle('on', b === el)); }
  });

  // фильтры, поиск, сортировка
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('.chip[data-m]'); if (!b) return;
    S.mode = b.getAttribute('data-m');
    [].forEach.call(document.querySelectorAll('#chips .chip[data-m]'), c => c.classList.toggle('on', c === b));
    $('sort').disabled = S.mode === 'top'; haptic('light'); renderList(true);
  });
  $('sort').addEventListener('change', function () { S.sort = this.value; renderList(true); });
  let qT;
  $('q').addEventListener('input', function () { S.q = this.value; $('field').classList.toggle('has', !!S.q); clearTimeout(qT); qT = setTimeout(() => renderList(true), 120); });
  $('q').addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
  $('clr').addEventListener('click', () => { $('q').value = ''; S.q = ''; $('field').classList.remove('has'); renderList(true); $('q').focus(); });
  $('tq').addEventListener('input', function () { $('tfield').classList.toggle('has', !!this.value); renderTeams(); });
  $('tclr').addEventListener('click', () => { $('tq').value = ''; $('tfield').classList.remove('has'); renderTeams(); });
  document.querySelectorAll('[data-f]').forEach(i => i.addEventListener(i.tagName === 'SELECT' || i.type === 'checkbox' ? 'change' : 'input', function () {
    S.flt[this.getAttribute('data-f')] = this.type === 'checkbox' ? this.checked : this.value; clearTimeout(qT); qT = setTimeout(() => renderList(true), 200);
  }));

  document.addEventListener('change', e => {
    const r = e.target.closest && e.target.closest('[data-w]'); if (!r) return;
    const W = simWeights(); W[r.getAttribute('data-w')] = +r.value;
    if (!CATS.some(c => W[c[0]])) W[r.getAttribute('data-w')] = 1;
    lsSet('simw', W); const top = ov[ov.length - 1]; if (top && top.t === 'sim') { const st = scroller.scrollTop; renderSimOv(top); scroller.scrollTop = st; }
  });
  window.addEventListener('popstate', e => { const dpt = (e.state && e.state.d) || 0; while (ov.length > dpt) ov.pop(); renderOv(); });
  if (tg && tg.BackButton) { try { tg.BackButton.onClick(back); } catch (e) {} }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') back(); });

  // ================= Старт =================
  function showHealth() {
    const msgs = [], el = $('health');
    const gen = Date.parse(S.generated || '');
    if (S.stale) msgs.push('Не удалось обновить данные: показана сохранённая копия.');
    if (gen && (Date.now() - gen) / 864e5 > 21) msgs.push('Источник не обновлялся больше трёх недель (данные от ' + S.generated.slice(0, 10) + ').');
    if (!S.meta) msgs.push('Файл meta.json не найден: команды, популярное, обновления и подбор недоступны.');
    else {
      const asOf = Date.parse(S.meta.teams && S.meta.teams.asOf || '');
      if (asOf && (Date.now() - asOf) / 864e5 > 60) msgs.push('Составы команд устарели (на ' + ruDate(S.meta.teams.asOf) + ').');
      const ids = Object.keys(S.F).length;
      if (ids < S.players.length * 0.9) msgs.push('Аналитика meta.json собрана не для всех игроков: пересоберите её.');
    }
    if (S.players.length < 300) msgs.push('В базе подозрительно мало игроков (' + S.players.length + ').');
    el.hidden = !msgs.length; el.innerHTML = msgs.map(esc).join('<br>');
  }
  function boot() {
    $('list').innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div>';
    Promise.all([
      cached('data/index.json', 'idx_v1'), cached('data/crosshair.json', 'xh_v1'),
      cached('data/top10.json', 'top_v1').catch(() => null), loadMeta().catch(() => null)
    ]).then(r => {
      S.players = r[0].players; S.generated = (r[0].meta || {}).generated || ''; S.top = r[2]; S.meta = r[3]; S.xh = r[1].players || {};
      S.players.forEach(p => { S.by[p.slug] = p; });
      S.favs = S.favs.filter(s => S.by[s]);
      if (S.meta) {
        S.F = S.meta.f || {};
        Object.keys(S.F).forEach(s => { const f = S.F[s]; if (f.ox != null) f.off = [f.ox, f.oy != null ? f.oy : 0, f.oz != null ? f.oz : 0].join(' / '); });
        ((S.meta.teams && S.meta.teams.list) || []).forEach((t, i) => t.p.forEach(s => { S.teamOf[s] = { n: t.n, r: t.r, i }; S.inTeam.add(s); }));
        if (!lsGet(seenKey)) lsSet(seenKey, newestEventDate() || '0');
        fillFilterOptions(); updateBadge();
      } else document.querySelectorAll('#fltBtn').forEach(b => { b.hidden = true; });
      $('sub').textContent = S.players.length + ' игроков' + (S.generated ? ' · данные от ' + S.generated.slice(0, 10) : '');
      showHealth();
      renderList(true);
      const m = location.hash.match(/^#\/(.+)$/), sp = params.get('p') || (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param);
      const open = m ? decodeURIComponent(m[1]) : sp;
      try { history.replaceState({ d: 0 }, '', location.pathname + location.search); } catch (e) {}
      if (open && S.by[open]) openPlayer(open);
    }).catch(() => {
      $('sub').textContent = 'Связь с базой потеряна';
      $('list').innerHTML = '<div class="error"><div class="big">🛰</div><p>Не удалось загрузить базу игроков.<br>Проверьте интернет и попробуйте снова.</p><button class="btn" type="button" id="retry">Повторить</button></div>';
      $('retry').addEventListener('click', boot);
    });
  }
  boot();
})();
