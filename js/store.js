/* ============ 存储层：所有数据持久化到 localStorage ============ */
const DB = (() => {
  const KEY = 'cbec_workbench_v1';
  const def = () => ({
    memo: {},          // 日常工作区：{ 'YYYY-MM-DD': [ {id,type,title,note,done} ] }
    ecom: {            // 跨境电商系统专区
      overview: { progress: 0, note: '' },
      partners: [],    // 外部对接机构/平台
      meetings: [],    // 会议纪要
      demands: [],     // 系统需求
      stats: [],       // 业务数据统计（月度指标）
    },
    policy: {          // 制度建设专区
      items: [],       // 制度建设进度
      repo: [],        // 知识库（我行 + 监管）
    },
    other: [],         // 其他系统进度（按需求分类记录）
    report: [],        // 监管报送
    meetings: [],      // 会议纪要（独立模块）：{ id,title,date,attend,place,content,action }
    meta: { created: Date.now() }
  });
  let data = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return def();
      return Object.assign(def(), JSON.parse(raw));
    } catch (e) { return def(); }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
  // 数据迁移：把旧版本 ecom.meetings 搬到顶层 meetings（仅一次）
  if (data.ecom && Array.isArray(data.ecom.meetings) && data.ecom.meetings.length && !(data.meta && data.meta.migratedMeetings)) {
    data.meetings = (data.meetings || []).concat(data.ecom.meetings);
    data.ecom.meetings = [];
    data.meta = Object.assign({}, data.meta, { migratedMeetings: true });
    save();
  }
  return {
    get: () => data,
    save,
    reset: () => { data = def(); save(); },
    /** 通用导入：将解析后的对象合并进当前数据（保留 meta）。支持整库或单集合导入。 */
    importJSON(obj, mode = 'merge') {
      if (!obj || typeof obj !== 'object') throw new Error('格式错误');
      if (mode === 'replace') {
        const merged = Object.assign(def(), obj, { meta: Object.assign({}, def().meta, { imported: Date.now() }) });
        data = merged; save(); return;
      }
      // merge：按集合追加，避免覆盖现有
      const KEYS = ['memo','ecom','policy','other','report','meetings'];
      KEYS.forEach(k => {
        if (!obj[k]) return;
        if (k === 'memo') {
          Object.keys(obj.memo).forEach(d => { data.memo[d] = (data.memo[d] || []).concat(obj.memo[d]); });
        } else if (k === 'ecom' || k === 'policy') {
          Object.keys(obj[k]).forEach(sub => { data[k][sub] = (data[k][sub] || []).concat(obj[k][sub]); });
        } else {
          data[k] = (data[k] || []).concat(obj[k]);
        }
      });
      save();
    },
    // 通用集合操作
    add(collection, item) { data[collection].push(item); save(); },
    update(collection, id, patch) {
      const arr = data[collection]; const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); save(); }
    },
    remove(collection, id) {
      data[collection] = data[collection].filter(x => x.id !== id); save();
    },
    // memo 特殊
    addMemo(date, item) {
      if (!data.memo[date]) data.memo[date] = [];
      data.memo[date].push(item); save();
    },
    updMemo(date, id, patch) {
      const arr = data.memo[date] || []; const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); save(); }
    },
    delMemo(date, id) {
      if (data.memo[date]) data.memo[date] = data.memo[date].filter(x => x.id !== id);
      save();
    },
    // ecom 子集合
    addEcom(key, item) { data.ecom[key].push(item); save(); },
    updEcom(key, id, patch) {
      const arr = data.ecom[key]; const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); save(); }
    },
    delEcom(key, id) { data.ecom[key] = data.ecom[key].filter(x => x.id !== id); save(); },
    // policy 子集合
    addPolicy(key, item) { data.policy[key].push(item); save(); },
    updPolicy(key, id, patch) {
      const arr = data.policy[key]; const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); save(); }
    },
    delPolicy(key, id) { data.policy[key] = data.policy[key].filter(x => x.id !== id); save(); },
  };
})();

/* ============ 工具函数 ============ */
const U = {
  uid: () => 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  today: () => U.fmt(new Date()),
  fmt: (d) => {
    const x = (typeof d === 'string') ? new Date(d + 'T00:00:00') : new Date(d);
    const y = x.getFullYear(), m = String(x.getMonth() + 1).padStart(2, '0'), day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  fmtCN: (d) => {
    const x = (typeof d === 'string') ? new Date(d + 'T00:00:00') : new Date(d);
    return `${x.getMonth() + 1}月${x.getDate()}日`;
  },
  addDays: (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return U.fmt(x); },
  // 距今天数（负数=已过，正数=未来）
  daysFromToday: (d) => Math.round((new Date(d + 'T00:00:00') - new Date(U.today() + 'T00:00:00')) / 86400000),
  esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  pct: (a, b) => b ? Math.round(a / b * 100) : 0,
};

/* ============ 弹窗 / Toast ============ */
function openModal(title, bodyHtml, onSave, opts = {}) {
  const ov = document.getElementById('overlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalSave').textContent = opts.saveText || '保存';
  document.getElementById('modalSave').style.display = opts.hideSave ? 'none' : '';
  ov.classList.add('show');
  document.getElementById('modalSave').onclick = () => { if (onSave) onSave(); };
  document.getElementById('modalCancel').textContent = opts.cancelText || '取消';
}
function closeModal() { document.getElementById('overlay').classList.remove('show'); }
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1800);
}
function confirmDel(msg, cb) {
  if (confirm(msg)) cb();
}

/* ============ 简单 SVG 饼图 / 环形图 ============ */
function donut(percent, color = '#ec6a9c', size = 120) {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  const off = c * (1 - percent / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#eef1f6" stroke-width="11"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="11"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="700" fill="#1f2733">${percent}%</text>
  </svg>`;
}
/* 横向条形占比（分类用） */
function hbarList(items, opts = {}) {
  // items: [{label, value, color}]
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div style="display:flex;flex-direction:column;gap:10px">` + items.map(i => `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
        <span>${U.esc(i.label)}</span><span style="color:var(--ink-faint)">${i.value}</span>
      </div>
      <div class="bar"><span style="width:${i.value / max * 100}%;background:${i.color || 'linear-gradient(90deg,#f9b8d0,#ec6a9c)'}"></span></div>
    </div>`).join('') + `</div>`;
}
