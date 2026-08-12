/**
 * 模型选择下拉 — 新建/编辑专家默认模型
 * 参考：可搜索 + 可见性/能力标签 + 上下文用量
 */
(function () {
  window.ModelSelect = {
    name: 'ModelSelect',
    props: {
      modelValue: { type: String, default: '' },
      disabled: { type: Boolean, default: false },
      placeholder: { type: String, default: '搜索或选择模型' },
      size: { type: String, default: 'large' },
      showTitle: { type: Boolean, default: true },
      title: { type: String, default: '默认模型配置' },
      required: { type: Boolean, default: false },
      extraOptions: { type: Array, default: function () { return []; } }
    },
    emits: ['update:modelValue', 'change'],
    setup: function (props, ctx) {
      var options = Vue.computed(function () {
        var base = (window.MODELS_CATALOG || []).slice();
        var seen = {};
        base.forEach(function (m) { seen[m.id] = true; });
        (props.extraOptions || []).forEach(function (m) {
          if (!m || !m.id || seen[m.id]) return;
          seen[m.id] = true;
          base.unshift(m);
        });
        var current = String(props.modelValue || '').trim();
        if (current && !seen[current]) {
          base.unshift({
            id: current,
            name: current,
            visibility: 'public',
            capabilities: ['文本生成'],
            contextLabel: '—',
            providerName: '',
            providerSlug: 'custom',
            baseUrl: ''
          });
        }
        return base;
      });

      function visibilityLabel(v) {
        return window.modelVisibilityLabel ? window.modelVisibilityLabel(v) : (v === 'personal' ? '个人' : '全局公开');
      }

      function onUpdate(val) {
        ctx.emit('update:modelValue', val || '');
        var found = null;
        var list = options.value;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === val) {
            found = list[i];
            break;
          }
        }
        ctx.emit('change', found);
      }

      return {
        options: options,
        visibilityLabel: visibilityLabel,
        onUpdate: onUpdate
      };
    },
    template: [
      '<div class="model-select-wrap" :class="{ \'is-disabled\': disabled }">',
      '  <div v-if="showTitle" class="model-select-head">',
      '    <span class="model-select-title">{{ title }}<span v-if="required" class="create-model-section-required">*</span></span>',
      '    <span class="model-select-gear" title="模型管理" aria-hidden="true">',
      '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">',
      '        <circle cx="12" cy="12" r="3"/>',
      '        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
      '      </svg>',
      '    </span>',
      '  </div>',
      '  <el-select',
      '    class="model-select-picker"',
      '    popper-class="model-select-dropdown"',
      '    :model-value="modelValue"',
      '    :disabled="disabled"',
      '    :placeholder="placeholder"',
      '    :size="size"',
      '    filterable',
      '    clearable',
      '    @update:model-value="onUpdate">',
      '    <el-option',
      '      v-for="m in options"',
      '      :key="m.id"',
      '      :label="m.name"',
      '      :value="m.id">',
      '      <div class="model-option-row" :class="{ \'is-active\': m.id === modelValue }">',
      '        <span class="model-option-name">{{ m.name }}</span>',
      '        <span class="model-option-tags">',
      '          <span class="model-option-tag model-option-tag--visibility">{{ visibilityLabel(m.visibility) }}</span>',
      '          <span v-for="cap in (m.capabilities || [])" :key="cap" class="model-option-tag">{{ cap }}</span>',
      '        </span>',
      '        <span class="model-option-ctx">{{ m.contextLabel || "—" }}</span>',
      '      </div>',
      '    </el-option>',
      '  </el-select>',
      '</div>'
    ].join('\n')
  };

  /** 空的手动模型配置 */
  window.emptyManualModelConfig = function () {
    return { baseUrl: '', apiKey: '', model: '', providerName: '' };
  };

  /** 从专家 modelConfig 推断平台 / 手动模式 */
  window.inferModelInputMode = function (modelConfig, modelName) {
    var mc = modelConfig || null;
    var name = (mc && mc.model) || modelName || '';
    var catalogHit = window.findModelInCatalog ? window.findModelInCatalog(name) : null;
    if (mc && String(mc.apiKey || '').trim()) return 'manual';
    if (mc && String(mc.baseUrl || '').trim() && catalogHit &&
        String(mc.baseUrl).trim() !== String(catalogHit.baseUrl || '').trim()) {
      return 'manual';
    }
    if (mc && String(mc.baseUrl || '').trim() && !catalogHit) return 'manual';
    if (catalogHit) return 'platform';
    if (mc && String(mc.model || '').trim()) return 'manual';
    return 'platform';
  };

  /**
   * 校验手动模型配置，失败返回提示文案，成功返回 null
   */
  window.validateManualModelConfig = function (cfg) {
    var c = cfg || {};
    var baseUrl = String(c.baseUrl || '').trim();
    var apiKey = String(c.apiKey || '').trim();
    var model = String(c.model || '').trim();
    if (!baseUrl) return '请填写 Base URL';
    if (!/^https?:\/\/.+/i.test(baseUrl)) return 'Base URL 格式不正确，需以 http:// 或 https:// 开头';
    if (!apiKey) return '请填写 API Key';
    if (!model) return '请填写模型 ID';
    return null;
  };

  /**
   * 将手动表单转为 modelConfig（含 providerSlug）
   */
  window.manualFormToModelConfig = function (cfg, store) {
    var c = cfg || {};
    var providerName = String(c.providerName || '').trim();
    var baseUrl = String(c.baseUrl || '').trim();
    var providerSlug = 'custom';
    if (store && store.resolveProviderSlug) {
      providerSlug = store.resolveProviderSlug(providerName, baseUrl);
    } else if (providerName) {
      providerSlug = providerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';
    }
    return {
      providerSlug: providerSlug,
      providerName: providerName,
      baseUrl: baseUrl,
      apiKey: String(c.apiKey || ''),
      model: String(c.model || '').trim()
    };
  };

  /**
   * 默认模型配置区：平台选择 / 手动填写
   * manualConfig 为可变对象：{ baseUrl, apiKey, model, providerName }
   */
  window.ModelConfigSection = {
    name: 'ModelConfigSection',
    props: {
      mode: { type: String, default: 'platform' },
      selectedModelId: { type: String, default: '' },
      manualConfig: { type: Object, required: true },
      disabled: { type: Boolean, default: false },
      required: { type: Boolean, default: false },
      hint: {
        type: String,
        default: '作为专家的默认模型，对话任务未选择其他模型时使用此模型'
      },
      showModeSwitch: { type: Boolean, default: true }
    },
    emits: ['update:mode', 'update:selectedModelId', 'platform-change'],
    setup: function (props, ctx) {
      function setMode(next) {
        if (props.disabled) return;
        if (next === props.mode) return;
        ctx.emit('update:mode', next);
      }

      function onPlatformChange(model) {
        ctx.emit('platform-change', model || null);
      }

      function onSelectedModelId(val) {
        ctx.emit('update:selectedModelId', val || '');
      }

      return {
        setMode: setMode,
        onPlatformChange: onPlatformChange,
        onSelectedModelId: onSelectedModelId
      };
    },
    template: [
      '<div class="model-config-section" :class="{ \'is-disabled\': disabled }">',
      '  <div class="model-config-section-head">',
      '    <span class="model-config-section-title">默认模型配置<span v-if="required" class="create-model-section-required">*</span></span>',
      '    <div v-if="showModeSwitch" class="model-config-mode-switch" role="tablist">',
      '      <button',
      '        type="button"',
      '        class="model-config-mode-btn"',
      '        :class="{ \'is-active\': mode === \'platform\' }"',
      '        :disabled="disabled"',
      '        role="tab"',
      '        :aria-selected="mode === \'platform\'"',
      '        @click="setMode(\'platform\')">平台选择</button>',
      '      <button',
      '        type="button"',
      '        class="model-config-mode-btn"',
      '        :class="{ \'is-active\': mode === \'manual\' }"',
      '        :disabled="disabled"',
      '        role="tab"',
      '        :aria-selected="mode === \'manual\'"',
      '        @click="setMode(\'manual\')">手动填写</button>',
      '    </div>',
      '  </div>',
      '  <div v-show="mode === \'platform\'" class="model-config-platform">',
      '    <model-select',
      '      :model-value="selectedModelId"',
      '      :disabled="disabled"',
      '      :show-title="false"',
      '      placeholder="搜索或选择默认模型"',
      '      @update:model-value="onSelectedModelId"',
      '      @change="onPlatformChange"',
      '    />',
      '  </div>',
      '  <div v-show="mode === \'manual\'" class="model-config-manual">',
      '    <el-form label-position="top" class="model-config-manual-form" @submit.prevent>',
      '      <el-form-item required>',
      '        <template #label><span class="model-config-field-label">Base URL</span></template>',
      '        <el-input',
      '          :model-value="manualConfig.baseUrl"',
      '          :disabled="disabled"',
      '          placeholder="https://api.openai.com/v1"',
      '          @update:model-value="manualConfig.baseUrl = $event"',
      '        />',
      '      </el-form-item>',
      '      <el-form-item required>',
      '        <template #label><span class="model-config-field-label">API Key</span></template>',
      '        <el-input',
      '          :model-value="manualConfig.apiKey"',
      '          :disabled="disabled"',
      '          type="password"',
      '          show-password',
      '          placeholder="输入 API Key"',
      '          @update:model-value="manualConfig.apiKey = $event"',
      '        />',
      '      </el-form-item>',
      '      <el-form-item required>',
      '        <template #label><span class="model-config-field-label">模型 ID</span></template>',
      '        <el-input',
      '          :model-value="manualConfig.model"',
      '          :disabled="disabled"',
      '          placeholder="如：gpt-4o、deepseek-chat"',
      '          @update:model-value="manualConfig.model = $event"',
      '        />',
      '      </el-form-item>',
      '      <el-form-item>',
      '        <template #label><span class="model-config-field-label">Provider 名称（可选）</span></template>',
      '        <el-input',
      '          :model-value="manualConfig.providerName"',
      '          :disabled="disabled"',
      '          placeholder="留空则从 Base URL 自动生成"',
      '          @update:model-value="manualConfig.providerName = $event"',
      '        />',
      '      </el-form-item>',
      '    </el-form>',
      '  </div>',
      '  <p class="form-dialog-hint model-config-hint">{{ hint }}</p>',
      '</div>'
    ].join('\n')
  };

  if (window.VueAppComponents) {
    window.VueAppComponents.ModelSelect = window.ModelSelect;
    window.VueAppComponents.ModelConfigSection = window.ModelConfigSection;
  }
})();
