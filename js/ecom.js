/* ============ 专区二：跨境电商系统专区 ============ */
const Ecom = {
  tab: 'overview',
  filter: 'all',
  render() {
    const tabs = [
      ['overview', '总体进度'], ['partner', '对接机构/平台'],
      ['demand', '系统需求'], ['stat', '业务数据统计']
    ];
    document.getElementById('view-ecom').innerHTML = `
      <div class="card" style="padding-bottom:8px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center" id="ecom-tabs">
          ${tabs.map(t => `<div class="chip ${t[0]===this.tab?'on':''}" onclick="Ecom.switch('${t[0]}')">${t[1]}</div>`).join('')}
          <div class="spacer" style="flex:1"></div>
          <button class="btn sm" onclick="Ecom.importAll()">⬆ 导入</button>
        </div>
      </div>
      <div id="ecom-body"></div>`;
    this.renderBody();
  },
  switch(t) { this.tab = t; this.render(); },
  importAll() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const o = JSON.parse(e.target.result);
          const src = o.ecom ? o.ecom : o;  // 支持整库或 ecom 子对象
          ['partners','demands','stats'].forEach(k => { if (Array.isArray(src[k])) src[k].forEach(x => { if (x && (x.name || x.title || x.metric)) DB.addEcom(k, Object.assign({ id: U.uid() }, x)); }); });
          toast('已导入电商系统数据'); this.render();
        } catch (err) { toast('导入失败：格式不正确'); }
      };
      r.readAsText(f);
    };
    inp.click();
  },
  renderBody() {
    const map = { overview: () => this.overview(), partner: () => this.partner(), demand: () => this.demand(), stat: () => this.stat() };
    document.getElementById('ecom-body').innerHTML = map[this.tab]();
  },

  /* --- 总体进度 --- */
  overview() {
    const e = DB.get().ecom;
    const avg = e.partners.length ? Math.round(e.partners.reduce((s, p) => s + Number(p.progress || 0), 0) / e.partners.length) : 0;
    const done = e.partners.filter(p => Number(p.progress || 0) >= 100).length;
    const ing = e.partners.filter(p => Number(p.progress || 0) > 0 && Number(p.progress || 0) < 100).length;
    const todo = e.partners.filter(p => Number(p.progress || 0) <= 0).length;
    return `
      <div class="grid cols-4" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">📊 系统总体进度</div><div class="value">${avg}<small>%</small></div><div class="delta">${e.partners.length} 个对接对象</div></div>
        <div class="stat-tile"><div class="label">✅ 已完成对接</div><div class="value">${done}</div><div class="delta">进度达 100%</div></div>
        <div class="stat-tile"><div class="label">🚧 进行中</div><div class="value">${ing}</div><div class="delta">0% < 进度 < 100%</div></div>
        <div class="stat-tile"><div class="label">📋 未启动</div><div class="value">${todo}</div><div class="delta">进度为 0</div></div>
      </div>
      <div class="grid cols-2">
        <div class="chart-card">
          <div class="chart-title">系统建设总体进度</div>
          <div style="display:flex;align-items:center;gap:20px">
            ${donut(avg)}
            <div style="flex:1">
              <div class="field" style="margin:0">
                <label>总体进度（%）</label>
                <div class="row2">
                  <input type="number" id="ov_prog" min="0" max="100" value="${e.overview.progress}" style="margin-bottom:0">
                  <button class="btn primary sm" onclick="Ecom.saveOverview()">更新</button>
                </div>
              </div>
              <div class="field" style="margin-top:10px">
                <textarea id="ov_note" placeholder="总体建设说明 / 里程碑备注">${U.esc(e.overview.note)}</textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">对接状态分布</div>
          ${hbarList([
            { label: '已完成', value: done, color: 'linear-gradient(90deg,#1f9d57,#4fd08a)' },
            { label: '进行中', value: ing, color: 'linear-gradient(90deg,#f9b8d0,#ec6a9c)' },
            { label: '未启动', value: todo, color: 'linear-gradient(90deg,#97a1b0,#c2cad6)' },
          ])}
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="section-head"><h2>对接进度明细（按机构/平台）</h2><div class="spacer"></div>
          <button class="btn primary sm" onclick="Ecom.switch('partner')">前往管理 →</button></div>
        ${e.partners.length ? `<div class="table-wrap"><table class="tbl">
          <tr><th>机构/平台</th><th>类别</th><th>负责人</th><th>进度</th><th>状态</th></tr>
          ${e.partners.map(p => `<tr>
            <td><b>${U.esc(p.name)}</b>${p.note ? `<br><span class="muted" style="font-size:12px">${U.esc(p.note)}</span>`:''}</td>
            <td><span class="pill gray">${U.esc(p.cat || '其他')}</span></td>
            <td>${U.esc(p.owner || '—')}</td>
            <td>${progCell(p.progress)}</td>
            <td>${statusPill(p.progress)}</td>
          </tr>`).join('')}
        </table></div>` : `<div class="empty">暂无对接机构，前往"对接机构/平台"添加</div>`}
      </div>`;
  },
  saveOverview() {
    DB.get().ecom.overview.progress = Number(document.getElementById('ov_prog').value) || 0;
    DB.get().ecom.overview.note = document.getElementById('ov_note').value;
    DB.save(); toast('总体进度已更新'); this.render();
  },

  /* --- 对接机构/平台 --- */
  partner() {
    const e = DB.get().ecom;
    const cats = ['全部', ...new Set(e.partners.map(p => p.cat || '其他'))];
    const list = this.filter === 'all' ? e.partners : e.partners.filter(p => (p.cat || '其他') === this.filter);
    return `
      <div class="card">
        <div class="section-head"><h2>外部对接机构 / 平台</h2><div class="spacer"></div>
          <button class="btn primary sm" onclick="Ecom.addPartner()">+ 新增对接</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${cats.map(c => `<div class="chip ${c===this.filter?'on':''}" onclick="Ecom.setFilter('${c}')">${c}</div>`).join('')}
        </div>
        ${list.length ? `<div class="table-wrap"><table class="tbl">
          <tr><th>机构/平台</th><th>类别</th><th>对接内容</th><th>负责人</th><th>进度</th><th>状态</th><th></th></tr>
          ${list.map(p => `<tr>
            <td><b>${U.esc(p.name)}</b></td>
            <td><span class="pill gray">${U.esc(p.cat||'其他')}</span></td>
            <td>${U.esc(p.content || '—')}</td>
            <td>${U.esc(p.owner||'—')}</td>
            <td>${progCell(p.progress)}</td>
            <td>${statusPill(p.progress)}</td>
            <td><button class="btn ghost sm" onclick="Ecom.editPartner('${p.id}')">编辑</button>
                <button class="btn ghost sm danger" onclick="Ecom.delPartner('${p.id}')">删</button></td>
          </tr>`).join('')}
        </table></div>` : `<div class="empty">该分类下暂无对接对象</div>`}
      </div>`;
  },
  setFilter(c) { this.filter = c; this.renderBody(); },
  addPartner() { this.partnerForm({}); },
  editPartner(id) { this.partnerForm(DB.get().ecom.partners.find(p => p.id === id), id); },
  partnerForm(p, id) {
    p = p || {};
    openModal(id ? '编辑对接' : '新增对接', `
      <div class="field"><label>机构/平台名称</label><input id="p_name" value="${U.esc(p.name||'')}" placeholder="如：海关总署跨境电商通关平台"></div>
      <div class="row2">
        <div class="field"><label>类别</label><input id="p_cat" value="${U.esc(p.cat||'')}" placeholder="如：监管机构 / 支付 / 物流"></div>
        <div class="field"><label>负责人</label><input id="p_owner" value="${U.esc(p.owner||'')}" placeholder="对接负责人"></div>
      </div>
      <div class="field"><label>对接内容</label><textarea id="p_content" placeholder="接口、数据、流程等">${U.esc(p.content||'')}</textarea></div>
      <div class="field"><label>进度（%）</label><input type="number" id="p_prog" min="0" max="100" value="${p.progress!=null?p.progress:0}"></div>
      <div class="field"><label>备注</label><textarea id="p_note" placeholder="关键节点、卡点等">${U.esc(p.note||'')}</textarea></div>
    `, () => {
      const name = document.getElementById('p_name').value.trim();
      if (!name) { toast('请填写名称'); return; }
      const obj = {
        name, cat: document.getElementById('p_cat').value.trim() || '其他',
        owner: document.getElementById('p_owner').value.trim(),
        content: document.getElementById('p_content').value.trim(),
        progress: Number(document.getElementById('p_prog').value) || 0,
        note: document.getElementById('p_note').value.trim()
      };
      if (id) DB.updEcom('partners', id, obj); else DB.addEcom('partners', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); toast('已保存');
    });
  },
  delPartner(id) { confirmDel('确认删除该对接对象？', () => { DB.delEcom('partners', id); this.render(); toast('已删除'); }); },

  /* --- 系统需求 --- */
  demand() {
    const list = DB.get().ecom.demands;
    const st = { todo: ['待评估', 'amber'], doing: ['开发中', 'blue'], done: ['已上线', 'green'], reject: ['已驳回', 'gray'] };
    return `
      <div class="card">
        <div class="section-head"><h2>系统需求记录区</h2><div class="spacer"></div>
          <button class="btn primary sm" onclick="Ecom.addDemand()">+ 新增需求</button></div>
        ${list.length ? `<div class="table-wrap"><table class="tbl">
          <tr><th>需求名称</th><th>提出方</th><th>优先级</th><th>状态</th><th>期望上线</th><th></th></tr>
          ${list.slice().reverse().map(d => `<tr>
            <td><b>${U.esc(d.title)}</b>${d.desc?`<br><span class="muted" style="font-size:12px">${U.esc(d.desc)}</span>`:''}</td>
            <td>${U.esc(d.from||'—')}</td>
            <td>${prioPill(d.prio)}</td>
            <td><span class="pill ${st[d.status]?st[d.status][1]:'gray'}">${st[d.status]?st[d.status][0]:d.status}</span></td>
            <td>${U.esc(d.due||'—')}</td>
            <td><button class="btn ghost sm" onclick="Ecom.editDemand('${d.id}')">编辑</button>
                <button class="btn ghost sm danger" onclick="Ecom.delDemand('${d.id}')">删</button></td>
          </tr>`).join('')}
        </table></div>` : `<div class="empty">暂无需求记录</div>`}
      </div>`;
  },
  addDemand() { this.demandForm({}); },
  editDemand(id) { this.demandForm(DB.get().ecom.demands.find(d => d.id === id), id); },
  demandForm(d, id) {
    d = d || {};
    openModal(id ? '编辑需求' : '新增系统需求', `
      <div class="field"><label>需求名称</label><input id="d_title" value="${U.esc(d.title||'')}" placeholder="如：新增报关单自动校验"></div>
      <div class="row2">
        <div class="field"><label>提出方</label><input id="d_from" value="${U.esc(d.from||'')}" placeholder="业务/监管/合作方"></div>
        <div class="field"><label>优先级</label><select id="d_prio">${['高','中','低'].map(p=>`<option ${p===d.prio?'selected':''}>${p}</option>`).join('')}</select></div>
      </div>
      <div class="row2">
        <div class="field"><label>状态</label><select id="d_status">${['todo','doing','done','reject'].map(s=>`<option value="${s}" ${s===d.status?'selected':''}>${({todo:'待评估',doing:'开发中',done:'已上线',reject:'已驳回'})[s]}</option>`).join('')}</select></div>
        <div class="field"><label>期望上线</label><input type="date" id="d_due" value="${d.due||''}"></div>
      </div>
      <div class="field"><label>需求描述</label><textarea id="d_desc" placeholder="背景、功能点">${U.esc(d.desc||'')}</textarea></div>
    `, () => {
      const title = document.getElementById('d_title').value.trim();
      if (!title) { toast('请填写需求名称'); return; }
      const obj = {
        title, from: document.getElementById('d_from').value.trim(),
        prio: document.getElementById('d_prio').value,
        status: document.getElementById('d_status').value,
        due: document.getElementById('d_due').value,
        desc: document.getElementById('d_desc').value.trim()
      };
      if (id) DB.updEcom('demands', id, obj); else DB.addEcom('demands', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.renderBody(); toast('已保存');
    });
  },
  delDemand(id) { confirmDel('确认删除？', () => { DB.delEcom('demands', id); this.renderBody(); toast('已删除'); }); },

  /* --- 业务数据统计 --- */
  stat() {
    const list = DB.get().ecom.stats;
    const months = [...new Set(list.map(s => s.month))].sort();
    const metrics = [...new Set(list.map(s => s.metric))];
    // 取最近12个月
    const recentM = months.slice(-12);
    let chart = '';
    if (recentM.length && metrics.length) {
      const colors = ['#ec6a9c', '#f9b8d0', '#b78ad6', '#6fc4b6', '#f2c46b'];
      const w = 100 / recentM.length;
      chart = `<div class="chart-card"><div class="chart-title">业务指标趋势（近 ${recentM.length} 个月）</div>
        <div style="position:relative;height:220px;border-left:1px solid var(--line);border-bottom:1px solid var(--line);margin:10px 0 0 4px">
          ${[0,25,50,75,100].map(g=>`<div style="position:absolute;left:0;right:0;bottom:${g}%;border-top:1px dashed #eef1f6;font-size:10px;color:var(--ink-faint)"><span style="position:absolute;left:-2px;top:-7px;background:#fff;padding-right:4px">${g}</span></div>`).join('')}
          <div style="position:absolute;inset:0;display:flex;align-items:flex-end">
            ${recentM.map((mo, i) => `<div style="flex:1;display:flex;align-items:flex-end;gap:2px;height:100%;padding:0 2px">
              ${metrics.map((me, j) => {
                const rec = list.find(s => s.month === mo && s.metric === me);
                const v = rec ? Number(rec.value) : 0;
                const maxV = Math.max(...list.map(s=>Number(s.value)), 1);
                return `<div title="${mo} ${U.esc(me)}: ${v}" style="flex:1;height:${v/maxV*100}%;background:${colors[j%colors.length]};border-radius:3px 3px 0 0;min-height:2px"></div>`;
              }).join('')}
            </div>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12px">
          ${metrics.map((me,j)=>`<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${colors[j%colors.length]};margin-right:4px"></span>${U.esc(me)}</span>`).join('')}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--ink-faint)">
          ${recentM.map(mo=>`<span style="flex:1;text-align:center">${mo.slice(2)}</span>`).join('')}
        </div>
      </div>`;
    }
    return `
      <div class="card">
        <div class="section-head"><h2>业务数据统计区</h2><div class="spacer"></div>
          <button class="btn primary sm" onclick="Ecom.addStat()">+ 录入数据</button></div>
        ${(() => {
          if (!list.length) return `<div class="empty">暂无数据，点击右上角按月录入业务指标</div>`;
          // 最新月份概览
          const last = months[months.length-1];
          const lastRec = list.filter(s => s.month === last);
          return `<div class="grid cols-4" style="margin-bottom:16px">
            ${lastRec.map(r=>`<div class="stat-tile"><div class="label">${U.esc(r.metric)}</div><div class="value">${r.value}<small> ${U.esc(r.unit||'')}</small></div><div class="delta">${last} 月</div></div>`).join('')}
          </div>`;
        })()}
      </div>
      ${chart}
      ${list.length ? `<div class="card"><div class="section-head"><h2>明细数据</h2></div>
        <div class="table-wrap"><table class="tbl">
          <tr><th>月份</th><th>指标</th><th>数值</th><th>单位</th><th></th></tr>
          ${list.slice().reverse().map(s=>`<tr><td>${s.month}</td><td>${U.esc(s.metric)}</td><td><b>${s.value}</b></td><td>${U.esc(s.unit||'—')}</td>
            <td><button class="btn ghost sm danger" onclick="Ecom.delStat('${s.id}')">删</button></td></tr>`).join('')}
        </table></div></div>` : ''}`;
  },
  addStat() {
    openModal('录入业务数据', `
      <div class="field"><label>月份</label><input type="month" id="s_month" value="${U.today().slice(0,7)}"></div>
      <div class="field"><label>指标名称</label><input id="s_metric" placeholder="如：跨境支付笔数 / 交易额(万元)"></div>
      <div class="row2">
        <div class="field"><label>数值</label><input id="s_value" placeholder="如：1280"></div>
        <div class="field"><label>单位</label><input id="s_unit" placeholder="笔 / 万元"></div>
      </div>
    `, () => {
      const month = document.getElementById('s_month').value, metric = document.getElementById('s_metric').value.trim();
      const value = document.getElementById('s_value').value.trim();
      if (!month || !metric || value === '') { toast('请填写完整'); return; }
      DB.addEcom('stats', { id: U.uid(), month, metric, value: Number(value) || 0, unit: document.getElementById('s_unit').value.trim() });
      closeModal(); this.renderBody(); toast('已录入');
    });
  },
  delStat(id) { confirmDel('确认删除？', () => { DB.delEcom('stats', id); this.renderBody(); toast('已删除'); }); },
};

/* helper: 进度条 */
function progCell(p) {
  p = Number(p) || 0;
  const cls = p >= 100 ? 'green' : p > 0 ? '' : 'amber';
  return `<div class="prog-cell"><div class="bar ${cls}"><span style="width:${p}%"></span></div><span class="pct">${p}%</span></div>`;
}
function statusPill(p) {
  p = Number(p) || 0;
  if (p >= 100) return '<span class="pill green">已完成</span>';
  if (p > 0) return '<span class="pill blue">进行中</span>';
  return '<span class="pill amber">未启动</span>';
}
function prioPill(p) {
  if (p === '高') return '<span class="pill red">高</span>';
  if (p === '中') return '<span class="pill amber">中</span>';
  return '<span class="pill gray">低</span>';
}
