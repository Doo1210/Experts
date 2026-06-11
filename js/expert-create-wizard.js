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

    function handleCreateAvatarChange(e) {
      var file = e.target.files && e.target.files[0];
      if (readImageFile(file, function (url) { createForm.value.avatar = url; })) {
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
      ElementPlus.ElMessage.success('专家创建成功');
      if (options.onCreated) options.onCreated(expert);
    }

    return {
      showCreateDialog: showCreateDialog,
      createForm: createForm,
      createStep: createStep,
      createStepTitles: CREATE_STEP_TITLES,
      createAvatarInput: createAvatarInput,
      expertiseTagInput: expertiseTagInput,
      saving: saving,
      resetCreateForm: resetCreateForm,
      openCreateDialog: openCreateDialog,
      closeCreateDialog: closeCreateDialog,
      goCreateNextStep: goCreateNextStep,
      goCreatePrevStep: goCreatePrevStep,
      submitCreate: submitCreate,
      triggerCreateAvatarUpload: triggerCreateAvatarUpload,
      handleCreateAvatarChange: handleCreateAvatarChange,
      addCreateExpertiseTag: addCreateExpertiseTag,
      removeCreateExpertiseTag: removeCreateExpertiseTag,
      onExpertiseTagKeydown: onExpertiseTagKeydown
    };
  };

  window.ExpertCreatePageDialog = {
    props: {
      wizard: { type: Object, required: true },
      tagColors: { type: Array, default: function () { return window.TAG_COLORS || []; } },
      skills: { type: Array, default: function () { return window.SKILLS_CATALOG || []; } },
      tools: { type: Array, default: function () { return window.TOOLS_CATALOG || []; } }
    },
    setup: function (props) {
      return {
        showCreateDialog: props.wizard.showCreateDialog,
        createForm: props.wizard.createForm,
        createStep: props.wizard.createStep,
        createStepTitles: props.wizard.createStepTitles,
        createAvatarInput: props.wizard.createAvatarInput,
        expertiseTagInput: props.wizard.expertiseTagInput,
        saving: props.wizard.saving,
        resetCreateForm: props.wizard.resetCreateForm,
        closeCreateDialog: props.wizard.closeCreateDialog,
        goCreateNextStep: props.wizard.goCreateNextStep,
        goCreatePrevStep: props.wizard.goCreatePrevStep,
        submitCreate: props.wizard.submitCreate,
        triggerCreateAvatarUpload: props.wizard.triggerCreateAvatarUpload,
        handleCreateAvatarChange: props.wizard.handleCreateAvatarChange,
        addCreateExpertiseTag: props.wizard.addCreateExpertiseTag,
        removeCreateExpertiseTag: props.wizard.removeCreateExpertiseTag,
        onExpertiseTagKeydown: props.wizard.onExpertiseTagKeydown,
        tagColors: Vue.computed(function () { return props.tagColors; }),
        skills: Vue.computed(function () { return props.skills; }),
        tools: Vue.computed(function () { return props.tools; })
      };
    },
    template: '\
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
      </el-dialog>'
  };
})();
