(function () {
  var store = window.AppStore;
  var catalog = window;
  var readImageFile = window.readImageFile;
  var parseRoute = window.AppShared.parseRoute;
  var nav = window.AppShared.nav;
  var expertMatchesSearch = window.AppShared.expertMatchesSearch;
  var PROJECT_ICON_PRESETS = window.AppShared.PROJECT_ICON_PRESETS;
  var isProjectIconImage = window.AppShared.isProjectIconImage;

  var ExpertCenterPage = {
    props: ['openCreate'],
    emits: ['nav', 'refresh'],
    setup: function (props, ctx) {
      var experts = Vue.ref([]);
      var expertEdit = createExpertEditForm(store, { onSaved: function () { load(); } });
      var createWizard = createExpertCreateForm(store, {
        onCreated: function (expert) {
          load();
          ctx.emit('nav', '/experts/' + expert.id + '?tab=persona');
        }
      });

      function load() {
        experts.value = store.getExperts();
      }

      function goTasks(expert) { ctx.emit('nav', '/experts/' + expert.id + '/tasks'); }
      function goManage(expert) { ctx.emit('nav', '/experts/' + expert.id + '?tab=persona'); }

      var showPreviewDialog = Vue.ref(false);
      var previewExpert = Vue.ref(null);
      var previewStats = Vue.ref({ tasks: 0, projects: 0, skills: 0, tools: 0 });

      function getExpertStats(expertId) {
        return {
          tasks: store.getTasksByExpert(expertId).length,
          projects: store.getProjectsByExpert(expertId).length,
          skills: store.getSkillIds(expertId).length,
          tools: store.getToolIds(expertId).length
        };
      }

      function openPreview(expert) {
        previewExpert.value = expert;
        previewStats.value = getExpertStats(expert.id);
        showPreviewDialog.value = true;
      }

      function closePreview() {
        showPreviewDialog.value = false;
        previewExpert.value = null;
      }

      function goManageFromPreview() {
        if (!previewExpert.value) return;
        var id = previewExpert.value.id;
        closePreview();
        ctx.emit('nav', '/experts/' + id + '?tab=persona');
      }

      function goTasksFromPreview() {
        if (!previewExpert.value) return;
        var id = previewExpert.value.id;
        closePreview();
        ctx.emit('nav', '/experts/' + id + '/tasks');
      }

      function removeExpert(expert) {
        ElementPlus.ElMessageBox.confirm(
          '确定删除专家「' + expert.name + '」？删除后不可恢复。',
          '删除专家',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          store.deleteExpert(expert.id);
          load();
          ElementPlus.ElMessage.success('专家已删除');
        }).catch(function () {});
      }

      function handleExpertMenu(command, expert) {
        if (command === 'preview') openPreview(expert);
        else if (command === 'edit') expertEdit.openEdit(expert);
        else if (command === 'delete') removeExpert(expert);
      }

      load();
      Vue.onMounted(function () {
        load();
        window.addEventListener('app-store-updated', load);
      });
      Vue.onBeforeUnmount(function () {
        window.removeEventListener('app-store-updated', load);
      });

      Vue.watch(function () { return props.openCreate; }, function (v) {
        if (v === '1' || v === true) {
          createWizard.openCreateDialog();
          ctx.emit('nav', '/experts');
        }
      }, { immediate: true });

      return {
        experts: experts,
        tagColors: catalog.TAG_COLORS,
        skills: catalog.SKILLS_CATALOG,
        tools: catalog.TOOLS_CATALOG,
        expertEdit: expertEdit,
        createWizard: createWizard,
        showPreviewDialog: showPreviewDialog,
        previewExpert: previewExpert,
        previewStats: previewStats,
        goTasks: goTasks,
        goManage: goManage,
        openPreview: openPreview,
        closePreview: closePreview,
        goManageFromPreview: goManageFromPreview,
        goTasksFromPreview: goTasksFromPreview,
        openCreateDialog: createWizard.openCreateDialog,
        handleExpertMenu: handleExpertMenu,
        load: load
      };
    },
    template: '\
      <div class="main-scroll list-page">\
        <div class="page-header-row">\
          <div class="page-header-text">\
            <h1 class="page-title">专家</h1>\
            <p class="page-subtitle">共 {{ experts.length }} 位智能体专家 · 下发任务或管理专家配置</p>\
          </div>\
          <create-action-btn label="新建专家" theme="expert" @click="openCreateDialog" />\
        </div>\
        <div class="expert-grid">\
          <div v-for="expert in experts" :key="expert.id" class="expert-card">\
            <div class="expert-card-accent"></div>\
            <el-dropdown trigger="click" @command="handleExpertMenu($event, expert)">\
              <button class="card-more-btn" title="更多操作" @click.stop>\
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>\
              </button>\
              <template #dropdown>\
                <el-dropdown-menu>\
                  <el-dropdown-item command="preview">预览</el-dropdown-item>\
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>\
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>\
                </el-dropdown-menu>\
              </template>\
            </el-dropdown>\
            <div class="expert-card-body" @click="goManage(expert)">\
              <div class="card-header">\
                <img class="card-avatar" :src="expert.avatar" :alt="expert.name">\
                <div class="card-header-text">\
                  <div class="card-name">{{ expert.name }}</div>\
                </div>\
              </div>\
              <p class="card-desc">{{ expert.description }}</p>\
              <div class="card-footer">\
                <div class="card-tags">\
                  <span v-for="(tag, idx) in expert.expertise" :key="tag" class="expertise-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>\
                </div>\
              </div>\
            </div>\
            <div class="expert-card-actions">\
              <button type="button" class="expert-card-action expert-card-action-primary" @click="goTasks(expert)">\
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>\
                下发任务\
              </button>\
              <span class="expert-card-action-divider"></span>\
              <button type="button" class="expert-card-action" @click="goManage(expert)">\
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\
                管理\
              </button>\
            </div>\
          </div>\
          <div v-if="experts.length === 0" class="empty-state">\
            <div class="empty-state-icon">👤</div>\
            <p>暂无专家</p>\
            <create-action-btn label="创建第一位专家" theme="expert" soft @click="openCreateDialog" />\
          </div>\
        </div>\
        <el-dialog v-model="showPreviewDialog" width="440px" class="expert-preview-dialog" append-to-body @closed="previewExpert = null">\
          <div v-if="previewExpert" class="expert-preview">\
            <div class="expert-preview-header">\
              <div class="expert-preview-avatar-wrap">\
                <div class="expert-preview-polaroid">\
                  <img :src="previewExpert.avatar" :alt="previewExpert.name">\
                </div>\
              </div>\
              <div class="expert-preview-profile">\
                <h2 class="expert-preview-name">{{ previewExpert.name }}</h2>\
                <div class="expert-preview-meta">\
                  <span class="expert-preview-online"><i></i>在线</span>\
                  <span v-if="previewExpert.createdAt || previewExpert.updatedAt" class="expert-preview-dot">·</span>\
                  <span v-if="previewExpert.createdAt || previewExpert.updatedAt">创建时间 {{ previewExpert.createdAt || previewExpert.updatedAt }}</span>\
                </div>\
              </div>\
            </div>\
            <div class="expert-preview-stats">\
              <div class="expert-preview-stat">\
                <span class="expert-preview-stat-value">{{ previewStats.tasks }}</span>\
                <span class="expert-preview-stat-label">任务</span>\
              </div>\
              <div class="expert-preview-stat">\
                <span class="expert-preview-stat-value">{{ previewStats.projects }}</span>\
                <span class="expert-preview-stat-label">项目</span>\
              </div>\
              <div class="expert-preview-stat">\
                <span class="expert-preview-stat-value">{{ previewStats.skills }}</span>\
                <span class="expert-preview-stat-label">技能</span>\
              </div>\
              <div class="expert-preview-stat">\
                <span class="expert-preview-stat-value">{{ previewStats.tools }}</span>\
                <span class="expert-preview-stat-label">工具</span>\
              </div>\
            </div>\
            <div class="expert-preview-section">\
              <div class="expert-preview-section-title">能力介绍</div>\
              <p class="expert-preview-desc">{{ previewExpert.description || \'暂无介绍\' }}</p>\
            </div>\
            <div v-if="previewExpert.expertise && previewExpert.expertise.length" class="expert-preview-section">\
              <div class="expert-preview-section-title">擅长领域</div>\
              <div class="expert-preview-tags">\
                <span v-for="(tag, idx) in previewExpert.expertise" :key="tag" class="expert-preview-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>\
              </div>\
            </div>\
            <div class="expert-preview-actions">\
              <button type="button" class="expert-preview-action-btn expert-preview-action-primary" @click="goTasksFromPreview">\
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>\
                下发任务\
              </button>\
              <button type="button" class="expert-preview-action-btn" @click="goManageFromPreview">\
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\
                管理\
              </button>\
            </div>\
          </div>\
        </el-dialog>\
        <expert-create-page-dialog :wizard="createWizard" :tag-colors="tagColors" :skills="skills" :tools="tools" />\
        <expert-edit-page-dialog :edit="expertEdit" header-title="编辑专家" :tag-colors="tagColors" />\
      </div>'
  };

  var ExpertDetailPage = {
    props: ['expertId', 'initialTab'],
    emits: ['nav'],
    setup: function (props, ctx) {
      var expert = Vue.ref(null);
      var activeTab = Vue.ref(props.initialTab || 'persona');
      if (activeTab.value === 'overview' || activeTab.value === 'basic') activeTab.value = 'persona';
      var persona = Vue.ref({ coreDutyMd: '', workflowMd: '', behaviorMd: '' });
      var workspaceTab = Vue.ref('materials');
      var taskSubTab = Vue.ref('dialogue');
      var tasks = Vue.ref([]);
      var projects = Vue.ref([]);
      var memories = Vue.ref([]);
      var memoryInput = Vue.ref('');
      var skillBindings = Vue.ref([]);
      var toolBindings = Vue.ref([]);
      var imChannels = Vue.ref([]);
      var permissions = Vue.ref([]);
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
      var newTaskType = Vue.ref('dialogue');

      // ---- 产物 Tab 新增 ----
      var artifactSearchQuery = Vue.ref('');
      var artifactTypeFilter = Vue.ref('all');
      var artifactTaskFilter = Vue.ref('all');
      var artifactPreviewVisible = Vue.ref(false);
      var artifactPreviewItem = Vue.ref(null);

      // ---- 权限管控 Tab 新增 ----
      var permDialogVisible = Vue.ref(false);
      var permForm = Vue.ref({ label: '', permission: 'use', subjectType: 'user', subjectId: '' });
      var editingPermId = Vue.ref(null);

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

      // ---- 人设 Tab 新增 ----
      var personaPreviewTab = Vue.ref('coreDutyMd');
      var personaHistoryVisible = Vue.ref(false);
      var personaHistory = Vue.ref([]);
      var personaImportInput = Vue.ref(null);

      function goAssignTask() {
        if (!expert.value) return;
        ctx.emit('nav', '/experts/' + expert.value.id + '/tasks');
      }

      function load() {
        expert.value = store.getExpert(props.expertId);
        if (!expert.value) return;
        persona.value = Object.assign({}, store.getPersona(props.expertId));
        tasks.value = store.getTasksByExpert(props.expertId);
        projects.value = store.getProjectsByExpert(props.expertId);
        memories.value = store.getMemories(props.expertId);
        skillBindings.value = store.getSkillBindings(props.expertId);
        toolBindings.value = store.getToolBindings(props.expertId);
        imChannels.value = store.getImChannels(props.expertId).length
          ? store.getImChannels(props.expertId).map(function (c) {
              return Object.assign({ subscriptions: [] }, c);
            })
          : catalog.IM_CHANNEL_TYPES.map(function (c) { return { type: c.id, label: c.label, enabled: false, config: '', subscriptions: [] }; });
        permissions.value = store.getPermissions(props.expertId).slice();
        materials.value = store.getWorkspaceFiles(props.expertId);
        expertArtifacts.value = store.getExpertArtifacts(props.expertId);
      }

      function savePersona() {
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
      function removeMemory(id) { store.deleteMemory(id); memories.value = store.getMemories(props.expertId); }
      function saveIm() { store.saveImChannels(props.expertId, imChannels.value); ElementPlus.ElMessage.success('IM 配置已保存'); }
      function savePerm() { store.savePermissions(props.expertId, permissions.value); ElementPlus.ElMessage.success('权限已保存'); }
      function addMaterial() {
        if (!fileNameInput.value.trim()) return;
        store.addWorkspaceFile(props.expertId, fileNameInput.value.trim());
        fileNameInput.value = '';
        materials.value = store.getWorkspaceFiles(props.expertId);
      }

      // ---- 任务 Tab 方法 ----
      var filteredTasks = Vue.computed(function () {
        var list = tasks.value.filter(function (t) {
          return taskSubTab.value === 'dialogue' ? t.type === 'dialogue' : t.type === 'project';
        });
        if (taskSearchQuery.value.trim()) {
          var q = taskSearchQuery.value.trim().toLowerCase();
          list = list.filter(function (t) { return (t.title || '').toLowerCase().indexOf(q) >= 0; });
        }
        if (taskStatusFilter.value !== 'all') {
          list = list.filter(function (t) { return t.status === taskStatusFilter.value; });
        }
        return list;
      });

      var taskStats = Vue.computed(function () {
        var list = tasks.value.filter(function (t) {
          return taskSubTab.value === 'dialogue' ? t.type === 'dialogue' : t.type === 'project';
        });
        var counts = { total: list.length, pending: 0, running: 0, completed: 0, archived: 0 };
        list.forEach(function (t) {
          if (t.archived) counts.archived++;
          else if (t.status === 'pending') counts.pending++;
          else if (t.status === 'running') counts.running++;
          else if (t.status === 'completed') counts.completed++;
        });
        return counts;
      });

      function openNewTaskDialog() {
        newTaskTitle.value = '';
        newTaskType.value = taskSubTab.value;
        newTaskDialogVisible.value = true;
      }

      function submitNewTask() {
        if (!newTaskTitle.value.trim()) return;
        store.createTask({ expertId: props.expertId, title: newTaskTitle.value.trim(), type: newTaskType.value });
        newTaskDialogVisible.value = false;
        tasks.value = store.getTasksByExpert(props.expertId);
        ElementPlus.ElMessage.success('任务已创建');
      }

      function editTaskTitle(task) {
        ElementPlus.ElMessageBox.prompt('请输入任务名称', '编辑任务', {
          confirmButtonText: '确定', cancelButtonText: '取消',
          inputValue: task.title, inputPattern: /\S+/, inputErrorMessage: '名称不能为空'
        }).then(function (result) {
          store.updateTask(task.id, { title: result.value.trim(), titleSet: true });
          tasks.value = store.getTasksByExpert(props.expertId);
          ElementPlus.ElMessage.success('任务名称已更新');
        }).catch(function () {});
      }

      function taskSourceLabel(task) {
        if (!task || !task.type) return '未知';
        if (task.type === 'project') return '项目任务';
        if (task.type === 'dialogue') return '对话任务';
        return task.type;
      }

      function taskCreatedAtLabel(task) {
        return (task && (task.createdAt || task.updatedAt)) || '-';
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
          store.deleteTask(task.id);
          tasks.value = store.getTasksByExpert(props.expertId);
          ElementPlus.ElMessage.success('任务已删除');
        }).catch(function () {});
      }

      // ---- 项目 Tab 方法 ----
      function getProjectMemberInfo(projectId) {
        var members = store.getProjectMembers(projectId);
        var m = members.find(function (x) { return x.expertId === props.expertId; });
        return m || null;
      }

      function getProjectTaskStats(projectId) {
        var ptasks = store.getProjectTasks(projectId).filter(function (t) { return t.expertId === props.expertId; });
        return {
          done: ptasks.filter(function (t) { return t.status === 'done'; }).length,
          total: ptasks.length
        };
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

      // ---- 权限管控 Tab 方法 ----
      function openAddPermDialog() {
        editingPermId.value = null;
        permForm.value = { label: '', permission: 'use', subjectType: 'user', subjectId: '' };
        permDialogVisible.value = true;
      }

      function openEditPermDialog(perm) {
        editingPermId.value = perm.id;
        permForm.value = {
          label: perm.label,
          permission: perm.permission,
          subjectType: perm.subjectType,
          subjectId: perm.subjectId
        };
        permDialogVisible.value = true;
      }

      function submitPerm() {
        if (!permForm.value.label.trim()) {
          ElementPlus.ElMessage.warning('请填写授权对象名称');
          return;
        }
        var list = permissions.value.slice();
        if (editingPermId.value) {
          var idx = list.findIndex(function (p) { return p.id === editingPermId.value; });
          if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], {
              label: permForm.value.label.trim(),
              permission: permForm.value.permission,
              subjectType: permForm.value.subjectType,
              subjectId: permForm.value.subjectId || permForm.value.label.trim()
            });
          }
        } else {
          list.push({
            id: 'perm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            subjectType: permForm.value.subjectType,
            subjectId: permForm.value.subjectId || permForm.value.label.trim(),
            permission: permForm.value.permission,
            label: permForm.value.label.trim()
          });
        }
        permissions.value = list;
        store.savePermissions(props.expertId, list);
        permDialogVisible.value = false;
        ElementPlus.ElMessage.success(editingPermId.value ? '权限已更新' : '授权已添加');
      }

      function deletePerm(perm) {
        ElementPlus.ElMessageBox.confirm(
          '确定移除「' + perm.label + '」的授权？', '移除授权',
          { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          var list = permissions.value.filter(function (p) { return p.id !== perm.id; });
          permissions.value = list;
          store.savePermissions(props.expertId, list);
          ElementPlus.ElMessage.success('授权已移除');
        }).catch(function () {});
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
          '确定删除资料「' + item.name + '」？', '删除资料',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          store.deleteWorkspaceFile(props.expertId, item.id);
          materials.value = store.getWorkspaceFiles(props.expertId);
          ElementPlus.ElMessage.success('资料已删除');
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

      // ---- 记忆 Tab 方法 ----
      var filteredMemories = Vue.computed(function () {
        var list = memories.value;
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

      function addMemoryWithCategory() {
        if (!memoryInput.value.trim()) return;
        store.addMemory(props.expertId, memoryInput.value.trim(), memoryCategoryInput.value);
        memoryInput.value = '';
        memories.value = store.getMemories(props.expertId);
      }

      // ---- 人设 Tab 方法 ----
      function loadPersonaHistory() {
        personaHistory.value = store.getPersonaHistory(props.expertId);
        personaHistoryVisible.value = true;
      }

      function restorePersonaVersion(idx) {
        var snap = store.restorePersonaVersion(props.expertId, idx);
        if (!snap) return;
        persona.value = Object.assign({}, snap);
        personaHistoryVisible.value = false;
        ElementPlus.ElMessage.success('已恢复到版本 ' + (idx + 1));
      }

      function exportPersonaMd() {
        var tab = personaPreviewTab.value;
        var content = persona.value[tab] || '';
        var filename = '';
        if (tab === 'coreDutyMd') filename = '核心职责.md';
        else if (tab === 'workflowMd') filename = '工作流程.md';
        else filename = '行为准则.md';
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
          persona.value[personaPreviewTab.value] = ev.target.result || '';
          ElementPlus.ElMessage.success('已导入 ' + file.name);
        };
        reader.readAsText(file);
        e.target.value = '';
      }

      function personaPreviewContent() {
        return persona.value[personaPreviewTab.value] || '';
      }

      function personaPreviewTabLabel() {
        if (personaPreviewTab.value === 'coreDutyMd') return '核心职责';
        if (personaPreviewTab.value === 'workflowMd') return '工作流程';
        return '行为准则';
      }

      // ---- 技能 Tab 方法 ----
      function addSkillBinding() {
        var boundIds = skillBindings.value.map(function (b) { return b.skillId; });
        var available = catalog.SKILLS_CATALOG.filter(function (s) { return boundIds.indexOf(s.id) === -1; });
        if (!available.length) { ElementPlus.ElMessage.info('所有技能已绑定'); return; }
        store.addSkillBinding(props.expertId, available[0].skillId);
        skillBindings.value = store.getSkillBindings(props.expertId);
      }

      function removeSkillBinding(skillId) {
        store.removeSkillBinding(props.expertId, skillId);
        skillBindings.value = store.getSkillBindings(props.expertId);
      }

      function toggleSkill(skillId, enabled) {
        store.toggleSkillBinding(props.expertId, skillId, enabled);
        skillBindings.value = store.getSkillBindings(props.expertId);
      }

      function updateSkillParam(skillId, key, value) {
        var b = skillBindings.value.find(function (x) { return x.skillId === skillId; });
        if (!b) return;
        var params = Object.assign({}, b.params || {});
        params[key] = value;
        store.updateSkillParams(props.expertId, skillId, params);
        skillBindings.value = store.getSkillBindings(props.expertId);
      }

      function getSkillInfo(skillId) {
        return catalog.SKILLS_CATALOG.find(function (s) { return s.id === skillId; }) || {};
      }

      function getSkillParamSchema(skillId) {
        return (window.SKILL_PARAM_SCHEMAS || {})[skillId] || [];
      }

      // ---- 工具 Tab 方法 ----
      function addToolBinding() {
        var boundIds = toolBindings.value.map(function (b) { return b.toolId; });
        var available = catalog.TOOLS_CATALOG.filter(function (t) { return boundIds.indexOf(t.id) === -1; });
        if (!available.length) { ElementPlus.ElMessage.info('所有工具已绑定'); return; }
        store.addToolBinding(props.expertId, available[0].toolId);
        toolBindings.value = store.getToolBindings(props.expertId);
      }

      function removeToolBinding(toolId) {
        store.removeToolBinding(props.expertId, toolId);
        toolBindings.value = store.getToolBindings(props.expertId);
      }

      function toggleTool(toolId, enabled) {
        store.toggleToolBinding(props.expertId, toolId, enabled);
        toolBindings.value = store.getToolBindings(props.expertId);
      }

      function updateToolConfig(toolId, key, value) {
        var b = toolBindings.value.find(function (x) { return x.toolId === toolId; });
        if (!b) return;
        var config = Object.assign({}, b.config || {});
        config[key] = value;
        store.updateToolConfig(props.expertId, toolId, config);
        toolBindings.value = store.getToolBindings(props.expertId);
      }

      function testToolConnection(toolId) {
        store.testToolConnection(props.expertId, toolId);
        toolBindings.value = store.getToolBindings(props.expertId);
        ElementPlus.ElMessage.success('连接测试通过');
      }

      function getToolInfo(toolId) {
        return catalog.TOOLS_CATALOG.find(function (t) { return t.id === toolId; }) || {};
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

      function insertMarkdown(prefix, suffix) {
        var textarea = document.querySelector('.persona-textarea textarea');
        if (!textarea) return;
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var text = persona.value[personaPreviewTab.value] || '';
        var selected = text.substring(start, end);
        var replacement = prefix + selected + suffix;
        persona.value[personaPreviewTab.value] = text.substring(0, start) + replacement + text.substring(end);
        Vue.nextTick(function () {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        });
      }

      function renderMarkdown(md) {
        if (!md) return '';
        var html = md
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-size:14px;font-weight:600">$1</h4>')
          .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 8px;font-size:15px;font-weight:700">$1</h3>')
          .replace(/^# (.+)$/gm, '<h2 style="margin:16px 0 8px;font-size:16px;font-weight:700">$1</h2>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:#4080ff">$1</a>')
          .replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
          .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal">$2</li>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');
        return html;
      }

      Vue.watch(function () { return props.expertId; }, load);
      Vue.onMounted(load);

      return {
        expert: expert, activeTab: activeTab, persona: persona, workspaceTab: workspaceTab, taskSubTab: taskSubTab,
        tasks: tasks, projects: projects, memories: memories, memoryInput: memoryInput,
        skillBindings: skillBindings, toolBindings: toolBindings,
        imChannels: imChannels, permissions: permissions, materials: materials, expertArtifacts: expertArtifacts,
        fileNameInput: fileNameInput,
        expertEdit: expertEdit, openEditDialog: expertEdit.openEditDialog,
        skills: catalog.SKILLS_CATALOG, tools: catalog.TOOLS_CATALOG,
        tagColors: catalog.TAG_COLORS,
        statusLabel: catalog.TASK_STATUS_LABEL, statusType: catalog.TASK_STATUS_TYPE,
        taskSourceLabel: taskSourceLabel, taskCreatedAtLabel: taskCreatedAtLabel,
        artifactTypeLabel: catalog.ARTIFACT_TYPE_LABEL,
        savePersona: savePersona, saveSkillBindings: saveSkillBindings, saveToolBindings: saveToolBindings,
        addMemory: addMemory, removeMemory: removeMemory, saveIm: saveIm, savePerm: savePerm, addMaterial: addMaterial,
        goAssignTask: goAssignTask,
        // 任务 Tab
        taskSearchQuery: taskSearchQuery, taskStatusFilter: taskStatusFilter,
        newTaskDialogVisible: newTaskDialogVisible, newTaskTitle: newTaskTitle, newTaskType: newTaskType,
        filteredTasks: filteredTasks, taskStats: taskStats,
        openNewTaskDialog: openNewTaskDialog, submitNewTask: submitNewTask,
        editTaskTitle: editTaskTitle, archiveTaskItem: archiveTaskItem, deleteTaskItem: deleteTaskItem,
        // 项目 Tab
        getProjectMemberInfo: getProjectMemberInfo, getProjectTaskStats: getProjectTaskStats,
        // 产物 Tab
        artifactSearchQuery: artifactSearchQuery, artifactTypeFilter: artifactTypeFilter, artifactTaskFilter: artifactTaskFilter,
        artifactPreviewVisible: artifactPreviewVisible, artifactPreviewItem: artifactPreviewItem,
        filteredArtifacts: filteredArtifacts, artifactStats: artifactStats,
        openArtifactPreview: openArtifactPreview, downloadArtifact: downloadArtifact, goToArtifactTask: goToArtifactTask,
        // 权限管控 Tab
        permDialogVisible: permDialogVisible, permForm: permForm, editingPermId: editingPermId,
        openAddPermDialog: openAddPermDialog, openEditPermDialog: openEditPermDialog,
        submitPerm: submitPerm, deletePerm: deletePerm,
        // 资料 Tab
        materialFileInput: materialFileInput, materialTypeFilter: materialTypeFilter, materialSearchQuery: materialSearchQuery,
        materialPreviewVisible: materialPreviewVisible, materialPreviewItem: materialPreviewItem,
        filteredMaterials: filteredMaterials,
        openMaterialUpload: openMaterialUpload, handleMaterialFileSelect: handleMaterialFileSelect,
        openMaterialPreview: openMaterialPreview, downloadMaterial: downloadMaterial, deleteMaterial: deleteMaterial,
        fileTypeIcon: fileTypeIcon, formatFileSize: formatFileSize,
        // 记忆 Tab
        memoryCategoryFilter: memoryCategoryFilter, memorySourceFilter: memorySourceFilter, memorySearchQuery: memorySearchQuery,
        memoryCategoryInput: memoryCategoryInput,
        filteredMemories: filteredMemories, memoryStats: memoryStats,
        MEMORY_CATEGORY_LABELS: MEMORY_CATEGORY_LABELS, MEMORY_CATEGORY_ICONS: MEMORY_CATEGORY_ICONS,
        addMemoryWithCategory: addMemoryWithCategory,
        // 人设 Tab
        personaPreviewTab: personaPreviewTab, personaHistoryVisible: personaHistoryVisible,
        personaHistory: personaHistory, personaImportInput: personaImportInput,
        loadPersonaHistory: loadPersonaHistory, restorePersonaVersion: restorePersonaVersion,
        exportPersonaMd: exportPersonaMd, triggerPersonaImport: triggerPersonaImport,
        handlePersonaImport: handlePersonaImport,
        personaPreviewContent: personaPreviewContent, personaPreviewTabLabel: personaPreviewTabLabel,
        renderMarkdown: renderMarkdown, insertMarkdown: insertMarkdown,
        // 技能 Tab
        addSkillBinding: addSkillBinding, removeSkillBinding: removeSkillBinding,
        toggleSkill: toggleSkill, updateSkillParam: updateSkillParam,
        getSkillInfo: getSkillInfo, getSkillParamSchema: getSkillParamSchema,
        // 工具 Tab
        addToolBinding: addToolBinding, removeToolBinding: removeToolBinding,
        toggleTool: toggleTool, updateToolConfig: updateToolConfig, testToolConnection: testToolConnection,
        getToolInfo: getToolInfo, getToolParamSchema: getToolParamSchema,
        toolStatusLabel: toolStatusLabel, toolStatusType: toolStatusType,
        // IM 渠道
        IM_SUBSCRIPTION_OPTIONS: IM_SUBSCRIPTION_OPTIONS,
        toggleImSubscription: toggleImSubscription, testImConnection: testImConnection,
        load: load
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
            下发任务\
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
                <span v-for="(tag, idx) in expert.expertise" :key="tag" class="expertise-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>\
              </div>\
            </div>\
            <button type="button" class="section-edit-btn" title="编辑" @click="openEditDialog">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>\
            </button>\
          </div>\
        </div>\
        <div class="detail-main expert-detail-tabs">\
          <el-tabs v-model="activeTab" class="expert-detail-tabs-inner">\
              <el-tab-pane label="人设" name="persona">\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">人设配置</h3>\
                    <p class="detail-section-desc">定义专家的核心职责、工作流程与行为准则</p>\
                  </div>\
                  <div class="persona-split-layout">\
                    <div class="persona-edit-panel">\
                      <div class="persona-edit-tabs">\
                        <button type="button" class="persona-edit-tab" :class="{ active: personaPreviewTab === \'coreDutyMd\' }" @click="personaPreviewTab = \'coreDutyMd\'">核心职责</button>\
                        <button type="button" class="persona-edit-tab" :class="{ active: personaPreviewTab === \'workflowMd\' }" @click="personaPreviewTab = \'workflowMd\'">工作流程</button>\
                        <button type="button" class="persona-edit-tab" :class="{ active: personaPreviewTab === \'behaviorMd\' }" @click="personaPreviewTab = \'behaviorMd\'">行为准则</button>\
                      </div>\
                      <div class="persona-edit-toolbar">\
                        <button type="button" class="persona-toolbar-btn" title="加粗" @click="insertMarkdown(\'**\', \'**\')"><b>B</b></button>\
                        <button type="button" class="persona-toolbar-btn" title="斜体" @click="insertMarkdown(\'*\', \'*\')"><i>I</i></button>\
                        <button type="button" class="persona-toolbar-btn" title="标题" @click="insertMarkdown(\'## \', \'\')">H2</button>\
                        <button type="button" class="persona-toolbar-btn" title="列表" @click="insertMarkdown(\'- \', \'\')">•</button>\
                        <button type="button" class="persona-toolbar-btn" title="链接" @click="insertMarkdown(\'[\', \'](url)\')">🔗</button>\
                      </div>\
                      <el-input v-model="persona[personaPreviewTab]" type="textarea" :rows="14" :placeholder="\'描述\' + personaPreviewTabLabel() + \'…\'" class="persona-textarea" />\
                    </div>\
                    <div class="persona-preview-panel">\
                      <div class="persona-preview-head">\
                        <span class="persona-preview-head-title">预览 · {{ personaPreviewTabLabel() }}</span>\
                      </div>\
                      <div class="persona-preview-content" v-html="renderMarkdown(personaPreviewContent())"></div>\
                    </div>\
                  </div>\
                  <div class="detail-tab-footer" style="justify-content:space-between;flex-wrap:wrap;gap:8px">\
                    <div style="display:flex;gap:8px">\
                      <input ref="personaImportInput" type="file" accept=".md" class="material-file-input-hidden" @change="handlePersonaImport">\
                      <el-button size="small" @click="triggerPersonaImport">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                        导入 .md\
                      </el-button>\
                      <el-button size="small" @click="exportPersonaMd">\
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
                        导出 .md\
                      </el-button>\
                      <el-button size="small" @click="loadPersonaHistory">版本历史</el-button>\
                    </div>\
                    <el-button type="primary" @click="savePersona">保存人设</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="工作空间" name="workspace">\
                <div class="detail-tab-pane">\
                  <el-tabs v-model="workspaceTab">\
                    <el-tab-pane label="资料" name="materials">\
                      <div class="detail-action-bar">\
                        <input ref="materialFileInput" type="file" multiple class="material-file-input-hidden" @change="handleMaterialFileSelect">\
                        <el-button type="primary" size="small" @click="openMaterialUpload">上传文件</el-button>\
                        <el-input v-model="materialSearchQuery" placeholder="搜索资料..." size="small" clearable style="width:180px" />\
                        <el-select v-model="materialTypeFilter" size="small" style="width:100px">\
                          <el-option label="全部类型" value="all" />\
                          <el-option label="文档" value="document" />\
                          <el-option label="表格" value="spreadsheet" />\
                          <el-option label="数据" value="data" />\
                        </el-select>\
                      </div>\
                      <div class="detail-table-wrap">\
                        <el-table :data="filteredMaterials" stripe empty-text="暂无资料">\
                          <el-table-column prop="name" label="名称" min-width="180" />\
                          <el-table-column label="类型" width="80">\
                            <template #default="{ row }">{{ row.type === \'spreadsheet\' ? \'表格\' : row.type === \'data\' ? \'数据\' : \'文档\' }}</template>\
                          </el-table-column>\
                          <el-table-column prop="createdAt" label="添加时间" width="150" />\
                        </el-table>\
                      </div>\
                    </el-tab-pane>\
                    <el-tab-pane label="产物" name="artifacts">\
                      <div class="detail-action-bar">\
                        <el-input v-model="artifactSearchQuery" placeholder="搜索产物..." size="small" clearable style="width:180px" />\
                        <el-select v-model="artifactTypeFilter" size="small" style="width:100px">\
                          <el-option label="全部类型" value="all" />\
                          <el-option label="报告" value="report" />\
                          <el-option label="数据" value="data" />\
                          <el-option label="文档" value="document" />\
                        </el-select>\
                      </div>\
                      <div class="detail-table-wrap">\
                        <el-table :data="filteredArtifacts" stripe empty-text="暂无匹配产物">\
                          <el-table-column prop="title" label="产物标题" min-width="160" />\
                          <el-table-column label="类型" width="80">\
                            <template #default="{ row }">{{ artifactTypeLabel[row.type] || row.type }}</template>\
                          </el-table-column>\
                          <el-table-column prop="taskTitle" label="来源任务" width="140" />\
                          <el-table-column prop="createdAt" label="生成时间" width="150" />\
                        </el-table>\
                      </div>\
                    </el-tab-pane>\
                  </el-tabs>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="任务" name="tasks">\
                <div class="detail-tab-pane">\
                  <div class="detail-action-bar">\
                    <el-radio-group v-model="taskSubTab" size="small">\
                      <el-radio-button label="dialogue">对话任务</el-radio-button>\
                      <el-radio-button label="project">项目任务</el-radio-button>\
                    </el-radio-group>\
                    <div style="display:flex;gap:8px;align-items:center">\
                      <el-input v-model="taskSearchQuery" placeholder="搜索任务..." size="small" clearable style="width:200px" />\
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
                  <el-table :data="filteredTasks" stripe empty-text="暂无匹配任务">\
                    <el-table-column prop="id" label="任务ID" min-width="180" />\
                    <el-table-column prop="title" label="任务名称" min-width="160" />\
                    <el-table-column label="任务来源" width="110">\
                      <template #default="{ row }">{{ taskSourceLabel(row) }}</template>\
                    </el-table-column>\
                    <el-table-column label="状态" width="90">\
                      <template #default="{ row }"><el-tag :type="statusType[row.status]" size="small">{{ statusLabel[row.status] }}</el-tag></template>\
                    </el-table-column>\
                    <el-table-column label="创建时间" width="150">\
                      <template #default="{ row }">{{ taskCreatedAtLabel(row) }}</template>\
                    </el-table-column>\
                    <el-table-column label="操作" width="200">\
                      <template #default="{ row }">\
                        <el-button link type="primary" size="small" @click="$emit(\'nav\', \'/experts/\' + expert.id + \'/tasks/\' + row.id)">打开</el-button>\
                        <el-button link type="primary" size="small" @click="editTaskTitle(row)">编辑</el-button>\
                        <el-button v-if="!row.archived" link type="warning" size="small" @click="archiveTaskItem(row)">归档</el-button>\
                        <el-button link type="danger" size="small" @click="deleteTaskItem(row)">删除</el-button>\
                      </template>\
                    </el-table-column>\
                  </el-table>\
                  </div>\
                  <div class="detail-tab-footer detail-tab-footer--stats">\
                    <span>共 {{ taskStats.total }} 个任务</span>\
                    <span class="detail-stat-sep">·</span>\
                    <span>待开始 {{ taskStats.pending }}</span>\
                    <span class="detail-stat-sep">·</span>\
                    <span>进行中 {{ taskStats.running }}</span>\
                    <span class="detail-stat-sep">·</span>\
                    <span>已完成 {{ taskStats.completed }}</span>\
                    <span v-if="taskStats.archived" class="detail-stat-sep">·</span>\
                    <span v-if="taskStats.archived">已归档 {{ taskStats.archived }}</span>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="记忆" name="memory">\
                <div class="detail-tab-pane">\
                  <div class="detail-action-bar">\
                    <el-input v-model="memoryInput" placeholder="新增记忆条目" class="detail-action-input" size="small" />\
                    <el-select v-model="memoryCategoryInput" size="small" style="width:110px">\
                      <el-option label="用户偏好" value="user_preference" />\
                      <el-option label="项目背景" value="project_context" />\
                      <el-option label="领域知识" value="domain_knowledge" />\
                      <el-option label="其他" value="other" />\
                    </el-select>\
                    <el-button type="primary" size="small" @click="addMemoryWithCategory">添加</el-button>\
                  </div>\
                  <div class="detail-action-bar" style="padding:8px 14px">\
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
                  <div class="detail-table-wrap">\
                  <el-table :data="filteredMemories" stripe empty-text="暂无匹配记忆">\
                    <el-table-column prop="content" label="内容" min-width="240" />\
                    <el-table-column prop="createdAt" label="时间" width="150" />\
                  </el-table>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="技能" name="skills">\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">技能绑定</h3>\
                    <p class="detail-section-desc">为专家配置可使用的专业技能能力</p>\
                  </div>\
                  <div class="detail-action-bar">\
                    <span class="detail-action-bar-label">已绑定 {{ skillBindings.length }} 项技能</span>\
                    <el-button type="primary" size="small" @click="addSkillBinding">+ 添加技能</el-button>\
                  </div>\
                  <div v-if="skillBindings.length === 0" style="text-align:center;color:#909399;padding:24px">暂无绑定技能，点击上方按钮添加</div>\
                  <div v-for="b in skillBindings" :key="b.skillId" class="skill-binding-card">\
                    <div class="skill-binding-header">\
                      <div class="skill-binding-info">\
                        <span class="skill-binding-icon">🧩</span>\
                        <div>\
                          <div class="skill-binding-name">{{ getSkillInfo(b.skillId).name }}</div>\
                          <div class="skill-binding-desc">{{ getSkillInfo(b.skillId).description }}</div>\
                        </div>\
                      </div>\
                      <div class="skill-binding-actions">\
                        <el-switch v-model="b.enabled" size="small" @change="toggleSkill(b.skillId, $event)" />\
                        <el-button link type="danger" size="small" @click="removeSkillBinding(b.skillId)" title="移除">\
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\
                        </el-button>\
                      </div>\
                    </div>\
                    <div v-if="getSkillParamSchema(b.skillId).length" class="skill-params-area">\
                      <div v-for="param in getSkillParamSchema(b.skillId)" :key="param.key" class="skill-param-row">\
                        <label class="skill-param-label">{{ param.label }}</label>\
                        <el-input-number\
                          v-if="param.type === \'number\'"\
                          :model-value="(b.params || {})[param.key]"\
                          @update:model-value="updateSkillParam(b.skillId, param.key, $event)"\
                          :min="param.min" :max="param.max" :step="param.step || 1"\
                          size="small" controls-position="right" style="width:140px" />\
                        <el-select\
                          v-else-if="param.type === \'select\'"\
                          :model-value="(b.params || {})[param.key]"\
                          @update:model-value="updateSkillParam(b.skillId, param.key, $event)"\
                          size="small" style="width:160px">\
                          <el-option v-for="opt in param.options" :key="opt" :label="opt" :value="opt" />\
                        </el-select>\
                        <el-checkbox-group\
                          v-else-if="param.type === \'checkbox\'"\
                          :model-value="(b.params || {})[param.key] || []"\
                          @update:model-value="updateSkillParam(b.skillId, param.key, $event)"\
                          size="small">\
                          <el-checkbox v-for="opt in param.options" :key="opt" :label="opt" :value="opt" />\
                        </el-checkbox-group>\
                      </div>\
                    </div>\
                  </div>\
                  <div v-if="skillBindings.length" class="detail-tab-footer">\
                    <el-button type="primary" @click="saveSkillBindings">保存配置</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="工具" name="tools">\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">工具绑定</h3>\
                    <p class="detail-section-desc">配置专家可调用的工具与 MCP 服务</p>\
                  </div>\
                  <div class="detail-action-bar">\
                    <span class="detail-action-bar-label">已绑定 {{ toolBindings.length }} 项工具</span>\
                    <el-button type="primary" size="small" @click="addToolBinding">+ 添加工具</el-button>\
                  </div>\
                  <div v-if="toolBindings.length === 0" style="text-align:center;color:#909399;padding:24px">暂无绑定工具，点击上方按钮添加</div>\
                  <div v-for="b in toolBindings" :key="b.toolId" class="skill-binding-card">\
                    <div class="skill-binding-header">\
                      <div class="skill-binding-info">\
                        <span class="skill-binding-icon">⚡</span>\
                        <div>\
                          <div class="skill-binding-name">{{ getToolInfo(b.toolId).name }}</div>\
                          <div class="skill-binding-desc">{{ getToolInfo(b.toolId).description }}</div>\
                        </div>\
                      </div>\
                      <div class="skill-binding-actions">\
                        <el-tag :type="toolStatusType(b.status)" size="small" effect="plain">{{ toolStatusLabel(b.status) }}</el-tag>\
                        <el-switch v-model="b.enabled" size="small" @change="toggleTool(b.toolId, $event)" />\
                        <el-button link type="danger" size="small" @click="removeToolBinding(b.toolId)" title="移除">\
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\
                        </el-button>\
                      </div>\
                    </div>\
                    <div v-if="getToolParamSchema(b.toolId).length" class="skill-params-area">\
                      <div v-for="param in getToolParamSchema(b.toolId)" :key="param.key" class="skill-param-row">\
                        <label class="skill-param-label">{{ param.label }}</label>\
                        <el-input-number\
                          v-if="param.type === \'number\'"\
                          :model-value="(b.config || {})[param.key]"\
                          @update:model-value="updateToolConfig(b.toolId, param.key, $event)"\
                          :min="param.min" :max="param.max" :step="param.step || 1"\
                          size="small" controls-position="right" style="width:140px" />\
                        <el-select\
                          v-else-if="param.type === \'select\'"\
                          :model-value="(b.config || {})[param.key]"\
                          @update:model-value="updateToolConfig(b.toolId, param.key, $event)"\
                          size="small" style="width:180px">\
                          <el-option v-for="opt in param.options" :key="opt" :label="opt" :value="opt" />\
                        </el-select>\
                        <el-input\
                          v-else-if="param.type === \'password\'"\
                          :model-value="(b.config || {})[param.key]"\
                          @update:model-value="updateToolConfig(b.toolId, param.key, $event)"\
                          type="password" show-password size="small" style="width:260px"\
                          :placeholder="param.placeholder || \'\'" />\
                        <el-input\
                          v-else\
                          :model-value="(b.config || {})[param.key]"\
                          @update:model-value="updateToolConfig(b.toolId, param.key, $event)"\
                          size="small" style="width:260px"\
                          :placeholder="param.placeholder || \'\'" />\
                      </div>\
                    </div>\
                    <div class="skill-params-area" style="border-top:1px solid #f0f2f5;padding-top:10px">\
                      <el-button size="small" @click="testToolConnection(b.toolId)">测试连接</el-button>\
                    </div>\
                  </div>\
                  <div v-if="toolBindings.length" class="detail-tab-footer">\
                    <el-button type="primary" @click="saveToolBindings">保存配置</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="IM 渠道" name="im">\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">IM 渠道配置</h3>\
                    <p class="detail-section-desc">接入企业微信、钉钉、飞书等消息渠道</p>\
                  </div>\
                  <div v-for="ch in imChannels" :key="ch.type" class="im-channel-card">\
                    <div class="im-channel-head">\
                      <div class="im-channel-head-left">\
                        <span class="im-channel-icon">{{ ch.type === \'wecom\' ? \'💬\' : ch.type === \'dingtalk\' ? \'📱\' : \'🐦\' }}</span>\
                        <strong>{{ ch.label }}</strong>\
                      </div>\
                      <div class="im-channel-head-right">\
                        <el-switch v-model="ch.enabled" size="small" />\
                        <el-button size="small" @click="testImConnection(ch)" :disabled="!ch.enabled">测试连接</el-button>\
                      </div>\
                    </div>\
                    <div v-if="ch.enabled" class="im-channel-config">\
                      <el-input v-model="ch.config" placeholder="Webhook URL" size="small" style="margin-bottom:10px" />\
                      <div class="im-subscription-section">\
                        <span class="im-subscription-label">消息订阅</span>\
                        <div class="im-subscription-list">\
                          <el-checkbox\
                            v-for="opt in IM_SUBSCRIPTION_OPTIONS"\
                            :key="opt.key"\
                            :model-value="(ch.subscriptions || []).indexOf(opt.key) >= 0"\
                            @change="toggleImSubscription(ch, opt.key)"\
                            size="small">{{ opt.label }}</el-checkbox>\
                        </div>\
                      </div>\
                    </div>\
                  </div>\
                  <div class="detail-tab-footer">\
                    <el-button type="primary" @click="saveIm">保存 IM 配置</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="权限管控" name="permissions">\
                <div class="detail-tab-pane">\
                  <div class="detail-action-bar">\
                    <span class="detail-action-bar-label">授权规则</span>\
                    <el-button type="primary" size="small" @click="openAddPermDialog">+ 添加授权</el-button>\
                  </div>\
                  <div class="detail-table-wrap">\
                  <el-table :data="permissions" stripe empty-text="暂无授权规则">\
                    <el-table-column prop="label" label="授权对象" min-width="140" />\
                    <el-table-column label="类型" width="80">\
                      <template #default="{ row }">{{ row.subjectType === \'role\' ? \'角色\' : \'用户\' }}</template>\
                    </el-table-column>\
                    <el-table-column label="权限" width="100">\
                      <template #default="{ row }">\
                        <el-tag v-if="row.permission === \'admin\'" type="danger" size="small">管理员</el-tag>\
                        <el-tag v-else-if="row.permission === \'use\'" type="primary" size="small">可使用</el-tag>\
                        <el-tag v-else type="info" size="small">{{ row.permission }}</el-tag>\
                      </template>\
                    </el-table-column>\
                    <el-table-column label="操作" width="120">\
                      <template #default="{ row }">\
                        <el-button link type="primary" size="small" @click="openEditPermDialog(row)">编辑</el-button>\
                        <el-button link type="danger" size="small" @click="deletePerm(row)">删除</el-button>\
                      </template>\
                    </el-table-column>\
                  </el-table>\
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
              <el-input v-model="newTaskTitle" placeholder="输入任务标题..." />\
            </el-form-item>\
            <el-form-item label="任务类型">\
              <el-radio-group v-model="newTaskType">\
                <el-radio label="dialogue">对话任务</el-radio>\
                <el-radio label="project">项目任务</el-radio>\
              </el-radio-group>\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <el-button @click="newTaskDialogVisible = false">取消</el-button>\
            <el-button type="primary" @click="submitNewTask">创建</el-button>\
          </template>\
        </el-dialog>\
        <!-- 产物预览对话框 -->\
        <el-dialog v-model="artifactPreviewVisible" title="产物预览" width="560px" append-to-body @closed="artifactPreviewItem = null">\
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
        <!-- 权限添加/编辑对话框 -->\
        <el-dialog v-model="permDialogVisible" :title="editingPermId ? \'编辑授权\' : \'添加授权\'" width="440px" :close-on-click-modal="false" append-to-body>\
          <el-form label-position="top">\
            <el-form-item label="授权类型">\
              <el-radio-group v-model="permForm.subjectType">\
                <el-radio label="role">角色</el-radio>\
                <el-radio label="user">用户</el-radio>\
              </el-radio-group>\
            </el-form-item>\
            <el-form-item label="授权对象名称" required>\
              <el-input v-model="permForm.label" :placeholder="permForm.subjectType === \'role\' ? \'如：管理员、普通用户\' : \'如：张三\'" />\
            </el-form-item>\
            <el-form-item label="权限级别">\
              <el-select v-model="permForm.permission" style="width:100%">\
                <el-option label="管理员（完全控制）" value="admin" />\
                <el-option label="可使用（下发任务与查看）" value="use" />\
                <el-option label="只读（仅查看）" value="read" />\
              </el-select>\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <el-button @click="permDialogVisible = false">取消</el-button>\
            <el-button type="primary" @click="submitPerm">{{ editingPermId ? \'保存\' : \'添加\' }}</el-button>\
          </template>\
        </el-dialog>\
        <!-- 资料预览对话框 -->\
        <el-dialog v-model="materialPreviewVisible" title="资料预览" width="560px" append-to-body @closed="materialPreviewItem = null">\
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
      </div>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };


  var ProjectListPage = {
    props: ['openCreate'],
    emits: ['nav'],
    setup: function (props, ctx) {
      var projects = Vue.ref([]);
      var showCreateDialog = Vue.ref(false);
      var showEditDialog = Vue.ref(false);
      var form = Vue.ref({ name: '', description: '', expertIds: [], icon: '📁' });
      var editForm = Vue.ref({ name: '', description: '', icon: '📁' });
      var editingProject = Vue.ref(null);
      var allExperts = Vue.ref(store.getExperts());
      var createStep = Vue.ref(0);
      var projectIconInput = Vue.ref(null);
      var editProjectIconInput = Vue.ref(null);
      var memberSearchQuery = Vue.ref('');
      var CREATE_PROJECT_STEP_TITLES = ['项目信息', '项目成员'];

      function load() {
        projects.value = store.getProjects();
        allExperts.value = store.getExperts();
      }

      function resetForm() {
        form.value = { name: '', description: '', expertIds: [], icon: '📁' };
        createStep.value = 0;
        memberSearchQuery.value = '';
      }

      function openCreateDialog() {
        resetForm();
        allExperts.value = store.getExperts();
        showCreateDialog.value = true;
      }

      function closeCreateDialog() {
        showCreateDialog.value = false;
        resetForm();
      }

      function validateCreateProjectStep(step) {
        if (step === 0) {
          if (!form.value.name.trim()) {
            ElementPlus.ElMessage.warning('请填写项目名称');
            return false;
          }
          if (!form.value.description.trim()) {
            ElementPlus.ElMessage.warning('请填写项目描述');
            return false;
          }
        }
        return true;
      }

      function goProjectCreateNextStep() {
        if (!validateCreateProjectStep(createStep.value)) return;
        if (createStep.value < CREATE_PROJECT_STEP_TITLES.length - 1) {
          createStep.value += 1;
        }
      }

      function goProjectCreatePrevStep() {
        if (createStep.value > 0) createStep.value -= 1;
      }

      function triggerProjectIconUpload() {
        if (projectIconInput.value) projectIconInput.value.click();
      }

      function handleProjectIconChange(e) {
        var file = e.target.files && e.target.files[0];
        if (readImageFile(file, function (url) { form.value.icon = url; })) {
          e.target.value = '';
        }
      }

      function selectProjectIcon(emoji) {
        form.value.icon = emoji;
      }

      function isProjectMemberSelected(expertId) {
        return form.value.expertIds.indexOf(expertId) !== -1;
      }

      function toggleProjectMember(expertId) {
        var ids = form.value.expertIds.slice();
        var idx = ids.indexOf(expertId);
        if (idx === -1) ids.push(expertId);
        else ids.splice(idx, 1);
        form.value.expertIds = ids;
      }

      function goProject(project) {
        ctx.emit('nav', '/projects/' + project.id);
      }

      function resetEditForm() {
        editForm.value = { name: '', description: '', icon: '📁' };
        editingProject.value = null;
      }

      function openEdit(project) {
        editingProject.value = project;
        editForm.value = {
          name: project.name,
          description: project.description || '',
          icon: project.icon || '📁'
        };
        showEditDialog.value = true;
      }

      function triggerEditProjectIconUpload() {
        if (editProjectIconInput.value) editProjectIconInput.value.click();
      }

      function handleEditProjectIconChange(e) {
        var file = e.target.files && e.target.files[0];
        if (readImageFile(file, function (url) { editForm.value.icon = url; })) {
          e.target.value = '';
        }
      }

      function selectEditProjectIcon(emoji) {
        editForm.value.icon = emoji;
      }

      function submitEdit() {
        if (!editForm.value.name.trim()) {
          ElementPlus.ElMessage.warning('请填写项目名称');
          return;
        }
        if (!editForm.value.description.trim()) {
          ElementPlus.ElMessage.warning('请填写项目描述');
          return;
        }
        store.saveProject(Object.assign({}, editingProject.value, {
          name: editForm.value.name.trim(),
          description: editForm.value.description.trim(),
          icon: editForm.value.icon || '📁'
        }));
        showEditDialog.value = false;
        load();
        ElementPlus.ElMessage.success('项目信息已更新');
      }

      function removeProject(project) {
        ElementPlus.ElMessageBox.confirm(
          '确定删除项目「' + project.name + '」？删除后不可恢复。',
          '删除项目',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          store.deleteProject(project.id);
          load();
          ElementPlus.ElMessage.success('项目已删除');
        }).catch(function () {});
      }

      function handleProjectMenu(command, project) {
        if (command === 'edit') openEdit(project);
        else if (command === 'delete') removeProject(project);
      }

      function submitCreate() {
        if (!validateCreateProjectStep(0)) {
          createStep.value = 0;
          return;
        }
        var p = store.createProject({
          name: form.value.name.trim(),
          description: form.value.description.trim(),
          icon: form.value.icon,
          expertIds: form.value.expertIds
        });
        ElementPlus.ElMessage.success('项目创建成功');
        closeCreateDialog();
        ctx.emit('nav', '/projects/' + p.id);
      }

      Vue.onMounted(load);

      Vue.watch(function () { return props.openCreate; }, function (v) {
        if (v === '1') {
          openCreateDialog();
          ctx.emit('nav', '/projects');
        }
      }, { immediate: true });

      function getMembers(projectId) {
        return store.getProjectMembers(projectId).map(function (m) {
          return store.getExpert(m.expertId);
        }).filter(Boolean);
      }

      function getMemberCount(projectId) {
        return store.getProjectMembers(projectId).length;
      }

      function getProjectStats(projectId) {
        var tasks = store.getProjectTasks(projectId);
        var done = tasks.filter(function (t) { return t.status === 'done'; }).length;
        return {
          total: tasks.length,
          done: done,
          percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0
        };
      }

      var filteredExperts = Vue.computed(function () {
        var query = memberSearchQuery.value.trim();
        if (!query) return allExperts.value;
        return allExperts.value.filter(function (e) { return expertMatchesSearch(e, query); });
      });

      return {
        projects: projects, showCreateDialog: showCreateDialog, showEditDialog: showEditDialog,
        form: form, editForm: editForm, allExperts: allExperts,
        filteredExperts: filteredExperts,
        memberSearchQuery: memberSearchQuery,
        createStep: createStep,
        createProjectStepTitles: CREATE_PROJECT_STEP_TITLES,
        projectIconPresets: PROJECT_ICON_PRESETS,
        projectIconInput: projectIconInput,
        editProjectIconInput: editProjectIconInput,
        isProjectIconImage: isProjectIconImage,
        openCreateDialog: openCreateDialog, closeCreateDialog: closeCreateDialog, submitCreate: submitCreate,
        goProjectCreateNextStep: goProjectCreateNextStep,
        goProjectCreatePrevStep: goProjectCreatePrevStep,
        triggerProjectIconUpload: triggerProjectIconUpload,
        handleProjectIconChange: handleProjectIconChange,
        selectProjectIcon: selectProjectIcon,
        triggerEditProjectIconUpload: triggerEditProjectIconUpload,
        handleEditProjectIconChange: handleEditProjectIconChange,
        selectEditProjectIcon: selectEditProjectIcon,
        isProjectMemberSelected: isProjectMemberSelected,
        toggleProjectMember: toggleProjectMember,
        submitEdit: submitEdit, handleProjectMenu: handleProjectMenu, goProject: goProject,
        resetForm: resetForm, resetEditForm: resetEditForm,
        getMembers: getMembers, getMemberCount: getMemberCount, getProjectStats: getProjectStats
      };
    },
    template: '\
      <div class="main-scroll list-page">\
        <div class="page-header-row">\
          <div class="page-header-text">\
            <h1 class="page-title">项目</h1>\
            <p class="page-subtitle">共 {{ projects.length }} 个项目 · 多专家协同推进</p>\
          </div>\
          <create-action-btn label="新建项目" theme="project" @click="openCreateDialog" />\
        </div>\
        <div class="project-grid">\
          <div v-for="p in projects" :key="p.id" class="project-card" @click="goProject(p)">\
            <div class="project-card-accent"></div>\
            <el-dropdown trigger="click" @command="handleProjectMenu($event, p)">\
              <button class="card-more-btn" title="更多操作" @click.stop>\
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>\
              </button>\
              <template #dropdown>\
                <el-dropdown-menu>\
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>\
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>\
                </el-dropdown-menu>\
              </template>\
            </el-dropdown>\
            <div class="project-card-body">\
              <div class="project-card-head">\
                <div class="project-card-icon">\
                  <img v-if="isProjectIconImage(p.icon)" :src="p.icon" class="project-card-icon-img" :alt="p.name">\
                  <span v-else>{{ p.icon || \'📁\' }}</span>\
                </div>\
                <div class="project-card-title-wrap">\
                  <div class="card-name">{{ p.name }}</div>\
                  <span class="project-status-badge">进行中</span>\
                </div>\
              </div>\
              <p class="card-desc">{{ p.description }}</p>\
              <div v-if="getProjectStats(p.id).total" class="project-card-progress">\
                <div class="project-progress-row">\
                  <span class="project-progress-label">待办进度</span>\
                  <span class="project-progress-count">{{ getProjectStats(p.id).done }}/{{ getProjectStats(p.id).total }}</span>\
                </div>\
                <div class="project-progress-track">\
                  <div class="project-progress-fill" :style="{ width: getProjectStats(p.id).percent + \'%\' }"></div>\
                </div>\
              </div>\
              <div class="project-card-footer">\
                <div class="member-stack-wrap">\
                  <div class="member-stack">\
                    <img v-for="e in getMembers(p.id).slice(0,4)" :key="e.id" :src="e.avatar" :title="e.name">\
                    <span v-if="getMemberCount(p.id) > 4" class="member-stack-more">+{{ getMemberCount(p.id) - 4 }}</span>\
                  </div>\
                  <span class="member-count">{{ getMemberCount(p.id) }} 位专家</span>\
                </div>\
                <span class="card-time">{{ p.updatedAt }}</span>\
              </div>\
            </div>\
            <div class="card-hover-bar project-hover-bar">\
              <span class="card-hover-text">进入项目</span>\
              <svg class="card-hover-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>\
            </div>\
          </div>\
          <div v-if="projects.length === 0" class="empty-state">\
            <div class="empty-state-icon">📁</div>\
            <p>暂无项目</p>\
            <create-action-btn label="创建第一个项目" theme="project" soft @click="openCreateDialog" />\
          </div>\
        </div>\
        <el-dialog v-model="showCreateDialog" width="640px" class="form-dialog form-dialog-project form-dialog-project-wizard" :close-on-click-modal="false" @closed="resetForm">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-project dialog-header-project-wizard">\
              <div class="dialog-header-icon dialog-header-icon-project project-wizard-header-icon">\
                <img v-if="isProjectIconImage(form.icon)" :src="form.icon" alt="" class="project-wizard-header-icon-img">\
                <span v-else class="project-wizard-header-icon-emoji">{{ form.icon || \'📁\' }}</span>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">新建项目</div>\
                <div class="dialog-header-sub">分步配置项目信息与协作成员</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body form-dialog-wizard">\
            <nav class="wizard-steps-compact wizard-steps-project" aria-label="创建步骤">\
              <div\
                v-for="(title, idx) in createProjectStepTitles"\
                :key="title"\
                class="wizard-step-pill"\
                :class="{ \'wizard-step-pill-active\': createStep === idx, \'wizard-step-pill-done\': createStep > idx }">\
                <span class="wizard-step-index">\
                  <svg v-if="createStep > idx" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>\
                  <template v-else>{{ idx + 1 }}</template>\
                </span>\
                <span class="wizard-step-label">{{ title }}</span>\
              </div>\
            </nav>\
            <div class="form-dialog-step-panel">\
              <div v-show="createStep === 0" class="wizard-step-content">\
                <div class="project-basic-hero">\
                  <div class="project-icon-panel">\
                    <div class="project-icon-upload" role="button" tabindex="0" @click="triggerProjectIconUpload" @keydown.enter="triggerProjectIconUpload">\
                      <input ref="projectIconInput" type="file" accept="image/*" class="create-avatar-input" @change="handleProjectIconChange" @click.stop>\
                      <div v-if="isProjectIconImage(form.icon)" class="project-icon-preview-wrap">\
                        <img :src="form.icon" class="project-icon-preview-img" alt="项目图标">\
                        <div class="create-avatar-overlay project-icon-overlay">\
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                          <span>更换图标</span>\
                        </div>\
                      </div>\
                      <div v-else class="project-icon-emoji-display">{{ form.icon }}</div>\
                      <span class="project-icon-upload-tip">点击上传图片</span>\
                    </div>\
                    <div class="project-icon-presets">\
                      <button\
                        v-for="emoji in projectIconPresets"\
                        :key="emoji"\
                        type="button"\
                        class="project-icon-preset-btn"\
                        :class="{ \'project-icon-preset-btn-active\': form.icon === emoji && !isProjectIconImage(form.icon) }"\
                        @click="selectProjectIcon(emoji)">{{ emoji }}</button>\
                    </div>\
                  </div>\
                  <el-form label-position="top" class="form-dialog-form project-basic-form">\
                    <el-form-item label="项目名称" required>\
                      <el-input v-model="form.name" placeholder="如：12寸产线良率提升项目" size="large" />\
                    </el-form-item>\
                    <el-form-item label="项目描述" required>\
                      <el-input v-model="form.description" type="textarea" :rows="4" placeholder="简要描述项目目标与背景" />\
                    </el-form-item>\
                  </el-form>\
                </div>\
              </div>\
              <div v-show="createStep === 1" class="wizard-step-content wizard-step-members">\
                <div class="member-picker-head">\
                  <div class="member-picker-search">\
                    <svg class="member-picker-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>\
                    <el-input v-model="memberSearchQuery" placeholder="搜索专家名称、介绍或擅长领域" clearable />\
                  </div>\
                  <span class="member-picker-count">{{ form.expertIds.length }} 人已选</span>\
                </div>\
                <div v-if="filteredExperts.length" class="member-picker-grid">\
                  <button\
                    v-for="e in filteredExperts"\
                    :key="e.id"\
                    type="button"\
                    class="member-picker-card"\
                    :class="{ \'member-picker-card-selected\': isProjectMemberSelected(e.id) }"\
                    @click="toggleProjectMember(e.id)">\
                    <img :src="e.avatar" :alt="e.name" class="member-picker-avatar">\
                    <div class="member-picker-info">\
                      <span class="member-picker-name">{{ e.name }}</span>\
                      <span class="member-picker-desc-text">{{ e.description || \'暂无介绍\' }}</span>\
                      <div v-if="e.expertise && e.expertise.length" class="member-picker-tags">\
                        <span v-for="(tag, idx) in e.expertise.slice(0, 2)" :key="tag" class="member-picker-tag">{{ tag }}</span>\
                      </div>\
                    </div>\
                    <span class="member-picker-check" :class="{ \'member-picker-check-on\': isProjectMemberSelected(e.id) }">\
                      <svg v-if="isProjectMemberSelected(e.id)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>\
                    </span>\
                  </button>\
                </div>\
                <div v-else class="member-picker-empty">\
                  <div class="member-picker-empty-icon">{{ allExperts.length ? \'🔍\' : \'👤\' }}</div>\
                  <p>{{ allExperts.length ? \'未找到匹配的专家\' : \'暂无专家可邀请\' }}</p>\
                  <span>{{ allExperts.length ? \'试试其他关键词\' : \'请先在专家中心创建专家\' }}</span>\
                </div>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="closeCreateDialog">取消</el-button>\
                <el-button v-if="createStep > 0" class="wizard-btn wizard-btn-back" @click="goProjectCreatePrevStep">上一步</el-button>\
                <el-button v-if="createStep < createProjectStepTitles.length - 1" class="wizard-btn wizard-btn-next wizard-btn-next-project" @click="goProjectCreateNextStep">下一步</el-button>\
                <el-button v-else class="wizard-btn wizard-btn-submit wizard-btn-submit-project" @click="submitCreate">创建项目</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="showEditDialog" width="640px" class="form-dialog form-dialog-project form-dialog-project-wizard" :close-on-click-modal="false" @closed="resetEditForm">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-project dialog-header-project-wizard">\
              <div class="dialog-header-icon dialog-header-icon-project project-wizard-header-icon">\
                <img v-if="isProjectIconImage(editForm.icon)" :src="editForm.icon" alt="" class="project-wizard-header-icon-img">\
                <span v-else class="project-wizard-header-icon-emoji">{{ editForm.icon || \'📁\' }}</span>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">编辑项目</div>\
                <div class="dialog-header-sub">修改项目信息与图标</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="project-basic-hero">\
              <div class="project-icon-panel">\
                <div class="project-icon-upload" role="button" tabindex="0" @click="triggerEditProjectIconUpload" @keydown.enter="triggerEditProjectIconUpload">\
                  <input ref="editProjectIconInput" type="file" accept="image/*" class="create-avatar-input" @change="handleEditProjectIconChange" @click.stop>\
                  <div v-if="isProjectIconImage(editForm.icon)" class="project-icon-preview-wrap">\
                    <img :src="editForm.icon" class="project-icon-preview-img" alt="项目图标">\
                    <div class="create-avatar-overlay project-icon-overlay">\
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                      <span>更换图标</span>\
                    </div>\
                  </div>\
                  <div v-else class="project-icon-emoji-display">{{ editForm.icon }}</div>\
                  <span class="project-icon-upload-tip">点击上传图片</span>\
                </div>\
                <div class="project-icon-presets">\
                  <button\
                    v-for="emoji in projectIconPresets"\
                    :key="\'edit-\' + emoji"\
                    type="button"\
                    class="project-icon-preset-btn"\
                    :class="{ \'project-icon-preset-btn-active\': editForm.icon === emoji && !isProjectIconImage(editForm.icon) }"\
                    @click="selectEditProjectIcon(emoji)">{{ emoji }}</button>\
                </div>\
              </div>\
              <el-form label-position="top" class="form-dialog-form project-basic-form">\
                <el-form-item label="项目名称" required>\
                  <el-input v-model="editForm.name" placeholder="如：12寸产线良率提升项目" size="large" />\
                </el-form-item>\
                <el-form-item label="项目描述" required>\
                  <el-input v-model="editForm.description" type="textarea" :rows="4" placeholder="简要描述项目目标与背景" />\
                </el-form-item>\
              </el-form>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="showEditDialog = false">取消</el-button>\
                <el-button class="wizard-btn wizard-btn-submit wizard-btn-submit-project" @click="submitEdit">保存</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
      </div>'
  };

  var route = Vue.ref(parseRoute());

  window.addEventListener('hashchange', function () {
    route.value = parseRoute();
  });

  var app = Vue.createApp({
    setup: function () {
      var sidebarActive = Vue.computed(function () {
        if (route.value.name.indexOf('project') >= 0) return 'projects';
        return 'experts';
      });

      function onNav(path) { nav(path); }

      var detailTab = Vue.computed(function () {
        return route.value.query.tab || 'overview';
      });

      var projectTab = Vue.computed(function () {
        return route.value.query.tab || 'chat';
      });

      return { route: route, sidebarActive: sidebarActive, onNav: onNav, detailTab: detailTab, projectTab: projectTab };
    },
    template: '\
      <div class="app-shell">\
        <app-sidebar :active="sidebarActive" @nav="onNav" />\
        <div class="main-area">\
          <expert-center-page v-if="route.name === \'experts\'" :open-create="route.query.create === \'1\'" @nav="onNav" />\
          <expert-detail-page v-else-if="route.name === \'expert-detail\'" :expert-id="route.params.id" :initial-tab="detailTab" @nav="onNav" />\
          <expert-tasks-page v-else-if="route.name === \'expert-tasks\'" :expert-id="route.params.id" :task-id="route.params.taskId" @nav="onNav" />\
          <project-list-page v-else-if="route.name === \'projects\'" :open-create="route.query.create === \'1\'" @nav="onNav" />\
          <project-detail-page v-else-if="route.name === \'project-detail\'" :project-id="route.params.id" :initial-tab="projectTab" @nav="onNav" />\
        </div>\
      </div>'
  });

  app.component('create-action-btn', window.CreateActionBtn);
  app.component('back-link', window.BackLink);
  app.component('app-sidebar', window.AppSidebar);
  app.component('expert-edit-dialog', window.ExpertEditDialog);
  app.component('expert-edit-page-dialog', window.ExpertEditPageDialog);
  app.component('expert-create-page-dialog', window.ExpertCreatePageDialog);
  app.component('expert-center-page', ExpertCenterPage);
  app.component('expert-detail-page', ExpertDetailPage);
  app.component('expert-tasks-page', window.ExpertTasksPage);
  app.component('project-list-page', ProjectListPage);
  app.component('project-detail-page', window.ProjectDetailPage);

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
