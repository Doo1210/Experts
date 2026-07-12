/**
 * 专家创建向导 - 单步弹窗（PRD §7）
 * 来源 + 身份信息 + 模型，人设/技能/工具/工作空间在详情页配置
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
        provider: '',
        model: ''
      };
    }

    var createForm = Vue.ref(emptyCreateForm());
    var expertiseTagInput = Vue.ref('');
    var clonePickerVisible = Vue.ref(false);
    var cloneSearchQuery = Vue.ref('');

    function resetCreateForm() {
      createForm.value = emptyCreateForm();
      expertiseTagInput.value = '';
      showCancelConfirm.value = false;
      clonePickerVisible.value = false;
      cloneSearchQuery.value = '';
    }

    var cloneableExperts = Vue.computed(function () {
      return store.getExperts().filter(function (e) {
        return String(e.id) !== 'default';
      });
    });

    var filteredCloneExperts = Vue.computed(function () {
      var q = cloneSearchQuery.value.trim().toLowerCase();
      if (!q) return cloneableExperts.value;
      return cloneableExperts.value.filter(function (e) {
        return (e.name || '').toLowerCase().indexOf(q) >= 0 ||
          (e.description || '').toLowerCase().indexOf(q) >= 0;
      });
    });

    var cloneSelectedName = Vue.computed(function () {
      if (!createForm.value.cloneFrom) return '';
      var found = cloneableExperts.value.find(function (e) {
        return String(e.id) === String(createForm.value.cloneFrom);
      });
      return found ? found.name : '';
    });

    function selectCloneExpert(ex) {
      createForm.value.cloneFrom = ex.id;
      clonePickerVisible.value = false;
    }

    var providerList = Vue.computed(function () {
      return window.PROVIDER_CATALOG || [];
    });

    var modelList = Vue.computed(function () {
      if (!createForm.value.provider) return [];
      return window.getProviderModels ? window.getProviderModels(createForm.value.provider) : [];
    });

    var isCloneMode = Vue.computed(function () {
      return createForm.value.source !== 'blank';
    });

    var modelDisabled = Vue.computed(function () {
      return isCloneMode.value;
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
      if (createForm.value.source === 'blank') {
        createForm.value.cloneFrom = '';
        clonePickerVisible.value = false;
      } else if (createForm.value.source === 'default') {
        createForm.value.cloneFrom = 'default';
        clonePickerVisible.value = false;
      } else if (createForm.value.source === 'clone') {
        createForm.value.cloneFrom = '';
        cloneSearchQuery.value = '';
        Vue.nextTick(function () {
          clonePickerVisible.value = true;
        });
      }
    }

    function onProviderChange() {
      createForm.value.model = '';
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
      if (f.source === 'blank') {
        if (!f.provider) {
          ElementPlus.ElMessage.warning('请选择 Provider');
          return false;
        }
        if (!f.model) {
          ElementPlus.ElMessage.warning('请选择模型');
          return false;
        }
      }
      if (f.source === 'clone' && !f.cloneFrom) {
        ElementPlus.ElMessage.warning('请选择要复制的专家');
        return false;
      }
      return true;
    }

    function submitCreate() {
      if (!validateForm()) return;
      saving.value = true;
      var f = createForm.value;
      var expert = store.createExpert({
        slug: f.slug,
        name: f.name.trim(),
        description: f.description.trim(),
        avatar: f.avatar || undefined,
        expertise: f.expertise.slice(0, 3),
        tags: f.expertise.slice(0, 3),
        model: f.source === 'blank' ? f.model : '',
        provider: f.source === 'blank' ? f.provider : '',
        source: f.source,
        cloneFrom: f.source === 'clone' ? f.cloneFrom : (f.source === 'default' ? 'default' : '')
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
      cloneableExperts: cloneableExperts,
      filteredCloneExperts: filteredCloneExperts,
      cloneSelectedName: cloneSelectedName,
      clonePickerVisible: clonePickerVisible,
      cloneSearchQuery: cloneSearchQuery,
      selectCloneExpert: selectCloneExpert,
      providerList: providerList,
      modelList: modelList,
      isCloneMode: isCloneMode,
      modelDisabled: modelDisabled,
      onNameInput: onNameInput,
      onSlugInput: onSlugInput,
      onSourceChange: onSourceChange,
      onProviderChange: onProviderChange,
      resetCreateForm: resetCreateForm,
      openCreateDialog: openCreateDialog,
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
        cloneableExperts: w.cloneableExperts,
        filteredCloneExperts: w.filteredCloneExperts,
        cloneSelectedName: w.cloneSelectedName,
        clonePickerVisible: w.clonePickerVisible,
        cloneSearchQuery: w.cloneSearchQuery,
        selectCloneExpert: w.selectCloneExpert,
        providerList: w.providerList,
        modelList: w.modelList,
        isCloneMode: w.isCloneMode,
        modelDisabled: w.modelDisabled,
        onNameInput: w.onNameInput,
        onSlugInput: w.onSlugInput,
        onSourceChange: w.onSourceChange,
        onProviderChange: w.onProviderChange,
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
      '<el-dialog v-model="showCreateDialog" width="640px" class="form-dialog form-dialog-expert form-dialog-expert-wizard" :close-on-click-modal="false" @closed="resetCreateForm">',
      '  <template #header>',
      '    <div class="dialog-header-custom dialog-header-expert-wizard">',
      '      <div class="dialog-header-icon dialog-header-icon-create" :class="{ \'dialog-header-icon-has-avatar\': createForm.avatar }">',
      '        <img v-if="createForm.avatar" :src="createForm.avatar" alt="" class="dialog-header-avatar">',
      '        <span v-else class="dialog-header-avatar-placeholder">\u{1F464}</span>',
      '      </div>',
      '      <div class="dialog-header-text">',
      '        <div class="dialog-header-title">新建专家</div>',
      '        <div class="dialog-header-sub">填写身份信息与模型，即可创建可用专家</div>',
      '      </div>',
      '    </div>',
      '  </template>',
      '  <div class="form-dialog-body">',
      '    <div class="create-basic-hero">',
      '      <div class="create-basic-avatar-card create-avatar-upload" role="button" tabindex="0" @click="triggerCreateAvatarUpload" @keydown.enter="triggerCreateAvatarUpload">',
      '        <input ref="createAvatarInput" type="file" accept="image/*" class="create-avatar-input" @change="handleCreateAvatarChange" @click.stop>',
      '        <div v-if="createForm.avatar" class="create-avatar-preview-wrap">',
      '          <img :src="createForm.avatar" class="create-basic-avatar" alt="头像预览">',
      '          <div class="create-avatar-overlay">',
      '            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
      '            <span>更换头像</span>',
      '          </div>',
      '        </div>',
      '        <div v-else class="create-avatar-empty">',
      '          <div class="create-avatar-empty-icon">',
      '            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
      '          </div>',
      '          <span class="create-avatar-empty-text">点击上传头像</span>',
      '          <span class="create-avatar-empty-hint">支持 JPG、PNG，最大 2MB</span>',
      '        </div>',
      '      </div>',
      '      <el-form label-position="top" class="form-dialog-form create-basic-form">',
      '        <el-form-item label="专家名称" required>',
      '          <el-input v-model="createForm.name" placeholder="如：首席工艺专家" size="large" @input="onNameInput" />',
      '        </el-form-item>',
      '        <el-form-item label="专家介绍" required>',
      '          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="简要描述专家能力与经验背景" />',
      '        </el-form-item>',
      '      </el-form>',
      '    </div>',
      '    <div class="expertise-tag-editor">',
      '      <div class="expertise-tag-editor-head">',
      '        <span class="expertise-tag-editor-label">擅长领域</span>',
      '        <span class="expertise-tag-editor-optional">选填，最多 3 个</span>',
      '      </div>',
      '      <div v-if="createForm.expertise.length" class="expertise-tag-chips">',
      '        <span v-for="(tag, idx) in createForm.expertise" :key="tag" class="expertise-tag-chip expertise-tag" :class="tagColors[idx % tagColors.length]">',
      '          {{ tag }}',
      '          <button type="button" class="expertise-tag-chip-remove" title="移除" @click="removeCreateExpertiseTag(tag)">',
      '            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      '          </button>',
      '        </span>',
      '      </div>',
      '      <div class="expertise-tag-input-row">',
      '        <el-input v-model="expertiseTagInput" placeholder="输入领域标签，按 Enter 添加" @keydown="onExpertiseTagKeydown" />',
      '        <el-button type="primary" plain @click="addCreateExpertiseTag">添加</el-button>',
      '      </div>',
      '      <p class="form-dialog-hint expertise-tag-hint">可添加多个标签，如「SPC」「良率分析」「工艺优化」</p>',
      '    </div>',
      '    <div class="create-source-row">',
      '      <span class="create-source-label">来源</span>',
      '      <el-radio-group v-model="createForm.source" @change="onSourceChange">',
      '        <el-radio label="blank">从零开始</el-radio>',
      '        <el-radio label="default">复制 default</el-radio>',
      '        <el-radio label="clone">复制其他专家</el-radio>',
      '      </el-radio-group>',
      '      <el-popover v-if="createForm.source === \'clone\'" placement="bottom-start" :width="320" trigger="click" :visible="clonePickerVisible" @update:visible="clonePickerVisible = $event">',
      '        <template #reference>',
      '          <el-button size="small" style="margin-left:12px">{{ cloneSelectedName || \'选择专家\' }}</el-button>',
      '        </template>',
      '        <div class="clone-expert-picker">',
      '          <el-input v-model="cloneSearchQuery" placeholder="搜索专家名称..." size="small" clearable style="margin-bottom:10px" />',
      '          <div class="clone-expert-list">',
      '            <button v-for="ex in filteredCloneExperts" :key="ex.id" type="button" class="clone-expert-item" :class="{ \'clone-expert-item-active\': createForm.cloneFrom === ex.id }" @click="selectCloneExpert(ex)">',
      '              <img class="clone-expert-item-avatar" :src="ex.avatar" :alt="ex.name" />',
      '              <div class="clone-expert-item-text">',
      '                <div class="clone-expert-item-name">{{ ex.name }}</div>',
      '                <div class="clone-expert-item-desc">{{ ex.description }}</div>',
      '              </div>',
      '            </button>',
      '            <div v-if="filteredCloneExperts.length === 0" class="clone-expert-empty">无匹配专家</div>',
      '          </div>',
      '        </div>',
      '      </el-popover>',
      '    </div>',
      '    <div class="create-model-row">',
      '      <el-form label-position="top" class="form-dialog-form create-model-form">',
      '        <div class="create-model-form-row">',
      '          <el-form-item label="Provider" :required="!isCloneMode" style="flex:1">',
      '            <el-select v-model="createForm.provider" :disabled="isCloneMode" @change="onProviderChange" placeholder="选择 Provider" style="width:100%">',
      '              <el-option v-for="p in providerList" :key="p.id" :label="p.name" :value="p.id" />',
      '            </el-select>',
      '          </el-form-item>',
      '          <el-form-item label="模型" :required="!isCloneMode" style="flex:1">',
      '            <el-select v-model="createForm.model" :disabled="modelDisabled" placeholder="选择模型" style="width:100%">',
      '              <el-option v-for="m in modelList" :key="m.id" :label="m.name" :value="m.id" />',
      '            </el-select>',
      '          </el-form-item>',
      '        </div>',
      '        <p v-if="isCloneMode" class="form-dialog-hint">模型/Provider 沿用自源 profile</p>',
      '      </el-form>',
      '    </div>',
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
