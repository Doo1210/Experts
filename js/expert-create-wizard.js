/**
 * 专家创建向导 - 单步弹窗（PRD §7）
 * 身份信息 + 模型，人设/技能/工具/工作空间在详情页配置
 */
(function () {
  var readImageFile = window.readImageFile;

  function pinyinSlug(name) {
    var map = {
      '首席': 'shouxi', '工艺': 'gongyi', '专家': 'expert', '算法': 'suanfa', '架构': 'jiagou', '师': 'shi',
      '设备': 'shebei', '运维': 'yunwei', '总监': 'zongjian', '供应链': 'gongyinglian', '规划': 'guihua',
      '质量': 'zhiliang', '体系': 'tixi', '建设': 'jianshe', '顾问': 'guwen', '数字化': 'shuzihua', '转型': 'zhuanxing',
      '能源': 'nengyuan', '管理': 'guanli', '安全': 'anquan', '合规': 'hegui', '人机': 'renji', '协作': 'xiezuo',
      'AI': 'ai', '视觉': 'shijue', '检测': 'jiance', '维护': 'weihu', '预测': 'yuce', '分析': 'fenxi',
      '优化': 'youhua', '规划': 'guihua', '审计': 'shenji', '评估': 'pinggu', '智能': 'zhineng', '制造': 'zhizao',
      '产线': 'chanxian', '数据': 'shuju', '系统': 'xitong', '集成': 'jicheng', '平台': 'pingtai'
    };
    var result = '';
    var remaining = String(name || '').trim();
    while (remaining.length > 0) {
      var matched = false;
      for (var len = Math.min(4, remaining.length); len >= 1; len--) {
        var chunk = remaining.slice(0, len);
        if (map[chunk]) {
          result += (result ? '-' : '') + map[chunk];
          remaining = remaining.slice(len);
          matched = true;
          break;
        }
      }
      if (!matched) {
        var ch = remaining[0];
        if (/[a-zA-Z0-9]/.test(ch)) {
          result += ch.toLowerCase();
        } else if (ch === ' ' || ch === '-' || ch === '_') {
          if (result && result[result.length - 1] !== '-') result += '-';
        }
        remaining = remaining.slice(1);
      }
    }
    result = result.replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
    return result || ('expert-' + Date.now().toString(36));
  }

  window.createExpertCreateForm = function (store, options) {
    options = options || {};
    var showCreateDialog = Vue.ref(false);
    var saving = Vue.ref(false);
    var createAvatarInput = Vue.ref(null);
    var showCancelConfirm = Vue.ref(false);

    function emptyCreateForm() {
      return {
        source: 'blank',
        cloneFrom: '',
        avatar: '',
        name: '',
        slug: '',
        slugEdited: false,
        description: '',
        expertise: [],
        modelInputMode: 'platform',
        selectedModelId: '',
        modelConfig: window.emptyManualModelConfig
          ? window.emptyManualModelConfig()
          : { baseUrl: '', apiKey: '', model: '', providerName: '' }
      };
    }

    var createForm = Vue.ref(emptyCreateForm());
    var expertiseTagInput = Vue.ref('');
    var sourcePickerVisible = Vue.ref(false);
    var sourceSearchQuery = Vue.ref('');

    function resetCreateForm() {
      createForm.value = emptyCreateForm();
      expertiseTagInput.value = '';
      showCancelConfirm.value = false;
      sourcePickerVisible.value = false;
      sourceSearchQuery.value = '';
    }

    var sourceExperts = Vue.computed(function () {
      var source = createForm.value.source;
      if (source === 'template') {
        return store.getExperts().filter(function (e) {
          return e && e.origin === 'template';
        });
      }
      if (source === 'existing') {
        return store.getExperts().filter(function (e) {
          return e && e.origin !== 'template' && String(e.id) !== 'default';
        });
      }
      return [];
    });

    var filteredSourceExperts = Vue.computed(function () {
      var q = sourceSearchQuery.value.trim().toLowerCase();
      if (!q) return sourceExperts.value;
      return sourceExperts.value.filter(function (e) {
        return (e.name || '').toLowerCase().indexOf(q) >= 0 ||
          (e.description || '').toLowerCase().indexOf(q) >= 0 ||
          (e.expertise || e.tags || []).join(' ').toLowerCase().indexOf(q) >= 0;
      });
    });

    var sourceSelectedName = Vue.computed(function () {
      if (!createForm.value.cloneFrom) return '';
      var found = sourceExperts.value.find(function (e) {
        return String(e.id) === String(createForm.value.cloneFrom);
      });
      return found ? found.name : '';
    });

    var sourceModeLabel = Vue.computed(function () {
      return createForm.value.source === 'template' ? '专家模板' : '已有专家';
    });

    var basicOriginText = Vue.computed(function () {
      if (createForm.value.source === 'template' && createForm.value.cloneFrom) return '已从模板带入';
      if (createForm.value.source === 'existing' && createForm.value.cloneFrom) return '已从已有专家带入';
      return '手动填写';
    });

    var modelOriginText = Vue.computed(function () {
      if (createForm.value.source === 'existing' && createForm.value.cloneFrom && createForm.value.selectedModelId) {
        return '已带入，可修改';
      }
      return '需要配置';
    });

    var modelHint = Vue.computed(function () {
      if (createForm.value.source === 'template') {
        return '专家模板仅带入基本信息，默认模型需要为新专家单独配置';
      }
      if (createForm.value.source === 'existing' && createForm.value.cloneFrom) {
        return createForm.value.selectedModelId
          ? '已复制「' + sourceSelectedName.value + '」的默认模型，可重新选择'
          : '原专家的默认模型不在平台模型目录中，请重新选择';
      }
      if (createForm.value.source === 'existing') {
        return '选择已有专家后，将同时带入其默认模型配置';
      }
      return '作为专家的默认模型，对话任务未选择其他模型时使用此模型';
    });

    function clearBasicInfo() {
      createForm.value.avatar = '';
      createForm.value.name = '';
      createForm.value.slug = '';
      createForm.value.slugEdited = false;
      createForm.value.description = '';
      createForm.value.expertise = [];
      expertiseTagInput.value = '';
    }

    function clearModelConfig() {
      createForm.value.modelInputMode = 'platform';
      createForm.value.selectedModelId = '';
      createForm.value.modelConfig = window.emptyManualModelConfig
        ? window.emptyManualModelConfig()
        : { baseUrl: '', apiKey: '', model: '', providerName: '' };
    }

    function copyBasicInfo(ex, appendCopySuffix) {
      if (!ex) return;
      var nextName = (ex.name || '').trim();
      if (appendCopySuffix && nextName && nextName.length <= 28) nextName += ' 副本';
      createForm.value.avatar = ex.avatar || '';
      createForm.value.name = nextName;
      createForm.value.description = ex.description || '';
      createForm.value.expertise = (ex.expertise || ex.tags || []).slice(0, 3);
      createForm.value.slugEdited = false;
      onNameInput();
    }

    function copyModelConfig(ex) {
      var mc = (ex && ex.modelConfig) || null;
      var currentModel = (mc && mc.model) || (ex && ex.model) || '';
      clearModelConfig();
      var catalogHit = window.findModelInCatalog ? window.findModelInCatalog(currentModel) : null;
      createForm.value.selectedModelId = catalogHit ? catalogHit.id : '';
    }

    function selectSourceExpert(ex) {
      createForm.value.cloneFrom = ex.id;
      copyBasicInfo(ex, createForm.value.source === 'existing');
      if (createForm.value.source === 'existing') copyModelConfig(ex);
      else clearModelConfig();
      sourcePickerVisible.value = false;
    }

    var isCloneMode = Vue.computed(function () {
      return createForm.value.source !== 'blank';
    });

    var modelFormDisabled = Vue.computed(function () {
      return false;
    });

    function onNameInput() {
      if (!createForm.value.slugEdited) {
        createForm.value.slug = pinyinSlug(createForm.value.name);
      }
    }

    function onSlugInput() {
      createForm.value.slugEdited = true;
      var v = String(createForm.value.slug || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      createForm.value.slug = v;
    }

    function onSourceChange() {
      createForm.value.cloneFrom = '';
      sourceSearchQuery.value = '';
      sourcePickerVisible.value = false;
      clearBasicInfo();
      clearModelConfig();
      if (createForm.value.source !== 'blank') {
        Vue.nextTick(function () {
          sourcePickerVisible.value = true;
        });
      }
    }

    function setCreateSource(source) {
      if (createForm.value.source === source) {
        if (source !== 'blank') sourcePickerVisible.value = true;
        return;
      }
      createForm.value.source = source;
      onSourceChange();
    }

    function addCreateExpertiseTag() {
      var tag = expertiseTagInput.value.trim();
      if (!tag) return;
      if (createForm.value.expertise.length >= 3) {
        ElementPlus.ElMessage.warning('擅长领域最多添加 3 个');
        return;
      }
      if (tag.length > 20) {
        ElementPlus.ElMessage.warning('每个标签最多 20 个字符');
        return;
      }
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

    function openCreateFromTemplate(expert) {
      resetCreateForm();
      if (expert) {
        createForm.value.source = 'template';
        createForm.value.cloneFrom = expert.id;
        copyBasicInfo(expert, false);
        clearModelConfig();
        sourcePickerVisible.value = false;
      }
      showCreateDialog.value = true;
    }

    function closeCreateDialog() {
      showCreateDialog.value = false;
      resetCreateForm();
    }

    function attemptClose() {
      var f = createForm.value;
      var hasContent = f.name || f.description || f.avatar || f.expertise.length > 0;
      if (hasContent) {
        showCancelConfirm.value = true;
      } else {
        closeCreateDialog();
      }
    }

    function validateForm() {
      var f = createForm.value;
      if (!f.name.trim()) {
        ElementPlus.ElMessage.warning('请填写专家名称');
        return false;
      }
      if (f.name.trim().length > 32) {
        ElementPlus.ElMessage.warning('专家名称最多 32 个字符');
        return false;
      }
      var slug = pinyinSlug(f.name.trim());
      if (!slug) {
        ElementPlus.ElMessage.warning('无法根据名称生成 slug，请修改专家名称');
        return false;
      }
      var existing = store.getExperts();
      var baseSlug = slug;
      var finalSlug = slug;
      var i = 2;
      while (existing.some(function (e) {
        return String(e.id) === finalSlug || String(e.slug || '') === finalSlug;
      })) {
        finalSlug = baseSlug + '-' + i;
        i++;
      }
      f.slug = finalSlug;
      if (!f.description.trim()) {
        ElementPlus.ElMessage.warning('请填写专家介绍');
        return false;
      }
      if (f.description.trim().length > 200) {
        ElementPlus.ElMessage.warning('专家介绍最多 200 个字符');
        return false;
      }
      if (f.source !== 'blank' && !f.cloneFrom) {
        ElementPlus.ElMessage.warning('请选择' + (f.source === 'template' ? '专家模板' : '要复制的已有专家'));
        return false;
      }
      if (!String(f.selectedModelId || '').trim()) {
        ElementPlus.ElMessage.warning('请选择默认模型');
        return false;
      }
      var catalogModel = window.findModelInCatalog
        ? window.findModelInCatalog(f.selectedModelId)
        : null;
      if (!catalogModel) {
        ElementPlus.ElMessage.warning('所选模型无效，请重新选择');
        return false;
      }
      return true;
    }

    function submitCreate() {
      if (!validateForm()) return;
      saving.value = true;
      var f = createForm.value;
      var selected = window.findModelInCatalog
        ? window.findModelInCatalog(f.selectedModelId)
        : null;
      var modelConfig = window.modelCatalogToConfig
        ? window.modelCatalogToConfig(selected)
        : {
            baseUrl: (selected && selected.baseUrl) || '',
            apiKey: '',
            model: (selected && (selected.name || selected.id)) || f.selectedModelId,
            providerName: (selected && selected.providerName) || ''
          };
      var expert = store.createExpert({
        slug: f.slug,
        name: f.name.trim(),
        description: f.description.trim(),
        avatar: f.avatar || undefined,
        expertise: f.expertise.slice(0, 3),
        tags: f.expertise.slice(0, 3),
        modelConfig: modelConfig,
        source: f.source,
        cloneFrom: f.source === 'blank' ? '' : f.cloneFrom
      });
      saving.value = false;
      showCreateDialog.value = false;
      resetCreateForm();
      ElementPlus.ElMessage.success('专家创建成功');
      if (options.onCreated) options.onCreated(expert);
    }

    return {
      showCreateDialog: showCreateDialog,
      createForm: createForm,
      createAvatarInput: createAvatarInput,
      expertiseTagInput: expertiseTagInput,
      saving: saving,
      showCancelConfirm: showCancelConfirm,
      sourceExperts: sourceExperts,
      filteredSourceExperts: filteredSourceExperts,
      sourceSelectedName: sourceSelectedName,
      sourceModeLabel: sourceModeLabel,
      sourcePickerVisible: sourcePickerVisible,
      sourceSearchQuery: sourceSearchQuery,
      selectSourceExpert: selectSourceExpert,
      basicOriginText: basicOriginText,
      modelOriginText: modelOriginText,
      modelHint: modelHint,
      isCloneMode: isCloneMode,
      modelFormDisabled: modelFormDisabled,
      onSelectedModelChange: function (model) {
        createForm.value.selectedModelId = model ? model.id : '';
      },
      onNameInput: onNameInput,
      onSlugInput: onSlugInput,
      onSourceChange: onSourceChange,
      setCreateSource: setCreateSource,
      resetCreateForm: resetCreateForm,
      openCreateDialog: openCreateDialog,
      openCreateFromTemplate: openCreateFromTemplate,
      closeCreateDialog: closeCreateDialog,
      attemptClose: attemptClose,
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
      tagColors: { type: Array, default: function () { return window.TAG_COLORS || []; } }
    },
    setup: function (props) {
      var w = props.wizard;
      return {
        showCreateDialog: w.showCreateDialog,
        createForm: w.createForm,
        createAvatarInput: w.createAvatarInput,
        expertiseTagInput: w.expertiseTagInput,
        saving: w.saving,
        showCancelConfirm: w.showCancelConfirm,
        sourceExperts: w.sourceExperts,
        filteredSourceExperts: w.filteredSourceExperts,
        sourceSelectedName: w.sourceSelectedName,
        sourceModeLabel: w.sourceModeLabel,
        sourcePickerVisible: w.sourcePickerVisible,
        sourceSearchQuery: w.sourceSearchQuery,
        selectSourceExpert: w.selectSourceExpert,
        basicOriginText: w.basicOriginText,
        modelOriginText: w.modelOriginText,
        modelHint: w.modelHint,
        isCloneMode: w.isCloneMode,
        modelFormDisabled: w.modelFormDisabled,
        onSelectedModelChange: w.onSelectedModelChange,
        onNameInput: w.onNameInput,
        onSlugInput: w.onSlugInput,
        onSourceChange: w.onSourceChange,
        setCreateSource: w.setCreateSource,
        resetCreateForm: w.resetCreateForm,
        openCreateDialog: w.openCreateDialog,
        closeCreateDialog: w.closeCreateDialog,
        attemptClose: w.attemptClose,
        submitCreate: w.submitCreate,
        triggerCreateAvatarUpload: w.triggerCreateAvatarUpload,
        handleCreateAvatarChange: w.handleCreateAvatarChange,
        addCreateExpertiseTag: w.addCreateExpertiseTag,
        removeCreateExpertiseTag: w.removeCreateExpertiseTag,
        onExpertiseTagKeydown: w.onExpertiseTagKeydown,
        tagColors: Vue.computed(function () { return props.tagColors; })
      };
    },
    template: [
      '<el-dialog v-model="showCreateDialog" width="900px" class="form-dialog form-dialog-expert form-dialog-expert-wizard" :close-on-click-modal="false" @closed="resetCreateForm">',
      '  <template #header>',
      '    <div class="dialog-header-custom dialog-header-expert-wizard">',
      '      <div class="dialog-header-icon dialog-header-icon-create" :class="{ \'dialog-header-icon-has-avatar\': createForm.avatar }">',
      '        <img v-if="createForm.avatar" :src="createForm.avatar" alt="" class="dialog-header-avatar">',
      '        <span v-else class="dialog-header-avatar-placeholder">\u{1F464}</span>',
      '      </div>',
      '      <div class="dialog-header-text">',
      '        <div class="dialog-header-title">新建专家</div>',
      '        <div class="dialog-header-sub">选择创建方式，确认专家基本信息与默认模型配置</div>',
      '      </div>',
      '    </div>',
      '  </template>',
      '  <div class="form-dialog-body">',
      '    <section class="create-method-section">',
      '      <div class="create-section-heading">',
      '        <div>',
      '          <div class="create-section-kicker">创建方式</div>',
      '          <div class="create-section-caption">不同方式会带入不同范围的信息</div>',
      '        </div>',
      '        <span class="create-step-indicator">1 / 2</span>',
      '      </div>',
      '      <div class="create-method-grid" role="group" aria-label="选择创建方式">',
      '        <button type="button" class="create-method-card" :class="{ \'is-active\': createForm.source === \'blank\' }" :aria-pressed="createForm.source === \'blank\'" @click="setCreateSource(\'blank\')">',
      '          <span class="create-method-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18M3 12h18"/></svg></span>',
      '          <span class="create-method-content"><strong>从零开始</strong><small>所有信息均由你填写</small><span class="create-method-tags"><i>不继承信息</i></span></span>',
      '          <span class="create-method-check"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4L19 6"/></svg></span>',
      '        </button>',
      '        <button type="button" class="create-method-card" :class="{ \'is-active\': createForm.source === \'template\' }" :aria-pressed="createForm.source === \'template\'" @click="setCreateSource(\'template\')">',
      '          <span class="create-method-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg></span>',
      '          <span class="create-method-content"><strong>复制专家模板</strong><small>使用预设角色快速开始</small><span class="create-method-tags"><i>专家基本信息</i></span></span>',
      '          <span class="create-method-check"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4L19 6"/></svg></span>',
      '        </button>',
      '        <button type="button" class="create-method-card" :class="{ \'is-active\': createForm.source === \'existing\' }" :aria-pressed="createForm.source === \'existing\'" @click="setCreateSource(\'existing\')">',
      '          <span class="create-method-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg></span>',
      '          <span class="create-method-content"><strong>复制已有专家</strong><small>创建一个可编辑副本</small><span class="create-method-tags"><i>专家基本信息</i><i>默认模型配置</i></span></span>',
      '          <span class="create-method-check"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4L19 6"/></svg></span>',
      '        </button>',
      '      </div>',
      '      <div v-if="createForm.source !== \'blank\'" class="create-source-panel">',
      '        <div class="create-source-panel-label">',
      '          <span>选择{{ sourceModeLabel }}<b>*</b></span>',
      '          <small>{{ createForm.source === \'template\' ? \'将带入头像、名称、介绍与擅长领域\' : \'将带入专家基本信息与默认模型配置\' }}</small>',
      '        </div>',
      '        <el-popover v-model:visible="sourcePickerVisible" trigger="click" placement="bottom-start" :width="440" popper-class="clone-expert-popover">',
      '          <template #reference>',
      '            <button type="button" class="create-source-trigger" :class="{ \'has-value\': sourceSelectedName }">',
      '              <span>{{ sourceSelectedName || (\'请选择\' + sourceModeLabel) }}</span>',
      '              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
      '            </button>',
      '          </template>',
      '          <div class="clone-expert-picker">',
      '            <el-input v-model="sourceSearchQuery" :placeholder="\'搜索\' + sourceModeLabel" clearable>',
      '              <template #prefix><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg></template>',
      '            </el-input>',
      '            <div v-if="filteredSourceExperts.length" class="clone-expert-list">',
      '              <button v-for="expert in filteredSourceExperts" :key="expert.id" type="button" class="clone-expert-item" :class="{ \'clone-expert-item-active\': String(createForm.cloneFrom) === String(expert.id) }" @click="selectSourceExpert(expert)">',
      '                <img class="clone-expert-item-avatar" :src="expert.avatar" alt="">',
      '                <span class="clone-expert-item-text"><span class="clone-expert-item-name">{{ expert.name }}</span><span class="clone-expert-item-desc">{{ expert.description }}</span></span>',
      '                <svg v-if="String(createForm.cloneFrom) === String(expert.id)" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" class="clone-expert-item-check"><path d="M5 12l4 4L19 6"/></svg>',
      '              </button>',
      '            </div>',
      '            <div v-else class="clone-expert-empty">暂无可选择的{{ sourceModeLabel }}</div>',
      '          </div>',
      '        </el-popover>',
      '      </div>',
      '      <div v-if="createForm.source !== \'blank\'" class="create-inherit-notice">',
      '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16.5 8"/></svg>',
      '        <span v-if="createForm.source === \'template\'">模板仅带入专家基本信息，默认模型需重新配置；带入后均可编辑。</span>',
      '        <span v-else>已有专家会带入基本信息和默认模型配置；带入后均可编辑。</span>',
      '      </div>',
      '    </section>',
      '    <section class="create-detail-section">',
      '      <div class="create-section-heading">',
      '        <div><div class="create-section-kicker">完善专家信息</div><div class="create-section-caption">确认带入内容，并按需调整</div></div>',
      '        <span class="create-step-indicator">2 / 2</span>',
      '      </div>',
      '      <div class="create-detail-grid">',
      '        <div class="create-config-panel">',
      '          <div class="create-config-panel-head"><span>专家基本信息</span><em>{{ basicOriginText }}</em></div>',
      '          <div class="create-basic-layout">',
      '            <div class="create-basic-avatar-card create-avatar-upload" role="button" tabindex="0" @click="triggerCreateAvatarUpload" @keydown.enter="triggerCreateAvatarUpload">',
      '              <input ref="createAvatarInput" type="file" accept="image/*" class="create-avatar-input" @change="handleCreateAvatarChange" @click.stop>',
      '              <div v-if="createForm.avatar" class="create-avatar-preview-wrap">',
      '                <img :src="createForm.avatar" class="create-basic-avatar" alt="头像预览">',
      '                <div class="create-avatar-overlay"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>更换头像</span></div>',
      '              </div>',
      '              <div v-else class="create-avatar-empty"><div class="create-avatar-empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><span class="create-avatar-empty-text">上传头像</span><span class="create-avatar-empty-hint">JPG / PNG</span></div>',
      '            </div>',
      '            <el-form label-position="top" class="form-dialog-form create-basic-form">',
      '              <el-form-item label="专家名称" required><el-input v-model="createForm.name" placeholder="如：首席工艺专家" @input="onNameInput" /></el-form-item>',
      '              <el-form-item label="专家介绍" required><el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="简要描述专家定位、能力与使用场景" /></el-form-item>',
      '            </el-form>',
      '          </div>',
      '          <div class="create-expertise-compact">',
      '            <div class="expertise-tag-editor-head"><span class="expertise-tag-editor-label">擅长领域</span><span class="expertise-tag-editor-optional">选填，最多 3 个</span></div>',
      '            <div v-if="createForm.expertise.length" class="expertise-tag-chips">',
      '              <span v-for="(tag, idx) in createForm.expertise" :key="tag" class="expertise-tag-chip expertise-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}<button type="button" class="expertise-tag-chip-remove" aria-label="移除" @click="removeCreateExpertiseTag(tag)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button></span>',
      '            </div>',
      '            <div class="expertise-tag-input-row"><el-input v-model="expertiseTagInput" placeholder="输入领域，按 Enter 添加" @keydown="onExpertiseTagKeydown" /><el-button type="primary" plain @click="addCreateExpertiseTag">添加</el-button></div>',
      '          </div>',
      '        </div>',
      '        <div class="create-config-panel create-model-panel">',
      '          <div class="create-config-panel-head"><span>默认模型配置</span><em>{{ modelOriginText }}</em></div>',
      '          <model-config-section',
      '            v-model:mode="createForm.modelInputMode"',
      '            v-model:selected-model-id="createForm.selectedModelId"',
      '            :manual-config="createForm.modelConfig"',
      '            :disabled="modelFormDisabled"',
      '            required',
      '            :show-mode-switch="false"',
      '            :hint="modelHint"',
      '            @platform-change="onSelectedModelChange"',
      '          />',
      '        </div>',
      '      </div>',
      '    </section>',
      '  </div>',
      '  <template #footer>',
      '    <div class="dialog-footer-custom">',
      '      <el-button @click="attemptClose">取消</el-button>',
      '      <el-button type="primary" :loading="saving" @click="submitCreate">创建并进入</el-button>',
      '    </div>',
      '  </template>',
      '  <el-dialog v-model="showCancelConfirm" title="放弃当前填写？" width="400px" append-to-body>',
      '    <p>当前表单内容将被丢弃，确定放弃吗？</p>',
      '    <template #footer>',
      '      <el-button @click="showCancelConfirm = false">继续编辑</el-button>',
      '      <el-button type="danger" @click="showCancelConfirm = false; closeCreateDialog()">放弃</el-button>',
      '    </template>',
      '  </el-dialog>',
      '</el-dialog>'
    ].join('\n')
  };
})();
