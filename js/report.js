/* ============ 专区四：监管报送专区 ============ */
const Report = {
  render() {
    const list = DB.get().report;
    const today = U.today();
    // 计算下一次到期
    const withNext = list.map(r => {
      const nx = nextDue(r);
      const d = U.daysFromToday(nx);
      const periodText = this.periodLabel(r.freq, r.last || U.today());
      const nextPeriod = this.periodLabel(r.freq, nx); // 下一期所属期间
      return { ...r, nx, d, periodText, nextPeriod };
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
          <tr><th>报表/文件</th><th>报送对象</th><th>频率</th><th>最近报送</th><th>下期到期</th><th>状态</th><th></th></tr>
          ${withNext.map(r => `<tr>
            <td><b>${U.esc(r.name)}</b>${r.note?`<br><span class="muted" style="font-size:12px">${U.esc(r.note)}</span>`:''}</td>
            <td>${U.esc(r.to||'—')}</td>
            <td><span class="pill gray">${freqText(r.freq)}</span></td>
            <td>${r.last||'—'}${r.periodText&&r.periodText!=='—'?`<br><span class="muted" style="font-size:11px">(${r.periodText})</span>`:''}</td>
            <td><b>${r.nx}</b><br><span class="muted" style="font-size:11px">${r.nextPeriod && r.nextPeriod !== '—' ? r.nextPeriod : ''}</span></td>
            <td>${duePill(r.d)}<br><span class="muted" style="font-size:11px">${r.d<0?`逾期 ${-r.d} 天`:r.d===0?'今天到期':`剩 ${r.d} 天`}</span></td>
            <td style="white-space:nowrap">
              <button class="btn primary sm" onclick="Report.done('${r.id}')" style="padding:4px 10px;font-size:12px">✅ 已报送</button>
              <button class="btn ghost sm" onclick="Report.edit('${r.id}')">编辑</button>
              <button class="btn ghost sm danger" onclick="Report.del('${r.id}')">删</button>
            </td>
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
    if (!r) return;
    const period = this.periodLabel(r.freq, r.last || U.today());
    const nextLabel = r.freq === 'once' ? '（一次性任务，将标记完成）' : '，自动生成下一期';
    openModal('确认报送', `
      <p style="margin:0 0 8px">确认已完成 <b>${U.esc(r.name)}</b> 的报送？</p>
      <p class="muted" style="margin:0">当期：${period}${nextLabel}</p>
      <div class="field" style="margin-top:10px"><label>实际报送日期</label><input type="date" id="r_done_date" value="${U.today()}"></div>
    `, () => {
      const doneDate = document.getElementById('r_done_date').value || U.today();
      const nextPeriod = this.periodLabel(r.freq, doneDate);
      DB.update('report', id, { last: doneDate });
      if (r.freq === 'once') {
        // 一次性：移除（已完成）
        DB.remove('report', id);
        this.render(); App.refreshBadges();
        toast('✅ ' + r.name + ' 已完成（一次性任务已归档）');
      } else {
        const nextNx = nextDue(Object.assign({}, r, { last: doneDate }));
        const nextLabel = this.periodLabel(r.freq, nextNx);
        this.render(); App.refreshBadges();
        toast('✅ ' + period + ' 已报送，下期 ' + nextNx + '（' + nextLabel + '）已自动生成');
      }
    });
  },
  del(id) { confirmDel('确认删除？', () => { DB.remove('report', id); this.render(); App.refreshBadges(); toast('已删除'); }); },
  /* 计算当期报送周期标签 */
  periodLabel(freq, last) {
    const d = new Date(last);
    const m = d.getMonth() + 1, y = d.getFullYear();
    const q = Math.ceil(m / 3);
    if (freq === 'daily') return y + '/' + (m<10?'0':'') + m + '/' + (d.getDate()<10?'0':'') + d.getDate() + '期';
    if (freq === 'weekly') return y + '年第' + Math.ceil((d.getDate()) / 7) + '周';
    if (freq === 'monthly') return y + '年' + m + '月';
    if (freq === 'quarterly') return y + '年第' + q + '季度';
    if (freq === 'half') return y + '年' + (m <= 6 ? '上半年' : '下半年');
    if (freq === 'yearly') return y + '年';
    return '—';
  },
};

/* 频率 -> 周期推进（按日历周期精确计算） */
function addPeriod(d, freq) {
  const x = new Date(d + 'T00:00:00');
  if (freq === 'daily') x.setDate(x.getDate() + 1);
  else if (freq === 'weekly') x.setDate(x.getDate() + 7);
  else if (freq === 'monthly') x.setMonth(x.getMonth() + 1);
  else if (freq === 'quarterly') x.setMonth(x.getMonth() + 3);
  else if (freq === 'half') x.setMonth(x.getMonth() + 6);
  else if (freq === 'yearly') x.setFullYear(x.getFullYear() + 1);
  else x.setDate(x.getDate() + 30);
  return U.fmt(x);
}
function freqText(f) { return { daily:'每日', weekly:'每周', monthly:'每月', quarterly:'每季', half:'每半年', yearly:'每年', once:'一次性' }[f] || f; }
/* 计算下一次到期日：从最近报送日起至少推进一个周期，直至今天之后 */
function nextDue(r) {
  const ld = r.last || U.today();
  if (r.freq === 'once') return ld;
  let cur = ld;
  let guard = 0;
  do {
    cur = addPeriod(cur, r.freq);
    guard++;
  } while (U.daysFromToday(cur) < 0 && guard < 120);
  return cur;
}
function duePill(d) {
  if (d < 0) return '<span class="pill red">逾期</span>';
  if (d === 0) return '<span class="pill red">今天</span>';
  if (d <= 7) return '<span class="pill amber">临期</span>';
  return '<span class="pill green">正常</span>';
}
