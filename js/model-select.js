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
      title: { type: String, default: '模型选择' },
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

  if (window.VueAppComponents) {
    window.VueAppComponents.ModelSelect = window.ModelSelect;
  }
})();
