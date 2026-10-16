<template>
  <div class="expert-knowledge-page">
    <div class="section-heading">
      <div>
        <h2>知识</h2>
        <p>配置专家可使用的知识库范围与检索回答方式。</p>
      </div>
      <div class="knowledge-head-actions">
        <span class="save-state" :class="{ dirty: isDirty }">{{
          isDirty ? "有未保存修改" : "已保存"
        }}</span>
        <el-button type="primary" :disabled="!isDirty || !canSave" @click="save"
          >保存</el-button
        >
      </div>
    </div>

    <div class="setting-line knowledge-switch-line">
      <div class="knowledge-switch-copy">
        <strong>启用知识</strong>
        <span>关闭后，新任务不使用知识库</span>
        <small>已有配置保留</small>
      </div>
      <el-switch v-model="draft.enabled" aria-label="启用知识" />
    </div>

    <div class="knowledge-scroll">
      <section
        class="knowledge-section knowledge-mode-section"
        :class="{ 'is-knowledge-disabled': !draft.enabled }"
        aria-labelledby="knowledge-mode-title"
      >
        <div class="knowledge-section-head">
          <h3 id="knowledge-mode-title">检索回答方式</h3>
          <p>选择专家检索资料并组织回答的默认方式。</p>
        </div>
        <div class="knowledge-mode-body">
          <div
            class="knowledge-mode-options"
            role="radiogroup"
            aria-label="检索回答方式"
          >
            <label
              v-for="mode in modes"
              :key="mode.id"
              :class="{ active: draft.mode === mode.id }"
            >
              <input
                v-model="draft.mode"
                type="radio"
                name="knowledge-mode"
                :value="mode.id"
                :disabled="!draft.enabled"
              />
              {{ mode.name }}
            </label>
          </div>
          <p class="knowledge-mode-description">
            {{ selectedModeDescription
            }}<span v-if="!draft.enabled">
              · 当前知识已关闭，重新启用后生效</span
            >
          </p>
        </div>
      </section>

      <section
        class="knowledge-section knowledge-library-section"
        :class="{ 'is-knowledge-disabled': !draft.enabled }"
        aria-labelledby="knowledge-library-title"
      >
        <div class="knowledge-section-head">
          <h3 id="knowledge-library-title">知识库</h3>
          <p>配置专家可访问的资料范围。</p>
        </div>
        <div class="knowledge-form-grid">
          <div class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>关联知识库</strong>
              <span>选择专家可以使用哪些知识库</span>
            </div>
            <div
              class="knowledge-scope-options"
              role="radiogroup"
              aria-label="关联知识库"
            >
              <label
                v-for="option in scopeOptions"
                :key="option.value"
                :class="{ active: draft.scope === option.value }"
              >
                <input
                  v-model="draft.scope"
                  type="radio"
                  name="knowledge-scope"
                  :value="option.value"
                  :disabled="!draft.enabled"
                />
                {{ option.label }}
              </label>
            </div>
            <p v-if="draft.scope === 'all'" class="knowledge-field-hint">
              当前可用
              {{ availableLibraries.length }}
              个知识库；无权限或解析中的资料不参与使用。
            </p>
          </div>
          <div v-if="draft.scope === 'selected'" class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>选择知识库</strong>
              <span>可选择企业共享和自己创建的知识库</span>
            </div>
            <el-select
              v-model="draft.libraryIds"
              multiple
              filterable
              clearable
              :disabled="!draft.enabled"
              aria-label="选择知识库"
              placeholder="选择知识库"
              popper-class="knowledge-library-options"
            >
              <el-option
                v-for="item in catalog"
                :key="item.id"
                :label="item.name"
                :value="item.id"
                :disabled="item.status !== 'ready'"
              >
                <span class="knowledge-option-name">{{ item.name }}</span>
                <span class="knowledge-option-meta"
                  >{{ item.count }} 份资料 · {{ item.source }} ·
                  {{ statusLabel(item.status) }}</span
                >
              </el-option>
            </el-select>
            <p
              v-if="draft.enabled && !draft.libraryIds.length"
              class="knowledge-field-error"
            >
              请至少选择一个知识库。
            </p>
          </div>
          <div class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>支持的文件类型</strong>
              <span>不选择时支持全部文件类型</span>
            </div>
            <el-select
              v-model="draft.fileTypes"
              multiple
              clearable
              :disabled="!draft.enabled"
              aria-label="支持的文件类型"
              placeholder="全部文件类型"
            >
              <el-option
                v-for="type in fileTypes"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
          </div>
          <div class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>仅在 @ 提及时检索</strong>
              <span>开启后，只检索用户明确 @ 提及的已关联知识库</span>
            </div>
            <div class="knowledge-form-switch">
              <el-switch
                v-model="draft.mentionOnly"
                :disabled="!draft.enabled"
                aria-label="仅在 @ 提及时检索"
              />
            </div>
          </div>
        </div>
      </section>
      <p class="knowledge-effect-note">
        保存后对新任务生效，已开始的任务保持原配置。本页使用演示知识库数据。
      </p>
    </div>
  </div>
</template>

<script>
import Vue from "vue";
import { persist } from "../state";
import {
  defaultKnowledgeConfig,
  KNOWLEDGE_CATALOG,
  KNOWLEDGE_FILE_TYPES,
  KNOWLEDGE_MODES,
} from "../knowledge-demo";

const clone = (value) => JSON.parse(JSON.stringify(value));

export default {
  name: "ExpertKnowledgeTab",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      catalog: KNOWLEDGE_CATALOG,
      fileTypes: KNOWLEDGE_FILE_TYPES,
      modes: KNOWLEDGE_MODES,
      scopeOptions: [
        { value: "selected", label: "指定知识库" },
        { value: "all", label: "全部知识库" },
      ],
      draft: defaultKnowledgeConfig(),
    };
  },
  computed: {
    availableLibraries() {
      return this.catalog.filter((item) => item.status === "ready");
    },
    selectedModeDescription() {
      return (
        this.modes.find((mode) => mode.id === this.draft.mode)?.description ||
        ""
      );
    },
    savedConfig() {
      return this.expert.knowledge || defaultKnowledgeConfig(this.expert.id);
    },
    isDirty() {
      return JSON.stringify(this.draft) !== JSON.stringify(this.savedConfig);
    },
    canSave() {
      return (
        !this.draft.enabled ||
        this.draft.scope !== "selected" ||
        this.draft.libraryIds.length > 0
      );
    },
  },
  created() {
    this.loadDraft();
  },
  watch: {
    "expert.id"() {
      this.loadDraft();
    },
  },
  methods: {
    loadDraft() {
      this.draft = clone(this.savedConfig);
    },
    statusLabel(status) {
      return (
        { ready: "可用", processing: "解析中", locked: "无权限" }[status] ||
        "不可用"
      );
    },
    save() {
      if (!this.canSave) return;
      const config = clone(this.draft);
      config.libraryIds = config.libraryIds.filter((id) =>
        this.availableLibraries.some((item) => item.id === id),
      );
      Vue.set(this.expert, "knowledge", config);
      persist();
      this.$message.success("知识配置已保存，将对新任务生效（演示）");
    },
  },
};
</script>
