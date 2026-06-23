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
      var persona = Vue.ref({ coreDutyMd: '', workflowMd: '', behaviorMd: '' });
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
        onSaved: function () { load(); }
      });

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

      // ---- 人设 Tab 新增 ----
      var personaPreviewTab = Vue.ref('coreDutyMd');
      var personaHistoryVisible = Vue.ref(false);
      var personaHistory = Vue.ref([]);
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
      var imGatewayEnabled = Vue.ref(false);
      var imSaving = Vue.ref(false);

      var isDevMock = Vue.computed(function () { return store.isDevMock(); });

      function goAssignTask() {
        if (!expert.value) return;
        ctx.emit('nav', '/experts/' + expert.value.id + '/tasks');
      }

      var loadSeq = 0;

      function normalizePersonaForEditor(raw) {
        var p = raw || {};
        var sections = [];
        if (p.coreDutyMd && String(p.coreDutyMd).trim()) sections.push(String(p.coreDutyMd).trim());
        if (p.workflowMd && String(p.workflowMd).trim()) sections.push(String(p.workflowMd).trim());
        if (p.behaviorMd && String(p.behaviorMd).trim()) sections.push(String(p.behaviorMd).trim());
        return { coreDutyMd: sections.join('\n\n'), workflowMd: '', behaviorMd: '' };
      }

      function applyBaseLocalState() {
        var eid = String(props.expertId);
        expert.value = store.getExpert(eid);
        if (!expert.value) return false;
        persona.value = normalizePersonaForEditor(store.getPersona(eid));
        tasks.value = store.getTasksByExpert(eid);
        memories.value = store.getMemories(eid);
        materials.value = store.getWorkspaceFiles(eid);
        expertArtifacts.value = store.getExpertArtifacts(eid);
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
          enabled: false,
          configured: false,
          state: 'disabled',
          config: '',
          subscriptions: []
        }, c);
      }

      function mergeImChannelWithCatalog(channel, template) {
        var out = Object.assign({ subscriptions: [] }, template ? makeImCatalogChannel(template) : {}, channel);
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
        return out;
      }

      function normalizeImChannels(channels) {
        var map = imCatalogMap();
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
        return normalized;
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
        persona.value.workflowMd = '';
        persona.value.behaviorMd = '';
        store.savePersona(props.expertId, persona.value);
        ElementPlus.ElMessage.success('人设已保存');
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
              running: !!res.running
            })
          });
        }
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

      function applyLocalImSecretState(ch, secrets) {
        var fields = ch.credentialFields || [];
        fields.forEach(function (field) {
          if (secrets[field.key]) field.configured = true;
        });
        ch.configured = fields.filter(function (field) { return field.required; }).every(function (field) {
          return !!field.configured;
        });
        ch.state = !ch.enabled ? 'disabled' : (ch.configured ? (imGatewayEnabled.value ? 'configured' : 'gateway_stopped') : 'not_configured');
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
          secrets: secrets
        };
        if (store.isDevMock()) {
          applyLocalImSecretState(ch, secrets);
          store.saveImChannels(props.expertId, imChannels.value, { gatewayEnabled: imGatewayEnabled.value });
          imSecretDraft.value = {};
          ElementPlus.ElMessage.success('渠道配置已保存');
          return;
        }
        if (!window.SidecarApi || !window.SidecarApi.putImChannels) return;
        imSaving.value = true;
        window.SidecarApi.putImChannels(String(props.expertId), payload).then(function (res) {
          imSaving.value = false;
          applyImChannelsResponse(res);
          imSecretDraft.value = {};
          ElementPlus.ElMessage.success('渠道配置已保存');
        }).catch(function () {
          imSaving.value = false;
          ElementPlus.ElMessage.error('保存失败');
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

      var dialogueTasks = Vue.computed(function () {
        return tasks.value.filter(isDialogueTask);
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
        if (taskStatusFilter.value !== 'all') {
          list = list.filter(function (t) { return t.status === taskStatusFilter.value; });
        }
        return list;
      });

      var taskStats = Vue.computed(function () {
        var list = dialogueTasks.value;
        var counts = { total: list.length, pending: 0, running: 0, completed: 0, archived: 0 };
        list.forEach(function (t) {
          if (t.archived) counts.archived++;
          else if (t.status === 'pending') counts.pending++;
          else if (t.status === 'running') counts.running++;
          else if (t.status === 'completed') counts.completed++;
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
            ElementPlus.ElMessage.success('任务已创建');
          });
          return;
        }
        store.createTask({ expertId: props.expertId, title: title, type: 'dialogue' });
        newTaskDialogVisible.value = false;
        tasks.value = store.getTasksByExpert(props.expertId);
        ElementPlus.ElMessage.success('任务已创建');
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

      function taskCreatedAtLabel(task) {
        if (!task) return '-';
        return formatDateTimeToSeconds(task.createdAt || task.updatedAt);
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

      var workspaceFiles = Vue.computed(function () {
        var rows = [];
        materials.value.forEach(function (f) {
          rows.push({
            id: 'material-' + f.id,
            source: 'upload',
            raw: f,
            name: f.name,
            type: f.type || 'document',
            createdAt: f.createdAt,
            size: f.size || 0,
            content: f.content || ''
          });
        });
        expertArtifacts.value.forEach(function (a) {
          rows.push({
            id: 'artifact-' + a.id,
            source: 'generated',
            raw: a,
            name: a.title || '未命名文件',
            type: a.type || 'document',
            createdAt: a.createdAt,
            taskId: a.taskId,
            taskTitle: a.taskTitle || '',
            content: a.content || ''
          });
        });
        if (materialSearchQuery.value.trim()) {
          var q = materialSearchQuery.value.trim().toLowerCase();
          rows = rows.filter(function (f) {
            return (f.name || '').toLowerCase().indexOf(q) >= 0 ||
              (f.taskTitle || '').toLowerCase().indexOf(q) >= 0;
          });
        }
        if (materialTypeFilter.value !== 'all') {
          rows = rows.filter(function (f) { return f.type === materialTypeFilter.value; });
        }
        return rows.sort(function (a, b) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
      });

      function workspaceFileTypeClass(file) {
        return 'type-' + ((file && file.type) || 'document');
      }

      function workspaceFileIcon(file) {
        return fileTypeIcon(file && file.type);
      }

      function workspaceFileMeta(file) {
        if (!file) return '';
        var parts = [];
        if (file.taskTitle) parts.push('来自任务：' + file.taskTitle);
        if (file.size) parts.push(formatFileSize(file.size));
        if (file.createdAt) parts.push(file.createdAt);
        return parts.join(' · ');
      }

      function openWorkspaceFilePreview(file) {
        if (!file) return;
        if (file.source === 'generated') openArtifactPreview(file.raw);
        else openMaterialPreview(file.raw);
      }

      function downloadWorkspaceFile(file) {
        if (!file) return;
        if (file.source === 'generated') downloadArtifact(file.raw);
        else downloadMaterial(file.raw);
      }

      function deleteWorkspaceFile(file) {
        if (!file || file.source !== 'upload') return;
        deleteMaterial(file.raw);
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
              content: content
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
      function loadPersonaHistory() {
        personaHistory.value = store.getPersonaHistory(props.expertId);
        personaHistoryVisible.value = true;
      }

      function restorePersonaVersion(idx) {
        var snap = store.restorePersonaVersion(props.expertId, idx);
        if (!snap) return;
        persona.value = normalizePersonaForEditor(snap);
        personaHistoryVisible.value = false;
        ElementPlus.ElMessage.success('已恢复到版本 ' + (idx + 1));
      }

      function exportPersonaMd() {
        var content = persona.value.coreDutyMd || '';
        var filename = '人设.md';
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
          persona.value.coreDutyMd = ev.target.result || '';
          persona.value.workflowMd = '';
          persona.value.behaviorMd = '';
          ElementPlus.ElMessage.success('已导入 ' + file.name);
        };
        reader.readAsText(file);
        e.target.value = '';
      }

      function personaPreviewContent() {
        return persona.value.coreDutyMd || '';
      }

      function personaPreviewTabLabel() {
        return '人设.md';
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

      var personaConfigured = Vue.computed(function () {
        var p = persona.value;
        return !!(p.coreDutyMd && p.coreDutyMd.trim()) ||
          !!(p.workflowMd && p.workflowMd.trim()) ||
          !!(p.behaviorMd && p.behaviorMd.trim());
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
        if (!ch || !ch.enabled) return 'im-channel-dot--disabled';
        if (!ch.configured || ch.state === 'not_configured') return 'im-channel-dot--warn';
        if (ch.state === 'gateway_stopped') return 'im-channel-dot--warn';
        if (ch.state === 'configured') return 'im-channel-dot--ok';
        return 'im-channel-dot--muted';
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
        if (state === 'not_configured') return '需配置';
        if (state === 'configured') return '已配置';
        if (state === 'gateway_stopped') return '消息网关未启用';
        return state || '—';
      }

      function messagingStateType(state) {
        if (state === 'configured') return 'success';
        if (state === 'not_configured') return 'warning';
        return 'info';
      }

      function personaSectionEmpty(key) {
        return !(persona.value[key] && String(persona.value[key]).trim());
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
        statusLabel: catalog.TASK_STATUS_LABEL, statusType: catalog.TASK_STATUS_TYPE,
        taskCreatedAtLabel: taskCreatedAtLabel,
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
        filteredMaterials: filteredMaterials, workspaceFiles: workspaceFiles,
        openMaterialUpload: openMaterialUpload, handleMaterialFileSelect: handleMaterialFileSelect,
        openMaterialPreview: openMaterialPreview, downloadMaterial: downloadMaterial, deleteMaterial: deleteMaterial,
        workspaceFileTypeClass: workspaceFileTypeClass, workspaceFileIcon: workspaceFileIcon, workspaceFileMeta: workspaceFileMeta,
        openWorkspaceFilePreview: openWorkspaceFilePreview, downloadWorkspaceFile: downloadWorkspaceFile, deleteWorkspaceFile: deleteWorkspaceFile,
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
        personaPreviewTab: personaPreviewTab, personaHistoryVisible: personaHistoryVisible,
        personaHistory: personaHistory, personaImportInput: personaImportInput,
        loadPersonaHistory: loadPersonaHistory, restorePersonaVersion: restorePersonaVersion,
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
        personaConfigured: personaConfigured, tabBadges: tabBadges,
        messagingSearchQuery: messagingSearchQuery, filteredImSidebarChannels: filteredImSidebarChannels,
        selectedImChannelId: selectedImChannelId, selectedImChannel: selectedImChannel,
        imSecretDraft: imSecretDraft, imGatewayEnabled: imGatewayEnabled, imSaving: imSaving,
        imRequiredFields: imRequiredFields, imOptionalFields: imOptionalFields,
        selectImChannel: selectImChannel, imPlatformIcon: imPlatformIcon, imChannelDotClass: imChannelDotClass,
        credentialPlaceholder: credentialPlaceholder, openImSetupGuide: openImSetupGuide,
        saveSelectedImChannel: saveSelectedImChannel, saveGatewayEnabled: saveGatewayEnabled,
        messagingStateLabel: messagingStateLabel, messagingStateType: messagingStateType,
        personaSectionEmpty: personaSectionEmpty
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
              <h2 class="expert-basic-info-name">{{ expert.name }}</h2>\
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
                  <div class="detail-action-bar detail-action-bar--split">\
                    <input ref="personaImportInput" type="file" accept=".md" class="material-file-input-hidden" @change="handlePersonaImport">\
                    <div class="detail-action-left">\
                      <el-button size="small" @click="triggerPersonaImport">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                        导入人设.md\
                      </el-button>\
                      <el-button size="small" @click="exportPersonaMd">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
                        导出人设.md\
                      </el-button>\
                      <el-button size="small" @click="loadPersonaHistory">版本历史</el-button>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button type="primary" size="small" @click="savePersona">保存人设</el-button>\
                    </div>\
                  </div>\
                  <div class="persona-split-layout">\
                    <div class="persona-edit-panel">\
                      <div class="persona-edit-tabs">\
                        <button type="button" class="persona-edit-tab active">人设.md</button>\
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
                      <el-input v-model="persona.coreDutyMd" type="textarea" :rows="14" placeholder="编辑人设.md，支持 Markdown 格式" class="persona-textarea" />\
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
                    <p class="detail-section-desc">统一展示上传文件与任务生成文件，便于专家执行任务时引用</p>\
                  </div>\
                  <div class="detail-action-bar detail-action-bar--split">\
                    <input ref="materialFileInput" type="file" multiple class="material-file-input-hidden" @change="handleMaterialFileSelect">\
                    <div class="detail-action-left">\
                      <el-input v-model="materialSearchQuery" placeholder="搜索文件..." size="small" clearable style="width:200px" />\
                      <el-select v-model="materialTypeFilter" size="small" style="width:110px">\
                        <el-option label="全部类型" value="all" />\
                        <el-option label="文档" value="document" />\
                        <el-option label="表格" value="spreadsheet" />\
                        <el-option label="数据" value="data" />\
                        <el-option label="报告" value="report" />\
                      </el-select>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button type="primary" size="small" @click="openMaterialUpload">上传文件</el-button>\
                    </div>\
                  </div>\
                  <div class="workspace-directory">\
                    <div class="workspace-directory-root">\
                      <span class="workspace-directory-folder-icon">📁</span>\
                      <span class="workspace-directory-folder-name">workspace/</span>\
                    </div>\
                    <div v-if="workspaceFiles.length === 0" class="profile-empty-state workspace-directory-empty">\
                      <p class="profile-empty-title">工作目录暂无文件</p>\
                      <p class="profile-empty-desc">可上传文件供专家参考；任务执行后生成的文件也会汇总到这里。</p>\
                    </div>\
                    <div v-else class="workspace-directory-list">\
                      <div v-for="file in workspaceFiles" :key="file.id" class="workspace-directory-row">\
                        <span class="workspace-directory-branch"></span>\
                        <span class="workspace-file-icon-wrap" :class="workspaceFileTypeClass(file)">\
                          <span class="workspace-file-icon">{{ workspaceFileIcon(file) }}</span>\
                        </span>\
                        <div class="workspace-directory-info">\
                          <div class="workspace-directory-name">{{ file.name }}</div>\
                          <div class="workspace-directory-meta">{{ workspaceFileMeta(file) }}</div>\
                        </div>\
                        <div class="workspace-directory-actions">\
                          <el-button link type="primary" size="small" @click="openWorkspaceFilePreview(file)">预览</el-button>\
                          <el-button link type="primary" size="small" @click="downloadWorkspaceFile(file)">下载</el-button>\
                          <el-button v-if="file.taskId" link type="primary" size="small" @click="goToArtifactTask(file.taskId)">跳转任务</el-button>\
                          <el-button v-if="file.source === \'upload\'" link type="danger" size="small" @click="deleteWorkspaceFile(file)">删除</el-button>\
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
                      <span class="task-tab-stat-item">共 <strong>{{ taskStats.total }}</strong> 个</span>\
                      <span class="task-tab-stat-sep">·</span>\
                      <span class="task-tab-stat-item">待开始 <strong>{{ taskStats.pending }}</strong></span>\
                      <span class="task-tab-stat-sep">·</span>\
                      <span class="task-tab-stat-item">进行中 <strong>{{ taskStats.running }}</strong></span>\
                      <span class="task-tab-stat-sep">·</span>\
                      <span class="task-tab-stat-item">已完成 <strong>{{ taskStats.completed }}</strong></span>\
                      <template v-if="taskStats.archived">\
                        <span class="task-tab-stat-sep">·</span>\
                        <span class="task-tab-stat-item">已归档 <strong>{{ taskStats.archived }}</strong></span>\
                      </template>\
                    </div>\
                    <div class="task-tab-tools">\
                      <el-input v-model="taskSearchQuery" placeholder="搜索任务名称或 ID..." size="small" clearable style="width:200px" />\
                      <el-select v-model="taskStatusFilter" size="small" style="width:110px">\
                        <el-option label="全部状态" value="all" />\
                        <el-option label="待开始" value="pending" />\
                        <el-option label="进行中" value="running" />\
                        <el-option label="已完成" value="completed" />\
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
                      <template #default="{ row }"><el-tag :type="statusType[row.status]" size="small">{{ statusLabel[row.status] }}</el-tag></template>\
                    </el-table-column>\
                    <el-table-column label="创建时间" width="190">\
                      <template #default="{ row }">{{ taskCreatedAtLabel(row) }}</template>\
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
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">记忆</h3>\
                    <p class="detail-section-desc">沉淀用户偏好、项目背景与领域知识，帮助专家持续积累上下文</p>\
                  </div>\
                  <div v-if="isMemoryExternal" class="profile-readonly-banner">\
                    <strong>外部记忆 Provider</strong>\
                    <span>{{ memoryMeta.hint || (\'当前使用 \' + (memoryMeta.provider || \'external\') + \'，请通过外部记忆服务管理\') }}</span>\
                  </div>\
                  <template v-else>\
                  <div class="detail-action-bar detail-action-bar--split detail-action-bar--filters">\
                    <div class="detail-action-left">\
                      <el-input v-model="memorySearchQuery" placeholder="搜索记忆..." size="small" clearable style="width:180px" />\
                      <el-select v-model="memoryCategoryFilter" size="small" style="width:110px">\
                        <el-option label="全部分类" value="all" />\
                        <el-option label="用户偏好" value="user_preference" />\
                        <el-option label="项目背景" value="project_context" />\
                        <el-option label="领域知识" value="domain_knowledge" />\
                        <el-option label="其他" value="other" />\
                      </el-select>\
                      <el-select v-model="memorySourceFilter" size="small" style="width:110px">\
                        <el-option label="全部来源" value="all" />\
                        <el-option label="手动添加" value="manual" />\
                        <el-option label="自动沉淀" value="auto" />\
                      </el-select>\
                    </div>\
                    <div class="detail-action-right">\
                      <el-button type="primary" size="small" @click="openCreateMemoryDialog">+ 新增记忆</el-button>\
                    </div>\
                  </div>\
                  <div v-if="filteredMemories.length === 0" class="profile-empty-state">\
                    <p class="profile-empty-title">暂无有效记忆条目</p>\
                    <p class="profile-empty-desc">可在上方添加用户偏好、项目背景或领域知识，帮助专家持续沉淀上下文。</p>\
                  </div>\
                  <div v-else class="memory-card-grid">\
                    <button v-for="memory in filteredMemories" :key="memory.id" type="button" class="memory-card" @click="openEditMemoryDialog(memory)">\
                      <div class="memory-card-head">\
                        <span class="memory-card-category">\
                          <span class="memory-card-category-icon">{{ MEMORY_CATEGORY_ICONS[memory.category] || MEMORY_CATEGORY_ICONS.other }}</span>\
                          {{ MEMORY_CATEGORY_LABELS[memory.category] || memory.category || \'其他\' }}\
                        </span>\
                        <span class="memory-card-source">{{ memory.source === \'auto\' ? \'自动沉淀\' : \'手动添加\' }}</span>\
                      </div>\
                      <p class="memory-card-content">{{ memory.content }}</p>\
                      <div class="memory-card-footer">\
                        <span>{{ memory.createdAt || memory.updatedAt || \'—\' }}</span>\
                        <span class="memory-card-edit-hint">点击编辑</span>\
                      </div>\
                    </button>\
                  </div>\
                  </template>\
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
                      <el-button type="primary" size="small" :loading="capabilitySaving" @click="openSkillPicker">+ 添加技能</el-button>\
                    </div>\
                  </div>\
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
                          <el-button link type="danger" size="small" @click="removeSkillBinding(row.skillId)">移除</el-button>\
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
                          <el-button link type="danger" size="small" @click="removeToolBinding(getToolsetId(row))">移除</el-button>\
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
                    </el-table>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane name="im">\
                <template #label>IM渠道 <span v-if="tabBadges.im" class="tab-count-badge">{{ tabBadges.im }}</span></template>\
                <div class="detail-tab-pane im-channel-tab">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">IM渠道</h3>\
                    <p class="detail-section-desc">配置专家可接入的即时消息渠道，统一管理启用状态与平台凭证</p>\
                  </div>\
                  <div class="im-channel-layout">\
                    <aside class="im-channel-sidebar">\
                      <el-input v-model="messagingSearchQuery" placeholder="搜索渠道..." size="small" clearable class="im-channel-search" />\
                      <div class="im-channel-list">\
                        <button\
                          v-for="ch in filteredImSidebarChannels"\
                          :key="ch.id || ch.type"\
                          type="button"\
                          class="im-channel-list-item"\
                          :class="{ active: String(selectedImChannelId) === String(ch.id || ch.type) }"\
                          @click="selectImChannel(ch)"\
                        >\
                          <span class="im-channel-list-icon">{{ imPlatformIcon(ch) }}</span>\
                          <span class="im-channel-list-name">{{ ch.name || ch.label }}</span>\
                          <span class="im-channel-dot" :class="imChannelDotClass(ch)"></span>\
                        </button>\
                        <div v-if="filteredImSidebarChannels.length === 0" class="im-channel-list-empty">无匹配渠道</div>\
                      </div>\
                    </aside>\
                    <section v-if="selectedImChannel" class="im-channel-panel">\
                      <div class="im-channel-panel-head">\
                        <div class="im-channel-panel-top">\
                          <div class="im-channel-panel-title">\
                            <span class="im-channel-panel-icon">{{ imPlatformIcon(selectedImChannel) }}</span>\
                            <div>\
                              <h3 class="im-channel-panel-name">{{ selectedImChannel.name || selectedImChannel.label }}</h3>\
                              <p class="im-channel-panel-desc">{{ selectedImChannel.description || \'—\' }}</p>\
                            </div>\
                          </div>\
                          <div class="im-channel-panel-actions">\
                            <div class="im-channel-enable">\
                              <span>启用渠道</span>\
                              <el-switch v-model="selectedImChannel.enabled" />\
                            </div>\
                            <el-button type="primary" :loading="imSaving" @click="saveSelectedImChannel">保存配置</el-button>\
                          </div>\
                        </div>\
                        <div class="im-channel-badges">\
                          <el-tag :type="selectedImChannel.enabled ? \'success\' : \'info\'" size="small" effect="plain">\
                            {{ selectedImChannel.enabled ? \'已启用\' : \'已禁用\' }}\
                          </el-tag>\
                          <el-tag :type="selectedImChannel.configured ? \'success\' : \'warning\'" size="small" effect="plain">\
                            {{ selectedImChannel.configured ? \'已配置\' : \'需配置\' }}\
                          </el-tag>\
                        </div>\
                      </div>\
                      <div class="im-channel-section">\
                        <div class="im-channel-section-label">获取凭证</div>\
                        <p class="im-channel-section-hint">在对应平台创建机器人 / 应用后，将所需凭证填入下方字段并保存。</p>\
                        <el-button v-if="selectedImChannel.docsUrl" link type="primary" class="im-channel-guide-link" @click="openImSetupGuide(selectedImChannel)">\
                          打开设置指南 ↗\
                        </el-button>\
                      </div>\
                      <div v-if="imRequiredFields.length" class="im-channel-section">\
                        <div class="im-channel-section-label im-channel-section-label--required">必填</div>\
                        <div class="im-credential-form">\
                          <div v-for="field in imRequiredFields" :key="field.key" class="im-credential-row">\
                            <div class="im-credential-labels">\
                              <div class="im-credential-label">{{ field.label }}</div>\
                              <div class="im-credential-desc">{{ field.description || field.key }}</div>\
                            </div>\
                            <el-input\
                              v-model="imSecretDraft[field.key]"\
                              :type="field.password ? \'password\' : \'text\'"\
                              :placeholder="credentialPlaceholder(field)"\
                              size="default"\
                              :show-password="field.password ? true : false"\
                              class="im-credential-input"\
                            />\
                          </div>\
                        </div>\
                      </div>\
                      <div v-if="imOptionalFields.length" class="im-channel-section">\
                        <div class="im-channel-section-label">可选</div>\
                        <div class="im-credential-form">\
                          <div v-for="field in imOptionalFields" :key="field.key" class="im-credential-row">\
                            <div class="im-credential-labels">\
                              <div class="im-credential-label">{{ field.label }}</div>\
                              <div class="im-credential-desc">{{ field.description || field.key }}</div>\
                            </div>\
                            <el-input\
                              v-model="imSecretDraft[field.key]"\
                              :type="field.password ? \'password\' : \'text\'"\
                              :placeholder="credentialPlaceholder(field)"\
                              size="default"\
                              :show-password="field.password ? true : false"\
                              class="im-credential-input"\
                            />\
                          </div>\
                        </div>\
                      </div>\
                      <div v-if="!imRequiredFields.length && !imOptionalFields.length" class="profile-empty-state im-channel-no-fields">\
                        <p class="profile-empty-title">此渠道无需额外凭证</p>\
                        <p class="profile-empty-desc">打开右上角「启用渠道」并保存。</p>\
                      </div>\
                    </section>\
                    <section v-else class="im-channel-panel im-channel-panel--empty">\
                      <p>请从左侧选择一个消息渠道</p>\
                    </section>\
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
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:#303133;background:#f5f7fa;padding:16px;border-radius:6px">{{ materialPreviewItem.content || \'（二进制文件，无法预览内容）\' }}</div>\
          </div>\
          <template #footer>\
            <el-button @click="materialPreviewVisible = false">关闭</el-button>\
            <el-button type="primary" @click="downloadMaterial(materialPreviewItem); materialPreviewVisible = false">下载</el-button>\
          </template>\
        </el-dialog>\
        <!-- 人设版本历史对话框 -->\
        <el-dialog v-model="personaHistoryVisible" title="版本历史" width="500px" append-to-body>\
          <div v-if="personaHistory.length === 0" style="text-align:center;color:#909399;padding:20px">暂无历史版本</div>\
          <div v-else class="persona-history-list">\
            <div v-for="(ver, idx) in personaHistory" :key="ver.savedAt" class="persona-history-item">\
              <div class="persona-history-item-left">\
                <span class="persona-history-version">版本 {{ personaHistory.length - idx }}</span>\
                <span class="persona-history-time">{{ ver.savedAt }}</span>\
              </div>\
              <el-button size="small" @click="restorePersonaVersion(idx)">恢复</el-button>\
            </div>\
          </div>\
          <template #footer>\
            <el-button @click="personaHistoryVisible = false">关闭</el-button>\
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
      </div>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };


  window.ExpertDetailPage = ExpertDetailPage;
})();
