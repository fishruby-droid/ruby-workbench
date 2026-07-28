/* ============ 专区三：制度建设专区 ============ */
const Policy = {
  tab: 'build',
  render() {
    document.getElementById('view-policy').innerHTML = `
      <div class="card" style="padding-bottom:8px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div class="chip ${this.tab==='build'?'on':''}" onclick="Policy.switch('build')">制度建设进度</div>
          <div class="chip ${this.tab==='repo'?'on':''}" onclick="Policy.switch('repo')">制度知识库</div>
          <div class="spacer"></div>
          <a class="btn sm" style="text-decoration:none" href="https://www.huixiao2.com/chat-pc/" target="_blank" rel="noopener">🤖 汇小二</a>
          <a class="btn sm" style="text-decoration:none" href="https://www.safe.gov.cn/" target="_blank" rel="noopener">🌐 国家外汇管理局</a>
          <a class="btn sm" style="text-decoration:none" href="http://www.pbc.gov.cn/" target="_blank" rel="noopener">🏦 中国人民银行</a>
        </div>
      </div>
      <div id="policy-body"></div>`;
    this.renderBody();
  },
  switch(t) { this.tab = t; this.render(); },
  renderBody() { document.getElementById('policy-body').innerHTML = this.tab === 'build' ? this.build() : this.repo(); },

  /* --- 制度建设进度 --- */
  build() {
    const items = DB.get().policy.items;
    const cats = ['全部', ...new Set(items.map(i => i.cat || '其他'))];
    const cur = this._filter || '全部';
    const list = cur === '全部' ? items : items.filter(i => (i.cat || '其他') === cur);
    const avg = items.length ? Math.round(items.reduce((s, i) => s + Number(i.progress || 0), 0) / items.length) : 0;
    const done = items.filter(i => Number(i.progress || 0) >= 100).length;
    const draft = items.filter(i => Number(i.progress || 0) < 100).length;
    // 按分类聚合进度
    const byCat = {};
    items.forEach(i => { const c = i.cat || '其他'; byCat[c] = byCat[c] || []; byCat[c].push(Number(i.progress || 0)); });
    const catBars = Object.keys(byCat).map(c => ({
      label: c, value: Math.round(byCat[c].reduce((a, b) => a + b, 0) / byCat[c].length)
    }));

    return `
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">📁 制度总数</div><div class="value">${items.length}</div><div class="delta">覆盖分类 ${Object.keys(byCat).length} 类</div></div>
        <div class="stat-tile"><div class="label">✅ 已发布</div><div class="value">${done}</div><div class="delta">进度达 100%</div></div>
        <div class="stat-tile"><div class="label">✍️ 制定中</div><div class="value">${draft}</div><div class="delta">整体平均进度 ${avg}%</div></div>
      </div>
      <div class="grid cols-2">
        <div class="chart-card"><div class="chart-title">分类建设进度（平均）</div>
          ${catBars.length ? hbarList(catBars.map(c => ({ label: c.label, value: c.value, color: 'linear-gradient(90deg,#b78ad6,#f9b8d0)' }))) : '<div class="empty">暂无数据</div>'}
        </div>
        <div class="chart-card"><div class="chart-title">整体完成度</div>
          <div style="display:flex;justify-content:center">${donut(avg, '#b78ad6')}</div>
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="section-head"><h2>制度建设明细</h2><div class="spacer"></div>
          <button class="btn sm" onclick="App.importModule('policy_items')">⬆ 导入制度</button>
          <button class="btn primary sm" onclick="Policy.addItem()">+ 新增制度</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${cats.map(c => `<div class="chip ${c===cur?'on':''}" onclick="Policy.setFilter('${c}')">${c}</div>`).join('')}
        </div>
        ${list.length ? `<div class="table-wrap"><table class="tbl">
          <tr><th>制度名称</th><th>分类</th><th>责任人</th><th>进度</th><th>状态</th><th></th></tr>
          ${list.map(i => `<tr>
            <td><b>${U.esc(i.name)}</b>${i.note?`<br><span class="muted" style="font-size:12px">${U.esc(i.note)}</span>`:''}</td>
            <td><span class="pill purple">${U.esc(i.cat||'其他')}</span></td>
            <td>${U.esc(i.owner||'—')}</td>
            <td>${progCell(i.progress)}</td>
            <td>${statusPill(i.progress)}</td>
            <td><button class="btn ghost sm" onclick="Policy.editItem('${i.id}')">编辑</button>
                <button class="btn ghost sm danger" onclick="Policy.delItem('${i.id}')">删</button></td>
          </tr>`).join('')}
        </table></div>` : `<div class="empty">该分类下暂无制度</div>`}
      </div>`;
  },
  setFilter(c) { this._filter = c; this.renderBody(); },
  addItem() { this.itemForm({}); },
  editItem(id) { this.itemForm(DB.get().policy.items.find(i => i.id === id), id); },
  itemForm(i, id) {
    i = i || {};
    openModal(id ? '编辑制度' : '新增制度', `
      <div class="field"><label>制度名称</label><input id="i_name" value="${U.esc(i.name||'')}" placeholder="如：跨境电商外汇收支管理办法"></div>
      <div class="row2">
        <div class="field"><label>分类</label><input id="i_cat" value="${U.esc(i.cat||'')}" placeholder="如：外汇管理 / 反洗钱"></div>
        <div class="field"><label>责任人</label><input id="i_owner" value="${U.esc(i.owner||'')}" placeholder="牵头人"></div>
      </div>
      <div class="field"><label>建设进度（%）</label><input type="number" id="i_prog" min="0" max="100" value="${i.progress!=null?i.progress:0}"></div>
      <div class="field"><label>备注</label><textarea id="i_note" placeholder="发文状态、审批节点等">${U.esc(i.note||'')}</textarea></div>
    `, () => {
      const name = document.getElementById('i_name').value.trim();
      if (!name) { toast('请填写制度名称'); return; }
      const obj = {
        name, cat: document.getElementById('i_cat').value.trim() || '其他',
        owner: document.getElementById('i_owner').value.trim(),
        progress: Number(document.getElementById('i_prog').value) || 0,
        note: document.getElementById('i_note').value.trim()
      };
      if (id) DB.updPolicy('items', id, obj); else DB.addPolicy('items', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); toast('已保存');
    });
  },
  delItem(id) { confirmDel('确认删除？', () => { DB.delPolicy('items', id); this.render(); toast('已删除'); }); },

  /* --- 制度知识库 --- */
  // 官方目录大类 → 业务人员易懂的分类标签 + 配色
  CAT_LABEL: {
    '综合': '综合 / 基础法规',
    '经常项目外汇管理': '经常项目',
    '资本项目外汇管理': '资本项目',
    '金融机构外汇业务监管': '金融机构监管',
    '人民币汇率与外汇市场': '汇率与外汇市场',
    '国际收支与外汇统计': '国际收支统计',
    '外汇检查与法规适用': '外汇检查',
    '外汇科技管理': '外汇科技',
    '人民银行跨境相关': '人民银行跨境',
    '其他': '其他',
  },
  CAT_COLOR: {
    '综合': '#ec6a9c',
    '经常项目外汇管理': '#6fc4b6',
    '资本项目外汇管理': '#b78ad6',
    '金融机构外汇业务监管': '#f2c46b',
    '人民币汇率与外汇市场': '#e98ab0',
    '国际收支与外汇统计': '#7ec8a0',
    '外汇检查与法规适用': '#d98a6b',
    '外汇科技管理': '#9ab8e0',
    '人民银行跨境相关': '#8ec9c0',
    '其他': '#c3b2bd',
  },
  catLabel(c) { return this.CAT_LABEL[c] || c; },
  catColor(c) { return this.CAT_COLOR[c] || '#c3b2bd'; },
  repo() {
    const items = DB.get().policy.repo;
    const src = ['全部', '本行制度', '监管制度'];
    const cur = this._rfilter || '全部';
    const curCat = this._rcat || '全部';
    const curSub = this._rsub || '全部';
    const kw = (this._rkw || '').trim();
    // 分类计数（按映射后的标签）
    const catCount = {};
    items.forEach(i => { const c = this.catLabel(i.cat || '其他'); catCount[c] = (catCount[c] || 0) + 1; });
    const cats = ['全部', ...Object.keys(this.CAT_LABEL).filter(c => catCount[this.catLabel(c)]).map(c => this.catLabel(c))];
    let list = cur === '全部' ? items : items.filter(i => i.src === cur);
    if (curCat !== '全部') list = list.filter(i => this.catLabel(i.cat || '其他') === curCat);
    // 子类计数（仅当前大类下）
    const subCount = {};
    list.forEach(i => { const s = i.sub || '其他'; subCount[s] = (subCount[s] || 0) + 1; });
    const subs = ['全部', ...Object.keys(subCount).filter(s => s !== '全部')];
    if (curSub !== '全部') list = list.filter(i => (i.sub || '其他') === curSub);
    if (kw) list = list.filter(i => (i.name + (i.no || '') + (i.org || '')).includes(kw));
    const activeCatKey = Object.keys(this.CAT_LABEL).find(k => this.CAT_LABEL[k] === curCat) || '其他';
    const accent = curCat === '全部' ? 'var(--brand)' : this.catColor(activeCatKey);
    const row = (r) => `<tr>
      <td><b>${U.esc(r.name)}</b>${r.link?`<br><a href="${U.esc(r.link)}" target="_blank" style="font-size:12px">查看原文 ↗</a>`:''}</td>
      <td>${r.src==='监管制度'?'<span class="pill blue">监管制度</span>':'<span class="pill purple">本行制度</span>'}</td>
      <td>${U.esc(this.catLabel(r.cat||'其他'))}<br><span class="muted" style="font-size:11px">${U.esc(r.sub||'')}</span></td>
      <td>${U.esc(r.org||'—')}</td>
      <td>${U.esc(r.no||'—')}</td>
      <td><button class="btn ghost sm" onclick="Policy.editRepo('${r.id}')">编辑</button>
          <button class="btn ghost sm danger" onclick="Policy.delRepo('${r.id}')">删</button></td>
    </tr>`;
    return `
      <div class="card">
        <div class="section-head"><h2>制度知识库</h2><div class="spacer"></div>
          <button class="btn sm" onclick="Policy.loadOfficial()">📥 载入官方现行法规</button>
          <button class="btn sm" onclick="App.importModule('policy_repo')">⬆ 导入</button>
          <button class="btn primary sm" onclick="Policy.addRepo()">+ 录入制度</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px">
          ${src.map(s => `<div class="chip ${s===cur?'on':''}" onclick="Policy.setRFilter('${s}')">${s}</div>`).join('')}
        </div>
        <div class="repo-layout">
          <aside class="repo-nav">
            <div class="repo-nav-title">按业务分类</div>
            ${cats.map(c => {
              const key = Object.keys(this.CAT_LABEL).find(k => this.CAT_LABEL[k] === c) || '其他';
              const col = this.catColor(key);
              const on = c === curCat;
              return `<div class="repo-cat ${on?'on':''}" onclick="Policy.setRCat('${c}')" ${on?'':`style="border-left:4px solid ${col}"`}>
                <span>${c}</span><span class="repo-cat-n" ${on?'':`style="background:${col}22;color:${col}"`}>${c==='全部'?items.length:(catCount[c]||0)}</span>
              </div>`;
            }).join('')}
          </aside>
          <div class="repo-main">
            ${curCat !== '全部' ? `
            <div class="repo-subbar" style="border-left:4px solid ${accent}">
              ${subs.map(s => `<div class="chip ${s===curSub?'on':''}" onclick="Policy.setRSub('${s}')" ${s===curSub?`style="background:${accent};border-color:${accent}"`:''}>${s} <span class="repo-sub-n">${s==='全部'?(catCount[curCat]||0):(subCount[s]||0)}</span></div>`).join('')}
            </div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0">
              <input class="field" style="flex:1;min-width:160px;padding:8px 12px;border:2px dashed var(--line);border-radius:14px" placeholder="🔍 搜索法规名称 / 文号 / 机构" oninput="Policy.setRKw(this.value)" value="${U.esc(kw)}">
              <span class="muted" style="font-size:12px">共 ${list.length} 条</span>
            </div>
            ${list.length ? `<div class="table-wrap"><table class="tbl">
              <tr><th>制度名称</th><th>来源</th><th>分类 / 子类</th><th>发文机构</th><th>文号/版本</th><th></th></tr>
              ${list.map(row).join('')}
            </table></div>` : `<div class="empty">该分类下暂无法规</div>`}
          </div>
        </div>
      </div>`;
  },
  setRCat(c) { this._rcat = c; this._rsub = '全部'; this.renderBody(); },
  setRSub(s) { this._rsub = s; this.renderBody(); },
  setRKw(v) { this._rkw = v; this.renderBody(); },
  setRFilter(s) { this._rfilter = s; this.renderBody(); },
  /** 一键载入官方现行有效跨境法规（外汇局目录 + 人行跨境相关），去重追加，不覆盖已有 */
  loadOfficial() {
    const bundle = (typeof window.REGULATIONS_BUNDLE !== 'undefined') ? window.REGULATIONS_BUNDLE : [];
    if (!bundle.length) { toast('法规数据包未加载'); return; }
    const cur = DB.get().policy.repo || [];
    const have = new Set(cur.map(r => r.id));
    let added = 0, updated = 0;
    bundle.forEach(r => {
      if (have.has(r.id)) {
        // 已存在：更新（用于链接修复等版本迭代）
        DB.updPolicy('repo', r.id, r);
        updated++;
      } else {
        DB.addPolicy('repo', Object.assign({}, r));
        added++;
      }
    });
    if (this.tab === 'repo') this.renderBody();
    else if (typeof App !== 'undefined' && App.cur === 'policy') this.render();
    if (updated) toast(`已更新 ${updated} 条（最新链接），新增 ${added} 条`);
    else toast(added ? `已载入 ${added} 条官方现行法规` : '官方法规已全部在库');
  },
  addRepo() { this.repoForm({}); },
  editRepo(id) { this.repoForm(DB.get().policy.repo.find(r => r.id === id), id); },
  repoForm(r, id) {
    r = r || {};
    openModal(id ? '编辑制度' : '录入制度', `
      <div class="field"><label>制度名称</label><input id="r_name" value="${U.esc(r.name||'')}" placeholder="如：支付机构外汇业务管理办法"></div>
      <div class="row2">
        <div class="field"><label>来源</label><select id="r_src">${['本行制度','监管制度'].map(s=>`<option ${s===r.src?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>分类</label><input id="r_cat" value="${U.esc(r.cat||'')}" placeholder="如：外汇管理"></div>
      </div>
      <div class="row2">
        <div class="field"><label>发文机构</label><input id="r_org" value="${U.esc(r.org||'')}" placeholder="如：国家外汇管理局"></div>
        <div class="field"><label>文号 / 版本</label><input id="r_no" value="${U.esc(r.no||'')}" placeholder="如：汇发〔2019〕13号"></div>
      </div>
      <div class="field"><label>原文链接</label><input id="r_link" value="${U.esc(r.link||'')}" placeholder="http://..."></div>
      <div class="field"><label>要点摘要</label><textarea id="r_note" placeholder="核心要求、适用范围">${U.esc(r.note||'')}</textarea></div>
    `, () => {
      const name = document.getElementById('r_name').value.trim();
      if (!name) { toast('请填写制度名称'); return; }
      const obj = {
        name, src: document.getElementById('r_src').value,
        cat: document.getElementById('r_cat').value.trim(),
        org: document.getElementById('r_org').value.trim(),
        no: document.getElementById('r_no').value.trim(),
        link: document.getElementById('r_link').value.trim(),
        note: document.getElementById('r_note').value.trim()
      };
      if (id) DB.updPolicy('repo', id, obj); else DB.addPolicy('repo', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.renderBody(); toast('已保存');
    });
  },
  delRepo(id) { confirmDel('确认删除？', () => { DB.delPolicy('repo', id); this.renderBody(); toast('已删除'); }); },
};
