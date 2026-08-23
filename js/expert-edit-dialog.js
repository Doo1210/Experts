/**
 * 专家编辑弹窗 — 共享组件与表单逻辑
 */
(function () {
  function snapshotModelConfig(mc) {
    var c = mc || {};
    return {
      providerSlug: c.providerSlug || '',
      providerName: c.providerName || '',
      baseUrl: c.baseUrl || '',
      apiKey: c.apiKey || '',
      model: c.model || ''
    };
  }

  function modelConfigEqual(a, b) {
    var x = snapshotModelConfig(a);
    var y = snapshotModelConfig(b);
    return x.providerSlug === y.providerSlug &&
      x.providerName === y.providerName &&
      x.baseUrl === y.baseUrl &&
      x.apiKey === y.apiKey &&
      x.model === y.model;
  }

  window.createExpertEditForm = function (store, options) {
    options = options || {};
    var showEditDialog = Vue.ref(false);
    var editForm = Vue.ref({ name: '', description: '', avatar: '', expertise: [] });
    var editAvatarInput = Vue.ref(null);
    var editExpertiseTagInput = Vue.ref('');
    var editingExpert = Vue.ref(null);
    var editModelInputMode = Vue.ref('platform');
    var editSelectedModelId = Vue.ref('');
    var editManualModelConfig = Vue.ref(
      window.emptyManualModelConfig
        ? window.emptyManualModelConfig()
        : { baseUrl: '', apiKey: '', model: '', providerName: '' }
    );
    var editOriginalModelConfig = Vue.ref(null);

    function resetEditForm() {
      editForm.value = { name: '', description: '', avatar: '', expertise: [] };
      editExpertiseTagInput.value = '';
      editingExpert.value = null;
      editModelInputMode.value = 'platform';
      editSelectedModelId.value = '';
      editManualModelConfig.value = window.emptyManualModelConfig
        ? window.emptyManualModelConfig()
        : { baseUrl: '', apiKey: '', model: '', providerName: '' };
      editOriginalModelConfig.value = null;
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
      var currentModel = (mc && mc.model) || expert.model || '';
      editManualModelConfig.value = {
        baseUrl: (mc && mc.baseUrl) || '',
        apiKey: (mc && mc.apiKey) || '',
        model: currentModel,
        providerName: (mc && mc.providerName) || ''
      };
      var mode = window.inferModelInputMode
        ? window.inferModelInputMode(mc, currentModel)
        : 'platform';
      editModelInputMode.value = mode;
      var catalogHit = window.findModelInCatalog ? window.findModelInCatalog(currentModel) : null;
      editSelectedModelId.value = catalogHit ? catalogHit.id : '';
      editOriginalModelConfig.value = snapshotModelConfig(mc || (currentModel ? {
        model: currentModel,
        providerName: '',
        baseUrl: '',
        apiKey: '',
        providerSlug: expert.provider || ''
      } : null));
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

    function buildUpdatedModelConfig() {
      if (editModelInputMode.value === 'manual') {
        return window.manualFormToModelConfig
          ? window.manualFormToModelConfig(editManualModelConfig.value, store)
          : {
              baseUrl: editManualModelConfig.value.baseUrl || '',
              apiKey: editManualModelConfig.value.apiKey || '',
              model: editManualModelConfig.value.model || '',
              providerName: editManualModelConfig.value.providerName || '',
              providerSlug: 'custom'
            };
      }
      var selected = window.findModelInCatalog
        ? window.findModelInCatalog(editSelectedModelId.value)
        : null;
      if (!selected) return null;
      var cfg = window.modelCatalogToConfig
        ? window.modelCatalogToConfig(selected)
        : {
            baseUrl: selected.baseUrl || '',
            apiKey: '',
            model: selected.name || selected.id,
            providerName: selected.providerName || '',
            providerSlug: selected.providerSlug || 'custom'
          };
      if (cfg && store && store.resolveProviderSlug) {
        cfg.providerSlug = store.resolveProviderSlug(cfg.providerName, cfg.baseUrl);
      }
      return cfg;
    }

    function submitEdit() {
      var expert = editingExpert.value || (options.getExpert && options.getExpert());
      if (!expert) return;
      if (!editForm.value.name.trim() || !editForm.value.description.trim()) {
        ElementPlus.ElMessage.warning('请填写专家名称和介绍');
        return;
      }
      if (editModelInputMode.value === 'manual') {
        var manualErr = window.validateManualModelConfig
          ? window.validateManualModelConfig(editManualModelConfig.value)
          : null;
        if (manualErr) {
          ElementPlus.ElMessage.warning(manualErr);
          return;
        }
      } else {
        if (!String(editSelectedModelId.value || '').trim()) {
          ElementPlus.ElMessage.warning('请选择默认模型');
          return;
        }
        var catalogModel = window.findModelInCatalog
          ? window.findModelInCatalog(editSelectedModelId.value)
          : null;
        if (!catalogModel) {
          ElementPlus.ElMessage.warning('所选模型无效，请重新选择');
          return;
        }
      }

      var updatedModelConfig = buildUpdatedModelConfig();
      if (!updatedModelConfig) {
        ElementPlus.ElMessage.warning('请完善默认模型配置');
        return;
      }
      var modelChanged = !modelConfigEqual(updatedModelConfig, editOriginalModelConfig.value);

      var updated = Object.assign({}, expert, {
        name: editForm.value.name.trim(),
        description: editForm.value.description.trim(),
        avatar: editForm.value.avatar || expert.avatar,
        expertise: editForm.value.expertise.slice(0, 10)
      });
      if (modelChanged) {
        updated.modelConfig = updatedModelConfig;
        updated.model = updatedModelConfig.model;
        updated.provider = updatedModelConfig.providerSlug;
      }
      store.saveExpert(updated);
      closeEditDialog();
      if (options.onSaved) options.onSaved();
      if (modelChanged) {
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
      editModelInputMode: editModelInputMode,
      editSelectedModelId: editSelectedModelId,
      editManualModelConfig: editManualModelConfig,
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
      headerSubtitle: { type: String, default: '修改专家基本信息与默认模型配置' },
      tagColors: { type: Array, default: function () { return window.TAG_COLORS || []; } },
      modelInputMode: { type: String, default: 'platform' },
      selectedModelId: { type: String, default: '' },
      manualModelConfig: { type: Object, required: true }
    },
    emits: [
      'update:visible',
      'update:tagInput',
      'update:modelInputMode',
      'update:selectedModelId',
      'submit',
      'closed',
      'avatar-change',
      'add-tag',
      'remove-tag',
      'tag-keydown'
    ],
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

      function onModelInputMode(val) {
        ctx.emit('update:modelInputMode', val || 'platform');
      }

      function onSelectedModelId(val) {
        ctx.emit('update:selectedModelId', val || '');
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
        onModelInputMode: onModelInputMode,
        onSelectedModelId: onSelectedModelId
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
          <div class="edit-model-section">\
            <model-config-section\
              :mode="modelInputMode"\
              :selected-model-id="selectedModelId"\
              :manual-config="manualModelConfig"\
              :show-mode-switch="false"\
              required\
              @update:mode="onModelInputMode"\
              @update:selected-model-id="onSelectedModelId" />\
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
        editModelInputMode: props.edit.editModelInputMode,
        editSelectedModelId: props.edit.editSelectedModelId,
        editManualModelConfig: props.edit.editManualModelConfig,
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
        v-model:model-input-mode="editModelInputMode"\
        v-model:selected-model-id="editSelectedModelId"\
        :manual-model-config="editManualModelConfig"\
        @submit="submitEdit"\
        @closed="resetEditForm"\
        @avatar-change="handleEditAvatarChange"\
        @add-tag="addEditExpertiseTag"\
        @remove-tag="removeEditExpertiseTag"\
        @tag-keydown="onEditExpertiseTagKeydown" />'
  };
})();
