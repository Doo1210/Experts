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
          ctx.emit('nav', '/experts/' + expert.id + '?tab=overview');
        }
      });

      function load() {
        experts.value = store.getExperts();
      }

      function goTasks(expert) { ctx.emit('nav', '/experts/' + expert.id + '/tasks'); }
      function goManage(expert) { ctx.emit('nav', '/experts/' + expert.id + '?tab=overview'); }

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
        ctx.emit('nav', '/experts/' + id + '?tab=overview');
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
        if (command === 'edit') expertEdit.openEdit(expert);
        else if (command === 'delete') removeExpert(expert);
      }

      load();
      Vue.onMounted(function () { load(); });

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
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>\
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>\
                </el-dropdown-menu>\
              </template>\
            </el-dropdown>\
            <div class="expert-card-body" @click="openPreview(expert)">\
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
      var activeTab = Vue.ref(props.initialTab || 'overview');
      var persona = Vue.ref({ coreDutyMd: '', workflowMd: '', behaviorMd: '' });
      var taskSubTab = Vue.ref('dialogue');
      var tasks = Vue.ref([]);
      var projects = Vue.ref([]);
      var memories = Vue.ref([]);
      var memoryInput = Vue.ref('');
      var skillIds = Vue.ref([]);
      var toolIds = Vue.ref([]);
      var imChannels = Vue.ref([]);
      var permissions = Vue.ref([]);
      var materials = Vue.ref([]);
      var expertArtifacts = Vue.ref([]);
      var fileNameInput = Vue.ref('');
      var expertEdit = createExpertEditForm(store, {
        getExpert: function () { return expert.value; },
        onSaved: function () { load(); }
      });

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
        skillIds.value = store.getSkillIds(props.expertId).slice();
        toolIds.value = store.getToolIds(props.expertId).slice();
        imChannels.value = store.getImChannels(props.expertId).length
          ? store.getImChannels(props.expertId)
          : catalog.IM_CHANNEL_TYPES.map(function (c) { return { type: c.id, label: c.label, enabled: false, config: '' }; });
        permissions.value = store.getPermissions(props.expertId).slice();
        materials.value = store.getWorkspaceFiles(props.expertId);
        expertArtifacts.value = store.getExpertArtifacts(props.expertId);
      }

      function savePersona() {
        store.savePersona(props.expertId, persona.value);
        ElementPlus.ElMessage.success('人设已保存');
      }
      function saveSkills() { store.setSkillIds(props.expertId, skillIds.value); ElementPlus.ElMessage.success('技能已更新'); }
      function saveTools() { store.setToolIds(props.expertId, toolIds.value); ElementPlus.ElMessage.success('工具已更新'); }
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

      Vue.watch(function () { return props.expertId; }, load);
      Vue.onMounted(load);

      var boundSkills = Vue.computed(function () {
        return catalog.SKILLS_CATALOG.filter(function (s) { return skillIds.value.indexOf(s.id) >= 0; });
      });
      var boundTools = Vue.computed(function () {
        return catalog.TOOLS_CATALOG.filter(function (t) { return toolIds.value.indexOf(t.id) >= 0; });
      });

      return {
        expert: expert, activeTab: activeTab, persona: persona, taskSubTab: taskSubTab,
        tasks: tasks, projects: projects, memories: memories, memoryInput: memoryInput,
        skillIds: skillIds, toolIds: toolIds, boundSkills: boundSkills, boundTools: boundTools,
        imChannels: imChannels, permissions: permissions, materials: materials, expertArtifacts: expertArtifacts,
        fileNameInput: fileNameInput,
        expertEdit: expertEdit, openEditDialog: expertEdit.openEditDialog,
        skills: catalog.SKILLS_CATALOG, tools: catalog.TOOLS_CATALOG,
        tagColors: catalog.TAG_COLORS,
        statusLabel: catalog.TASK_STATUS_LABEL, statusType: catalog.TASK_STATUS_TYPE,
        artifactTypeLabel: catalog.ARTIFACT_TYPE_LABEL,
        savePersona: savePersona, saveSkills: saveSkills, saveTools: saveTools,
        addMemory: addMemory, removeMemory: removeMemory, saveIm: saveIm, savePerm: savePerm, addMaterial: addMaterial,
        goAssignTask: goAssignTask,
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
              <el-tab-pane label="人设" name="overview">\
                <div class="detail-tab-pane">\
                  <div class="detail-section-head">\
                    <h3 class="detail-section-title">人设配置</h3>\
                    <p class="detail-section-desc">定义专家的核心职责、工作流程与行为准则</p>\
                  </div>\
                  <div class="persona-editor">\
                    <div class="persona-editor-card">\
                      <div class="persona-editor-head"><span class="persona-editor-dot"></span>核心职责</div>\
                      <el-input v-model="persona.coreDutyMd" type="textarea" :rows="5" placeholder="描述专家的核心职责…" />\
                    </div>\
                    <div class="persona-editor-card">\
                      <div class="persona-editor-head"><span class="persona-editor-dot"></span>工作流程</div>\
                      <el-input v-model="persona.workflowMd" type="textarea" :rows="5" placeholder="描述标准工作流程…" />\
                    </div>\
                    <div class="persona-editor-card">\
                      <div class="persona-editor-head"><span class="persona-editor-dot"></span>行为准则</div>\
                      <el-input v-model="persona.behaviorMd" type="textarea" :rows="5" placeholder="描述行为边界与准则…" />\
                    </div>\
                  </div>\
                  <div class="detail-tab-footer">\
                    <el-button type="primary" @click="savePersona">保存人设</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="任务" name="tasks">\
                <div class="detail-tab-pane">\
                  <el-radio-group v-model="taskSubTab" class="detail-filter-bar">\
                    <el-radio-button label="dialogue">任务</el-radio-button>\
                    <el-radio-button label="project">项目任务</el-radio-button>\
                  </el-radio-group>\
                  <div class="detail-table-wrap">\
                  <el-table :data="tasks.filter(t => taskSubTab === \'dialogue\' ? t.type === \'dialogue\' : t.type === \'project\')" stripe>\
                    <el-table-column prop="title" label="标题" />\
                    <el-table-column label="状态" width="100">\
                      <template #default="{ row }"><el-tag :type="statusType[row.status]" size="small">{{ statusLabel[row.status] }}</el-tag></template>\
                    </el-table-column>\
                    <el-table-column prop="updatedAt" label="更新时间" width="160" />\
                    <el-table-column label="操作" width="100">\
                      <template #default="{ row }">\
                        <el-button link type="primary" @click="$emit(\'nav\', \'/experts/\' + expert.id + \'/tasks/\' + row.id)">打开</el-button>\
                      </template>\
                    </el-table-column>\
                  </el-table>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="项目" name="projects">\
                <div class="detail-tab-pane">\
                  <el-empty v-if="projects.length === 0" description="暂无项目" />\
                  <div v-else class="project-grid" style="grid-template-columns:repeat(2,1fr)">\
                    <div v-for="p in projects" :key="p.id" class="project-card project-card-compact" @click="$emit(\'nav\', \'/projects/\' + p.id)">\
                      <div class="project-card-accent"></div>\
                      <div class="project-card-body">\
                        <div class="card-name">{{ p.name }}</div>\
                        <p class="card-desc">{{ p.description }}</p>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="技能" name="skills">\
                <div class="detail-tab-pane">\
                  <div class="detail-config-panel">\
                    <div class="detail-section-head">\
                      <h3 class="detail-section-title">技能绑定</h3>\
                      <p class="detail-section-desc">为专家配置可使用的专业技能能力</p>\
                    </div>\
                    <el-select v-model="skillIds" multiple placeholder="选择技能" style="width:100%;margin-bottom:12px">\
                      <el-option v-for="s in skills" :key="s.id" :label="s.name" :value="s.id" />\
                    </el-select>\
                    <el-button type="primary" @click="saveSkills">保存</el-button>\
                    <div v-if="boundSkills.length" class="detail-tag-list">\
                      <el-tag v-for="s in boundSkills" :key="s.id">{{ s.name }}</el-tag>\
                    </div>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="工具" name="tools">\
                <div class="detail-tab-pane">\
                  <div class="detail-config-panel">\
                    <div class="detail-section-head">\
                      <h3 class="detail-section-title">工具绑定</h3>\
                      <p class="detail-section-desc">配置专家可调用的工具与 MCP 服务</p>\
                    </div>\
                    <el-select v-model="toolIds" multiple placeholder="选择工具" style="width:100%;margin-bottom:12px">\
                      <el-option v-for="t in tools" :key="t.id" :label="t.name" :value="t.id" />\
                    </el-select>\
                    <el-button type="primary" @click="saveTools">保存</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="记忆" name="memory">\
                <div class="detail-tab-pane">\
                  <div class="detail-action-bar">\
                    <el-input v-model="memoryInput" placeholder="新增记忆条目" class="detail-action-input" />\
                    <el-button type="primary" @click="addMemory">添加</el-button>\
                  </div>\
                  <div class="detail-table-wrap">\
                  <el-table :data="memories" stripe>\
                    <el-table-column prop="content" label="内容" />\
                    <el-table-column prop="createdAt" label="时间" width="160" />\
                    <el-table-column label="操作" width="80">\
                      <template #default="{ row }"><el-button link type="danger" @click="removeMemory(row.id)">删除</el-button></template>\
                    </el-table-column>\
                  </el-table>\
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
                      <strong>{{ ch.label }}</strong>\
                      <el-switch v-model="ch.enabled" />\
                    </div>\
                    <el-input v-model="ch.config" placeholder="Webhook / Bot 配置" />\
                  </div>\
                  <div class="detail-tab-footer">\
                    <el-button type="primary" @click="saveIm">保存 IM 配置</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="权限管控" name="permissions">\
                <div class="detail-tab-pane">\
                  <div class="detail-table-wrap">\
                  <el-table :data="permissions" stripe>\
                    <el-table-column prop="label" label="授权对象" />\
                    <el-table-column prop="permission" label="权限" width="120" />\
                  </el-table>\
                  </div>\
                  <p class="detail-form-hint">原型阶段展示默认权限规则，接入后端后可动态配置。</p>\
                  <div class="detail-tab-footer">\
                    <el-button type="primary" @click="savePerm">保存</el-button>\
                  </div>\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="资料" name="materials">\
                <div class="detail-tab-pane">\
                  <div class="detail-action-bar">\
                    <el-input v-model="fileNameInput" placeholder="资料名称" class="detail-action-input" />\
                    <el-button type="primary" @click="addMaterial">添加资料</el-button>\
                  </div>\
                  <div class="detail-table-wrap">\
                  <el-table :data="materials" stripe>\
                    <el-table-column prop="name" label="名称" />\
                    <el-table-column prop="createdAt" label="添加时间" width="160" />\
                  </el-table>\
                  </div>\
                  <el-empty v-if="materials.length === 0" description="暂无资料" :image-size="56" />\
                </div>\
              </el-tab-pane>\
              <el-tab-pane label="产物" name="artifacts">\
                <div class="detail-tab-pane">\
                  <div class="detail-table-wrap">\
                  <el-table :data="expertArtifacts" stripe>\
                    <el-table-column prop="title" label="产物标题" min-width="140" />\
                    <el-table-column label="类型" width="80">\
                      <template #default="{ row }">{{ artifactTypeLabel[row.type] || row.type }}</template>\
                    </el-table-column>\
                    <el-table-column prop="taskTitle" label="来源任务" width="140" />\
                    <el-table-column prop="createdAt" label="生成时间" width="160" />\
                  </el-table>\
                  </div>\
                  <el-empty v-if="expertArtifacts.length === 0" description="暂无产物，完成任务对话后将自动生成" :image-size="56" />\
                </div>\
              </el-tab-pane>\
            </el-tabs>\
        </div>\
        </div>\
        </div>\
        <expert-edit-page-dialog :edit="expertEdit" header-title="编辑基本信息" :tag-colors="tagColors" />\
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
