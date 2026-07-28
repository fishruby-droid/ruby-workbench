/* ============ 专区四：监管报送专区 ============ */
const Report = {
  render() {
    const list = DB.get().report;
    const today = U.today();
    // 计算下一次到期
    const withNext = list.map(r => {
      const nx = nextDue(r);
      const d = U.daysFromToday(nx);
      return { ...r, nx, d };
    }).sort((a, b) => a.d - b.d);

    const overdue = withNext.filter(r => r.d < 0).length;
    const due7 = withNext.filter(r => r.d >= 0 && r.d <= 7).length;
    const ok = withNext.filter(r => r.d > 7).length;

    document.getElementById('view-report').innerHTML = `
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">🔴 已逾期</div><div class="value" style="color:var(--red)">${overdue}</div><div class="delta">超过报送期限</div></div>
        <div class="stat-tile"><div class="label">🟠 7日内到期</div><div class="value" style="color:var(--amber)">${due7}</div><div class="delta">需尽快处理</div></div>
        <div class="stat-tile"><div class="label">🟢 正常</div><div class="value" style="color:var(--green)">${ok}</div><div class="delta">报送项共 ${list.length} 个</div></div>
      </div>
      ${overdue || due7 ? `<div class="card" style="border-color:var(--amber);background:var(--amber-soft)">
        <b>⏰ 报送提醒</b>：当前有 ${overdue} 项已逾期、${due7} 项将在 7 日内到期，请及时处理。
      </div>` : ''}
      <div class="card">
        <div class="section-head"><h2>监管报送清单</h2><div class="spacer"></div>
          <button class="btn sm" onclick="App.importModule('report')">⬆ 导入</button>
          <button class="btn primary sm" onclick="Report.add()">+ 新增报送项</button></div>
        ${withNext.length ? `<div class="table-wrap"><table class="tbl">
          <tr><th>报表/文件</th><th>报送对象</th><th>频率</th><th>下一次到期</th><th>状态</th><th></th></tr>
          ${withNext.map(r => `<tr>
            <td><b>${U.esc(r.name)}</b>${r.note?`<br><span class="muted" style="font-size:12px">${U.esc(r.note)}</span>`:''}</td>
            <td>${U.esc(r.to||'—')}</td>
            <td><span class="pill gray">${freqText(r.freq)}</span></td>
            <td>${r.nx}<br><span class="muted" style="font-size:12px">${r.d<0?`已逾期 ${-r.d} 天`:r.d===0?'今天到期':`还有 ${r.d} 天`}</span></td>
            <td>${duePill(r.d)}</td>
            <td><button class="btn ghost sm" onclick="Report.done('${r.id}')">已报</button>
                <button class="btn ghost sm" onclick="Report.edit('${r.id}')">编辑</button>
                <button class="btn ghost sm danger" onclick="Report.del('${r.id}')">删</button></td>
          </tr>`).join('')}
        </table></div>` : `<div class="empty">暂无报送项，点击右上角添加</div>`}
      </div>`;
  },
  add() { this.form({}); },
  edit(id) { this.form(DB.get().report.find(r => r.id === id), id); },
  form(r, id) {
    r = r || {};
    openModal(id ? '编辑报送项' : '新增报送项', `
      <div class="field"><label>报表 / 文件名称</label><input id="r_name" value="${U.esc(r.name||'')}" placeholder="如：跨境收支申报表"></div>
      <div class="row2">
        <div class="field"><label>报送对象</label><input id="r_to" value="${U.esc(r.to||'')}" placeholder="如：外汇局 / 人行"></div>
        <div class="field"><label>报送频率</label><select id="r_freq">
          ${[['daily','每日'],['weekly','每周'],['monthly','每月'],['quarterly','每季'],['half','每半年'],['yearly','每年'],['once','一次性']].map(f=>`<option value="${f[0]}" ${f[0]===r.freq?'selected':''}>${f[1]}</option>`).join('')}
        </select></div>
      </div>
      <div class="field"><label>最近一次报送日期</label><input type="date" id="r_last" value="${r.last||U.today()}"></div>
      <div class="field"><label>备注</label><textarea id="r_note" placeholder="报送渠道、要求等">${U.esc(r.note||'')}</textarea></div>
    `, () => {
      const name = document.getElementById('r_name').value.trim();
      if (!name) { toast('请填写名称'); return; }
      const obj = {
        name, to: document.getElementById('r_to').value.trim(),
        freq: document.getElementById('r_freq').value,
        last: document.getElementById('r_last').value || U.today(),
        note: document.getElementById('r_note').value.trim()
      };
      if (id) DB.update('report', id, obj); else DB.add('report', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); App.refreshBadges(); toast('已保存');
    });
  },
  done(id) {
    const r = DB.get().report.find(x => x.id === id);
    if (r) { DB.update('report', id, { last: U.today() }); this.render(); App.refreshBadges(); toast('已记录本次报送'); }
  },
  del(id) { confirmDel('确认删除？', () => { DB.remove('report', id); this.render(); App.refreshBadges(); toast('已删除'); }); },
};

/* 频率 -> 天数 */
const FREQ_DAYS = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, half: 182, yearly: 365, once: 9999 };
function freqText(f) { return { daily:'每日', weekly:'每周', monthly:'每月', quarterly:'每季', half:'每半年', yearly:'每年', once:'一次性' }[f] || f; }
/* 计算下一次到期日 */
function nextDue(r) {
  const ld = r.last || U.today();
  const step = FREQ_DAYS[r.freq] || 30;
  if (r.freq === 'once') return ld;
  let cur = ld;
  while (U.daysFromToday(cur) < 0) cur = U.addDays(cur, step);
  return cur;
}
function duePill(d) {
  if (d < 0) return '<span class="pill red">逾期</span>';
  if (d === 0) return '<span class="pill red">今天</span>';
  if (d <= 7) return '<span class="pill amber">临期</span>';
  return '<span class="pill green">正常</span>';
}
