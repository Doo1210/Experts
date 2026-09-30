/* 1023 mock MCP flow: paste JSON, resolve missing variables, probe rows. */
(function () {
  var store = window.AppStore;
  window.ExpertMcp1023 = {
    props: ['expertId', 'runningCount'],
    setup: function (props) {
      var servers = Vue.ref([]), jsonText = Vue.ref(''), importDialog = Vue.ref(false);
      var secretDialog = Vue.ref(false), secretNames = Vue.ref([]), secretTargets = Vue.ref([]), secretValues = Vue.reactive({});
      var addDialog = Vue.ref(false), addForm = Vue.reactive({ name: '', type: 'http', url: '', command: '' });
      function refresh() { servers.value = store.getMcpServers(props.expertId); }
      Vue.watch(function () { return props.expertId; }, refresh, { immediate: true });
      Vue.onMounted(function () { window.addEventListener('app-store-updated', refresh); });
      Vue.onUnmounted(function () { window.removeEventListener('app-store-updated', refresh); });
      function imported() {
        try {
          var outcome = store.importMcpJsonMock(props.expertId, jsonText.value);
          jsonText.value = ''; importDialog.value = false; refresh();
          outcome.added.concat(outcome.overwritten).forEach(function (name) { store.testMcpServerMock(props.expertId, name); });
          refresh();
          var note = outcome.added.length + ' 台新服务';
          if (outcome.overwritten.length) note += '，覆盖：' + outcome.overwritten.join('、');
          if (outcome.renamed.length) note += '；名称调整：' + outcome.renamed.join('、');
          ElementPlus.ElMessage.success('已导入 ' + note + '。新会话生效。');
          if (outcome.missing.length) openSecrets(outcome.added.concat(outcome.overwritten), outcome.missing);
        } catch (error) { ElementPlus.ElMessage.error(error.message || 'JSON 解析失败'); }
      }
      function refsFor(server) {
        var names = [];
        Object.keys(server.env || {}).forEach(function (key) {
          var match = String(server.env[key]).match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/);
          if (match && names.indexOf(match[1]) < 0) names.push(match[1]);
        });
        return names;
      }
      function openSecrets(targets, names) {
        secretTargets.value = targets.slice();
        secretNames.value = names.slice();
        Object.keys(secretValues).forEach(function (key) { delete secretValues[key]; });
        secretNames.value.forEach(function (key) { secretValues[key] = ''; });
        secretDialog.value = true;
      }
      function configure(server) {
        var names = refsFor(server);
        if (!names.length) return ElementPlus.ElMessage.info('这台服务没有需要填写的密钥');
        openSecrets([server.name], names);
      }
      function saveSecrets() {
        store.configureMcpSecretsMock(props.expertId, secretTargets.value, secretValues);
        secretTargets.value.forEach(function (name) { store.testMcpServerMock(props.expertId, name); });
        Object.keys(secretValues).forEach(function (key) { secretValues[key] = ''; });
        secretDialog.value = false; refresh();
        ElementPlus.ElMessage.success('配置已保存并重新测试，新会话生效');
      }
      function test(server) { store.testMcpServerMock(props.expertId, server.name); refresh(); ElementPlus.ElMessage.info('已完成连通测试：' + server.name); }
      function toggle(server, enabled) { store.toggleMcpServerEnabled(props.expertId, server.name, enabled); refresh(); }
      function remove(server) {
        ElementPlus.ElMessageBox.confirm('确定删除 MCP 服务「' + server.name + '」？', '删除服务', { type: 'warning', confirmButtonText: '删除' })
          .then(function () { store.setMcpServers(props.expertId, servers.value.filter(function (item) { return item.name !== server.name; })); refresh(); }).catch(function () {});
      }
      function addServer() {
        var name = addForm.name.trim(), url = addForm.url.trim(), command = addForm.command.trim();
        if (!name || (addForm.type === 'http' && !url) || (addForm.type === 'stdio' && !command)) return ElementPlus.ElMessage.warning('请填写名称和 URL 或命令');
        try {
          var config = addForm.type === 'http' ? { url: url } : { command: command, args: [] };
          var wrapper = {}; wrapper[name] = config;
          var outcome = store.importMcpJsonMock(props.expertId, JSON.stringify({ mcpServers: wrapper }));
          store.testMcpServerMock(props.expertId, outcome.added[0] || outcome.overwritten[0]);
          addDialog.value = false; Object.assign(addForm, { name: '', type: 'http', url: '', command: '' }); refresh();
          ElementPlus.ElMessage.success('服务已添加并测试，新会话生效');
        } catch (error) { ElementPlus.ElMessage.error(error.message); }
      }
      function status(server) {
        if (server.missingEnv && server.missingEnv.length) return '未配置密钥';
        if (server.status === 'available') return '正常 · ' + server.toolCount + ' 个工具';
        if (server.status === 'unavailable') return server.errorSummary || '连接失败';
        return '未测试';
      }
      return { servers: servers, jsonText: jsonText, importDialog: importDialog, secretDialog: secretDialog, secretNames: secretNames,
        secretTargets: secretTargets, secretValues: secretValues, addDialog: addDialog, addForm: addForm,
        imported: imported, configure: configure, saveSecrets: saveSecrets, test: test, toggle: toggle,
        remove: remove, addServer: addServer, status: status, refsFor: refsFor };
    },
    template: `
      <div class="detail-tab-pane mcp-1023">
        <div class="detail-section-head"><h3 class="detail-section-title">MCP</h3><p class="detail-section-desc">添加服务或导入 mcp.json；缺密钥时一次填齐。变更在新会话生效。</p></div>
        <div class="mcp-1023-bar"><span>已启用 {{ servers.filter(s => s.enabled).length }} 台 · 需处理 {{ servers.filter(s => s.enabled && s.status !== 'available').length }} 台</span><div class="mcp-1023-bar-actions"><el-button size="small" @click="addDialog = true">添加</el-button><el-button size="small" @click="importDialog = true">导入</el-button></div></div>
        <el-empty v-if="!servers.length" description="尚未接入 MCP 服务，可添加或导入 mcp.json" />
        <div v-else class="mcp-1023-list"><div v-for="server in servers" :key="server.name" class="mcp-1023-row"><div><strong>{{ server.name }}</strong><small>{{ server.type === 'stdio' ? 'stdio' : 'HTTP' }} · {{ server.type === 'stdio' ? server.command : server.url }}</small></div><span class="mcp-1023-state" :class="{ good: server.status === 'available', bad: server.status === 'unavailable' }">{{ status(server) }}</span><el-button link type="primary" @click="test(server)">测试连通</el-button><el-button link type="primary" @click="configure(server)">配置</el-button><el-button link type="primary" @click="toggle(server,!server.enabled)">{{ server.enabled ? '禁用' : '启用' }}</el-button><el-button link type="danger" @click="remove(server)">删除</el-button></div></div>
        <el-dialog v-model="importDialog" title="导入 MCP 服务" width="620px" class="mcp-1023-import-dialog" append-to-body><div class="mcp-1023-import"><el-input v-model="jsonText" type="textarea" :rows="8" placeholder='粘贴 {"mcpServers": {"服务名": {"url": "..."}}}' /><p class="mcp-1023-import-hint">支持 mcpServers、mcp_servers 或名称到配置的 JSON</p></div><template #footer><el-button @click="importDialog = false">取消</el-button><el-button type="primary" :disabled="!jsonText.trim()" @click="imported">导入</el-button></template></el-dialog>
        <el-dialog v-model="secretDialog" title="配置密钥" width="540px" append-to-body><p class="mcp-1023-hint">密钥只在本次输入中使用，演示数据仅保存「已配置」状态，不保存明文。</p><el-form label-position="top"><el-form-item v-for="key in secretNames" :key="key" :label="key"><el-input v-model="secretValues[key]" type="password" show-password placeholder="已配置时留空则不修改" /></el-form-item></el-form><template #footer><el-button @click="secretDialog = false">取消</el-button><el-button type="primary" @click="saveSecrets">保存并测试</el-button></template></el-dialog>
        <el-dialog v-model="addDialog" title="添加 MCP 服务" width="560px" append-to-body><el-form label-position="top"><el-form-item label="名称"><el-input v-model="addForm.name" /></el-form-item><el-form-item label="类型"><el-radio-group v-model="addForm.type"><el-radio-button label="http">HTTP</el-radio-button><el-radio-button label="stdio">stdio</el-radio-button></el-radio-group></el-form-item><el-form-item v-if="addForm.type === 'http'" label="URL"><el-input v-model="addForm.url" placeholder="https://..." /></el-form-item><el-form-item v-else label="命令"><el-input v-model="addForm.command" placeholder="npx" /></el-form-item></el-form><template #footer><el-button @click="addDialog = false">取消</el-button><el-button type="primary" @click="addServer">保存并测试</el-button></template></el-dialog>
      </div>`
  };
})();
