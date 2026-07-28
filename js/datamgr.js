/* ============ 专区七：数据管理 ============ */
const DataMgr = {
  render() {
    const d = DB.get();
    const count = {
      memo: Object.values(d.memo).reduce((s, a) => s + a.length, 0),
      ecom: d.ecom.partners.length + d.ecom.demands.length + d.ecom.stats.length,
      other: d.other.length,
      meetings: d.meetings.length,
      policy: d.policy.items.length + d.policy.repo.length,
      report: d.report.length,
    };
    const total = Object.values(count).reduce((a, b) => a + b, 0);
    const created = d.meta && d.meta.created ? new Date(d.meta.created).toLocaleString('zh-CN') : '—';

    document.getElementById('view-data').innerHTML = `
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="stat-tile"><div class="label">💾 本地记录总数</div><div class="value">${total}</div><div class="delta">全部存于本设备浏览器</div></div>
        <div class="stat-tile"><div class="label">📦 占用空间</div><div class="value" style="font-size:20px">${this.sizeKB()}</div><div class="delta">localStorage 限额约 5MB</div></div>
        <div class="stat-tile"><div class="label">🗓 首次使用</div><div class="value" style="font-size:16px">${created.split(' ')[0]}</div><div class="delta">本机创建时间</div></div>
      </div>

      <div class="grid cols-2">
        <!-- 备份与恢复 -->
        <div class="card">
          <div class="section-head"><h2>📦 备份与恢复</h2></div>
          <div class="desc">数据默认只存在当前设备浏览器。定期导出备份，换设备或清缓存后可一键恢复。</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn primary" onclick="App.exportData()">⬇ 备份（导出 JSON）</button>
            <button class="btn" onclick="App.importData()">⬆ 恢复（导入 JSON）</button>
            <button class="btn danger" onclick="App.confirmReset()">↺ 清空全部</button>
          </div>
          <div class="divider"></div>
          <div class="field" style="margin:0">
            <label>导入方式</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="pill gray">整库合并</span><span class="pill gray">整库替换</span>
              <span class="pill gray">单模块文件</span>
            </div>
            <p class="muted" style="font-size:12px;margin:8px 0 0">各模块（日常工作 / 电商 / 其他系统 / 会议纪要 / 制度 / 报送）页面右上角均有「导入」按钮，可单独导入该模块的 JSON 备份文件。</p>
          </div>
        </div>

        <!-- 存储说明 -->
        <div class="card">
          <div class="section-head"><h2>ℹ️ 数据存储说明</h2></div>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;color:var(--ink-soft)">
            <li><b>存储位置</b>：仅存于你访问本工作台的设备浏览器（localStorage），不上传任何服务器，隐私性最佳。</li>
            <li><b>离线可用</b>：已安装到主屏后，无网络也能打开与使用。</li>
            <li><b>隐私建议</b>：涉及敏感业务信息请避免在不信任设备登录；定期导出备份。</li>
            <li><b>风险提示</b>：清除浏览器缓存 / 卸载 App / 换设备，未备份的数据将丢失。</li>
          </ul>
        </div>
      </div>

      <!-- 多设备同步 -->
      <div class="card">
        <div class="section-head"><h2>🔄 多设备同步</h2></div>
        <div class="desc">PWA 工作台默认数据在各设备相互独立。以下两种方案实现同步：</div>
        <div class="grid cols-2">
          <div style="border:1px solid var(--line);border-radius:10px;padding:14px">
            <b>方案 A：导出 / 导入（推荐，零成本）</b>
            <p class="muted" style="font-size:12.5px">在原设备点「备份」下载 JSON → 新设备点「恢复」上传即可。适合偶尔同步。</p>
          </div>
          <div style="border:1px solid var(--line);border-radius:10px;padding:14px">
            <b>方案 B：云盘中转</b>
            <p class="muted" style="font-size:12.5px">将备份 JSON 存入企业云盘 / 邮件草稿，新设备下载后导入。安全且可控。</p>
          </div>
          <div style="border:1px solid var(--line);border-radius:10px;padding:14px">
            <b>方案 C：浏览器同步</b>
            <p class="muted" style="font-size:12.5px">同一账号登录的 Chrome，开启「同步」后 localStorage 不跨设备同步——仍需导出导入。</p>
          </div>
          <div style="border:1px solid var(--line);border-radius:10px;padding:14px">
            <b>方案 D：团队共享（需后端）</b>
            <p class="muted" style="font-size:12.5px">如需多人实时共享同一份数据，需接入后端数据库，可另行评估开发。</p>
          </div>
        </div>
      </div>

      <!-- 安装指南 -->
      <div class="card">
        <div class="section-head"><h2>📱 手机 / iPad 安装指南</h2></div>
        <div class="grid cols-2">
          <div style="border:1px solid var(--line);border-radius:10px;padding:14px">
            <b>iPhone / iPad（Safari）</b>
            <ol style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;padding-left:18px;line-height:1.8">
              <li>用 Safari 打开工作台网址</li>
              <li>点底部「分享」按钮（方框上箭头）</li>
              <li>下滑选「添加到主屏幕」</li>
              <li>命名「Ruby的工作台」→ 添加</li>
              <li>桌面出现图标，点开即全屏 App</li>
            </ol>
          </div>
          <div style="border:1px solid var(--line);border-radius:10px;padding:14px">
            <b>安卓（Chrome / Edge）</b>
            <ol style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;padding-left:18px;line-height:1.8">
              <li>用浏览器打开工作台网址</li>
              <li>点地址栏右侧「⋮」或安装图标</li>
              <li>选「安装应用 / 添加到主屏幕」</li>
              <li>确认后桌面出现图标</li>
              <li>支持离线、可像原生 App 使用</li>
            </ol>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin:12px 0 0">提示：安装后从主屏打开为全屏模式（无浏览器地址栏），体验等同原生 App。首次打开需联网加载，之后可离线使用。</p>
      </div>

      <!-- 数据分布 -->
      <div class="card">
        <div class="section-head"><h2>📊 各模块数据量</h2></div>
        <div class="table-wrap"><table class="tbl">
          <tr><th>模块</th><th>记录数</th></tr>
          <tr><td>日常工作（备忘/进展）</td><td>${count.memo}</td></tr>
          <tr><td>跨境电商系统（对接/会议/需求/数据）</td><td>${count.ecom}</td></tr>
          <tr><td>其他系统进度</td><td>${count.other}</td></tr>
          <tr><td>制度建设（进度/知识库）</td><td>${count.policy}</td></tr>
          <tr><td>监管报送</td><td>${count.report}</td></tr>
          <tr><td>会议纪要</td><td>${count.meetings}</td></tr>
        </table></div>
      </div>`;
  },
  sizeKB() {
    try { const s = JSON.stringify(DB.get()); return (new Blob([s]).size / 1024).toFixed(1) + ' KB'; }
    catch (e) { return '—'; }
  }
};
