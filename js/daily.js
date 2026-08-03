/* ============ 专区一：日常工作区（日历） ============ */
const Daily = {
  cur: new Date(),   // 当前视图月份
  selDate: U.today(),
  render() {
    const d = DB.get().memo;
    const y = this.cur.getFullYear(), m = this.cur.getMonth();
    const first = new Date(y, m, 1), startDow = (first.getDay() + 6) % 7; // 周一开头
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells = [];
    // 上月补位
    for (let i = startDow - 1; i >= 0; i--) {
      const dt = U.fmt(new Date(y, m - 1, prevDays - i));
      cells.push(this.cell(dt, true));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(this.cell(U.fmt(new Date(y, m, i)), false));
    }
    // 补齐6行
    const total = Math.ceil((startDow + daysInMonth) / 7) * 7;
    for (let i = cells.length; i < total; i++) {
      const dt = U.fmt(new Date(y, m + 1, i - cells.length + 1));
      cells.push(this.cell(dt, true));
    }
    const dow = ['一', '二', '三', '四', '五', '六', '日'];
    document.getElementById('view-daily').innerHTML = `
      <div class="card">
        <div class="cal-head">
          <button class="btn sm" onclick="Daily.shift(-1)">‹</button>
          <span class="month">${y}年 ${m + 1}月</span>
          <button class="btn sm" onclick="Daily.shift(1)">›</button>
          <button class="btn sm" onclick="Daily.goToday()">今天</button>
          <div class="spacer" style="flex:1"></div>
          <span class="muted" style="font-size:12.5px">点击日期可添加工作备忘 / 记录进展</span>
        </div>
        <div class="cal-grid">
          ${dow.map(x => `<div class="cal-dow">周${x}</div>`).join('')}
          ${cells.join('')}
        </div>
      </div>
      <div id="day-detail"></div>`;
    this.renderDay(this.selDate);
  },
  cell(dt, other) {
    const items = DB.get().memo[dt] || [];
    const isToday = dt === U.today();
    const tagColor = { memo: 'memo', done: 'done', warn: 'warn', risk: 'risk' };
    const dots = items.slice(0, 4).map(it => `<span class="tag ${tagColor[it.type] || 'memo'}">${U.esc(it.title)}</span>`).join('');
    const more = items.length > 4 ? `<span class="tag gray">+${items.length - 4}</span>` : '';
    return `<div class="cal-cell ${other ? 'other' : ''} ${isToday ? 'today' : ''}" onclick="Daily.pick('${dt}')">
      <span class="dnum">${Number(dt.slice(8, 10))}</span>
      <div class="dots">${dots}${more}</div>
    </div>`;
  },
  pick(dt) { this.selDate = dt; this.renderDay(dt); },
  shift(n) { this.cur = new Date(this.cur.getFullYear(), this.cur.getMonth() + n, 1); this.render(); },
  goToday() { this.cur = new Date(); this.selDate = U.today(); this.render(); },
  renderDay(dt) {
    const items = (DB.get().memo[dt] || []).slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)); // 未完成在前
    const done = items.filter(i => i.done).length;
    const total = items.length;
    const html = `
      <div class="card">
        <div class="section-head">
          <h2>${U.fmtCN(dt)} TODO 列表</h2>
          <span class="pill ${total ? (done === total ? 'green' : 'amber') : 'gray'}">已完成 ${done}/${total}</span>
          <div class="spacer"></div>
          <button class="btn primary sm" onclick="Daily.add('memo')">+ 待办事项</button>
          <button class="btn primary sm" onclick="Daily.add('done')">+ 工作进展</button>
          <button class="btn primary sm" onclick="Daily.add('warn')">+ 待跟进</button>
          <button class="btn primary sm" onclick="Daily.add('risk')">+ 风险事项</button>
          <button class="btn sm" onclick="Daily.importDay()">⬆ 导入</button>
        </div>
        ${items.length ? `<div class="day-events">${items.map(it => this.evRow(dt, it)).join('')}</div>`
          : `<div class="empty">这一天还没有记录，点击右上角按钮添加 ✍️</div>`}
      </div>`;
    document.getElementById('day-detail').innerHTML = html;
  },
  evRow(dt, it) {
    const typeMap = {
      memo: { ic: '📝', bg: 'var(--blue-soft)', title: '待办事项' },
      done: { ic: '💪', bg: 'var(--green-soft)', title: '工作进展' },
      warn: { ic: '⏳', bg: 'var(--amber-soft)', title: '待跟进' },
      risk: { ic: '⚠️', bg: 'var(--red-soft)', title: '风险事项' },
    };
    const t = typeMap[it.type] || typeMap.memo;
    const timeStr = it.time ? `<span class="pill gray" style="font-size:11px;padding:0 6px;margin-left:4px">${U.esc(it.time)}</span>` : '';
    const done = it.done || false;
    const rowClass = done ? ' ev-done' : '';
    return `<div class="ev${rowClass}">
      <div class="checkbox ${done?'on':''}" onclick="Daily.toggle('${dt}','${it.id}')">${done ? '✓' : ''}</div>
      <div class="ev-main">
        <div class="ev-title">${U.esc(it.title)}${timeStr}</div>
        ${it.note ? `<div class="ev-meta">${U.esc(it.note)}</div>` : ''}
        <div class="ev-meta">${t.title}${done ? ' · 已完成' : ''}</div>
      </div>
      <div class="ev-actions">
        <button class="btn ghost sm" onclick="Daily.edit('${dt}','${it.id}')">编辑</button>
        <button class="btn ghost sm danger" onclick="Daily.del('${dt}','${it.id}')">删</button>
      </div>
    </div>`;
  },
  add(type) { this.form(this.selDate, { type, title: '', note: '', done: false }); },
  edit(dt, id) {
    const it = (DB.get().memo[dt] || []).find(x => x.id === id);
    if (it) this.form(dt, it, id);
  },
  form(dt, it, id) {
    const typeName = { memo: '待办事项', done: '工作进展', warn: '待跟进', risk: '风险事项' };
    openModal(id ? '编辑记录' : '新增' + typeName[it.type], `
      <div class="row2">
        <div class="field"><label>类型</label>
          <select id="f_type">
            ${['memo','done','warn','risk'].map(t => `<option value="${t}" ${t===it.type?'selected':''}>${typeName[t]}</option>`).join('')}
          </select></div>
        <div class="field"><label>时间</label><input type="time" id="f_time" value="${it.time||''}"></div>
      </div>
      <div class="field"><label>标题</label><input id="f_title" value="${U.esc(it.title)}" placeholder="如：完成XX机构接口联调"></div>
      <div class="field"><label>说明 / 备注</label><textarea id="f_note" placeholder="补充细节、结果、负责人等">${U.esc(it.note)}</textarea></div>
      <div class="field"><label><input type="checkbox" id="f_done" ${it.done?'checked':''} style="width:auto;margin-right:6px">已完成</label></div>
    `, () => {
      const title = document.getElementById('f_title').value.trim();
      if (!title) { toast('请填写标题'); return; }
      const obj = {
        type: document.getElementById('f_type').value,
        time: document.getElementById('f_time').value,
        title, note: document.getElementById('f_note').value.trim(),
        done: document.getElementById('f_done').checked
      };
      if (id) DB.updMemo(dt, id, obj); else DB.addMemo(dt, Object.assign({ id: U.uid() }, obj));
      closeModal(); this.renderDay(dt); toast('已保存');
    });
  },
  toggle(dt, id) { const it = (DB.get().memo[dt] || []).find(x => x.id === id); if (it) DB.updMemo(dt, id, { done: !it.done }); this.renderDay(dt); this.render(); },
  del(dt, id) { confirmDel('确认删除这条记录？', () => { DB.delMemo(dt, id); this.renderDay(dt); this.render(); toast('已删除'); }); },
  importDay() {
    const dt = this.selDate; const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try {
          let arr = JSON.parse(e.target.result);
          if (!Array.isArray(arr)) arr = arr.memo && arr.memo[dt] ? arr.memo[dt] : [];
          arr.forEach(x => { if (x && x.title) DB.addMemo(dt, Object.assign({ id: U.uid(), type: x.type || 'memo', done: !!x.done, note: x.note || '' }, x)); });
          toast('已导入 ' + (arr.length || 0) + ' 条');
          this.renderDay(dt);
        } catch (err) { toast('导入失败：格式不正确'); }
      };
      r.readAsText(f);
    };
    inp.click();
  },
};
