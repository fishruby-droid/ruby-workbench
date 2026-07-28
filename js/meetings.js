/* ============ 会议纪要模块（独立） ============ */
const Meetings = {
  filter: '',
  /* 精简 Markdown 渲染：标题 / 列表 / 加粗 / 图片 / 换行（安全转义后） */
  md(text) {
    if (!text) return '';
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = String(text).split('\n');
    let html = '', inUl = false;
    const closeUl = () => { if (inUl) { html += '</ul>'; inUl = false; } };
    for (let raw of lines) {
      let line = raw.replace(/\s+$/, '');
      if (!line.trim()) { closeUl(); continue; }
      // 图片单独成行（飞书妙记常见）
      const imgM = line.match(/!\[([^\]]*)\]\(([^)]+)\)/) || line.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgM) {
        closeUl();
        const url = imgM[2] || (imgM[1] || '');
        const alt = imgM[1] || '';
        html += `<div class="md-img"><img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" style="max-width:100%;border-radius:10px;border:1px solid var(--line);margin:6px 0"></div>`;
        continue;
      }
      // 标题
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { closeUl(); const lv = h[1].length; html += `<div class="md-h md-h${lv}">${esc(h[2])}</div>`; continue; }
      // 列表
      const li = line.match(/^[-•*]\s+(.*)$/) || line.match(/^\d+[、.]\s+(.*)$/);
      if (li) { if (!inUl) { html += '<ul class="md-ul">'; inUl = true; } html += `<li>${esc(this._inline(li[1]))}</li>`; continue; }
      closeUl();
      html += `<div class="md-p">${esc(this._inline(line))}</div>`;
    }
    closeUl();
    return html;
  },
  _inline(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+?)`/g, '<code>$1</code>');
  },
  render() {
    const list = DB.get().meetings;
    const kw = this.filter.trim();
    const shown = kw ? list.filter(m =>
      (m.title || '').includes(kw) || (m.attend || '').includes(kw) || (m.content || '').includes(kw) || (m.action || '').includes(kw)
    ) : list;
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
        ${shown.length ? shown.slice().reverse().map(m => this.card(m)).join('')
          : `<div class="empty">${kw ? '没有匹配的纪要' : '暂无会议纪要，点击右上角添加或从飞书妙记导入'}</div>`}
      </div>`;
  },
  /* 单条纪要卡片（简洁） */
  card(m) {
    const imgs = (m.images && m.images.length) ? m.images : [];
    return `
      <div class="mt-card">
        <div class="mt-head">
          <div class="mt-title">${U.esc(m.title)}</div>
          <div class="mt-actions">
            <button class="btn ghost sm" onclick="Meetings.edit('${m.id}')">编辑</button>
            <button class="btn ghost sm danger" onclick="Meetings.del('${m.id}')">删</button>
          </div>
        </div>
        <div class="mt-meta">
          <span class="pill purple">${U.esc(m.date || '—')}</span>
          ${m.attend ? `<span class="mt-tag">👥 ${U.esc(m.attend)}</span>` : ''}
          ${m.place ? `<span class="mt-tag">📍 ${U.esc(m.place)}</span>` : ''}
          ${(m.images && m.images.length) ? `<span class="mt-tag">🖼️ ${m.images.length} 图</span>` : ''}
        </div>
        ${m.content ? `<div class="mt-body">${this.md(m.content)}</div>` : ''}
        ${imgs.length ? `<div class="mt-imgs">${imgs.map(u => `<img src="${U.esc(u)}" loading="lazy" style="max-width:160px;max-height:120px;border-radius:10px;border:1px solid var(--line);margin:4px;cursor:pointer" onclick="window.open('${U.esc(u)}','_blank')">`).join('')}</div>` : ''}
        ${m.action ? `<div class="mt-action"><b>✅ 行动项</b>${this.md(m.action)}</div>` : ''}
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
      <div class="field"><label>会议内容摘要</label><textarea id="m_content" placeholder="讨论要点（支持 Markdown：## 标题、- 列表、**加粗**）">${U.esc(m.content || '')}</textarea></div>
    `, () => {
      const title = document.getElementById('m_title').value.trim();
      if (!title) { toast('请填写主题'); return; }
      const obj = {
        title, date: document.getElementById('m_date').value || U.today(),
        attend: document.getElementById('m_attend').value.trim(),
        place: document.getElementById('m_place').value.trim(),
        content: document.getElementById('m_content').value.trim(),
        action: (m && m.action) || '',
        images: (m && m.images) || []
      };
      if (id) DB.update('meetings', id, obj); else DB.add('meetings', Object.assign({ id: U.uid() }, obj));
      closeModal(); this.render(); toast('已保存');
    });
  },
  del(id) { confirmDel('确认删除？', () => { DB.remove('meetings', id); this.render(); toast('已删除'); }); },

  /* 从飞书妙记 / 其他会议转写文本导入 */
  importFeishu() {
    openModal('从飞书妙记导入', `
      <p class="muted" style="margin-top:0">在飞书妙记中打开纪要，点右上角「<b>⋯ → 复制为 Markdown</b>」（或「复制全文」），把内容粘贴到下方即可自动识别「参会人、要点、行动项」并生成纪要。多条纪要可用分隔线 <b>---</b> 隔开批量导入。也可直接上传 .txt / .md / .docx 文件。</p>
      <div class="field" style="margin:0"><label>会议主题（可选，留空自动取首行）</label><input id="im_title" placeholder="如：跨境电商系统二期需求评审"></div>
      <div class="field"><label>转写文本（或上传文件）</label><textarea id="im_text" style="min-height:160px" placeholder="在飞书妙记里「复制为 Markdown」后粘贴到这里：

## 会议概况
参会人：张三、李四
会议地点：线上会议室

## 会议要点
讨论反洗钱监控新增场景
![](https://example.com/whiteboard.png)

## 待办事项
科技部7月30日前出原型"></textarea></div>
      <div class="field" style="margin:0"><label>上传文件（.txt / .md / .docx）</label><input type="file" id="im_file" accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
      <div id="im_preview" style="margin-top:10px"></div>
    `, () => {
      const txt = document.getElementById('im_text').value;
      if (!txt.trim()) { toast('请粘贴或上传文本'); return; }
      const blocks = this.splitTranscripts(txt);
      let n = 0;
      blocks.forEach(b => {
        const p = this.parseTranscript(b);
        const manualTitle = (document.getElementById('im_title').value || '').trim();
        // 自动主题：去掉 markdown 标题符号后的首个实质内容行（跳过区块标题行）
        const lines = (p.content || '').split('\n').map(x => x.replace(/^#+\s*/, '').trim()).filter(Boolean);
        const autoTitle = lines.find(l => !/^(会议概况|会议要点|会议总结|待办事项|行动项|会议内容|会议记录|参会人员|会议主题|会议纪要|参会人|出席)[:：]?$/.test(l)) || '飞书妙记导入';
        DB.add('meetings', Object.assign({ id: U.uid() }, {
          title: (manualTitle || autoTitle).slice(0, 50),
          date: p.date || U.today(),
          attend: p.attend, place: p.place, content: p.content, action: p.action, images: p.images || []
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
          + (p.images && p.images.length ? ' <span class="pill blue" style="font-size:11px">🖼️' + p.images.length + '</span>' : '')
          + (p.action ? ' <span class="pill green" style="font-size:11px">含' + p.action.split('\n').length + '项行动</span>' : '')
          + '</div>';
      }).join('');
    };
    document.getElementById('im_text').addEventListener('input', MeetyPreview);
  },
  parseTranscript(txt) {
    const clean = (s) => s.replace(/^[-•*\d+[、.、]\s*]/, '').replace(/\*\*/g, '').trim();
    const lines = (txt || '').split(/\n+/).map(s => s.trim());
    let attend = '', place = '', content = [], action = [], date = '', images = [];
    let sec = '';
    for (const raw of lines) {
      const s = clean(raw);
      if (!s) continue;
      // 图片（独立成行）
      const imgM = raw.match(/!\[([^\]]*)\]\(([^)]+)\)/) || raw.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgM) { images.push(imgM[2] || imgM[1] || ''); continue; }
      const h = raw.match(/^#+\s*(.+)$/);
      if (h) {
        const t = h[1].replace(/\*\*/g, '').trim();
        if (/(参会|出席|概况|人员|成员)/.test(t)) sec = 'participants';
        else if (/(待办|行动|事项|跟进|todo|next)/i.test(t)) sec = 'action';
        else if (/(要点|摘要|讨论|结论|纪要|总结|内容)/.test(t)) sec = 'summary';
        else sec = '';
        continue;
      }
      // 纯文本标题行（docx 导出无 # 前缀）：会议概况 / 会议要点 / 待办事项 等
      const plain = s.match(/^(会议概况|会议要点|会议总结|待办事项|行动项|会议内容|会议记录|参会人员|会议主题|会议纪要)\s*$/);
      if (plain) {
        const t = plain[1];
        if (/(参会|概况|人员|成员)/.test(t)) sec = 'participants';
        else if (/(待办|行动|事项)/.test(t)) sec = 'action';
        else if (/(要点|总结|内容|记录|纪要|主题)/.test(t)) sec = 'summary';
        else sec = '';
        continue;
      }
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
      if (/^(行动项|待办|待跟进|行动事项|下一步|todo)[:：]/i.test(s)) { action.push(s.replace(/^(行动项|待办|待跟进|行动事项|下一步|todo)[:：]/i, '').trim()); continue; }
      if (/^(要点|摘要|讨论|结论|纪要)[:：]/.test(s)) { content.push(s.replace(/^(要点|摘要|讨论|结论|纪要)[:：]/, '').trim()); continue; }
      if (/(行动项|待办|待跟进|下一步|TODO)/.test(s)) { action.push(s); continue; }
      if (s.length > 1) content.push(s);
    }
    return {
      attend: attend || '—', place: place || '—', date: date || '',
      content: content.length ? content.join('\n') : (txt ? txt.trim() : ''),
      action: action.join('\n'), images: images
    };
  },
  /* 从一段文本里拆分为多条纪要（以 --- 分隔），返回数组 */
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
    const zip = this._parseZip(bytes);
    const entry = zip.find(z => z.name === 'word/document.xml') || zip.find(z => z.name.endsWith('document.xml'));
    if (!entry) throw new Error('未找到 document.xml');
    let xmlBytes = entry.data;
    if (entry.compressed) xmlBytes = await this._inflate(xmlBytes);
    const xml = new TextDecoder('utf-8').decode(xmlBytes);
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
      const clen = dv.getUint16(cdOff + 20, true);
      const ulen = dv.getUint32(cdOff + 24, true);
      const nlen = dv.getUint16(cdOff + 28, true);
      const elen = dv.getUint16(cdOff + 30, true);
      const clen2 = dv.getUint16(cdOff + 32, true);
      const name = new TextDecoder().decode(bytes.subarray(cdOff + 46, cdOff + 46 + nlen));
      const method = dv.getUint16(cdOff + 10, true);
      const dataOff = dv.getUint32(cdOff + 42, true);
      const comp = method === 8;
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
