/* ============ 会议纪要模块（独立）============ */
const Meetings = {
  filter: '', _expanded: null, // 当前展开的纪要 id
  /* 精简 Markdown 渲染 */
  md(text) {
    if (!text) return '';
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = String(text).split('\n');
    let html = '', inUl = false;
    const closeUl = () => { if (inUl) { html += '</ul>'; inUl = false; } };
    for (let raw of lines) {
      let line = raw.replace(/\s+$/, '');
      if (!line.trim()) { closeUl(); continue; }
      const imgM = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgM) {
        closeUl();
        html += `<div class="md-img"><img src="${esc(imgM[2])}" alt="${esc(imgM[1])}" loading="lazy" style="max-width:100%;border-radius:10px;border:1px solid var(--line);margin:6px 0" onerror="this.style.display='none'">`;
        html += `<div class="muted" style="font-size:11px;margin:-4px 0 6px"><a href="${esc(imgM[2])}" target="_blank" rel="noopener" style="word-break:break-all">🖼️ 查看原图 ↗</a></div></div>`;
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) { closeUl(); const lv = h[1].length; html += `<div class="md-h md-h${lv}">${esc(h[2])}</div>`; continue; }
      const li = line.match(/^[-•*]\s+(.*)$/) || line.match(/^\d+[、.]\s+(.*)$/);
      if (li) { if (!inUl) { html += '<ul class="md-ul">'; inUl = true; } html += `<li>${esc(this._inline(li[1]))}</li>`; continue; }
      closeUl();
      html += `<div class="md-p">${esc(this._inline(line))}</div>`;
    }
    closeUl();
    return html;
  },
  _inline(s) { return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+?)`/g, '<code>$1</code>'); },

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
          <div class="search"><input id="m_filter" value="${U.esc(kw)}" placeholder="搜索主题/参会人" oninput="Meetings.setFilter(this.value)" style="width:160px"></div>
          <button class="btn sm" onclick="Meetings.importFeishu()">⌨️ 从飞书妙记导入</button>
          <button class="btn sm" onclick="App.importModule('meetings')">⬆ 导入文件</button>
          <button class="btn primary sm" onclick="Meetings.add()">+ 新增</button>
        </div>
        ${shown.length ? '<div class="ml-list">' + shown.slice().reverse().map(m => this.row(m)).join('') + '</div>'
          : `<div class="empty">${kw ? '没有匹配的纪要' : '暂无会议纪要，点击右上角添加或从飞书妙记导入'}</div>`}
      </div>`;
  },
  /* 列表行（简洁） */
  row(m) {
    const ex = this._expanded === m.id;
    return `
      <div class="ml-row" onclick="Meetings.toggle('${m.id}')">
        <div class="ml-left">
          <div class="ml-title">${U.esc(m.title)}</div>
          <div class="ml-meta">
            <span class="pill purple" style="font-size:11px;padding:1px 7px">${m.date || '—'}</span>
            ${m.attend ? `<span class="ml-tag">👥 ${U.esc(m.attend)}</span>` : ''}
          </div>
        </div>
        <div class="ml-arrow">${ex ? '▾' : '▸'}</div>
      </div>
      ${ex ? `<div class="ml-detail">${this.detail(m)}</div>` : ''}`;
  },
  toggle(id) {
    this._expanded = this._expanded === id ? null : id;
    this.render();
  },
  /* 详情内容（点击展开后显示） */
  detail(m) {
    const imgs = (m.images && m.images.length) ? m.images : [];
    const imgsHtml = imgs.length ? '<div class="mt-imgs">' + imgs.map(u => `<img src="${U.esc(u)}" loading="lazy" style="max-width:160px;max-height:120px;border-radius:10px;border:1px solid var(--line);margin:4px;cursor:pointer" onerror="this.style.display='none'" onclick="window.open('${U.esc(u)}','_blank')">`).join('') + '</div>' : '';
    return `
      <div style="padding:4px 12px 12px">
        ${m.place ? `<div class="ml-dtag">📍 ${U.esc(m.place)}</div>` : ''}
        ${m.content ? `<div class="ml-dsection">会议内容</div><div class="ml-dbody">${this.md(m.content)}</div>` : ''}
        ${imgsHtml}
        ${m.action ? `<div class="ml-daction"><b>✅ 行动项</b>${this.md(m.action)}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn ghost sm" onclick="event.stopPropagation();Meetings.edit('${m.id}')">编辑</button>
          <button class="btn ghost sm danger" onclick="event.stopPropagation();Meetings.del('${m.id}')">删除</button>
        </div>
      </div>`;
  },
  setFilter(v) { this.filter = v; this._expanded = null; this.render(); },
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
      <div class="field"><label>会议内容摘要</label><textarea id="m_content" style="min-height:100px" placeholder="讨论要点（支持 Markdown）">${U.esc(m.content || '')}</textarea></div>
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
  del(id) {
    confirmDel('确认删除？', () => { DB.remove('meetings', id); if (this._expanded === id) this._expanded = null; this.render(); toast('已删除'); });
  },

  /* 从飞书妙记导入 */
  importFeishu() {
    openModal('从飞书妙记导入', `
      <p class="muted" style="margin-top:0">从飞书妙记导入纪要：</p>
      <div style="background:var(--panel-2);border:1px dashed var(--line);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:13px;line-height:1.7">
        <b>📋 方式一：复制智能纪要</b><br>
        打开妙记 → 左侧「智能纪要」标签页 → <b>全选复制</b>内容，粘贴到下方文本框即可自动识别「参会人、要点、行动项」。<br><br>
        <b>📄 方式二：导出文字记录（.docx / .txt）</b><br>
        打开妙记 → 右侧文字记录区域 → 点击搜索框旁的 <b>「⋯ → 导出文字记录」</b> → 选择格式导出，再点下方上传文件导入。
      </div>
      <div class="field" style="margin:0"><label>会议主题（可选，留空自动取首行）</label><input id="im_title" placeholder="如：跨境电商系统二期需求评审"></div>
      <div class="field"><label>转写文本（或上传文件）</label><textarea id="im_text" style="min-height:160px" placeholder="从飞书妙记「智能纪要」全选复制后粘贴到这里"></textarea></div>
      <div class="field" style="margin:0"><label>上传文件</label><input type="file" id="im_file"></div>
      <div id="im_preview" style="margin-top:10px"></div>
    `, () => {
      const txt = document.getElementById('im_text').value;
      if (!txt.trim()) { toast('请粘贴或上传文本'); return; }
      const blocks = this.splitTranscripts(txt);
      let n = 0;
      blocks.forEach(b => {
        const p = this.parseTranscript(b);
        const manualTitle = (document.getElementById('im_title').value || '').trim();
        const lines = (p.content || '').split('\n').map(x => x.trim()).filter(Boolean);
        const autoTitle = lines.find(l => !/^[#>]/.test(l) && !/^(会议[概况要点总结]|待办事项|行动项|会议[内容记录]|会议[主题纪要]|参会[人]?|出席)([：:])?$/.test(l)) || '飞书妙记导入';
        const docxImgs = (Meetings._docxImages || []).filter(Boolean);
        DB.add('meetings', Object.assign({ id: U.uid() }, {
          title: (manualTitle || autoTitle).slice(0, 50),
          date: p.date || U.today(),
          attend: p.attend, place: p.place, content: p.content, action: p.action,
          images: [...(p.images || []), ...docxImgs]
        }));
        n++;
      });
      closeModal(); delete Meetings._docxImages; this.render(); toast('已导入 ' + n + ' 条纪要');
    });
    const fileInput = document.getElementById('im_file');
    fileInput.onchange = async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const fileName = (f.name || '').toLowerCase();
      // 非 docx 文件走普通文本读取
      if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
        this._docxImages = [];
        const r = new FileReader(); r.onload = e => { document.getElementById('im_text').value = e.target.result; }; r.readAsText(f);
        return;
      }
      // .docx 文件：检测浏览器能力
      if (typeof DecompressionStream === 'undefined') {
        toast('⚠️ 当前浏览器不支持解析 .docx 文件（请升级浏览器，或在飞书妙记中点「⋯ → 复制为 Markdown」后粘贴到上方文本框导入）');
        return;
      }
      try {
        const result = await this.readDocx(f);
        document.getElementById('im_text').value = result.text;
        this._docxImages = result.images.map(img => img.dataUrl);
      } catch (err) {
        console.error('docx parse error:', err);
        toast('文件解析失败：' + err.message);
      }
    };
    document.getElementById('im_text').addEventListener('input', () => {
      const txt = document.getElementById('im_text').value;
      const el = document.getElementById('im_preview');
      if (!txt.trim()) { el.innerHTML = ''; return; }
      const blocks = this.splitTranscripts(txt);
      el.innerHTML = '<div class="muted" style="font-size:12px;margin-bottom:6px">将导入 ' + blocks.length + ' 条纪要</div>' + blocks.map(b => {
        const p = this.parseTranscript(b);
        const lines = (p.content || '').split('\n').map(x => x.trim()).filter(Boolean);
        const t = lines.find(l => !/^[#>]/.test(l) && !/^(会议[概况要点总结]|待办事项|行动项|会议[内容记录]|会议[主题纪要]|参会[人]?|出席)([：:])?$/.test(l)) || '未命名';
        return '<div style="border:1px dashed var(--line);border-radius:10px;padding:6px 10px;margin-bottom:6px;font-size:12px">'
          + '<b>' + U.esc(t.slice(0, 40)) + '</b>'
          + ' <span class="muted">｜参会：' + U.esc(p.attend.slice(0, 24)) + '</span>'
          + (p.action ? ' <span class="pill green" style="font-size:11px">含' + p.action.split('\n').length + '项行动</span>' : '')
          + '</div>';
      }).join('');
    });
  },
  /* 多纪要拆分：以 ---\n# 或 ---\n## 为分隔（避免误拆正文中的 --- 分隔线） */
  splitTranscripts(txt) {
    const blocks = (txt || '').split(/\n\s*---\s*\n(?=#{1,3}\s)/).map(b => b.trim()).filter(Boolean);
    return blocks.length ? blocks : [(txt || '').trim()];
  },
  /* 解析参会人/要点/行动项/日期/图片 */
  parseTranscript(txt) {
    const clean = (s) => s.replace(/^[-•*\d+[、.、]\s*]/, '').replace(/\*\*/g, '').trim();
    const lines = (txt || '').split(/\n+/).map(s => s.trim());
    let attend = '', place = '', content = [], action = [], date = '', images = [];
    let sec = '';
    for (const raw of lines) {
      const s = clean(raw);
      if (!s) continue;
      // 图片：提取到 images 中，同时保留原文行到 content（md()渲染 + onerror 兜底）
      const imgM = raw.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgM) { images.push(imgM[2]); content.push(raw); continue; }
      // ## 标题
      const h = raw.match(/^#+\s*(.+)$/);
      if (h) {
        const t = h[1].replace(/\*\*/g, '').trim();
        // 短标题（<15字）才判为区块；长标题为文档主题，不进区块切换
        if (t.length < 15) {
          if (/(参会|出席|概况|人员|成员)/.test(t)) sec = 'participants';
          else if (/(待办|行动|事项|跟进|todo|next)/i.test(t)) sec = 'action';
          else if (/(要点|摘要|讨论|结论|总结|内容|关键决策|金句|相关链接|智能章节|待确认|后续)/.test(t)) sec = 'summary';
          else sec = '';
          continue;
        }
        // 长标题 → 作为内容首行（文档标题）
        if (content.length === 0 && !attend) content.push(t);
        continue;
      }
      // 纯文本标题
      const plain = s.match(/^(会议概况|会议要点|会议总结|待办事项|行动项|待确认事项|后续工作计划|关键决策|金句时刻|相关链接|智能章节|总结|待办)\s*$/);
      if (plain) {
        const t = plain[1];
        if (/(参会|概况|人员|成员)/.test(t)) sec = 'participants';
        else if (/(待办|行动|事项|工作|后续|决策|金句|链接|章节)/.test(t)) sec = 'action';
        else if (/(要点|总结)/.test(t)) sec = 'summary';
        else sec = '';
        continue;
      }
      // 键值行
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
      action: action.join('\n'), images: images.filter(u => !u.match(/internal-api-drive-stream/)) // 过滤飞书内部鉴权图
    };
  },
  /* 纯前端读取 .docx：返回 {text, images} 其中 images 为 [{name, dataUrl}] */
  async readDocx(file) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持解析 .docx（需 Chrome 110+ / Safari 16.4+），请改用「复制为 Markdown → 粘贴文本」导入');
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return await this._extractDocx(bytes);
  },
  async _extractDocx(bytes) {
    const zip = this._parseZip(bytes);
    const entry = zip.find(z => z.name === 'word/document.xml') || zip.find(z => z.name.endsWith('document.xml'));
    if (!entry) throw new Error('未找到 document.xml');
    let xmlBytes = entry.data;
    if (entry.compressed) {
      try { xmlBytes = await this._inflate(xmlBytes); } catch(e) { xmlBytes = entry.data; }
    }
    const xml = new TextDecoder('utf-8').decode(xmlBytes);
    // 提取文本
    const paras = xml.split(/<w:p[ >]/).slice(1);
    const out = [];
    for (const p of paras) {
      const texts = [...p.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)].map(m => m[1]);
      const line = texts.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      out.push(line);
    }
    const text = out.join('\n');
    // 提取嵌入图片
    const relsEntry = zip.find(z => z.name === 'word/_rels/document.xml.rels');
    let relsXml = '';
    if (relsEntry) {
      let d = relsEntry.data;
      if (relsEntry.compressed) { try { d = await this._inflate(d); } catch(e) {} }
      relsXml = new TextDecoder('utf-8').decode(d);
    }
    // 构建 rId → target 映射（仅图片）
    const ridMap = {};
    const relMatches = [...relsXml.matchAll(/<Relationship[^>]*\s+Id="([^"]+)"[^>]*\s+Type="([^"]+)"[^>]*\s+Target="([^"]+)"/g)];
    for (const rm of relMatches) {
      if (rm[2].includes('image')) ridMap[rm[1]] = rm[3];
    }
    // 找文档中所有图片引用
    const blipIds = [...xml.matchAll(/<a:blip[^>]*r:embed="([^"]+)"/g)].map(m => m[1]);
    const images = [];
    for (const rid of blipIds) {
      const target = ridMap[rid];
      if (!target) continue;
      const imgEntry = zip.find(z => z.name === 'word/' + target || z.name.endsWith(target));
      if (!imgEntry) continue;
      let imgData = imgEntry.data;
      if (imgEntry.compressed) { try { imgData = await this._inflate(imgData); } catch(e) {} }
      // 判断 MIME
      const ext = target.split('.').pop().toLowerCase();
      const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml' };
      const mime = mimeMap[ext] || 'image/jpeg';
      // 转 base64 data URL
      const b64 = this._bytesToBase64(imgData);
      images.push({ name: target, dataUrl: 'data:' + mime + ';base64,' + b64 });
    }
    return { text, images };
  },
  _bytesToBase64(bytes) {
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
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
    try {
      const ds = new DecompressionStream('deflate-raw');
      const stream = new Blob([compressed]).stream().pipeThrough(ds);
      // 改用 reader 逐块读取，避免 Response 的潜在问题
      const reader = stream.getReader();
      const chunks = [];
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(totalLen);
      let pos = 0;
      for (const c of chunks) { result.set(c, pos); pos += c.length; }
      return result;
    } catch (e) {
      // 如果 deflate 失败，尝试 store（无压缩）
      return compressed;
    }
  },
};
