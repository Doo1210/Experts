(function () {
  var store = window.AppStore;
  var catalog = window;

  function parseRoute() {
    var hash = location.hash.slice(1) || '/experts';
    var parts = hash.split('?')[0].split('/').filter(Boolean);
    var query = {};
    if (location.hash.indexOf('?') >= 0) {
      location.hash.split('?')[1].split('&').forEach(function (p) {
        var kv = p.split('=');
        query[kv[0]] = decodeURIComponent(kv[1] || '');
      });
    }
    var r = { name: 'experts', params: {}, query: query };
    if (parts[0] === 'experts') {
      if (parts.length === 1) r.name = 'experts';
      else if (parts[1] === 'new') {
        r.name = 'experts';
        r.query.create = '1';
      } else if (parts[2] === 'tasks') {
        r.name = 'expert-tasks';
        r.params.id = parts[1];
        r.params.taskId = parts[3] || null;
      } else {
        r.name = 'expert-detail';
        r.params.id = parts[1];
      }
    } else if (parts[0] === 'projects') {
      if (parts.length === 1) r.name = 'projects';
      else if (parts[1] === 'new') {
        r.name = 'projects';
        r.query.create = '1';
      } else {
        r.name = 'project-detail';
        r.params.id = parts[1];
      }
    }
    return r;
  }

  function nav(path) {
    location.hash = path;
  }

  var BackLink = {
    props: {
      label: { type: String, default: '返回' },
      inline: { type: Boolean, default: false }
    },
    emits: ['click'],
    template: '\
      <a\
        class="back-link"\
        :class="{ \'back-link-inline\': inline }"\
        :title="label"\
        :aria-label="label"\
        href="#"\
        @click.prevent="$emit(\'click\')">\
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>\
      </a>'
  };

  var AppSidebar = {
    props: ['active'],
    template: '\
      <aside class="platform-sidebar">\
        <nav class="sidebar-nav">\
          <a class="nav-item" :class="{ active: active === \'experts\' }" @click.prevent="$emit(\'nav\', \'/experts\')">👤 专家</a>\
          <a class="nav-item" :class="{ active: active === \'projects\' }" @click.prevent="$emit(\'nav\', \'/projects\')">📁 项目</a>\
        </nav>\
      </aside>'
  };

  var CreateActionBtn = {
    props: {
      label: { type: String, required: true },
      theme: { type: String, default: 'expert' },
      soft: { type: Boolean, default: false }
    },
    emits: ['click'],
    template: '\
      <button\
        type="button"\
        class="page-create-btn"\
        :class="[\'page-create-btn-\' + theme, { \'page-create-btn-soft\': soft }]"\
        @click="$emit(\'click\')">\
        <span class="page-create-btn-icon-wrap">\
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">\
            <path d="M12 5v14M5 12h14"/>\
          </svg>\
        </span>\
        <span>{{ label }}</span>\
      </button>'
  };

  var EXPERT_CATEGORIES = ['工艺制造', '智能算法', '设备运维', '供应链', '质量管理', '数字化', '能源环保', '安全合规', '自动化'];

  var ExpertCenterPage = {
    props: ['openCreate'],
    emits: ['nav', 'refresh'],
    setup: function (props, ctx) {
      var experts = Vue.ref([]);
      var showEditDialog = Vue.ref(false);
      var showCreateDialog = Vue.ref(false);
      var editForm = Vue.ref({ name: '', description: '', category: '' });
      var editingExpert = Vue.ref(null);
      var saving = Vue.ref(false);
      var defaultPersona = {
        coreDutyMd: '## 核心职责\n\n',
        workflowMd: '## 工作流程\n\n1. \n2. \n3. ',
        behaviorMd: '## 行为准则\n\n- '
      };

      function emptyCreateForm() {
        return {
          name: '', description: '', avatar: '', category: '工艺制造',
          coreDutyMd: defaultPersona.coreDutyMd,
          workflowMd: defaultPersona.workflowMd,
          behaviorMd: defaultPersona.behaviorMd,
          skillIds: [], toolIds: []
        };
      }

      var createForm = Vue.ref(emptyCreateForm());

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

      function resetCreateForm() {
        createForm.value = emptyCreateForm();
      }

      function openCreateDialog() {
        resetCreateForm();
        showCreateDialog.value = true;
      }

      function closeCreateDialog() {
        showCreateDialog.value = false;
        resetCreateForm();
      }

      function submitCreate() {
        if (!createForm.value.name.trim() || !createForm.value.description.trim()) {
          ElementPlus.ElMessage.warning('请填写专家名称和介绍');
          return;
        }
        saving.value = true;
        var expert = store.createExpert({
          name: createForm.value.name.trim(),
          description: createForm.value.description.trim(),
          avatar: createForm.value.avatar.trim() || undefined,
          category: createForm.value.category,
          expertise: [],
          skillIds: createForm.value.skillIds,
          toolIds: createForm.value.toolIds,
          persona: {
            coreDutyMd: createForm.value.coreDutyMd,
            workflowMd: createForm.value.workflowMd,
            behaviorMd: createForm.value.behaviorMd
          }
        });
        saving.value = false;
        closeCreateDialog();
        load();
        ElementPlus.ElMessage.success('专家创建成功');
        ctx.emit('nav', '/experts/' + expert.id + '?tab=overview');
      }

      var createAvatarPreview = Vue.computed(function () {
        if (createForm.value.avatar.trim()) return createForm.value.avatar.trim();
        if (createForm.value.name.trim()) {
          return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(createForm.value.name.trim());
        }
        return 'https://api.dicebear.com/7.x/avataaars/svg?seed=new-expert';
      });

      function openEdit(expert) {
        editingExpert.value = expert;
        editForm.value = {
          name: expert.name,
          description: expert.description,
          category: expert.category || ''
        };
        showEditDialog.value = true;
      }

      function submitEdit() {
        if (!editForm.value.name.trim() || !editForm.value.description.trim()) {
          ElementPlus.ElMessage.warning('请填写专家名称和介绍');
          return;
        }
        store.saveExpert(Object.assign({}, editingExpert.value, {
          name: editForm.value.name.trim(),
          description: editForm.value.description.trim(),
          category: editForm.value.category.trim() || editingExpert.value.category
        }));
        showEditDialog.value = false;
        load();
        ElementPlus.ElMessage.success('专家信息已更新');
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
        if (command === 'edit') openEdit(expert);
        else if (command === 'delete') removeExpert(expert);
      }

      load();
      Vue.onMounted(function () { load(); });

      Vue.watch(function () { return props.openCreate; }, function (v) {
        if (v === '1' || v === true) {
          openCreateDialog();
          ctx.emit('nav', '/experts');
        }
      }, { immediate: true });

      return {
        experts: experts,
        tagColors: catalog.TAG_COLORS,
        categories: EXPERT_CATEGORIES,
        skills: catalog.SKILLS_CATALOG,
        tools: catalog.TOOLS_CATALOG,
        showEditDialog: showEditDialog,
        showCreateDialog: showCreateDialog,
        showPreviewDialog: showPreviewDialog,
        previewExpert: previewExpert,
        previewStats: previewStats,
        editForm: editForm,
        createForm: createForm,
        createAvatarPreview: createAvatarPreview,
        saving: saving,
        goTasks: goTasks,
        goManage: goManage,
        openPreview: openPreview,
        closePreview: closePreview,
        goManageFromPreview: goManageFromPreview,
        openCreateDialog: openCreateDialog,
        closeCreateDialog: closeCreateDialog,
        resetCreateForm: resetCreateForm,
        submitCreate: submitCreate,
        submitEdit: submitEdit,
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
                  <span v-if="previewExpert.updatedAt" class="expert-preview-dot">·</span>\
                  <span v-if="previewExpert.updatedAt">更新于 {{ previewExpert.updatedAt }}</span>\
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
            <button type="button" class="expert-preview-detail-btn" @click="goManageFromPreview">\
              查看详情\
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>\
            </button>\
          </div>\
        </el-dialog>\
        <el-dialog v-model="showCreateDialog" width="680px" class="form-dialog form-dialog-expert" :close-on-click-modal="false" @closed="resetCreateForm">\
          <template #header>\
            <div class="dialog-header-custom">\
              <div class="dialog-header-icon dialog-header-icon-create">👤</div>\
              <div>\
                <div class="dialog-header-title">新建专家</div>\
                <div class="dialog-header-sub">创建智能体专家，配置人设与能力绑定</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="form-dialog-section">\
              <div class="form-dialog-section-head">\
                <span class="form-dialog-section-num">1</span>\
                <span class="form-dialog-section-title">基础信息</span>\
              </div>\
              <div class="form-dialog-section-body form-dialog-basic-row">\
                <div class="avatar-preview-wrap">\
                  <img :src="createAvatarPreview" class="avatar-preview-img" alt="头像预览">\
                  <span class="avatar-preview-tip">头像预览</span>\
                </div>\
                <el-form label-width="80px" class="form-dialog-form">\
                  <el-form-item label="专家名称" required>\
                    <el-input v-model="createForm.name" placeholder="如：首席工艺专家" />\
                  </el-form-item>\
                  <el-form-item label="领域分类">\
                    <el-select v-model="createForm.category" placeholder="选择领域" style="width:100%">\
                      <el-option v-for="c in categories" :key="c" :label="c" :value="c" />\
                    </el-select>\
                  </el-form-item>\
                  <el-form-item label="头像 URL">\
                    <el-input v-model="createForm.avatar" placeholder="留空则根据名称自动生成" />\
                  </el-form-item>\
                  <el-form-item label="专家介绍" required>\
                    <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="简要描述专家能力与经验" />\
                  </el-form-item>\
                </el-form>\
              </div>\
            </div>\
            <div class="form-dialog-section">\
              <div class="form-dialog-section-head">\
                <span class="form-dialog-section-num">2</span>\
                <span class="form-dialog-section-title">人设文档</span>\
                <span class="form-dialog-section-tag">Markdown</span>\
              </div>\
              <div class="form-dialog-section-body">\
                <el-form label-width="80px" class="form-dialog-form">\
                  <el-form-item label="核心职责"><el-input v-model="createForm.coreDutyMd" type="textarea" :rows="3" /></el-form-item>\
                  <el-form-item label="工作流程"><el-input v-model="createForm.workflowMd" type="textarea" :rows="3" /></el-form-item>\
                  <el-form-item label="行为准则"><el-input v-model="createForm.behaviorMd" type="textarea" :rows="3" /></el-form-item>\
                </el-form>\
              </div>\
            </div>\
            <div class="form-dialog-section">\
              <div class="form-dialog-section-head">\
                <span class="form-dialog-section-num">3</span>\
                <span class="form-dialog-section-title">能力绑定</span>\
              </div>\
              <div class="form-dialog-section-body">\
                <el-form label-width="80px" class="form-dialog-form">\
                  <el-form-item label="技能">\
                    <el-select v-model="createForm.skillIds" multiple placeholder="选择技能" style="width:100%">\
                      <el-option v-for="s in skills" :key="s.id" :label="s.name" :value="s.id">\
                        <span>{{ s.name }}</span><span class="select-option-desc">{{ s.description }}</span>\
                      </el-option>\
                    </el-select>\
                  </el-form-item>\
                  <el-form-item label="工具/MCP">\
                    <el-select v-model="createForm.toolIds" multiple placeholder="选择工具" style="width:100%">\
                      <el-option v-for="t in tools" :key="t.id" :label="t.name" :value="t.id" />\
                    </el-select>\
                  </el-form-item>\
                </el-form>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <el-button @click="closeCreateDialog">取消</el-button>\
              <el-button type="primary" :loading="saving" @click="submitCreate">创建专家</el-button>\
            </div>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="showEditDialog" width="520px" class="form-dialog form-dialog-expert form-dialog-sm" :close-on-click-modal="false">\
          <template #header>\
            <div class="dialog-header-custom">\
              <div class="dialog-header-icon dialog-header-icon-edit">✏️</div>\
              <div>\
                <div class="dialog-header-title">编辑专家</div>\
                <div class="dialog-header-sub">修改专家基础信息</div>\
              </div>\
            </div>\
          </template>\
          <el-form label-width="88px" class="form-dialog-form">\
            <el-form-item label="专家名称" required>\
              <el-input v-model="editForm.name" placeholder="请输入专家名称" />\
            </el-form-item>\
            <el-form-item label="领域分类">\
              <el-select v-model="editForm.category" placeholder="选择领域" style="width:100%">\
                <el-option v-for="c in categories" :key="c" :label="c" :value="c" />\
              </el-select>\
            </el-form-item>\
            <el-form-item label="专家介绍" required>\
              <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="简要介绍专家能力" />\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <el-button @click="showEditDialog = false">取消</el-button>\
              <el-button type="primary" @click="submitEdit">保存</el-button>\
            </div>\
          </template>\
        </el-dialog>\
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

      var expertStats = Vue.computed(function () {
        return {
          tasks: tasks.value.length,
          projects: projects.value.length,
          skills: boundSkills.value.length,
          tools: boundTools.value.length
        };
      });

      return {
        expert: expert, activeTab: activeTab, persona: persona, taskSubTab: taskSubTab,
        tasks: tasks, projects: projects, memories: memories, memoryInput: memoryInput,
        skillIds: skillIds, toolIds: toolIds, boundSkills: boundSkills, boundTools: boundTools,
        expertStats: expertStats,
        imChannels: imChannels, permissions: permissions, materials: materials, expertArtifacts: expertArtifacts,
        fileNameInput: fileNameInput,
        skills: catalog.SKILLS_CATALOG, tools: catalog.TOOLS_CATALOG,
        tagColors: catalog.TAG_COLORS,
        statusLabel: catalog.TASK_STATUS_LABEL, statusType: catalog.TASK_STATUS_TYPE,
        artifactTypeLabel: { document: '文档', report: '报告', data: '数据', file: '文件' },
        savePersona: savePersona, saveSkills: saveSkills, saveTools: saveTools,
        addMemory: addMemory, removeMemory: removeMemory, saveIm: saveIm, savePerm: savePerm, addMaterial: addMaterial, load: load
      };
    },
    template: '\
      <div class="main-scroll expert-detail-page" v-if="expert">\
        <div class="expert-hero">\
          <div class="expert-hero-bg"></div>\
          <div class="expert-hero-back">\
            <back-link label="返回专家" inline @click="$emit(\'nav\', \'/experts\')" />\
          </div>\
          <div class="expert-hero-profile">\
            <div class="expert-hero-avatar-wrap">\
              <img class="expert-hero-avatar" :src="expert.avatar" :alt="expert.name">\
              <span class="expert-hero-status"></span>\
            </div>\
            <div class="expert-hero-info">\
              <div class="expert-hero-head">\
                <div class="expert-hero-name-row">\
                  <h1 class="expert-hero-name">{{ expert.name }}</h1>\
                  <div v-if="expert.expertise && expert.expertise.length" class="expert-hero-tags">\
                    <span v-for="(tag, idx) in expert.expertise" :key="tag" class="expertise-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>\
                  </div>\
                </div>\
                <button type="button" class="expert-assign-btn" @click="$emit(\'nav\', \'/experts/\' + expert.id + \'/tasks\')">\
                  <span class="expert-assign-btn-icon">\
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>\
                  </span>\
                  下发任务\
                </button>\
              </div>\
              <p v-if="expert.description" class="expert-hero-desc">{{ expert.description }}</p>\
            </div>\
          </div>\
          <div class="expert-hero-stats-bar">\
            <div class="expert-hero-stats-grid">\
                <button type="button" class="expert-stat-card" :class="{ active: activeTab === \'tasks\' }" @click="activeTab = \'tasks\'">\
                  <span class="expert-stat-card-value">{{ expertStats.tasks }}</span>\
                  <span class="expert-stat-card-label">任务</span>\
                </button>\
                <button type="button" class="expert-stat-card" :class="{ active: activeTab === \'projects\' }" @click="activeTab = \'projects\'">\
                  <span class="expert-stat-card-value">{{ expertStats.projects }}</span>\
                  <span class="expert-stat-card-label">项目</span>\
                </button>\
                <button type="button" class="expert-stat-card" :class="{ active: activeTab === \'skills\' }" @click="activeTab = \'skills\'">\
                  <span class="expert-stat-card-value">{{ expertStats.skills }}</span>\
                  <span class="expert-stat-card-label">技能</span>\
                </button>\
                <button type="button" class="expert-stat-card" :class="{ active: activeTab === \'tools\' }" @click="activeTab = \'tools\'">\
                  <span class="expert-stat-card-value">{{ expertStats.tools }}</span>\
                  <span class="expert-stat-card-label">工具</span>\
                </button>\
              </div>\
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
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };

  var ExpertTasksPage = {
    props: ['expertId', 'taskId'],
    emits: ['nav'],
    setup: function (props, ctx) {
      var expert = Vue.ref(null);
      var tasks = Vue.ref([]);
      var currentTaskId = Vue.ref(props.taskId);
      var messages = Vue.ref([]);
      var inputText = Vue.ref('');
      var sending = Vue.ref(false);
      var chatBox = Vue.ref(null);
      var artifacts = Vue.ref([]);
      var archivedTasks = Vue.ref([]);
      var showArchived = Vue.ref(false);
      var rightPanel = Vue.ref('tasks');

      function toggleRightPanel(panel) {
        rightPanel.value = rightPanel.value === panel ? null : panel;
      }

      function refreshTasks() {
        var all = store.getTasksByExpert(props.expertId, 'dialogue', true);
        tasks.value = all.filter(function (t) { return !t.archived; });
        archivedTasks.value = all.filter(function (t) { return t.archived; });
      }

      function taskMeta(t) {
        if (t.archived) return '已归档 · ' + (t.archivedAt || t.updatedAt);
        return (catalog.TASK_STATUS_LABEL[t.status] || t.status) + ' · ' + t.updatedAt;
      }

      function loadExpert() {
        expert.value = store.getExpert(props.expertId);
        refreshTasks();
        if (currentTaskId.value) {
          loadMessages();
          loadArtifacts();
        } else if (tasks.value.length) {
          selectTask(tasks.value[0].id);
        }
      }

      function loadArtifacts() {
        artifacts.value = store.getTaskArtifacts(currentTaskId.value);
      }

      function loadMessages() {
        if (!currentTaskId.value) { messages.value = []; return; }
        messages.value = store.getMessages(currentTaskId.value);
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function selectTask(id) {
        currentTaskId.value = id;
        ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + id);
        loadMessages();
        loadArtifacts();
      }

      function newTask() {
        var t = store.createTask({ expertId: props.expertId, title: '新任务', type: 'dialogue' });
        refreshTasks();
        rightPanel.value = 'tasks';
        selectTask(t.id);
      }

      function send() {
        var text = inputText.value.trim();
        if (!text || !currentTaskId.value) return;
        sending.value = true;
        store.addMessage(currentTaskId.value, { role: 'user', content: text });
        inputText.value = '';
        loadMessages();
        refreshTasks();
        setTimeout(function () {
          var reply = store.mockExpertReply(expert.value, text);
          store.addMessage(currentTaskId.value, { role: 'expert', content: reply });
          store.mockTaskArtifact(expert.value, currentTaskId.value, text);
          loadMessages();
          loadArtifacts();
          sending.value = false;
        }, 800);
      }

      function editTask(task, ev) {
        ev.stopPropagation();
        ElementPlus.ElMessageBox.prompt('请输入任务名称', '编辑任务', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: task.title,
          inputPattern: /\S+/,
          inputErrorMessage: '名称不能为空'
        }).then(function (result) {
          store.updateTask(task.id, { title: result.value.trim(), titleSet: true });
          refreshTasks();
          ElementPlus.ElMessage.success('任务名称已更新');
        }).catch(function () {});
      }

      function deleteTaskItem(task, ev) {
        ev.stopPropagation();
        ElementPlus.ElMessageBox.confirm(
          '确定删除该任务？相关对话与产物将一并删除。',
          '删除任务',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          var wasCurrent = currentTaskId.value === task.id;
          store.deleteTask(task.id);
          refreshTasks();
          if (wasCurrent) {
            if (tasks.value.length) selectTask(tasks.value[0].id);
            else {
              currentTaskId.value = null;
              ctx.emit('nav', '/experts/' + props.expertId + '/tasks');
              messages.value = [];
              artifacts.value = [];
            }
          }
          ElementPlus.ElMessage.success('任务已删除');
        }).catch(function () {});
      }

      function archiveTaskItem(task, ev) {
        ev.stopPropagation();
        store.archiveTask(task.id, true);
        refreshTasks();
        if (currentTaskId.value === task.id) {
          if (tasks.value.length) selectTask(tasks.value[0].id);
          else {
            currentTaskId.value = null;
            ctx.emit('nav', '/experts/' + props.expertId + '/tasks');
            messages.value = [];
            artifacts.value = [];
          }
        }
        ElementPlus.ElMessage.success('任务已归档');
      }

      function unarchiveTaskItem(task, ev) {
        ev.stopPropagation();
        store.archiveTask(task.id, false);
        refreshTasks();
        ElementPlus.ElMessage.success('已取消归档');
      }

      var artifactTypeLabel = { document: '文档', report: '报告', data: '数据', file: '文件' };

      Vue.watch(function () { return props.taskId; }, function (v) {
        currentTaskId.value = v;
        loadMessages();
        loadArtifacts();
      });
      Vue.onMounted(loadExpert);

      return {
        expert: expert, tasks: tasks, archivedTasks: archivedTasks, showArchived: showArchived,
        currentTaskId: currentTaskId, messages: messages,
        inputText: inputText, sending: sending, chatBox: chatBox, artifacts: artifacts,
        statusLabel: catalog.TASK_STATUS_LABEL, artifactTypeLabel: artifactTypeLabel, taskMeta: taskMeta,
        selectTask: selectTask, newTask: newTask, send: send,
        editTask: editTask, deleteTaskItem: deleteTaskItem, archiveTaskItem: archiveTaskItem, unarchiveTaskItem: unarchiveTaskItem,
        rightPanel: rightPanel, toggleRightPanel: toggleRightPanel
      };
    },
    template: '\
      <div class="task-layout" v-if="expert">\
        <div class="task-top-bar">\
          <div class="task-top-bar-left">\
            <back-link label="返回专家" inline @click="$emit(\'nav\', \'/experts\')" />\
            <img class="task-top-bar-avatar" :src="expert.avatar" :alt="expert.name">\
            <div class="task-top-bar-info">\
              <div class="task-top-bar-name">{{ expert.name }}</div>\
              <div v-if="expert.description" class="task-top-bar-desc">{{ expert.description }}</div>\
            </div>\
          </div>\
          <div class="project-header-actions">\
            <button\
              type="button"\
              class="project-header-action-btn"\
              title="新建任务"\
              @click="newTask">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">\
                <path d="M12 5v14M5 12h14"/>\
              </svg>\
              <span>新建任务</span>\
            </button>\
            <button\
              type="button"\
              class="project-header-action-btn"\
              :class="{ active: rightPanel === \'tasks\' }"\
              title="任务列表"\
              @click="toggleRightPanel(\'tasks\')">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>\
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>\
              </svg>\
              <span>任务列表</span>\
            </button>\
            <button\
              type="button"\
              class="project-header-action-btn"\
              :class="{ active: rightPanel === \'artifacts\' }"\
              title="任务产物"\
              @click="toggleRightPanel(\'artifacts\')">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
                <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>\
              </svg>\
              <span>任务产物</span>\
            </button>\
          </div>\
        </div>\
        <div class="task-body">\
        <div class="chat-main">\
          <div class="chat-messages" ref="chatBox">\
            <div v-if="!currentTaskId" style="text-align:center;color:#999;padding:40px">请选择任务</div>\
            <template v-else>\
              <div v-for="m in messages" :key="m.id" class="msg-row" :class="m.role">\
                <div class="msg-bubble">{{ m.content }}</div>\
              </div>\
            </template>\
          </div>\
          <div class="chat-input">\
            <el-input v-model="inputText" type="textarea" :rows="2" placeholder="向专家下发任务指令…" @keydown.ctrl.enter="send" />\
            <div style="margin-top:8px;text-align:right">\
              <el-button type="primary" :loading="sending" :disabled="!currentTaskId" @click="send">发送 (Ctrl+Enter)</el-button>\
            </div>\
          </div>\
        </div>\
        <aside class="task-right-panel" v-show="rightPanel">\
          <div v-if="rightPanel === \'tasks\'" class="task-right-panel-inner">\
            <h4 class="task-right-panel-title">任务列表</h4>\
            <div class="task-list">\
              <div v-for="t in tasks" :key="t.id" class="task-item" :class="{ active: currentTaskId === t.id }" @click="selectTask(t.id)">\
                <div class="task-item-row">\
                  <div class="task-item-body">\
                    <div class="task-item-title">{{ t.title }}</div>\
                    <div class="task-item-meta">{{ taskMeta(t) }}</div>\
                  </div>\
                  <div class="task-item-actions">\
                    <button type="button" class="task-action-btn" title="编辑名称" @click="editTask(t, $event)">\
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>\
                      </svg>\
                    </button>\
                    <button type="button" class="task-action-btn" title="归档任务" @click="archiveTaskItem(t, $event)">\
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>\
                      </svg>\
                    </button>\
                    <button type="button" class="task-action-btn task-action-btn-danger" title="删除任务" @click="deleteTaskItem(t, $event)">\
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>\
                      </svg>\
                    </button>\
                  </div>\
                </div>\
              </div>\
              <div v-if="tasks.length === 0 && archivedTasks.length === 0" style="padding:20px;text-align:center;color:#999;font-size:13px">暂无任务</div>\
              <div v-if="archivedTasks.length" class="task-archived-section">\
                <button type="button" class="task-archived-toggle" @click="showArchived = !showArchived">\
                  已归档 ({{ archivedTasks.length }})\
                  <span>{{ showArchived ? \'▾\' : \'▸\' }}</span>\
                </button>\
                <template v-if="showArchived">\
                  <div v-for="t in archivedTasks" :key="t.id" class="task-item task-item-archived" :class="{ active: currentTaskId === t.id }" @click="selectTask(t.id)">\
                    <div class="task-item-row">\
                      <div class="task-item-body">\
                        <div class="task-item-title">{{ t.title }}</div>\
                        <div class="task-item-meta">{{ taskMeta(t) }}</div>\
                      </div>\
                      <div class="task-item-actions">\
                        <button type="button" class="task-action-btn" title="编辑名称" @click="editTask(t, $event)">\
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>\
                          </svg>\
                        </button>\
                        <button type="button" class="task-action-btn" title="取消归档" @click="unarchiveTaskItem(t, $event)">\
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                            <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><polyline points="12 12 12 17"/><polyline points="9 15 12 12 15 15"/>\
                          </svg>\
                        </button>\
                        <button type="button" class="task-action-btn task-action-btn-danger" title="删除任务" @click="deleteTaskItem(t, $event)">\
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>\
                          </svg>\
                        </button>\
                      </div>\
                    </div>\
                  </div>\
                </template>\
              </div>\
            </div>\
          </div>\
          <div v-else-if="rightPanel === \'artifacts\'" class="task-right-panel-inner task-right-panel-artifacts">\
            <h4 class="task-right-panel-title">任务产物</h4>\
            <p v-if="currentTaskId" class="task-right-panel-desc">当前任务的产出物</p>\
            <div v-if="!currentTaskId" class="task-right-panel-empty">请选择任务</div>\
            <template v-else>\
              <div class="task-right-panel-scroll">\
                <div v-for="a in artifacts" :key="a.id" class="artifact-item">\
                  <div class="artifact-item-head">\
                    <span class="artifact-title">{{ a.title }}</span>\
                    <el-tag size="small" type="info">{{ artifactTypeLabel[a.type] || a.type }}</el-tag>\
                  </div>\
                  <p class="artifact-content">{{ a.content }}</p>\
                  <div class="artifact-time">{{ a.createdAt }}</div>\
                </div>\
                <el-empty v-if="artifacts.length === 0" description="暂无任务产物" :image-size="56" />\
              </div>\
            </template>\
          </div>\
        </aside>\
        </div>\
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
      var form = Vue.ref({ name: '', description: '', expertIds: [] });
      var editForm = Vue.ref({ name: '', description: '' });
      var editingProject = Vue.ref(null);
      var allExperts = Vue.ref(store.getExperts());

      function load() {
        projects.value = store.getProjects();
      }

      function resetForm() {
        form.value = { name: '', description: '', expertIds: [] };
      }

      function openCreateDialog() {
        resetForm();
        showCreateDialog.value = true;
      }

      function closeCreateDialog() {
        showCreateDialog.value = false;
        resetForm();
      }

      function goProject(project) {
        ctx.emit('nav', '/projects/' + project.id);
      }

      function openEdit(project) {
        editingProject.value = project;
        editForm.value = {
          name: project.name,
          description: project.description || ''
        };
        showEditDialog.value = true;
      }

      function submitEdit() {
        if (!editForm.value.name.trim()) {
          ElementPlus.ElMessage.warning('请填写项目名称');
          return;
        }
        store.saveProject(Object.assign({}, editingProject.value, {
          name: editForm.value.name.trim(),
          description: editForm.value.description.trim()
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
        if (!form.value.name.trim()) {
          ElementPlus.ElMessage.warning('请填写项目名称');
          return;
        }
        var p = store.createProject(form.value);
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

      var selectedExperts = Vue.computed(function () {
        return form.value.expertIds.map(function (id) {
          return allExperts.value.find(function (e) { return e.id === id; });
        }).filter(Boolean);
      });

      return {
        projects: projects, showCreateDialog: showCreateDialog, showEditDialog: showEditDialog,
        form: form, editForm: editForm, allExperts: allExperts,
        selectedExperts: selectedExperts,
        openCreateDialog: openCreateDialog, closeCreateDialog: closeCreateDialog, submitCreate: submitCreate,
        submitEdit: submitEdit, handleProjectMenu: handleProjectMenu, goProject: goProject,
        resetForm: resetForm, getMembers: getMembers, getMemberCount: getMemberCount, getProjectStats: getProjectStats
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
                <div class="project-card-icon">📁</div>\
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
        <el-dialog v-model="showCreateDialog" width="560px" class="form-dialog form-dialog-project" :close-on-click-modal="false" @closed="resetForm">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-project">\
              <div class="dialog-header-icon dialog-header-icon-project">📁</div>\
              <div>\
                <div class="dialog-header-title">新建项目</div>\
                <div class="dialog-header-sub">创建协作项目，邀请专家共同推进</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="form-dialog-section">\
              <div class="form-dialog-section-head">\
                <span class="form-dialog-section-num form-dialog-section-num-green">1</span>\
                <span class="form-dialog-section-title">项目信息</span>\
              </div>\
              <div class="form-dialog-section-body">\
                <el-form label-width="88px" class="form-dialog-form">\
                  <el-form-item label="项目名称" required>\
                    <el-input v-model="form.name" placeholder="如：12寸产线良率提升项目" />\
                  </el-form-item>\
                  <el-form-item label="项目描述">\
                    <el-input v-model="form.description" type="textarea" :rows="3" placeholder="简要描述项目目标与背景" />\
                  </el-form-item>\
                </el-form>\
              </div>\
            </div>\
            <div class="form-dialog-section">\
              <div class="form-dialog-section-head">\
                <span class="form-dialog-section-num form-dialog-section-num-green">2</span>\
                <span class="form-dialog-section-title">项目成员</span>\
                <span class="form-dialog-section-tag">{{ selectedExperts.length }} 人已选</span>\
              </div>\
              <div class="form-dialog-section-body">\
                <el-form label-width="88px" class="form-dialog-form">\
                  <el-form-item label="选择专家">\
                    <el-select v-model="form.expertIds" multiple placeholder="选择参与项目的专家" style="width:100%">\
                      <el-option v-for="e in allExperts" :key="e.id" :label="e.name" :value="e.id">\
                        <div class="member-option">\
                          <img :src="e.avatar" :alt="e.name" class="member-option-avatar">\
                          <span>{{ e.name }}</span>\
                        </div>\
                      </el-option>\
                    </el-select>\
                  </el-form-item>\
                </el-form>\
                <div v-if="selectedExperts.length" class="selected-members-preview">\
                  <div v-for="e in selectedExperts" :key="e.id" class="selected-member-chip">\
                    <img :src="e.avatar" :alt="e.name">\
                    <span>{{ e.name }}</span>\
                  </div>\
                </div>\
                <p v-else class="form-dialog-hint">可选择一位或多位专家加入项目</p>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <el-button @click="closeCreateDialog">取消</el-button>\
              <el-button type="success" @click="submitCreate">创建项目</el-button>\
            </div>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="showEditDialog" width="520px" class="form-dialog form-dialog-project form-dialog-sm" :close-on-click-modal="false">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-project">\
              <div class="dialog-header-icon dialog-header-icon-project">✏️</div>\
              <div>\
                <div class="dialog-header-title">编辑项目</div>\
                <div class="dialog-header-sub">修改项目基础信息</div>\
              </div>\
            </div>\
          </template>\
          <el-form label-width="88px" class="form-dialog-form">\
            <el-form-item label="项目名称" required>\
              <el-input v-model="editForm.name" placeholder="请输入项目名称" />\
            </el-form-item>\
            <el-form-item label="项目描述">\
              <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="简要描述项目目标" />\
            </el-form-item>\
          </el-form>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <el-button @click="showEditDialog = false">取消</el-button>\
              <el-button type="success" @click="submitEdit">保存</el-button>\
            </div>\
          </template>\
        </el-dialog>\
      </div>'
  };

  var ProjectDetailPage = {
    props: ['projectId', 'initialTab'],
    emits: ['nav'],
    setup: function (props) {
      var project = Vue.ref(null);
      var sidebarPanel = Vue.ref(null);
      var workspaceTab = Vue.ref('materials');
      if (props.initialTab === 'members') sidebarPanel.value = 'members';
      else if (props.initialTab === 'materials' || props.initialTab === 'outputs') {
        sidebarPanel.value = 'workspace';
        workspaceTab.value = props.initialTab === 'outputs' ? 'outputs' : 'materials';
      }
      var chatTarget = Vue.ref(null);
      var members = Vue.ref([]);
      var projectTasks = Vue.ref([]);
      var projectFiles = Vue.ref([]);
      var messages = Vue.ref([]);
      var outputs = Vue.ref([]);
      var inputText = Vue.ref('');
      var allExperts = Vue.ref(store.getExperts());
      var chatBox = Vue.ref(null);
      var outputForm = Vue.ref({ title: '', content: '', expertId: '' });
      var addExpertId = Vue.ref('');
      var previewItem = Vue.ref(null);
      var previewVisible = Vue.ref(false);

      var TASK_STATUS_LABEL = {
        queued: '排队中', thinking: '思考中', running: '执行中', tool: '工具调用',
        waiting: '待审批', done: '已完成', error: '异常阻塞'
      };

      function taskStatusLabel(status) {
        return TASK_STATUS_LABEL[status] || status;
      }

      function taskDisplayTitle(task) {
        var title = task.title || '';
        var names = [];
        if (task.expert && task.expert.name) names.push(task.expert.name);
        allExperts.value.forEach(function (e) {
          if (names.indexOf(e.name) < 0) names.push(e.name);
        });
        names.forEach(function (name) {
          if (title.indexOf(name + '：') === 0) title = title.slice(name.length + 1);
          else if (title.indexOf(name + ':') === 0) title = title.slice(name.length + 1);
        });
        return title;
      }

      function isTaskDone(task) {
        return task.status === 'done';
      }

      function load() {
        project.value = store.getProject(props.projectId);
        if (!project.value) return;
        members.value = store.getProjectMembers(props.projectId).map(function (m) {
          return Object.assign({}, m, { expert: store.getExpert(m.expertId) });
        });
        messages.value = store.getProjectMessages(props.projectId);
        outputs.value = store.getProjectOutputs(props.projectId);
        projectTasks.value = store.getProjectTasks(props.projectId);
        projectFiles.value = store.getProjectFiles(props.projectId);
        if (!chatTarget.value) chatTarget.value = 'group';
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      var todoStats = Vue.computed(function () {
        var total = projectTasks.value.length;
        var done = projectTasks.value.filter(function (t) { return t.status === 'done'; }).length;
        return {
          total: total,
          done: done,
          percent: total ? Math.round((done / total) * 100) : 0
        };
      });

      var filteredMessages = Vue.computed(function () {
        if (chatTarget.value === 'group') return messages.value;
        if (chatTarget.value) {
          var expertId = chatTarget.value;
          return messages.value.filter(function (m) {
            if (m.expertId === expertId || m.targetExpertId === expertId) return true;
            if (!m.taskId) return false;
            var task = projectTasks.value.find(function (t) { return t.id === m.taskId; });
            return task && task.expertId === expertId;
          });
        }
        return messages.value;
      });

      var logViewLabel = Vue.computed(function () {
        if (chatTarget.value === 'group') return '项目组';
        if (chatTarget.value) return expertName(chatTarget.value);
        return '';
      });

      var chatPlaceholder = Vue.computed(function () {
        if (chatTarget.value === 'group') return '向项目组全体下发指令…';
        if (chatTarget.value) return '向「' + expertName(chatTarget.value) + '」下发指令…';
        return '请选择沟通对象后发送指令';
      });

      function selectChatTarget(target) {
        chatTarget.value = target;
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function isChatTargetActive(target) {
        return chatTarget.value === target;
      }

      function expertName(expertId) {
        var e = store.getExpert(expertId);
        return e ? e.name : '专家';
      }

      function send() {
        var text = inputText.value.trim();
        if (!text) return;
        if (chatTarget.value === 'group') {
          store.addProjectMessage(props.projectId, {
            role: 'user', type: 'chat', content: text, taskId: null, expertId: null, scope: 'group'
          });
          store.addProjectMessage(props.projectId, {
            role: 'system', type: 'chat', taskId: null,
            content: '指令已发送至项目组，各位专家将协同跟进。'
          });
        } else if (chatTarget.value) {
          var targetExpert = chatTarget.value;
          store.addProjectMessage(props.projectId, {
            role: 'user', type: 'chat', content: text, taskId: null,
            expertId: null, targetExpertId: targetExpert
          });
          store.addProjectMessage(props.projectId, {
            role: 'expert', type: 'chat',
            content: '收到，我来处理：「' + text + '」',
            taskId: null, expertId: targetExpert
          });
        }
        inputText.value = '';
        messages.value = store.getProjectMessages(props.projectId);
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function addMember() {
        if (!addExpertId.value) return;
        store.addProjectMember(props.projectId, addExpertId.value);
        addExpertId.value = '';
        load();
      }

      function removeMember(memberId) {
        store.removeProjectMember(memberId);
        load();
      }

      function addOutput() {
        if (!outputForm.value.title.trim()) return;
        store.addProjectOutput({
          projectId: props.projectId,
          title: outputForm.value.title,
          content: outputForm.value.content,
          expertId: outputForm.value.expertId || null
        });
        outputForm.value = { title: '', content: '', expertId: '' };
        outputs.value = store.getProjectOutputs(props.projectId);
        ElementPlus.ElMessage.success('产物已添加');
      }

      function openPreview(item) {
        previewItem.value = item;
        previewVisible.value = true;
      }

      function fileTypeIcon(type) {
        if (type === 'spreadsheet') return '📊';
        if (type === 'data') return '📁';
        return '📄';
      }

      function toggleSidebarPanel(panel) {
        sidebarPanel.value = sidebarPanel.value === panel ? null : panel;
      }

      Vue.watch(function () { return props.projectId; }, function () {
        chatTarget.value = null;
        load();
      });
      Vue.onMounted(load);

      return {
        project: project, sidebarPanel: sidebarPanel, workspaceTab: workspaceTab,
        chatTarget: chatTarget, todoStats: todoStats,
        filteredMessages: filteredMessages, logViewLabel: logViewLabel, chatPlaceholder: chatPlaceholder,
        members: members, projectTasks: projectTasks, projectFiles: projectFiles,
        messages: messages, outputs: outputs, inputText: inputText, allExperts: allExperts,
        chatBox: chatBox, outputForm: outputForm, addExpertId: addExpertId,
        previewItem: previewItem, previewVisible: previewVisible,
        taskStatusLabel: taskStatusLabel, taskDisplayTitle: taskDisplayTitle,
        isTaskDone: isTaskDone,
        selectChatTarget: selectChatTarget,
        isChatTargetActive: isChatTargetActive, expertName: expertName,
        send: send, addMember: addMember, removeMember: removeMember, addOutput: addOutput,
        openPreview: openPreview, fileTypeIcon: fileTypeIcon, toggleSidebarPanel: toggleSidebarPanel
      };
    },
    template: '\
      <div class="project-detail-layout" v-if="project">\
        <div class="chat-header project-detail-header">\
          <div class="chat-header-left">\
            <back-link label="返回项目" inline @click="$emit(\'nav\', \'/projects\')" />\
            <div style="min-width:0">\
              <div class="chat-expert-name">{{ project.name }}</div>\
              <div style="font-size:12px;color:#909399;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ project.description }}</div>\
            </div>\
          </div>\
          <div class="project-header-actions">\
            <button\
              type="button"\
              class="project-header-action-btn"\
              :class="{ active: sidebarPanel === \'members\' }"\
              title="项目成员"\
              @click="toggleSidebarPanel(\'members\')">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>\
                <circle cx="9" cy="7" r="4"/>\
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>\
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>\
              </svg>\
              <span>项目成员</span>\
            </button>\
            <button\
              type="button"\
              class="project-header-action-btn"\
              :class="{ active: sidebarPanel === \'workspace\' }"\
              title="工作空间"\
              @click="toggleSidebarPanel(\'workspace\')">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>\
              </svg>\
              <span>工作空间</span>\
            </button>\
          </div>\
        </div>\
        <div class="project-detail-body">\
            <aside class="project-kanban-panel">\
              <div class="project-panel-head">项目看板</div>\
              <div class="task-todo-summary" v-if="projectTasks.length">\
                <div class="task-todo-summary-row">\
                  <span class="task-todo-summary-label">项目待办</span>\
                  <span class="task-todo-summary-count">{{ todoStats.done }}/{{ todoStats.total }} 已完成</span>\
                </div>\
                <div class="task-todo-progress-track">\
                  <div class="task-todo-progress-fill" :style="{ width: todoStats.percent + \'%\' }"></div>\
                </div>\
              </div>\
              <div class="project-kanban-scroll project-kanban-scroll-todo">\
                <div v-if="projectTasks.length === 0" class="project-task-flow-empty">暂无待办</div>\
                <ul v-else class="task-todo-list">\
                  <li\
                    v-for="t in projectTasks"\
                    :key="\'todo-\' + t.id"\
                    class="task-todo-item"\
                    :class="{ \'is-done\': isTaskDone(t), [\'status-\' + t.status]: true }">\
                    <span class="task-todo-check" :class="{ checked: isTaskDone(t) }">\
                      <svg v-if="isTaskDone(t)" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">\
                        <polyline points="2 6 5 9 10 3"/>\
                      </svg>\
                    </span>\
                    <div class="task-todo-body">\
                      <div class="task-todo-title-row">\
                        <span class="task-todo-title">{{ taskDisplayTitle(t) }}</span>\
                        <span class="task-todo-badge">{{ taskStatusLabel(t.status) }}</span>\
                      </div>\
                      <div class="task-todo-expert-row" v-if="t.expert">\
                        <img class="task-todo-avatar" :src="t.expert.avatar" :alt="t.expert.name">\
                        <span>{{ t.expert.name }}</span>\
                      </div>\
                      <div class="task-todo-expert-row is-unassigned" v-else>待分配专家</div>\
                    </div>\
                  </li>\
                </ul>\
              </div>\
            </aside>\
            <section class="project-log-panel">\
              <div class="project-panel-head">\
                沟通与日志\
                <span v-if="logViewLabel" class="project-panel-sub">· {{ logViewLabel }}</span>\
              </div>\
              <div class="project-log-area">\
                <div class="chat-messages project-log-scroll" ref="chatBox">\
                  <div v-if="filteredMessages.length === 0" class="project-log-empty">暂无日志，请选择沟通对象</div>\
                  <template v-for="msg in filteredMessages" :key="msg.id">\
                    <details v-if="msg.type === \'thought\'" class="log-thought-block">\
                      <summary>思考过程 · {{ expertName(msg.expertId) }}</summary>\
                      <div class="log-thought-content">{{ msg.content }}</div>\
                    </details>\
                    <div v-else-if="msg.type === \'action\'" class="log-action-card">\
                      <div class="log-action-icon">⚡</div>\
                      <div class="log-action-body">\
                        <div class="log-action-title">{{ expertName(msg.expertId) }} 正在调用工具</div>\
                        <div class="log-action-tool" v-if="msg.toolName">[{{ msg.toolName }}]</div>\
                        <div class="log-action-desc">{{ msg.content }}</div>\
                      </div>\
                    </div>\
                    <div v-else class="msg-row" :class="msg.role">\
                      <div class="msg-bubble">{{ msg.role === \'expert\' && msg.expertId ? \'【\' + expertName(msg.expertId) + \'】\' : \'\' }}{{ msg.content }}</div>\
                    </div>\
                  </template>\
                </div>\
                <div class="chat-input project-log-input">\
                  <div class="chat-target-bar">\
                    <button\
                      type="button"\
                      class="chat-target-btn chat-target-group"\
                      :class="{ active: isChatTargetActive(\'group\') }"\
                      @click="selectChatTarget(\'group\')">\
                      <span class="chat-target-group-icon">👥</span>\
                      <span>项目组</span>\
                    </button>\
                    <button\
                      v-for="m in members"\
                      :key="m.expertId"\
                      type="button"\
                      class="chat-target-btn"\
                      :class="{ active: isChatTargetActive(m.expertId) }"\
                      :title="m.expert.name"\
                      @click="selectChatTarget(m.expertId)">\
                      <img :src="m.expert.avatar" :alt="m.expert.name" class="chat-target-avatar">\
                      <span>{{ m.expert.name }}</span>\
                    </button>\
                  </div>\
                  <el-input\
                    v-model="inputText"\
                    type="textarea"\
                    :rows="2"\
                    :placeholder="chatPlaceholder"\
                    @keydown.ctrl.enter="send" />\
                  <div style="margin-top:8px;text-align:right">\
                    <el-button type="primary" :disabled="!chatTarget" @click="send">发送 (Ctrl+Enter)</el-button>\
                  </div>\
                </div>\
              </div>\
            </section>\
            <aside class="project-workspace-panel" v-show="sidebarPanel">\
              <div class="project-panel-head">{{ sidebarPanel === \'members\' ? \'项目成员\' : \'工作空间\' }}</div>\
              <div v-if="sidebarPanel === \'members\'" class="project-workspace-area">\
                <div class="project-workspace-scroll">\
                  <div class="sidebar-add-row">\
                    <el-select v-model="addExpertId" placeholder="选择专家" size="small" style="flex:1">\
                      <el-option v-for="e in allExperts" :key="e.id" :label="e.name" :value="e.id" />\
                    </el-select>\
                    <el-button type="primary" size="small" @click="addMember">添加</el-button>\
                  </div>\
                  <div v-for="row in members" :key="row.id" class="sidebar-member-card">\
                    <img :src="row.expert.avatar" :alt="row.expert.name">\
                    <div class="sidebar-member-info">\
                      <div class="sidebar-member-name">{{ row.expert.name }}</div>\
                      <div class="sidebar-member-meta">{{ row.role }} · {{ row.progressSummary }}</div>\
                    </div>\
                    <el-button link type="danger" size="small" @click="removeMember(row.id)">移除</el-button>\
                  </div>\
                  <div v-if="members.length === 0" class="project-task-flow-empty">暂无成员</div>\
                </div>\
              </div>\
              <div v-else-if="sidebarPanel === \'workspace\'" class="project-workspace-area">\
                <el-tabs v-model="workspaceTab" class="project-workspace-tabs">\
                  <el-tab-pane label="项目资料" name="materials">\
                    <div class="project-workspace-scroll">\
                      <div\
                        v-for="f in projectFiles"\
                        :key="f.id"\
                        class="workspace-file-item"\
                        @click="openPreview(f)">\
                        <span class="workspace-file-icon">{{ fileTypeIcon(f.type) }}</span>\
                        <div class="workspace-file-info">\
                          <div class="workspace-file-name">{{ f.name }}</div>\
                          <div class="workspace-file-meta">{{ f.updatedAt }}</div>\
                        </div>\
                        <span v-if="f.status === \'updating\'" class="workspace-file-badge">🔄 更新中</span>\
                      </div>\
                      <div v-if="projectFiles.length === 0" class="project-task-flow-empty">暂无资料</div>\
                    </div>\
                  </el-tab-pane>\
                  <el-tab-pane label="项目产物" name="outputs">\
                    <div class="project-workspace-scroll">\
                      <div class="sidebar-output-form">\
                        <el-input v-model="outputForm.title" placeholder="产物标题" size="small" />\
                        <el-input v-model="outputForm.content" type="textarea" :rows="2" placeholder="产物内容" size="small" />\
                        <el-select v-model="outputForm.expertId" placeholder="归属专家" clearable size="small" style="width:100%">\
                          <el-option v-for="m in members" :key="m.expertId" :label="m.expert.name" :value="m.expertId" />\
                        </el-select>\
                        <el-button type="primary" size="small" style="width:100%" @click="addOutput">添加产物</el-button>\
                      </div>\
                      <div\
                        v-for="o in outputs"\
                        :key="o.id"\
                        class="workspace-file-item artifact-output-item"\
                        @click="openPreview(o)">\
                        <span class="workspace-file-icon">📦</span>\
                        <div class="workspace-file-info">\
                          <div class="workspace-file-name">{{ o.title }}</div>\
                          <div class="workspace-file-meta">{{ o.createdAt }}</div>\
                        </div>\
                      </div>\
                      <div v-if="outputs.length === 0" class="project-task-flow-empty">暂无产物</div>\
                    </div>\
                  </el-tab-pane>\
                </el-tabs>\
              </div>\
            </aside>\
        </div>\
        <el-dialog v-model="previewVisible" :title="previewItem && (previewItem.name || previewItem.title)" width="720px" class="project-preview-dialog">\
          <div class="markdown-preview" style="max-height:60vh;overflow-y:auto">{{ previewItem && (previewItem.content || previewItem.title) }}</div>\
        </el-dialog>\
      </div>\
      <div v-else class="main-scroll"><el-empty description="项目不存在"><back-link label="返回项目" @click="$emit(\'nav\', \'/projects\')" /></el-empty></div>'
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

  app.component('create-action-btn', CreateActionBtn);
  app.component('back-link', BackLink);
  app.component('app-sidebar', AppSidebar);
  app.component('expert-center-page', ExpertCenterPage);
  app.component('expert-detail-page', ExpertDetailPage);
  app.component('expert-tasks-page', ExpertTasksPage);
  app.component('project-list-page', ProjectListPage);
  app.component('project-detail-page', ProjectDetailPage);

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
