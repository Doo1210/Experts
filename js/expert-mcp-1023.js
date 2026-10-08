/* 1023 mock MCP flow: paste JSON, resolve missing variables, probe rows. */
(function () {
  var store = window.AppStore;
  window.ExpertMcp1023 = {
    props: ['expertId', 'runningCount'],
    setup: function (props) {
      var servers = Vue.ref([]), searchQuery = Vue.ref(''), jsonText = Vue.ref(''), importDialog = Vue.ref(false);
      var filteredServers = Vue.computed(function () {
        var query = searchQuery.value.trim().toLocaleLowerCase();
        return query ? servers.value.filter(function (server) {
          return String(server.name || '').toLocaleLowerCase().includes(query);
        }) : servers.value;
      });
      var platformTab = Vue.ref('imported'), platformSelected = Vue.ref({}), platformTableRef = Vue.ref(null);
      var platformImporting = Vue.ref(false), platformSelectionSyncing = false;
      var detailVisible = Vue.ref(false), detailServer = Vue.ref(null);
      var detailDraft = Vue.ref(null), detailOriginal = Vue.ref('');
      var detailConfigOpen = Vue.ref(false), detailTesting = Vue.ref(false), detailSaving = Vue.ref(false);
      var detailTestResult = Vue.ref(null);
      var detailDirty = Vue.computed(function () {
        return !!detailDraft.value && JSON.stringify(detailDraft.value) !== detailOriginal.value;
      });
      var detailSecretNames = Vue.computed(function () {
        if (!detailServer.value || !detailDraft.value) return [];
        var names = refsFor(detailServer.value);
        (detailServer.value.missingEnv || []).forEach(function (name) {
          if (names.indexOf(name) < 0) names.push(name);
        });
        if (detailDraft.value.auth === 'bearer' && !names.length) {
          names.push('MCP_' + detailServer.value.name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_TOKEN');
        }
        return names;
      });
      var secretDialog = Vue.ref(false), secretNames = Vue.ref([]), secretTargets = Vue.ref([]), secretValues = Vue.reactive({});
      var addDialog = Vue.ref(false), addMode = Vue.ref('manual');
      var addForm = Vue.reactive({ name: '', transport: 'streamable_http', url: '', command: '', argsText: '', envText: '', auth: 'none', token: '', enabled: true });
      var platformOptions = Vue.computed(function () {
        var installed = {};
        servers.value.forEach(function (server) { installed[server.name] = true; });
        return (window.MCP_HUB_CATALOG || []).filter(function (item) {
          return (item.scope || 'imported') === platformTab.value && !installed[item.englishId || item.name || item.id];
        });
      });
      var platformSelectedCount = Vue.computed(function () { return Object.keys(platformSelected.value).length; });
      var pastePreview = Vue.computed(function () {
        if (!jsonText.value.trim()) return { items: [], error: '' };
        try {
          return { items: window.Expert1023Utils.parseMcpJson(jsonText.value).map(function (item) {
            return { name: item.name, transport: item.config.command ? '本地命令 stdio' : String(item.config.transport || '').toLowerCase() === 'sse' ? 'SSE' : 'Streamable HTTP' };
          }), error: '' };
        } catch (error) { return { items: [], error: error.message || '配置格式有误' }; }
      });
      var canAdd = Vue.computed(function () {
        if (addMode.value === 'paste') return !!jsonText.value.trim() && !pastePreview.value.error;
        if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(addForm.name.trim())) return false;
        if (addForm.transport === 'stdio') return !!addForm.command.trim();
        return /^https?:\/\/\S+/i.test(addForm.url.trim()) && (addForm.auth !== 'bearer' || !!addForm.token.trim());
      });
      function refresh() {
        servers.value = store.getMcpServers(props.expertId);
        if (detailVisible.value && detailServer.value) {
          detailServer.value = servers.value.find(function (server) { return server.name === detailServer.value.name; }) || null;
          if (!detailServer.value) detailVisible.value = false;
        }
      }
      Vue.watch(function () { return props.expertId; }, refresh, { immediate: true });
      Vue.watch(platformOptions, function () { Vue.nextTick(syncPlatformSelection); });
      Vue.watch(importDialog, function (visible) { if (visible) Vue.nextTick(syncPlatformSelection); });
      Vue.watch(detailDraft, function () {
        if (detailVisible.value) detailTestResult.value = null;
      }, { deep: true, flush: 'sync' });
      Vue.onMounted(function () { window.addEventListener('app-store-updated', refresh); });
      Vue.onUnmounted(function () { window.removeEventListener('app-store-updated', refresh); });
      function connectionLabel(server) {
        if (server.type === 'stdio') return '本地命令 stdio';
        return server.transport === 'sse' ? 'SSE' : 'Streamable HTTP';
      }
      function openPlatformImport() {
        platformTab.value = 'imported';
        platformSelected.value = {};
        importDialog.value = true;
      }
      function syncPlatformSelection() {
        var table = platformTableRef.value;
        if (!table || typeof table.clearSelection !== 'function') return;
        platformSelectionSyncing = true;
        table.clearSelection();
        platformOptions.value.forEach(function (item) {
          if (platformSelected.value[item.id]) table.toggleRowSelection(item, true);
        });
        Vue.nextTick(function () { platformSelectionSyncing = false; });
      }
      function onPlatformSelectionChange(rows) {
        if (platformSelectionSyncing) return;
        var visible = {};
        platformOptions.value.forEach(function (item) { visible[item.id] = true; });
        var next = Object.assign({}, platformSelected.value);
        Object.keys(visible).forEach(function (id) { delete next[id]; });
        (rows || []).forEach(function (item) { if (item && item.id) next[item.id] = item; });
        platformSelected.value = next;
      }
      function importSelectedPlatform() {
        var items = Object.keys(platformSelected.value).map(function (id) { return platformSelected.value[id]; });
        if (!items.length) return ElementPlus.ElMessage.warning('请先勾选 MCP 服务');
        platformImporting.value = true;
        Promise.resolve().then(function () {
          var map = {};
          items.forEach(function (item) {
            var name = item.englishId || item.name || item.id;
            map[name] = {
              url: item.url || '', command: item.command || '', args: item.args || [],
              transport: item.transport === 'sse' ? 'sse' : 'streamable_http',
              env: item.env || {}, enabled: true,
              tools: item.tools || [], toolCount: item.toolCount || (item.tools || []).length
            };
          });
          var result = store.importMcpJsonMock(props.expertId, JSON.stringify({ mcpServers: map }));
          result.added.concat(result.overwritten).forEach(function (name) {
            var server = store.getMcpServers(props.expertId).find(function (item) { return item.name === name; });
            if (server && server.enabled) store.testMcpServerMock(props.expertId, name);
          });
          refresh();
          platformSelected.value = {};
          importDialog.value = false;
          ElementPlus.ElMessage.success('已从平台导入 ' + items.length + ' 项 MCP 服务，新会话生效');
          if (result.missing.length) openSecrets(result.added.concat(result.overwritten), result.missing);
        }).catch(function (error) {
          ElementPlus.ElMessage.error((error && error.message) || '导入失败');
        }).finally(function () { platformImporting.value = false; });
      }
      function imported() {
        try {
          var outcome = store.importMcpJsonMock(props.expertId, jsonText.value);
          jsonText.value = ''; addDialog.value = false; refresh();
          outcome.added.concat(outcome.overwritten).forEach(function (name) {
            var server = store.getMcpServers(props.expertId).find(function (item) { return item.name === name; });
            if (server && server.enabled) store.testMcpServerMock(props.expertId, name);
          });
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
        if (!names.length) names = (server.missingEnv || []).slice();
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
      function toggle(server, enabled) {
        store.toggleMcpServerEnabled(props.expertId, server.name, enabled);
        refresh();
        ElementPlus.ElMessage.success((enabled ? '已启用' : '已停用') + '，新会话生效');
      }
      function openDetail(server) {
        detailServer.value = server;
        var secretChanges = {};
        refsFor(server).concat(server.missingEnv || []).forEach(function (name) { secretChanges[name] = ''; });
        detailDraft.value = {
          enabled: server.enabled !== false, type: server.type || 'http',
          transport: server.type === 'stdio' ? 'stdio' : server.transport === 'sse' ? 'sse' : 'streamable_http',
          url: server.url || '', command: server.command || '',
          argsText: JSON.stringify(server.args || []),
          envText: Object.keys(server.env || {}).map(function (key) { return key + '=' + server.env[key]; }).join('\n'),
          auth: server.auth || 'none', secretChanges: secretChanges
        };
        detailOriginal.value = JSON.stringify(detailDraft.value);
        detailConfigOpen.value = false;
        detailTestResult.value = null;
        detailVisible.value = true;
      }

      function detailConnectionLabel() {
        if (!detailServer.value || !detailDraft.value) return '未测试';
        if (!detailDraft.value.enabled) return '已禁用';
        if (detailTesting.value) return '测试中';
        if (detailDirty.value && !detailTestResult.value) return '未测试';
        var result = detailTestResult.value || detailServer.value;
        if (result.status === 'missing_secret' || (detailServer.value.missingEnv || []).length && !detailTestResult.value) return '缺少认证';
        if (result.status === 'available') return '连接正常';
        if (result.status === 'unavailable') return '连接失败';
        return '未测试';
      }

      function detailConnectionError() {
        var result = detailTestResult.value || detailServer.value;
        if (!result) return '';
        return detailConnectionLabel() === '连接失败' || detailConnectionLabel() === '缺少认证'
          ? result.errorSummary || (detailConnectionLabel() === '缺少认证' ? '请先配置所需密钥' : '连接失败，请检查配置')
          : '';
      }

      function detailSecretState() {
        if (!detailDraft.value || detailDraft.value.auth === 'none') return '无需认证';
        if (Object.keys(detailDraft.value.secretChanges || {}).some(function (key) { return !!String(detailDraft.value.secretChanges[key] || '').trim(); })) return '待保存';
        return detailServer.value && !(detailServer.value.missingEnv || []).length && Object.keys(detailServer.value.env || {}).length ? '已配置' : '未配置';
      }

      function onDetailTransportChange(value) {
        if (!detailDraft.value) return;
        detailDraft.value.type = value === 'stdio' ? 'stdio' : 'http';
        if (value === 'stdio') detailDraft.value.auth = 'none';
      }

      function testDetail() {
        if (!detailDraft.value || !detailServer.value) return;
        var draft = detailDraft.value;
        detailTesting.value = true;
        Promise.resolve().then(function () {
          if (draft.transport !== 'stdio' && !/^https?:\/\/\S+/i.test(draft.url.trim())) {
            return { status: 'unavailable', errorSummary: '服务地址须以 http:// 或 https:// 开头' };
          }
          if (draft.transport === 'stdio' && !draft.command.trim()) {
            return { status: 'unavailable', errorSummary: '请填写启动命令' };
          }
          if (draft.transport === 'stdio') {
            var env;
            try { env = parseEnv(draft.envText); }
            catch (error) { return { status: 'unavailable', errorSummary: error.message }; }
            var missing = Object.keys(env).map(function (key) {
              var value = String(env[key] || '');
              if (!value.trim()) return key;
              var ref = value.match(/^\$\{(?:env:)?([A-Za-z_][A-Za-z0-9_]*)\}$/);
              if (ref && ((detailServer.value.missingEnv || []).indexOf(ref[1]) >= 0 || !(detailServer.value.env || {})[key])) return ref[1];
              return '';
            }).filter(Boolean);
            if (missing.length) return { status: 'missing_secret', errorSummary: '缺少环境变量 ' + missing[0] };
          }
          if (draft.auth === 'bearer' && detailSecretNames.value.some(function (name) {
            return (detailServer.value.missingEnv || []).indexOf(name) >= 0 && !String(draft.secretChanges[name] || '').trim();
          })) return { status: 'missing_secret', errorSummary: '缺少认证密钥' };
          if (draft.auth === 'oauth') return { status: 'unavailable', errorSummary: '需先完成 OAuth 登录' };
          if (/fail|invalid|offline/i.test(draft.url || draft.command)) {
            return { status: 'unavailable', errorSummary: '连接失败：演示服务不可达' };
          }
          return { status: 'available', errorSummary: '', toolCount: detailServer.value.toolCount || (detailServer.value.tools || []).length, tools: detailServer.value.tools || [] };
        }).then(function (result) {
          detailTestResult.value = result;
          if (result.status === 'available') ElementPlus.ElMessage.success('连接正常');
        }).finally(function () { detailTesting.value = false; });
      }

      function beforeDetailClose(done) {
        if (!detailDirty.value) return done();
        ElementPlus.ElMessageBox.confirm('有未保存修改，确定放弃吗？', '放弃修改', {
          confirmButtonText: '放弃修改', cancelButtonText: '继续编辑', type: 'warning'
        }).then(done).catch(function () {});
      }

      function requestDetailClose() {
        beforeDetailClose(function () { detailVisible.value = false; });
      }

      function saveDetail() {
        if (!detailDirty.value || !detailServer.value || !detailDraft.value) return;
        var draft = detailDraft.value, target = detailServer.value;
        if (draft.transport !== 'stdio' && !/^https?:\/\/\S+/i.test(draft.url.trim())) return ElementPlus.ElMessage.warning('请填写有效的服务地址');
        if (draft.transport === 'stdio' && !draft.command.trim()) return ElementPlus.ElMessage.warning('请填写启动命令');
        detailSaving.value = true;
        try {
          var secretValues = {}, nextEnv = draft.transport === 'stdio' ? parseEnv(draft.envText) : Object.assign({}, target.env || {});
          detailSecretNames.value.forEach(function (name) {
            if (draft.auth === 'bearer' && !nextEnv[name]) nextEnv[name] = '$' + '{' + name + '}';
            if (String(draft.secretChanges[name] || '').trim()) secretValues[name] = String(draft.secretChanges[name]).trim();
          });
          var nextMissing = draft.transport === 'stdio'
            ? Object.keys(nextEnv).map(function (name) {
                var value = String(nextEnv[name] || '');
                if (!value.trim()) return name;
                var ref = value.match(/^\$\{(?:env:)?([A-Za-z_][A-Za-z0-9_]*)\}$/);
                if (ref && ((target.missingEnv || []).indexOf(ref[1]) >= 0 || !(target.env || {})[name])) return ref[1];
                return '';
              }).filter(Boolean)
            : draft.auth === 'none' ? [] : detailSecretNames.value.filter(function (name) {
            return (target.missingEnv || []).indexOf(name) >= 0 && !secretValues[name];
          });
          if (draft.auth === 'bearer' && !refsFor(target).length && !Object.keys(secretValues).length) {
            nextMissing = detailSecretNames.value.slice();
          }
          var next = servers.value.map(function (server) {
            if (server.name !== target.name) return server;
            return Object.assign({}, server, {
              enabled: draft.enabled, type: draft.transport === 'stdio' ? 'stdio' : 'http',
              transport: draft.transport === 'stdio' ? '' : draft.transport === 'sse' ? 'sse' : 'streamable_http',
              url: draft.transport === 'stdio' ? '' : draft.url.trim(),
              command: draft.transport === 'stdio' ? draft.command.trim() : '',
              args: draft.transport === 'stdio' ? parseArgs(draft.argsText) : [],
              auth: draft.auth === 'none' ? '' : draft.auth,
              env: nextEnv, missingEnv: nextMissing,
              status: 'unverified', errorSummary: '', testedAt: ''
            });
          });
          store.setMcpServers(props.expertId, next);
          if (Object.keys(secretValues).length) store.configureMcpSecretsMock(props.expertId, [target.name], secretValues);
          var result = store.testMcpServerMock(props.expertId, target.name);
          refresh();
          var updated = servers.value.find(function (server) { return server.name === target.name; });
          if (updated) openDetail(updated);
          detailTestResult.value = result;
          ElementPlus.ElMessage.success('MCP 配置已保存并测试，新会话生效');
        } catch (error) {
          ElementPlus.ElMessage.error((error && error.message) || '保存失败，请重试');
        } finally { detailSaving.value = false; }
      }
      function openAdd() {
        addMode.value = 'manual';
        jsonText.value = '';
        Object.assign(addForm, { name: '', transport: 'streamable_http', url: '', command: '', argsText: '', envText: '', auth: 'none', token: '', enabled: true });
        addDialog.value = true;
      }
      function onCardAction(command, server) {
        if (command === 'test') { openDetail(server); testDetail(); }
        if (command === 'configure') { openDetail(server); detailConfigOpen.value = true; }
        if (command === 'delete') remove(server);
      }
      function remove(server) {
        ElementPlus.ElMessageBox.confirm('确定删除 MCP 服务「' + server.name + '」？', '删除服务', { type: 'warning', confirmButtonText: '删除' })
          .then(function () { store.setMcpServers(props.expertId, servers.value.filter(function (item) { return item.name !== server.name; })); refresh(); }).catch(function () {});
      }
      function parseArgs(text) {
        var raw = String(text || '').trim();
        if (!raw) return [];
        if (raw[0] === '[') {
          var parsed = JSON.parse(raw);
          if (!Array.isArray(parsed) || parsed.some(function (value) { return typeof value !== 'string'; })) throw new Error('参数请填写字符串数组');
          return parsed;
        }
        return raw.split(/\s+/).filter(Boolean);
      }
      function parseEnv(text) {
        var env = {};
        String(text || '').split(/\r?\n/).forEach(function (line) {
          if (!line.trim()) return;
          var match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
          if (!match) throw new Error('环境变量请按 KEY=VALUE 每行填写');
          env[match[1]] = match[2];
        });
        return env;
      }
      function addServer() {
        if (addMode.value === 'paste') return imported();
        var name = addForm.name.trim(), url = addForm.url.trim(), command = addForm.command.trim();
        if (!canAdd.value) return ElementPlus.ElMessage.warning('请完整填写服务名称和当前连接方式的必填项');
        if (servers.value.some(function (server) { return server.name === name; })) return ElementPlus.ElMessage.warning('已存在同名 MCP 服务');
        try {
          var config = { enabled: addForm.enabled };
          if (addForm.transport === 'stdio') {
            config.command = command;
            config.args = parseArgs(addForm.argsText);
            config.env = parseEnv(addForm.envText);
          } else {
            config.url = url;
            if (addForm.transport === 'sse') config.transport = 'sse';
            if (addForm.auth === 'bearer') {
              config.auth = 'bearer';
              config.headers = { Authorization: 'Bearer ' + addForm.token.trim() };
            }
          }
          var wrapper = {}; wrapper[name] = config;
          var outcome = store.importMcpJsonMock(props.expertId, JSON.stringify({ mcpServers: wrapper }));
          var result = addForm.enabled ? store.testMcpServerMock(props.expertId, outcome.added[0] || outcome.overwritten[0]) : null;
          addDialog.value = false;
          addForm.token = '';
          refresh();
          ElementPlus.ElMessage.success(result && result.status === 'available' ? '服务已添加，连接测试成功。新会话生效' : '服务已添加，连接状态见列表。新会话生效');
          if (outcome.missing.length) openSecrets(outcome.added, outcome.missing);
        } catch (error) { ElementPlus.ElMessage.error(error.message); }
      }
      function status(server) {
        if (server.missingEnv && server.missingEnv.length) return '未配置密钥';
        if (server.status === 'available') return '正常 · ' + server.toolCount + ' 个工具';
        if (server.status === 'unavailable') return server.errorSummary || '连接失败';
        return '未测试';
      }
      return { servers: servers, filteredServers: filteredServers, searchQuery: searchQuery, jsonText: jsonText, importDialog: importDialog,
        platformTab: platformTab, platformOptions: platformOptions, platformTableRef: platformTableRef,
        platformSelectedCount: platformSelectedCount, platformImporting: platformImporting,
        openPlatformImport: openPlatformImport, onPlatformSelectionChange: onPlatformSelectionChange,
        importSelectedPlatform: importSelectedPlatform, connectionLabel: connectionLabel,
        addMode: addMode, canAdd: canAdd, pastePreview: pastePreview,
        detailVisible: detailVisible, detailServer: detailServer,
        detailDraft: detailDraft, detailConfigOpen: detailConfigOpen,
        detailTesting: detailTesting, detailSaving: detailSaving, detailTestResult: detailTestResult,
        detailDirty: detailDirty, detailSecretNames: detailSecretNames,
        detailConnectionLabel: detailConnectionLabel, detailConnectionError: detailConnectionError,
        detailSecretState: detailSecretState, onDetailTransportChange: onDetailTransportChange,
        testDetail: testDetail, saveDetail: saveDetail,
        beforeDetailClose: beforeDetailClose, requestDetailClose: requestDetailClose,
        openDetail: openDetail, onCardAction: onCardAction, secretDialog: secretDialog, secretNames: secretNames,
        secretTargets: secretTargets, secretValues: secretValues, addDialog: addDialog, addForm: addForm,
        imported: imported, configure: configure, saveSecrets: saveSecrets, test: test, toggle: toggle,
        openAdd: openAdd,
        remove: remove, addServer: addServer, status: status, refsFor: refsFor };
    },
    template: `
      <div class="detail-tab-pane mcp-1023">
        <div class="detail-section-head"><h3 class="detail-section-title">MCP</h3><p class="detail-section-desc">添加 Streamable HTTP、SSE 或本地命令服务，也可粘贴配置或从平台导入。变更在新会话生效。</p></div>
        <div class="mcp-1023-bar"><span>已启用 {{ servers.filter(s => s.enabled).length }} 台 · 需处理 {{ servers.filter(s => s.enabled && s.status !== 'available').length }} 台</span><div class="mcp-1023-bar-actions"><el-input v-model="searchQuery" class="mcp-1023-search" size="small" clearable placeholder="搜索 MCP 服务名称" aria-label="按名称搜索 MCP 服务" /><el-button type="primary" size="small" @click="openPlatformImport">从平台导入</el-button><el-button size="small" @click="openAdd">添加</el-button></div></div>
        <el-empty v-if="!servers.length" description="尚未接入 MCP 服务，可添加或导入 mcp.json" />
        <el-empty v-else-if="!filteredServers.length" description="没有匹配的 MCP 服务" />
        <div v-else class="capability-card-grid">
          <article v-for="server in filteredServers" :key="server.name" class="capability-card" :class="{ 'is-disabled': server.enabled === false }" role="button" tabindex="0" :aria-label="'查看 MCP 服务 ' + server.name + ' 详情'" @click="openDetail(server)" @keydown.enter.prevent="openDetail(server)" @keydown.space.prevent="openDetail(server)">
            <div class="capability-card-head"><strong class="capability-card-title" :title="server.name">{{ server.name }}</strong><span class="capability-card-switch" @click.stop @keydown.stop><el-switch :model-value="server.enabled !== false" size="small" :aria-label="(server.enabled === false ? '启用' : '停用') + server.name" @change="(v) => toggle(server, v)" /></span></div>
            <p class="capability-card-desc" :title="server.type === 'stdio' ? (server.command || '') : (server.url || '')">{{ connectionLabel(server) }} · {{ server.type === 'stdio' ? (server.command || '命令未填写') : (server.url || '连接地址未填写') }}</p>
            <div class="capability-card-foot"><span class="capability-card-meta" :class="server.status === 'available' ? 'capability-card-state--ok' : server.status === 'unavailable' || (server.missingEnv && server.missingEnv.length) ? 'capability-card-state--warn' : ''">{{ status(server) }}</span><span class="capability-card-menu" @click.stop @keydown.stop><el-dropdown trigger="click" @command="(cmd) => onCardAction(cmd, server)"><button type="button" class="capability-card-more" :aria-label="'更多操作：' + server.name">⋯</button><template #dropdown><el-dropdown-menu><el-dropdown-item command="test">测试连通</el-dropdown-item><el-dropdown-item command="configure">配置操作</el-dropdown-item><el-dropdown-item command="delete" divided>删除服务</el-dropdown-item></el-dropdown-menu></template></el-dropdown></span></div>
          </article>
        </div>
        <el-dialog v-model="detailVisible" :title="detailServer ? detailServer.name : 'MCP 服务'" width="800px" class="form-dialog ed-dialog capability-detail-dialog capability-mcp-dialog" append-to-body :before-close="beforeDetailClose">
          <template #header><div class="dialog-header-custom dialog-header-mcp capability-dialog-header"><div class="dialog-header-icon dialog-header-icon-mcp"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M11 8h6M7 12h10"/></svg></div><div class="dialog-header-text"><div v-if="detailServer && detailDraft" class="capability-dialog-main"><div class="dialog-header-title">{{ detailServer.name }}</div><div class="capability-dialog-tags"><el-tag size="small" type="info">{{ connectionLabel(detailDraft) }}</el-tag><el-tag size="small" :type="detailServer.enabled === false ? 'info' : 'success'">{{ detailServer.enabled === false ? '已停用' : '已启用' }}</el-tag></div></div><p v-if="detailServer && detailDraft" class="capability-dialog-desc">{{ detailDraft.transport === 'stdio' ? (detailDraft.command || '启动命令未填写') : (detailDraft.url || '服务地址未填写') }}</p></div></div></template>
          <div v-if="detailServer && detailDraft" class="form-dialog-body ed-dialog-body capability-detail-content">
            <div class="capability-connection-row"><span class="capability-connection-status" :class="detailConnectionLabel() === '连接正常' ? 'is-ok' : detailConnectionLabel() === '连接失败' || detailConnectionLabel() === '缺少认证' ? 'is-error' : ''">● {{ detailConnectionLabel() }}</span><el-button size="small" :loading="detailTesting" @click="testDetail">测试连通</el-button></div>
            <p v-if="detailConnectionError()" class="capability-connection-error">{{ detailConnectionError() }}</p>
            <section class="capability-detail-section">
              <h4>① 配置信息</h4>
              <div class="capability-detail-facts"><div><span>连接方式</span><strong>{{ connectionLabel(detailDraft) }}</strong></div><div><span>{{ detailDraft.transport === 'stdio' ? '启动命令' : '服务地址' }}</span><strong :title="detailDraft.transport === 'stdio' ? detailDraft.command : detailDraft.url">{{ detailDraft.transport === 'stdio' ? (detailDraft.command || '未填写') : (detailDraft.url || '未填写') }}</strong></div><div><span>{{ detailDraft.transport === 'stdio' ? '环境变量' : '认证方式' }}</span><strong>{{ detailDraft.transport === 'stdio' ? ((detailServer.missingEnv || []).length ? '待配置' : detailDraft.envText.trim() ? '已填写' : '无') : detailDraft.auth === 'bearer' ? 'Bearer Token · ' + detailSecretState() : detailDraft.auth === 'oauth' ? 'OAuth' : '无认证' }}</strong></div></div>
              <button type="button" class="capability-config-toggle" :aria-expanded="detailConfigOpen" @click="detailConfigOpen = !detailConfigOpen">配置操作 {{ detailConfigOpen ? '▴' : '▾' }}</button>
              <div v-if="detailConfigOpen" class="capability-config-form">
                <label class="mcp-add-transport-field">连接方式<el-radio-group v-model="detailDraft.transport" class="mcp-add-transport" @change="onDetailTransportChange"><el-radio label="streamable_http">Streamable HTTP</el-radio><el-radio label="sse">SSE</el-radio><el-radio label="stdio">本地命令 stdio</el-radio></el-radio-group></label>
                <template v-if="detailDraft.transport !== 'stdio'"><label>服务地址<el-input v-model="detailDraft.url" placeholder="https://example.com/mcp" /></label><label>认证方式<el-select v-model="detailDraft.auth" style="width:100%"><el-option label="无认证" value="none" /><el-option label="Bearer Token" value="bearer" /><el-option label="OAuth" value="oauth" /></el-select></label><div v-if="detailDraft.auth !== 'none' && detailSecretNames.length" class="capability-config-secrets"><label v-for="key in detailSecretNames" :key="key">{{ key }}<el-input v-model="detailDraft.secretChanges[key]" type="password" show-password :placeholder="detailSecretState() === '已配置' ? '已配置，留空则不修改' : '请输入密钥'" /></label></div></template>
                <template v-else><label>启动命令<el-input v-model="detailDraft.command" placeholder="npx" /></label><label>参数<el-input v-model="detailDraft.argsText" placeholder='["-y", "some-mcp-server"]' /></label><label class="mcp-add-env-field">环境变量<el-input v-model="detailDraft.envText" type="textarea" :rows="3" placeholder="KEY=VALUE，每行一项" /></label></template>
              </div>
            </section>
            <section class="capability-detail-section capability-abilities-section">
              <h4>② 可用能力 · {{ detailConnectionLabel() === '连接正常' ? (detailServer.tools || []).length : 0 }} 项</h4>
              <p v-if="detailConnectionLabel() === '未测试'" class="capability-detail-note">测试连通后查看服务提供的能力。</p>
              <p v-else-if="detailConnectionLabel() === '测试中'" class="capability-detail-note">正在测试连接…</p>
              <template v-else-if="detailConnectionLabel() === '连接正常'"><ul v-if="detailServer.tools && detailServer.tools.length" class="capability-detail-tool-list"><li v-for="(tool, index) in detailServer.tools" :key="index"><strong>{{ typeof tool === 'string' ? tool : tool.name }}</strong><span v-if="typeof tool !== 'string' && tool.description">{{ tool.description }}</span></li></ul><p v-else class="capability-detail-note">服务已连接，但未暴露工具名称。</p></template>
              <p v-else class="capability-detail-note">当前无法获取可用能力。</p>
            </section>
          </div>
          <template #footer><div class="capability-detail-footer"><span>变更将在新会话生效</span><div><el-button @click="requestDetailClose">关闭</el-button><el-button type="primary" :disabled="!detailDirty" :loading="detailSaving" @click="saveDetail">保存</el-button></div></div></template>
        </el-dialog>
        <el-dialog v-model="importDialog" width="640px" append-to-body class="form-dialog capability-picker-dialog ed-dialog ed-dialog-hub ed-dialog-mcp-hub">
          <template #header><div class="dialog-header-custom dialog-header-mcp"><div class="dialog-header-icon dialog-header-icon-mcp"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M11 8h6M7 12h10"/></svg></div><div class="dialog-header-text"><div class="dialog-header-title">从平台导入 MCP 服务</div><div class="dialog-header-sub">选择平台中的服务</div></div></div></template>
          <div class="form-dialog-body ed-dialog-body">
            <div class="hub-skill-tabs" role="tablist"><button type="button" class="hub-skill-tab" :class="{ 'is-active': platformTab === 'imported' }" role="tab" :aria-selected="platformTab === 'imported'" @click="platformTab = 'imported'">我导入的</button><button type="button" class="hub-skill-tab" :class="{ 'is-active': platformTab === 'created' }" role="tab" :aria-selected="platformTab === 'created'" @click="platformTab = 'created'">我创建的</button></div>
            <el-table ref="platformTableRef" :data="platformOptions" row-key="id" stripe max-height="480" class="toolset-table capability-picker-table hub-skill-table" empty-text="暂无可导入的 MCP 服务" @selection-change="onPlatformSelectionChange">
              <el-table-column type="selection" width="48" align="center" />
              <el-table-column label="MCP 服务" min-width="280"><template #default="{ row }"><div class="hub-skill-cell"><span class="hub-skill-icon" aria-hidden="true">{{ row.icon || '🔌' }}</span><span class="hub-skill-title">{{ row.nameZh || row.name || row.englishId }}</span></div></template></el-table-column>
            </el-table>
          </div>
          <template #footer><div class="dialog-footer-custom dialog-footer-wizard hub-dialog-footer"><span class="hub-selected-count">已选择 <strong>{{ platformSelectedCount }}</strong> 项服务</span><div class="dialog-footer-actions"><el-button class="wizard-btn wizard-btn-cancel" :disabled="platformImporting" @click="importDialog = false">取消</el-button><el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="platformImporting" :disabled="platformSelectedCount === 0" @click="importSelectedPlatform">导入</el-button></div></div></template>
        </el-dialog>
        <el-dialog v-model="secretDialog" title="配置密钥" width="540px" append-to-body><p class="mcp-1023-hint">密钥只在本次输入中使用，演示数据仅保存「已配置」状态，不保存明文。</p><el-form label-position="top"><el-form-item v-for="key in secretNames" :key="key" :label="key"><el-input v-model="secretValues[key]" type="password" show-password placeholder="已配置时留空则不修改" /></el-form-item></el-form><template #footer><el-button @click="secretDialog = false">取消</el-button><el-button type="primary" @click="saveSecrets">保存并测试</el-button></template></el-dialog>
        <el-dialog v-model="addDialog" width="640px" append-to-body class="form-dialog ed-dialog ed-dialog-mcp mcp-add-dialog" :close-on-click-modal="false">
          <template #header><div class="dialog-header-custom dialog-header-mcp"><div class="dialog-header-icon dialog-header-icon-mcp"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M11 8h6M7 12h10"/></svg></div><div class="dialog-header-text"><div class="dialog-header-title">添加外部 MCP 服务</div></div></div></template>
          <div class="form-dialog-body ed-dialog-body">
            <div class="hub-skill-tabs mcp-add-tabs" role="tablist"><button type="button" class="hub-skill-tab" :class="{ 'is-active': addMode === 'manual' }" role="tab" :aria-selected="addMode === 'manual'" @click="addMode = 'manual'">手动添加</button><button type="button" class="hub-skill-tab" :class="{ 'is-active': addMode === 'paste' }" role="tab" :aria-selected="addMode === 'paste'" @click="addMode = 'paste'">粘贴配置</button></div>
            <div v-if="addMode === 'paste'" class="mcp-1023-import"><el-input v-model="jsonText" type="textarea" :rows="8" placeholder='粘贴 {"mcpServers": {"服务名": {"url": "https://..."}}}' /><p class="mcp-1023-import-hint">支持 mcpServers、mcp_servers 或名称到配置的 JSON；SSE 会保留原传输方式。</p><p v-if="pastePreview.error" class="mcp-add-preview-error">{{ pastePreview.error }}</p><div v-else-if="pastePreview.items.length" class="mcp-add-preview"><strong>将导入 {{ pastePreview.items.length }} 项服务</strong><span v-for="item in pastePreview.items" :key="item.name">{{ item.name }} · {{ item.transport }}</span></div></div>
            <el-form v-else label-position="top" class="mcp-add-form">
              <el-form-item label="服务名称" required><el-input v-model="addForm.name" placeholder="company-api" maxlength="64" /></el-form-item>
              <el-form-item label="连接方式" required><el-radio-group v-model="addForm.transport" class="mcp-add-transport"><el-radio label="streamable_http">Streamable HTTP</el-radio><el-radio label="sse">SSE</el-radio><el-radio label="stdio">本地命令 stdio</el-radio></el-radio-group></el-form-item>
              <template v-if="addForm.transport !== 'stdio'"><el-form-item label="服务地址" required><el-input v-model="addForm.url" placeholder="https://example.com/mcp" /></el-form-item><el-form-item label="认证方式"><el-select v-model="addForm.auth" style="width:100%"><el-option label="无需认证" value="none" /><el-option label="Bearer Token" value="bearer" /></el-select></el-form-item><el-form-item v-if="addForm.auth === 'bearer'" label="Token" required><el-input v-model="addForm.token" type="password" show-password placeholder="输入密钥" /></el-form-item></template>
              <template v-else><el-form-item label="启动命令" required><el-input v-model="addForm.command" placeholder="npx" /></el-form-item><el-form-item label="参数"><el-input v-model="addForm.argsText" placeholder='["-y", "some-mcp-server"]' /></el-form-item><el-form-item label="环境变量"><el-input v-model="addForm.envText" type="textarea" :rows="3" placeholder="KEY=VALUE，每行一项" /></el-form-item></template>
              <el-form-item label="服务状态"><div class="mcp-add-enabled"><el-switch v-model="addForm.enabled" /><span>添加后启用</span></div></el-form-item>
            </el-form>
          </div>
          <template #footer><el-button @click="addDialog = false">取消</el-button><el-button type="primary" :disabled="!canAdd" @click="addServer">{{ addMode === 'paste' ? '导入并测试' : '添加并测试' }}</el-button></template>
        </el-dialog>
      </div>`
  };
})();
