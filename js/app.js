/* ============ 主控制器 ============ */
const PAGES = [
  { id: 'home',  ic: '🏠', name: '概览',     title: '概览', sub: 'Ruby 的日常工作仪表盘', group: '工作台' },
  { id: 'daily', ic: '📅', name: '日常工作', title: '日常工作区', sub: '日历形式记录工作备忘与进展', group: '工作台', badge: () => reportCount.daily },
  { id: 'ecom',  ic: '🛒', name: '电商系统', title: '跨境电商系统专区', sub: '系统建设 · 对接 · 需求 · 数据', group: '业务系统', badge: () => reportCount.ecom },
  { id: 'other', ic: '🧩', name: '其他系统', title: '其他系统进度', sub: '按需求分类记录建设进度', group: '业务系统', badge: () => reportCount.other },
  { id: 'meetings', ic: '📝', name: '会议纪要', title: '会议纪要专区', sub: '会议记录 · 飞书妙记导入', group: '业务系统', badge: () => reportCount.meetings },
  { id: 'notes', ic: '💡', name: '灵感笔记', title: '灵感笔记', sub: '随手记录灵感与想法', group: '业务系统', badge: () => 0 },
  { id: 'policy',ic: '📚', name: '制度建设', title: '制度建设专区', sub: '建设进度 · 制度知识库', group: '业务系统', badge: () => reportCount.policy },
  { id: 'report',ic: '⏰', name: '监管报送', title: '监管报送专区', sub: '报表文件报送与到期提醒', group: '业务系统', badge: () => reportCount.report },
  { id: 'data',  ic: '💾', name: '数据管理', title: '数据管理', sub: '备份恢复 · 多设备同步 · 安装指南', group: '设置', badge: () => 0 },
];

// 各专区需提醒数量（用于导航角标）
let reportCount = { daily: 0, ecom: 0, policy: 0, other: 0, meetings: 0, report: 0 };

