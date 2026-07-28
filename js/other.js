/* ============ 专区五：其他系统进度（按需求分类记录进度） ============ */
const Other = {
  filter: 'all',
  render() {
    const items = DB.get().other;
    const cats = ['全部', ...new Set(items.map(i => i.cat || '其他'))];
    const list = this.filter === 'all' ? items : items.filter(i => (i.cat || '其他') === this.filter);

    const avg = items.length ? Math.round(items.reduce((s, i) => s + Number(i.progress || 0), 0) / items.length) : 0;
    const done = items.filter(i => Number(i.progress || 0) >= 100).length;
    const ing = items.filter(i => Number(i.progress || 0) > 0 && Number(i.progress || 0) < 100).length;
    const todo = items.filter(i => Number(i.progress || 0) <= 0).length;

    // 按需求分类聚合进度
    const byCat = {};
    items.forEach(i => { const c = i.cat || '其他'; (byCat[c] = byCat[c] || []).push(Number(i.progress || 0)); });
    const catBars = Object.keys(byCat).map(c => ({
      label: c, value: Math.round(byCat[c].reduce((a, b) => a + b, 0) / byCat[c].length)
    }));

    document.getElementById('view-other').innerHTML = `
      <div class="grid cols-4" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">📊 整体进度</div><div class="value">${avg}<small>%</small></div><div class="delta">${items.length} 个系统/需求</div></div>
        <div class="stat-tile"><div class="label">✅ 已完成</div><div class="value">${done}</div><div class="delta">进度达 100%</div></div>
        <div class="stat-tile"><div class="label">🚧 进行中</div><div class="value">${ing}</div><div class="delta">0% < 进度 < 100%</div></div>
        <div class="stat-tile"><div class="label">📋 未启动</div><div class="value">${todo}</div><div class="delta">进度为 0</div></div>
      </div>

      <div class="grid cols-2">
        <div class="chart-card">
          <div class="chart-title">按需求分类进度（平均）</div>
          ${catBars.length ? hbarList(catBars.map(c => ({ label: c.label, value: c.value, color: 'linear-gradient(90deg,#f9b8d0,#ec6a9c)' }))) : '<div class="empty">暂无数据</div>'}
        </div>
        <div class="chart-card">
          <div class="chart-title">整体完成度</div>
          <div style="display:flex;justify-content:center">${donut(avg, '#ec6a9c')}</div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
          <div class="section-head"><h2>系统进度明细（按需求分类）</h2><div class="spacer"></div>
          <button class="btn sm" onclick="App.importModule('other')">⬆ 导入</button>
          <button class="btn primary sm" onclick="Other.add()">+ 新增系统/需求</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${cats.map(c => `<div class="chip ${c===this.filter?'on':''}" onclick="Other.setFilter('${c}')">${c}</div>`).join('')}
        </div>
        ${list.length ? `<div class="table-wrap"><table class="tbl">
          <tr><th>系统/需求名称</th><th>需求分类</th><th>负责人</th><th>进度</th><th>状态</th><th></th></tr>
          ${list.map(i => `<tr>
            <td><b>${U.esc(i.name)}</b>${i.note?`<br><span class="muted" style="font-size:12px">${U.esc(i.note)}</span>`:''}</td>
            <td><span class="pill" style="background:#fde3ee;color:#c2477f">${U.esc(i.cat||'其他')}</span></td>
            <td>${U.esc(i.owner||'—')}</td>
            <td>${progCell(i.progress)}</td>
            <td>${statusPill(i.progress)}</td>
            <td><button class="btn ghost sm" onclick="Other.edit('${i.id}')">编辑</button>
                <button class="btn ghost sm danger" onclick="Other.del('${i.id}')">删</button></td>
          </tr>`).join('')}
        </table></div>` : `<div class="empty">该分类下暂无记录，点击右上角添加</div>`}
      </div>`;
  },
  setFilter(c) { this.filter = c; this.render(); },
  add() { this.form({}); },
  edit(id) { this.form(DB.get().other.find(i => i.id === id), id); },
  form(i, id) {
    i = i || {};
    openModal(id ? '编辑记录' : '新增系统/需求', `
      <div class="field"><label>系统 / 需求名称</label><input id="o_name" value="${U.esc(i.name||'')}" placeholder="如：信贷管理系统改造"></div>
      <div class="row2">
        <div class="field"><label>需求分类</label><input id="o_cat" value="${U.esc(i.cat||'')}" placeholder="如：核心系统 / 数据平台 / 风控"></div>
        <div class="field"><label>负责人</label><input id="o_owner" value="${U.esc(i.owner||'')}" placeholder="牵头人"></div>
      </div>
      <div class="field"><label>建设进度（%）</label><input type="number" id="o_prog" min="0" max="100" value="${i.progress!=null?i.progress:0}"></div>
      <div class="field"><label>备注</label><textarea id="o_note" placeholder="关键节点、卡点、对接情况等">${U.esc(i.note||'')}</textarea></div>
    `, () => {
      const name = document.getElementById('o_name').value.trim();
      if (!name) { toast('请填写名称'); return; }
      const obj = {
        name, cat: document.getElementById('o_cat').value.trim() || '其他',
        owner: document.getElementById('o_owner').value.trim(),
        progress: Number(document.getElementById('o_prog').value) || 0,
        note: document.getElementById('o_note').value.trim()
      };
      if (id) DB.update('other', id, obj); else DB.add('other', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); toast('已保存');
    });
  },
  del(id) { confirmDel('确认删除？', () => { DB.remove('other', id); this.render(); toast('已删除'); }); },
};
