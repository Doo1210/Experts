(function () {
  var store = window.AppStore;
  var catalog = window;

  function createChatFileUpload() {
    var pendingFiles = Vue.ref([]);
    var fileInputRef = Vue.ref(null);

    function triggerFileUpload() {
      if (fileInputRef.value) fileInputRef.value.click();
    }

    function handleFileSelect(ev) {
      var files = ev.target.files;
      if (!files) return;
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        pendingFiles.value.push({
          id: 'f_' + Date.now() + '_' + i,
          name: f.name,
          size: f.size
        });
      }
      ev.target.value = '';
    }

    function removePendingFile(id) {
      pendingFiles.value = pendingFiles.value.filter(function (f) { return f.id !== id; });
    }

    function takePendingFiles() {
      var files = pendingFiles.value.slice();
      pendingFiles.value = [];
      return files;
    }

    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    return {
      pendingFiles: pendingFiles,
      fileInputRef: fileInputRef,
      triggerFileUpload: triggerFileUpload,
      handleFileSelect: handleFileSelect,
      removePendingFile: removePendingFile,
      takePendingFiles: takePendingFiles,
      formatFileSize: formatFileSize
    };
  }

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

  var PROJECT_ICON_PRESETS = ['📁', '🏭', '📊', '🔧', '⚙️', '🎯', '📋', '🚀', '💡', '🔬'];

  function isProjectIconImage(icon) {
    return !!(icon && String(icon).indexOf('data:image') === 0);
  }

  function readImageFile(file, onSuccess) {
    if (!file) return false;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      ElementPlus.ElMessage.warning('请选择图片文件');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      ElementPlus.ElMessage.warning('图片大小不能超过 2MB');
      return false;
    }
    var reader = new FileReader();
    reader.onload = function (ev) { onSuccess(ev.target.result); };
    reader.readAsDataURL(file);
    return true;
  }

  function inferProjectFileType(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return 'spreadsheet';
    if (ext === 'csv' || ext === 'json') return 'data';
    return 'document';
  }

  function readUploadedFileContent(file, callback) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var textExts = ['md', 'txt', 'csv', 'json', 'log', 'xml', 'html', 'js', 'ts', 'py'];
    var reader = new FileReader();
    reader.onload = function (ev) { callback(ev.target.result); };
    reader.onerror = function () { callback(''); };
    if (textExts.indexOf(ext) >= 0 || (file.type && file.type.indexOf('text/') === 0)) {
      reader.readAsText(file);
    } else {
      callback('已上传文件：' + file.name);
    }
  }

  function expertMatchesSearch(expert, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    if (expert.name && expert.name.toLowerCase().indexOf(q) !== -1) return true;
    if (expert.description && expert.description.toLowerCase().indexOf(q) !== -1) return true;
    if (expert.expertise && expert.expertise.some(function (tag) {
      return tag.toLowerCase().indexOf(q) !== -1;
    })) return true;
    return false;
  }

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

  var ExpertCenterPage = {
    props: ['openCreate'],
    emits: ['nav', 'refresh'],
    setup: function (props, ctx) {
      var experts = Vue.ref([]);
      var showEditDialog = Vue.ref(false);
      var showCreateDialog = Vue.ref(false);
      var editForm = Vue.ref({ name: '', description: '', avatar: '', expertise: [] });
      var editingExpert = Vue.ref(null);
      var editAvatarInput = Vue.ref(null);
      var editExpertiseTagInput = Vue.ref('');
      var saving = Vue.ref(false);
      var defaultPersona = {
        coreDutyMd: '## 核心职责\n\n',
        workflowMd: '## 工作流程\n\n1. \n2. \n3. ',
        behaviorMd: '## 行为准则\n\n- '
      };

      var createAvatarInput = Vue.ref(null);

      function emptyCreateForm() {
        return {
          name: '', description: '', avatar: '',
          expertise: [],
          coreDutyMd: defaultPersona.coreDutyMd,
          workflowMd: defaultPersona.workflowMd,
          behaviorMd: defaultPersona.behaviorMd,
          skillIds: [], toolIds: []
        };
      }

      var createForm = Vue.ref(emptyCreateForm());
      var createStep = Vue.ref(0);
      var expertiseTagInput = Vue.ref('');
      var CREATE_STEP_TITLES = ['基础信息', '人设文档', '能力绑定'];

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

      function resetCreateForm() {
        createForm.value = emptyCreateForm();
        createStep.value = 0;
        expertiseTagInput.value = '';
      }

      function addCreateExpertiseTag() {
        var tag = expertiseTagInput.value.trim();
        if (!tag) return;
        if (createForm.value.expertise.indexOf(tag) !== -1) {
          ElementPlus.ElMessage.warning('该标签已存在');
          return;
        }
        createForm.value.expertise = createForm.value.expertise.concat([tag]);
        expertiseTagInput.value = '';
      }

      function removeCreateExpertiseTag(tag) {
        createForm.value.expertise = createForm.value.expertise.filter(function (t) { return t !== tag; });
      }

      function onExpertiseTagKeydown(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCreateExpertiseTag();
        }
      }

      function triggerCreateAvatarUpload() {
        if (createAvatarInput.value) createAvatarInput.value.click();
      }

      function applyAvatarFile(file, setAvatar) {
        if (!file) return false;
        if (!file.type || file.type.indexOf('image/') !== 0) {
          ElementPlus.ElMessage.warning('请选择图片文件');
          return false;
        }
        if (file.size > 2 * 1024 * 1024) {
          ElementPlus.ElMessage.warning('图片大小不能超过 2MB');
          return false;
        }
        var reader = new FileReader();
        reader.onload = function (ev) { setAvatar(ev.target.result); };
        reader.readAsDataURL(file);
        return true;
      }

      function handleCreateAvatarChange(e) {
        var file = e.target.files && e.target.files[0];
        if (applyAvatarFile(file, function (url) { createForm.value.avatar = url; })) {
          e.target.value = '';
        }
      }

      function openCreateDialog() {
        resetCreateForm();
        showCreateDialog.value = true;
      }

      function validateCreateStep(step) {
        if (step === 0) {
          if (!createForm.value.name.trim() || !createForm.value.description.trim()) {
            ElementPlus.ElMessage.warning('请填写专家名称和介绍');
            return false;
          }
        }
        return true;
      }

      function goCreateNextStep() {
        if (!validateCreateStep(createStep.value)) return;
        if (createStep.value < CREATE_STEP_TITLES.length - 1) {
          createStep.value += 1;
        }
      }

      function goCreatePrevStep() {
        if (createStep.value > 0) createStep.value -= 1;
      }

      function closeCreateDialog() {
        showCreateDialog.value = false;
        resetCreateForm();
      }

      function submitCreate() {
        if (!validateCreateStep(0)) {
          createStep.value = 0;
          return;
        }
        saving.value = true;
        var expert = store.createExpert({
          name: createForm.value.name.trim(),
          description: createForm.value.description.trim(),
          avatar: createForm.value.avatar || undefined,
          expertise: createForm.value.expertise.slice(),
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

      function resetEditForm() {
        editForm.value = { name: '', description: '', avatar: '', expertise: [] };
        editExpertiseTagInput.value = '';
        editingExpert.value = null;
      }

      function openEdit(expert) {
        editingExpert.value = expert;
        editForm.value = {
          name: expert.name,
          description: expert.description,
          avatar: expert.avatar || '',
          expertise: (expert.expertise || []).slice()
        };
        editExpertiseTagInput.value = '';
        showEditDialog.value = true;
      }

      function closeEditDialog() {
        showEditDialog.value = false;
        resetEditForm();
      }

      function triggerEditAvatarUpload() {
        if (editAvatarInput.value) editAvatarInput.value.click();
      }

      function handleEditAvatarChange(e) {
        var file = e.target.files && e.target.files[0];
        if (applyAvatarFile(file, function (url) { editForm.value.avatar = url; })) {
          e.target.value = '';
        }
      }

      function addEditExpertiseTag() {
        var tag = editExpertiseTagInput.value.trim();
        if (!tag) return;
        if (editForm.value.expertise.indexOf(tag) !== -1) {
          ElementPlus.ElMessage.warning('该标签已存在');
          return;
        }
        editForm.value.expertise = editForm.value.expertise.concat([tag]);
        editExpertiseTagInput.value = '';
      }

      function removeEditExpertiseTag(tag) {
        editForm.value.expertise = editForm.value.expertise.filter(function (t) { return t !== tag; });
      }

      function onEditExpertiseTagKeydown(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addEditExpertiseTag();
        }
      }

      function submitEdit() {
        if (!editForm.value.name.trim() || !editForm.value.description.trim()) {
          ElementPlus.ElMessage.warning('请填写专家名称和介绍');
          return;
        }
        store.saveExpert(Object.assign({}, editingExpert.value, {
          name: editForm.value.name.trim(),
          description: editForm.value.description.trim(),
          avatar: editForm.value.avatar || editingExpert.value.avatar,
          expertise: editForm.value.expertise.slice()
        }));
        closeEditDialog();
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
        skills: catalog.SKILLS_CATALOG,
        tools: catalog.TOOLS_CATALOG,
        showEditDialog: showEditDialog,
        showCreateDialog: showCreateDialog,
        showPreviewDialog: showPreviewDialog,
        previewExpert: previewExpert,
        previewStats: previewStats,
        editForm: editForm,
        editAvatarInput: editAvatarInput,
        editExpertiseTagInput: editExpertiseTagInput,
        triggerEditAvatarUpload: triggerEditAvatarUpload,
        handleEditAvatarChange: handleEditAvatarChange,
        addEditExpertiseTag: addEditExpertiseTag,
        removeEditExpertiseTag: removeEditExpertiseTag,
        onEditExpertiseTagKeydown: onEditExpertiseTagKeydown,
        closeEditDialog: closeEditDialog,
        resetEditForm: resetEditForm,
        createForm: createForm,
        createStep: createStep,
        createStepTitles: CREATE_STEP_TITLES,
        createAvatarInput: createAvatarInput,
        triggerCreateAvatarUpload: triggerCreateAvatarUpload,
        handleCreateAvatarChange: handleCreateAvatarChange,
        expertiseTagInput: expertiseTagInput,
        addCreateExpertiseTag: addCreateExpertiseTag,
        removeCreateExpertiseTag: removeCreateExpertiseTag,
        onExpertiseTagKeydown: onExpertiseTagKeydown,
        saving: saving,
        goTasks: goTasks,
        goManage: goManage,
        openPreview: openPreview,
        closePreview: closePreview,
        goManageFromPreview: goManageFromPreview,
        goTasksFromPreview: goTasksFromPreview,
        openCreateDialog: openCreateDialog,
        closeCreateDialog: closeCreateDialog,
        resetCreateForm: resetCreateForm,
        goCreateNextStep: goCreateNextStep,
        goCreatePrevStep: goCreatePrevStep,
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
        <el-dialog v-model="showCreateDialog" width="640px" class="form-dialog form-dialog-expert form-dialog-expert-wizard" :close-on-click-modal="false" @closed="resetCreateForm">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-expert-wizard">\
              <div class="dialog-header-icon dialog-header-icon-create" :class="{ \'dialog-header-icon-has-avatar\': createForm.avatar }">\
                <img v-if="createForm.avatar" :src="createForm.avatar" alt="" class="dialog-header-avatar">\
                <span v-else class="dialog-header-avatar-placeholder">👤</span>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">新建专家</div>\
                <div class="dialog-header-sub">分步配置专家身份、人设与能力</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body form-dialog-wizard">\
            <nav class="wizard-steps-compact wizard-steps-expert" aria-label="创建步骤">\
              <div\
                v-for="(title, idx) in createStepTitles"\
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
                <div class="create-basic-hero">\
                  <div class="create-basic-avatar-card create-avatar-upload" role="button" tabindex="0" @click="triggerCreateAvatarUpload" @keydown.enter="triggerCreateAvatarUpload">\
                    <input ref="createAvatarInput" type="file" accept="image/*" class="create-avatar-input" @change="handleCreateAvatarChange" @click.stop>\
                    <div v-if="createForm.avatar" class="create-avatar-preview-wrap">\
                      <img :src="createForm.avatar" class="create-basic-avatar" alt="头像预览">\
                      <div class="create-avatar-overlay">\
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                        <span>更换头像</span>\
                      </div>\
                    </div>\
                    <div v-else class="create-avatar-empty">\
                      <div class="create-avatar-empty-icon">\
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                      </div>\
                      <span class="create-avatar-empty-text">点击上传头像</span>\
                      <span class="create-avatar-empty-hint">支持 JPG、PNG，最大 2MB</span>\
                    </div>\
                  </div>\
                  <el-form label-position="top" class="form-dialog-form create-basic-form">\
                    <el-form-item label="专家名称" required>\
                      <el-input v-model="createForm.name" placeholder="如：首席工艺专家" size="large" />\
                    </el-form-item>\
                    <el-form-item label="专家介绍" required>\
                      <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="简要描述专家能力与经验背景" />\
                    </el-form-item>\
                  </el-form>\
                </div>\
                <div class="expertise-tag-editor">\
                  <div class="expertise-tag-editor-head">\
                    <span class="expertise-tag-editor-label">擅长领域</span>\
                    <span class="expertise-tag-editor-optional">选填</span>\
                  </div>\
                  <div v-if="createForm.expertise.length" class="expertise-tag-chips">\
                    <span\
                      v-for="(tag, idx) in createForm.expertise"\
                      :key="tag"\
                      class="expertise-tag-chip expertise-tag"\
                      :class="tagColors[idx % tagColors.length]">\
                      {{ tag }}\
                      <button type="button" class="expertise-tag-chip-remove" title="移除" @click="removeCreateExpertiseTag(tag)">\
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>\
                      </button>\
                    </span>\
                  </div>\
                  <div class="expertise-tag-input-row">\
                    <el-input\
                      v-model="expertiseTagInput"\
                      placeholder="输入领域标签，按 Enter 添加"\
                      @keydown="onExpertiseTagKeydown" />\
                    <el-button type="primary" plain @click="addCreateExpertiseTag">添加</el-button>\
                  </div>\
                  <p class="form-dialog-hint expertise-tag-hint">可添加多个标签，如「SPC」「良率分析」「工艺优化」</p>\
                </div>\
              </div>\
              <div v-show="createStep === 1" class="wizard-step-content wizard-step-persona">\
                <p class="wizard-step-desc">定义专家的核心职责、工作流程与行为准则，支持 Markdown 格式</p>\
                <el-form label-position="top" class="form-dialog-form wizard-persona-form">\
                  <el-form-item label="核心职责">\
                    <el-input v-model="createForm.coreDutyMd" type="textarea" :rows="4" placeholder="描述专家的主要职责与目标" />\
                  </el-form-item>\
                  <el-form-item label="工作流程">\
                    <el-input v-model="createForm.workflowMd" type="textarea" :rows="4" placeholder="描述专家处理任务的典型步骤" />\
                  </el-form-item>\
                  <el-form-item label="行为准则">\
                    <el-input v-model="createForm.behaviorMd" type="textarea" :rows="4" placeholder="描述专家的沟通风格与约束" />\
                  </el-form-item>\
                </el-form>\
              </div>\
              <div v-show="createStep === 2" class="wizard-step-content wizard-step-bindings">\
                <p class="wizard-step-desc">为专家绑定技能与工具，创建后可在详情页继续调整</p>\
                <el-form label-position="top" class="form-dialog-form">\
                  <el-form-item label="技能">\
                    <el-select v-model="createForm.skillIds" multiple placeholder="选择技能" style="width:100%">\
                      <el-option v-for="s in skills" :key="s.id" :label="s.name" :value="s.id">\
                        <span>{{ s.name }}</span><span class="select-option-desc">{{ s.description }}</span>\
                      </el-option>\
                    </el-select>\
                  </el-form-item>\
                  <el-form-item label="工具 / MCP">\
                    <el-select v-model="createForm.toolIds" multiple placeholder="选择工具" style="width:100%">\
                      <el-option v-for="t in tools" :key="t.id" :label="t.name" :value="t.id" />\
                    </el-select>\
                  </el-form-item>\
                </el-form>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="closeCreateDialog">取消</el-button>\
                <el-button v-if="createStep > 0" class="wizard-btn wizard-btn-back" @click="goCreatePrevStep">上一步</el-button>\
                <el-button v-if="createStep < createStepTitles.length - 1" class="wizard-btn wizard-btn-next wizard-btn-next-expert" @click="goCreateNextStep">下一步</el-button>\
                <el-button v-else class="wizard-btn wizard-btn-submit wizard-btn-submit-expert" :loading="saving" @click="submitCreate">创建专家</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="showEditDialog" width="640px" class="form-dialog form-dialog-expert form-dialog-expert-edit" :close-on-click-modal="false" @closed="resetEditForm">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-expert-wizard">\
              <div class="dialog-header-icon dialog-header-icon-edit" :class="{ \'dialog-header-icon-has-avatar\': editForm.avatar }">\
                <img v-if="editForm.avatar" :src="editForm.avatar" alt="" class="dialog-header-avatar">\
                <span v-else class="dialog-header-avatar-placeholder">✏️</span>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">编辑专家</div>\
                <div class="dialog-header-sub">修改专家名称、介绍、头像与擅长领域</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="create-basic-hero">\
              <div class="create-basic-avatar-card create-avatar-upload" role="button" tabindex="0" @click="triggerEditAvatarUpload" @keydown.enter="triggerEditAvatarUpload">\
                <input ref="editAvatarInput" type="file" accept="image/*" class="create-avatar-input" @change="handleEditAvatarChange" @click.stop>\
                <div v-if="editForm.avatar" class="create-avatar-preview-wrap">\
                  <img :src="editForm.avatar" class="create-basic-avatar" alt="头像预览">\
                  <div class="create-avatar-overlay">\
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                    <span>更换头像</span>\
                  </div>\
                </div>\
                <div v-else class="create-avatar-empty">\
                  <div class="create-avatar-empty-icon">\
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                  </div>\
                  <span class="create-avatar-empty-text">点击上传头像</span>\
                  <span class="create-avatar-empty-hint">支持 JPG、PNG，最大 2MB</span>\
                </div>\
              </div>\
              <el-form label-position="top" class="form-dialog-form create-basic-form">\
                <el-form-item label="专家名称" required>\
                  <el-input v-model="editForm.name" placeholder="如：首席工艺专家" size="large" />\
                </el-form-item>\
                <el-form-item label="专家介绍" required>\
                  <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="简要描述专家能力与经验背景" />\
                </el-form-item>\
              </el-form>\
            </div>\
            <div class="expertise-tag-editor">\
              <div class="expertise-tag-editor-head">\
                <span class="expertise-tag-editor-label">擅长领域</span>\
                <span class="expertise-tag-editor-optional">选填</span>\
              </div>\
              <div v-if="editForm.expertise.length" class="expertise-tag-chips">\
                <span\
                  v-for="(tag, idx) in editForm.expertise"\
                  :key="tag"\
                  class="expertise-tag-chip expertise-tag"\
                  :class="tagColors[idx % tagColors.length]">\
                  {{ tag }}\
                  <button type="button" class="expertise-tag-chip-remove" title="移除" @click="removeEditExpertiseTag(tag)">\
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>\
                  </button>\
                </span>\
              </div>\
              <div class="expertise-tag-input-row">\
                <el-input\
                  v-model="editExpertiseTagInput"\
                  placeholder="输入领域标签，按 Enter 添加"\
                  @keydown="onEditExpertiseTagKeydown" />\
                <el-button type="primary" plain @click="addEditExpertiseTag">添加</el-button>\
              </div>\
              <p class="form-dialog-hint expertise-tag-hint">可添加多个标签，如「SPC」「良率分析」「工艺优化」</p>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <el-button @click="closeEditDialog">取消</el-button>\
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
      var showEditDialog = Vue.ref(false);
      var editForm = Vue.ref({ name: '', description: '', avatar: '', expertise: [] });
      var editAvatarInput = Vue.ref(null);
      var editExpertiseTagInput = Vue.ref('');

      function resetEditForm() {
        editForm.value = { name: '', description: '', avatar: '', expertise: [] };
        editExpertiseTagInput.value = '';
      }

      function openEditDialog() {
        if (!expert.value) return;
        editForm.value = {
          name: expert.value.name,
          description: expert.value.description,
          avatar: expert.value.avatar || '',
          expertise: (expert.value.expertise || []).slice()
        };
        editExpertiseTagInput.value = '';
        showEditDialog.value = true;
      }

      function closeEditDialog() {
        showEditDialog.value = false;
        resetEditForm();
      }

      function triggerEditAvatarUpload() {
        if (editAvatarInput.value) editAvatarInput.value.click();
      }

      function handleEditAvatarChange(e) {
        var file = e.target.files && e.target.files[0];
        if (readImageFile(file, function (url) { editForm.value.avatar = url; })) {
          e.target.value = '';
        }
      }

      function addEditExpertiseTag() {
        var tag = editExpertiseTagInput.value.trim();
        if (!tag) return;
        if (editForm.value.expertise.indexOf(tag) !== -1) {
          ElementPlus.ElMessage.warning('该标签已存在');
          return;
        }
        editForm.value.expertise = editForm.value.expertise.concat([tag]);
        editExpertiseTagInput.value = '';
      }

      function removeEditExpertiseTag(tag) {
        editForm.value.expertise = editForm.value.expertise.filter(function (t) { return t !== tag; });
      }

      function onEditExpertiseTagKeydown(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addEditExpertiseTag();
        }
      }

      function submitEdit() {
        if (!expert.value) return;
        if (!editForm.value.name.trim() || !editForm.value.description.trim()) {
          ElementPlus.ElMessage.warning('请填写专家名称和介绍');
          return;
        }
        store.saveExpert(Object.assign({}, expert.value, {
          name: editForm.value.name.trim(),
          description: editForm.value.description.trim(),
          avatar: editForm.value.avatar || expert.value.avatar,
          expertise: editForm.value.expertise.slice()
        }));
        closeEditDialog();
        load();
        ElementPlus.ElMessage.success('专家信息已更新');
      }

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
        showEditDialog: showEditDialog, editForm: editForm, editAvatarInput: editAvatarInput,
        editExpertiseTagInput: editExpertiseTagInput,
        skills: catalog.SKILLS_CATALOG, tools: catalog.TOOLS_CATALOG,
        tagColors: catalog.TAG_COLORS,
        statusLabel: catalog.TASK_STATUS_LABEL, statusType: catalog.TASK_STATUS_TYPE,
        artifactTypeLabel: { document: '文档', report: '报告', data: '数据', file: '文件' },
        savePersona: savePersona, saveSkills: saveSkills, saveTools: saveTools,
        addMemory: addMemory, removeMemory: removeMemory, saveIm: saveIm, savePerm: savePerm, addMaterial: addMaterial,
        openEditDialog: openEditDialog, closeEditDialog: closeEditDialog, resetEditForm: resetEditForm,
        triggerEditAvatarUpload: triggerEditAvatarUpload, handleEditAvatarChange: handleEditAvatarChange,
        addEditExpertiseTag: addEditExpertiseTag, removeEditExpertiseTag: removeEditExpertiseTag,
        onEditExpertiseTagKeydown: onEditExpertiseTagKeydown, submitEdit: submitEdit, goAssignTask: goAssignTask,
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
        <el-dialog v-model="showEditDialog" width="640px" class="form-dialog form-dialog-expert form-dialog-expert-edit" :close-on-click-modal="false" @closed="resetEditForm">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-expert-wizard">\
              <div class="dialog-header-icon dialog-header-icon-edit" :class="{ \'dialog-header-icon-has-avatar\': editForm.avatar }">\
                <img v-if="editForm.avatar" :src="editForm.avatar" alt="" class="dialog-header-avatar">\
                <span v-else class="dialog-header-avatar-placeholder">✏️</span>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">编辑基本信息</div>\
                <div class="dialog-header-sub">修改专家名称、介绍、头像与擅长领域</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="create-basic-hero">\
              <div class="create-basic-avatar-card create-avatar-upload" role="button" tabindex="0" @click="triggerEditAvatarUpload" @keydown.enter="triggerEditAvatarUpload">\
                <input ref="editAvatarInput" type="file" accept="image/*" class="create-avatar-input" @change="handleEditAvatarChange" @click.stop>\
                <div v-if="editForm.avatar" class="create-avatar-preview-wrap">\
                  <img :src="editForm.avatar" class="create-basic-avatar" alt="头像预览">\
                  <div class="create-avatar-overlay">\
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                    <span>更换头像</span>\
                  </div>\
                </div>\
                <div v-else class="create-avatar-empty">\
                  <div class="create-avatar-empty-icon">\
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                  </div>\
                  <span class="create-avatar-empty-text">点击上传头像</span>\
                  <span class="create-avatar-empty-hint">支持 JPG、PNG，最大 2MB</span>\
                </div>\
              </div>\
              <el-form label-position="top" class="form-dialog-form create-basic-form">\
                <el-form-item label="专家名称" required>\
                  <el-input v-model="editForm.name" placeholder="如：首席工艺专家" size="large" />\
                </el-form-item>\
                <el-form-item label="专家介绍" required>\
                  <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="简要描述专家能力与经验背景" />\
                </el-form-item>\
              </el-form>\
            </div>\
            <div class="expertise-tag-editor">\
              <div class="expertise-tag-editor-head">\
                <span class="expertise-tag-editor-label">擅长领域</span>\
                <span class="expertise-tag-editor-optional">选填</span>\
              </div>\
              <div v-if="editForm.expertise.length" class="expertise-tag-chips">\
                <span\
                  v-for="(tag, idx) in editForm.expertise"\
                  :key="tag"\
                  class="expertise-tag-chip expertise-tag"\
                  :class="tagColors[idx % tagColors.length]">\
                  {{ tag }}\
                  <button type="button" class="expertise-tag-chip-remove" title="移除" @click="removeEditExpertiseTag(tag)">\
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>\
                  </button>\
                </span>\
              </div>\
              <div class="expertise-tag-input-row">\
                <el-input\
                  v-model="editExpertiseTagInput"\
                  placeholder="输入领域标签，按 Enter 添加"\
                  @keydown="onEditExpertiseTagKeydown" />\
                <el-button type="primary" plain @click="addEditExpertiseTag">添加</el-button>\
              </div>\
              <p class="form-dialog-hint expertise-tag-hint">可添加多个标签，如「SPC」「良率分析」「工艺优化」</p>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom">\
              <el-button @click="closeEditDialog">取消</el-button>\
              <el-button type="primary" @click="submitEdit">保存</el-button>\
            </div>\
          </template>\
        </el-dialog>\
      </div>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };

  var TaskListItem = {
    props: ['task', 'active', 'artifactOpen', 'archived', 'isRunning', 'statusTip', 'createdAtLabel', 'artifactCount'],
    emits: ['select', 'toggle-artifacts', 'menu'],
    setup: function (props) {
      var isArchived = Vue.computed(function () {
        return !!props.archived || !!(props.task && props.task.archived);
      });
      return { isArchived: isArchived };
    },
    template: '\
      <div class="task-item" :class="{ active: active, \'task-item-archived\': isArchived }" @click="$emit(\'select\')">\
        <div class="task-item-accent"></div>\
        <div class="task-item-row">\
          <div class="task-status-indicator" :title="statusTip">\
            <span v-if="isRunning" class="task-status-spinner-wrap">\
              <span class="task-status-spinner"></span>\
            </span>\
            <span v-else class="task-status-dot-wrap">\
              <span class="task-status-dot"></span>\
            </span>\
          </div>\
          <div class="task-item-content">\
            <div class="task-item-title">{{ task.title }}</div>\
            <div class="task-item-meta">\
              <svg class="task-item-meta-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">\
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>\
              </svg>\
              <span>{{ createdAtLabel }}</span>\
            </div>\
          </div>\
          <div class="task-item-toolbar">\
            <button type="button" class="task-artifact-link" :class="{ active: artifactOpen }" title="产物" @click.stop="$emit(\'toggle-artifacts\', $event)">\
              <span class="task-artifact-link-icon">\
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">\
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
                  <polyline points="14 2 14 8 20 8"/>\
                </svg>\
              </span>\
              <span class="task-artifact-link-text">产物</span>\
              <span v-if="artifactCount > 0" class="task-artifact-badge">{{ artifactCount }}</span>\
            </button>\
            <el-dropdown trigger="click" @command="$emit(\'menu\', $event)">\
              <button type="button" class="task-more-btn" title="更多" @click.stop>\
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">\
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>\
                </svg>\
              </button>\
              <template #dropdown>\
                <el-dropdown-menu>\
                  <el-dropdown-item v-if="isArchived" command="unarchive">取消归档</el-dropdown-item>\
                  <el-dropdown-item v-if="!isArchived && !isRunning" command="archive">归档</el-dropdown-item>\
                  <el-dropdown-item v-if="!isArchived" command="edit">编辑</el-dropdown-item>\
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>\
                </el-dropdown-menu>\
              </template>\
            </el-dropdown>\
          </div>\
        </div>\
      </div>'
  };

  var ExpertTasksPage = {
    components: { TaskListItem: TaskListItem },
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
      var chatFiles = createChatFileUpload();
      var panelArtifacts = Vue.ref([]);
      var artifactPanelTaskId = Vue.ref(null);
      var archivedTasks = Vue.ref([]);
      var showArchived = Vue.ref(false);

      function loadPanelArtifacts(taskId) {
        panelArtifacts.value = taskId ? store.getTaskArtifacts(taskId) : [];
      }

      function toggleTaskArtifacts(task, ev) {
        ev.stopPropagation();
        if (artifactPanelTaskId.value === task.id) {
          artifactPanelTaskId.value = null;
          panelArtifacts.value = [];
        } else {
          artifactPanelTaskId.value = task.id;
          loadPanelArtifacts(task.id);
        }
      }

      function closeArtifactPanel() {
        artifactPanelTaskId.value = null;
        panelArtifacts.value = [];
      }

      function artifactPanelTaskTitle() {
        if (!artifactPanelTaskId.value) return '';
        var all = tasks.value.concat(archivedTasks.value);
        var t = all.find(function (x) { return x.id === artifactPanelTaskId.value; });
        return t ? t.title : '任务产物';
      }

      function getTaskArtifactCount(taskId) {
        return store.getTaskArtifacts(taskId).length;
      }

      function artifactTypeClass(type) {
        return 'artifact-type-' + (type || 'file');
      }

      function refreshTasks() {
        var all = store.getTasksByExpert(props.expertId, 'dialogue', true);
        tasks.value = all.filter(function (t) { return !t.archived; });
        archivedTasks.value = all.filter(function (t) { return t.archived; });
      }

      function formatTaskCreatedAt(isoStr) {
        if (!isoStr) return '';
        var d = new Date(String(isoStr).replace(' ', 'T'));
        if (isNaN(d.getTime())) return isoStr;
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hours = String(d.getHours()).padStart(2, '0');
        var minutes = String(d.getMinutes()).padStart(2, '0');
        return month + '月' + day + '日 ' + hours + ':' + minutes;
      }

      function isTaskRunning(t) {
        if (t.archived) return false;
        if (t.status === 'running') return true;
        if (sending.value && currentTaskId.value === t.id) return true;
        return false;
      }

      function taskStatusTip(t) {
        return isTaskRunning(t) ? '运行中' : '已就绪';
      }

      function handleTaskMenu(command, task) {
        var ev = { stopPropagation: function () {} };
        if (command === 'edit') editTask(task, ev);
        else if (command === 'archive') archiveTaskItem(task, ev);
        else if (command === 'unarchive') unarchiveTaskItem(task, ev);
        else if (command === 'delete') deleteTaskItem(task, ev);
      }

      function loadExpert() {
        expert.value = store.getExpert(props.expertId);
        refreshTasks();
        if (currentTaskId.value) {
          loadMessages();
        } else if (tasks.value.length) {
          selectTask(tasks.value[0].id);
        }
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
      }

      function newTask() {
        var t = store.createTask({ expertId: props.expertId, title: '新任务', type: 'dialogue' });
        refreshTasks();
        selectTask(t.id);
      }

      function send() {
        var text = inputText.value.trim();
        var attachments = chatFiles.takePendingFiles();
        if ((!text && !attachments.length) || !currentTaskId.value) return;
        sending.value = true;
        store.updateTask(currentTaskId.value, { status: 'running' });
        store.addMessage(currentTaskId.value, {
          role: 'user',
          content: text || (attachments.length ? '发送了 ' + attachments.length + ' 个文件' : ''),
          attachments: attachments.length ? attachments : null
        });
        inputText.value = '';
        loadMessages();
        refreshTasks();
        setTimeout(function () {
          store.mockExpertWorkflowSteps(expert.value, currentTaskId.value, text);
          loadMessages();
          setTimeout(function () {
            var reply = store.mockExpertReply(expert.value, text);
            store.addMessage(currentTaskId.value, {
              role: 'expert', type: 'chat', expertId: expert.value.id, content: reply
            });
            store.mockTaskArtifact(expert.value, currentTaskId.value, text);
            store.updateTask(currentTaskId.value, { status: 'pending' });
            loadMessages();
            refreshTasks();
            if (artifactPanelTaskId.value === currentTaskId.value) loadPanelArtifacts(currentTaskId.value);
            sending.value = false;
          }, 700);
        }, 500);
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
          if (artifactPanelTaskId.value === task.id) closeArtifactPanel();
          store.deleteTask(task.id);
          refreshTasks();
          if (wasCurrent) {
            if (tasks.value.length) selectTask(tasks.value[0].id);
            else {
              currentTaskId.value = null;
              ctx.emit('nav', '/experts/' + props.expertId + '/tasks');
              messages.value = [];
            }
          }
          ElementPlus.ElMessage.success('任务已删除');
        }).catch(function () {});
      }

      function archiveTaskItem(task, ev) {
        ev.stopPropagation();
        store.archiveTask(task.id, true);
        refreshTasks();
        if (artifactPanelTaskId.value === task.id) closeArtifactPanel();
        if (currentTaskId.value === task.id) {
          if (tasks.value.length) selectTask(tasks.value[0].id);
          else {
            currentTaskId.value = null;
            ctx.emit('nav', '/experts/' + props.expertId + '/tasks');
            messages.value = [];
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
      });
      Vue.onMounted(loadExpert);

      return {
        expert: expert, tasks: tasks, archivedTasks: archivedTasks, showArchived: showArchived,
        currentTaskId: currentTaskId, messages: messages,
        inputText: inputText, sending: sending, chatBox: chatBox,
        panelArtifacts: panelArtifacts, artifactPanelTaskId: artifactPanelTaskId,
        pendingFiles: chatFiles.pendingFiles, fileInputRef: chatFiles.fileInputRef,
        triggerFileUpload: chatFiles.triggerFileUpload, handleFileSelect: chatFiles.handleFileSelect,
        removePendingFile: chatFiles.removePendingFile, formatFileSize: chatFiles.formatFileSize,
        statusLabel: catalog.TASK_STATUS_LABEL, artifactTypeLabel: artifactTypeLabel,
        formatTaskCreatedAt: formatTaskCreatedAt, isTaskRunning: isTaskRunning, taskStatusTip: taskStatusTip,
        getTaskArtifactCount: getTaskArtifactCount, artifactTypeClass: artifactTypeClass,
        artifactPanelTaskTitle: artifactPanelTaskTitle,
        selectTask: selectTask, newTask: newTask, send: send,
        editTask: editTask, deleteTaskItem: deleteTaskItem, archiveTaskItem: archiveTaskItem, unarchiveTaskItem: unarchiveTaskItem,
        toggleTaskArtifacts: toggleTaskArtifacts, closeArtifactPanel: closeArtifactPanel, handleTaskMenu: handleTaskMenu
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
          </div>\
        </div>\
        <div class="task-body">\
        <div class="chat-main">\
          <div class="chat-messages" ref="chatBox">\
            <div v-if="!currentTaskId" style="text-align:center;color:#999;padding:40px">请选择任务</div>\
            <template v-else>\
              <template v-for="m in messages" :key="m.id">\
                <details v-if="m.type === \'thought\'" class="log-thought-block">\
                  <summary>思考过程 · {{ expert.name }}</summary>\
                  <div class="log-thought-content">{{ m.content }}</div>\
                </details>\
                <div v-else-if="m.type === \'skill\'" class="log-skill-card">\
                  <div class="log-skill-icon">🧩</div>\
                  <div class="log-action-body">\
                    <div class="log-skill-title">{{ expert.name }} 正在使用技能</div>\
                    <div class="log-skill-name" v-if="m.skillName">[{{ m.skillName }}]</div>\
                    <div class="log-action-desc">{{ m.content }}</div>\
                  </div>\
                </div>\
                <div v-else-if="m.type === \'action\'" class="log-action-card">\
                  <div class="log-action-icon">⚡</div>\
                  <div class="log-action-body">\
                    <div class="log-action-title">{{ expert.name }} 正在调用工具</div>\
                    <div class="log-action-tool" v-if="m.toolName">[{{ m.toolName }}]</div>\
                    <div class="log-action-desc">{{ m.content }}</div>\
                  </div>\
                </div>\
                <div v-else class="msg-row" :class="m.role">\
                  <template v-if="m.role === \'expert\'">\
                    <div class="msg-col">\
                      <div class="msg-header">\
                        <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                        <span class="msg-sender">{{ expert.name }}</span>\
                      </div>\
                      <div class="msg-bubble">\
                        <div v-if="m.content" class="msg-text">{{ m.content }}</div>\
                        <div v-if="m.attachments && m.attachments.length" class="msg-attachments">\
                          <div v-for="att in m.attachments" :key="att.id" class="msg-attachment-chip">\
                            <span class="msg-attachment-icon">📎</span>\
                            <span class="msg-attachment-name">{{ att.name }}</span>\
                          </div>\
                        </div>\
                      </div>\
                    </div>\
                  </template>\
                  <div v-else class="msg-bubble">\
                    <div v-if="m.content" class="msg-text">{{ m.content }}</div>\
                    <div v-if="m.attachments && m.attachments.length" class="msg-attachments">\
                      <div v-for="att in m.attachments" :key="att.id" class="msg-attachment-chip">\
                        <span class="msg-attachment-icon">📎</span>\
                        <span class="msg-attachment-name">{{ att.name }}</span>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </template>\
            </template>\
          </div>\
          <div class="chat-input">\
            <div class="chat-composer">\
              <div v-if="pendingFiles.length" class="chat-pending-files">\
                <div v-for="f in pendingFiles" :key="f.id" class="chat-pending-file">\
                  <span class="chat-pending-file-icon">📄</span>\
                  <span class="chat-pending-file-name">{{ f.name }}</span>\
                  <span class="chat-pending-file-size">{{ formatFileSize(f.size) }}</span>\
                  <button type="button" class="chat-pending-file-remove" @click="removePendingFile(f.id)" title="移除">×</button>\
                </div>\
              </div>\
              <div class="chat-composer-main">\
                <el-input\
                  v-model="inputText"\
                  type="textarea"\
                  :rows="2"\
                  :autosize="{ minRows: 2, maxRows: 5 }"\
                  placeholder="向专家下发任务指令…"\
                  class="chat-composer-textarea"\
                  @keydown.ctrl.enter="send" />\
                <div class="chat-composer-actions">\
                  <input ref="fileInputRef" type="file" multiple class="chat-file-input-hidden" @change="handleFileSelect" />\
                  <button type="button" class="chat-upload-btn" :disabled="!currentTaskId" @click="triggerFileUpload" title="上传文件">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\
                  </button>\
                  <button type="button" class="chat-send-btn" :class="{ loading: sending }" :disabled="!currentTaskId || sending" @click="send" title="发送 (Ctrl+Enter)">\
                    <svg v-if="!sending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\
                    <span v-else class="chat-send-spinner"></span>\
                  </button>\
                </div>\
              </div>\
              <div class="chat-composer-hint">Ctrl + Enter 发送</div>\
            </div>\
          </div>\
        </div>\
        <aside class="task-right-panel">\
          <div class="task-right-panel-inner">\
            <div class="task-right-panel-head">\
              <h4 class="task-right-panel-title">\
                <span class="task-panel-title-icon">\
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>\
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>\
                  </svg>\
                </span>\
                任务列表\
              </h4>\
            </div>\
            <div class="task-list">\
              <task-list-item\
                v-for="t in tasks"\
                :key="t.id"\
                :task="t"\
                :active="currentTaskId === t.id"\
                :artifact-open="artifactPanelTaskId === t.id"\
                :is-running="isTaskRunning(t)"\
                :status-tip="taskStatusTip(t)"\
                :created-at-label="formatTaskCreatedAt(t.createdAt)"\
                :artifact-count="getTaskArtifactCount(t.id)"\
                @select="selectTask(t.id)"\
                @toggle-artifacts="toggleTaskArtifacts(t, $event)"\
                @menu="handleTaskMenu($event, t)" />\
              <div v-if="tasks.length === 0 && archivedTasks.length === 0" class="task-list-empty">\
                <div class="task-list-empty-icon">📋</div>\
                <p>暂无任务</p>\
                <span>点击上方「新建任务」开始</span>\
              </div>\
              <div v-if="archivedTasks.length" class="task-archived-section">\
                <button type="button" class="task-archived-toggle" @click="showArchived = !showArchived">\
                  <span class="task-archived-toggle-label">\
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                      <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>\
                    </svg>\
                    已归档\
                  </span>\
                  <span class="task-archived-count">{{ archivedTasks.length }}</span>\
                  <span class="task-archived-chevron">{{ showArchived ? \'▾\' : \'▸\' }}</span>\
                </button>\
                <div v-if="showArchived" class="task-archived-list">\
                  <task-list-item\
                    v-for="t in archivedTasks"\
                    :key="t.id"\
                    :task="t"\
                    :archived="true"\
                    :active="currentTaskId === t.id"\
                    :artifact-open="artifactPanelTaskId === t.id"\
                    :is-running="isTaskRunning(t)"\
                    :status-tip="taskStatusTip(t)"\
                    :created-at-label="formatTaskCreatedAt(t.createdAt)"\
                    :artifact-count="getTaskArtifactCount(t.id)"\
                    @select="selectTask(t.id)"\
                    @toggle-artifacts="toggleTaskArtifacts(t, $event)"\
                    @menu="handleTaskMenu($event, t)" />\
                </div>\
              </div>\
            </div>\
          </div>\
        </aside>\
        <aside v-show="artifactPanelTaskId" class="task-artifacts-panel">\
          <div class="task-artifacts-panel-inner">\
            <div class="task-artifacts-panel-head task-right-panel-head task-artifacts-panel-head--stacked">\
              <div class="task-artifacts-panel-head-inner">\
                <span class="task-panel-title-icon">\
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
                    <polyline points="14 2 14 8 20 8"/>\
                  </svg>\
                </span>\
                <div class="task-artifacts-panel-head-body">\
                  <div class="task-artifacts-panel-title-line">任务产物</div>\
                  <div class="task-artifacts-panel-subline">\
                    <span class="task-artifacts-panel-subtitle">{{ artifactPanelTaskTitle() }}</span>\
                    <span class="task-artifacts-panel-meta-item">共 {{ panelArtifacts.length }} 项</span>\
                  </div>\
                </div>\
                <button type="button" class="task-artifacts-panel-close" title="关闭" @click="closeArtifactPanel">\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>\
                  </svg>\
                </button>\
              </div>\
            </div>\
            <div class="task-artifacts-panel-scroll">\
              <div v-for="a in panelArtifacts" :key="a.id" class="artifact-item" :class="artifactTypeClass(a.type)">\
                <div class="artifact-item-top">\
                  <span class="artifact-type-icon">\
                    <svg v-if="a.type === \'report\'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>\
                    </svg>\
                    <svg v-else-if="a.type === \'data\'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>\
                    </svg>\
                    <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>\
                    </svg>\
                  </span>\
                  <div class="artifact-item-head">\
                    <span class="artifact-title">{{ a.title }}</span>\
                    <el-tag size="small" type="info" effect="plain">{{ artifactTypeLabel[a.type] || a.type }}</el-tag>\
                  </div>\
                </div>\
                <p class="artifact-content">{{ a.content }}</p>\
                <div class="artifact-time">\
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">\
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>\
                  </svg>\
                  {{ formatTaskCreatedAt(a.createdAt) }}\
                </div>\
              </div>\
              <div v-if="panelArtifacts.length === 0" class="task-artifacts-empty">\
                <div class="task-artifacts-empty-icon">📄</div>\
                <p>暂无任务产物</p>\
                <span>完成任务对话后将自动生成</span>\
              </div>\
            </div>\
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
      var chatFiles = createChatFileUpload();
      var showAddMemberDialog = Vue.ref(false);
      var materialFileInput = Vue.ref(null);
      var MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
      var addMemberExpertIds = Vue.ref([]);
      var addMemberSearchQuery = Vue.ref('');
      var previewItem = Vue.ref(null);
      var previewVisible = Vue.ref(false);
      var selectedProjectTaskId = Vue.ref(null);

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

      function selectChatTarget(target, keepTaskSelection) {
        chatTarget.value = target;
        if (!keepTaskSelection) selectedProjectTaskId.value = null;
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function selectProjectTask(task) {
        if (!task.expertId) {
          ElementPlus.ElMessage.info('该任务尚未分配专家');
          return;
        }
        selectedProjectTaskId.value = task.id;
        selectChatTarget(task.expertId, true);
      }

      function isChatTargetActive(target) {
        return chatTarget.value === target;
      }

      function expertName(expertId) {
        var e = store.getExpert(expertId);
        return e ? e.name : '专家';
      }

      function expertAvatar(expertId) {
        var e = store.getExpert(expertId);
        return e ? e.avatar : '';
      }

      function send() {
        var text = inputText.value.trim();
        var attachments = chatFiles.takePendingFiles();
        if (!text && !attachments.length) return;
        if (!chatTarget.value) return;
        var content = text || (attachments.length ? '发送了 ' + attachments.length + ' 个文件' : '');
        var msgBase = { type: 'chat', taskId: null, attachments: attachments.length ? attachments : null };
        if (chatTarget.value === 'group') {
          store.addProjectMessage(props.projectId, Object.assign({}, msgBase, {
            role: 'user', content: content, expertId: null, scope: 'group'
          }));
          store.addProjectMessage(props.projectId, {
            role: 'system', type: 'chat', taskId: null,
            content: '指令已发送至项目组，各位专家将协同跟进。'
          });
        } else if (chatTarget.value) {
          var targetExpert = chatTarget.value;
          store.addProjectMessage(props.projectId, Object.assign({}, msgBase, {
            role: 'user', content: content, expertId: null, targetExpertId: targetExpert
          }));
          store.addProjectMessage(props.projectId, {
            role: 'expert', type: 'chat',
            content: '收到，我来处理：「' + (text || '附件') + '」',
            taskId: null, expertId: targetExpert
          });
        }
        inputText.value = '';
        messages.value = store.getProjectMessages(props.projectId);
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      var addableExperts = Vue.computed(function () {
        var memberIds = members.value.map(function (m) { return m.expertId; });
        return allExperts.value.filter(function (e) { return memberIds.indexOf(e.id) === -1; });
      });

      var filteredAddableExperts = Vue.computed(function () {
        var query = addMemberSearchQuery.value.trim();
        if (!query) return addableExperts.value;
        return addableExperts.value.filter(function (e) { return expertMatchesSearch(e, query); });
      });

      function resetAddMemberDialog() {
        addMemberExpertIds.value = [];
        addMemberSearchQuery.value = '';
      }

      function openAddMemberDialog() {
        allExperts.value = store.getExperts();
        resetAddMemberDialog();
        showAddMemberDialog.value = true;
      }

      function closeAddMemberDialog() {
        showAddMemberDialog.value = false;
        resetAddMemberDialog();
      }

      function isAddMemberSelected(expertId) {
        return addMemberExpertIds.value.indexOf(expertId) !== -1;
      }

      function toggleAddMember(expertId) {
        var ids = addMemberExpertIds.value.slice();
        var idx = ids.indexOf(expertId);
        if (idx === -1) ids.push(expertId);
        else ids.splice(idx, 1);
        addMemberExpertIds.value = ids;
      }

      function submitAddMembers() {
        if (!addMemberExpertIds.value.length) {
          ElementPlus.ElMessage.warning('请至少选择一位专家');
          return;
        }
        var count = addMemberExpertIds.value.length;
        addMemberExpertIds.value.forEach(function (eid) {
          store.addProjectMember(props.projectId, eid);
        });
        closeAddMemberDialog();
        load();
        ElementPlus.ElMessage.success('已添加 ' + count + ' 位专家');
      }

      function removeMember(memberId) {
        store.removeProjectMember(memberId);
        load();
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
        queue.forEach(function (file) {
          readUploadedFileContent(file, function (content) {
            store.addProjectFile({
              projectId: props.projectId,
              name: file.name,
              type: inferProjectFileType(file.name),
              content: content
            });
            done += 1;
            if (done === queue.length) {
              load();
              ElementPlus.ElMessage.success('已上传 ' + queue.length + ' 个文件');
            }
          });
        });
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

      function getMemberTaskStats(expertId) {
        var tasks = projectTasks.value.filter(function (t) { return t.expertId === expertId; });
        return {
          done: tasks.filter(function (t) { return t.status === 'done'; }).length,
          total: tasks.length
        };
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
        chatBox: chatBox,
        showAddMemberDialog: showAddMemberDialog,
        materialFileInput: materialFileInput,
        addMemberExpertIds: addMemberExpertIds,
        addMemberSearchQuery: addMemberSearchQuery,
        filteredAddableExperts: filteredAddableExperts,
        addableExperts: addableExperts,
        pendingFiles: chatFiles.pendingFiles, fileInputRef: chatFiles.fileInputRef,
        triggerFileUpload: chatFiles.triggerFileUpload, handleFileSelect: chatFiles.handleFileSelect,
        removePendingFile: chatFiles.removePendingFile, formatFileSize: chatFiles.formatFileSize,
        previewItem: previewItem, previewVisible: previewVisible,
        taskStatusLabel: taskStatusLabel, taskDisplayTitle: taskDisplayTitle,
        isTaskDone: isTaskDone,
        selectChatTarget: selectChatTarget,
        selectProjectTask: selectProjectTask,
        selectedProjectTaskId: selectedProjectTaskId,
        isChatTargetActive: isChatTargetActive, expertName: expertName, expertAvatar: expertAvatar,
        send: send, openAddMemberDialog: openAddMemberDialog, closeAddMemberDialog: closeAddMemberDialog,
        isAddMemberSelected: isAddMemberSelected, toggleAddMember: toggleAddMember,
        submitAddMembers: submitAddMembers, resetAddMemberDialog: resetAddMemberDialog,
        openMaterialUpload: openMaterialUpload,
        handleMaterialFileSelect: handleMaterialFileSelect,
        removeMember: removeMember,
        openPreview: openPreview, fileTypeIcon: fileTypeIcon, getMemberTaskStats: getMemberTaskStats,
        toggleSidebarPanel: toggleSidebarPanel
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
                  <span class="task-todo-summary-label">任务清单</span>\
                  <span class="task-todo-summary-count">{{ todoStats.done }}/{{ todoStats.total }} 已完成</span>\
                </div>\
                <div class="task-todo-progress-track">\
                  <div class="task-todo-progress-fill" :style="{ width: todoStats.percent + \'%\' }"></div>\
                </div>\
              </div>\
              <div class="project-kanban-scroll project-kanban-scroll-todo">\
                <div v-if="projectTasks.length === 0" class="project-task-flow-empty">暂无任务</div>\
                <ul v-else class="task-todo-list">\
                  <li\
                    v-for="t in projectTasks"\
                    :key="\'todo-\' + t.id"\
                    class="task-todo-item"\
                    :class="{ \'is-done\': isTaskDone(t), \'is-active\': selectedProjectTaskId === t.id, [\'status-\' + t.status]: true }"\
                    @click="selectProjectTask(t)">\
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
                      <template v-if="msg.role === \'expert\'">\
                        <div class="msg-col">\
                          <div class="msg-header">\
                            <img class="msg-avatar" :src="expertAvatar(msg.expertId)" :alt="expertName(msg.expertId)" />\
                            <span class="msg-sender">{{ expertName(msg.expertId) }}</span>\
                          </div>\
                          <div class="msg-bubble">\
                            <div v-if="msg.content" class="msg-text">{{ msg.content }}</div>\
                            <div v-if="msg.attachments && msg.attachments.length" class="msg-attachments">\
                              <div v-for="att in msg.attachments" :key="att.id" class="msg-attachment-chip">\
                                <span class="msg-attachment-icon">📎</span>\
                                <span class="msg-attachment-name">{{ att.name }}</span>\
                              </div>\
                            </div>\
                          </div>\
                        </div>\
                      </template>\
                      <div v-else class="msg-bubble">\
                        <div v-if="msg.content" class="msg-text">{{ msg.content }}</div>\
                        <div v-if="msg.attachments && msg.attachments.length" class="msg-attachments">\
                          <div v-for="att in msg.attachments" :key="att.id" class="msg-attachment-chip">\
                            <span class="msg-attachment-icon">📎</span>\
                            <span class="msg-attachment-name">{{ att.name }}</span>\
                          </div>\
                        </div>\
                      </div>\
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
                  <div class="chat-composer">\
                    <div v-if="pendingFiles.length" class="chat-pending-files">\
                      <div v-for="f in pendingFiles" :key="f.id" class="chat-pending-file">\
                        <span class="chat-pending-file-icon">📄</span>\
                        <span class="chat-pending-file-name">{{ f.name }}</span>\
                        <span class="chat-pending-file-size">{{ formatFileSize(f.size) }}</span>\
                        <button type="button" class="chat-pending-file-remove" @click="removePendingFile(f.id)" title="移除">×</button>\
                      </div>\
                    </div>\
                    <div class="chat-composer-main">\
                      <el-input\
                        v-model="inputText"\
                        type="textarea"\
                        :rows="2"\
                        :autosize="{ minRows: 2, maxRows: 5 }"\
                        :placeholder="chatPlaceholder"\
                        class="chat-composer-textarea"\
                        @keydown.ctrl.enter="send" />\
                      <div class="chat-composer-actions">\
                        <input ref="fileInputRef" type="file" multiple class="chat-file-input-hidden" @change="handleFileSelect" />\
                        <button type="button" class="chat-upload-btn" :disabled="!chatTarget" @click="triggerFileUpload" title="上传文件">\
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\
                        </button>\
                        <button type="button" class="chat-send-btn" :disabled="!chatTarget" @click="send" title="发送 (Ctrl+Enter)">\
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\
                        </button>\
                      </div>\
                    </div>\
                    <div class="chat-composer-hint">Ctrl + Enter 发送</div>\
                  </div>\
                </div>\
              </div>\
            </section>\
            <aside class="project-workspace-panel project-sidebar-panel" v-show="sidebarPanel" :class="sidebarPanel === \'members\' ? \'project-sidebar-members\' : \'project-sidebar-workspace\'">\
              <div class="project-sidebar-head project-panel-head">\
                <div v-if="sidebarPanel === \'members\'" class="project-sidebar-head-inner">\
                  <span class="project-sidebar-head-icon project-sidebar-head-icon-members">\
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\
                  </span>\
                  <span class="project-sidebar-head-title">项目成员</span>\
                  <span class="project-panel-sub">· {{ members.length }} 位专家</span>\
                </div>\
                <div v-else class="project-sidebar-head-inner">\
                  <span class="project-sidebar-head-icon project-sidebar-head-icon-workspace">\
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
                  </span>\
                  <span class="project-sidebar-head-title">工作空间</span>\
                  <span class="project-panel-sub">· {{ projectFiles.length }} 份资料 · {{ outputs.length }} 个产物</span>\
                </div>\
              </div>\
              <div v-if="sidebarPanel === \'members\'" class="project-workspace-area project-members-area">\
                <div class="project-workspace-scroll">\
                  <button type="button" class="sidebar-add-member-btn" @click="openAddMemberDialog">\
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>\
                    添加成员\
                  </button>\
                  <div v-for="row in members" :key="row.id" class="sidebar-member-card">\
                    <div class="sidebar-member-avatar-wrap">\
                      <img :src="row.expert.avatar" :alt="row.expert.name">\
                    </div>\
                    <div class="sidebar-member-info">\
                      <div class="sidebar-member-name-row">\
                        <span class="sidebar-member-name">{{ row.expert.name }}</span>\
                        <span class="sidebar-member-task-stat">{{ getMemberTaskStats(row.expertId).done }}/{{ getMemberTaskStats(row.expertId).total }}</span>\
                      </div>\
                      <p class="sidebar-member-desc">{{ row.expert.description || \'暂无介绍\' }}</p>\
                    </div>\
                    <button type="button" class="sidebar-member-remove" title="移除成员" @click="removeMember(row.id)">\
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>\
                    </button>\
                  </div>\
                  <div v-if="members.length === 0" class="sidebar-empty-state">\
                    <div class="sidebar-empty-icon">👥</div>\
                    <p>暂无项目成员</p>\
                    <span>点击上方按钮邀请专家加入</span>\
                  </div>\
                </div>\
              </div>\
              <div v-else-if="sidebarPanel === \'workspace\'" class="project-workspace-area project-workspace-main">\
                <el-tabs v-model="workspaceTab" class="project-workspace-tabs">\
                  <el-tab-pane name="materials">\
                    <template #label>\
                      <span class="project-workspace-tab-label">\
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\
                        项目资料\
                        <em v-if="projectFiles.length" class="project-workspace-tab-count">{{ projectFiles.length }}</em>\
                      </span>\
                    </template>\
                    <div class="project-workspace-scroll">\
                      <input ref="materialFileInput" type="file" multiple class="material-file-input-hidden" @change="handleMaterialFileSelect">\
                      <button type="button" class="sidebar-add-material-btn" @click="openMaterialUpload">\
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>\
                        上传资料\
                      </button>\
                      <div\
                        v-for="f in projectFiles"\
                        :key="f.id"\
                        class="workspace-file-item"\
                        @click="openPreview(f)">\
                        <div class="workspace-file-icon-wrap" :class="\'type-\' + (f.type || \'document\')">\
                          <span class="workspace-file-icon">{{ fileTypeIcon(f.type) }}</span>\
                        </div>\
                        <div class="workspace-file-info">\
                          <div class="workspace-file-name">{{ f.name }}</div>\
                          <div class="workspace-file-meta">{{ f.updatedAt }}</div>\
                        </div>\
                        <span v-if="f.status === \'updating\'" class="workspace-file-badge">更新中</span>\
                        <svg class="workspace-file-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>\
                      </div>\
                      <div v-if="projectFiles.length === 0" class="sidebar-empty-state sidebar-empty-state-compact">\
                        <div class="sidebar-empty-icon">📄</div>\
                        <p>暂无项目资料</p>\
                        <span>点击上方按钮上传本地文件</span>\
                      </div>\
                    </div>\
                  </el-tab-pane>\
                  <el-tab-pane name="outputs">\
                    <template #label>\
                      <span class="project-workspace-tab-label">\
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>\
                        项目产物\
                        <em v-if="outputs.length" class="project-workspace-tab-count">{{ outputs.length }}</em>\
                      </span>\
                    </template>\
                    <div class="project-workspace-scroll">\
                      <div class="sidebar-output-list-head" v-if="outputs.length">已产出 {{ outputs.length }} 项</div>\
                      <div\
                        v-for="o in outputs"\
                        :key="o.id"\
                        class="workspace-file-item artifact-output-item"\
                        @click="openPreview(o)">\
                        <div class="workspace-file-icon-wrap type-output">\
                          <span class="workspace-file-icon">📦</span>\
                        </div>\
                        <div class="workspace-file-info">\
                          <div class="workspace-file-name">{{ o.title }}</div>\
                          <div class="workspace-file-meta">{{ o.createdAt }}</div>\
                        </div>\
                        <svg class="workspace-file-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>\
                      </div>\
                      <div v-if="outputs.length === 0" class="sidebar-empty-state sidebar-empty-state-compact">\
                        <div class="sidebar-empty-icon">📦</div>\
                        <p>暂无项目产物</p>\
                        <span>产物将由专家任务产出后展示</span>\
                      </div>\
                    </div>\
                  </el-tab-pane>\
                </el-tabs>\
              </div>\
            </aside>\
        </div>\
        <el-dialog v-model="showAddMemberDialog" width="640px" class="form-dialog form-dialog-project form-dialog-add-member" :close-on-click-modal="false" append-to-body @closed="resetAddMemberDialog">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-project">\
              <div class="dialog-header-icon dialog-header-icon-project">👥</div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">添加项目成员</div>\
                <div class="dialog-header-sub">搜索并选择专家加入项目</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="wizard-step-content wizard-step-members">\
              <div class="member-picker-head">\
                <div class="member-picker-search">\
                  <svg class="member-picker-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>\
                  <el-input v-model="addMemberSearchQuery" placeholder="搜索专家名称、介绍或擅长领域" clearable />\
                </div>\
                <span class="member-picker-count">{{ addMemberExpertIds.length }} 人已选</span>\
              </div>\
              <div v-if="filteredAddableExperts.length" class="member-picker-grid member-picker-grid-dialog">\
                <button\
                  v-for="e in filteredAddableExperts"\
                  :key="e.id"\
                  type="button"\
                  class="member-picker-card"\
                  :class="{ \'member-picker-card-selected\': isAddMemberSelected(e.id) }"\
                  @click="toggleAddMember(e.id)">\
                  <img :src="e.avatar" :alt="e.name" class="member-picker-avatar">\
                  <div class="member-picker-info">\
                    <span class="member-picker-name">{{ e.name }}</span>\
                    <span class="member-picker-desc-text">{{ e.description || \'暂无介绍\' }}</span>\
                    <div v-if="e.expertise && e.expertise.length" class="member-picker-tags">\
                      <span v-for="(tag, idx) in e.expertise.slice(0, 2)" :key="tag" class="member-picker-tag">{{ tag }}</span>\
                    </div>\
                  </div>\
                  <span class="member-picker-check" :class="{ \'member-picker-check-on\': isAddMemberSelected(e.id) }">\
                    <svg v-if="isAddMemberSelected(e.id)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>\
                  </span>\
                </button>\
              </div>\
              <div v-else class="member-picker-empty">\
                <div class="member-picker-empty-icon">{{ addableExperts.length ? \'🔍\' : \'👤\' }}</div>\
                <p>{{ addableExperts.length ? \'未找到匹配的专家\' : \'所有专家已加入项目\' }}</p>\
                <span>{{ addableExperts.length ? \'试试其他关键词\' : \'暂无可添加的专家\' }}</span>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="closeAddMemberDialog">取消</el-button>\
                <el-button class="wizard-btn wizard-btn-submit wizard-btn-submit-project" @click="submitAddMembers">确认添加</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
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