const App = {
  cur: 'home',
  init() {
    this.buildNav();
    this.tick();
    setInterval(() => this.tick(), 1000);
    this.go('home');
    this.registerPWA();
  },
  buildNav() {
    const nav = document.getElementById('nav');
    const mnav = document.getElementById('mobileNav');
    // 侧边栏：按 group 分组
    let html = '', lastGroup = null;
    PAGES.forEach(p => {
      if (p.group !== lastGroup) { html += `<div class="nav-group-title">${p.group}</div>`; lastGroup = p.group; }
      html += `
      <div class="nav-item" data-id="${p.id}" onclick="App.go('${p.id}')">
        <span class="ic">${p.ic}</span><span>${p.name}</span>
        ${p.badge && p.badge() ? `<span class="badge" id="nav-badge-${p.id}">${p.badge()}</span>` : ''}
      </div>`;
    });
    nav.innerHTML = html;
    // 手机底部：仅高频模块（设置类从概览入口进入，避免 Tab 过挤）
    const mPages = PAGES.filter(p => p.group !== '设置');
    mnav.innerHTML = mPages.map(p => `
      <div class="mn" data-id="${p.id}" onclick="App.go('${p.id}')">
        <span class="ic">${p.ic}</span><span>${p.name}</span>
        ${p.badge && p.badge() ? `<span class="badge" id="mnav-badge-${p.id}">${p.badge()}</span>` : ''}
      </div>`).join('');
  },
  refreshBadges() {
    // 重新计算报送提醒
    const today = U.today();
    const r = DB.get().report.map(x => U.daysFromToday(nextDue(x)));
    reportCount.report = r.filter(d => d <= 7).length;
    // 日常工作：今天有未完成的进展
    const todays = DB.get().memo[today] || [];
    reportCount.daily = todays.filter(i => i.type === 'done' && !i.done).length;
    reportCount.ecom = 0; reportCount.policy = 0;
    PAGES.forEach(p => {
      const nb = document.getElementById('nav-badge-' + p.id);
      const mb = document.getElementById('mnav-badge-' + p.id);
      const v = p.badge ? p.badge() : 0;
      if (nb) nb.style.display = v ? '' : 'none', nb.textContent = v;
      if (mb) mb.style.display = v ? '' : 'none', mb.textContent = v;
    });
  },
  go(id) {
    this.cur = id;
    const p = PAGES.find(x => x.id === id);
    document.getElementById('pageTitle').textContent = p.title;
    document.getElementById('pageSub').textContent = p.sub;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.id === id));
    document.querySelectorAll('.mobile-nav .mn').forEach(n => n.classList.toggle('active', n.dataset.id === id));
    const c = document.getElementById('content');
    if (id === 'home') c.innerHTML = this.home();
    else {
      c.innerHTML = `<div id="view-${id}"></div>`;
      ({ daily: () => Daily.render(), ecom: () => Ecom.render(), other: () => Other.render(), meetings: () => Meetings.render(), notes: () => Notes.render(), policy: () => Policy.render(), report: () => Report.render(), data: () => DataMgr.render() })[id]();
    }
    this.refreshBadges();
    window.scrollTo(0, 0);
  },
  tick() {
    const d = new Date();
    const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    document.getElementById('clock').textContent =
      `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} 周${w} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  /* ---- 概览仪表盘 ---- */
  home() {
    const d = DB.get();
    const today = U.today();
    // 今日待办
    const todays = d.memo[today] || [];
    const todoToday = todays.filter(i => i.type === 'done' && !i.done);
    const memoToday = todays.filter(i => i.type !== 'done');
    // 电商总进度
    const parts = d.ecom.partners;
    const ecomAvg = parts.length ? Math.round(parts.reduce((s, p) => s + Number(p.progress || 0), 0) / parts.length) : 0;
    const demandsOpen = d.ecom.demands.filter(x => x.status !== 'done' && x.status !== 'reject').length;
    // 制度
    const pols = d.policy.items;
    const polAvg = pols.length ? Math.round(pols.reduce((s, i) => s + Number(i.progress || 0), 0) / pols.length) : 0;
    // 报送提醒
    const rpts = d.report.map(x => ({ ...x, d: U.daysFromToday(nextDue(x)), nx: nextDue(x) })).sort((a, b) => a.d - b.d);
    const overdue = rpts.filter(r => r.d < 0);
    const due7 = rpts.filter(r => r.d >= 0 && r.d <= 7);

    return `
      <!-- 提醒横幅 -->
      ${(overdue.length || due7.length) ? `<div class="card" style="border-color:var(--amber);background:linear-gradient(90deg,var(--amber-soft),#fff)">
        <b>⏰ 待办提醒</b>
        ${overdue.length ? `<span class="pill red" style="margin-left:8px">${overdue.length} 项报送已逾期</span>` : ''}
        ${due7.length ? `<span class="pill amber" style="margin-left:8px">${due7.length} 项报送 7 日内到期</span>` : ''}
        <span class="muted" style="margin-left:8px;font-size:12.5px">前往「监管报送」处理</span>
      </div>` : ''}

      <div class="grid cols-4" style="margin-bottom:18px">
        <div class="stat-tile" onclick="App.go('daily')" style="cursor:pointer">
          <div class="label">📅 今日工作</div><div class="value">${todays.length}</div>
          <div class="delta">${todoToday.length} 项进展待完成 · ${memoToday.length} 条备忘</div></div>
        <div class="stat-tile" onclick="App.go('ecom')" style="cursor:pointer">
          <div class="label">🛒 电商系统进度</div><div class="value">${ecomAvg}<small>%</small></div>
          <div class="delta">${parts.length} 个对接 · ${demandsOpen} 个需求进行中</div></div>
        <div class="stat-tile" onclick="App.go('policy')" style="cursor:pointer">
          <div class="label">📚 制度建设进度</div><div class="value">${polAvg}<small>%</small></div>
          <div class="delta">${pols.length} 项制度 · 知识库 ${d.policy.repo.length} 条</div></div>
        <div class="stat-tile" onclick="App.go('report')" style="cursor:pointer">
          <div class="label">⏰ 报送预警</div><div class="value" style="color:${overdue.length?'var(--red)':due7.length?'var(--amber)':'var(--green)'}">${overdue.length + due7.length}</div>
          <div class="delta">逾期 ${overdue.length} · 临期 ${due7.length}</div></div>
      </div>

      <div class="grid cols-2">
        <div class="card" style="grid-column:1/-1">
          <div class="section-head"><h2>📅 TO DO LIST（本周）</h2><div class="spacer"></div>
            <button class="btn primary sm" onclick="App.quickTodo()">+ 快速新增</button>
            <button class="btn sm" onclick="App.go('daily')">前往日历 →</button></div>
          ${(() => {
            // 本周一到周日
            const now = new Date();
            const day = now.getDay() || 7;
            const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
            const wd = [mon];
            for (let i = 1; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); wd.push(x); }
            const wi = [];
            const md = DB.get().memo;
            const lb = ['周一','周二','周三','周四','周五','周六','周日'];
            wd.forEach((dd, i) => {
              const dt = U.fmt(dd);
              (md[dt] || []).slice(0, 6).forEach(it => { wi.push({ ...it, _dt: dt, _lb: lb[i] + (dt===U.today()?' (今天)':'') }); });
            });
            const T = { memo:['📝','待办事项','var(--blue-soft)'], done:['💪','工作进展','var(--green-soft)'], warn:['⏳','待跟进','var(--amber-soft)'], risk:['⚠️','风险事项','var(--red-soft)'] };
            return wi.length ? wi.slice(0, 30).map(it => {
              const t = T[it.type] || T.memo;
              const dn = it.done || false;
              return `<div class="ev${dn?' ev-done':''}">
                <div class="checkbox ${dn?'on':''}" onclick="Daily.toggle('${it._dt}','${it.id}')">${dn?'✓':''}</div>
                <div class="ev-main">
                  <div class="ev-title">${U.esc(it.title)} ${it.time?`<span class="pill gray" style="font-size:11px;padding:0 6px">${U.esc(it.time)}</span>`:''} <span class="pill purple" style="font-size:11px;padding:0 6px">${U.esc(it._lb)}</span></div>
                  ${it.note ? `<div class="ev-meta">${U.esc(it.note)}</div>` : ''}
                  <div class="ev-meta">${t[1]}${dn?' · 已完成':''}</div>
                </div>
              </div>`;
            }).join('') : `<div class="empty">本周暂无待办，去日历添加吧</div>`;
          })()}
        </div>
        <div class="card">
          <div class="section-head"><h2>⏰ 临近报送</h2><div class="spacer"></div>
            <button class="btn sm" onclick="App.go('report')">全部报送</button></div>
          ${rpts.length ? `<div class="day-events">${rpts.slice(0, 6).map(r => `
            <div class="ev">
              <div class="ev-type" style="background:${r.d<0?'var(--red-soft)':r.d<=7?'var(--amber-soft)':'var(--green-soft)'}">⏰</div>
              <div class="ev-main"><div class="ev-title">${U.esc(r.name)}</div>
                <div class="ev-meta">${U.esc(r.to||'—')} · ${freqText(r.freq)} · 下次 ${r.nx}</div></div>
              <div class="ev-actions">${duePill(r.d)}</div>
            </div>`).join('')}</div>`
            : `<div class="empty">暂无报送项</div>`}
        </div>
      </div>`;
  },
  /* 首页快速新增 TODO */
  quickTodo() {
    const typeName = { memo: '待办事项', done: '工作进展', warn: '待跟进', risk: '风险事项' };
    openModal('快速新增', `
      <div class="row2">
        <div class="field"><label>类型</label>
          <select id="qt_type">${['memo','done','warn','risk'].map(t => `<option value="${t}">${typeName[t]}</option>`).join('')}</select></div>
        <div class="field"><label>日期</label><input type="date" id="qt_date" value="${U.today()}"></div>
      </div>
      <div class="row2">
        <div class="field"><label>时间（可选）</label><input type="time" id="qt_time"></div>
        <div class="field"><label>标题</label><input id="qt_title" placeholder="如：确认接口方案"></div>
      </div>
      <div class="field"><label>备注（可选）</label><textarea id="qt_note" style="min-height:60px" placeholder="补充说明"></textarea></div>
    `, () => {
      const title = document.getElementById('qt_title').value.trim();
      if (!title) { toast('请填写标题'); return; }
      const dt = document.getElementById('qt_date').value || U.today();
      DB.addMemo(dt, {
        id: U.uid(),
        type: document.getElementById('qt_type').value,
        time: document.getElementById('qt_time').value,
        title, note: document.getElementById('qt_note').value.trim(),
        done: false
      });
      closeModal(); App.go('home'); toast('已添加');
    });
  },

  registerPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {/* 本地 file:// 下可能失败，可忽略 */});
      // 检测到新版本时自动激活并刷新，用户无需手动清缓存
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem('sw_reload')) return;
        sessionStorage.setItem('sw_reload', '1');
        location.reload();
      });
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage('SKIP_WAITING');
            }
          });
        });
      }).catch(() => {});
    }
  },
  confirmReset() {
    openModal('重置全部数据', `
      <p style="margin:0 0 8px">此操作将清空本设备浏览器中保存的<strong>全部</strong>工作台数据（工作备忘、系统进度、制度、报送记录等），且不可恢复。</p>
      <p class="muted" style="margin:0">如确认，请在下方输入 <b>RESET</b> 以继续：</p>
      <div class="field" style="margin-top:10px"><input id="reset_confirm" placeholder="输入 RESET"></div>
    `, () => {
      if (document.getElementById('reset_confirm').value.trim() !== 'RESET') { toast('输入不匹配，已取消'); return; }
      DB.reset(); closeModal(); this.go('home'); this.refreshBadges(); toast('数据已清空');
    }, { saveText: '确认重置' });
  },
  exportData() {
    const data = DB.get();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    a.href = url; a.download = `ruby-workbench-${stamp}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast('已导出为 JSON 文件');
  },
  importData() { document.getElementById('importFile').click(); },
  handleImport(ev) {
    const f = ev.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        if (!obj || typeof obj !== 'object') throw new Error('格式错误');
        DB.importJSON(obj, 'replace');
        toast('导入成功，正在刷新…');
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        toast('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(f);
    ev.target.value = '';
  },
  /** 单模块导入：选中 JSON 文件，按集合名合并 */
  importModule(collection) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result);
          // 顶层集合映射：policy_items / policy_repo -> 嵌套
          const map = { policy_items: ['policy', 'items'], policy_repo: ['policy', 'repo'], ecom_all: ['ecom', 'all'] };
          if (map[collection]) {
            const [k1, k2] = map[collection];
            let arr = Array.isArray(obj) ? obj : (obj[collection] || obj[k1] && obj[k1][k2] || obj[k2] || []);
            if (!Array.isArray(arr)) arr = [];
            DB.importJSON({ [k1]: { [k2]: arr } }, 'merge');
          } else {
            let arr = Array.isArray(obj) ? obj : (obj[collection] || obj);
            if (!Array.isArray(arr)) arr = [arr];
            DB.importJSON({ [collection]: arr }, 'merge');
          }
          toast('已导入到「' + collection + '」');
          setTimeout(() => this.go(this.cur), 500);
        } catch (err) { toast('导入失败：格式不正确'); }
      };
      r.readAsText(f);
    };
    inp.click();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
