(function () {
  var store = window.AppStore;
  var catalog = window;
  var readImageFile = window.readImageFile;
  var parseRoute = window.AppShared.parseRoute;
  var nav = window.AppShared.nav;
  var expertMatchesSearch = window.AppShared.expertMatchesSearch;
  var PROJECT_ICON_PRESETS = window.AppShared.PROJECT_ICON_PRESETS;
  var isProjectIconImage = window.AppShared.isProjectIconImage;

  var LIST_PAGE_TEMPLATE = [
    '<div class="main-scroll list-page">',
    '  <div class="page-header-row">',
    '    <div class="page-header-text">',
    '      <h1 class="page-title">专家</h1>',
    '      <p class="page-subtitle">共 {{ experts.length }} 位智能体专家 · 发起任务或管理专家配置</p>',
    '    </div>',
    '    <create-action-btn label="新建专家" theme="expert" @click="openCreateDialog" />',
    '  </div>',
    '  <div class="expert-grid">',
    '    <div v-for="expert in experts" :key="expert.id" class="expert-card">',
    '      <div class="expert-card-accent"></div>',
    '      <el-dropdown trigger="click" @command="handleExpertMenu($event, expert)">',
    '        <button class="card-more-btn" title="更多操作" @click.stop>',
    '          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    '        </button>',
    '        <template #dropdown>',
    '          <el-dropdown-menu>',
    '            <el-dropdown-item command="edit">编辑</el-dropdown-item>',
    '            <el-dropdown-item command="delete" divided>删除</el-dropdown-item>',
    '          </el-dropdown-menu>',
    '        </template>',
    '      </el-dropdown>',
    '      <div class="expert-card-body" @click="goManage(expert)">',
    '        <div class="card-header">',
    '          <img class="card-avatar" :src="expert.avatar" :alt="expert.name">',
    '          <div class="card-header-text">',
    '            <div class="card-name">',
    '              {{ expert.name }}',
    '              <span v-if="runningCounts[expert.id]" class="expert-card-running-indicator" @click.stop="goStartTask(expert)">',
    '                <span class="expert-card-running-dot"></span>',
    '                {{ runningCounts[expert.id] }} 个运行中',
    '              </span>',
    '            </div>',
    '          </div>',
    '        </div>',
    '        <p class="card-desc">{{ expert.description }}</p>',
    '        <div class="card-footer">',
    '          <div class="card-tags">',
    '            <span v-for="(tag, idx) in expert.expertise.slice(0, 3)" :key="tag" class="expertise-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>',
    '          </div>',
    '        </div>',
    '      </div>',
    '      <div class="expert-card-actions">',
    '        <button type="button" class="expert-card-action expert-card-action-primary" @click="goStartTask(expert)">',
    '          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    '          发起任务',
    '        </button>',
    '      </div>',
    '    </div>',
    '    <div v-if="experts.length === 0" class="empty-state">',
    '      <div class="empty-state-icon">👤</div>',
    '      <p>暂无专家</p>',
    '      <create-action-btn label="创建第一位专家" theme="expert" soft @click="openCreateDialog" />',
    '    </div>',
    '  </div>',
    '  <expert-create-page-dialog :wizard="createWizard" :tag-colors="tagColors" :skills="skills" :tools="tools" />',
    '  <expert-edit-page-dialog :edit="expertEdit" header-title="编辑专家" :tag-colors="tagColors" />',
    '  <el-dialog v-model="deleteDialog.visible" width="560px" class="form-dialog delete-expert-dialog" :close-on-click-modal="false" append-to-body>',
    '    <template #header>',
    '      <div class="dialog-header-custom">',
    '        <div class="dialog-header-title">删除专家</div>',
    '      </div>',
    '    </template>',
    '    <div class="delete-expert-warning" v-if="deleteDialog.expert">',
    '      <span class="delete-expert-warning-icon">⚠</span>',
    '      <div class="delete-expert-warning-text">',
    '        即将删除专家「<strong>{{ deleteDialog.expert.name }}</strong>」，此操作不可恢复。<br>',
    '        所有专家配置、人设、技能、工具绑定将被永久清除。',
    '        <div v-if="deleteDialog.runningCount > 0" class="delete-expert-running-warn">',
    '          该专家当前有 {{ deleteDialog.runningCount }} 个运行中会话，强制删除可能导致这些会话异常。',
    '        </div>',
    '      </div>',
    '    </div>',
    '    <label class="delete-expert-input-label" v-if="deleteDialog.expert">请输入专家名称「{{ deleteDialog.expert.name }}」以确认</label>',
    '    <el-input v-model="deleteDialog.inputName" placeholder="输入专家名称" v-if="deleteDialog.expert" />',
    '    <template #footer>',
    '      <div class="dialog-footer-custom">',
    '        <el-button @click="deleteDialog.visible = false">取消</el-button>',
    '        <el-button type="danger" :disabled="!canConfirmDelete()" @click="confirmDelete">{{ deleteButtonText() }}</el-button>',
    '      </div>',
    '    </template>',
    '  </el-dialog>',
    '</div>'
  ].join('\n');

  var ExpertCenterPage = {
    props: ['openCreate'],
    emits: ['nav', 'refresh'],
    setup: function (props, ctx) {
      var experts = Vue.ref([]);
      var runningCounts = Vue.ref({});
      var expertEdit = createExpertEditForm(store, { onSaved: function () { load(); } });
      var createWizard = createExpertCreateForm(store, {
        onCreated: function (expert) {
          load();
          ctx.emit('nav', '/experts/' + expert.id + '?tab=persona');
        }
      });

      function load() {
        experts.value = store.getExperts();
        var counts = {};
        experts.value.forEach(function (e) {
          counts[e.id] = store.getRunningSessionCount(e.id);
        });
        runningCounts.value = counts;
      }

      function goStartTask(expert) {
        var task = store.createTask({ expertId: expert.id, title: '新任务', type: 'dialogue' });
        ctx.emit('nav', '/experts/' + expert.id + '/tasks/' + task.id);
      }
      function goManage(expert) { ctx.emit('nav', '/experts/' + expert.id + '?tab=persona'); }

      var deleteDialog = Vue.ref({ visible: false, expert: null, inputName: '', runningCount: 0 });

      function openDeleteDialog(expert) {
        deleteDialog.value = {
          visible: true,
          expert: expert,
          inputName: '',
          runningCount: store.getRunningSessionCount(expert.id)
        };
      }

      function canConfirmDelete() {
        var d = deleteDialog.value;
        return d.expert && d.inputName.trim() === d.expert.name;
      }

      function confirmDelete() {
        var d = deleteDialog.value;
        if (!canConfirmDelete()) return;
        store.deleteExpert(d.expert.id);
        deleteDialog.value = { visible: false, expert: null, inputName: '', runningCount: 0 };
        load();
        ElementPlus.ElMessage.success('专家已删除');
      }

      function deleteButtonText() {
        return deleteDialog.value.runningCount > 0 ? '强制删除' : '删除';
      }

      function handleExpertMenu(command, expert) {
        if (command === 'edit') expertEdit.openEdit(expert);
        else if (command === 'delete') openDeleteDialog(expert);
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
        runningCounts: runningCounts,
        tagColors: catalog.TAG_COLORS,
        skills: catalog.SKILLS_CATALOG,
        tools: catalog.TOOLS_CATALOG,
        expertEdit: expertEdit,
        createWizard: createWizard,
        deleteDialog: deleteDialog,
        goStartTask: goStartTask,
        goManage: goManage,
        openCreateDialog: createWizard.openCreateDialog,
        handleExpertMenu: handleExpertMenu,
        openDeleteDialog: openDeleteDialog,
        canConfirmDelete: canConfirmDelete,
        confirmDelete: confirmDelete,
        deleteButtonText: deleteButtonText,
        load: load
      };
    },
    template: LIST_PAGE_TEMPLATE
  };

  // ExpertDetailPage lives in js/expert-detail-page.js


  var ProjectListPage = {
    props: ['openCreate'],
    emits: ['nav'],
    setup: function (props, ctx) {
      var projects = Vue.ref([]);
      var showCreateDialog = Vue.ref(false);
      var showEditDialog = Vue.ref(false);
      var form = Vue.ref({ name: '', description: '', workdir: '', expertIds: [], icon: '📁' });
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
        form.value = { name: '', description: '', workdir: '', expertIds: [], icon: '📁' };
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
        ctx.emit('nav', '/projects/' + encodeURIComponent(String(project.id)));
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
          defaultWorkdir: form.value.workdir.trim(),
          expertIds: form.value.expertIds
        });
        ElementPlus.ElMessage.success('项目创建成功');
        closeCreateDialog();
        ctx.emit('nav', '/projects/' + encodeURIComponent(String(p.id)));
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
                  <span class="project-progress-label">看板进度</span>\
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
                    <el-form-item label="默认工作目录">\
                      <el-input v-model="form.workdir" placeholder="如：D:\\projects\\yield-improvement" size="large" clearable />\
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
                        <span v-for="(tag, idx) in e.expertise.slice(0, 3)" :key="tag" class="member-picker-tag">{{ tag }}</span>\
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

      var sidecarStatus = Vue.ref(store.isDevMock() ? 'mock' : 'checking');
      var sidecarApiBase = Vue.ref('');

      function refreshSidecarStatus(detail) {
        if (store.isDevMock()) {
          sidecarStatus.value = 'mock';
          return;
        }
        if (detail && detail.ok) {
          sidecarStatus.value = 'ok';
          if (window.SidecarApi && window.SidecarApi.getApiBase) {
            sidecarApiBase.value = window.SidecarApi.getApiBase();
          }
          return;
        }
        sidecarStatus.value = 'offline';
        if (window.SidecarApi && window.SidecarApi.getLastError) {
          var err = window.SidecarApi.getLastError();
          if (err && err.message) sidecarApiBase.value = err.message;
        }
      }

      function onSidecarStatus(ev) {
        refreshSidecarStatus(ev && ev.detail);
      }

      Vue.onMounted(function () {
        if (store.isDevMock()) return;
        window.addEventListener('sidecar-status', onSidecarStatus);
        if (window.SidecarApi && window.SidecarApi.ensureReady) {
          window.SidecarApi.ensureReady().then(function (base) {
            refreshSidecarStatus({ ok: !!base });
          });
        } else {
          refreshSidecarStatus({ ok: false });
        }
      });

      Vue.onBeforeUnmount(function () {
        window.removeEventListener('sidecar-status', onSidecarStatus);
      });

      return {
        route: route,
        sidebarActive: sidebarActive,
        onNav: onNav,
        detailTab: detailTab,
        projectTab: projectTab,
        sidecarStatus: sidecarStatus,
        sidecarApiBase: sidecarApiBase,
        isDevMock: store.isDevMock()
      };
    },
    template: '\
      <div class="app-shell">\
        <div v-if="!isDevMock && sidecarStatus !== \'ok\' && sidecarStatus !== \'mock\'" class="sidecar-status-banner" :class="\'sidecar-status-\' + sidecarStatus">\
          <template v-if="sidecarStatus === \'checking\'">正在连接 sidecar…</template>\
          <template v-else>\
            无法连接 sidecar。请运行 start-demo.ps1，并使用 http://127.0.0.1:8086/index.html 打开（勿用 file://）。\
            <span v-if="sidecarApiBase" class="sidecar-status-detail">{{ sidecarApiBase }}</span>\
          </template>\
        </div>\
        <div class="app-body">\
        <app-sidebar :active="sidebarActive" @nav="onNav" />\
        <div class="main-area">\
          <expert-center-page v-if="route.name === \'experts\'" :open-create="route.query.create === \'1\'" @nav="onNav" />\
          <expert-detail-page v-else-if="route.name === \'expert-detail\'" :key="route.params.id" :expert-id="route.params.id" :initial-tab="detailTab" @nav="onNav" />\
          <expert-tasks-page v-else-if="route.name === \'expert-tasks\'" :expert-id="route.params.id" :task-id="route.params.taskId" @nav="onNav" />\
          <project-list-page v-else-if="route.name === \'projects\'" :open-create="route.query.create === \'1\'" @nav="onNav" />\
          <project-detail-page v-else-if="route.name === \'project-detail\'" :project-id="route.params.id" :initial-tab="projectTab" @nav="onNav" />\
        </div>\
        </div>\
      </div>'
  });

  app.component('create-action-btn', window.CreateActionBtn);
  app.component('back-link', window.BackLink);
  app.component('app-sidebar', window.AppSidebar);
  app.component('model-select', window.ModelSelect);
  app.component('expert-edit-dialog', window.ExpertEditDialog);
  app.component('expert-edit-page-dialog', window.ExpertEditPageDialog);
  app.component('expert-create-page-dialog', window.ExpertCreatePageDialog);
  app.component('expert-center-page', ExpertCenterPage);
  app.component('expert-detail-page', window.ExpertDetailPage);
  app.component('expert-tasks-page', window.ExpertTasksPage);
  app.component('project-list-page', ProjectListPage);
  app.component('project-detail-page', window.ProjectDetailPage);

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
