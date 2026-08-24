/**
 * 专家管理详情页 — 人设 / 工作空间 / 任务 / 记忆 / 技能 / 工具 / MCP / IM渠道
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
      if (activeTab.value === 'mcp-servers') activeTab.value = 'mcp';
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
      var mcpServers = Vue.ref([]);
      var mcpSaving = Vue.ref(false);
      var mcpTesting = Vue.ref(false);
      var mcpRowTestingName = Vue.ref('');
      var mcpFormTestResult = Vue.ref(null);
      var mcpFormVisible = Vue.ref(false);
      var mcpFormMode = Vue.ref('create');
      var mcpEditingName = Vue.ref('');
      var mcpSecretVisible = Vue.ref(false);
      var mcpSecretTarget = Vue.ref(null);
      var mcpSecretDraft = Vue.ref({});
      var mcpDetailVisible = Vue.ref(false);
      var mcpDetailTarget = Vue.ref(null);
      var mcpDetailTools = Vue.ref([]);
      var mcpDetailLoading = Vue.ref(false);
      var mcpDetailError = Vue.ref('');
      var mcpHubDialogVisible = Vue.ref(false);
      var mcpHubTab = Vue.ref('imported');
      var mcpHubInstalling = Vue.ref(false);
      var mcpHubInstallProgress = Vue.ref(0);
      var mcpHubTableRef = Vue.ref(null);
      var mcpHubSelectedById = Vue.ref({});
      var mcpHubSelectionSyncing = false;
      var mcpForm = Vue.ref({
        name: '',
        transport: 'streamable_http',
        url: '',
        envText: '',
        secretKey: '',
        secretValue: '',
        asSecret: false,
        enabled: true
      });
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
      var hubInstallDialogVisible = Vue.ref(false);
      var hubInstallTab = Vue.ref('mine');
      var hubInstalling = Vue.ref(false);
      var hubInstallProgress = Vue.ref(0);
      var hubSkillTableRef = Vue.ref(null);
      var hubSelectedById = Vue.ref({});
      var hubSelectionSyncing = false;

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
      var skillSearchQuery = Vue.ref('');
      var skillEnabledFilter = Vue.ref('all');
      var toolSearchQuery = Vue.ref('');
      var toolEnabledFilter = Vue.ref('all');
      var toolConfigDrawerVisible = Vue.ref(false);
      var toolConfigTarget = Vue.ref(null);
      var toolConfigDraft = Vue.ref({});
      var toolDetailVisible = Vue.ref(false);
      var toolDetailTarget = Vue.ref(null);
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
        ctx.emit('nav', '/experts/' + expert.value.id + '/tasks/' + task.id + '?starting=1');
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
        if (store.ensureDemoWorkspace) store.ensureDemoWorkspace(eid);
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
        toolBindings.value = (store.getConfigurableToolsets
          ? store.getConfigurableToolsets(eid)
          : store.getToolBindings(eid)).slice();
        mcpServers.value = store.getMcpServers(eid).slice();
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
          connectionHint: c.connectionHint || '',
          enabled: false,
          configured: false,
          pendingRestart: false,
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
          out.connectionHint = template.connectionHint || out.connectionHint || '';
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
        // MVP：人设仅下次会话生效，不提供「立即生效」
        if (count > 0) {
          ElementPlus.ElMessage.success(
            '已保存。修改将在新会话生效；该专家当前有 ' + count + ' 个运行中会话，仍使用旧人设。'
          );
        } else {
          ElementPlus.ElMessage.success('已保存。修改将在新会话生效。');
        }
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
        var cwd = task && task.cwd != null ? String(task.cwd).trim() : '';
        if (!cwd || cwd === '.' || cwd === './' || cwd === '/' || cwd === '-' || cwd === '\\') {
          return '工作空间';
        }
        var root = String(workspaceRootPath.value || '').replace(/\\/g, '/').replace(/\/+$/, '');
        var normalized = cwd.replace(/\\/g, '/').replace(/\/+$/, '');
        if (root && normalized === root) return '工作空间';
        return cwd;
      }

      /** 将 cwd 规范为相对工作空间根的路径段；根目录返回空数组 */
      function normalizeCwdParts(cwd) {
        var raw = String(cwd || '').trim();
        if (!raw || raw === '.' || raw === './') return [];
        var normalized = raw.replace(/\\/g, '/').replace(/\/+$/, '');
        var root = String(workspaceRootPath.value || '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (root) {
          if (normalized === root) return [];
          if (normalized.indexOf(root + '/') === 0) {
            normalized = normalized.slice(root.length + 1);
          }
        }
        if (!normalized || normalized === '.' || normalized === '/') return [];
        return normalized.split('/').filter(function (p) { return p && p !== '.'; });
      }

      /** 按路径段解析文件夹；未找到返回 null */
      function resolveWorkspaceFolderByParts(parts) {
        if (!parts || !parts.length) return null;
        var parentId = null;
        var found = null;
        var folders = materials.value.filter(function (f) { return f.kind === 'folder'; });
        for (var i = 0; i < parts.length; i++) {
          var segment = parts[i];
          found = folders.find(function (f) {
            var pid = f.parentId != null && f.parentId !== '' ? String(f.parentId) : null;
            return pid === parentId && f.name === segment;
          }) || null;
          if (!found) return null;
          parentId = String(found.id);
        }
        return found;
      }

      /** 按名称在整棵树中查找文件夹（兼容 cwd 只存目录名） */
      function findWorkspaceFolderByName(name) {
        if (!name) return null;
        return materials.value.find(function (f) {
          return f.kind === 'folder' && f.name === name;
        }) || null;
      }

      /** 确保路径上的文件夹存在，返回最深一层 */
      function ensureWorkspaceFolderPath(parts) {
        if (!parts || !parts.length) return null;
        var parentId = null;
        var folder = null;
        for (var i = 0; i < parts.length; i++) {
          var segment = parts[i];
          folder = materials.value.find(function (f) {
            var pid = f.parentId != null && f.parentId !== '' ? String(f.parentId) : null;
            return f.kind === 'folder' && pid === parentId && f.name === segment;
          }) || null;
          if (!folder) {
            folder = store.addWorkspaceFolder(props.expertId, { name: segment, parentId: parentId });
            materials.value = store.getWorkspaceFiles(props.expertId);
          }
          parentId = String(folder.id);
        }
        return folder;
      }

      function goToWorkspaceFromTask(task) {
        // 工作空间 demo / 本地目录可能尚未加载
        if (store.ensureDemoWorkspace) store.ensureDemoWorkspace(props.expertId);
        materials.value = store.getWorkspaceFiles(props.expertId);

        var cwd = task && task.cwd != null ? String(task.cwd).trim() : '';
        var parts = normalizeCwdParts(cwd);
        var folder = resolveWorkspaceFolderByParts(parts);
        if (!folder && parts.length === 1) {
          folder = findWorkspaceFolderByName(parts[0]);
        }
        // 目录尚不存在时按路径创建，保证能定位进去
        if (!folder && parts.length) {
          folder = ensureWorkspaceFolderPath(parts);
        }

        if (folder) {
          workspaceCurrentFolderId.value = folder.id;
          highlightSessionId.value = folder.name;
        } else {
          workspaceCurrentFolderId.value = null;
          highlightSessionId.value = '';
        }
        activeTab.value = 'workspace';
      }

      function openPlatformImportDialog() {
        hubInstallTab.value = 'mine';
        hubSelectedById.value = {};
        hubInstallDialogVisible.value = true;
      }
      function hubSkillDisplayName(skill) {
        return (skill && (skill.nameZh || skill.name)) || (skill && (skill.englishId || skill.id)) || '';
      }
      function hubSkillEnglishId(skill) {
        return (skill && (skill.englishId || skill.name || skill.id)) || '';
      }
      var hubSkillOptions = Vue.computed(function () {
        var tab = hubInstallTab.value || 'mine';
        var installed = {};
        skillBindings.value.forEach(function (s) { installed[s.skillId] = true; });
        return (window.SKILLS_HUB_CATALOG || []).filter(function (s) {
          if (installed[s.id]) return false;
          return (s.scope || 'mine') === tab;
        });
      });
      var hubSelectedCount = Vue.computed(function () {
        return Object.keys(hubSelectedById.value).length;
      });
      function syncHubTableSelection() {
        var table = hubSkillTableRef.value;
        if (!table || typeof table.clearSelection !== 'function') return;
        hubSelectionSyncing = true;
        table.clearSelection();
        hubSkillOptions.value.forEach(function (row) {
          if (hubSelectedById.value[row.id]) table.toggleRowSelection(row, true);
        });
        Vue.nextTick(function () { hubSelectionSyncing = false; });
      }
      function onHubSkillSelectionChange(rows) {
        if (hubSelectionSyncing) return;
        var visible = {};
        hubSkillOptions.value.forEach(function (s) { visible[s.id] = true; });
        var next = Object.assign({}, hubSelectedById.value);
        Object.keys(visible).forEach(function (id) { delete next[id]; });
        (rows || []).forEach(function (row) {
          if (row && row.id) next[row.id] = row;
        });
        hubSelectedById.value = next;
      }
      Vue.watch(hubSkillOptions, function () {
        Vue.nextTick(syncHubTableSelection);
      });
      Vue.watch(hubInstallDialogVisible, function (visible) {
        if (visible) Vue.nextTick(syncHubTableSelection);
      });
      function installSelectedHubSkills() {
        var ids = Object.keys(hubSelectedById.value);
        if (!ids.length) {
          ElementPlus.ElMessage.warning('请先勾选要导入的技能');
          return;
        }
        var skills = ids.map(function (id) { return hubSelectedById.value[id]; });
        hubInstalling.value = true;
        hubInstallProgress.value = 0;
        var timer = setInterval(function () {
          hubInstallProgress.value = Math.min(100, hubInstallProgress.value + 20);
          if (hubInstallProgress.value < 100) return;
          clearInterval(timer);
          var chain = Promise.resolve();
          skills.forEach(function (skill) {
            chain = chain.then(function () {
              var displayName = hubSkillDisplayName(skill);
              var payload = Object.assign({}, skill, {
                name: displayName,
                englishId: hubSkillEnglishId(skill)
              });
              return store.installHubSkill(props.expertId, payload);
            });
          });
          chain.then(function () {
            hubInstalling.value = false;
            skillBindings.value = store.getSkillBindings(props.expertId).slice();
            hubSelectedById.value = {};
            hubInstallDialogVisible.value = false;
            var running = runningSessionCount.value;
            var n = skills.length;
            var msg = running > 0
              ? '已从平台导入 ' + n + ' 个技能，默认已启用。该专家当前有 ' + running + ' 个运行中会话，修改将在新会话生效。'
              : '已从平台导入 ' + n + ' 个技能，默认已启用。修改将在新会话生效。';
            ElementPlus.ElMessage.success(msg);
          }).catch(function () {
            hubInstalling.value = false;
            ElementPlus.ElMessage.error('导入失败，请重试');
          });
        }, 400);
      }

      var skillLocalImportInput = Vue.ref(null);
      var localSkillUploading = Vue.ref(false);

      function triggerLocalSkillUpload() {
        if (skillLocalImportInput.value) skillLocalImportInput.value.click();
      }

      function parseLocalSkillFile(file) {
        var rawName = (file && file.name) || 'local-skill';
        var base = rawName.replace(/\.(zip|md|json|skill)$/i, '').replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]+/g, '-');
        if (!base) base = 'local-skill';
        var id = 'local-' + base.toLowerCase().replace(/\s+/g, '-');
        return {
          id: id,
          name: base,
          description: '从本地文件「' + rawName + '」导入',
          category: 'local',
          provenance: 'local'
        };
      }

      function handleLocalSkillUpload(e) {
        var file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        var okExt = /\.(zip|md|json|skill)$/i.test(file.name || '');
        if (!okExt) {
          ElementPlus.ElMessage.warning('请上传 .zip / .md / .json 技能包');
          return;
        }
        var skill = parseLocalSkillFile(file);
        var installed = skillBindings.value.some(function (s) { return s.skillId === skill.id; });
        if (installed) {
          ElementPlus.ElMessage.warning('技能「' + skill.name + '」已存在');
          return;
        }
        localSkillUploading.value = true;
        store.installLocalSkill(props.expertId, skill).then(function () {
          skillBindings.value = store.getSkillBindings(props.expertId).slice();
          localSkillUploading.value = false;
          var count = runningSessionCount.value;
          var msg = count > 0
            ? '已本地上传「' + skill.name + '」，默认已启用。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : '已本地上传「' + skill.name + '」，默认已启用。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function (err) {
          localSkillUploading.value = false;
          ElementPlus.ElMessage.error((err && err.message) || '本地上传失败');
        });
      }

      function toggleSkillEnabled(row, enabled) {
        var next = !!enabled;
        capabilitySaving.value = true;
        store.toggleSkillEnabled(props.expertId, row.skillId, next).then(function () {
          skillBindings.value = store.getSkillBindings(props.expertId).slice();
          var count = runningSessionCount.value;
          var label = next ? '已启用' : '已禁用';
          var msg = count > 0
            ? label + '。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : label + '。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function (err) {
          skillBindings.value = store.getSkillBindings(props.expertId).slice();
          ElementPlus.ElMessage.error((err && err.message) || '启停失败，请重试');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function deleteSkill(row) {
        if (!row || !row.skillId) return;
        var label = row.name || row.skillId;
        ElementPlus.ElMessageBox.confirm(
          '确定删除技能「' + label + '」？删除后可从平台重新导入或本地上传。',
          '删除技能',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          capabilitySaving.value = true;
          return store.uninstallSkill(props.expertId, row.skillId);
        }).then(function () {
          skillBindings.value = store.getSkillBindings(props.expertId).slice();
          var count = runningSessionCount.value;
          var msg = count > 0
            ? '已删除技能「' + label + '」。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : '已删除技能「' + label + '」。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function (err) {
          if (err === 'cancel' || (err && err === 'close')) return;
          skillBindings.value = store.getSkillBindings(props.expertId).slice();
          ElementPlus.ElMessage.error((err && err.message) || '删除失败，请重试');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function formatSkillLastUsed(iso) {
        if (!iso) return '—';
        var t = new Date(iso).getTime();
        if (isNaN(t)) return '—';
        var diff = Date.now() - t;
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 3600 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
        if (diff < 24 * 3600 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
        if (diff < 48 * 3600 * 1000) return '昨天';
        if (diff < 7 * 24 * 3600 * 1000) return Math.floor(diff / (24 * 3600000)) + ' 天前';
        return new Date(iso).toLocaleDateString();
      }

      function skillProvenanceLabel(p) {
        if (p === 'hub') return '平台';
        if (p === 'local') return '本地';
        if (p === 'agent') return 'agent';
        return 'bundled';
      }

      function skillProvenanceTagType(p) {
        if (p === 'hub') return 'success';
        if (p === 'local') return 'warning';
        if (p === 'agent') return '';
        return 'info';
      }

      function refreshToolsets() {
        var eid = String(props.expertId);
        toolBindings.value = (store.getConfigurableToolsets
          ? store.getConfigurableToolsets(eid)
          : store.getToolBindings(eid)).slice();
      }

      function toggleToolEnabled(row, enabled) {
        var next = !!enabled;
        var toolId = getToolsetId(row);
        capabilitySaving.value = true;
        var op = store.toggleToolEnabled
          ? store.toggleToolEnabled(props.expertId, toolId, next)
          : store.toggleToolBinding(props.expertId, toolId, next);
        Promise.resolve(op).then(function () {
          refreshToolsets();
          var count = runningSessionCount.value;
          var label = next ? '已启用' : '已禁用';
          var msg = count > 0
            ? label + '。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
            : label + '。修改将在新会话生效。';
          ElementPlus.ElMessage.success(msg);
        }).catch(function (err) {
          refreshToolsets();
          ElementPlus.ElMessage.error((err && err.message) || '启停失败，请重试');
        }).finally(function () { capabilitySaving.value = false; });
      }

      function mcpEffectToast(actionLabel) {
        var count = runningSessionCount.value;
        return count > 0
          ? actionLabel + '。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
          : actionLabel + '。修改将在新会话生效。';
      }

      function refreshMcpServers() {
        mcpServers.value = store.getMcpServers(props.expertId).slice();
      }

      function resetMcpForm() {
        mcpFormMode.value = 'create';
        mcpEditingName.value = '';
        mcpFormTestResult.value = null;
        mcpForm.value = {
          name: '',
          transport: 'streamable_http',
          url: '',
          envText: '',
          secretKey: '',
          secretValue: '',
          asSecret: false,
          enabled: true
        };
      }

      function openMcpForm() {
        resetMcpForm();
        mcpFormVisible.value = true;
      }

      function resolveMcpTransport(row) {
        if (!row) return 'streamable_http';
        if (row.transport === 'sse' || row.transport === 'SSE') return 'sse';
        if (row.transport === 'streamable_http' || row.transport === 'streamable-http') return 'streamable_http';
        return 'streamable_http';
      }

      function openMcpEditForm(row) {
        if (!row) return;
        mcpFormTestResult.value = null;
        var env = row.env || {};
        var envText = Object.keys(env).map(function (k) {
          return k + '=' + (env[k] == null ? '' : env[k]);
        }).join('\n');
        var missing = row.missingEnv || [];
        mcpFormMode.value = 'edit';
        mcpEditingName.value = row.name || '';
        mcpForm.value = {
          name: row.name || '',
          transport: resolveMcpTransport(row),
          url: row.url || '',
          envText: envText,
          secretKey: missing[0] || '',
          secretValue: '',
          asSecret: missing.length > 0,
          enabled: row.enabled !== false
        };
        mcpFormVisible.value = true;
      }

      Vue.watch(mcpForm, function () {
        if (mcpFormVisible.value && !mcpTesting.value) mcpFormTestResult.value = null;
      }, { deep: true });

      function buildMcpFormPayload() {
        var f = mcpForm.value;
        return {
          name: (f.name || '').trim(),
          type: 'http',
          transport: f.transport === 'sse' ? 'sse' : 'streamable_http',
          url: (f.url || '').trim(),
          envText: f.envText || '',
          secretKey: f.asSecret ? (f.secretKey || '').trim() : '',
          secretValue: f.asSecret ? (f.secretValue || '') : '',
          asSecret: !!f.asSecret,
          enabled: !!f.enabled
        };
      }

      function mcpUrlPlaceholder() {
        return mcpForm.value.transport === 'sse'
          ? 'https://example.com/sse'
          : 'https://example.com/mcp';
      }

      function openMcpPlatformImportDialog() {
        mcpHubTab.value = 'imported';
        mcpHubSelectedById.value = {};
        mcpHubDialogVisible.value = true;
      }

      function mcpHubDisplayName(item) {
        return (item && (item.nameZh || item.name)) || (item && (item.englishId || item.id)) || '';
      }

      function mcpHubEnglishId(item) {
        return (item && (item.englishId || item.name || item.id)) || '';
      }

      var mcpHubOptions = Vue.computed(function () {
        var tab = mcpHubTab.value || 'imported';
        var installed = {};
        mcpServers.value.forEach(function (s) { installed[s.name] = true; });
        return (window.MCP_HUB_CATALOG || []).filter(function (s) {
          var eid = mcpHubEnglishId(s);
          if (installed[eid]) return false;
          return (s.scope || 'imported') === tab;
        });
      });

      var mcpHubSelectedCount = Vue.computed(function () {
        return Object.keys(mcpHubSelectedById.value).length;
      });

      function syncMcpHubTableSelection() {
        var table = mcpHubTableRef.value;
        if (!table || typeof table.clearSelection !== 'function') return;
        mcpHubSelectionSyncing = true;
        table.clearSelection();
        mcpHubOptions.value.forEach(function (row) {
          if (mcpHubSelectedById.value[row.id]) table.toggleRowSelection(row, true);
        });
        Vue.nextTick(function () { mcpHubSelectionSyncing = false; });
      }

      function onMcpHubSelectionChange(rows) {
        if (mcpHubSelectionSyncing) return;
        var visible = {};
        mcpHubOptions.value.forEach(function (s) { visible[s.id] = true; });
        var next = Object.assign({}, mcpHubSelectedById.value);
        Object.keys(visible).forEach(function (id) { delete next[id]; });
        (rows || []).forEach(function (row) {
          if (row && row.id) next[row.id] = row;
        });
        mcpHubSelectedById.value = next;
      }

      Vue.watch(mcpHubOptions, function () {
        Vue.nextTick(syncMcpHubTableSelection);
      });
      Vue.watch(mcpHubDialogVisible, function (visible) {
        if (visible) Vue.nextTick(syncMcpHubTableSelection);
      });

      function installSelectedHubMcps() {
        var ids = Object.keys(mcpHubSelectedById.value);
        if (!ids.length) {
          ElementPlus.ElMessage.warning('请先勾选要导入的 MCP 服务');
          return;
        }
        var items = ids.map(function (id) { return mcpHubSelectedById.value[id]; });
        mcpHubInstalling.value = true;
        mcpHubInstallProgress.value = 0;
        var timer = setInterval(function () {
          mcpHubInstallProgress.value = Math.min(100, mcpHubInstallProgress.value + 20);
          if (mcpHubInstallProgress.value < 100) return;
          clearInterval(timer);
          var chain = Promise.resolve();
          items.forEach(function (item) {
            chain = chain.then(function () {
              var env = item.env || {};
              var envText = Object.keys(env).map(function (k) {
                return k + '=' + (env[k] == null ? '' : env[k]);
              }).join('\n');
              return store.addMcpServer(props.expertId, {
                name: mcpHubEnglishId(item),
                type: 'http',
                transport: item.transport === 'sse' ? 'sse' : 'streamable_http',
                url: item.url || '',
                envText: envText,
                enabled: true,
                validation: {
                  status: 'available',
                  errorSummary: '',
                  toolCount: item.toolCount || (item.tools || []).length,
                  tools: item.tools || [],
                  testedAt: new Date().toISOString()
                }
              });
            });
          });
          chain.then(function () {
            mcpHubInstalling.value = false;
            refreshMcpServers();
            mcpHubSelectedById.value = {};
            mcpHubDialogVisible.value = false;
            ElementPlus.ElMessage.success(mcpEffectToast('已从平台导入 ' + items.length + ' 项 MCP 服务'));
          }).catch(function (err) {
            mcpHubInstalling.value = false;
            refreshMcpServers();
            ElementPlus.ElMessage.error((err && err.message) || '导入失败，请重试');
          });
        }, 400);
      }

      function submitMcpForm() {
        var payload = buildMcpFormPayload();
        if (!mcpFormTestResult.value || mcpFormTestResult.value.status !== 'available') {
          ElementPlus.ElMessage.warning('请先测试连接，连接成功后再保存');
          return;
        }
        payload.validation = mcpFormTestResult.value;
        var isEdit = mcpFormMode.value === 'edit';
        var editingName = mcpEditingName.value;
        mcpSaving.value = true;
        var action = isEdit
          ? store.updateMcpServerFromForm(props.expertId, editingName, payload)
          : store.addMcpServer(props.expertId, payload);
        action.then(function () {
          refreshMcpServers();
          mcpFormVisible.value = false;
          ElementPlus.ElMessage.success(mcpEffectToast(isEdit ? '已更新 MCP 服务' : '已添加 MCP 服务'));
        }).catch(function (err) {
          ElementPlus.ElMessage.error((err && err.message) || (isEdit ? '保存失败' : '添加失败'));
        }).finally(function () { mcpSaving.value = false; });
      }

      function testMcpFormConnection() {
        var payload = buildMcpFormPayload();
        mcpTesting.value = true;
        mcpFormTestResult.value = null;
        function revealResult() {
          Vue.nextTick(function () {
            var resultEl = document.querySelector('.ed-dialog-mcp .mcp-test-result');
            if (resultEl && resultEl.scrollIntoView) resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
        store.testMcpConnection(props.expertId, payload).then(function (result) {
          mcpFormTestResult.value = result;
          revealResult();
        }).catch(function (err) {
          mcpFormTestResult.value = {
            status: 'unavailable',
            errorSummary: (err && err.message) || '连接失败，请检查配置',
            toolCount: 0,
            tools: []
          };
          revealResult();
        }).finally(function () { mcpTesting.value = false; });
      }

      function toggleMcpEnabled(row, enabled) {
        var next = enabled !== undefined ? !!enabled : !row.enabled;
        mcpSaving.value = true;
        store.toggleMcpServerEnabled(props.expertId, row.name, next).then(function () {
          refreshMcpServers();
          ElementPlus.ElMessage.success(mcpEffectToast(next ? '已启用' : '已禁用'));
        }).finally(function () { mcpSaving.value = false; });
      }

      function openMcpSecretForm(row) {
        mcpSecretTarget.value = row;
        var draft = {};
        (row.missingEnv || []).forEach(function (k) { draft[k] = ''; });
        if (!Object.keys(draft).length) draft.API_KEY = '';
        mcpSecretDraft.value = draft;
        mcpSecretVisible.value = true;
      }

      function submitMcpSecrets() {
        var target = mcpSecretTarget.value;
        if (!target) return;
        var secrets = Object.assign({}, mcpSecretDraft.value);
        var empty = Object.keys(secrets).filter(function (k) { return !(secrets[k] || '').trim(); });
        if (empty.length) {
          ElementPlus.ElMessage.warning('请填写：' + empty.join(', '));
          return;
        }
        mcpSaving.value = true;
        store.fillMcpSecrets(props.expertId, target.name, secrets).then(function () {
          refreshMcpServers();
          mcpSecretVisible.value = false;
          ElementPlus.ElMessage.success(mcpEffectToast('密钥已保存'));
        }).finally(function () { mcpSaving.value = false; });
      }

      function testMcpRowConnection(row) {
        if (!row) return;
        mcpRowTestingName.value = row.name;
        store.testMcpConnection(props.expertId, row).then(function (result) {
          return store.updateMcpServer(props.expertId, row.name, result).then(function () {
            refreshMcpServers();
            if (result.status === 'available') {
              ElementPlus.ElMessage.success('连接成功，发现 ' + result.toolCount + ' 个工具');
            } else {
              ElementPlus.ElMessage.error(result.errorSummary || '连接失败，请检查配置');
            }
          });
        }).catch(function (err) {
          ElementPlus.ElMessage.error((err && err.message) || '连接失败，请检查配置');
        }).finally(function () { mcpRowTestingName.value = ''; });
      }

      function normalizeMcpTools(tools) {
        return (Array.isArray(tools) ? tools : []).map(function (tool, index) {
          if (typeof tool === 'string') {
            return { name: tool, description: '暂无描述' };
          }
          tool = tool || {};
          return {
            name: tool.name || tool.id || ('工具 ' + (index + 1)),
            description: tool.description || tool.summary || '暂无描述'
          };
        });
      }

      function openMcpDetail(row) {
        if (!row) return;
        mcpDetailTarget.value = row;
        mcpDetailTools.value = normalizeMcpTools(row.tools);
        mcpDetailError.value = '';
        mcpDetailVisible.value = true;
        if (mcpDetailTools.value.length) return;

        mcpDetailLoading.value = true;
        store.testMcpConnection(props.expertId, row).then(function (result) {
          if (result.status !== 'available') {
            mcpDetailError.value = result.errorSummary || '暂时无法获取可调用工具';
            return;
          }
          mcpDetailTools.value = normalizeMcpTools(result.tools);
          mcpDetailTarget.value = Object.assign({}, row, result);
          return store.updateMcpServer(props.expertId, row.name, result).then(refreshMcpServers);
        }).catch(function (err) {
          mcpDetailError.value = (err && err.message) || '暂时无法获取可调用工具';
        }).finally(function () {
          mcpDetailLoading.value = false;
        });
      }

      function deleteMcpServer(row) {
        ElementPlus.ElMessageBox.confirm(
          '确定删除 MCP 服务「' + (row.name || row.id) + '」？删除后专家将无法使用该服务提供的工具。',
          '删除 MCP 服务',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          return store.deleteMcpServer(props.expertId, row.name);
        }).then(function () {
          refreshMcpServers();
          ElementPlus.ElMessage.success(mcpEffectToast('已删除'));
        }).catch(function () {});
      }

      function mcpStatusLabel(row) {
        if (row.status === 'available' || row.status === 'ok') return '可用';
        if (row.status === 'unavailable' || row.status === 'missing_secret' || row.status === 'connection_failed') return '不可用';
        return '未验证';
      }

      function mcpStatusClass(row) {
        if (row.status === 'available' || row.status === 'ok') return 'mcp-status--ok';
        if (row.status === 'unavailable' || row.status === 'missing_secret' || row.status === 'connection_failed') return 'mcp-status--error';
        return 'mcp-status--unverified';
      }

      function mcpStatusDetail(row) {
        if (mcpStatusLabel(row) === '不可用') return row.errorSummary || '连接失败，请检查服务配置';
        if (mcpStatusLabel(row) === '未验证') return '尚未测试连接，或配置已发生变化';
        return '连接正常，可获取工具列表';
      }

      function mcpToolCountLabel(row) {
        return mcpStatusLabel(row) === '可用' ? String(row.toolCount || 0) : '—';
      }

      function mcpTypeLabel(row) {
        if (!row) return '';
        if (row.type === 'stdio') return 'stdio';
        if (row.transport === 'sse') return 'SSE';
        return 'Streamable HTTP';
      }

      var mcpEnabledCount = Vue.computed(function () {
        return mcpServers.value.filter(function (s) { return s.enabled; }).length;
      });

      var mcpNeedsAttentionCount = Vue.computed(function () {
        return mcpServers.value.filter(function (s) {
          return s.enabled && mcpStatusLabel(s) !== '可用';
        }).length;
      });

      function saveSkillBindings() { store.setSkillBindings(props.expertId, skillBindings.value); ElementPlus.ElMessage.success('技能已更新'); }
      function saveToolBindings() {
        store.setToolBindings(props.expertId, toolBindings.value).then(function () {
          refreshToolsets();
          ElementPlus.ElMessage.success('工具已更新');
        });
      }
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
        if (ch.enabled && ch.configured) ch.pendingRestart = true;
        ch.state = imConnectionStatus(ch);
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
              ElementPlus.ElMessage.error('该凭据（' + secrets[lockField] + '）正被专家「' + imConflictProfile.value + '」使用，不能复用。');
              return;
            }
          }
          applyLocalImSecretState(ch, secrets, policy);
          store.saveImChannels(props.expertId, imChannels.value, { gatewayEnabled: imGatewayEnabled.value });
          imSecretDraft.value = {};
          imPolicyDraft.value = {};
          ElementPlus.ElMessage.success('配置已保存，请点击「应用配置」使其生效。');
          return;
        }
        if (!window.SidecarApi || !window.SidecarApi.putImChannels) return;
        imSaving.value = true;
        window.SidecarApi.putImChannels(String(props.expertId), payload).then(function (res) {
          imSaving.value = false;
          applyImChannelsResponse(res);
          imSecretDraft.value = {};
          imPolicyDraft.value = {};
          ElementPlus.ElMessage.success('配置已保存，请点击「应用配置」使其生效。');
        }).catch(function (err) {
          imSaving.value = false;
          var body = err && err.body;
          if (body && body.conflict_profile) {
            imConflictProfile.value = body.conflict_profile;
            ElementPlus.ElMessage.error('该凭据正被专家「' + body.conflict_profile + '」使用，不能复用。请为当前专家单独创建机器人或应用。');
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
          '确定删除该任务？相关对话将一并删除，任务产物会继续保留。', '删除任务',
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
        if (!file || file.kind === 'folder') return;
        if (file.source === 'generated') {
          deleteArtifact(file.raw);
          return;
        }
        if (file.source === 'upload') deleteMaterial(file.raw);
      }

      function deleteArtifact(item) {
        if (!item) return;
        ElementPlus.ElMessageBox.confirm(
          '确定删除任务产物「' + (item.title || '未命名文件') + '」？', '删除文件',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          store.deleteTaskArtifact(item.id);
          expertArtifacts.value = store.getExpertArtifacts(props.expertId);
          ElementPlus.ElMessage.success('文件已删除');
        }).catch(function () {});
      }

      function openCreateWorkspaceFolderDialog() {
        workspaceFolderDialogMode.value = 'create';
        workspaceEditingItem.value = null;
        workspaceFolderName.value = '';
        workspaceFolderDialogVisible.value = true;
      }

      function openRenameWorkspaceItem(file) {
        if (!file) return;
        if (file.source !== 'upload' && file.source !== 'generated') return;
        if (file.kind === 'folder' && file.source !== 'upload') return;
        workspaceFolderDialogMode.value = 'rename';
        workspaceEditingItem.value = file;
        workspaceFolderName.value = file.name || '';
        workspaceFolderDialogVisible.value = true;
      }

      var workspaceRenameDialogTitle = Vue.computed(function () {
        if (workspaceFolderDialogMode.value !== 'rename') return '新建文件夹';
        var item = workspaceEditingItem.value;
        if (item && item.kind === 'folder') return '重命名文件夹';
        return '重命名文件';
      });

      var workspaceRenameDialogSub = Vue.computed(function () {
        if (workspaceFolderDialogMode.value !== 'rename') return '整理工作空间中的文件与任务产物';
        var item = workspaceEditingItem.value;
        if (item && item.source === 'generated') return '修改任务产物显示名称';
        if (item && item.kind === 'folder') return '修改文件夹显示名称';
        return '修改文件显示名称';
      });

      function submitWorkspaceFolderDialog() {
        var name = workspaceFolderName.value.trim();
        if (!name) { ElementPlus.ElMessage.warning('请输入名称'); return; }
        if (/[\\/:*?"<>|]/.test(name)) { ElementPlus.ElMessage.warning('名称不能包含特殊字符'); return; }
        var editing = workspaceEditingItem.value;

        if (workspaceFolderDialogMode.value === 'rename' && editing && editing.source === 'generated') {
          var artDup = expertArtifacts.value.some(function (a) {
            if (String(a.id) === String(editing.raw.id)) return false;
            return String(a.taskId) === String(editing.taskId) && (a.title || '').trim() === name;
          });
          if (artDup) { ElementPlus.ElMessage.warning('同任务下已存在同名产物'); return; }
          store.renameTaskArtifact(editing.raw.id, name);
          expertArtifacts.value = store.getExpertArtifacts(props.expertId);
          workspaceFolderDialogVisible.value = false;
          ElementPlus.ElMessage.success('已重命名');
          return;
        }

        var parentId = workspaceFolderDialogMode.value === 'rename' && editing ? editing.parentId : (workspaceCurrentFolderId.value || null);
        var duplicate = materials.value.some(function (f) {
          if (workspaceFolderDialogMode.value === 'rename' && editing && String(f.id) === String(editing.raw.id)) return false;
          return String(f.parentId || '') === String(parentId || '') && (f.name || '').trim() === name;
        });
        if (duplicate) { ElementPlus.ElMessage.warning('当前目录下已存在同名项目'); return; }
        if (workspaceFolderDialogMode.value === 'rename' && editing) {
          store.renameWorkspaceItem(props.expertId, editing.raw.id, name);
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
        if (command === 'rename' && (file.source === 'upload' || file.source === 'generated')) {
          openRenameWorkspaceItem(file);
        }
        if (command === 'delete' && (file.source === 'upload' || file.source === 'generated')) {
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
        var count = runningSessionCount.value;
        if (memoryDialogMode.value === 'edit' && editingMemoryId.value) {
          store.updateMemory(editingMemoryId.value, { content: content, category: category });
        } else {
          store.addMemory(props.expertId, content, category);
        }
        // P1：记忆手动编辑仅下次会话生效（与人设一致，不提供「立即生效」）
        if (count > 0) {
          ElementPlus.ElMessage.success(
            '已保存。修改将在新会话生效；该专家当前有 ' + count + ' 个运行中会话，仍使用旧记忆。'
          );
        } else {
          ElementPlus.ElMessage.success('已保存。修改将在新会话生效。');
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
        var count = runningSessionCount.value;
        if (count > 0) {
          ElementPlus.ElMessage.success(
            '已保存。修改将在新会话生效；该专家当前有 ' + count + ' 个运行中会话，仍使用旧记忆。'
          );
        } else {
          ElementPlus.ElMessage.success('已保存。修改将在新会话生效。');
        }
      }

      function addMemoryWithCategory() {
        openCreateMemoryDialog();
      }

      // ---- 人设 Tab 方法 ----
      function exportPersonaMd() {
        var content = persona.value.soulMd || '';
        var filename = '专家人设.md';
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
        return '人设内容';
      }

      // ---- 技能 Tab 方法 ----
      var skillsCatalog = Vue.computed(function () {
        var meta = detailMeta.value || {};
        if (meta.skillsCatalog && meta.skillsCatalog.length) return meta.skillsCatalog;
        return store.getSkillsCatalog(props.expertId);
      });

      var installedSkillCount = Vue.computed(function () {
        return skillBindings.value.length;
      });

      var enabledSkillCount = Vue.computed(function () {
        return skillBindings.value.filter(function (s) { return s.enabled !== false; }).length;
      });

      var filteredSkills = Vue.computed(function () {
        var q = skillSearchQuery.value.trim().toLowerCase();
        var en = skillEnabledFilter.value;
        return skillBindings.value.filter(function (s) {
          if (en === 'enabled' && s.enabled === false) return false;
          if (en === 'disabled' && s.enabled !== false) return false;
          if (!q) return true;
          var name = (s.name || s.skillId || '').toLowerCase();
          var desc = (s.description || '').toLowerCase();
          var category = (s.category || '').toLowerCase();
          return name.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || category.indexOf(q) >= 0 ||
            String(s.skillId || '').toLowerCase().indexOf(q) >= 0;
        });
      });

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

      // ---- 工具 Tab 方法（全部可配置 + 开关，对齐 platform_toolsets.cli opt-in）----
      var toolsCatalog = Vue.computed(function () {
        var meta = detailMeta.value || {};
        if (meta.toolsCatalog && meta.toolsCatalog.length) return meta.toolsCatalog;
        return store.getToolsCatalog(props.expertId);
      });

      var enabledToolCount = Vue.computed(function () {
        return toolBindings.value.filter(function (t) { return t.enabled; }).length;
      });

      var totalToolCount = Vue.computed(function () {
        return toolBindings.value.length;
      });

      var filteredToolsets = Vue.computed(function () {
        var q = toolSearchQuery.value.trim().toLowerCase();
        var en = toolEnabledFilter.value;
        return toolBindings.value.filter(function (t) {
          if (en === 'enabled' && !t.enabled) return false;
          if (en === 'disabled' && t.enabled) return false;
          if (!q) return true;
          var label = (t.label || '').toLowerCase();
          var name = (t.name || t.toolset || t.toolId || '').toLowerCase();
          var desc = (t.description || '').toLowerCase();
          return label.indexOf(q) >= 0 || name.indexOf(q) >= 0 || desc.indexOf(q) >= 0;
        });
      });

      function isUserCancel(err) {
        return err === 'cancel' || err === 'close' || (err && err === 'Cancel');
      }

      function getToolsetId(b) {
        return (b && (b.toolset || b.toolId || b.name || b.id)) || '';
      }

      function toolsetPrimaryLabel(row) {
        return (row && (row.label || row.name || row.toolset || row.toolId)) || '';
      }

      /** 禁止 label 与 name 同文案重复堆叠 */
      function toolsetSecondaryId(row) {
        var label = String((row && row.label) || '').trim();
        var name = String((row && (row.name || row.toolset || row.toolId)) || '').trim();
        if (!name) return '';
        if (label && label.toLowerCase() === name.toLowerCase()) return '';
        return name;
      }

      function getToolInfo(toolId) {
        var binding = toolBindings.value.find(function (b) {
          return getToolsetId(b) === toolId;
        });
        if (binding) {
          return {
            name: toolsetPrimaryLabel(binding),
            description: binding.description || '暂无描述'
          };
        }
        var cat = toolsCatalog.value.find(function (t) { return (t.toolset || t.toolId || t.id) === toolId; });
        if (cat) {
          return {
            name: cat.label || cat.name || toolId,
            description: cat.description || '暂无描述'
          };
        }
        return { name: catalog.toolsetLabel ? catalog.toolsetLabel(toolId) : toolId, description: '暂无描述' };
      }

      function toolsetLabel(id) {
        return catalog.toolsetLabel ? catalog.toolsetLabel(id) : id;
      }

      function getToolCount(rowOrId) {
        if (rowOrId && typeof rowOrId === 'object') {
          if (rowOrId.toolCount != null) return rowOrId.toolCount;
          if (rowOrId.tools && rowOrId.tools.length) return rowOrId.tools.length;
          rowOrId = getToolsetId(rowOrId);
        }
        var toolId = rowOrId;
        var cat = toolsCatalog.value.find(function (t) {
          return (t.toolset || t.toolId || t.id) === toolId;
        });
        if (cat && cat.toolCount != null) return cat.toolCount;
        if (cat && cat.tools) return cat.tools.length;
        var fromGlobal = (window.TOOLS_CATALOG || []).find(function (t) { return t.id === toolId; });
        return (fromGlobal && fromGlobal.toolCount != null) ? fromGlobal.toolCount : '—';
      }

      function getToolParamSchema(toolId) {
        return (window.TOOL_PARAM_SCHEMAS || {})[toolId] || [];
      }

      function toolConfigured(row) {
        return !!(row && row.configured !== false);
      }

      function openToolDetail(row) {
        toolDetailTarget.value = row;
        toolDetailVisible.value = true;
      }

      function openToolConfigDrawer(row) {
        toolConfigTarget.value = row;
        var schema = getToolParamSchema(getToolsetId(row));
        var draft = {};
        var existing = (row && row.config) || {};
        schema.forEach(function (f) {
          draft[f.key] = existing[f.key] != null ? existing[f.key] : (f.default || '');
        });
        if (!schema.length) {
          draft.API_KEY = existing.API_KEY || '';
        }
        toolConfigDraft.value = draft;
        toolConfigDrawerVisible.value = true;
      }

      function saveToolConfigDrawer() {
        var row = toolConfigTarget.value;
        if (!row) return;
        var toolId = getToolsetId(row);
        capabilitySaving.value = true;
        Promise.resolve(store.updateToolConfig(props.expertId, toolId, Object.assign({}, toolConfigDraft.value)))
          .then(function () {
            refreshToolsets();
            toolConfigDrawerVisible.value = false;
            var count = runningSessionCount.value;
            ElementPlus.ElMessage.success(count > 0
              ? '配置已保存。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
              : '配置已保存。修改将在新会话生效。');
          })
          .catch(function (err) {
            ElementPlus.ElMessage.error((err && err.message) || '保存失败，请重试');
          })
          .finally(function () { capabilitySaving.value = false; });
      }

      function toolConfigSchemaFields() {
        var row = toolConfigTarget.value;
        if (!row) return [];
        var schema = getToolParamSchema(getToolsetId(row));
        if (schema.length) return schema;
        return [{ key: 'API_KEY', label: 'API Key', password: true }];
      }

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
        if (ch.pendingRestart) return 'pending_restart';
        return 'connected';
      }

      function imConnectionLabel(ch) {
        var s = imConnectionStatus(ch);
        if (s === 'disabled') return '已禁用';
        if (s === 'not_configured') return '未配置';
        if (s === 'gateway_stopped') return '渠道连接暂不可用';
        if (s === 'pending_restart') return '待应用';
        if (s === 'connected' || s === 'configured') return '已连接';
        if (s === 'fatal') return '错误';
        return '—';
      }

      function imConnectionDotClass(ch) {
        var s = imConnectionStatus(ch);
        if (s === 'disabled') return 'im-channel-dot--disabled';
        if (s === 'connected' || s === 'configured') return 'im-channel-dot--ok';
        if (s === 'fatal') return 'im-channel-dot--error';
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
            imChannels.value.forEach(function (c) {
              c.pendingRestart = false;
              c.state = imConnectionStatus(c);
            });
            store.saveImChannels(props.expertId, imChannels.value, { gatewayEnabled: true });
            imRestarting.value = false;
            ElementPlus.ElMessage.success('渠道配置已生效，连接状态已刷新');
          }, 1200);
          return;
        }
        if (!window.SidecarApi || !window.SidecarApi.restartGateway) {
          imRestarting.value = false;
          ElementPlus.ElMessage.warning('当前服务暂不支持应用渠道配置');
          return;
        }
        window.SidecarApi.restartGateway(String(props.expertId)).then(function () {
          detailMeta.value = Object.assign({}, detailMeta.value, {
            gateway: Object.assign({}, detailMeta.value.gateway || {}, { running: true })
          });
          imChannels.value.forEach(function (c) {
            c.pendingRestart = false;
            c.state = imConnectionStatus(c);
          });
          imRestarting.value = false;
          ElementPlus.ElMessage.success('渠道配置已生效，连接状态已刷新');
        }).catch(function () {
          imRestarting.value = false;
          ElementPlus.ElMessage.error('应用渠道配置失败，请稍后重试');
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
        if (ch.enabled && ch.configured) ch.pendingRestart = true;
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
          skills: enabledSkillCount.value > 0 ? ('·' + enabledSkillCount.value) : '',
          tools: enabledToolCount.value > 0 ? ('·' + enabledToolCount.value) : '',
          mcp: mcpEnabledCount.value > 0 ? ('·' + mcpEnabledCount.value) : '',
          mcpAlert: mcpNeedsAttentionCount.value > 0,
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
        if (state === 'not_configured') return '未配置';
        if (state === 'connected' || state === 'configured') return '已连接';
        if (state === 'pending_restart') return '待重启';
        if (state === 'gateway_stopped') return '渠道连接暂不可用';
        if (state === 'fatal') return '错误';
        return state || '—';
      }

      function messagingStateType(state) {
        if (state === 'connected' || state === 'configured') return 'success';
        if (state === 'not_configured' || state === 'gateway_stopped' || state === 'pending_restart') return 'warning';
        if (state === 'fatal') return 'danger';
        if (state === 'disabled') return 'info';
        return 'info';
      }

      function personaSectionEmpty(key) {
        if (key === 'soulMd') return !(persona.value.soulMd && String(persona.value.soulMd).trim());
        return !(persona.value.soulMd && String(persona.value.soulMd).trim());
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
        workspaceRenameDialogTitle: workspaceRenameDialogTitle, workspaceRenameDialogSub: workspaceRenameDialogSub,
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
        toggleSkillEnabled: toggleSkillEnabled,
        deleteSkill: deleteSkill,
        formatSkillLastUsed: formatSkillLastUsed,
        skillProvenanceLabel: skillProvenanceLabel,
        skillProvenanceTagType: skillProvenanceTagType,
        getSkillInfo: getSkillInfo, getSkillParamSchema: getSkillParamSchema,
        skillsCatalog: skillsCatalog,
        filteredSkills: filteredSkills,
        installedSkillCount: installedSkillCount,
        enabledSkillCount: enabledSkillCount,
        skillSearchQuery: skillSearchQuery,
        skillEnabledFilter: skillEnabledFilter,
        // 工具 Tab
        toggleToolEnabled: toggleToolEnabled,
        refreshToolsets: refreshToolsets,
        getToolInfo: getToolInfo, getToolParamSchema: getToolParamSchema,
        toolsCatalog: toolsCatalog,
        filteredToolsets: filteredToolsets,
        enabledToolCount: enabledToolCount,
        totalToolCount: totalToolCount,
        toolSearchQuery: toolSearchQuery,
        toolEnabledFilter: toolEnabledFilter,
        toolConfigDrawerVisible: toolConfigDrawerVisible,
        toolConfigTarget: toolConfigTarget,
        toolConfigDraft: toolConfigDraft,
        toolDetailVisible: toolDetailVisible,
        toolDetailTarget: toolDetailTarget,
        openToolDetail: openToolDetail,
        openToolConfigDrawer: openToolConfigDrawer,
        saveToolConfigDrawer: saveToolConfigDrawer,
        toolConfigSchemaFields: toolConfigSchemaFields,
        toolConfigured: toolConfigured,
        toolsetPrimaryLabel: toolsetPrimaryLabel,
        toolsetSecondaryId: toolsetSecondaryId,
        toolsetLabel: toolsetLabel, getToolsetId: getToolsetId,
        getToolCount: getToolCount,
        capabilitySaving: capabilitySaving,
        capabilitiesLoading: capabilitiesLoading,
        // MCP Tab
        mcpServers: mcpServers,
        mcpSaving: mcpSaving,
        mcpTesting: mcpTesting,
        mcpRowTestingName: mcpRowTestingName,
        mcpFormTestResult: mcpFormTestResult,
        mcpFormVisible: mcpFormVisible,
        mcpFormMode: mcpFormMode,
        mcpSecretVisible: mcpSecretVisible,
        mcpSecretTarget: mcpSecretTarget,
        mcpSecretDraft: mcpSecretDraft,
        mcpDetailVisible: mcpDetailVisible,
        mcpDetailTarget: mcpDetailTarget,
        mcpDetailTools: mcpDetailTools,
        mcpDetailLoading: mcpDetailLoading,
        mcpDetailError: mcpDetailError,
        mcpForm: mcpForm,
        mcpEnabledCount: mcpEnabledCount,
        mcpNeedsAttentionCount: mcpNeedsAttentionCount,
        openMcpForm: openMcpForm,
        openMcpEditForm: openMcpEditForm,
        openMcpPlatformImportDialog: openMcpPlatformImportDialog,
        mcpUrlPlaceholder: mcpUrlPlaceholder,
        mcpHubDialogVisible: mcpHubDialogVisible,
        mcpHubTab: mcpHubTab,
        mcpHubInstalling: mcpHubInstalling,
        mcpHubInstallProgress: mcpHubInstallProgress,
        mcpHubTableRef: mcpHubTableRef,
        mcpHubOptions: mcpHubOptions,
        mcpHubSelectedCount: mcpHubSelectedCount,
        mcpHubDisplayName: mcpHubDisplayName,
        mcpHubEnglishId: mcpHubEnglishId,
        onMcpHubSelectionChange: onMcpHubSelectionChange,
        installSelectedHubMcps: installSelectedHubMcps,
        submitMcpForm: submitMcpForm,
        testMcpFormConnection: testMcpFormConnection,
        testMcpRowConnection: testMcpRowConnection,
        openMcpDetail: openMcpDetail,
        toggleMcpEnabled: toggleMcpEnabled,
        openMcpSecretForm: openMcpSecretForm,
        submitMcpSecrets: submitMcpSecrets,
        deleteMcpServer: deleteMcpServer,
        mcpStatusLabel: mcpStatusLabel,
        mcpStatusClass: mcpStatusClass,
        mcpStatusDetail: mcpStatusDetail,
        mcpToolCountLabel: mcpToolCountLabel,
        mcpTypeLabel: mcpTypeLabel,
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
        dismissPersonaOnboard: dismissPersonaOnboard,
        fillPersonaFromTemplate: fillPersonaFromTemplate,
        importPersonaSoulMd: importPersonaSoulMd,
        getTaskCwdLabel: getTaskCwdLabel,
        goToWorkspaceFromTask: goToWorkspaceFromTask,
        hubInstallDialogVisible: hubInstallDialogVisible,
        hubInstallTab: hubInstallTab,
        hubInstalling: hubInstalling,
        hubInstallProgress: hubInstallProgress,
        hubSkillTableRef: hubSkillTableRef,
        hubSkillOptions: hubSkillOptions,
        hubSelectedCount: hubSelectedCount,
        hubSkillDisplayName: hubSkillDisplayName,
        hubSkillEnglishId: hubSkillEnglishId,
        onHubSkillSelectionChange: onHubSkillSelectionChange,
        openPlatformImportDialog: openPlatformImportDialog,
        installSelectedHubSkills: installSelectedHubSkills,
        skillLocalImportInput: skillLocalImportInput,
        localSkillUploading: localSkillUploading,
        triggerLocalSkillUpload: triggerLocalSkillUpload,
        handleLocalSkillUpload: handleLocalSkillUpload,
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
                    <p class="detail-section-desc">定义专家的核心职责、工作流程与行为准则。保存后默认在新会话生效，不影响已打开的对话。</p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split">\
                    <input ref="personaImportInput" type="file" accept=".md" class="material-file-input-hidden" @change="handlePersonaImport">\
                    <div class="detail-action-left">\
                      <el-button size="small" @click="triggerPersonaImport">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                        导入人设\
                      </el-button>\
                      <el-button size="small" @click="exportPersonaMd">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
                        导出人设\
                      </el-button>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button type="primary" size="small" @click="savePersona">保存</el-button>\
                    </div>\
                  </div>\
                  <div class="persona-split-layout">\
                    <div class="persona-edit-panel">\
                      <div class="persona-edit-tabs">\
                        <button type="button" class="persona-edit-tab active">人设内容</button>\
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
                      <el-input v-model="persona.soulMd" type="textarea" :rows="14" placeholder="填写专家的角色、职责、工作流程与行为准则" class="persona-textarea" />\
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
                    <p class="detail-section-desc">集中管理专家执行任务时使用的文件与资料，也可按需要划分不同文件夹。</p>\
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
                        <div class="workspace-list-cell workspace-list-action-cell detail-table-action-cell">\
                          <div class="detail-table-actions">\
                            <template v-if="file.kind !== \'folder\'">\
                              <el-button link type="primary" size="small" @click="openWorkspaceFilePreview(file)">预览</el-button>\
                              <el-button link type="primary" size="small" @click="downloadWorkspaceFile(file)">下载</el-button>\
                              <el-button v-if="file.taskId" link type="primary" size="small" @click="goToArtifactTask(file.taskId)">跳转至任务</el-button>\
                            </template>\
                            <el-dropdown trigger="click" @command="handleWorkspaceItemCommand($event, file)">\
                              <button type="button" class="workspace-more-btn workspace-more-btn-vertical" aria-label="更多操作">⋮</button>\
                              <template #dropdown>\
                                <el-dropdown-menu>\
                                  <el-dropdown-item command="rename">重命名</el-dropdown-item>\
                                  <el-dropdown-item command="delete" class="workspace-danger-dropdown-item">删除</el-dropdown-item>\
                                </el-dropdown-menu>\
                              </template>\
                            </el-dropdown>\
                          </div>\
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
                    <el-table-column label="操作" width="168" align="left" class-name="task-tab-action-cell detail-table-action-cell">\
                      <template #default="{ row }">\
                        <div class="detail-table-actions">\
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
                    <p class="detail-section-desc">管理本专家已安装的技能（启停 / 用量 / 平台导入 / 本地上传）<span v-if="runningSessionCount > 0">。当前有 {{ runningSessionCount }} 个运行中会话，启停将在新会话生效</span></p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split skill-action-bar">\
                    <div class="detail-action-left">\
                      <span class="detail-action-bar-label">已安装 {{ installedSkillCount }} 项 · 已启用 {{ enabledSkillCount }} 项</span>\
                    </div>\
                    <div class="detail-action-right skill-toolbar">\
                      <el-input v-model="skillSearchQuery" placeholder="搜索技能" size="small" clearable class="skill-toolbar-search" />\
                      <el-select v-model="skillEnabledFilter" size="small" class="skill-toolbar-select skill-toolbar-select--narrow" placeholder="状态">\
                        <el-option label="全部" value="all" />\
                        <el-option label="仅已启用" value="enabled" />\
                        <el-option label="仅已禁用" value="disabled" />\
                      </el-select>\
                      <el-button type="primary" size="small" @click="openPlatformImportDialog">从平台导入</el-button>\
                      <el-button size="small" :loading="localSkillUploading" @click="triggerLocalSkillUpload">本地上传</el-button>\
                      <input ref="skillLocalImportInput" type="file" accept=".zip,.md,.json,.skill" style="display:none" @change="handleLocalSkillUpload" />\
                    </div>\
                  </div>\
                  <div v-loading="capabilitiesLoading || capabilitySaving || localSkillUploading">\
                    <div v-if="skillBindings.length === 0 && !capabilitiesLoading" class="profile-empty-state">\
                      <p class="profile-empty-title">暂无已安装技能</p>\
                      <p class="profile-empty-desc">创建专家时会自动配备基础技能；也可从平台导入或本地上传。</p>\
                    </div>\
                    <div v-else-if="filteredSkills.length === 0" class="profile-empty-state">\
                      <p class="profile-empty-title">无匹配技能</p>\
                      <p class="profile-empty-desc">试试调整搜索或筛选条件。</p>\
                    </div>\
                    <div v-else class="detail-table-wrap">\
                      <el-table :data="filteredSkills" stripe class="toolset-table skill-optout-table">\
                        <el-table-column label="启用" width="72" align="center">\
                          <template #default="{ row }">\
                            <el-switch\
                              :model-value="row.enabled !== false"\
                              :disabled="capabilitySaving"\
                              size="small"\
                              @change="(v) => toggleSkillEnabled(row, v)"\
                            />\
                          </template>\
                        </el-table-column>\
                        <el-table-column label="技能名" min-width="140">\
                          <template #default="{ row }">\
                            <div class="toolset-name-cell">{{ row.name || row.skillId }}</div>\
                            <div class="toolset-id-cell">{{ row.skillId }}</div>\
                          </template>\
                        </el-table-column>\
                        <el-table-column label="描述" min-width="200" show-overflow-tooltip>\
                          <template #default="{ row }">{{ row.description || \'暂无描述\' }}</template>\
                        </el-table-column>\
                        <el-table-column label="操作" width="88" align="left" class-name="detail-table-action-cell">\
                          <template #default="{ row }">\
                            <div class="detail-table-actions">\
                              <el-button link type="danger" size="small" :disabled="capabilitySaving" @click="deleteSkill(row)">删除</el-button>\
                            </div>\
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
                    <p class="detail-section-desc">管理本专家可调用的内置工具集<span v-if="runningSessionCount > 0">。当前有 {{ runningSessionCount }} 个运行中会话，变更将在新会话生效</span></p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split skill-action-bar">\
                    <div class="detail-action-left">\
                      <span class="detail-action-bar-label">已启用 {{ enabledToolCount }} / 共 {{ totalToolCount }} 个</span>\
                    </div>\
                    <div class="detail-action-right skill-toolbar">\
                      <el-input v-model="toolSearchQuery" placeholder="搜索工具集" size="small" clearable class="skill-toolbar-search" />\
                      <el-select v-model="toolEnabledFilter" size="small" class="skill-toolbar-select skill-toolbar-select--narrow" placeholder="状态">\
                        <el-option label="全部" value="all" />\
                        <el-option label="仅已启用" value="enabled" />\
                        <el-option label="仅已禁用" value="disabled" />\
                      </el-select>\
                    </div>\
                  </div>\
                  <div v-loading="capabilitiesLoading || capabilitySaving">\
                    <div v-if="filteredToolsets.length === 0" class="profile-empty-state">\
                      <p class="profile-empty-title">无匹配工具集</p>\
                      <p class="profile-empty-desc">试试调整搜索或筛选条件。</p>\
                    </div>\
                    <div v-else class="detail-table-wrap">\
                      <el-table :data="filteredToolsets" stripe class="toolset-table skill-optout-table">\
                        <el-table-column label="启用" width="72" align="center">\
                          <template #default="{ row }">\
                            <el-switch\
                              :model-value="!!row.enabled"\
                              :disabled="capabilitySaving"\
                              size="small"\
                              @change="(v) => toggleToolEnabled(row, v)"\
                            />\
                          </template>\
                        </el-table-column>\
                        <el-table-column label="工具集" min-width="150">\
                          <template #default="{ row }">\
                            <div class="toolset-name-cell">{{ toolsetPrimaryLabel(row) }}</div>\
                            <div v-if="toolsetSecondaryId(row)" class="toolset-id-cell">{{ toolsetSecondaryId(row) }}</div>\
                          </template>\
                        </el-table-column>\
                        <el-table-column label="描述" min-width="200" show-overflow-tooltip>\
                          <template #default="{ row }">{{ row.description || \'暂无描述\' }}</template>\
                        </el-table-column>\
                        <el-table-column label="工具数" width="90" align="center">\
                          <template #default="{ row }">{{ getToolCount(row) }}</template>\
                        </el-table-column>\
                        <el-table-column label="就绪" width="110" align="center">\
                          <template #default="{ row }">\
                            <span class="mcp-status" :class="toolConfigured(row) ? \'mcp-status--ok\' : \'mcp-status--error\'">\
                              <span class="mcp-status-dot"></span>{{ toolConfigured(row) ? \'就绪\' : \'缺密钥\' }}\
                            </span>\
                          </template>\
                        </el-table-column>\
                        <el-table-column label="操作" width="128" align="left" class-name="detail-table-action-cell">\
                          <template #default="{ row }">\
                            <div class="detail-table-actions">\
                              <el-button link type="primary" size="small" @click="openToolDetail(row)">详情</el-button>\
                              <el-button v-if="!toolConfigured(row)" link type="primary" size="small" @click="openToolConfigDrawer(row)">配置</el-button>\
                            </div>\
                          </template>\
                        </el-table-column>\
                      </el-table>\
                    </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="mcp">\
                <template #label>\
                  <span class="tab-label-with-dot">\
                    MCP <span v-if="tabBadges.mcp" class="tab-count-badge">{{ tabBadges.mcp }}</span>\
                  </span>\
                </template>\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">MCP</h3>\
                    <p class="detail-section-desc">连接 MCP 服务，扩展专家可使用的工具<span v-if="runningSessionCount > 0">。当前有 {{ runningSessionCount }} 个运行中会话，变更将在新会话中生效</span>。</p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split">\
                    <div class="detail-action-left">\
                      <span class="detail-action-bar-label">已启用 {{ mcpEnabledCount }} 项<span v-if="mcpNeedsAttentionCount"> · 其中 {{ mcpNeedsAttentionCount }} 项需处理</span></span>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button type="primary" size="small" @click="openMcpPlatformImportDialog">从平台导入</el-button>\
                    </div>\
                  </div>\
                  <div v-if="mcpServers.length === 0" class="profile-empty-state">\
                    <p class="profile-empty-title">尚未连接 MCP 服务</p>\
                    <p class="profile-empty-desc">可从平台导入 GitHub、数据库、文件系统等服务。</p>\
                  </div>\
                  <div v-else class="detail-table-wrap">\
                    <el-table :data="mcpServers" stripe class="toolset-table">\
                      <el-table-column label="启用" width="72" align="center">\
                        <template #default="{ row }">\
                          <el-switch\
                            :model-value="row.enabled !== false"\
                            :disabled="mcpSaving"\
                            size="small"\
                            @change="(v) => toggleMcpEnabled(row, v)"\
                          />\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="服务名称" min-width="160">\
                        <template #default="{ row }">\
                          <div class="toolset-name-cell">{{ row.name }}</div>\
                        </template>\
                      </el-table-column>\
                      <el-table-column label="类型" min-width="150" align="center">\
                        <template #default="{ row }">{{ mcpTypeLabel(row) }}</template>\
                      </el-table-column>\
                      <el-table-column label="工具数" width="86" align="center">\
                        <template #default="{ row }">{{ mcpToolCountLabel(row) }}</template>\
                      </el-table-column>\
                      <el-table-column label="操作" width="128" align="left" class-name="detail-table-action-cell">\
                        <template #default="{ row }">\
                          <div class="detail-table-actions">\
                            <el-button link type="primary" size="small" @click="openMcpDetail(row)">详情</el-button>\
                            <el-button link type="danger" size="small" @click="deleteMcpServer(row)">删除</el-button>\
                          </div>\
                        </template>\
                      </el-table-column>\
                    </el-table>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="im">\
                <template #label>消息渠道 <span v-if="tabBadges.im" class="tab-count-badge">{{ tabBadges.im }}</span></template>\
                <div class="detail-tab-pane im-channel-tab">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">消息渠道</h3>\
                    <p class="detail-section-desc">配置企业微信、钉钉、飞书等消息渠道。启用后，用户可通过群聊提及或私聊的方式与该专家对话。</p>\
                  </div>\
                  <div class="im-channel-layout">\
                    <div class="im-channel-sidebar">\
                      <el-input v-model="messagingSearchQuery" placeholder="搜索渠道..." clearable size="small" class="im-channel-search" />\
                      <div class="im-channel-list">\
                        <button v-for="ch in filteredImSidebarChannels" :key="ch.id || ch.type" type="button" class="im-channel-list-item" :class="{ active: String(selectedImChannelId) === String(ch.id || ch.type) }" @click="selectImChannel(ch)">\
                          <span class="im-channel-list-icon">{{ ch.emoji || imPlatformIcon(ch) }}</span>\
                          <span class="im-channel-list-meta">\
                            <span class="im-channel-list-name">{{ ch.name || ch.label }}</span>\
                            <span v-if="ch.connectionHint" class="im-channel-list-hint">{{ ch.connectionHint }}</span>\
                          </span>\
                          <span class="im-channel-list-right">\
                            <span class="im-channel-list-switch">{{ ch.enabled ? \'开\' : \'关\' }}</span>\
                            <span class="im-channel-dot" :class="imChannelDotClass(ch)"></span>\
                          </span>\
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
                                <p v-if="selectedImChannel.connectionHint" class="im-channel-panel-hint">{{ selectedImChannel.connectionHint }} · {{ imConnectionLabel(selectedImChannel) }}</p>\
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
                            该凭据正被专家「{{ imConflictProfile }}」使用，不能复用。请为当前专家单独创建机器人或应用。\
                          </el-alert>\
                        </div>\
                        \
                        <div class="im-channel-toolbar">\
                          <div class="im-channel-toolbar-left">\
                            <el-button link type="primary" @click="openImSetupGuide(selectedImChannel)">设置指南 ↗</el-button>\
                            <span v-if="!selectedImChannel.enabled" class="im-channel-inline-hint">渠道已禁用，开启右上角开关并填写凭据后保存生效</span>\
                            <span v-else-if="imConnectionStatus(selectedImChannel) === \'pending_restart\'" class="im-channel-inline-hint">配置已变更，请应用配置后生效</span>\
                          </div>\
                          <div class="im-channel-toolbar-right">\
                            <el-button type="primary" :loading="imSaving" @click="saveSelectedImChannel">保存</el-button>\
                            <el-tooltip content="保存或切换启用状态后，请应用配置以更新渠道连接" placement="top" effect="dark">\
                              <el-button :loading="imRestarting" :disabled="imSaving" @click="restartImGateway">应用配置</el-button>\
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
                              <el-select v-if="field.type === \'select\'" :model-value="imSecretDraft[field.key] || field.default || \'\'" @change="imSecretDraft[field.key] = $event" placeholder="请选择" class="im-credential-input" style="width:100%">\
                                <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />\
                              </el-select>\
                              <el-input v-else v-model="imSecretDraft[field.key]" :type="field.password ? \'password\' : \'text\'" :placeholder="credentialPlaceholder(field)" :show-password="!!field.password" class="im-credential-input" />\
                            </div>\
                          </div>\
                          <div class="im-channel-section-foot">凭据将安全保存，并在保存时检查是否已被其他专家使用。</div>\
                        </div>\
                        \
                        <div v-if="selectedImChannel.policyFields && selectedImChannel.policyFields.length" class="im-channel-section im-channel-policy-section">\
                          <el-collapse v-model="imPolicyCollapse" accordion>\
                            <el-collapse-item name="policy">\
                              <template #title>\
                                <span class="im-channel-section-label im-channel-policy-title">访问策略</span>\
                                <span class="im-channel-policy-summary">{{ imPolicySummary(selectedImChannel) }}</span>\
                              </template>\
                              <div class="im-channel-section-foot">未填写的选项将使用默认设置。</div>\
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
        <!-- 新建任务 -->\
        <el-dialog v-model="newTaskDialogVisible" width="440px" class="form-dialog form-dialog-sm ed-dialog ed-dialog-task" :close-on-click-modal="false" append-to-body>\
          <template #header>\
            <div class="dialog-header-custom dialog-header-expert-wizard">\
              <div class="dialog-header-icon dialog-header-icon-task">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">新建任务</div>\
                <div class="dialog-header-sub">创建后进入对话，开始与专家协作</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <el-form label-position="top" class="form-dialog-form" @submit.prevent="submitNewTask">\
              <el-form-item label="任务标题" required>\
                <el-input v-model="newTaskTitle" placeholder="例如：分析本月良率波动原因" maxlength="80" show-word-limit clearable @keyup.enter="submitNewTask" />\
              </el-form-item>\
            </el-form>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="newTaskDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :disabled="!(newTaskTitle && newTaskTitle.trim())" @click="submitNewTask">创建</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 工作空间文件夹 -->\
        <el-dialog v-model="workspaceFolderDialogVisible" width="420px" class="form-dialog form-dialog-sm ws-folder-dialog ed-dialog" :close-on-click-modal="false" append-to-body>\
          <template #header>\
            <div class="dialog-header-custom dialog-header-workspace">\
              <div class="dialog-header-icon dialog-header-icon-workspace">\
                <svg v-if="workspaceFolderDialogMode === \'rename\'" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>\
                <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">{{ workspaceRenameDialogTitle }}</div>\
                <div class="dialog-header-sub">{{ workspaceRenameDialogSub }}</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ws-folder-dialog-body">\
            <el-form label-position="top" class="form-dialog-form ws-folder-form" @submit.prevent="submitWorkspaceFolderDialog">\
              <el-form-item :label="workspaceFolderDialogMode === \'rename\' ? \'名称\' : \'文件夹名称\'" required>\
                <el-input v-model="workspaceFolderName" placeholder="例如：分析报告、原始数据" maxlength="60" show-word-limit clearable @keyup.enter="submitWorkspaceFolderDialog" />\
              </el-form-item>\
            </el-form>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="workspaceFolderDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit" :disabled="!(workspaceFolderName && workspaceFolderName.trim())" @click="submitWorkspaceFolderDialog">保存</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 任务产物预览 -->\
        <el-dialog v-model="artifactPreviewVisible" width="580px" class="form-dialog ws-preview-dialog ed-dialog ed-preview-dialog" append-to-body @closed="artifactPreviewItem = null">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-workspace">\
              <div class="dialog-header-icon dialog-header-icon-workspace">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">{{ artifactPreviewItem ? artifactPreviewItem.title : \'文件预览\' }}</div>\
                <div class="dialog-header-sub" v-if="artifactPreviewItem">{{ artifactTypeLabel[artifactPreviewItem.type] || artifactPreviewItem.type }} · {{ artifactPreviewItem.createdAt }} · 只读预览</div>\
              </div>\
            </div>\
          </template>\
          <div v-if="artifactPreviewItem" class="ws-preview-body ed-preview-body">\
            <pre class="ws-preview-text">{{ artifactPreviewItem.content || \'暂无内容\' }}</pre>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="artifactPreviewVisible = false">关闭</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit" @click="downloadArtifact(artifactPreviewItem); artifactPreviewVisible = false">\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下载\
                </el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 资料文件预览 -->\
        <el-dialog v-model="materialPreviewVisible" width="580px" class="form-dialog ws-preview-dialog ed-dialog ed-preview-dialog" append-to-body @closed="materialPreviewItem = null">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-workspace">\
              <div class="dialog-header-icon dialog-header-icon-workspace">\
                <span class="ed-preview-file-emoji">{{ materialPreviewItem ? fileTypeIcon(materialPreviewItem.type) : \'📄\' }}</span>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">{{ materialPreviewItem ? materialPreviewItem.name : \'文件预览\' }}</div>\
                <div class="dialog-header-sub" v-if="materialPreviewItem">{{ formatFileSize(materialPreviewItem.size) }} · 只读预览</div>\
              </div>\
            </div>\
          </template>\
          <div v-if="materialPreviewItem" class="ws-preview-body ed-preview-body">\
            <pre v-if="materialPreviewItem.content" class="ws-preview-text">{{ materialPreviewItem.content }}</pre>\
            <div v-else class="ws-preview-binary">\
              <span class="ws-preview-binary-icon">{{ fileTypeIcon(materialPreviewItem.type) }}</span>\
              <span class="ws-preview-binary-name">{{ materialPreviewItem.name }}</span>\
              <span class="ws-preview-binary-info">该文件类型暂不支持预览，可下载后查看</span>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="materialPreviewVisible = false">关闭</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit" @click="downloadMaterial(materialPreviewItem); materialPreviewVisible = false">\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下载\
                </el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 记忆 -->\
        <el-dialog v-model="memoryDialogVisible" width="520px" append-to-body class="form-dialog memory-dialog ed-dialog ed-dialog-memory" :close-on-click-modal="false">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-memory">\
              <div class="dialog-header-icon dialog-header-icon-memory">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 0-4 12.7V18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.3A7 7 0 0 0 12 2z"/><line x1="10" y1="22" x2="14" y2="22"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">{{ memoryDialogMode === \'edit\' ? \'编辑记忆\' : \'新增记忆\' }}</div>\
                <div class="dialog-header-sub">{{ memoryDialogMode === \'edit\' ? \'更新后将在后续对话中优先引用\' : \'写入专家长期记忆，跨任务持续生效\' }}</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <el-form label-position="top" class="form-dialog-form">\
              <el-form-item label="分类">\
                <el-select v-model="memoryForm.category" style="width:100%" placeholder="选择分类">\
                  <el-option label="用户偏好" value="user_preference" />\
                  <el-option label="项目背景" value="project_context" />\
                  <el-option label="领域知识" value="domain_knowledge" />\
                  <el-option label="其他" value="other" />\
                </el-select>\
              </el-form-item>\
              <el-form-item label="内容" required>\
                <el-input v-model="memoryForm.content" type="textarea" :rows="6" placeholder="请输入记忆内容，尽量具体、可复用" maxlength="2000" show-word-limit />\
              </el-form-item>\
            </el-form>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard memory-dialog-footer">\
              <el-button v-if="memoryDialogMode === \'edit\'" type="danger" plain class="wizard-btn wizard-btn-danger" @click="deleteMemoryFromDialog">删除</el-button>\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="memoryDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :disabled="!(memoryForm.content && memoryForm.content.trim())" @click="saveMemoryDialog">保存</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 工具集详情 -->\
        <el-dialog v-model="toolDetailVisible" width="520px" append-to-body class="form-dialog ed-dialog ed-dialog-tool">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-tool">\
              <div class="dialog-header-icon dialog-header-icon-tool">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">工具集详情</div>\
                <div class="dialog-header-sub">查看工具集说明与包含的工具名单</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body" v-if="toolDetailTarget">\
            <div class="ed-tool-detail-card">\
              <p class="tool-detail-title">{{ toolsetPrimaryLabel(toolDetailTarget) }}</p>\
              <p v-if="toolsetSecondaryId(toolDetailTarget)" class="tool-detail-id">{{ toolsetSecondaryId(toolDetailTarget) }}</p>\
              <p class="tool-detail-desc">{{ toolDetailTarget.description || \'暂无描述\' }}</p>\
              <div class="tool-detail-tools">\
                <div class="tool-detail-tools-label">包含工具（{{ getToolCount(toolDetailTarget) }}）</div>\
                <div v-if="!(toolDetailTarget.tools && toolDetailTarget.tools.length)" class="tool-detail-empty">暂无工具名单</div>\
                <ul v-else class="tool-detail-list">\
                  <li v-for="t in toolDetailTarget.tools" :key="t">{{ t }}</li>\
                </ul>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" @click="toolDetailVisible = false">关闭</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 配置工具集 -->\
        <el-drawer v-model="toolConfigDrawerVisible" size="420px" append-to-body class="toolset-config-drawer ed-drawer">\
          <template #header>\
            <div class="ed-drawer-header">\
              <div class="dialog-header-icon dialog-header-icon-tool">\
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">配置工具集</div>\
                <div class="dialog-header-sub">补全密钥后方可正常调用</div>\
              </div>\
            </div>\
          </template>\
          <template v-if="toolConfigTarget">\
            <div class="ed-drawer-body">\
              <div class="ed-tool-detail-card">\
                <p class="tool-detail-title">{{ toolsetPrimaryLabel(toolConfigTarget) }}</p>\
                <p class="tool-detail-desc">配置写入本专家环境，变更将在新会话生效。</p>\
              </div>\
              <el-form label-position="top" class="mcp-form form-dialog-form">\
                <el-form-item v-for="field in toolConfigSchemaFields()" :key="field.key" :label="field.label || field.key">\
                  <el-input\
                    v-model="toolConfigDraft[field.key]"\
                    :type="field.password ? \'password\' : \'text\'"\
                    :show-password="!!field.password"\
                    :placeholder="\'请输入 \' + (field.label || field.key)"\
                  />\
                </el-form-item>\
              </el-form>\
            </div>\
            <div class="toolset-config-actions">\
              <el-button class="wizard-btn wizard-btn-cancel" @click="toolConfigDrawerVisible = false">取消</el-button>\
              <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="capabilitySaving" @click="saveToolConfigDrawer">保存</el-button>\
            </div>\
          </template>\
        </el-drawer>\
        <!-- 从平台导入技能 -->\
        <el-dialog v-model="hubInstallDialogVisible" width="640px" append-to-body class="form-dialog capability-picker-dialog ed-dialog ed-dialog-hub">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-hub">\
              <div class="dialog-header-icon dialog-header-icon-hub">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">从平台导入技能</div>\
                <div class="dialog-header-sub">从我发布的、我添加的或内置技能库导入到当前专家</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <div v-if="hubInstalling" class="hub-install-progress">\
              <div class="hub-install-progress-text">正在导入技能… {{ hubInstallProgress }}%</div>\
              <el-progress :percentage="hubInstallProgress" :stroke-width="10" />\
            </div>\
            <template v-else>\
              <div class="hub-skill-tabs" role="tablist">\
                <button type="button" class="hub-skill-tab" :class="{ \'is-active\': hubInstallTab === \'mine\' }" role="tab" :aria-selected="hubInstallTab === \'mine\'" @click="hubInstallTab = \'mine\'">我发布的</button>\
                <button type="button" class="hub-skill-tab" :class="{ \'is-active\': hubInstallTab === \'added\' }" role="tab" :aria-selected="hubInstallTab === \'added\'" @click="hubInstallTab = \'added\'">我添加的</button>\
                <button type="button" class="hub-skill-tab" :class="{ \'is-active\': hubInstallTab === \'builtin\' }" role="tab" :aria-selected="hubInstallTab === \'builtin\'" @click="hubInstallTab = \'builtin\'">内置</button>\
              </div>\
              <el-table\
                ref="hubSkillTableRef"\
                :data="hubSkillOptions"\
                row-key="id"\
                stripe\
                max-height="520"\
                class="toolset-table capability-picker-table hub-skill-table"\
                empty-text="暂无可导入的平台技能"\
                @selection-change="onHubSkillSelectionChange"\
              >\
                <el-table-column type="selection" width="48" align="center" />\
                <el-table-column label="技能" min-width="280">\
                  <template #default="{ row }">\
                    <div class="hub-skill-cell">\
                      <span class="hub-skill-icon" aria-hidden="true">{{ row.icon || \'📦\' }}</span>\
                      <span class="hub-skill-title">{{ hubSkillDisplayName(row) }}<span class="hub-skill-eid">({{ hubSkillEnglishId(row) }})</span></span>\
                    </div>\
                  </template>\
                </el-table-column>\
              </el-table>\
            </template>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard hub-dialog-footer">\
              <span class="hub-selected-count">已选择 <strong>{{ hubSelectedCount }}</strong> 个技能</span>\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" :disabled="hubInstalling" @click="hubInstallDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="hubInstalling" :disabled="hubSelectedCount === 0" @click="installSelectedHubSkills">导入</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 从平台导入 MCP -->\
        <el-dialog v-model="mcpHubDialogVisible" width="640px" append-to-body class="form-dialog capability-picker-dialog ed-dialog ed-dialog-hub ed-dialog-mcp-hub">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-mcp">\
              <div class="dialog-header-icon dialog-header-icon-mcp">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M11 8h6M7 12h10"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">从平台导入 MCP 服务</div>\
                <div class="dialog-header-sub">从已导入或已创建的服务中选择，并添加到当前专家</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <div v-if="mcpHubInstalling" class="hub-install-progress">\
              <div class="hub-install-progress-text">正在导入 MCP 服务… {{ mcpHubInstallProgress }}%</div>\
              <el-progress :percentage="mcpHubInstallProgress" :stroke-width="10" />\
            </div>\
            <template v-else>\
              <div class="hub-skill-tabs" role="tablist">\
                <button type="button" class="hub-skill-tab" :class="{ \'is-active\': mcpHubTab === \'imported\' }" role="tab" :aria-selected="mcpHubTab === \'imported\'" @click="mcpHubTab = \'imported\'">我导入的</button>\
                <button type="button" class="hub-skill-tab" :class="{ \'is-active\': mcpHubTab === \'created\' }" role="tab" :aria-selected="mcpHubTab === \'created\'" @click="mcpHubTab = \'created\'">我创建的</button>\
              </div>\
              <el-table\
                ref="mcpHubTableRef"\
                :data="mcpHubOptions"\
                row-key="id"\
                stripe\
                max-height="520"\
                class="toolset-table capability-picker-table hub-skill-table"\
                empty-text="暂无可导入的 MCP 服务"\
                @selection-change="onMcpHubSelectionChange"\
              >\
                <el-table-column type="selection" width="48" align="center" />\
                <el-table-column label="MCP 服务" min-width="280">\
                  <template #default="{ row }">\
                    <div class="hub-skill-cell">\
                      <span class="hub-skill-icon" aria-hidden="true">{{ row.icon || \'🔌\' }}</span>\
                      <span class="hub-skill-title">{{ mcpHubDisplayName(row) }}<span class="hub-skill-eid">({{ mcpHubEnglishId(row) }})</span></span>\
                    </div>\
                  </template>\
                </el-table-column>\
              </el-table>\
            </template>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard hub-dialog-footer">\
              <span class="hub-selected-count">已选择 <strong>{{ mcpHubSelectedCount }}</strong> 项服务</span>\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" :disabled="mcpHubInstalling" @click="mcpHubDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="mcpHubInstalling" :disabled="mcpHubSelectedCount === 0" @click="installSelectedHubMcps">导入</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 添加 / 编辑 MCP -->\
        <el-dialog v-model="mcpFormVisible" width="560px" append-to-body class="form-dialog ed-dialog ed-dialog-mcp" :close-on-click-modal="false">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-mcp">\
              <div class="dialog-header-icon dialog-header-icon-mcp">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M11 8h6M7 12h10"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">{{ mcpFormMode === \'edit\' ? \'编辑 MCP 服务\' : \'添加 MCP 服务\' }}</div>\
                <div class="dialog-header-sub">{{ mcpFormMode === \'edit\' ? \'修改配置后将在新会话生效\' : \'填写 MCP 服务的连接信息\' }}</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <el-form label-position="top" class="mcp-form form-dialog-form">\
              <el-form-item label="名称" required>\
                <el-input v-model="mcpForm.name" placeholder="如 filesystem、github-api（小写字母/数字/_/-）" />\
              </el-form-item>\
              <el-form-item label="传输类型" required>\
                <el-radio-group v-model="mcpForm.transport" class="ed-mcp-type-group">\
                  <el-radio-button label="streamable_http">Streamable HTTP</el-radio-button>\
                  <el-radio-button label="sse">SSE</el-radio-button>\
                </el-radio-group>\
              </el-form-item>\
              <el-form-item label="URL" required>\
                <el-input v-model="mcpForm.url" :placeholder="mcpUrlPlaceholder()" />\
              </el-form-item>\
              <el-form-item label="附加参数">\
                <el-input v-model="mcpForm.envText" type="textarea" :rows="3" placeholder="每行填写一项，格式为“名称=值”；敏感信息请勾选下方选项" />\
              </el-form-item>\
              <el-form-item>\
                <el-checkbox v-model="mcpForm.asSecret">作为敏感凭据安全保存</el-checkbox>\
              </el-form-item>\
              <template v-if="mcpForm.asSecret">\
                <div class="ed-mcp-secret-panel">\
                  <el-form-item label="密钥名">\
                    <el-input v-model="mcpForm.secretKey" placeholder="如 GITHUB_TOKEN" />\
                  </el-form-item>\
                  <el-form-item label="密钥值">\
                    <el-input v-model="mcpForm.secretValue" type="password" show-password placeholder="留空则保存后显示「未配置密钥」" />\
                  </el-form-item>\
                </div>\
              </template>\
              <el-form-item label="启用">\
                <el-switch v-model="mcpForm.enabled" />\
              </el-form-item>\
            </el-form>\
            <div v-if="mcpFormTestResult" class="mcp-test-result" :class="mcpFormTestResult.status === \'available\' ? \'is-success\' : \'is-error\'">\
              <div class="mcp-test-result-head">\
                <span class="mcp-test-result-icon">{{ mcpFormTestResult.status === \'available\' ? \'✓\' : \'×\' }}</span>\
                <div>\
                  <div class="mcp-test-result-title">{{ mcpFormTestResult.status === \'available\' ? \'连接成功\' : \'连接失败\' }}</div>\
                  <div class="mcp-test-result-desc">{{ mcpFormTestResult.status === \'available\' ? \'发现 \' + mcpFormTestResult.toolCount + \' 个可调用工具\' : mcpFormTestResult.errorSummary }}</div>\
                </div>\
              </div>\
              <div v-if="mcpFormTestResult.status === \'available\' && mcpFormTestResult.tools.length" class="mcp-test-tools">\
                <span v-for="tool in mcpFormTestResult.tools.slice(0, 5)" :key="tool.name" class="mcp-test-tool-chip">{{ tool.name }}</span>\
                <span v-if="mcpFormTestResult.tools.length > 5" class="mcp-test-tool-more">+{{ mcpFormTestResult.tools.length - 5 }}</span>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="mcpFormVisible = false">取消</el-button>\
                <el-button v-if="!mcpFormTestResult || mcpFormTestResult.status !== \'available\'" type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="mcpTesting" @click="testMcpFormConnection">测试连接</el-button>\
                <template v-else>\
                  <el-button class="wizard-btn" :loading="mcpTesting" @click="testMcpFormConnection">测试连接</el-button>\
                  <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="mcpSaving" @click="submitMcpForm">{{ mcpFormMode === \'edit\' ? \'确认保存\' : \'确认添加\' }}</el-button>\
                </template>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- MCP 详情 -->\
        <el-dialog v-model="mcpDetailVisible" width="680px" append-to-body class="form-dialog ed-dialog ed-dialog-mcp-detail">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-mcp">\
              <div class="dialog-header-icon dialog-header-icon-mcp">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M11 8h6M7 12h10"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">MCP 详情</div>\
                <div class="dialog-header-sub">{{ (mcpDetailTarget && mcpDetailTarget.name) || \'MCP 服务\' }}</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <div v-loading="mcpDetailLoading">\
              <el-alert v-if="mcpDetailError" :title="mcpDetailError" type="warning" :closable="false" show-icon />\
              <template v-else>\
                <div class="detail-section-head">\
                  <h3 class="detail-section-title">可调用工具</h3>\
                  <p class="detail-section-desc">共 {{ mcpDetailTools.length }} 个工具</p>\
                </div>\
                <el-table v-if="mcpDetailTools.length" :data="mcpDetailTools" stripe max-height="440" class="toolset-table">\
                  <el-table-column prop="name" label="工具名称" min-width="220" show-overflow-tooltip />\
                  <el-table-column prop="description" label="工具描述" min-width="340" show-overflow-tooltip />\
                </el-table>\
                <div v-else class="profile-empty-state">\
                  <p class="profile-empty-title">暂无可调用工具</p>\
                </div>\
              </template>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button type="primary" class="wizard-btn" @click="mcpDetailVisible = false">关闭</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- MCP 密钥 -->\
        <el-dialog v-model="mcpSecretVisible" width="480px" append-to-body class="form-dialog ed-dialog ed-dialog-secret" :close-on-click-modal="false">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-secret">\
              <div class="dialog-header-icon dialog-header-icon-secret">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">填写密钥</div>\
                <div class="dialog-header-sub">{{ (mcpSecretTarget && mcpSecretTarget.name) || \'MCP 服务\' }} · 凭据仅供当前专家使用</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <el-form label-position="top" class="form-dialog-form">\
              <el-form-item v-for="(val, key) in mcpSecretDraft" :key="key" :label="key" required>\
                <el-input v-model="mcpSecretDraft[key]" type="password" show-password :placeholder="\'填写 \' + key" />\
              </el-form-item>\
            </el-form>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="mcpSecretVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="mcpSaving" @click="submitMcpSecrets">保存</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <!-- 工作空间根路径 -->\
        <el-dialog v-model="workspaceRootDialogVisible" width="500px" append-to-body class="form-dialog ed-dialog ed-dialog-wsroot" :close-on-click-modal="false">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-workspace">\
              <div class="dialog-header-icon dialog-header-icon-workspace">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">更改工作空间根路径</div>\
                <div class="dialog-header-sub">修改专家文件读写的根目录</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ed-dialog-body">\
            <div class="ed-wsroot-warn">\
              <span class="ed-wsroot-warn-icon">⚠</span>\
              <span>更改根路径可能导致已有文件引用失效，请谨慎操作。</span>\
            </div>\
            <el-form label-position="top" class="form-dialog-form">\
              <el-form-item label="新路径" required>\
                <el-input v-model="workspaceRootInput" placeholder="如：~/.hermes/profiles/expert/workspace" clearable />\
              </el-form-item>\
            </el-form>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="workspaceRootDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit" :disabled="!(workspaceRootInput && workspaceRootInput.trim())" @click="submitWorkspaceRootChange">确认更改</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
      </div>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };


  window.ExpertDetailPage = ExpertDetailPage;
})();
