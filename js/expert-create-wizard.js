/**
 * 专家创建向导
 */
(function () {
  var readImageFile = window.readImageFile;

  window.createExpertCreateForm = function (store, options) {
    options = options || {};
    var showCreateDialog = Vue.ref(false);
    var saving = Vue.ref(false);
    var defaultPersona = {
      coreDutyMd: '## 核心职责\n\n\n## 工作流程\n\n1. \n2. \n3. \n\n## 行为准则\n\n- ',
      workflowMd: '',
      behaviorMd: ''
    };
    var createAvatarInput = Vue.ref(null);
    var createPersonaInput = Vue.ref(null);
    var createSkillsCatalog = Vue.ref([]);
    var createToolsCatalog = Vue.ref([]);
    var createSkillAssigned = Vue.ref([]);
    var createToolAssigned = Vue.ref([]);
    var createSkillPickerVisible = Vue.ref(false);
    var createSkillPickerSearch = Vue.ref('');
    var createSkillPickerSelection = Vue.ref([]);
    var createToolPickerVisible = Vue.ref(false);
    var createToolPickerSearch = Vue.ref('');
    var createToolPickerSelection = Vue.ref([]);
    var capabilitiesLoading = Vue.ref(false);

    function emptyCreateForm() {
      return {
        name: '', description: '', avatar: '',
        expertise: [],
        coreDutyMd: defaultPersona.coreDutyMd,
        workflowMd: defaultPersona.workflowMd,
        behaviorMd: defaultPersona.behaviorMd
      };
    }

    var createForm = Vue.ref(emptyCreateForm());
    var createStep = Vue.ref(0);
    var expertiseTagInput = Vue.ref('');
    var CREATE_STEP_TITLES = ['基础信息', '人设', '技能', '工具'];

    function resetCreateForm() {
      createForm.value = emptyCreateForm();
      createStep.value = 0;
      expertiseTagInput.value = '';
      createSkillsCatalog.value = [];
      createToolsCatalog.value = [];
      createSkillAssigned.value = [];
      createToolAssigned.value = [];
      createSkillPickerSearch.value = '';
      createToolPickerSearch.value = '';
      createSkillPickerSelection.value = [];
      createToolPickerSelection.value = [];
      createSkillPickerVisible.value = false;
      createToolPickerVisible.value = false;
    }

    function loadCreateCapabilityCatalog() {
      createSkillsCatalog.value = [];
      createToolsCatalog.value = [];
      createSkillAssigned.value = [];
      createToolAssigned.value = [];

      if (store.isDevMock()) {
        createSkillsCatalog.value = (window.SKILLS_CATALOG || []).map(function (s) {
          return { skillId: s.id, name: s.name, description: s.description || '', category: s.category || '' };
        });
        createToolsCatalog.value = (window.TOOLS_CATALOG || []).map(function (t) {
          return { toolset: t.id, label: t.name, description: t.description || '' };
        });
        return;
      }
      if (!window.SidecarApi) return;

      var experts = store.getExperts();
      var templateProfile = experts.length ? String(experts[0].id) : 'default';
      capabilitiesLoading.value = true;
      Promise.all([
        window.SidecarApi.getExpertSkills(templateProfile),
        window.SidecarApi.getExpertTools(templateProfile)
      ]).then(function (results) {
        var skillsResp = results[0] || {};
        var toolsResp = results[1] || {};
        createSkillsCatalog.value = skillsResp.catalog || [];
        createToolsCatalog.value = (toolsResp.catalog && toolsResp.catalog.toolsets) || [];
      }).catch(function () {
        createSkillsCatalog.value = [];
        createToolsCatalog.value = [];
      }).finally(function () {
        capabilitiesLoading.value = false;
      });
    }

    var createSkillPickerOptions = Vue.computed(function () {
      var assigned = {};
      createSkillAssigned.value.forEach(function (row) { assigned[row.skillId] = true; });
      var q = createSkillPickerSearch.value.trim().toLowerCase();
      return createSkillsCatalog.value.filter(function (s) {
        if (assigned[s.skillId]) return false;
        if (!q) return true;
        var name = (s.name || s.skillId || '').toLowerCase();
        var desc = (s.description || '').toLowerCase();
        var cat = (s.category || '').toLowerCase();
        return name.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || cat.indexOf(q) >= 0 || s.skillId.toLowerCase().indexOf(q) >= 0;
      });
    });

    var createToolPickerOptions = Vue.computed(function () {
      var assigned = {};
      createToolAssigned.value.forEach(function (row) { assigned[row.toolset] = true; });
      var q = createToolPickerSearch.value.trim().toLowerCase();
      return createToolsCatalog.value.filter(function (t) {
        var id = t.toolset || t.toolId;
        if (assigned[id]) return false;
        if (!q) return true;
        var label = (t.label || id || '').toLowerCase();
        var desc = (t.description || '').toLowerCase();
        return label.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || id.toLowerCase().indexOf(q) >= 0;
      });
    });

    function openCreateSkillPicker() {
      createSkillPickerSelection.value = [];
      createSkillPickerSearch.value = '';
      createSkillPickerVisible.value = true;
    }

    function onCreateSkillPickerSelection(rows) {
      createSkillPickerSelection.value = (rows || []).map(function (r) { return r.skillId; });
    }

    function confirmCreateSkillPicker() {
      if (!createSkillPickerSelection.value.length) {
        ElementPlus.ElMessage.info('请选择至少一项技能');
        return;
      }
      var catalogById = {};
      createSkillsCatalog.value.forEach(function (s) { catalogById[s.skillId] = s; });
      var next = createSkillAssigned.value.slice();
      createSkillPickerSelection.value.forEach(function (skillId) {
        if (!skillId || next.some(function (r) { return r.skillId === skillId; })) return;
        var meta = catalogById[skillId] || {};
        next.push({
          skillId: skillId,
          name: meta.name || skillId,
          description: meta.description || '',
          category: meta.category || ''
        });
      });
      createSkillAssigned.value = next;
      createSkillPickerVisible.value = false;
      ElementPlus.ElMessage.success('已加入配给列表');
    }

    function removeCreateSkill(skillId) {
      createSkillAssigned.value = createSkillAssigned.value.filter(function (r) {
        return r.skillId !== skillId;
      });
    }

    function openCreateToolPicker() {
      createToolPickerSelection.value = [];
      createToolPickerSearch.value = '';
      createToolPickerVisible.value = true;
    }

    function onCreateToolPickerSelection(rows) {
      createToolPickerSelection.value = (rows || []).map(function (r) { return r.toolset; });
    }

    function confirmCreateToolPicker() {
      if (!createToolPickerSelection.value.length) {
        ElementPlus.ElMessage.info('请选择至少一项工具');
        return;
      }
      var catalogById = {};
      createToolsCatalog.value.forEach(function (t) {
        var id = t.toolset || t.toolId;
        catalogById[id] = t;
      });
      var next = createToolAssigned.value.slice();
      createToolPickerSelection.value.forEach(function (toolset) {
        if (!toolset || next.some(function (r) { return r.toolset === toolset; })) return;
        var meta = catalogById[toolset] || {};
        next.push({
          toolset: toolset,
          label: meta.label || toolset,
          description: meta.description || ''
        });
      });
      createToolAssigned.value = next;
      createToolPickerVisible.value = false;
      ElementPlus.ElMessage.success('已加入配给列表');
    }

    function removeCreateTool(toolset) {
      createToolAssigned.value = createToolAssigned.value.filter(function (r) {
        return r.toolset !== toolset;
      });
    }

    function addCreateExpertiseTag() {
      var tag = expertiseTagInput.value.trim();
      if (!tag) return;
      if (createForm.value.expertise.length >= 3) {
        ElementPlus.ElMessage.warning('擅长领域最多添加 3 个');
        return;
      }
      if (createForm.value.expertise.indexOf(tag) !== -1) {
        ElementPlus.ElMessage.warning('该标签已存在');
        return;
      }
      createForm.value.expertise = createForm.value.expertise.concat([tag]).slice(0, 3);
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

    function handleCreateAvatarChange(e) {
      var file = e.target.files && e.target.files[0];
      if (readImageFile(file, function (url) { createForm.value.avatar = url; })) {
        e.target.value = '';
      }
    }

    function triggerCreatePersonaUpload() {
      if (createPersonaInput.value) createPersonaInput.value.click();
    }

    function handleCreatePersonaChange(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        createForm.value.coreDutyMd = ev.target.result || '';
        createForm.value.workflowMd = '';
        createForm.value.behaviorMd = '';
        ElementPlus.ElMessage.success('已上传 ' + file.name);
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    function openCreateDialog() {
      resetCreateForm();
      showCreateDialog.value = true;
      loadCreateCapabilityCatalog();
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

    function applyCreateCapabilities(expertId) {
      var skillBindings = createSkillAssigned.value.map(function (r) {
        return { skillId: r.skillId, enabled: true, params: {} };
      });
      var toolBindings = createToolAssigned.value.map(function (r) {
        return {
          toolId: r.toolset,
          toolset: r.toolset,
          enabled: true,
          status: 'unconfigured',
          config: {}
        };
      });
      store.setSkillBindings(expertId, skillBindings);
      store.setToolBindings(expertId, toolBindings);
    }

    function submitCreate() {
      if (!validateCreateStep(0)) {
        createStep.value = 0;
        return;
      }
      saving.value = true;
      var skillIds = createSkillAssigned.value.map(function (r) { return r.skillId; });
      var toolIds = createToolAssigned.value.map(function (r) { return r.toolset; });
      var expert = store.createExpert({
        name: createForm.value.name.trim(),
        description: createForm.value.description.trim(),
        avatar: createForm.value.avatar || undefined,
        expertise: createForm.value.expertise.slice(0, 3),
        skillIds: skillIds,
        toolIds: toolIds,
        persona: {
          coreDutyMd: createForm.value.coreDutyMd,
          workflowMd: '',
          behaviorMd: ''
        }
      });
      applyCreateCapabilities(expert.id);
      saving.value = false;
      closeCreateDialog();
      ElementPlus.ElMessage.success('专家创建成功');
      if (options.onCreated) options.onCreated(expert);
    }

    return {
      showCreateDialog: showCreateDialog,
      createForm: createForm,
      createStep: createStep,
      createStepTitles: CREATE_STEP_TITLES,
      createAvatarInput: createAvatarInput,
      createPersonaInput: createPersonaInput,
      expertiseTagInput: expertiseTagInput,
      saving: saving,
      capabilitiesLoading: capabilitiesLoading,
      createSkillAssigned: createSkillAssigned,
      createToolAssigned: createToolAssigned,
      createSkillPickerVisible: createSkillPickerVisible,
      createSkillPickerSearch: createSkillPickerSearch,
      createSkillPickerOptions: createSkillPickerOptions,
      createToolPickerVisible: createToolPickerVisible,
      createToolPickerSearch: createToolPickerSearch,
      createToolPickerOptions: createToolPickerOptions,
      openCreateSkillPicker: openCreateSkillPicker,
      onCreateSkillPickerSelection: onCreateSkillPickerSelection,
      confirmCreateSkillPicker: confirmCreateSkillPicker,
      removeCreateSkill: removeCreateSkill,
      openCreateToolPicker: openCreateToolPicker,
      onCreateToolPickerSelection: onCreateToolPickerSelection,
      confirmCreateToolPicker: confirmCreateToolPicker,
      removeCreateTool: removeCreateTool,
      resetCreateForm: resetCreateForm,
      openCreateDialog: openCreateDialog,
      closeCreateDialog: closeCreateDialog,
      goCreateNextStep: goCreateNextStep,
      goCreatePrevStep: goCreatePrevStep,
      submitCreate: submitCreate,
      triggerCreateAvatarUpload: triggerCreateAvatarUpload,
      handleCreateAvatarChange: handleCreateAvatarChange,
      triggerCreatePersonaUpload: triggerCreatePersonaUpload,
      handleCreatePersonaChange: handleCreatePersonaChange,
      addCreateExpertiseTag: addCreateExpertiseTag,
      removeCreateExpertiseTag: removeCreateExpertiseTag,
      onExpertiseTagKeydown: onExpertiseTagKeydown
    };
  };

  window.ExpertCreatePageDialog = {
    props: {
      wizard: { type: Object, required: true },
      tagColors: { type: Array, default: function () { return window.TAG_COLORS || []; } }
    },
    setup: function (props) {
      return {
        showCreateDialog: props.wizard.showCreateDialog,
        createForm: props.wizard.createForm,
        createStep: props.wizard.createStep,
        createStepTitles: props.wizard.createStepTitles,
        createAvatarInput: props.wizard.createAvatarInput,
        createPersonaInput: props.wizard.createPersonaInput,
        expertiseTagInput: props.wizard.expertiseTagInput,
        saving: props.wizard.saving,
        capabilitiesLoading: props.wizard.capabilitiesLoading,
        createSkillAssigned: props.wizard.createSkillAssigned,
        createToolAssigned: props.wizard.createToolAssigned,
        createSkillPickerVisible: props.wizard.createSkillPickerVisible,
        createSkillPickerSearch: props.wizard.createSkillPickerSearch,
        createSkillPickerOptions: props.wizard.createSkillPickerOptions,
        createToolPickerVisible: props.wizard.createToolPickerVisible,
        createToolPickerSearch: props.wizard.createToolPickerSearch,
        createToolPickerOptions: props.wizard.createToolPickerOptions,
        openCreateSkillPicker: props.wizard.openCreateSkillPicker,
        onCreateSkillPickerSelection: props.wizard.onCreateSkillPickerSelection,
        confirmCreateSkillPicker: props.wizard.confirmCreateSkillPicker,
        removeCreateSkill: props.wizard.removeCreateSkill,
        openCreateToolPicker: props.wizard.openCreateToolPicker,
        onCreateToolPickerSelection: props.wizard.onCreateToolPickerSelection,
        confirmCreateToolPicker: props.wizard.confirmCreateToolPicker,
        removeCreateTool: props.wizard.removeCreateTool,
        resetCreateForm: props.wizard.resetCreateForm,
        closeCreateDialog: props.wizard.closeCreateDialog,
        goCreateNextStep: props.wizard.goCreateNextStep,
        goCreatePrevStep: props.wizard.goCreatePrevStep,
        submitCreate: props.wizard.submitCreate,
        triggerCreateAvatarUpload: props.wizard.triggerCreateAvatarUpload,
        handleCreateAvatarChange: props.wizard.handleCreateAvatarChange,
        triggerCreatePersonaUpload: props.wizard.triggerCreatePersonaUpload,
        handleCreatePersonaChange: props.wizard.handleCreatePersonaChange,
        addCreateExpertiseTag: props.wizard.addCreateExpertiseTag,
        removeCreateExpertiseTag: props.wizard.removeCreateExpertiseTag,
        onExpertiseTagKeydown: props.wizard.onExpertiseTagKeydown,
        tagColors: Vue.computed(function () { return props.tagColors; })
      };
    },
    template: '\
      <el-dialog v-model="showCreateDialog" width="720px" class="form-dialog form-dialog-expert form-dialog-expert-wizard" :close-on-click-modal="false" @closed="resetCreateForm">\
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
              <p class="wizard-step-desc">编写专家人设 Markdown，定义核心职责、工作流程与行为准则</p>\
              <input ref="createPersonaInput" type="file" accept=".md,text/markdown,text/plain" class="material-file-input-hidden" @change="handleCreatePersonaChange">\
              <div class="wizard-persona-editor-head">\
                <span class="wizard-persona-editor-title">人设.md</span>\
                <el-button size="small" @click="triggerCreatePersonaUpload">上传 Markdown</el-button>\
              </div>\
              <el-input v-model="createForm.coreDutyMd" type="textarea" :rows="14" placeholder="编辑人设.md，支持 Markdown 格式" class="wizard-persona-markdown-input" />\
            </div>\
            <div v-show="createStep === 2" class="wizard-step-content wizard-step-bindings">\
              <p class="wizard-step-desc">为专家配置可调用的业务技能，可从已安装技能池中添加</p>\
              <div class="detail-action-bar">\
                <span class="detail-action-bar-label">已配给 {{ createSkillAssigned.length }} 项技能</span>\
                <el-button type="primary" size="small" @click="openCreateSkillPicker">+ 添加技能</el-button>\
              </div>\
              <div v-loading="capabilitiesLoading">\
                <div v-if="createSkillAssigned.length === 0" class="profile-empty-state wizard-empty-state">\
                  <p class="profile-empty-title">尚未配给任何技能</p>\
                  <p class="profile-empty-desc">点击「添加技能」从已安装技能池中选择。</p>\
                </div>\
                <div v-else class="detail-table-wrap">\
                  <el-table :data="createSkillAssigned" stripe class="toolset-table" max-height="320">\
                    <el-table-column label="技能" min-width="140">\
                      <template #default="{ row }">\
                        <div class="toolset-name-cell">{{ row.name }}</div>\
                        <div class="toolset-id-cell">{{ row.skillId }}</div>\
                      </template>\
                    </el-table-column>\
                    <el-table-column prop="category" label="分类" width="110" show-overflow-tooltip />\
                    <el-table-column label="说明" min-width="180" show-overflow-tooltip>\
                      <template #default="{ row }">{{ row.description || \'—\' }}</template>\
                    </el-table-column>\
                    <el-table-column label="操作" width="80" align="center">\
                      <template #default="{ row }">\
                        <el-button link type="danger" size="small" @click="removeCreateSkill(row.skillId)">移除</el-button>\
                      </template>\
                    </el-table-column>\
                  </el-table>\
                </div>\
              </div>\
            </div>\
            <div v-show="createStep === 3" class="wizard-step-content wizard-step-bindings">\
              <p class="wizard-step-desc">为专家配置可调用工具，并查看已接入的外部服务</p>\
              <div class="detail-action-bar">\
                <span class="detail-action-bar-label">已配给 {{ createToolAssigned.length }} 个 toolset</span>\
                <el-button type="primary" size="small" @click="openCreateToolPicker">+ 添加工具</el-button>\
              </div>\
              <div v-loading="capabilitiesLoading">\
                <div v-if="createToolAssigned.length === 0" class="profile-empty-state wizard-empty-state">\
                  <p class="profile-empty-title">尚未配给任何工具</p>\
                  <p class="profile-empty-desc">点击「添加工具」从可选工具列表中挑选。</p>\
                </div>\
                <div v-else class="detail-table-wrap">\
                  <el-table :data="createToolAssigned" stripe class="toolset-table" max-height="320">\
                    <el-table-column label="Toolset" min-width="140">\
                      <template #default="{ row }">\
                        <div class="toolset-name-cell">{{ row.label }}</div>\
                        <div class="toolset-id-cell">{{ row.toolset }}</div>\
                      </template>\
                    </el-table-column>\
                    <el-table-column label="说明" min-width="200" show-overflow-tooltip>\
                      <template #default="{ row }">{{ row.description || \'—\' }}</template>\
                    </el-table-column>\
                    <el-table-column label="操作" width="80" align="center">\
                      <template #default="{ row }">\
                        <el-button link type="danger" size="small" @click="removeCreateTool(row.toolset)">移除</el-button>\
                      </template>\
                    </el-table-column>\
                  </el-table>\
                </div>\
              </div>\
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
        <el-dialog v-model="createSkillPickerVisible" title="添加技能" width="640px" append-to-body class="form-dialog capability-picker-dialog">\
          <div class="capability-picker-head">\
            <el-input v-model="createSkillPickerSearch" placeholder="搜索技能名称、分类..." size="small" clearable class="member-picker-search" />\
            <span class="member-picker-count">可选 {{ createSkillPickerOptions.length }} 项</span>\
          </div>\
          <el-table\
            :data="createSkillPickerOptions"\
            stripe\
            max-height="360"\
            class="toolset-table capability-picker-table"\
            empty-text="暂无可添加技能（均已配给或未安装）"\
            @selection-change="onCreateSkillPickerSelection"\
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
            <el-button @click="createSkillPickerVisible = false">取消</el-button>\
            <el-button type="primary" @click="confirmCreateSkillPicker">添加所选</el-button>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="createToolPickerVisible" title="添加工具" width="640px" append-to-body class="form-dialog capability-picker-dialog">\
          <div class="capability-picker-head">\
            <el-input v-model="createToolPickerSearch" placeholder="搜索 toolset..." size="small" clearable class="member-picker-search" />\
            <span class="member-picker-count">可选 {{ createToolPickerOptions.length }} 项</span>\
          </div>\
          <el-table\
            :data="createToolPickerOptions"\
            stripe\
            max-height="360"\
            class="toolset-table capability-picker-table"\
            empty-text="暂无可添加 toolset（均已配给）"\
            @selection-change="onCreateToolPickerSelection"\
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
            <el-button @click="createToolPickerVisible = false">取消</el-button>\
            <el-button type="primary" @click="confirmCreateToolPicker">添加所选</el-button>\
          </template>\
        </el-dialog>\
      </el-dialog>'
  };
})();
