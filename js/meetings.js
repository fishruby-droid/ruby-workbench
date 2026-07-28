/* ============ 会议纪要模块（独立） ============ */
const Meetings = {
  filter: '',
  render() {
    const list = DB.get().meetings;
    const kw = this.filter.trim();
    const shown = kw ? list.filter(m =>
      (m.title || '').includes(kw) || (m.attend || '').includes(kw) || (m.content || '').includes(kw) || (m.action || '').includes(kw)
    ) : list;
    // 统计
    const thisMonth = list.filter(m => (m.date || '').slice(0, 7) === U.today().slice(0, 7)).length;
    const withAction = list.filter(m => (m.action || '').trim()).length;
    const monthLabels = {};
    list.forEach(m => { const ym = (m.date || '').slice(0, 7); if (ym) monthLabels[ym] = (monthLabels[ym] || 0) + 1; });
    const topMonth = Object.entries(monthLabels).sort((a, b) => b[1] - a[1])[0];

    document.getElementById('view-meetings').innerHTML = `
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">📝 纪要总数</div><div class="value">${list.length}</div><div class="delta">${thisMonth} 条在本月</div></div>
        <div class="stat-tile"><div class="label">✅ 含行动项</div><div class="value">${withAction}</div><div class="delta">需跟踪落实</div></div>
        <div class="stat-tile"><div class="label">📅 最活跃月份</div><div class="value" style="font-size:18px">${topMonth ? topMonth[0] : '—'}</div><div class="delta">${topMonth ? topMonth[1] + ' 条' : '暂无'}</div></div>
      </div>

      <div class="card">
        <div class="section-head">
          <h2>会议纪要记录区</h2>
          <div class="spacer"></div>
          <div class="search"><input id="m_filter" value="${U.esc(kw)}" placeholder="搜索主题/参会人/要点" oninput="Meetings.setFilter(this.value)" style="width:200px"></div>
          <button class="btn sm" onclick="Meetings.importFeishu()">⌨️ 从飞书妙记导入</button>
          <button class="btn sm" onclick="App.importModule('meetings')">⬆ 导入文件</button>
          <button class="btn primary sm" onclick="Meetings.add()">+ 新增纪要</button>
        </div>
        ${shown.length ? shown.slice().reverse().map(m => `
          <div class="ev" style="margin-bottom:10px">
            <div class="ev-type" style="background:var(--purple-soft)">📝</div>
            <div class="ev-main">
              <div class="ev-title">${U.esc(m.title)} <span class="pill purple" style="margin-left:6px">${U.esc(m.date)}</span></div>
              <div class="ev-meta">参会：${U.esc(m.attend || '—')} ｜ 地点：${U.esc(m.place || '—')}</div>
              ${m.content ? `<div class="ev-meta" style="margin-top:6px;white-space:pre-wrap">${U.esc(m.content)}</div>` : ''}
              ${m.action ? `<div class="ev-meta" style="margin-top:4px"><b>行动项：</b>${U.esc(m.action)}</div>` : ''}
            </div>
            <div class="ev-actions"><button class="btn ghost sm" onclick="Meetings.edit('${m.id}')">编辑</button>
              <button class="btn ghost sm danger" onclick="Meetings.del('${m.id}')">删</button></div>
          </div>`).join('')
          : `<div class="empty">${kw ? '没有匹配的纪要' : '暂无会议纪要，点击右上角添加或从飞书妙记导入'}</div>`}
      </div>`;
  },
  setFilter(v) { this.filter = v; this.render(); },
  add() { this.form({}); },
  edit(id) { this.form(DB.get().meetings.find(m => m.id === id), id); },
  form(m, id) {
    m = m || {};
    openModal(id ? '编辑纪要' : '新增会议纪要', `
      <div class="row2">
        <div class="field"><label>会议主题</label><input id="m_title" value="${U.esc(m.title || '')}" placeholder="如：跨境电商系统二期需求评审"></div>
        <div class="field"><label>日期</label><input type="date" id="m_date" value="${m.date || U.today()}"></div>
      </div>
      <div class="row2">
        <div class="field"><label>参会人</label><input id="m_attend" value="${U.esc(m.attend || '')}" placeholder="如：科技部、业务部"></div>
        <div class="field"><label>地点</label><input id="m_place" value="${U.esc(m.place || '')}" placeholder="会议室/线上"></div>
      </div>
      <div class="field"><label>会议内容摘要</label><textarea id="m_content" placeholder="讨论要点">${U.esc(m.content || '')}</textarea></div>
      <div class="field"><label>行动项 / 待办</label><textarea id="m_action" placeholder="决议与分工">${U.esc(m.action || '')}</textarea></div>
    `, () => {
      const title = document.getElementById('m_title').value.trim();
      if (!title) { toast('请填写主题'); return; }
      const obj = {
        title, date: document.getElementById('m_date').value || U.today(),
        attend: document.getElementById('m_attend').value.trim(),
        place: document.getElementById('m_place').value.trim(),
        content: document.getElementById('m_content').value.trim(),
        action: document.getElementById('m_action').value.trim()
      };
      if (id) DB.update('meetings', id, obj); else DB.add('meetings', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); toast('已保存');
    });
  },
  del(id) { confirmDel('确认删除？', () => { DB.remove('meetings', id); this.render(); toast('已删除'); }); },

  /* 从飞书妙记 / 其他会议转写文本导入 */
  importFeishu() {
    openModal('从飞书妙记导入', `
      <p class="muted" style="margin-top:0">把飞书妙记导出的文本粘贴到下方（支持智能纪要 Markdown 或转写全文），系统自动识别「参会人、要点、行动项」并生成纪要。多条纪要可用分隔线 <b>---</b> 隔开，一次批量导入。也可上传 .txt / .md 文件。</p>
      <div class="field"><label>转写文本（或上传文件）</label><textarea id="im_text" style="min-height:160px" placeholder="示例（飞书妙记智能纪要）：
## 会议概况
参会人：张三、李四
会议地点：线上会议室

## 会议要点
讨论反洗钱监控新增场景，确定接口字段

## 待办事项
科技部7月30日前出原型
业务部补充需求清单

---
## 会议概况
参会人：王五
## 会议要点
…"></textarea></div>
      <div class="field" style="margin:0"><label>上传文件（.txt / .md / .docx）</label><input type="file" id="im_file" accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
      <div id="im_preview" style="margin-top:10px"></div>
    `, () => {
      const txt = document.getElementById('im_text').value;
      if (!txt.trim()) { toast('请粘贴或上传文本'); return; }
      const blocks = this.splitTranscripts(txt);
      let n = 0;
      blocks.forEach(b => {
        const p = this.parseTranscript(b);
        DB.add('meetings', Object.assign({ id: U.uid() }, {
          title: (p.content.split('\n')[0] || '飞书妙记导入').slice(0, 40),
          date: p.date || U.today(),
          attend: p.attend, place: p.place, content: p.content, action: p.action
        }));
        n++;
      });
      closeModal(); this.render(); toast('已导入 ' + n + ' 条纪要');
    });
    // 文件读取
    const fileInput = document.getElementById('im_file');
    fileInput.onchange = async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        if (/\.docx?$/i.test(f.name)) {
          const text = await this.readDocx(f);
          document.getElementById('im_text').value = text;
          MeetyPreview();
        } else {
          const r = new FileReader(); r.onload = e => { document.getElementById('im_text').value = e.target.result; MeetyPreview(); }; r.readAsText(f);
        }
      } catch (err) { toast('Word 文件解析失败：' + err.message); }
    };
    const MeetyPreview = () => {
      const txt = document.getElementById('im_text').value;
      const el = document.getElementById('im_preview');
      if (!txt.trim()) { el.innerHTML = ''; return; }
      const blocks = this.splitTranscripts(txt);
      el.innerHTML = '<div class="muted" style="font-size:12px;margin-bottom:6px">将导入 ' + blocks.length + ' 条纪要：</div>' + blocks.map(b => {
        const p = this.parseTranscript(b);
        return '<div style="border:1px dashed var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px;font-size:12px">'
          + '<b>' + U.esc((p.content.split('\n')[0] || '未命名').slice(0, 40)) + '</b>'
          + ' <span class="muted">｜参会：' + U.esc(p.attend.slice(0, 30)) + '</span>'
          + (p.action ? ' <span class="pill green" style="font-size:11px">含' + p.action.split('\n').length + '项行动</span>' : '')
          + '</div>';
      }).join('');
    };
    document.getElementById('im_text').addEventListener('input', MeetyPreview);
  },
  parseTranscript(txt) {
    const clean = (s) => s.replace(/^[-•*\d+[、.、]\s*]/, '').replace(/\*\*/g, '').trim();
    const lines = (txt || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    let attend = '', place = '', content = [], action = [], date = '';
    let sec = ''; // 当前区块：participants/summary/action/points
    for (const raw of lines) {
      const s = clean(raw);
      if (!s) continue;
      // 飞书妙记 Markdown 区块标题：## 会议概况 / ## 会议要点 / ## 待办事项 ...
      const h = raw.match(/^#+\s*(.+)$/);
      if (h) {
        const t = h[1].replace(/\*\*/g, '').trim();
        if (/(参会|出席|概况|人员|成员)/.test(t)) sec = 'participants';
        else if (/(待办|行动|事项|跟进|todo|next)/i.test(t)) sec = 'action';
        else if (/(要点|摘要|讨论|结论|纪要|总结|内容)/.test(t)) sec = 'summary';
        else sec = '';
        continue;
      }
      // 加粗字段行：**参会人**：xxx  或 参会人：xxx
      const kv = s.match(/^(?:参会人|出席|参加|参会|与会|列席|地点|会议地点|位置|时间|日期|会议时间)[:：]\s*(.+)$/);
      if (kv) {
        const key = s.split(/[:：]/)[0].replace(/\*/g, '');
        const val = kv[1].trim();
        if (/(参会人|出席|参加|参会|与会|列席)/.test(key)) { attend = val || attend; continue; }
        if (/(地点|位置)/.test(key)) { place = val || place; continue; }
        if (/(时间|日期)/.test(key) && !date) { date = val; continue; }
      }
      if (sec === 'participants') { if (s) attend = attend ? attend + '；' + s : s; continue; }
      if (sec === 'action') { if (s) action.push(s); continue; }
      if (sec === 'summary') { if (s) content.push(s); continue; }
      // 无区块时按关键词行判断
      if (/^(行动项|待办|待跟进|行动事项|下一步|todo)[:：]/i.test(s)) { action.push(s.replace(/^(行动项|待办|待跟进|行动事项|下一步|todo)[:：]/i, '').trim()); continue; }
      if (/^(要点|摘要|讨论|结论|纪要)[:：]/.test(s)) { content.push(s.replace(/^(要点|摘要|讨论|结论|纪要)[:：]/, '').trim()); continue; }
      if (/(行动项|待办|待跟进|下一步|TODO)/.test(s)) { action.push(s); continue; }
      if (s.length > 1) content.push(s);
    }
    return {
      attend: attend || '—', place: place || '—', date: date || '',
      content: content.length ? content.join('\n') : (txt ? txt.trim() : ''),
      action: action.join('\n')
    };
  },
  /* 从一段文本里拆分为多条纪要（以 --- 或 空行+主题行 分隔），返回数组 */
  splitTranscripts(txt) {
    const blocks = (txt || '').split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean);
    return blocks.length ? blocks : [(txt || '').trim()];
  },
  /* 纯前端读取 .docx：解压 zip 提取 word/document.xml 文本（无需外部库） */
  async readDocx(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return await this._extractDocxText(bytes);
  },
  async _extractDocxText(bytes) {
    // 用 JSZip 思路：手动解析 ZIP 中央目录，找到 word/document.xml
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // 找 "word/document.xml" 在文件名列表中的位置
    const zip = this._parseZip(bytes);
    const entry = zip.find(z => z.name === 'word/document.xml') || zip.find(z => z.name.endsWith('document.xml'));
    if (!entry) throw new Error('未找到 document.xml');
    let xmlBytes = entry.data;
    if (entry.compressed) xmlBytes = await this._inflate(xmlBytes);
    const xml = new TextDecoder('utf-8').decode(xmlBytes);
    // 提取文本：<w:t>内容</w:t>，段落 <w:p> 换行
    const paras = xml.split(/<w:p[ >]/).slice(1);
    const out = [];
    for (const p of paras) {
      const texts = [...p.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)].map(m => m[1]);
      const line = texts.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      out.push(line);
    }
    return out.join('\n');
  },
  _parseZip(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // 找 EOCD 签名 0x06054b50
    let eocd = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('不是有效的 ZIP');
    const total = dv.getUint16(eocd + 10, true);
    let cdOff = dv.getUint32(eocd + 16, true);
    const entries = [];
    for (let i = 0; i < total; i++) {
      if (dv.getUint32(cdOff, true) !== 0x02014b50) break;
      const clen = dv.getUint16(cdOff + 20, true); // compressed
      const ulen = dv.getUint32(cdOff + 24, true); // uncompressed
      const nlen = dv.getUint16(cdOff + 28, true);
      const elen = dv.getUint16(cdOff + 30, true);
      const clen2 = dv.getUint16(cdOff + 32, true);
      const name = new TextDecoder().decode(bytes.subarray(cdOff + 46, cdOff + 46 + nlen));
      const method = dv.getUint16(cdOff + 10, true);
      const dataOff = dv.getUint32(cdOff + 42, true);
      const comp = method === 8;
      // 读取数据（local file header 后）：跳过 local header 30 + nlen + elen
      const lh = dataOff;
      const loff = lh + 30 + nlen + elen;
      const data = bytes.subarray(loff, loff + clen);
      entries.push({ name, compressed: comp, data: data.slice() });
      cdOff += 46 + nlen + elen + clen2;
    }
    return entries;
  },
  async _inflate(compressed) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([compressed]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  },
};
