/* ============ 灵感笔记模块 ============ */
const Notes = {
  _expanded: null,
  render() {
    const list = DB.get().notes || [];
    const kw = (this._filter || '').trim();
    const shown = kw ? list.filter(n => (n.title || '').includes(kw) || (n.content || '').includes(kw)) : list;
    document.getElementById('view-notes').innerHTML = `
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">📓 笔记总数</div><div class="value">${list.length}</div><div class="delta">随记随存</div></div>
        <div class="stat-tile"><div class="label">📅 本月新增</div><div class="value">${list.filter(n => (n.date||'').slice(0,7) === U.today().slice(0,7)).length}</div><div class="delta">灵光一现</div></div>
        <div class="stat-tile"><div class="label">🏷️ 含标签</div><div class="value">${list.filter(n => n.tags).length}</div><div class="delta">分类管理</div></div>
      </div>
      <div class="card">
        <div class="section-head">
          <h2>灵感笔记</h2>
          <div class="spacer"></div>
          <input class="field" style="width:160px;padding:6px 10px;border:2px dashed var(--line);border-radius:14px;font-size:12px" placeholder="🔍 搜索笔记" oninput="Notes.setFilter(this.value)" value="${U.esc(kw)}">
          <button class="btn primary sm" onclick="Notes.add()">+ 记录灵感</button>
        </div>
        ${shown.length ? shown.slice().reverse().map(n => this.card(n)).join('') : `<div class="empty">${kw ? '没有匹配的笔记' : '暂无灵感笔记，点击上方添加 ✨'}</div>`}
      </div>`;
  },
  card(n) {
    const ex = this._expanded === n.id;
    const tags = n.tags ? n.tags.split(/[,，\s]+/).filter(Boolean) : [];
    return `
      <div class="nt-card" onclick="Notes.toggle('${n.id}')">
        <div class="nt-head">
          <div class="nt-title">${U.esc(n.title || '未命名')}</div>
          <div class="nt-arrow">${ex ? '▾' : '▸'}</div>
        </div>
        <div class="nt-meta">
          <span class="pill purple" style="font-size:11px">${n.date || '—'}</span>
          ${tags.map(t => `<span class="pill" style="font-size:11px;background:var(--amber-soft);color:var(--ink)">#${U.esc(t)}</span>`).join('')}
        </div>
        ${ex ? `
        <div class="nt-body">
          <div style="white-space:pre-wrap;line-height:1.7;font-size:13.5px;color:var(--ink)">${U.esc(n.content || '')}</div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn ghost sm" onclick="event.stopPropagation();Notes.edit('${n.id}')">编辑</button>
            <button class="btn ghost sm danger" onclick="event.stopPropagation();Notes.del('${n.id}')">删除</button>
          </div>
        </div>` : ''}
      </div>`;
  },
  toggle(id) { this._expanded = this._expanded === id ? null : id; this.render(); },
  setFilter(v) { this._filter = v; this._expanded = null; this.render(); },
  add() { this.form({}); },
  edit(id) { this.form(DB.get().notes.find(n => n.id === id), id); },
  form(n, id) {
    n = n || {};
    openModal(id ? '编辑笔记' : '记录灵感', `
      <div class="row2">
        <div class="field"><label>标题</label><input id="n_title" value="${U.esc(n.title || '')}" placeholder="灵感标题"></div>
        <div class="field"><label>日期</label><input type="date" id="n_date" value="${n.date || U.today()}"></div>
      </div>
      <div class="field"><label>内容</label><textarea id="n_content" style="min-height:120px" placeholder="把灵感写下来...">${U.esc(n.content || '')}</textarea></div>
      <div class="field"><label>标签（可选，逗号分隔）</label><input id="n_tags" value="${U.esc(n.tags || '')}" placeholder="如：产品设计,竞品分析,流程优化"></div>
    `, () => {
      const title = document.getElementById('n_title').value.trim();
      if (!title) { toast('请填写标题'); return; }
      const obj = {
        title, date: document.getElementById('n_date').value || U.today(),
        content: document.getElementById('n_content').value.trim(),
        tags: document.getElementById('n_tags').value.trim()
      };
      if (id) DB.update('notes', id, obj); else DB.add('notes', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); toast('已保存');
    });
  },
  del(id) { confirmDel('确认删除？', () => { DB.remove('notes', id); if (this._expanded === id) this._expanded = null; this.render(); toast('已删除'); }); },
};
