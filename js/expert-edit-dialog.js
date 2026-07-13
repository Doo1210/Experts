/**
 * 专家编辑弹窗 — 共享组件与表单逻辑
 */
(function () {
  window.createExpertEditForm = function (store, options) {
    options = options || {};
    var showEditDialog = Vue.ref(false);
    var editForm = Vue.ref({ name: '', description: '', avatar: '', expertise: [] });
    var editAvatarInput = Vue.ref(null);
    var editExpertiseTagInput = Vue.ref('');
    var editingExpert = Vue.ref(null);
    var editModelMode = Vue.ref('keep');
    var editModelConfig = Vue.ref({ baseUrl: '', apiKey: '', model: '', providerName: '' });
    var editModelCurrent = Vue.ref(null);

    function resetEditForm() {
      editForm.value = { name: '', description: '', avatar: '', expertise: [] };
      editExpertiseTagInput.value = '';
      editingExpert.value = null;
      editModelMode.value = 'keep';
      editModelConfig.value = { baseUrl: '', apiKey: '', model: '', providerName: '' };
      editModelCurrent.value = null;
    }

    function openEdit(expert) {
      if (!expert) return;
      editingExpert.value = expert;
      editForm.value = {
        name: expert.name,
        description: expert.description,
        avatar: expert.avatar || '',
        expertise: (expert.expertise || []).slice(0, 10)
      };
      editExpertiseTagInput.value = '';
      var mc = expert.modelConfig || null;
      editModelCurrent.value = mc ? {
        model: mc.model || expert.model || '',
        providerName: mc.providerName || '',
        baseUrl: mc.baseUrl || ''
      } : (expert.model ? { model: expert.model, providerName: '', baseUrl: '' } : null);
      editModelMode.value = 'keep';
      editModelConfig.value = { baseUrl: '', apiKey: '', model: '', providerName: '' };
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
      if (window.readImageFile(file, function (url) { editForm.value.avatar = url; })) {
        e.target.value = '';
      }
    }

    function addEditExpertiseTag() {
      var tag = editExpertiseTagInput.value.trim();
      if (!tag) return;
      if (editForm.value.expertise.length >= 10) {
        ElementPlus.ElMessage.warning('擅长领域最多添加 10 个');
        return;
      }
      if (editForm.value.expertise.indexOf(tag) !== -1) {
        ElementPlus.ElMessage.warning('该标签已存在');
        return;
      }
      editForm.value.expertise = editForm.value.expertise.concat([tag]).slice(0, 10);
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
      var expert = editingExpert.value || (options.getExpert && options.getExpert());
      if (!expert) return;
      if (!editForm.value.name.trim() || !editForm.value.description.trim()) {
        ElementPlus.ElMessage.warning('请填写专家名称和介绍');
        return;
      }
      var updatedModelConfig = expert.modelConfig || null;
      if (editModelMode.value === 'new') {
        var mc = editModelConfig.value;
        if (!mc.baseUrl.trim()) {
          ElementPlus.ElMessage.warning('请填写 Base URL');
          return;
        }
        try { new URL(mc.baseUrl.trim()); }
        catch (e) {
          ElementPlus.ElMessage.warning('Base URL 格式不正确');
          return;
        }
        if (!mc.apiKey.trim()) {
          ElementPlus.ElMessage.warning('请填写 API Key');
          return;
        }
        if (!mc.model.trim()) {
          ElementPlus.ElMessage.warning('请填写模型名称');
          return;
        }
        updatedModelConfig = {
          baseUrl: mc.baseUrl.trim(),
          apiKey: mc.apiKey.trim(),
          model: mc.model.trim(),
          providerName: mc.providerName.trim()
        };
      }
      var updated = Object.assign({}, expert, {
        name: editForm.value.name.trim(),
        description: editForm.value.description.trim(),
        avatar: editForm.value.avatar || expert.avatar,
        expertise: editForm.value.expertise.slice(0, 10)
      });
      if (editModelMode.value === 'new' && updatedModelConfig) {
        if (store && store.resolveProviderSlug) {
          updatedModelConfig.providerSlug = store.resolveProviderSlug(updatedModelConfig.providerName, updatedModelConfig.baseUrl);
        } else {
          updatedModelConfig.providerSlug = 'custom';
        }
        updated.modelConfig = updatedModelConfig;
        updated.model = updatedModelConfig.model;
        updated.provider = updatedModelConfig.providerSlug;
      }
      store.saveExpert(updated);
      closeEditDialog();
      if (options.onSaved) options.onSaved();
      if (editModelMode.value === 'new' && expert.modelConfig) {
        var count = (options.getRunningSessionCount && options.getRunningSessionCount()) || 0;
        ElementPlus.ElMessage.success(count > 0
          ? '已保存。该专家当前有 ' + count + ' 个运行中会话，修改将在新会话生效。'
          : '已保存。修改将在新会话生效。');
      } else {
        ElementPlus.ElMessage.success('专家信息已更新');
      }
    }

    return {
      showEditDialog: showEditDialog,
      editForm: editForm,
      editAvatarInput: editAvatarInput,
      editExpertiseTagInput: editExpertiseTagInput,
      editModelMode: editModelMode,
      editModelConfig: editModelConfig,
      editModelCurrent: editModelCurrent,
      resetEditForm: resetEditForm,
      openEdit: openEdit,
      openEditDialog: function () {
        var expert = options.getExpert && options.getExpert();
        if (expert) openEdit(expert);
      },
      closeEditDialog: closeEditDialog,
      triggerEditAvatarUpload: triggerEditAvatarUpload,
      handleEditAvatarChange: handleEditAvatarChange,
      addEditExpertiseTag: addEditExpertiseTag,
      removeEditExpertiseTag: removeEditExpertiseTag,
      onEditExpertiseTagKeydown: onEditExpertiseTagKeydown,
      submitEdit: submitEdit
    };
  };

  window.ExpertEditDialog = {
    props: {
      visible: { type: Boolean, default: false },
      form: { type: Object, required: true },
      tagInput: { type: String, default: '' },
      headerTitle: { type: String, default: '编辑专家' },
      headerSubtitle: { type: String, default: '修改专家名称、介绍、头像与擅长领域' },
      tagColors: { type: Array, default: function () { return window.TAG_COLORS || []; } },
      modelMode: { type: String, default: 'keep' },
      modelConfig: { type: Object, default: null },
      modelCurrent: { type: Object, default: null }
    },
    emits: ['update:visible', 'update:tagInput', 'update:modelMode', 'update:modelConfig', 'submit', 'closed', 'avatar-change', 'add-tag', 'remove-tag', 'tag-keydown'],
    setup: function (props, ctx) {
      var editAvatarInput = Vue.ref(null);

      function close() {
        ctx.emit('update:visible', false);
      }

      function triggerAvatarUpload() {
        if (editAvatarInput.value) editAvatarInput.value.click();
      }

      function handleAvatarChange(e) {
        ctx.emit('avatar-change', e);
      }

      function updateTagInput(val) {
        ctx.emit('update:tagInput', val);
      }

      function removeTag(tag) {
        ctx.emit('remove-tag', tag);
      }

      function onTagKeydown(e) {
        ctx.emit('tag-keydown', e);
      }

      function addTag() {
        ctx.emit('add-tag');
      }

      function onModelModeChange(val) {
        ctx.emit('update:modelMode', val);
      }

      return {
        editAvatarInput: editAvatarInput,
        close: close,
        triggerAvatarUpload: triggerAvatarUpload,
        handleAvatarChange: handleAvatarChange,
        updateTagInput: updateTagInput,
        removeTag: removeTag,
        onTagKeydown: onTagKeydown,
        addTag: addTag,
        onModelModeChange: onModelModeChange
      };
    },
    template: '\
      <el-dialog\
        :model-value="visible"\
        width="640px"\
        class="form-dialog form-dialog-expert form-dialog-expert-edit"\
        :close-on-click-modal="false"\
        @update:model-value="$emit(\'update:visible\', $event)"\
        @closed="$emit(\'closed\')">\
        <template #header>\
          <div class="dialog-header-custom dialog-header-expert-wizard">\
            <div class="dialog-header-icon dialog-header-icon-edit" :class="{ \'dialog-header-icon-has-avatar\': form.avatar }">\
              <img v-if="form.avatar" :src="form.avatar" alt="" class="dialog-header-avatar">\
              <span v-else class="dialog-header-avatar-placeholder">✏️</span>\
            </div>\
            <div class="dialog-header-text">\
              <div class="dialog-header-title">{{ headerTitle }}</div>\
              <div class="dialog-header-sub">{{ headerSubtitle }}</div>\
            </div>\
          </div>\
        </template>\
        <div class="form-dialog-body">\
          <div class="create-basic-hero">\
            <div class="create-basic-avatar-card create-avatar-upload" role="button" tabindex="0" @click="triggerAvatarUpload" @keydown.enter="triggerAvatarUpload">\
              <input ref="editAvatarInput" type="file" accept="image/*" class="create-avatar-input" @change="handleAvatarChange" @click.stop>\
              <div v-if="form.avatar" class="create-avatar-preview-wrap">\
                <img :src="form.avatar" class="create-basic-avatar" alt="头像预览">\
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
                <el-input :model-value="form.name" @update:model-value="form.name = $event" placeholder="如：首席工艺专家" size="large" />\
              </el-form-item>\
              <el-form-item label="专家介绍" required>\
                <el-input :model-value="form.description" @update:model-value="form.description = $event" type="textarea" :rows="3" placeholder="简要描述专家能力与经验背景" />\
              </el-form-item>\
            </el-form>\
          </div>\
          <div class="expertise-tag-editor">\
            <div class="expertise-tag-editor-head">\
              <span class="expertise-tag-editor-label">擅长领域</span>\
              <span class="expertise-tag-editor-optional">选填</span>\
            </div>\
            <div v-if="form.expertise.length" class="expertise-tag-chips">\
              <span\
                v-for="(tag, idx) in form.expertise"\
                :key="tag"\
                class="expertise-tag-chip expertise-tag"\
                :class="tagColors[idx % tagColors.length]">\
                {{ tag }}\
                <button type="button" class="expertise-tag-chip-remove" title="移除" @click="removeTag(tag)">\
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>\
                </button>\
              </span>\
            </div>\
            <div class="expertise-tag-input-row">\
              <el-input\
                :model-value="tagInput"\
                @update:model-value="updateTagInput"\
                placeholder="输入领域标签，按 Enter 添加"\
                @keydown="onTagKeydown" />\
              <el-button type="primary" plain @click="addTag">添加</el-button>\
            </div>\
            <p class="form-dialog-hint expertise-tag-hint">可添加多个标签，如「SPC」「良率分析」「工艺优化」</p>\
          </div>\
                    <div v-if="modelCurrent" class="edit-model-section">\
            <div class="create-model-section-title">默认模型</div>\
            <div class="edit-model-current">\
              <span class="edit-model-current-label">当前默认模型：</span>\
              <span class="edit-model-current-value">{{ modelCurrent.model || "未配置" }}</span>\
              <span v-if="modelCurrent.providerName" class="edit-model-current-url">via {{ modelCurrent.providerName }}</span>\
              <span v-if="modelCurrent.baseUrl" class="edit-model-current-url">{{ modelCurrent.baseUrl }}</span>\
            </div>\
            <el-form label-position="top" class="form-dialog-form">\
              <el-form-item label="修改默认模型？">\
                <el-radio-group :model-value="modelMode" @update:model-value="onModelModeChange">\
                  <el-radio label="keep">保持当前配置</el-radio>\
                  <el-radio label="new">修改为新的配置</el-radio>\
                </el-radio-group>\
              </el-form-item>\
              <div v-if="modelMode === \'new\'" class="edit-model-new-fields create-model-fields">\
                <el-form-item label="Base URL" required>\
                  <el-input :model-value="modelConfig.baseUrl" @update:model-value="modelConfig.baseUrl = $event" placeholder="https://api.openai.com/v1" size="large" />\
                </el-form-item>\
                <el-form-item label="API Key" required>\
                  <el-input :model-value="modelConfig.apiKey" @update:model-value="modelConfig.apiKey = $event" type="password" show-password placeholder="输入 API Key" size="large" />\
                </el-form-item>\
                <el-form-item label="模型名称" required>\
                  <el-input :model-value="modelConfig.model" @update:model-value="modelConfig.model = $event" placeholder="如：gpt-4o、deepseek-chat" size="large" />\
                </el-form-item>\
                <el-form-item label="Provider 名称（可选）">\
                  <el-input :model-value="modelConfig.providerName" @update:model-value="modelConfig.providerName = $event" placeholder="留空则从 Base URL 自动生成" size="large" />\
                </el-form-item>\
              </div>\
            </el-form>\
          </div>\
                </div>\
        <template #footer>\
          <div class="dialog-footer-custom">\
            <el-button @click="close">取消</el-button>\
            <el-button type="primary" @click="$emit(\'submit\')">保存</el-button>\
          </div>\
        </template>\
      </el-dialog>'
  };

  window.ExpertEditPageDialog = {
    props: {
      edit: { type: Object, required: true },
      headerTitle: { type: String, default: '编辑专家' },
      tagColors: { type: Array, default: function () { return window.TAG_COLORS || []; } }
    },
    setup: function (props) {
      return {
        showEditDialog: props.edit.showEditDialog,
        editForm: props.edit.editForm,
        editExpertiseTagInput: props.edit.editExpertiseTagInput,
        editModelMode: props.edit.editModelMode,
        editModelConfig: props.edit.editModelConfig,
        editModelCurrent: props.edit.editModelCurrent,
        resetEditForm: props.edit.resetEditForm,
        submitEdit: props.edit.submitEdit,
        handleEditAvatarChange: props.edit.handleEditAvatarChange,
        addEditExpertiseTag: props.edit.addEditExpertiseTag,
        removeEditExpertiseTag: props.edit.removeEditExpertiseTag,
        onEditExpertiseTagKeydown: props.edit.onEditExpertiseTagKeydown,
        headerTitle: Vue.computed(function () { return props.headerTitle; }),
        tagColors: Vue.computed(function () { return props.tagColors; })
      };
    },
    template: '\
      <expert-edit-dialog\
        v-model:visible="showEditDialog"\
        :form="editForm"\
        v-model:tag-input="editExpertiseTagInput"\
        :header-title="headerTitle"\
        :tag-colors="tagColors"\
        :model-mode="editModelMode"\
        :model-config="editModelConfig"\
        :model-current="editModelCurrent"\
        @update:model-mode="editModelMode = $event"\
        @submit="submitEdit"\
        @closed="resetEditForm"\
        @avatar-change="handleEditAvatarChange"\
        @add-tag="addEditExpertiseTag"\
        @remove-tag="removeEditExpertiseTag"\
        @tag-keydown="onEditExpertiseTagKeydown" />'
  };
})();
