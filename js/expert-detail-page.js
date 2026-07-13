/**
 * 专家管理详情页 — 人设 / 工作空间 / 任务 / 记忆 / 技能 / 工具 / IM渠道
 */
(function () {
  var store = window.AppStore;
  var catalog = window;
  var createExpertEditForm = window.createExpertEditForm;
  var ExpertDetailPage = {
    props: ['expertId', 'initialTab'],
    emits: ['nav'],
    setup: function (props, ctx) {
      var expert = Vue.ref(null);
      var activeTab = Vue.ref(props.initialTab || 'persona');
      if (activeTab.value === 'overview' || activeTab.value === 'basic') activeTab.value = 'persona';
      if (activeTab.value === 'skills-tools') activeTab.value = 'skills';
      if (activeTab.value === 'messaging') activeTab.value = 'im';
      if (activeTab.value === 'artifacts' || activeTab.value === 'outputs') {
        activeTab.value = 'workspace';
      } else if (activeTab.value === 'materials') {
        activeTab.value = 'workspace';
      } else if (activeTab.value === 'permissions') {
        activeTab.value = 'persona';
      }
      var persona = Vue.ref({ soulMd: '', onboarded: false });
      var tasks = Vue.ref([]);
      var memories = Vue.ref([]);
      var memoryInput = Vue.ref('');
      var skillBindings = Vue.ref([]);
      var toolBindings = Vue.ref([]);
      var imChannels = Vue.ref([]);
      var materials = Vue.ref([]);
      var expertArtifacts = Vue.ref([]);
      var fileNameInput = Vue.ref('');
      var expertEdit = createExpertEditForm(store, {
        getExpert: function () { return expert.value; },
        onSaved: function () { load(); },
        getRunningSessionCount: function () { return runningSessionCount.value; }
      });
      var runningSessionCount = Vue.ref(0);
      var workspaceRootPath = Vue.ref('');
      var workspaceRootDialogVisible = Vue.ref(false);
      var workspaceRootInput = Vue.ref('');
      var highlightSessionId = Vue.ref('');
      var memoryMdContent = Vue.ref('');
      var userMdContent = Vue.ref('');
      var personaOnboardDismissed = Vue.ref(false);
      var personaApplyImmediate = Vue.ref(false);
      var hubInstallDialogVisible = Vue.ref(false);
      var hubInstallSearch = Vue.ref('');
      var hubInstalling = Vue.ref(false);
      var hubInstallProgress = Vue.ref(0);

      // ---- 任务 Tab 新增 ----
      var taskSearchQuery = Vue.ref('');
      var taskStatusFilter = Vue.ref('all');
      var newTaskDialogVisible = Vue.ref(false);
      var newTaskTitle = Vue.ref('');

      // ---- 产物 Tab 新增 ----
      var artifactSearchQuery = Vue.ref('');
      var artifactTypeFilter = Vue.ref('all');
      var artifactTaskFilter = Vue.ref('all');
      var artifactPreviewVisible = Vue.ref(false);
      var artifactPreviewItem = Vue.ref(null);

      // ---- 资料 Tab 新增 ----
      var materialFileInput = Vue.ref(null);
      var materialTypeFilter = Vue.ref('all');
      var materialSearchQuery = Vue.ref('');
      var materialPreviewVisible = Vue.ref(false);
      var materialPreviewItem = Vue.ref(null);
      var workspaceCurrentFolderId = Vue.ref(null);
      var workspaceFolderDialogVisible = Vue.ref(false);
      var workspaceFolderDialogMode = Vue.ref('create');
      var workspaceEditingItem = Vue.ref(null);
      var workspaceFolderName = Vue.ref('');
      var workspaceDragItem = Vue.ref(null);
      var workspaceRootDragOver = Vue.ref(false);
      var MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

      // ---- 记忆 Tab 新增 ----
      var memoryCategoryFilter = Vue.ref('all');
      var memorySourceFilter = Vue.ref('all');
      var memorySearchQuery = Vue.ref('');
      var memoryCategoryInput = Vue.ref('other');
      var memoryDialogVisible = Vue.ref(false);
      var memoryDialogMode = Vue.ref('create');
      var editingMemoryId = Vue.ref('');
      var memoryForm = Vue.ref({ content: '', category: 'other' });
      var memorySubTab = Vue.ref('memory');

      // ---- 人设 Tab 新增 ----
      var personaPreviewTab = Vue.ref('coreDutyMd');
      var personaImportInput = Vue.ref(null);

      var detailMeta = Vue.ref({ skillsDetail: [], skillsCatalog: [], toolsDetail: {}, toolsCatalog: [], memoryMeta: {}, gateway: {} });
      var skillPickerVisible = Vue.ref(false);
      var skillPickerSearch = Vue.ref('');
      var skillPickerSelection = Vue.ref([]);
      var toolPickerVisible = Vue.ref(false);
      var toolPickerSearch = Vue.ref('');
      var toolPickerSelection = Vue.ref([]);
      var capabilitySaving = Vue.ref(false);
      var capabilitiesLoading = Vue.ref(false);
      var messagingSearchQuery = Vue.ref('');
      var selectedImChannelId = Vue.ref('');
      var imSecretDraft = Vue.ref({});
      var imPolicyDraft = Vue.ref({});
      var imGatewayEnabled = Vue.ref(false);
      var imSaving = Vue.ref(false);
      var imRestarting = Vue.ref(false);
      var imConflictProfile = Vue.ref('');
      var imPolicyCollapse = Vue.ref([]);

      var isDevMock = Vue.computed(function () { return store.isDevMock(); });

      function goAssignTask() {
        if (!expert.value) return;
        var task = store.createTask({ expertId: expert.value.id, title: '新任务', type: 'dialogue' });
        ctx.emit('nav', '/experts/' + expert.value.id + '/tasks/' + task.id);
      }

      var loadSeq = 0;

      function normalizePersonaForEditor(raw) {
        var p = raw || {};
        if (p.soulMd !== undefined) return { soulMd: p.soulMd || '' };
        var sections = [];
        if (p.coreDutyMd && String(p.coreDutyMd).trim()) sections.push(String(p.coreDutyMd).trim());
        if (p.workflowMd && String(p.workflowMd).trim()) sections.push(String(p.workflowMd).trim());
        if (p.behaviorMd && String(p.behaviorMd).trim()) sections.push(String(p.behaviorMd).trim());
        return { soulMd: sections.join('\n\n') };
      }

      function applyBaseLocalState() {
        var eid = String(props.expertId);
        expert.value = store.getExpert(eid);
        if (!expert.value) return false;
        var p = store.getPersona(eid);
        persona.value = normalizePersonaForEditor(p);
        personaOnboardDismissed.value = !!(p && p.onboarded);
        tasks.value = store.getTasksByExpert(eid);
        memories.value = store.getMemories(eid);
        materials.value = store.getWorkspaceFiles(eid);
        expertArtifacts.value = store.getExpertArtifacts(eid);
        runningSessionCount.value = store.getRunningSessionCount(eid);
        workspaceRootPath.value = store.getWorkspaceRoot(eid);
        memoryMdContent.value = store.getMemoryMd(eid);
        userMdContent.value = store.getUserMd(eid);
        var localChannels = store.getImChannels(eid);
        imChannels.value = normalizeImChannels(localChannels.length ? localChannels : (store.isDevMock() ? catalog.IM_CHANNEL_TYPES : []));
        return true;
      }

      function applyCapabilityState() {
        var eid = String(props.expertId);
        skillBindings.value = store.getSkillBindings(eid).slice();
        toolBindings.value = store.getToolBindings(eid).slice();
        detailMeta.value = store.getExpertDetailMeta(eid);
        imGatewayEnabled.value = !!(detailMeta.value.gateway && detailMeta.value.gateway.enabled);
        ensureImChannelSelected();
      }

      function applyLocalState() {
        if (!applyBaseLocalState()) return;
        applyCapabilityState();
      }

      function imCatalogMap() {
        var map = {};
        (catalog.IM_CHANNEL_TYPES || []).forEach(function (c) {
          map[String(c.id || c.type)] = c;
        });
        return map;
      }

      function makeImCatalogChannel(c) {
        return Object.assign({
          type: c.id || c.type,
          id: c.id || c.type,
          label: c.label || c.name,
          name: c.name || c.label,
          emoji: c.emoji || '',
          enabled: false,
          configured: false,
          state: 'disabled',
          config: '',
          subscriptions: [],
          policy: {},
          policyFields: []
        }, c);
      }

      function mergeImChannelWithCatalog(channel, template) {
        var out = Object.assign({ subscriptions: [], policy: {} }, template ? makeImCatalogChannel(template) : {}, channel);
        if (template) {
          out.type = template.id || template.type || out.type;
          out.id = template.id || template.type || out.id;
          out.label = template.label || template.name || out.label;
          out.name = template.name || template.label || out.name;
          out.emoji = template.emoji || out.emoji || '';
          out.description = template.description || out.description;
          out.docsUrl = template.docsUrl || out.docsUrl;
        }
        var templateFields = template && template.credentialFields ? template.credentialFields : null;
        if (templateFields && templateFields.length) {
          var oldFields = channel.credentialFields || [];
          out.credentialFields = templateFields.map(function (field) {
            var old = oldFields.find(function (f) { return f.key === field.key; });
            return Object.assign({}, field, {
              configured: !!(old && old.configured)
            });
          });
        } else if (!out.credentialFields || !out.credentialFields.length) {
          var pid = String(out.id || out.type || 'demo');
          out.credentialFields = [{
            key: pid.toUpperCase() + '_TOKEN',
            label: 'Access Token',
            description: '演示模式凭证字段',
            password: true,
            required: true,
            configured: !!out.configured
          }];
        }
        var templatePolicy = template && template.policyFields ? template.policyFields : null;
        if (templatePolicy && templatePolicy.length) {
          var savedPolicy = channel.policy || {};
          out.policyFields = templatePolicy.map(function (field) {
            var savedVal = savedPolicy[field.key];
            return Object.assign({}, field, {
              value: savedVal !== undefined && savedVal !== null && savedVal !== '' ? savedVal : (field.default !== undefined ? field.default : '')
            });
          });
        } else {
          out.policyFields = [];
        }
        return out;
      }

      function normalizeImChannels(channels) {
        var map = imCatalogMap();
        var order = {};
        (catalog.IM_CHANNEL_TYPES || []).forEach(function (c, index) {
          order[String(c.id || c.type)] = index;
        });
        var seen = {};
        var normalized = (channels || []).map(function (c) {
          var pid = String(c.id || c.type);
          seen[pid] = true;
          return mergeImChannelWithCatalog(c, map[pid]);
        });
        (catalog.IM_CHANNEL_TYPES || []).forEach(function (c) {
          var pid = String(c.id || c.type);
          if (!seen[pid]) normalized.push(makeImCatalogChannel(c));
        });
        return normalized.sort(function (a, b) {
          var ai = order[String(a.id || a.type)];
          var bi = order[String(b.id || b.type)];
          if (ai === undefined) ai = 999;
          if (bi === undefined) bi = 999;
          return ai - bi;
        });
      }

      function ensureImChannelSelected() {
        if (!imChannels.value.length) {
          selectedImChannelId.value = '';
          return;
        }
        var current = String(selectedImChannelId.value || '');
        var exists = imChannels.value.some(function (c) {
          return String(c.id || c.type) === current;
        });
        if (!exists) {
          selectedImChannelId.value = String(imChannels.value[0].id || imChannels.value[0].type);
        }
      }

      function selectImChannel(ch) {
        selectedImChannelId.value = String(ch.id || ch.type);
        imSecretDraft.value = {};
        imPolicyDraft.value = {};
        imConflictProfile.value = '';
        imPolicyCollapse.value = [];
      }

      function load() {
        var seq = ++loadSeq;
        var eid = String(props.expertId);
        if (!applyBaseLocalState()) return;
        if (store.isDevMock()) {
          applyCapabilityState();
          return;
        }
        skillBindings.value = [];
        toolBindings.value = [];
        capabilitiesLoading.value = true;
        if (store.fetchExpertDetailRemote) {
          store.fetchExpertDetailRemote(eid).then(function () {
            if (seq !== loadSeq) return;
            applyCapabilityState();
          }).finally(function () {
            if (seq === loadSeq) capabilitiesLoading.value = false;
          });
        } else {
          capabilitiesLoading.value = false;
        }
      }

      function savePersona() {
        store.savePersona(props.expertId, { soulMd: persona.value.soulMd || '' });
        var count = runningSessionCount.value;
        var msg;
        if (personaApplyImmediate.value && count > 0) {
          msg = '人设已保存并立即生效。已有 ' + count + ' 个运行中会话已刷新缓存。';
          ElementPlus.ElMessageBox.confirm(
            '立即生效将刷新当前 ' + count + ' 个运行中会话的 prompt 缓存，可能导致会话中断。确定继续？',
            '确认立即生效',
            { confirmButtonText: '确认立即生效', cancelButtonText: '取消', type: 'warning' }
          ).then(function () {
            ElementPlus.ElMessage.success(msg);
          }).catch(function () {
            ElementPlus.ElMessage.success('人设已保存。修改将在新会话生效。');
          });
        } else if (count > 0) {
          msg = '已保存。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        } else {
          msg = '已保存。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }
        personaApplyImmediate.value = false;
      }

      function dismissPersonaOnboard() {
        personaOnboardDismissed.value = true;
        store.setPersonaOnboarded(props.expertId, true);
      }
      function fillPersonaFromTemplate() {
        persona.value.soulMd = window.SOUL_MD_TEMPLATE || '## 核心职责\n\n（描述该专家的核心职责与目标）\n\n## 工作流程\n\n1. \n2. \n3. \n\n## 行为准则\n\n- \n';
        personaOnboardDismissed.value = true;
        store.setPersonaOnboarded(props.expertId, true);
      }
      function importPersonaSoulMd() {
        if (personaImportInput.value) personaImportInput.value.click();
      }

      function goToRunningTasks() {
        activeTab.value = 'tasks';
        taskStatusFilter.value = 'running';
      }

      function openWorkspaceRootDialog() {
        workspaceRootInput.value = workspaceRootPath.value;
        workspaceRootDialogVisible.value = true;
      }
      function submitWorkspaceRootChange() {
        var newPath = workspaceRootInput.value.trim();
        if (!newPath) {
          ElementPlus.ElMessage.warning('请输入新的工作空间路径');
          return;
        }
        ElementPlus.ElMessageBox.confirm(
          '更改工作空间根路径可能导致已有文件引用失效，确定继续？',
          '确认更改路径',
          { confirmButtonText: '确认更改', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          store.updateWorkspaceRoot(props.expertId, newPath);
          workspaceRootPath.value = newPath;
          workspaceRootDialogVisible.value = false;
          ElementPlus.ElMessage.success('工作空间路径已更新');
        }).catch(function () {});
      }

      function getTaskCwdLabel(task) {
        if (!task.cwd) return '.';
        return task.cwd;
      }
      function goToWorkspaceFromTask(task) {
        if (task.cwd) highlightSessionId.value = task.cwd;
        activeTab.value = 'workspace';
      }

      function openHubInstallDialog() {
        hubInstallSearch.value = '';
        hubInstallDialogVisible.value = true;
      }
      var hubSkillOptions = Vue.computed(function () {
        var q = hubInstallSearch.value.trim().toLowerCase();
        var assigned = {};
        skillBindings.value.forEach(function (s) { assigned[s.skillId] = true; });
        return (window.SKILLS_HUB_CATALOG || []).filter(function (s) {
          if (assigned[s.id]) return false;
          if (!q) return true;
          return (s.name || '').toLowerCase().indexOf(q) >= 0 || (s.description || '').toLowerCase().indexOf(q) >= 0 || (s.category || '').toLowerCase().indexOf(q) >= 0;
        });
      });
      function installHubSkill(skill) {
        hubInstalling.value = true;
        hubInstallProgress.value = 0;
        var timer = setInterval(function () {
          hubInstallProgress.value += 20;
          if (hubInstallProgress.value >= 100) {
            clearInterval(timer);
            hubInstalling.value = false;
            var next = skillBindings.value.slice();
            next.push({ skillId: skill.id, enabled: true, params: {} });
            store.setSkillBindings(props.expertId, next);
            skillBindings.value = store.getSkillBindings(props.expertId).slice();
            hubInstallDialogVisible.value = false;
            var count = runningSessionCount.value;
            var msg = count > 0
              ? '已安装「' + skill.name + '」。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
              : '已安装「' + skill.name + '」。修改将在新会话生效。';
            ElementPlus.ElMessage.success(msg);
          }
        }, 400);
      }

      function removeSkillBindingDynamic(skillId, row) {
        var name = (row && row.name) || skillId;
        ElementPlus.ElMessageBox.confirm(
          '确定解绑技能「' + name + '」？',
          '解绑技能',
          { confirmButtonText: '解绑', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          skillBindings.value = skillBindings.value.filter(function (s) { return s.skillId !== skillId; });
          store.setSkillBindings(props.expertId, skillBindings.value);
          var count = runningSessionCount.value;
          var msg = count > 0
            ? '已解绑。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : '已解绑。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function () {});
      }

      function removeToolBindingDynamic(toolset, row) {
        var name = (row && row.label) || toolset;
        ElementPlus.ElMessageBox.confirm(
          '确定解绑工具「' + name + '」？',
          '解绑工具',
          { confirmButtonText: '解绑', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          toolBindings.value = toolBindings.value.filter(function (t) {
            return (t.toolset || t.toolId) !== toolset;
          });
          store.setToolBindings(props.expertId, toolBindings.value);
          var count = runningSessionCount.value;
          var msg = count > 0
            ? '已解绑。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : '已解绑。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function () {});
      }

      function unbindMcpServer(server) {
        ElementPlus.ElMessageBox.confirm(
          '确定解绑 MCP 服务器「' + (server.name || server.id) + '」？',
          '解绑 MCP',
          { confirmButtonText: '解绑', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          var count = runningSessionCount.value;
          var msg = count > 0
            ? '已解绑。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : '已解绑。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function () {});
      }

      function saveSkillBindings() { store.setSkillBindings(props.expertId, skillBindings.value); ElementPlus.ElMessage.success('技能已更新'); }
      function saveToolBindings() { store.setToolBindings(props.expertId, toolBindings.value); ElementPlus.ElMessage.success('工具已更新'); }
      function addMemory() {
        if (!memoryInput.value.trim()) return;
        store.addMemory(props.expertId, memoryInput.value.trim());
        memoryInput.value = '';
        memories.value = store.getMemories(props.expertId);
      }
      function removeMemory(id) { store.deleteMemory(id, props.expertId); memories.value = store.getMemories(props.expertId); }
      function saveIm() { saveSelectedImChannel(); }

      function applyImChannelsResponse(res) {
        if (!res) return;
        if (res.channels) {
          imChannels.value = normalizeImChannels(res.channels);
        }
        if (res.gatewayEnabled !== undefined) {
          imGatewayEnabled.value = !!res.gatewayEnabled;
          detailMeta.value = Object.assign({}, detailMeta.value, {
            gateway: Object.assign({}, detailMeta.value.gateway || {}, {
              enabled: !!res.gatewayEnabled,
              running: res.running !== undefined ? !!res.running : (detailMeta.value.gateway || {}).running
            })
          });
        }
        // 重新计算每个渠道的连接状态
        imChannels.value.forEach(function (c) {
          c.state = imConnectionStatus(c);
        });
        store.saveImChannels(props.expertId, imChannels.value, {
          gatewayEnabled: res.gatewayEnabled,
          skipRemote: true
        });
        ensureImChannelSelected();
      }

      function saveGatewayEnabled() {
        var payload = {
          gatewayEnabled: imGatewayEnabled.value,
          channels: imChannels.value.map(function (c) {
            return {
              type: c.type || c.id,
              id: c.id || c.type,
              enabled: !!c.enabled
            };
          })
        };
        if (store.isDevMock()) {
          store.saveImChannels(props.expertId, imChannels.value, { gatewayEnabled: imGatewayEnabled.value });
          ElementPlus.ElMessage.success('消息网关设置已保存');
          return;
        }
        if (!window.SidecarApi || !window.SidecarApi.putImChannels) return;
        imSaving.value = true;
        window.SidecarApi.putImChannels(String(props.expertId), payload).then(function (res) {
          imSaving.value = false;
          applyImChannelsResponse(res);
          ElementPlus.ElMessage.success('消息网关设置已保存');
        }).catch(function () {
          imSaving.value = false;
          ElementPlus.ElMessage.error('消息网关保存失败');
        });
      }

      function getImDraftValue(key) {
        return String((imSecretDraft.value && imSecretDraft.value[key]) || '').trim();
      }

      function hasImFieldValue(field, secrets) {
        if (!field) return false;
        return !!(field.configured || (secrets && secrets[field.key]) || getImDraftValue(field.key));
      }

      function validateSelectedImChannel(ch, secrets) {
        var fields = ch.credentialFields || [];
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (field.required && !hasImFieldValue(field, secrets)) {
            ElementPlus.ElMessage.warning('请填写必填凭证：' + (field.label || field.key));
            return false;
          }
        }
        var channelId = String(ch.id || ch.type || '').toLowerCase();
        if (channelId === 'feishu') {
          var mode = (secrets.FEISHU_CONNECTION_MODE || getImDraftValue('FEISHU_CONNECTION_MODE') || 'websocket').toLowerCase();
          if (mode === 'webhook') {
            var tokenField = fields.find(function (f) { return f.key === 'FEISHU_VERIFICATION_TOKEN'; });
            var encryptField = fields.find(function (f) { return f.key === 'FEISHU_ENCRYPT_KEY'; });
            if (!hasImFieldValue(tokenField, secrets) && !hasImFieldValue(encryptField, secrets)) {
              ElementPlus.ElMessage.warning('飞书 Webhook 模式需配置 Verification Token 或 Encrypt Key');
              return false;
            }
          }
        }
        return true;
      }

      function applyLocalImSecretState(ch, secrets, policy) {
        var fields = ch.credentialFields || [];
        fields.forEach(function (field) {
          if (secrets[field.key]) field.configured = true;
        });
        ch.configured = fields.filter(function (field) { return field.required; }).every(function (field) {
          return !!field.configured;
        });
        if (policy) {
          ch.policy = Object.assign({}, ch.policy || {}, policy);
          (ch.policyFields || []).forEach(function (field) {
            var v = policy[field.key];
            field.value = v !== undefined && v !== null && v !== '' ? v : (field.default !== undefined ? field.default : '');
          });
        }
        ch.state = !ch.enabled ? 'disabled' : (ch.configured ? (imGatewayEnabled.value ? 'configured' : 'gateway_stopped') : 'not_configured');
      }

      function getImPolicyDraftValue(key) {
        return imPolicyDraft.value && imPolicyDraft.value[key] !== undefined
          ? imPolicyDraft.value[key]
          : '';
      }

      function collectImPolicy(ch) {
        var policy = {};
        (ch.policyFields || []).forEach(function (field) {
          var draftVal = getImPolicyDraftValue(field.key);
          var curVal = draftVal !== '' && draftVal !== undefined && draftVal !== null
            ? draftVal
            : (field.value !== undefined && field.value !== null && field.value !== '' ? field.value : field.default);
          if (field.type === 'switch') {
            policy[field.key] = curVal === true || curVal === 'true' || curVal === '1' ? 'true' : 'false';
          } else if (curVal !== undefined && curVal !== null && curVal !== '') {
            policy[field.key] = String(curVal).trim();
          }
        });
        return policy;
      }

      function saveSelectedImChannel() {
        var ch = selectedImChannel.value;
        if (!ch) return;
        var secrets = {};
        (ch.credentialFields || []).forEach(function (field) {
          var val = (imSecretDraft.value[field.key] || '').trim();
          if (val) secrets[field.key] = val;
        });
        if (!validateSelectedImChannel(ch, secrets)) return;
        var policy = collectImPolicy(ch);
        var activeId = String(ch.id || ch.type);
        var payload = {
          gatewayEnabled: imGatewayEnabled.value,
          channels: imChannels.value.map(function (c) {
            var cid = String(c.id || c.type);
            return {
              type: c.type || c.id,
              id: c.id || c.type,
              enabled: cid === activeId ? !!ch.enabled : !!c.enabled
            };
          }),
          secrets: secrets,
          policy: policy
        };
        imConflictProfile.value = '';
        if (store.isDevMock()) {
          // dev mock: 模拟凭据互斥校验（同一 bot_id/client_id/app_id 不能复用）
          var lockField = (window.IM_CHANNEL_LOCK_FIELDS || {})[activeId];
          if (lockField && secrets[lockField]) {
            var conflict = store.findImCredentialConflict && store.findImCredentialConflict(props.expertId, lockField, secrets[lockField]);
            if (conflict) {
              imConflictProfile.value = conflict.expertName || conflict.expertId;
              ElementPlus.ElMessage.error('该凭据（' + secrets[lockField] + '）正被 profile「' + imConflictProfile.value + '」使用，不能复用。');
              return;
            }
          }
          applyLocalImSecretState(ch, secrets, policy);
          store.saveImChannels(props.expertId, imChannels.value, { gatewayEnabled: imGatewayEnabled.value });
          imSecretDraft.value = {};
          imPolicyDraft.value = {};
          ElementPlus.ElMessage.success('配置已保存。需重启 gateway 生效。');
          return;
        }
        if (!window.SidecarApi || !window.SidecarApi.putImChannels) return;
        imSaving.value = true;
        window.SidecarApi.putImChannels(String(props.expertId), payload).then(function (res) {
          imSaving.value = false;
          applyImChannelsResponse(res);
          imSecretDraft.value = {};
          imPolicyDraft.value = {};
          ElementPlus.ElMessage.success('配置已保存。需重启 gateway 生效。');
        }).catch(function (err) {
          imSaving.value = false;
          var body = err && err.body;
          if (body && body.conflict_profile) {
            imConflictProfile.value = body.conflict_profile;
            ElementPlus.ElMessage.error('该凭据正被 profile「' + body.conflict_profile + '」使用，不能复用。请为当前专家单独创建机器人/应用。');
          } else {
            ElementPlus.ElMessage.error('保存失败');
          }
        });
      }
      function addMaterial() {
        if (!fileNameInput.value.trim()) return;
        store.addWorkspaceFile(props.expertId, fileNameInput.value.trim());
        fileNameInput.value = '';
        materials.value = store.getWorkspaceFiles(props.expertId);
      }

      // ---- 任务 Tab 方法 ----
      function isDialogueTask(task) {
        return !task || !task.type || task.type === 'dialogue';
      }

      function isTaskTerminalStatus(status) {
        return status === 'completed' || status === 'done' || status === 'archived' || status === 'failed';
      }

      function isTaskRunning(task) {
        return !!task && !task.archived && task.status === 'running';
      }

      function taskTabStatusLabel(task) {
        return isTaskRunning(task) ? '运行中' : '已就绪';
      }

      function taskTabStatusType(task) {
        return isTaskRunning(task) ? 'primary' : 'info';
      }

      var dialogueTasks = Vue.computed(function () {
        return tasks.value.filter(function (t) {
          if (!isDialogueTask(t)) return false;
          if (t.archived) return false;
          return !isTaskTerminalStatus(t.status);
        });
      });

      var filteredTasks = Vue.computed(function () {
        var list = dialogueTasks.value.slice();
        if (taskSearchQuery.value.trim()) {
          var q = taskSearchQuery.value.trim().toLowerCase();
          list = list.filter(function (t) {
            return (t.title || '').toLowerCase().indexOf(q) >= 0 ||
              String(t.id || '').toLowerCase().indexOf(q) >= 0;
          });
        }
        if (taskStatusFilter.value === 'running') {
          list = list.filter(function (t) { return isTaskRunning(t); });
        } else if (taskStatusFilter.value === 'ready') {
          list = list.filter(function (t) { return !isTaskRunning(t); });
        }
        list.sort(function (a, b) {
          return store.resolveTaskLastActivityAt(b).localeCompare(store.resolveTaskLastActivityAt(a));
        });
        return list;
      });

      var taskStats = Vue.computed(function () {
        var list = dialogueTasks.value;
        var counts = { total: list.length, running: 0, ready: 0 };
        list.forEach(function (t) {
          if (isTaskRunning(t)) counts.running++;
          else counts.ready++;
        });
        return counts;
      });

      var taskListEmpty = Vue.computed(function () {
        return !filteredTasks.value.length;
      });

      function openNewTaskDialog() {
        newTaskTitle.value = '';
        newTaskDialogVisible.value = true;
      }

      function submitNewTask() {
        if (!newTaskTitle.value.trim()) return;
        var title = newTaskTitle.value.trim();
        if (!store.isDevMock() && store.createTaskRemote) {
          store.createTaskRemote(props.expertId, title).then(function (task) {
            if (!task) {
              ElementPlus.ElMessage.error('任务创建失败');
              return;
            }
            newTaskDialogVisible.value = false;
            tasks.value = store.getTasksByExpert(props.expertId);
            ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + task.id);
          });
          return;
        }
        var task = store.createTask({ expertId: props.expertId, title: title, type: 'dialogue' });
        newTaskDialogVisible.value = false;
        tasks.value = store.getTasksByExpert(props.expertId);
        ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + task.id);
      }

      function editTaskTitle(task) {
        ElementPlus.ElMessageBox.prompt('请输入任务名称', '编辑任务', {
          confirmButtonText: '确定', cancelButtonText: '取消',
          inputValue: task.title, inputPattern: /\S+/, inputErrorMessage: '名称不能为空',
          appendTo: document.body
        }).then(function (result) {
          var title = (result && result.value ? result.value : '').trim();
          if (!title) return;
          function afterUpdated() {
            tasks.value = store.getTasksByExpert(props.expertId);
            ElementPlus.ElMessage.success('任务名称已更新');
          }
          if (!store.isDevMock() && store.updateTaskRemote) {
            store.updateTaskRemote(props.expertId, task.id, { title: title, titleSet: true }).then(function (ok) {
              if (!ok) {
                ElementPlus.ElMessage.error('任务名称更新失败');
                return;
              }
              afterUpdated();
            });
            return;
          }
          store.updateTask(task.id, { title: title, titleSet: true });
          afterUpdated();
        }).catch(function () {});
      }

      function formatDateTimeToSeconds(isoStr) {
        if (!isoStr) return '-';
        var s = String(isoStr).trim();
        var m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
        if (m) return m[1] + ' ' + m[2];
        return s.split('.')[0].replace('T', ' ').replace(/Z$/i, '').replace(/[+-]\d{2}:\d{2}$/, '');
      }

      function taskLastActivityLabel(task) {
        if (!task) return '-';
        return formatDateTimeToSeconds(store.resolveTaskLastActivityAt(task));
      }

      function archiveTaskItem(task) {
        store.archiveTask(task.id, true);
        tasks.value = store.getTasksByExpert(props.expertId);
        ElementPlus.ElMessage.success('任务已归档');
      }

      function deleteTaskItem(task) {
        ElementPlus.ElMessageBox.confirm(
          '确定删除该任务？相关对话与产物将一并删除。', '删除任务',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          function afterDeleted() {
            tasks.value = store.getTasksByExpert(props.expertId);
            ElementPlus.ElMessage.success('任务已删除');
          }
          if (!store.isDevMock() && store.deleteTaskRemote) {
            store.deleteTaskRemote(props.expertId, task.id).then(function (ok) {
              if (!ok) {
                ElementPlus.ElMessage.error('任务删除失败');
                return;
              }
              afterDeleted();
            });
            return;
          }
          store.deleteTask(task.id);
          afterDeleted();
        }).catch(function () {});
      }

      // ---- 产物 Tab 方法 ----
      var filteredArtifacts = Vue.computed(function () {
        var list = expertArtifacts.value;
        if (artifactSearchQuery.value.trim()) {
          var q = artifactSearchQuery.value.trim().toLowerCase();
          list = list.filter(function (a) { return (a.title || '').toLowerCase().indexOf(q) >= 0; });
        }
        if (artifactTypeFilter.value !== 'all') {
          list = list.filter(function (a) { return a.type === artifactTypeFilter.value; });
        }
        if (artifactTaskFilter.value !== 'all') {
          list = list.filter(function (a) { return a.taskId === artifactTaskFilter.value; });
        }
        return list;
      });

      var artifactStats = Vue.computed(function () {
        var counts = { total: expertArtifacts.value.length, report: 0, data: 0, document: 0 };
        expertArtifacts.value.forEach(function (a) {
          if (a.type === 'report') counts.report++;
          else if (a.type === 'data') counts.data++;
          else counts.document++;
        });
        return counts;
      });

      function openArtifactPreview(item) {
        artifactPreviewItem.value = item;
        artifactPreviewVisible.value = true;
      }

      function downloadArtifact(item) {
        var blob = new Blob([item.content || item.title], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (item.title || '产物') + '.txt';
        a.click();
        URL.revokeObjectURL(url);
      }

      function goToArtifactTask(taskId) {
        if (!taskId) return;
        ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + taskId);
      }

      // ---- 资料 Tab 方法 ----
      var filteredMaterials = Vue.computed(function () {
        var list = materials.value;
        if (materialSearchQuery.value.trim()) {
          var q = materialSearchQuery.value.trim().toLowerCase();
          list = list.filter(function (f) { return (f.name || '').toLowerCase().indexOf(q) >= 0; });
        }
        if (materialTypeFilter.value !== 'all') {
          list = list.filter(function (f) { return f.type === materialTypeFilter.value; });
        }
        return list;
      });

      var workspaceFolders = Vue.computed(function () {
        return materials.value.filter(function (f) { return f.kind === 'folder'; });
      });

      var workspaceCurrentFolder = Vue.computed(function () {
        if (!workspaceCurrentFolderId.value) return null;
        return workspaceFolders.value.find(function (f) { return String(f.id) === String(workspaceCurrentFolderId.value); }) || null;
      });

      var workspaceBreadcrumbs = Vue.computed(function () {
        var crumbs = [{ id: null, name: 'workspace' }];
        var map = {};
        workspaceFolders.value.forEach(function (f) { map[String(f.id)] = f; });
        var stack = [];
        var cursor = workspaceCurrentFolder.value;
        var guard = 0;
        while (cursor && guard < 20) {
          stack.unshift(cursor);
          cursor = cursor.parentId ? map[String(cursor.parentId)] : null;
          guard += 1;
        }
        stack.forEach(function (f) { crumbs.push({ id: f.id, name: f.name }); });
        return crumbs;
      });

      var workspaceFiles = Vue.computed(function () {
        var currentParent = workspaceCurrentFolderId.value ? String(workspaceCurrentFolderId.value) : null;
        var rows = [];
        materials.value.forEach(function (f) {
          var parentId = f.parentId ? String(f.parentId) : null;
          if (parentId !== currentParent) return;
          rows.push({
            id: f.id,
            source: 'upload',
            raw: f,
            name: f.name,
            kind: f.kind || 'material',
            type: f.type || (f.kind === 'folder' ? 'folder' : 'document'),
            parentId: parentId,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt || f.createdAt,
            updatedBy: f.updatedBy || '我',
            size: f.size || 0,
            content: f.content || ''
          });
        });
        if (!currentParent) {
          expertArtifacts.value.forEach(function (a) {
            rows.push({
              id: 'artifact-' + a.id,
              source: 'generated',
              raw: a,
              name: a.title || '未命名文件',
              kind: 'artifact',
              type: a.type || 'document',
              parentId: null,
              createdAt: a.createdAt,
              updatedAt: a.updatedAt || a.createdAt,
              updatedBy: a.updatedBy || '任务生成',
              taskId: a.taskId,
              taskTitle: a.taskTitle || '',
              content: a.content || ''
            });
          });
        }
        return rows.sort(function (a, b) {
          if ((a.kind === 'folder') !== (b.kind === 'folder')) return a.kind === 'folder' ? -1 : 1;
          if (a.kind === 'folder') return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN');
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
      });

      var workspaceStats = Vue.computed(function () {
        var folders = workspaceFiles.value.filter(function (f) { return f.kind === 'folder'; }).length;
        var files = workspaceFiles.value.length - folders;
        return folders + ' 个文件夹 · ' + files + ' 个文件';
      });

      var workspacePathLabel = Vue.computed(function () {
        return workspaceBreadcrumbs.value.map(function (c) { return c.name; }).join(' / ');
      });

      function workspaceFileTypeClass(file) {
        return 'type-' + ((file && file.type) || 'document');
      }

      function workspaceFileIcon(file) {
        if (file && file.kind === 'folder') return '📁';
        return fileTypeIcon(file && file.type);
      }

      function workspaceFileMeta(file) {
        if (!file) return '';
        if (file.kind === 'folder') return workspaceFolderChildCount(file.raw) + ' 项 · ' + (file.createdAt || '');
        var parts = [];
        if (file.taskTitle) parts.push('来自任务：' + file.taskTitle);
        if (file.size) parts.push(formatFileSize(file.size));
        if (file.createdAt) parts.push(file.createdAt);
        return parts.join(' · ');
      }

      function workspaceTypeLabel(file) {
        if (!file) return '—';
        if (file.kind === 'folder') return '文件夹';
        var name = String(file.name || '');
        var match = name.match(/\.([a-z0-9]+)$/i);
        if (match && match[1]) return match[1].toLowerCase();
        var typeMap = { spreadsheet: 'xlsx', document: 'docx', data: 'json', report: 'pdf' };
        return typeMap[file.type] || '文件';
      }

      function workspaceUpdatedAt(file) {
        return (file && (file.updatedAt || file.createdAt)) || '—';
      }

      function workspaceSourceLabel(file) {
        return file && file.source === 'generated' ? '任务' : '用户';
      }

      function workspaceSizeLabel(file) {
        if (!file) return '—';
        if (file.kind === 'folder') return '-';
        if (file.size) return formatFileSize(file.size);
        if (file.content) return formatFileSize(new Blob([file.content]).size);
        return '—';
      }

      function workspaceFolderChildCount(folder) {
        if (!folder) return 0;
        return materials.value.filter(function (f) { return String(f.parentId || '') === String(folder.id); }).length;
      }

      function openWorkspaceFolder(file) {
        if (!file || file.kind !== 'folder') return;
        workspaceCurrentFolderId.value = file.raw.id;
      }

      function openWorkspaceBreadcrumb(crumb) {
        workspaceCurrentFolderId.value = crumb && crumb.id ? crumb.id : null;
      }

      function workspaceBreadcrumbDropTarget(crumb) {
        if (!crumb || !crumb.id) return null;
        var folder = materials.value.find(function (f) {
          return String(f.id) === String(crumb.id) && f.kind === 'folder';
        });
        if (!folder) return null;
        return {
          id: folder.id,
          source: 'upload',
          raw: folder,
          name: folder.name,
          kind: 'folder',
          type: 'folder',
          parentId: folder.parentId || null
        };
      }

      function canDropWorkspaceBreadcrumb(crumb) {
        return canDropWorkspaceItem(workspaceBreadcrumbDropTarget(crumb));
      }

      function workspaceBreadcrumbClass(index, crumb) {
        return {
          active: index === workspaceBreadcrumbs.value.length - 1,
          'is-drop-target': canDropWorkspaceBreadcrumb(crumb)
        };
      }

      function onWorkspaceBreadcrumbDrop(crumb) {
        onWorkspaceDrop(workspaceBreadcrumbDropTarget(crumb));
      }

      function openWorkspaceFilePreview(file) {
        if (!file) return;
        if (file.kind === 'folder') return openWorkspaceFolder(file);
        if (file.source === 'generated') openArtifactPreview(file.raw);
        else openMaterialPreview(file.raw);
      }

      function downloadWorkspaceFile(file) {
        if (!file || file.kind === 'folder') return;
        if (file.source === 'generated') downloadArtifact(file.raw);
        else downloadMaterial(file.raw);
      }

      function deleteWorkspaceFile(file) {
        if (!file || file.source !== 'upload') return;
        deleteMaterial(file.raw);
      }

      function openCreateWorkspaceFolderDialog() {
        workspaceFolderDialogMode.value = 'create';
        workspaceEditingItem.value = null;
        workspaceFolderName.value = '';
        workspaceFolderDialogVisible.value = true;
      }

      function openRenameWorkspaceItem(file) {
        if (!file || file.source !== 'upload') return;
        workspaceFolderDialogMode.value = 'rename';
        workspaceEditingItem.value = file;
        workspaceFolderName.value = file.name || '';
        workspaceFolderDialogVisible.value = true;
      }

      function submitWorkspaceFolderDialog() {
        var name = workspaceFolderName.value.trim();
        if (!name) { ElementPlus.ElMessage.warning('请输入名称'); return; }
        if (/[\\/:*?"<>|]/.test(name)) { ElementPlus.ElMessage.warning('名称不能包含特殊字符'); return; }
        var parentId = workspaceFolderDialogMode.value === 'rename' && workspaceEditingItem.value ? workspaceEditingItem.value.parentId : (workspaceCurrentFolderId.value || null);
        var duplicate = materials.value.some(function (f) {
          if (workspaceFolderDialogMode.value === 'rename' && workspaceEditingItem.value && String(f.id) === String(workspaceEditingItem.value.raw.id)) return false;
          return String(f.parentId || '') === String(parentId || '') && (f.name || '').trim() === name;
        });
        if (duplicate) { ElementPlus.ElMessage.warning('当前目录下已存在同名项目'); return; }
        if (workspaceFolderDialogMode.value === 'rename' && workspaceEditingItem.value) {
          store.renameWorkspaceItem(props.expertId, workspaceEditingItem.value.raw.id, name);
          ElementPlus.ElMessage.success('已重命名');
        } else {
          store.addWorkspaceFolder(props.expertId, { name: name, parentId: workspaceCurrentFolderId.value || null });
          ElementPlus.ElMessage.success('文件夹已创建');
        }
        workspaceFolderDialogVisible.value = false;
        materials.value = store.getWorkspaceFiles(props.expertId);
      }

      function deleteWorkspaceFolder(file) {
        if (!file || file.kind !== 'folder') return;
        ElementPlus.ElMessageBox.confirm(
          '确定删除文件夹「' + file.name + '」？仅空文件夹可删除。', '删除文件夹',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          var ok = store.deleteWorkspaceFolder(props.expertId, file.raw.id);
          if (!ok) { ElementPlus.ElMessage.warning('请先移除文件夹内的内容'); return; }
          materials.value = store.getWorkspaceFiles(props.expertId);
          ElementPlus.ElMessage.success('文件夹已删除');
        }).catch(function () {});
      }

      function handleWorkspaceItemCommand(command, file) {
        if (!file) return;
        if (command === 'open') openWorkspaceFilePreview(file);
        if (command === 'preview') openWorkspaceFilePreview(file);
        if (command === 'download') downloadWorkspaceFile(file);
        if (command === 'task') goToArtifactTask(file.taskId);
        if (command === 'rename' && file.source === 'upload') openRenameWorkspaceItem(file);
        if (command === 'delete' && file.source === 'upload') {
          if (file.kind === 'folder') deleteWorkspaceFolder(file);
          else deleteWorkspaceFile(file);
        }
      }

      function onWorkspaceDragStart(file, ev) {
        if (!file || file.source !== 'upload') return;
        workspaceDragItem.value = file;
        if (ev && ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = 'move';
          ev.dataTransfer.setData('text/plain', file.raw.id);
        }
      }

      function onWorkspaceDragEnd() {
        workspaceDragItem.value = null;
        workspaceRootDragOver.value = false;
      }

      function canDropWorkspaceItem(target) {
        var drag = workspaceDragItem.value;
        if (!drag) return false;
        if (target && target.kind !== 'folder') return false;
        var targetId = target ? target.raw.id : null;
        if (String(drag.raw.id) === String(targetId)) return false;
        if (String(drag.parentId || '') === String(targetId || '')) return false;
        if (drag.kind === 'folder' && targetId) {
          var cursor = target.raw;
          var guard = 0;
          while (cursor && guard < 20) {
            if (String(cursor.id) === String(drag.raw.id)) return false;
            cursor = cursor.parentId ? materials.value.find(function (f) { return String(f.id) === String(cursor.parentId); }) : null;
            guard += 1;
          }
        }
        return true;
      }

      function onWorkspaceDrop(target) {
        if (!canDropWorkspaceItem(target)) { workspaceRootDragOver.value = false; return; }
        var drag = workspaceDragItem.value;
        var targetId = target ? target.raw.id : null;
        var ok = store.moveWorkspaceItem(props.expertId, drag.raw.id, targetId);
        workspaceDragItem.value = null;
        workspaceRootDragOver.value = false;
        if (ok) {
          materials.value = store.getWorkspaceFiles(props.expertId);
          ElementPlus.ElMessage.success('已移动到 ' + (target ? target.name : 'workspace'));
        }
      }

      function openMaterialUpload() {
        if (materialFileInput.value) materialFileInput.value.click();
      }

      function handleMaterialFileSelect(e) {
        var fileList = e.target.files;
        if (!fileList || !fileList.length) return;
        var queue = [];
        for (var i = 0; i < fileList.length; i++) {
          var file = fileList[i];
          if (file.size > MAX_UPLOAD_FILE_SIZE) {
            ElementPlus.ElMessage.warning('「' + file.name + '」超过 10MB，已跳过');
            continue;
          }
          queue.push(file);
        }
        e.target.value = '';
        if (!queue.length) return;
        var done = 0;
        var AppShared = window.AppShared;
        queue.forEach(function (file) {
          AppShared.readUploadedFileContent(file, function (content) {
            store.addWorkspaceFile(props.expertId, {
              name: file.name,
              type: AppShared.inferProjectFileType(file.name),
              size: file.size,
              content: content,
              parentId: workspaceCurrentFolderId.value || null
            });
            done += 1;
            if (done === queue.length) {
              materials.value = store.getWorkspaceFiles(props.expertId);
              ElementPlus.ElMessage.success('已上传 ' + queue.length + ' 个文件');
            }
          });
        });
      }

      function openMaterialPreview(item) {
        materialPreviewItem.value = item;
        materialPreviewVisible.value = true;
      }

      function downloadMaterial(item) {
        var blob = new Blob([item.content || ''], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = item.name || '资料.txt';
        a.click();
        URL.revokeObjectURL(url);
      }

      function deleteMaterial(item) {
        ElementPlus.ElMessageBox.confirm(
          '确定删除文件「' + item.name + '」？', '删除文件',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          store.deleteWorkspaceFile(props.expertId, item.id);
          materials.value = store.getWorkspaceFiles(props.expertId);
          ElementPlus.ElMessage.success('文件已删除');
        }).catch(function () {});
      }

      function fileTypeIcon(type) {
        if (type === 'spreadsheet') return '📊';
        if (type === 'data') return '📁';
        return '📄';
      }

      function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      }

      function isMemoryNoise(m) {
        var c = (m.content || '').trim();
        if (!c || c === '# Memory' || c === 'Memory') return true;
        if (c.length < 3) return true;
        return false;
      }

      // ---- 记忆 Tab 方法 ----
      var filteredMemories = Vue.computed(function () {
        var list = memories.value.filter(function (m) { return !isMemoryNoise(m); });
        if (memorySearchQuery.value.trim()) {
          var q = memorySearchQuery.value.trim().toLowerCase();
          list = list.filter(function (m) { return (m.content || '').toLowerCase().indexOf(q) >= 0; });
        }
        if (memoryCategoryFilter.value !== 'all') {
          list = list.filter(function (m) { return m.category === memoryCategoryFilter.value; });
        }
        if (memorySourceFilter.value !== 'all') {
          list = list.filter(function (m) { return m.source === memorySourceFilter.value; });
        }
        return list;
      });

      var memoryStats = Vue.computed(function () {
        var counts = { total: memories.value.length, manual: 0, auto: 0 };
        memories.value.forEach(function (m) {
          if (m.source === 'auto') counts.auto++;
          else counts.manual++;
        });
        return counts;
      });

      var MEMORY_CATEGORY_LABELS = {
        user_preference: '用户偏好',
        project_context: '项目背景',
        domain_knowledge: '领域知识',
        other: '其他'
      };

      var MEMORY_CATEGORY_ICONS = {
        user_preference: '📌',
        project_context: '📋',
        domain_knowledge: '🧠',
        other: '💬'
      };

      function openCreateMemoryDialog() {
        memoryDialogMode.value = 'create';
        editingMemoryId.value = '';
        memoryForm.value = { content: '', category: memoryCategoryInput.value || 'other' };
        memoryDialogVisible.value = true;
      }

      function openEditMemoryDialog(memory) {
        if (!memory) return;
        memoryDialogMode.value = 'edit';
        editingMemoryId.value = memory.id;
        memoryForm.value = {
          content: memory.content || '',
          category: memory.category || 'other'
        };
        memoryDialogVisible.value = true;
      }

      function saveMemoryDialog() {
        var content = (memoryForm.value.content || '').trim();
        if (!content) {
          ElementPlus.ElMessage.warning('请输入记忆内容');
          return;
        }
        var category = memoryForm.value.category || 'other';
        if (memoryDialogMode.value === 'edit' && editingMemoryId.value) {
          store.updateMemory(editingMemoryId.value, { content: content, category: category });
          ElementPlus.ElMessage.success('记忆已更新');
        } else {
          store.addMemory(props.expertId, content, category);
          ElementPlus.ElMessage.success('记忆已新增');
        }
        memoryInput.value = '';
        memoryCategoryInput.value = category;
        memories.value = store.getMemories(props.expertId);
        memoryDialogVisible.value = false;
      }

      function deleteMemoryFromDialog() {
        if (!editingMemoryId.value) return;
        removeMemory(editingMemoryId.value);
        memoryDialogVisible.value = false;
      }

      function addMemoryWithCategory() {
        openCreateMemoryDialog();
      }

      // ---- 人设 Tab 方法 ----
      function exportPersonaMd() {
        var content = persona.value.soulMd || '';
        var filename = 'soul.md';
        var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      function triggerPersonaImport() {
        if (personaImportInput.value) personaImportInput.value.click();
      }

      function handlePersonaImport(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          persona.value.soulMd = ev.target.result || '';
          ElementPlus.ElMessage.success('已导入 ' + file.name);
        };
        reader.readAsText(file);
        e.target.value = '';
      }

      function personaPreviewContent() {
        return persona.value.soulMd || '';
      }

      function personaPreviewTabLabel() {
        return 'soul.md';
      }

      // ---- 技能 Tab 方法 ----
      var skillsCatalog = Vue.computed(function () {
        var meta = detailMeta.value || {};
        if (meta.skillsCatalog && meta.skillsCatalog.length) return meta.skillsCatalog;
        return store.getSkillsCatalog(props.expertId);
      });

      var skillPickerOptions = Vue.computed(function () {
        var assigned = {};
        skillBindings.value.forEach(function (b) {
          var id = b.skillId || b.id || b.canonicalName || b.name;
          if (id) assigned[id] = true;
        });
        var q = skillPickerSearch.value.trim().toLowerCase();
        return skillsCatalog.value.filter(function (s) {
          if (assigned[s.skillId]) return false;
          if (!q) return true;
          var name = (s.name || s.skillId || '').toLowerCase();
          var desc = (s.description || '').toLowerCase();
          var cat = (s.category || '').toLowerCase();
          return name.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || cat.indexOf(q) >= 0 || s.skillId.toLowerCase().indexOf(q) >= 0;
        });
      });

      function openSkillPicker() {
        skillPickerSelection.value = [];
        skillPickerSearch.value = '';
        skillPickerVisible.value = true;
      }

      function confirmSkillPicker() {
        if (!skillPickerSelection.value.length) {
          ElementPlus.ElMessage.info('请选择至少一项技能');
          return;
        }
        capabilitySaving.value = true;
        store.addSkillBindings(props.expertId, skillPickerSelection.value.slice()).then(function () {
          skillBindings.value = store.getSkillBindings(props.expertId);
          detailMeta.value = store.getExpertDetailMeta(props.expertId);
          skillPickerVisible.value = false;
          ElementPlus.ElMessage.success('技能已配给');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function isUserCancel(err) {
        return err === 'cancel' || err === 'close' || (err && err === 'Cancel');
      }

      function removeSkillBinding(skillId) {
        ElementPlus.ElMessageBox.confirm(
          '确定移除此技能的配给？',
          '移除技能',
          { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' }
        ).then(function () {
          capabilitySaving.value = true;
          loadSeq += 1;
          return store.removeSkillBinding(props.expertId, skillId);
        }).then(function (data) {
          if (data === null && !store.isDevMock()) return;
          skillBindings.value = store.getSkillBindings(props.expertId);
          detailMeta.value = store.getExpertDetailMeta(props.expertId);
          ElementPlus.ElMessage.success('已移除');
        }).catch(function (err) {
          if (isUserCancel(err)) return;
          return store.fetchExpertDetailRemote(props.expertId).then(function () {
            applyCapabilityState();
          });
        }).catch(function (err) {
          if (isUserCancel(err)) return;
          ElementPlus.ElMessage.error((err && err.message) || '移除技能失败，请重试');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function getSkillInfo(skillId) {
        var b = skillBindings.value.find(function (x) { return x.skillId === skillId; });
        if (b && (b.name || b.description)) return { name: b.name || skillId, description: b.description || '' };
        var sd = (detailMeta.value.skillsDetail || []).find(function (s) { return s.skillId === skillId; });
        if (sd) return { name: sd.name || sd.skillId, description: sd.description || '' };
        var cat = skillsCatalog.value.find(function (s) { return s.skillId === skillId; });
        if (cat) return { name: cat.name || cat.skillId, description: cat.description || '' };
        return catalog.SKILLS_CATALOG.find(function (s) { return s.id === skillId; }) || { name: skillId, description: '' };
      }

      function getSkillParamSchema(skillId) {
        return (window.SKILL_PARAM_SCHEMAS || {})[skillId] || [];
      }

      // ---- 工具 Tab 方法 ----
      var toolsCatalog = Vue.computed(function () {
        var meta = detailMeta.value || {};
        if (meta.toolsCatalog && meta.toolsCatalog.length) return meta.toolsCatalog;
        return store.getToolsCatalog(props.expertId);
      });

      var toolPickerOptions = Vue.computed(function () {
        var assigned = {};
        toolBindings.value.forEach(function (b) {
          var id = b.toolset || b.toolId;
          assigned[id] = true;
        });
        var q = toolPickerSearch.value.trim().toLowerCase();
        return toolsCatalog.value.filter(function (t) {
          var id = t.toolset || t.toolId;
          if (assigned[id]) return false;
          if (!q) return true;
          var label = (t.label || id || '').toLowerCase();
          var desc = (t.description || '').toLowerCase();
          return label.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || id.toLowerCase().indexOf(q) >= 0;
        });
      });

      function openToolPicker() {
        toolPickerSelection.value = [];
        toolPickerSearch.value = '';
        toolPickerVisible.value = true;
      }

      function confirmToolPicker() {
        if (!toolPickerSelection.value.length) {
          ElementPlus.ElMessage.info('请选择至少一项工具');
          return;
        }
        capabilitySaving.value = true;
        store.addToolBindings(props.expertId, toolPickerSelection.value.slice()).then(function () {
          toolBindings.value = store.getToolBindings(props.expertId);
          detailMeta.value = store.getExpertDetailMeta(props.expertId);
          toolPickerVisible.value = false;
          ElementPlus.ElMessage.success('工具已配给');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function removeToolBinding(toolId) {
        ElementPlus.ElMessageBox.confirm(
          '确定移除此工具配置？',
          '移除工具',
          { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' }
        ).then(function () {
          capabilitySaving.value = true;
          loadSeq += 1;
          return store.removeToolBinding(props.expertId, toolId);
        }).then(function (data) {
          if (data === null && !store.isDevMock()) return;
          toolBindings.value = store.getToolBindings(props.expertId);
          detailMeta.value = store.getExpertDetailMeta(props.expertId);
          ElementPlus.ElMessage.success('已移除');
        }).catch(function (err) {
          if (isUserCancel(err)) return;
          return store.fetchExpertDetailRemote(props.expertId).then(function () {
            applyCapabilityState();
          });
        }).catch(function (err) {
          if (isUserCancel(err)) return;
          ElementPlus.ElMessage.error((err && err.message) || '移除工具失败，请重试');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function getToolInfo(toolId) {
        var binding = toolBindings.value.find(function (b) {
          return getToolsetId(b) === toolId;
        });
        if (binding && (binding.label || binding.description)) {
          return {
            name: binding.label || catalog.toolsetLabel(toolId),
            description: binding.description || ('平台工具 · ' + toolId)
          };
        }
        var cat = toolsCatalog.value.find(function (t) { return (t.toolset || t.toolId) === toolId; });
        if (cat) {
          return {
            name: cat.label || toolId,
            description: cat.description || ('平台工具 · ' + toolId)
          };
        }
        if (!store.isDevMock()) {
          return { name: catalog.toolsetLabel(toolId), description: '平台工具 · ' + toolId };
        }
        return catalog.TOOLS_CATALOG.find(function (t) { return t.id === toolId; }) || { name: toolId, description: '' };
      }

      function toolsetLabel(id) {
        return catalog.toolsetLabel ? catalog.toolsetLabel(id) : id;
      }

      function getToolsetId(b) {
        return b.toolset || b.toolId;
      }

      function getToolParamSchema(toolId) {
        return (window.TOOL_PARAM_SCHEMAS || {})[toolId] || [];
      }

      function toolStatusLabel(status) {
        if (status === 'connected') return '已连接';
        if (status === 'configured') return '已配置';
        return '未配置';
      }

      function toolStatusType(status) {
        if (status === 'connected') return 'success';
        if (status === 'configured') return 'primary';
        return 'info';
      }

      var mcpServers = Vue.computed(function () {
        var td = detailMeta.value.toolsDetail || {};
        return td.mcpServers || [];
      });

      var memoryMeta = Vue.computed(function () {
        return detailMeta.value.memoryMeta || {};
      });

      var isMemoryExternal = Vue.computed(function () {
        return !!memoryMeta.value.external;
      });

      var gatewayMeta = Vue.computed(function () {
        return detailMeta.value.gateway || {};
      });

      var gatewayRunning = Vue.computed(function () {
        var g = gatewayMeta.value;
        return !!(g && g.running);
      });

      function imConnectionStatus(ch) {
        if (!ch || !ch.enabled) return 'disabled';
        if (!ch.configured) return 'not_configured';
        if (!gatewayRunning.value) return 'gateway_stopped';
        return 'configured';
      }

      function imConnectionLabel(ch) {
        var s = imConnectionStatus(ch);
        if (s === 'disabled') return '已禁用';
        if (s === 'not_configured') return '未连接';
        if (s === 'gateway_stopped') return '未连接';
        if (s === 'configured') return '连接中';
        return '—';
      }

      function imConnectionDotClass(ch) {
        var s = imConnectionStatus(ch);
        if (s === 'disabled') return 'im-channel-dot--disabled';
        if (s === 'configured') return 'im-channel-dot--ok';
        return 'im-channel-dot--warn';
      }

      function restartImGateway() {
        if (imRestarting.value) return;
        imRestarting.value = true;
        if (store.isDevMock()) {
          // dev mock: 模拟重启过程
          setTimeout(function () {
            detailMeta.value = Object.assign({}, detailMeta.value, {
              gateway: Object.assign({}, detailMeta.value.gateway || {}, {
                enabled: true,
                running: true
              })
            });
            imGatewayEnabled.value = true;
            // 重新计算所有渠道连接状态
            imChannels.value.forEach(function (c) {
              c.state = imConnectionStatus(c);
            });
            store.saveImChannels(props.expertId, imChannels.value, { gatewayEnabled: true });
            imRestarting.value = false;
            ElementPlus.ElMessage.success('Gateway 已重启，渠道连接状态已刷新');
          }, 1200);
          return;
        }
        if (!window.SidecarApi || !window.SidecarApi.restartGateway) {
          imRestarting.value = false;
          ElementPlus.ElMessage.warning('当前后端暂不支持重启 gateway');
          return;
        }
        window.SidecarApi.restartGateway(String(props.expertId)).then(function () {
          detailMeta.value = Object.assign({}, detailMeta.value, {
            gateway: Object.assign({}, detailMeta.value.gateway || {}, { running: true })
          });
          imChannels.value.forEach(function (c) {
            c.state = imConnectionStatus(c);
          });
          imRestarting.value = false;
          ElementPlus.ElMessage.success('Gateway 已重启，渠道连接状态已刷新');
        }).catch(function () {
          imRestarting.value = false;
          ElementPlus.ElMessage.error('重启 gateway 失败');
        });
      }

      function getImPolicyDisplayValue(field) {
        var draftVal = getImPolicyDraftValue(field.key);
        if (draftVal !== '' && draftVal !== undefined && draftVal !== null) return draftVal;
        if (field.value !== undefined && field.value !== null && field.value !== '') return field.value;
        return field.default !== undefined ? field.default : '';
      }

      function getImPolicySelectLabel(field) {
        var val = getImPolicyDisplayValue(field);
        if (!field.options) return val;
        var match = field.options.find(function (o) { return o.value === val; });
        return match ? match.label : val;
      }

      function imPolicySwitchValue(field) {
        var v = getImPolicyDisplayValue(field);
        return v === true || v === 'true' || v === '1';
      }

      function toggleImChannelEnabled(ch) {
        ch.enabled = !ch.enabled;
        ch.state = imConnectionStatus(ch);
      }

      function imPolicySummary(ch) {
        if (!ch || !ch.policyFields || !ch.policyFields.length) return '';
        var parts = [];
        ch.policyFields.forEach(function (field) {
          var val = getImPolicyDisplayValue(field);
          if (val === '' || val === undefined || val === null) return;
          if (field.type === 'select' && field.options) {
            var match = field.options.find(function (o) { return o.value === val; });
            if (match) val = match.label;
          } else if (field.type === 'switch') {
            val = imPolicySwitchValue(field) ? '是' : '否';
          }
          parts.push(field.label + '：' + val);
        });
        return parts.length ? parts.join(' · ') : '使用默认值';
      }

      var personaConfigured = Vue.computed(function () {
        var p = persona.value;
        return !!(p.soulMd && p.soulMd.trim());
      });

      var tabBadges = Vue.computed(function () {
        return {
          persona: '',
          workspace: '',
          tasks: dialogueTasks.value.length > 0 ? ('·' + dialogueTasks.value.length) : '',
          skills: skillBindings.value.length > 0 ? ('·' + skillBindings.value.length) : '',
          tools: toolBindings.value.length > 0 ? ('·' + toolBindings.value.length) : '',
          im: (function () {
            var n = imChannels.value.filter(function (c) { return c.enabled && c.configured; }).length;
            return n > 0 ? ('·' + n) : '';
          })()
        };
      });

      var defaultModelLabel = Vue.computed(function () {
        var e = expert.value;
        if (!e) return '';
        if (e.modelConfig && e.modelConfig.model) return e.modelConfig.model;
        if (e.model) return e.model;
        return '';
      });

      var defaultModelTooltip = Vue.computed(function () {
        var e = expert.value;
        if (!e) return '';
        var mc = e.modelConfig;
        if (mc) {
          var name = mc.providerName || mc.providerSlug || '';
          var url = mc.baseUrl || '';
          return name + (url ? (' · ' + url) : '');
        }
        if (e.provider) {
          var defaults = (window.PROVIDER_DEFAULTS_DETAIL || {})[e.provider];
          if (defaults) return (defaults.name || e.provider) + (defaults.baseUrl ? (' · ' + defaults.baseUrl) : '');
        }
        return e.provider || '';
      });

      var filteredImSidebarChannels = Vue.computed(function () {
        var list = imChannels.value.slice();
        if (messagingSearchQuery.value.trim()) {
          var q = messagingSearchQuery.value.trim().toLowerCase();
          list = list.filter(function (ch) {
            var name = (ch.name || ch.label || ch.type || '').toLowerCase();
            var desc = (ch.description || '').toLowerCase();
            return name.indexOf(q) >= 0 || desc.indexOf(q) >= 0 ||
              String(ch.type || ch.id || '').toLowerCase().indexOf(q) >= 0;
          });
        }
        return list;
      });

      var selectedImChannel = Vue.computed(function () {
        if (!selectedImChannelId.value) return null;
        return imChannels.value.find(function (c) {
          return String(c.id || c.type) === String(selectedImChannelId.value);
        }) || null;
      });

      var imRequiredFields = Vue.computed(function () {
        var ch = selectedImChannel.value;
        if (!ch || !ch.credentialFields) return [];
        return ch.credentialFields.filter(function (f) { return f.required; });
      });

      var imOptionalFields = Vue.computed(function () {
        var ch = selectedImChannel.value;
        if (!ch || !ch.credentialFields) return [];
        return ch.credentialFields.filter(function (f) { return !f.required; });
      });

      function imPlatformIcon(ch) {
        if (!ch) return '📨';
        return window.imPlatformIcon ? window.imPlatformIcon(ch.type || ch.id) : '📨';
      }

      function imChannelDotClass(ch) {
        return imConnectionDotClass(ch);
      }

      function credentialPlaceholder(field) {
        if (field && field.configured) return '已配置 — 留空则不修改';
        return (field && field.label) || '';
      }

      function openImSetupGuide(ch) {
        var url = ch && (ch.docsUrl || ch.docs_url);
        if (url) window.open(url, '_blank', 'noopener');
        else ElementPlus.ElMessage.info('暂无该平台的设置指南链接');
      }

      function messagingStateLabel(state) {
        if (state === 'disabled') return '已禁用';
        if (state === 'not_configured') return '未连接';
        if (state === 'configured') return '连接中';
        if (state === 'gateway_stopped') return '未连接（网关未运行）';
        return state || '—';
      }

      function messagingStateType(state) {
        if (state === 'configured') return 'success';
        if (state === 'not_configured' || state === 'gateway_stopped') return 'warning';
        if (state === 'disabled') return 'info';
        return 'info';
      }

      function personaSectionEmpty(key) {
        if (key === 'soulMd') return !(persona.value.soulMd && String(persona.value.soulMd).trim());
        return !(persona.value.soulMd && String(persona.value.soulMd).trim());
      }

      function onSkillPickerSelection(rows) {
        skillPickerSelection.value = (rows || []).map(function (r) { return r.skillId; });
      }

      function onToolPickerSelection(rows) {
        toolPickerSelection.value = (rows || []).map(function (r) { return r.toolset; });
      }

      // ---- IM 渠道方法 ----
      var IM_SUBSCRIPTION_OPTIONS = [
        { key: 'task_started', label: '任务开始通知' },
        { key: 'task_completed', label: '任务完成通知' },
        { key: 'daily_summary', label: '每日汇总报告' },
        { key: 'error_alert', label: '异常告警' }
      ];

      function toggleImSubscription(channel, eventKey) {
        var subs = channel.subscriptions || [];
        var idx = subs.indexOf(eventKey);
        if (idx >= 0) subs.splice(idx, 1);
        else subs.push(eventKey);
        channel.subscriptions = subs.slice();
      }

      function testImConnection(channel) {
        ElementPlus.ElMessage.success(channel.label + ' 连接测试通过');
      }

      function getPersonaTextarea() {
        return document.querySelector('.persona-textarea textarea');
      }

      function applyPersonaMarkdown(text, selectionStart, selectionEnd) {
        persona.value.coreDutyMd = text;
        Vue.nextTick(function () {
          var textarea = getPersonaTextarea();
          if (!textarea) return;
          textarea.focus();
          textarea.setSelectionRange(selectionStart, selectionEnd);
        });
      }

      function insertMarkdown(prefix, suffix, placeholder) {
        var textarea = getPersonaTextarea();
        if (!textarea) return;
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var text = persona.value.coreDutyMd || '';
        var selected = text.substring(start, end) || placeholder || '';
        var replacement = prefix + selected + suffix;
        applyPersonaMarkdown(
          text.substring(0, start) + replacement + text.substring(end),
          start + prefix.length,
          start + prefix.length + selected.length
        );
      }

      function insertLineMarkdown(marker, placeholder) {
        var textarea = getPersonaTextarea();
        if (!textarea) return;
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var text = persona.value.coreDutyMd || '';
        var selected = text.substring(start, end);
        if (!selected) {
          insertMarkdown(marker, '', placeholder || '');
          return;
        }
        var lineStart = text.lastIndexOf('\n', start - 1) + 1;
        var lineEndIdx = text.indexOf('\n', end);
        var lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;
        var block = text.substring(lineStart, lineEnd);
        var lines = block.split('\n');
        var numbered = marker === '1. ';
        var replacement = lines.map(function (line, idx) {
          return (numbered ? ((idx + 1) + '. ') : marker) + line;
        }).join('\n');
        applyPersonaMarkdown(
          text.substring(0, lineStart) + replacement + text.substring(lineEnd),
          lineStart,
          lineStart + replacement.length
        );
      }

      function insertPersonaMarkdown(type) {
        if (type === 'h1') insertLineMarkdown('# ', '一级标题');
        else if (type === 'h2') insertLineMarkdown('## ', '二级标题');
        else if (type === 'h3') insertLineMarkdown('### ', '三级标题');
        else if (type === 'h4') insertLineMarkdown('#### ', '四级标题');
        else if (type === 'h5') insertLineMarkdown('##### ', '五级标题');
        else if (type === 'h6') insertLineMarkdown('###### ', '六级标题');
        else if (type === 'bold') insertMarkdown('**', '**', '加粗文本');
        else if (type === 'italic') insertMarkdown('*', '*', '斜体文本');
        else if (type === 'strike') insertMarkdown('~~', '~~', '删除线文本');
        else if (type === 'quote') insertLineMarkdown('> ', '引用内容');
        else if (type === 'ul') insertLineMarkdown('- ', '列表项');
        else if (type === 'ol') insertLineMarkdown('1. ', '列表项');
        else if (type === 'task') insertLineMarkdown('- [ ] ', '待办事项');
        else if (type === 'inlineCode') insertMarkdown('`', '`', 'code');
        else if (type === 'codeBlock') insertMarkdown('```\n', '\n```', 'code');
        else if (type === 'link') insertMarkdown('[', '](url)', '链接文本');
        else if (type === 'table') insertMarkdown('\n| 字段 | 说明 |\n| --- | --- |\n| 核心职责 |  |\n\n', '', '');
        else if (type === 'hr') insertMarkdown('\n---\n', '', '');
      }

      function renderMarkdown(md) {
        return window.renderMarkdown ? window.renderMarkdown(md) : (md || '');
      }

      Vue.watch(function () { return props.expertId; }, load);
      Vue.onMounted(function () {
        load();
        window.addEventListener('app-store-updated', onStoreUpdated);
      });
      Vue.onUnmounted(function () {
        window.removeEventListener('app-store-updated', onStoreUpdated);
      });
      function onStoreUpdated(ev) {
        if (!ev || !ev.detail || !ev.detail.expertId) {
          applyLocalState();
          return;
        }
        if (String(ev.detail.expertId) === String(props.expertId)) applyLocalState();
      }

      return {
        expert: expert, activeTab: activeTab, persona: persona,
        tasks: tasks, memories: memories, memoryInput: memoryInput,
        skillBindings: skillBindings, toolBindings: toolBindings,
        imChannels: imChannels, materials: materials, expertArtifacts: expertArtifacts,
        fileNameInput: fileNameInput,
        expertEdit: expertEdit, openEditDialog: expertEdit.openEditDialog,
        skills: catalog.SKILLS_CATALOG, tools: catalog.TOOLS_CATALOG,
        tagColors: catalog.TAG_COLORS,
        taskLastActivityLabel: taskLastActivityLabel,
        taskTabStatusLabel: taskTabStatusLabel,
        taskTabStatusType: taskTabStatusType,
        artifactTypeLabel: catalog.ARTIFACT_TYPE_LABEL,
        savePersona: savePersona, saveSkillBindings: saveSkillBindings, saveToolBindings: saveToolBindings,
        addMemory: addMemory, removeMemory: removeMemory, saveIm: saveIm, addMaterial: addMaterial,
        goAssignTask: goAssignTask,
        // 任务 Tab
        taskSearchQuery: taskSearchQuery, taskStatusFilter: taskStatusFilter,
        newTaskDialogVisible: newTaskDialogVisible, newTaskTitle: newTaskTitle,
        filteredTasks: filteredTasks, taskStats: taskStats, taskListEmpty: taskListEmpty,
        openNewTaskDialog: openNewTaskDialog, submitNewTask: submitNewTask,
        editTaskTitle: editTaskTitle, archiveTaskItem: archiveTaskItem, deleteTaskItem: deleteTaskItem,
        // 产物 Tab
        artifactSearchQuery: artifactSearchQuery, artifactTypeFilter: artifactTypeFilter, artifactTaskFilter: artifactTaskFilter,
        artifactPreviewVisible: artifactPreviewVisible, artifactPreviewItem: artifactPreviewItem,
        filteredArtifacts: filteredArtifacts, artifactStats: artifactStats,
        openArtifactPreview: openArtifactPreview, downloadArtifact: downloadArtifact, goToArtifactTask: goToArtifactTask,
        // 资料 Tab
        materialFileInput: materialFileInput, materialTypeFilter: materialTypeFilter, materialSearchQuery: materialSearchQuery,
        materialPreviewVisible: materialPreviewVisible, materialPreviewItem: materialPreviewItem,
        workspaceCurrentFolderId: workspaceCurrentFolderId, workspaceFolderDialogVisible: workspaceFolderDialogVisible,
        workspaceFolderDialogMode: workspaceFolderDialogMode, workspaceFolderName: workspaceFolderName,
        workspaceDragItem: workspaceDragItem, workspaceRootDragOver: workspaceRootDragOver,
        filteredMaterials: filteredMaterials, workspaceFiles: workspaceFiles, workspaceStats: workspaceStats, workspaceBreadcrumbs: workspaceBreadcrumbs, workspacePathLabel: workspacePathLabel,
        openMaterialUpload: openMaterialUpload, handleMaterialFileSelect: handleMaterialFileSelect,
        openMaterialPreview: openMaterialPreview, downloadMaterial: downloadMaterial, deleteMaterial: deleteMaterial,
        workspaceFileTypeClass: workspaceFileTypeClass, workspaceFileIcon: workspaceFileIcon, workspaceFileMeta: workspaceFileMeta,
        workspaceTypeLabel: workspaceTypeLabel, workspaceUpdatedAt: workspaceUpdatedAt, workspaceSourceLabel: workspaceSourceLabel, workspaceSizeLabel: workspaceSizeLabel,
        openWorkspaceFilePreview: openWorkspaceFilePreview, downloadWorkspaceFile: downloadWorkspaceFile, deleteWorkspaceFile: deleteWorkspaceFile,
        openCreateWorkspaceFolderDialog: openCreateWorkspaceFolderDialog, submitWorkspaceFolderDialog: submitWorkspaceFolderDialog,
        openWorkspaceFolder: openWorkspaceFolder, openWorkspaceBreadcrumb: openWorkspaceBreadcrumb,
        canDropWorkspaceBreadcrumb: canDropWorkspaceBreadcrumb, workspaceBreadcrumbClass: workspaceBreadcrumbClass, onWorkspaceBreadcrumbDrop: onWorkspaceBreadcrumbDrop,
        openRenameWorkspaceItem: openRenameWorkspaceItem, deleteWorkspaceFolder: deleteWorkspaceFolder, handleWorkspaceItemCommand: handleWorkspaceItemCommand,
        onWorkspaceDragStart: onWorkspaceDragStart, onWorkspaceDragEnd: onWorkspaceDragEnd, canDropWorkspaceItem: canDropWorkspaceItem, onWorkspaceDrop: onWorkspaceDrop,
        fileTypeIcon: fileTypeIcon, formatFileSize: formatFileSize,
        // 记忆 Tab
        memoryCategoryFilter: memoryCategoryFilter, memorySourceFilter: memorySourceFilter, memorySearchQuery: memorySearchQuery,
        memoryCategoryInput: memoryCategoryInput,
        memoryDialogVisible: memoryDialogVisible, memoryDialogMode: memoryDialogMode, editingMemoryId: editingMemoryId, memoryForm: memoryForm,
        filteredMemories: filteredMemories, memoryStats: memoryStats,
        MEMORY_CATEGORY_LABELS: MEMORY_CATEGORY_LABELS, MEMORY_CATEGORY_ICONS: MEMORY_CATEGORY_ICONS,
        addMemoryWithCategory: addMemoryWithCategory, openCreateMemoryDialog: openCreateMemoryDialog,
        openEditMemoryDialog: openEditMemoryDialog, saveMemoryDialog: saveMemoryDialog, deleteMemoryFromDialog: deleteMemoryFromDialog,
        // 人设 Tab
        personaPreviewTab: personaPreviewTab, personaImportInput: personaImportInput,
        exportPersonaMd: exportPersonaMd, triggerPersonaImport: triggerPersonaImport,
        handlePersonaImport: handlePersonaImport,
        personaPreviewContent: personaPreviewContent, personaPreviewTabLabel: personaPreviewTabLabel,
        renderMarkdown: renderMarkdown, insertMarkdown: insertMarkdown, insertPersonaMarkdown: insertPersonaMarkdown,
        // 技能 Tab
        openSkillPicker: openSkillPicker, confirmSkillPicker: confirmSkillPicker,
        removeSkillBinding: removeSkillBinding,
        getSkillInfo: getSkillInfo, getSkillParamSchema: getSkillParamSchema,
        skillsCatalog: skillsCatalog, skillPickerOptions: skillPickerOptions,
        skillPickerVisible: skillPickerVisible, skillPickerSearch: skillPickerSearch, skillPickerSelection: skillPickerSelection,
        onSkillPickerSelection: onSkillPickerSelection,
        // 工具 Tab
        openToolPicker: openToolPicker, confirmToolPicker: confirmToolPicker,
        removeToolBinding: removeToolBinding,
        getToolInfo: getToolInfo, getToolParamSchema: getToolParamSchema,
        toolsCatalog: toolsCatalog, toolPickerOptions: toolPickerOptions,
        toolPickerVisible: toolPickerVisible, toolPickerSearch: toolPickerSearch, toolPickerSelection: toolPickerSelection,
        onToolPickerSelection: onToolPickerSelection,
        toolsetLabel: toolsetLabel, getToolsetId: getToolsetId,
        toolStatusLabel: toolStatusLabel, toolStatusType: toolStatusType,
        capabilitySaving: capabilitySaving,
        capabilitiesLoading: capabilitiesLoading,
        mcpServers: mcpServers,
        // IM 渠道
        IM_SUBSCRIPTION_OPTIONS: IM_SUBSCRIPTION_OPTIONS,
        toggleImSubscription: toggleImSubscription, testImConnection: testImConnection,
        load: load,
        isDevMock: isDevMock,
        detailMeta: detailMeta,
        memoryMeta: memoryMeta, isMemoryExternal: isMemoryExternal, gatewayMeta: gatewayMeta,
        gatewayRunning: gatewayRunning,
        personaConfigured: personaConfigured, tabBadges: tabBadges,
        messagingSearchQuery: messagingSearchQuery, filteredImSidebarChannels: filteredImSidebarChannels,
        selectedImChannelId: selectedImChannelId, selectedImChannel: selectedImChannel,
        imSecretDraft: imSecretDraft, imPolicyDraft: imPolicyDraft,
        imGatewayEnabled: imGatewayEnabled, imSaving: imSaving,
        imRestarting: imRestarting, imConflictProfile: imConflictProfile,
        imPolicyCollapse: imPolicyCollapse,
        imRequiredFields: imRequiredFields, imOptionalFields: imOptionalFields,
        selectImChannel: selectImChannel, imPlatformIcon: imPlatformIcon, imChannelDotClass: imChannelDotClass,
        credentialPlaceholder: credentialPlaceholder, openImSetupGuide: openImSetupGuide,
        saveSelectedImChannel: saveSelectedImChannel, saveGatewayEnabled: saveGatewayEnabled,
        restartImGateway: restartImGateway,
        imConnectionStatus: imConnectionStatus, imConnectionLabel: imConnectionLabel,
        imConnectionDotClass: imConnectionDotClass,
        toggleImChannelEnabled: toggleImChannelEnabled,
        imPolicySummary: imPolicySummary,
        getImPolicyDisplayValue: getImPolicyDisplayValue, getImPolicySelectLabel: getImPolicySelectLabel,
        imPolicySwitchValue: imPolicySwitchValue,
        messagingStateLabel: messagingStateLabel, messagingStateType: messagingStateType,
        personaSectionEmpty: personaSectionEmpty,
        runningSessionCount: runningSessionCount,
        goToRunningTasks: goToRunningTasks,
        workspaceRootPath: workspaceRootPath,
        workspaceRootDialogVisible: workspaceRootDialogVisible,
        workspaceRootInput: workspaceRootInput,
        openWorkspaceRootDialog: openWorkspaceRootDialog,
        submitWorkspaceRootChange: submitWorkspaceRootChange,
        highlightSessionId: highlightSessionId,
        memoryMdContent: memoryMdContent,
        userMdContent: userMdContent,
        memorySubTab: memorySubTab,
        personaOnboardDismissed: personaOnboardDismissed,
        personaApplyImmediate: personaApplyImmediate,
        dismissPersonaOnboard: dismissPersonaOnboard,
        fillPersonaFromTemplate: fillPersonaFromTemplate,
        importPersonaSoulMd: importPersonaSoulMd,
        getTaskCwdLabel: getTaskCwdLabel,
        goToWorkspaceFromTask: goToWorkspaceFromTask,
        hubInstallDialogVisible: hubInstallDialogVisible,
        hubInstallSearch: hubInstallSearch,
        hubInstalling: hubInstalling,
        hubInstallProgress: hubInstallProgress,
        hubSkillOptions: hubSkillOptions,
        openHubInstallDialog: openHubInstallDialog,
        installHubSkill: installHubSkill,
        removeSkillBindingDynamic: removeSkillBindingDynamic,
        removeToolBindingDynamic: removeToolBindingDynamic,
        unbindMcpServer: unbindMcpServer,
        defaultModelLabel: defaultModelLabel,
        defaultModelTooltip: defaultModelTooltip
      };
    },
    template: '\
      <div class="expert-detail-layout" v-if="expert">\
        <div class="expert-manage-banner">\
          <back-link label="返回专家" inline @click="$emit(\'nav\', \'/experts\')" />\
          <button type="button" class="expert-assign-btn" @click="goAssignTask">\
            <span class="expert-assign-btn-icon">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>\
            </span>\
            发起任务\
          </button>\
        </div>\
        <div class="expert-detail-scroll">\
        <div class="expert-detail-page">\
        <div class="expert-basic-info-card expert-basic-info-card-compact">\
          <div class="expert-basic-info-body">\
            <div class="expert-basic-info-avatar-wrap">\
              <img class="expert-basic-info-avatar" :src="expert.avatar" :alt="expert.name">\
            </div>\
            <div class="expert-basic-info-content">\
              <div class="expert-basic-info-head">\
                <h2 class="expert-basic-info-name">{{ expert.name }}</h2>\
                <el-tooltip v-if="defaultModelLabel" :content="defaultModelTooltip" placement="bottom" :show-after="300">\
                  <span class="detail-model-tag">\
                    <span class="detail-model-tag-label">默认模型</span>\
                    <span class="detail-model-tag-value">{{ defaultModelLabel }}</span>\
                  </span>\
                </el-tooltip>\
              </div>\
              <p v-if="expert.description" class="expert-basic-info-desc">{{ expert.description }}</p>\
              <div v-if="expert.expertise && expert.expertise.length" class="expert-basic-info-tags">\
                <span v-for="(tag, idx) in expert.expertise.slice(0, 3)" :key="tag" class="expertise-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>\
              </div>\
            </div>\
            <button type="button" class="section-edit-btn" title="编辑" @click="openEditDialog">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>\
            </button>\
          </div>\
        </div>\
        <div class="detail-main expert-detail-tabs">\
          <el-tabs v-model="activeTab" class="expert-detail-tabs-inner">\
              <el-tab-pane name="persona">\
                <template #label>人设 <span v-if="tabBadges.persona" class="tab-count-badge">{{ tabBadges.persona }}</span></template>\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">人设</h3>\
                    <p class="detail-section-desc">定义专家的核心职责、工作流程与行为准则</p>\
                  </div>\
                  <div v-if="!personaOnboardDismissed && !persona.soulMd" class="persona-onboard-banner">\
                    <div class="persona-onboard-title">首次使用：为专家编写 SOUL.md</div>\
                    <div class="persona-onboard-desc">SOUL.md 是专家的「灵魂文件」，定义其角色、职责与行为准则。你可以从模板创建，或导入已有的 soul.md。</div>\
                    <div class="persona-onboard-actions">\
                      <el-button type="primary" size="small" @click="fillPersonaFromTemplate">从模板创建</el-button>\
                      <el-button size="small" @click="importPersonaSoulMd">导入 soul.md</el-button>\
                      <el-button link size="small" @click="dismissPersonaOnboard">知道了</el-button>\
                    </div>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split">\
                    <input ref="personaImportInput" type="file" accept=".md" class="material-file-input-hidden" @change="handlePersonaImport">\
                    <div class="detail-action-left">\
                      <el-button size="small" @click="triggerPersonaImport">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                        导入soul.md\
                      </el-button>\
                      <el-button size="small" @click="exportPersonaMd">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
                        导出soul.md\
                      </el-button>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-checkbox v-if="runningSessionCount > 0" v-model="personaApplyImmediate" size="small" style="margin-right:12px">立即生效</el-checkbox>\
                      <el-button type="primary" size="small" @click="savePersona">保存</el-button>\
                    </div>\
                  </div>\
                  <div class="persona-split-layout">\
                    <div class="persona-edit-panel">\
                      <div class="persona-edit-tabs">\
                        <button type="button" class="persona-edit-tab active">soul.md</button>\
                      </div>\
                      <div class="persona-edit-toolbar">\
                        <el-dropdown trigger="hover" @command="insertPersonaMarkdown">\
                          <button type="button" class="persona-toolbar-menu-btn" aria-label="标题"><span class="persona-toolbar-icon">H</span><span class="persona-toolbar-caret">▾</span></button>\
                          <template #dropdown>\
                            <el-dropdown-menu class="persona-markdown-dropdown">\
                              <el-dropdown-item command="h1" aria-label="一级标题 H1"><el-tooltip content="一级标题 H1" placement="right" :show-after="300"><span class="persona-dropdown-icon">H1</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="h2" aria-label="二级标题 H2"><el-tooltip content="二级标题 H2" placement="right" :show-after="300"><span class="persona-dropdown-icon">H2</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="h3" aria-label="三级标题 H3"><el-tooltip content="三级标题 H3" placement="right" :show-after="300"><span class="persona-dropdown-icon">H3</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="h4" aria-label="四级标题 H4"><el-tooltip content="四级标题 H4" placement="right" :show-after="300"><span class="persona-dropdown-icon">H4</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="h5" aria-label="五级标题 H5"><el-tooltip content="五级标题 H5" placement="right" :show-after="300"><span class="persona-dropdown-icon">H5</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="h6" aria-label="六级标题 H6"><el-tooltip content="六级标题 H6" placement="right" :show-after="300"><span class="persona-dropdown-icon">H6</span></el-tooltip></el-dropdown-item>\
                            </el-dropdown-menu>\
                          </template>\
                        </el-dropdown>\
                        <el-dropdown trigger="hover" @command="insertPersonaMarkdown">\
                          <button type="button" class="persona-toolbar-menu-btn" aria-label="文本样式"><span class="persona-toolbar-icon"><b>B</b></span><span class="persona-toolbar-caret">▾</span></button>\
                          <template #dropdown>\
                            <el-dropdown-menu class="persona-markdown-dropdown">\
                              <el-dropdown-item command="bold" aria-label="加粗"><el-tooltip content="加粗" placement="right" :show-after="300"><span class="persona-dropdown-icon"><b>B</b></span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="italic" aria-label="斜体"><el-tooltip content="斜体" placement="right" :show-after="300"><span class="persona-dropdown-icon"><i>I</i></span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="strike" aria-label="删除线"><el-tooltip content="删除线" placement="right" :show-after="300"><span class="persona-dropdown-icon"><s>S</s></span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="inlineCode" aria-label="行内代码"><el-tooltip content="行内代码" placement="right" :show-after="300"><span class="persona-dropdown-icon">`</span></el-tooltip></el-dropdown-item>\
                            </el-dropdown-menu>\
                          </template>\
                        </el-dropdown>\
                        <el-dropdown trigger="hover" @command="insertPersonaMarkdown">\
                          <button type="button" class="persona-toolbar-menu-btn" aria-label="列表与引用"><span class="persona-toolbar-icon">☷</span><span class="persona-toolbar-caret">▾</span></button>\
                          <template #dropdown>\
                            <el-dropdown-menu class="persona-markdown-dropdown">\
                              <el-dropdown-item command="ul" aria-label="无序列表"><el-tooltip content="无序列表" placement="right" :show-after="300"><span class="persona-dropdown-icon">•</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="ol" aria-label="有序列表"><el-tooltip content="有序列表" placement="right" :show-after="300"><span class="persona-dropdown-icon">1.</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="task" aria-label="待办事项"><el-tooltip content="待办事项" placement="right" :show-after="300"><span class="persona-dropdown-icon">☐</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="quote" aria-label="引用"><el-tooltip content="引用" placement="right" :show-after="300"><span class="persona-dropdown-icon">&gt;</span></el-tooltip></el-dropdown-item>\
                            </el-dropdown-menu>\
                          </template>\
                        </el-dropdown>\
                        <el-dropdown trigger="hover" @command="insertPersonaMarkdown">\
                          <button type="button" class="persona-toolbar-menu-btn" aria-label="插入内容"><span class="persona-toolbar-icon">＋</span><span class="persona-toolbar-caret">▾</span></button>\
                          <template #dropdown>\
                            <el-dropdown-menu class="persona-markdown-dropdown">\
                              <el-dropdown-item command="link" aria-label="链接"><el-tooltip content="链接" placement="right" :show-after="300"><span class="persona-dropdown-icon">⌁</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="codeBlock" aria-label="代码块"><el-tooltip content="代码块" placement="right" :show-after="300"><span class="persona-dropdown-icon">{ }</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="table" aria-label="表格"><el-tooltip content="表格" placement="right" :show-after="300"><span class="persona-dropdown-icon">表</span></el-tooltip></el-dropdown-item>\
                              <el-dropdown-item command="hr" aria-label="分割线"><el-tooltip content="分割线" placement="right" :show-after="300"><span class="persona-dropdown-icon">—</span></el-tooltip></el-dropdown-item>\
                            </el-dropdown-menu>\
                          </template>\
                        </el-dropdown>\
                      </div>\
                      <el-input v-model="persona.soulMd" type="textarea" :rows="14" placeholder="编辑 SOUL.md，支持 Markdown 格式" class="persona-textarea" />\
                    </div>\
                    <div class="persona-preview-panel">\
                      <div class="persona-preview-head">\
                        <span class="persona-preview-head-title">预览 · {{ personaPreviewTabLabel() }}</span>\
                      </div>\
                      <div class="persona-preview-content" v-html="renderMarkdown(personaPreviewContent())"></div>\
                    </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="workspace">\
                <template #label>工作空间 <span v-if="tabBadges.workspace" class="tab-count-badge">{{ tabBadges.workspace }}</span></template>\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">工作空间</h3>\
                    <p class="detail-section-desc">专家工作空间根；所有 task 共享此目录树，工作目录默认为根，用户可改为子目录</p>\
                  </div>\
                  <div class="workspace-root-bar">\
                    <span style="font-weight:600;color:var(--text-primary,#303133)">工作空间根：</span>\
                    <span class="workspace-root-path">{{ workspaceRootPath }}</span>\
                    <el-button size="small" @click="openWorkspaceRootDialog">更改路径</el-button>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split workspace-action-bar">\
                    <input ref="materialFileInput" type="file" multiple class="material-file-input-hidden" @change="handleMaterialFileSelect">\
                    <div class="detail-action-left workspace-breadcrumbs">\
                      <template v-for="(crumb, index) in workspaceBreadcrumbs" :key="crumb.id || \'root\'">\
                        <button type="button" class="workspace-breadcrumb" :class="workspaceBreadcrumbClass(index, crumb)" @click="openWorkspaceBreadcrumb(crumb)" @dragover.prevent="canDropWorkspaceBreadcrumb(crumb)" @drop.prevent="onWorkspaceBreadcrumbDrop(crumb)">{{ crumb.name }}</button>\
                        <span v-if="index < workspaceBreadcrumbs.length - 1" class="workspace-breadcrumb-sep">/</span>\
                      </template>\
                      <span class="workspace-stat-pill">{{ workspaceStats }}</span>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button size="small" @click="openCreateWorkspaceFolderDialog">新建文件夹</el-button>\
                      <el-button type="primary" size="small" @click="openMaterialUpload">上传文件</el-button>\
                    </div>\
                  </div>\
                  <div class="workspace-list-panel">\
                    <div v-if="workspaceFiles.length === 0" class="profile-empty-state workspace-directory-empty">\
                      <p class="profile-empty-title">工作目录暂无内容</p>\
                      <p class="profile-empty-desc">你可以新建文件夹整理资料，或上传文件供专家执行任务时引用。</p>\
                      <div class="workspace-empty-actions">\
                        <el-button size="small" @click="openCreateWorkspaceFolderDialog">新建文件夹</el-button>\
                        <el-button type="primary" size="small" @click="openMaterialUpload">上传文件</el-button>\
                      </div>\
                    </div>\
                    <div v-else class="workspace-list-table">\
                      <div class="workspace-list-row workspace-list-head">\
                        <div class="workspace-list-cell workspace-list-name-cell">名称</div>\
                        <div class="workspace-list-cell workspace-list-type-cell">类型</div>\
                        <div class="workspace-list-cell workspace-list-updater-cell">来源</div>\
                        <div class="workspace-list-cell workspace-list-time-cell">更新时间</div>\
                        <div class="workspace-list-cell workspace-list-size-cell">大小</div>\
                        <div class="workspace-list-cell workspace-list-action-cell">操作</div>\
                      </div>\
                      <div v-for="file in workspaceFiles" :key="file.id" class="workspace-list-row workspace-list-item" :class="{ \'is-folder\': file.kind === \'folder\', \'is-drop-target\': canDropWorkspaceItem(file), \'workspace-root-highlight-row\': file.kind === \'folder\' && file.name === highlightSessionId }" :draggable="file.source === \'upload\'" @dragstart="onWorkspaceDragStart(file, $event)" @dragend="onWorkspaceDragEnd" @dragover.prevent="file.kind === \'folder\' && canDropWorkspaceItem(file)" @drop.prevent="file.kind === \'folder\' && onWorkspaceDrop(file)">\
                        <div class="workspace-list-cell workspace-list-name-cell" @click="file.kind === \'folder\' && openWorkspaceFolder(file)" @dblclick="openWorkspaceFilePreview(file)">\
                          <span class="workspace-file-icon-wrap" :class="workspaceFileTypeClass(file)">\
                            <span class="workspace-file-icon">{{ workspaceFileIcon(file) }}</span>\
                          </span>\
                          <span class="workspace-list-name-text">{{ file.name }}</span>\
                        </div>\
                        <div class="workspace-list-cell workspace-list-type-cell">{{ workspaceTypeLabel(file) }}</div>\
                        <div class="workspace-list-cell workspace-list-updater-cell">{{ workspaceSourceLabel(file) }}</div>\
                        <div class="workspace-list-cell workspace-list-time-cell">{{ workspaceUpdatedAt(file) }}</div>\
                        <div class="workspace-list-cell workspace-list-size-cell">{{ workspaceSizeLabel(file) }}</div>\
                        <div class="workspace-list-cell workspace-list-action-cell">\
                          <template v-if="file.kind !== \'folder\'">\
                            <el-button link type="primary" size="small" @click="openWorkspaceFilePreview(file)">预览</el-button>\
                            <el-button link type="primary" size="small" @click="downloadWorkspaceFile(file)">下载</el-button>\
                            <el-button v-if="file.taskId" link type="primary" size="small" @click="goToArtifactTask(file.taskId)">跳转至任务</el-button>\
                          </template>\
                          <el-dropdown trigger="click" @command="handleWorkspaceItemCommand($event, file)">\
                            <button type="button" class="workspace-more-btn workspace-more-btn-vertical" aria-label="更多操作">⋮</button>\
                            <template #dropdown>\
                              <el-dropdown-menu>\
                                <el-dropdown-item command="rename" :disabled="file.source !== \'upload\'">重命名</el-dropdown-item>\
                                <el-dropdown-item command="delete" :disabled="file.source !== \'upload\'" class="workspace-danger-dropdown-item">删除</el-dropdown-item>\
                              </el-dropdown-menu>\
                            </template>\
                          </el-dropdown>\
                        </div>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="tasks">\
                <template #label>任务 <span v-if="tabBadges.tasks" class="tab-count-badge">{{ tabBadges.tasks }}</span></template>\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">对话任务</h3>\
                    <p class="detail-section-desc">当前专家下的对话任务，可新建、打开或管理</p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--tasks">\
                    <div class="task-tab-stats">\
                      <span class="task-tab-stat-item">任务总数 <strong>{{ taskStats.total }}</strong></span>\
                      <span class="task-tab-stat-sep">·</span>\
                      <span class="task-tab-stat-item">运行中 <strong>{{ taskStats.running }}</strong></span>\
                      <span class="task-tab-stat-sep">·</span>\
                      <span class="task-tab-stat-item">已就绪 <strong>{{ taskStats.ready }}</strong></span>\
                    </div>\
                    <div class="task-tab-tools">\
                      <el-input v-model="taskSearchQuery" placeholder="搜索任务名称或 ID..." size="small" clearable style="width:200px" />\
                      <el-select v-model="taskStatusFilter" size="small" style="width:110px">\
                        <el-option label="全部" value="all" />\
                        <el-option label="运行中" value="running" />\
                        <el-option label="已就绪" value="ready" />\
                      </el-select>\
                      <el-button type="primary" size="small" @click="openNewTaskDialog">+ 新建任务</el-button>\
                    </div>\
                  </div>\
                  <div class="detail-table-wrap">\
                    <div v-if="!isDevMock && taskListEmpty && !taskSearchQuery && taskStatusFilter === \'all\'" class="profile-empty-state">\
                      <p class="profile-empty-title">暂无对话任务</p>\
                      <p class="profile-empty-desc">点击「新建任务」创建第一个会话，或在任务页与专家对话。</p>\
                    </div>\
                    <el-table v-else :data="filteredTasks" stripe empty-text="暂无匹配任务" class="task-tab-table">\
                    <el-table-column prop="id" label="任务ID" min-width="160" show-overflow-tooltip />\
                    <el-table-column prop="title" label="任务名称" min-width="200" show-overflow-tooltip />\
                    <el-table-column label="状态" width="88">\
                      <template #default="{ row }"><el-tag :type="taskTabStatusType(row)" size="small">{{ taskTabStatusLabel(row) }}</el-tag></template>\
                    </el-table-column>\
                    <el-table-column label="工作目录" width="120">\
                      <template #default="{ row }"><el-button link type="primary" size="small" @click="goToWorkspaceFromTask(row)">{{ getTaskCwdLabel(row) }}</el-button></template>\
                    </el-table-column>\
                    <el-table-column label="最近活跃" width="190">\
                      <template #default="{ row }">{{ taskLastActivityLabel(row) }}</template>\
                    </el-table-column>\
                    <el-table-column label="操作" width="152" fixed="right" align="left" class-name="task-tab-action-cell">\
                      <template #default="{ row }">\
                        <div class="task-tab-actions">\
                          <el-button link type="primary" size="small" @click="$emit(\'nav\', \'/experts/\' + expert.id + \'/tasks/\' + row.id)">打开</el-button>\
                          <el-button link type="primary" size="small" @click="editTaskTitle(row)">编辑</el-button>\
                          <el-button link type="danger" size="small" @click="deleteTaskItem(row)">删除</el-button>\
                        </div>\
                      </template>\
                    </el-table-column>\
                  </el-table>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="memory">\
                <template #label>记忆</template>\
                <div class="detail-tab-pane memory-tab">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">记忆</h3>\
                    <p class="detail-section-desc">专家长期记忆与用户画像，由会话自动沉淀</p>\
                  </div>\
                  <el-tabs v-model="memorySubTab" class="memory-sub-tabs">\
                    <el-tab-pane name="memory">\
                      <template #label>MEMORY.md<span v-if="memoryMdContent" class="memory-sub-dot"></span></template>\
                      <div class="memory-readonly-content">{{ memoryMdContent || \'（暂无长期记忆，会话过程中自动沉淀）\' }}</div>\
                    </el-tab-pane>\
                    <el-tab-pane name="user">\
                      <template #label>USER.md<span v-if="userMdContent" class="memory-sub-dot"></span></template>\
                      <div class="memory-readonly-content">{{ userMdContent || \'（暂无用户画像记忆）\' }}</div>\
                    </el-tab-pane>\
                  </el-tabs>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="skills">\
                <template #label>技能 <span v-if="tabBadges.skills" class="tab-count-badge">{{ tabBadges.skills }}</span></template>\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">技能</h3>\
                    <p class="detail-section-desc">为专家配置可调用的业务技能，可从已安装技能池中添加</p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split">\
                    <div class="detail-action-left">\
                      <span class="detail-action-bar-label">已配给 {{ skillBindings.length }} 项技能</span>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button size="small" @click="openHubInstallDialog">从 Hub 安装</el-button>\
                      <el-button type="primary" size="small" :loading="capabilitySaving" @click="openSkillPicker">+ 添加技能</el-button>\
                    </div>\
                  </div>\
                  <div v-if="runningSessionCount > 0" class="capability-notice">该专家当前有 {{ runningSessionCount }} 个运行中会话，技能变更将在新会话生效。</div>\
                  <div v-loading="capabilitiesLoading || capabilitySaving">\
                    <div v-if="skillBindings.length === 0 && !capabilitiesLoading" class="profile-empty-state">\
                    <p class="profile-empty-title">尚未配给任何技能</p>\
                    <p class="profile-empty-desc">点击「添加技能」从已安装技能池中选择。</p>\
                  </div>\
                  <div v-else class="detail-table-wrap">\
                    <el-table :data="skillBindings" stripe class="toolset-table">\
                      <el-table-column label="技能" min-width="140">\
                        <template #default="{ row }">\
                          <div class="toolset-name-cell">{{ getSkillInfo(row.skillId).name }}</div>\
                          <div class="toolset-id-cell">{{ row.skillId }}</div>\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="分类" width="120" show-overflow-tooltip>\
                        <template #default="{ row }">{{ row.category || \'—\' }}</template>\
                      </el-table-column>\
                      <el-table-column label="说明" min-width="200" show-overflow-tooltip>\
                        <template #default="{ row }">{{ getSkillInfo(row.skillId).description || \'—\' }}</template>\
                      </el-table-column>\
                      <el-table-column label="使用次数" width="90" align="center">\
                        <template #default="{ row }">{{ row.useCount || 0 }}</template>\
                      </el-table-column>\
                      <el-table-column label="操作" width="80" align="center">\
                        <template #default="{ row }">\
                          <el-button link type="danger" size="small" @click="removeSkillBindingDynamic(row.skillId, getSkillInfo(row.skillId))">移除</el-button>\
                        </template>\
                      </el-table-column>\
                    </el-table>\
                  </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="tools">\
                <template #label>工具 <span v-if="tabBadges.tools" class="tab-count-badge">{{ tabBadges.tools }}</span></template>\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">工具</h3>\
                    <p class="detail-section-desc">为专家配置可调用工具，并查看已接入的外部服务</p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split">\
                    <div class="detail-action-left">\
                      <span class="detail-action-bar-label">已配置 {{ toolBindings.length }} 个工具</span>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button type="primary" size="small" :loading="capabilitySaving" @click="openToolPicker">+ 添加工具</el-button>\
                    </div>\
                  </div>\
                  <div v-if="runningSessionCount > 0" class="capability-notice">该专家当前有 {{ runningSessionCount }} 个运行中会话，工具变更将在新会话生效。</div>\
                  <div v-if="toolBindings.length === 0" class="profile-empty-state">\
                    <p class="profile-empty-title">尚未配给任何工具</p>\
                    <p class="profile-empty-desc">点击「添加工具」从可选工具列表中挑选。</p>\
                  </div>\
                  <div v-else class="detail-table-wrap">\
                    <el-table :data="toolBindings" stripe class="toolset-table">\
                      <el-table-column label="工具" min-width="160">\
                        <template #default="{ row }">\
                          <div class="toolset-name-cell">{{ getToolInfo(getToolsetId(row)).name }}</div>\
                          <div class="toolset-id-cell">{{ getToolsetId(row) }}</div>\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="说明" min-width="200" show-overflow-tooltip>\
                        <template #default="{ row }">{{ getToolInfo(getToolsetId(row)).description || \'—\' }}</template>\
                      </el-table-column>\
                      <el-table-column label="配置" width="90" align="center">\
                        <template #default="{ row }">\
                          <el-tag :type="toolStatusType(row.status)" size="small" effect="plain">{{ toolStatusLabel(row.status) }}</el-tag>\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="操作" width="80" align="center">\
                        <template #default="{ row }">\
                          <el-button link type="danger" size="small" @click="removeToolBindingDynamic(getToolsetId(row), getToolInfo(getToolsetId(row)))">移除</el-button>\
                        </template>\
                      </el-table-column>\
                    </el-table>\
                  </div>\
                  <div v-if="mcpServers.length" class="mcp-servers-section">\
                    <h4 class="mcp-servers-title">MCP 服务</h4>\
                    <el-table :data="mcpServers" stripe size="small" class="toolset-table">\
                      <el-table-column prop="name" label="名称" min-width="120" />\
                      <el-table-column label="配置" width="100">\
                        <template #default="{ row }">\
                          <el-tag :type="row.configured ? \'success\' : \'warning\'" size="small">{{ row.configured ? \'已配置\' : \'未配置\' }}</el-tag>\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="缺失环境变量" min-width="180">\
                        <template #default="{ row }">\
                          <span v-if="row.configured">—</span>\
                          <span v-else class="toolset-id-cell">需补充配置：{{ (row.missingEnv || []).join(\', \') || \'相关 KEY\' }}</span>\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="操作" width="140" align="center">\
                        <template #default="{ row }">\
                          <el-button link type="primary" size="small" @click="$emit(\'nav\', \'/experts/\' + expert.id + \'?tab=tools\')">管理</el-button>\
                          <el-button link type="danger" size="small" @click="unbindMcpServer(row)">解绑</el-button>\
                        </template>\
                      </el-table-column>\
                    </el-table>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="im">\
                <template #label>IM渠道 <span v-if="tabBadges.im" class="tab-count-badge">{{ tabBadges.im }}</span></template>\
                <div class="detail-tab-pane im-channel-tab">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">IM渠道</h3>\
                    <p class="detail-section-desc">配置专家可被触达的 IM 渠道（企业微信 / 钉钉 / 飞书）。启用后用户在 IM 端 @机器人或私聊即可与该专家对话。</p>\
                  </div>\
                  <div class="im-channel-layout">\
                    <div class="im-channel-sidebar">\
                      <el-input v-model="messagingSearchQuery" placeholder="搜索渠道..." clearable size="small" class="im-channel-search" />\
                      <div class="im-channel-list">\
                        <button v-for="ch in filteredImSidebarChannels" :key="ch.id || ch.type" type="button" class="im-channel-list-item" :class="{ active: String(selectedImChannelId) === String(ch.id || ch.type) }" @click="selectImChannel(ch)">\
                          <span class="im-channel-list-icon">{{ ch.emoji || imPlatformIcon(ch) }}</span>\
                          <span class="im-channel-list-name">{{ ch.name || ch.label }}</span>\
                          <span class="im-channel-dot" :class="imChannelDotClass(ch)"></span>\
                        </button>\
                        <div v-if="!filteredImSidebarChannels.length" class="im-channel-list-empty">未找到匹配渠道</div>\
                      </div>\
                    </div>\
                    <div class="im-channel-panel">\
                      <div v-if="!selectedImChannel" class="im-channel-panel--empty">\
                        请在左侧选择一个渠道进行配置\
                      </div>\
                      <div v-else>\
                        <div class="im-channel-panel-head">\
                          <div class="im-channel-panel-top">\
                            <div class="im-channel-panel-title">\
                              <span class="im-channel-panel-icon">{{ selectedImChannel.emoji || imPlatformIcon(selectedImChannel) }}</span>\
                              <div>\
                                <h3 class="im-channel-panel-name">{{ selectedImChannel.name || selectedImChannel.label }}</h3>\
                                <p class="im-channel-panel-desc">{{ selectedImChannel.description || \'\' }}</p>\
                              </div>\
                            </div>\
                            <div class="im-channel-panel-actions">\
                              <el-tag size="small" :type="messagingStateType(imConnectionStatus(selectedImChannel))">\
                                <span class="im-channel-status-dot" :class="imConnectionDotClass(selectedImChannel)"></span>\
                                {{ imConnectionLabel(selectedImChannel) }}\
                              </el-tag>\
                              <el-switch :model-value="!!selectedImChannel.enabled" @change="toggleImChannelEnabled(selectedImChannel)" active-text="启用" inactive-text="禁用" inline-prompt />\
                            </div>\
                          </div>\
                        </div>\
                        \
                        <div v-if="imConflictProfile" class="im-channel-conflict-hint">\
                          <el-alert type="error" :closable="false" show-icon>\
                            该凭据正被 profile「{{ imConflictProfile }}」使用，不能复用。请为当前专家单独创建机器人/应用。\
                          </el-alert>\
                        </div>\
                        \
                        <div class="im-channel-toolbar">\
                          <div class="im-channel-toolbar-left">\
                            <el-button link type="primary" @click="openImSetupGuide(selectedImChannel)">设置指南 ↗</el-button>\
                            <span v-if="!selectedImChannel.enabled" class="im-channel-inline-hint">渠道已禁用，开启右上角开关并填写凭据后保存生效</span>\
                          </div>\
                          <div class="im-channel-toolbar-right">\
                            <el-button type="primary" :loading="imSaving" @click="saveSelectedImChannel">保存</el-button>\
                            <el-tooltip content="保存或切换启用状态后，需重启 Gateway 才能加载/卸载平台适配器（MVP 不支持热加载）" placement="top" effect="dark">\
                              <el-button :loading="imRestarting" :disabled="imSaving" @click="restartImGateway">重启 Gateway</el-button>\
                            </el-tooltip>\
                          </div>\
                        </div>\
                        \
                        <div class="im-channel-section">\
                          <div class="im-channel-section-label im-channel-section-label--required">凭据配置</div>\
                          <div class="im-credential-form">\
                            <div v-for="field in selectedImChannel.credentialFields" :key="field.key" class="im-credential-row">\
                              <div>\
                                <div class="im-credential-label">{{ field.label }}<span v-if="field.required" class="im-cred-required">*</span></div>\
                                <div class="im-credential-desc">{{ field.description || \'\' }}</div>\
                              </div>\
                              <el-input v-model="imSecretDraft[field.key]" :type="field.password ? \'password\' : \'text\'" :placeholder="credentialPlaceholder(field)" show-password :class="\'im-credential-input\'" />\
                            </div>\
                          </div>\
                          <div class="im-channel-section-foot">凭据写入 <code>.env</code>，保存时校验唯一性（bot_id / client_id / app_id 不可跨专家复用）</div>\
                        </div>\
                        \
                        <div v-if="selectedImChannel.policyFields && selectedImChannel.policyFields.length" class="im-channel-section im-channel-policy-section">\
                          <el-collapse v-model="imPolicyCollapse" accordion>\
                            <el-collapse-item name="policy">\
                              <template #title>\
                                <span class="im-channel-section-label im-channel-policy-title">访问策略</span>\
                                <span class="im-channel-policy-summary">{{ imPolicySummary(selectedImChannel) }}</span>\
                              </template>\
                              <div class="im-channel-section-foot">写入 <code>config.yaml</code> / <code>.env</code>，留空使用默认值</div>\
                              <div class="im-credential-form">\
                                <div v-for="field in selectedImChannel.policyFields" :key="field.key" class="im-credential-row">\
                                  <div>\
                                    <div class="im-credential-label">{{ field.label }}</div>\
                                    <div class="im-credential-desc">{{ field.description || \'\' }}</div>\
                                  </div>\
                                  <div class="im-credential-input">\
                                    <el-switch v-if="field.type === \'switch\'" :model-value="imPolicySwitchValue(field)" @change="imPolicyDraft[field.key] = $event ? \'true\' : \'false\'" />\
                                    <el-select v-else-if="field.type === \'select\'" :model-value="getImPolicyDisplayValue(field)" @change="imPolicyDraft[field.key] = $event" placeholder="请选择" style="width:100%">\
                                      <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />\
                                    </el-select>\
                                    <el-input v-else v-model="imPolicyDraft[field.key]" :placeholder="getImPolicyDisplayValue(field) || \'请输入\'" />\
                                  </div>\
                                </div>\
                              </div>\
                            </el-collapse-item>\
                          </el-collapse>\
                        </div>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
            </el-tabs>\
        </div>\
        </div>\
        </div>\
        <expert-edit-page-dialog :edit="expertEdit" header-title="编辑基本信息" :tag-colors="tagColors" />\
        <!-- 新建任务对话框 -->\
        <el-dialog v-model="newTaskDialogVisible" title="新建任务" width="420px" :close-on-click-modal="false" append-to-body>\
          <el-form label-position="top">\
            <el-form-item label="任务标题" required>\
              <el-input v-model="newTaskTitle" placeholder="输入任务标题..." @keyup.enter="submitNewTask" />\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <el-button @click="newTaskDialogVisible = false">取消</el-button>\
            <el-button type="primary" @click="submitNewTask">创建</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="workspaceFolderDialogVisible" :title="workspaceFolderDialogMode === \'rename\' ? \'重命名\' : \'新建文件夹\'" width="420px" :close-on-click-modal="false" append-to-body>\
          <el-form label-position="top">\
            <el-form-item :label="workspaceFolderDialogMode === \'rename\' ? \'名称\' : \'文件夹名称\'" required>\
              <el-input v-model="workspaceFolderName" placeholder="请输入名称" maxlength="60" show-word-limit @keyup.enter="submitWorkspaceFolderDialog" />\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <el-button @click="workspaceFolderDialogVisible = false">取消</el-button>\
            <el-button type="primary" @click="submitWorkspaceFolderDialog">保存</el-button>\
          </template>\
        </el-dialog>\
        <!-- 文件预览对话框 -->\
        <el-dialog v-model="artifactPreviewVisible" title="文件预览" width="560px" append-to-body @closed="artifactPreviewItem = null">\
          <div v-if="artifactPreviewItem" style="max-height:400px;overflow:auto">\
            <div style="margin-bottom:12px">\
              <el-tag size="small" type="info">{{ artifactTypeLabel[artifactPreviewItem.type] || artifactPreviewItem.type }}</el-tag>\
              <span style="margin-left:8px;color:#909399;font-size:12px">{{ artifactPreviewItem.createdAt }}</span>\
            </div>\
            <h3 style="margin:0 0 12px 0;font-size:16px">{{ artifactPreviewItem.title }}</h3>\
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:#303133;background:#f5f7fa;padding:16px;border-radius:6px">{{ artifactPreviewItem.content || \'暂无内容\' }}</div>\
          </div>\
          <template #footer>\
            <el-button @click="artifactPreviewVisible = false">关闭</el-button>\
            <el-button type="primary" @click="downloadArtifact(artifactPreviewItem); artifactPreviewVisible = false">下载</el-button>\
          </template>\
        </el-dialog>\
        <!-- 文件预览对话框 -->\
        <el-dialog v-model="materialPreviewVisible" title="文件预览" width="560px" append-to-body @closed="materialPreviewItem = null">\
          <div v-if="materialPreviewItem" style="max-height:400px;overflow:auto">\
            <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">\
              <span style="font-size:20px">{{ fileTypeIcon(materialPreviewItem.type) }}</span>\
              <span style="font-weight:600">{{ materialPreviewItem.name }}</span>\
              <span style="color:#909399;font-size:12px">{{ formatFileSize(materialPreviewItem.size) }}</span>\
            </div>\
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:#303133;background:#f5f7fa;padding:16px;border-radius:6px">{{ materialPreviewItem.content || \'（该文件类型暂不支持预览，可下载后查看）\' }}</div>\
          </div>\
          <template #footer>\
            <el-button @click="materialPreviewVisible = false">关闭</el-button>\
            <el-button type="primary" @click="downloadMaterial(materialPreviewItem); materialPreviewVisible = false">下载</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="memoryDialogVisible" :title="memoryDialogMode === \'edit\' ? \'编辑记忆\' : \'新增记忆\'" width="520px" append-to-body class="form-dialog memory-dialog">\
          <el-form label-position="top">\
            <el-form-item label="分类">\
              <el-select v-model="memoryForm.category" style="width:100%">\
                <el-option label="用户偏好" value="user_preference" />\
                <el-option label="项目背景" value="project_context" />\
                <el-option label="领域知识" value="domain_knowledge" />\
                <el-option label="其他" value="other" />\
              </el-select>\
            </el-form-item>\
            <el-form-item label="内容">\
              <el-input v-model="memoryForm.content" type="textarea" :rows="6" placeholder="请输入记忆内容" />\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <el-button v-if="memoryDialogMode === \'edit\'" type="danger" plain @click="deleteMemoryFromDialog">删除</el-button>\
            <el-button @click="memoryDialogVisible = false">取消</el-button>\
            <el-button type="primary" @click="saveMemoryDialog">保存</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="skillPickerVisible" title="添加技能" width="640px" append-to-body class="form-dialog capability-picker-dialog">\
          <div class="capability-picker-head">\
            <el-input v-model="skillPickerSearch" placeholder="搜索技能名称、分类..." size="small" clearable class="member-picker-search" />\
            <span class="member-picker-count">可选 {{ skillPickerOptions.length }} 项</span>\
          </div>\
          <el-table\
            :data="skillPickerOptions"\
            stripe\
            max-height="360"\
            class="toolset-table capability-picker-table"\
            empty-text="暂无可添加技能（均已配给或未安装）"\
            @selection-change="onSkillPickerSelection"\
          >\
            <el-table-column type="selection" width="48" />\
            <el-table-column label="技能" min-width="140">\
              <template #default="{ row }">\
                <div class="toolset-name-cell">{{ row.name || row.skillId }}</div>\
                <div class="toolset-id-cell">{{ row.skillId }}</div>\
              </template>\
            </el-table-column>\
            <el-table-column prop="category" label="分类" width="110" show-overflow-tooltip />\
            <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />\
          </el-table>\
          <template #footer>\
            <el-button @click="skillPickerVisible = false">取消</el-button>\
            <el-button type="primary" :loading="capabilitySaving" @click="confirmSkillPicker">添加所选</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="toolPickerVisible" title="添加工具" width="640px" append-to-body class="form-dialog capability-picker-dialog">\
          <div class="capability-picker-head">\
            <el-input v-model="toolPickerSearch" placeholder="搜索工具..." size="small" clearable class="member-picker-search" />\
            <span class="member-picker-count">可选 {{ toolPickerOptions.length }} 项</span>\
          </div>\
          <el-table\
            :data="toolPickerOptions"\
            stripe\
            max-height="360"\
            class="toolset-table capability-picker-table"\
            empty-text="暂无可添加工具（均已配置）"\
            @selection-change="onToolPickerSelection"\
          >\
            <el-table-column type="selection" width="48" />\
            <el-table-column label="Toolset" min-width="140">\
              <template #default="{ row }">\
                <div class="toolset-name-cell">{{ row.label || row.toolset }}</div>\
                <div class="toolset-id-cell">{{ row.toolset }}</div>\
              </template>\
            </el-table-column>\
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />\
          </el-table>\
          <template #footer>\
            <el-button @click="toolPickerVisible = false">取消</el-button>\
            <el-button type="primary" :loading="capabilitySaving" @click="confirmToolPicker">添加所选</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="hubInstallDialogVisible" title="从 Hub 安装技能" width="600px" append-to-body class="form-dialog capability-picker-dialog">\
          <div v-if="hubInstalling" class="hub-install-progress">\
            <div class="hub-install-progress-text">正在安装技能… {{ hubInstallProgress }}%</div>\
            <el-progress :percentage="hubInstallProgress" :stroke-width="8" />\
          </div>\
          <template v-else>\
            <div class="capability-picker-head">\
              <el-input v-model="hubInstallSearch" placeholder="搜索 Hub 技能..." size="small" clearable class="member-picker-search" />\
              <span class="member-picker-count">可选 {{ hubSkillOptions.length }} 项</span>\
            </div>\
            <el-table :data="hubSkillOptions" stripe max-height="360" class="toolset-table capability-picker-table" empty-text="暂无可安装的 Hub 技能">\
              <el-table-column label="技能" min-width="160">\
                <template #default="{ row }">\
                  <div class="toolset-name-cell">{{ row.name }}</div>\
                  <div class="toolset-id-cell">{{ row.id }}</div>\
                </template>\
              </el-table-column>\
              <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip />\
              <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />\
              <el-table-column label="操作" width="90" align="center">\
                <template #default="{ row }">\
                  <el-button link type="primary" size="small" @click="installHubSkill(row)">安装</el-button>\
                </template>\
              </el-table-column>\
            </el-table>\
          </template>\
          <template #footer>\
            <el-button @click="hubInstallDialogVisible = false">关闭</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="workspaceRootDialogVisible" title="更改工作空间根路径" width="480px" append-to-body class="form-dialog">\
          <p style="margin-bottom:12px;color:var(--text-secondary,#606266);font-size:13px">更改工作空间根路径可能导致已有文件引用失效，请谨慎操作。</p>\
          <el-input v-model="workspaceRootInput" placeholder="如：~/.hermes/profiles/expert/workspace" />\
          <template #footer>\
            <el-button @click="workspaceRootDialogVisible = false">取消</el-button>\
            <el-button type="primary" @click="submitWorkspaceRootChange">确认更改</el-button>\
          </template>\
        </el-dialog>\
      </div>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };


  window.ExpertDetailPage = ExpertDetailPage;
})();
