/* 专家管理 · 基本信息内联编辑 */
(function () {
  var store = window.AppStore;
  var avatarPresetConfig = window.ExpertAvatarPresets || { DEFAULT: 'assets/expert-avatars/default.svg', list: [] };

  function modelSnapshot(config) {
    var c = config || {};
    return {
      providerSlug: c.providerSlug || '',
      providerName: c.providerName || '',
      baseUrl: c.baseUrl || '',
      apiKey: c.apiKey || '',
      model: c.model || ''
    };
  }

  window.ExpertBasicInfo = {
    props: ['expert', 'runningCount'],
    setup: function (props, ctx) {
      var form = Vue.ref({ name: '', description: '', avatar: avatarPresetConfig.DEFAULT });
      var modelMode = Vue.ref('platform');
      var selectedModelId = Vue.ref('');
      var manualModelConfig = Vue.ref(window.emptyManualModelConfig());
      var avatarInput = Vue.ref(null);
      var savedSignature = Vue.ref('');
      var originalModelConfig = Vue.ref(null);
      var loadedId = '';

      function signature() {
        return JSON.stringify({
          name: form.value.name,
          description: form.value.description,
          avatar: form.value.avatar,
          mode: modelMode.value,
          selectedModelId: selectedModelId.value,
          manualModelConfig: manualModelConfig.value
        });
      }

      function initialize(expert) {
        if (!expert) return;
        loadedId = String(expert.id);
        form.value = {
          name: expert.name || '',
          description: expert.description || '',
          avatar: expert.avatar || avatarPresetConfig.DEFAULT
        };
        var mc = expert.modelConfig || null;
        var currentModel = (mc && mc.model) || expert.model || '';
        manualModelConfig.value = {
          baseUrl: (mc && mc.baseUrl) || '',
          apiKey: (mc && mc.apiKey) || '',
          model: currentModel,
          providerName: (mc && mc.providerName) || ''
        };
        modelMode.value = window.inferModelInputMode(mc, currentModel);
        var catalogHit = window.findModelInCatalog ? window.findModelInCatalog(currentModel) : null;
        selectedModelId.value = catalogHit ? catalogHit.id : '';
        originalModelConfig.value = modelSnapshot(mc || (currentModel ? {
          model: currentModel,
          providerSlug: expert.provider || ''
        } : null));
        savedSignature.value = signature();
      }

      Vue.watch(function () { return props.expert; }, function (expert) {
        if (!expert) return;
        if (String(expert.id) !== loadedId || signature() === savedSignature.value) initialize(expert);
      }, { immediate: true });

      var dirty = Vue.computed(function () { return signature() !== savedSignature.value; });

      function triggerAvatarUpload() {
        if (avatarInput.value) avatarInput.value.click();
      }

      function onAvatarChange(event) {
        var file = event.target.files && event.target.files[0];
        if (window.readImageFile(file, function (url) { form.value.avatar = url; })) {
          event.target.value = '';
        }
      }

      function save() {
        var expert = props.expert;
        if (!expert) return;
        var name = String(form.value.name || '').trim();
        var description = String(form.value.description || '').trim();
        if (!name || !description) {
          ElementPlus.ElMessage.warning('请填写专家名称和介绍');
          return;
        }

        var nextModelConfig;
        if (modelMode.value === 'manual') {
          var error = window.validateManualModelConfig(manualModelConfig.value);
          if (error) return ElementPlus.ElMessage.warning(error);
          nextModelConfig = window.manualFormToModelConfig(manualModelConfig.value, store);
        } else {
          var selected = window.findModelInCatalog && window.findModelInCatalog(selectedModelId.value);
          if (!selected) return ElementPlus.ElMessage.warning('请选择有效的默认模型');
          nextModelConfig = window.modelCatalogToConfig(selected);
          if (store.resolveProviderSlug) {
            nextModelConfig.providerSlug = store.resolveProviderSlug(nextModelConfig.providerName, nextModelConfig.baseUrl);
          }
        }

        var modelChanged = JSON.stringify(modelSnapshot(nextModelConfig)) !== JSON.stringify(originalModelConfig.value);
        var updated = Object.assign({}, expert, {
          name: name,
          description: description,
          avatar: form.value.avatar || expert.avatar || avatarPresetConfig.DEFAULT
        });
        if (modelChanged) {
          updated.modelConfig = nextModelConfig;
          updated.model = nextModelConfig.model;
          updated.provider = nextModelConfig.providerSlug;
        }
        savedSignature.value = signature();
        store.saveExpert(updated);
        initialize(updated);
        ElementPlus.ElMessage.success(modelChanged && props.runningCount > 0
          ? '已保存。默认模型将在新会话生效，运行中的会话仍使用原模型。'
          : '基本信息已保存');
      }

      ctx.expose({
        isDirty: function () { return dirty.value; },
        discard: function () { initialize(props.expert); }
      });
      return {
        form: form,
        avatarPresets: avatarPresetConfig.list,
        modelMode: modelMode,
        selectedModelId: selectedModelId,
        manualModelConfig: manualModelConfig,
        avatarInput: avatarInput,
        dirty: dirty,
        triggerAvatarUpload: triggerAvatarUpload,
        onAvatarChange: onAvatarChange,
        save: save
      };
    },
    template: `
      <div class="expert-config-page expert-basic-page">
        <div class="expert-config-head">
          <div>
            <h2>基本信息</h2>
            <p>设置专家的展示资料和默认模型。</p>
          </div>
          <div class="expert-config-head-actions">
            <span class="expert-save-state" :class="{ 'is-dirty': dirty }">{{ dirty ? '有未保存修改' : '已保存' }}</span>
            <el-button type="primary" :disabled="!dirty" @click="save">保存</el-button>
          </div>
        </div>
        <div class="expert-config-content expert-basic-content">
          <section class="expert-config-card" aria-labelledby="expert-profile-heading">
            <div class="expert-config-card-head">
              <h3 id="expert-profile-heading">专家资料</h3>
              <p>名称和介绍会展示在专家列表中。</p>
            </div>
            <div class="expert-basic-form-grid">
              <div class="expert-avatar-field">
                <span class="expert-field-label">专家头像</span>
                <button type="button" class="expert-avatar-picker" @click="triggerAvatarUpload" aria-label="更换专家头像">
                  <img v-if="form.avatar" :src="form.avatar" alt="专家头像预览">
                  <span v-else>上传头像</span>
                  <span class="expert-avatar-picker-action">更换头像</span>
                </button>
                <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarChange">
                <div class="expert-avatar-presets">
                  <div class="expert-avatar-presets-head"><span>预置头像</span></div>
                  <div class="expert-avatar-presets-list" role="group" aria-label="预置头像">
                    <button v-for="preset in avatarPresets" :key="preset.id" type="button" class="expert-avatar-preset" :class="{ 'is-selected': form.avatar === preset.src }" :aria-label="preset.label" :aria-pressed="form.avatar === preset.src" :title="preset.label" @click="form.avatar = preset.src"><img :src="preset.src" :alt="preset.label"></button>
                  </div>
                </div>
                <span class="expert-field-hint">支持 JPG、PNG，最大 2MB</span>
              </div>
              <el-form label-position="top" class="expert-basic-fields" @submit.prevent="save">
                <el-form-item label="专家名称" required>
                  <el-input v-model="form.name" maxlength="60" placeholder="请输入专家名称" />
                </el-form-item>
                <el-form-item label="专家介绍" required>
                  <el-input v-model="form.description" type="textarea" :rows="9" placeholder="简要描述专家能提供的帮助" />
                </el-form-item>
              </el-form>
            </div>
          </section>
          <section class="expert-config-card expert-model-card" aria-labelledby="expert-model-heading">
            <div class="expert-config-card-head">
              <h3 id="expert-model-heading">默认模型</h3>
              <p>对话任务未指定模型时使用此模型。</p>
            </div>
            <model-config-section
              :mode="modelMode"
              :selected-model-id="selectedModelId"
              :manual-config="manualModelConfig"
              :show-mode-switch="false"
              hint=""
              required
              @update:mode="modelMode = $event"
              @update:selected-model-id="selectedModelId = $event" />
          </section>
        </div>
      </div>`
  };
})();
