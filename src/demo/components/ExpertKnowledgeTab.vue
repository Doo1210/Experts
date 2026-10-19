<template>
  <div class="expert-knowledge-page">
    <div class="section-heading">
      <div>
        <h2>知识</h2>
        <p>配置专家的处理方式和知识范围。</p>
      </div>
      <div class="knowledge-head-actions">
        <span class="save-state" :class="{ dirty: isDirty }">{{
          isDirty ? "有未保存修改" : "已保存"
        }}</span>
        <el-button
          type="primary"
          :disabled="!isDirty || validationErrors.length > 0"
          @click="save"
          >保存</el-button
        >
      </div>
    </div>

    <div class="knowledge-scroll">
      <section
        class="knowledge-section knowledge-mode-section"
        aria-labelledby="knowledge-mode-title"
      >
        <div class="knowledge-section-head">
          <h3 id="knowledge-mode-title">处理方式</h3>
          <p>
            选择专家检索知识时默认采用的处理方式；点击名称切换默认项，点击配置图标查看或编辑设置。
          </p>
        </div>
        <div class="knowledge-mode-body">
          <div class="knowledge-method-row">
            <div
              class="knowledge-method-tabbar"
              role="group"
              aria-label="默认处理方式"
            >
              <div class="knowledge-method-tab-group">
                <button
                  type="button"
                  class="knowledge-method-select"
                  :class="{ active: draft.defaultMethodId === 'auto' }"
                  :aria-pressed="draft.defaultMethodId === 'auto'"
                  @click="selectDefaultMethod('auto')"
                >
                  自动选择
                </button>
              </div>
              <div class="knowledge-method-tab-group" aria-label="内置方式">
                <span class="knowledge-method-group-label">内置</span>
                <div
                  v-for="method in builtInMethods"
                  :key="method.id"
                  class="knowledge-method-choice"
                  :class="{ active: draft.defaultMethodId === method.id }"
                >
                  <button
                    type="button"
                    class="knowledge-method-select"
                    :aria-pressed="draft.defaultMethodId === method.id"
                    @click="selectDefaultMethod(method.id)"
                  >
                    {{ method.name }}
                  </button>
                  <button
                    type="button"
                    class="knowledge-method-config"
                    :aria-label="`配置${method.name}`"
                    :title="`配置${method.name}`"
                    @click.stop="openMethodDetail(method)"
                  >
                    <i class="el-icon-setting" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="knowledge-method-tab-group" aria-label="自定义方式">
                <span class="knowledge-method-group-label">自定义</span>
                <div
                  v-for="method in customMethods"
                  :key="method.id"
                  class="knowledge-method-choice"
                  :class="{ active: draft.defaultMethodId === method.id }"
                >
                  <button
                    type="button"
                    class="knowledge-method-select"
                    :aria-pressed="draft.defaultMethodId === method.id"
                    @click="selectDefaultMethod(method.id)"
                  >
                    {{ method.name }}
                  </button>
                  <button
                    type="button"
                    class="knowledge-method-config"
                    :aria-label="`配置${method.name}`"
                    :title="`配置${method.name}`"
                    @click.stop="openMethodDetail(method)"
                  >
                    <i class="el-icon-setting" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  class="knowledge-method-add"
                  @click="openCustomDialog"
                >
                  + 添加方式
                </button>
              </div>
            </div>
          </div>
          <p class="knowledge-method-summary">
            <span class="knowledge-method-summary-name"
              >{{ selectedMethodName }}：</span
            ><span>{{ selectedMethodDescription }}</span
            ><span
              v-if="selectedMethodStatus"
              :class="selectedMethodStatus.kind"
              >{{ selectedMethodStatus.label }}</span
            >
          </p>
          <p v-if="draft.scope === 'none'" class="knowledge-field-hint">
            当前不使用知识库；默认方式和配置会保留，切换知识范围后可使用。
          </p>
        </div>
      </section>

      <section
        class="knowledge-section knowledge-library-section"
        aria-labelledby="knowledge-library-title"
      >
        <div class="knowledge-section-head">
          <h3 id="knowledge-library-title">知识范围</h3>
          <p>决定专家默认可以检索哪些已入库资料。</p>
        </div>
        <div class="knowledge-form-grid">
          <div class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>关联知识库</strong><span>按专家授权范围选择</span>
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
                />{{ option.label }}
              </label>
            </div>
            <p v-if="draft.scope === 'all'" class="knowledge-field-hint">
              当前预计涵盖
              {{ availableLibraries.length }}
              个已授权且处理完成的知识库；后续新授权的知识库也可能进入范围。
            </p>
            <p v-else-if="draft.scope === 'none'" class="knowledge-field-hint">
              专家不检索知识库；已保存的方式和资料配置保留，历史任务仍可查看。
            </p>
          </div>
          <div v-if="draft.scope === 'selected'" class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>选择知识库</strong
              ><span>可搜索企业共享和自己创建的知识库</span>
            </div>
            <el-select
              v-model="draft.libraryIds"
              multiple
              filterable
              clearable
              aria-label="选择知识库"
              placeholder="搜索并选择知识库"
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
                  >{{ item.description }} · {{ item.count }} 份资料 ·
                  {{ capabilityLabel(item) }} · {{ item.source }} ·
                  {{ statusLabel(item) }}</span
                >
              </el-option>
            </el-select>
            <p v-if="!draft.libraryIds.length" class="knowledge-field-hint">
              可以暂不选择；此时须在对话中指定资料才有可检索范围。
            </p>
          </div>
          <div v-if="draft.scope !== 'none'" class="knowledge-form-field">
            <div class="knowledge-form-label">
              <strong>支持的文件类型</strong
              ><span>限制可检索的已入库文件，不限制对话附件上传</span>
            </div>
            <el-select
              v-model="draft.fileTypes"
              multiple
              clearable
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
            <p class="knowledge-field-hint">
              留空表示全部；FAQ、Wiki 等非文件资料按方式能力判断。
            </p>
          </div>
        </div>
      </section>
      <div
        v-if="validationErrors.length"
        class="knowledge-validation"
        role="alert"
      >
        <p v-for="message in validationErrors" :key="message">{{ message }}</p>
      </div>
      <p class="knowledge-effect-note">
        保存后影响后续运行；旧对话下一轮仍会重新校验权限、资料和方式。本页为本地演示数据。
      </p>
    </div>

    <knowledge-method-config-dialog
      :visible="configVisible"
      :method="configMethod"
      :shared-config="sharedMethodConfig"
      :can-manage="canManageMethods"
      :capabilities="effectiveCapabilities"
      @close="configVisible = false"
      @save="saveMethodConfig"
    />
  </div>
</template>

<script>
import Vue from "vue";
import { persist, state } from "../state";
import KnowledgeMethodConfigDialog from "./KnowledgeMethodConfigDialog.vue";
import {
  effectiveExpertTools,
  summarizeMethodConfig,
} from "../knowledge-config";
import {
  defaultKnowledgeConfig,
  migrateKnowledgeConfig,
  KNOWLEDGE_CATALOG,
  KNOWLEDGE_FILE_TYPES,
  KNOWLEDGE_MODES,
} from "../knowledge-demo";

const clone = (value) => JSON.parse(JSON.stringify(value));
export default {
  name: "ExpertKnowledgeTab",
  components: { KnowledgeMethodConfigDialog },
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      catalog: KNOWLEDGE_CATALOG,
      fileTypes: KNOWLEDGE_FILE_TYPES,
      builtInMethods: KNOWLEDGE_MODES,
      scopeOptions: [
        { value: "all", label: "全部知识库" },
        { value: "selected", label: "指定知识库" },
        { value: "none", label: "不使用知识库" },
      ],
      draft: defaultKnowledgeConfig(),
      configVisible: false,
      configMethodId: "",
      configIsNew: false,
    };
  },
  computed: {
    availableLibraries() {
      return this.catalog.filter((item) => item.status === "ready");
    },
    allMethods() {
      return [
        ...this.builtInMethods.map((method) => {
          const current = state.knowledgeMethodConfigs?.[method.id];
          return current
            ? {
                ...method,
                config: summarizeMethodConfig(current),
                editConfig: current,
              }
            : method;
        }),
        ...this.customMethods,
      ];
    },
    customMethods() {
      return this.draft.customMethods.map((method) => ({
        ...method,
        custom: true,
      }));
    },
    selectedMethod() {
      return (
        this.allMethods.find(
          (method) => method.id === this.draft.defaultMethodId,
        ) || null
      );
    },
    selectedMethodName() {
      return this.selectedMethod?.name || "自动选择";
    },
    selectedMethodDescription() {
      if (!this.selectedMethod)
        return "专家会结合本轮问题、可访问的知识库和资料类型，从可用方式中选择合适的一种进行检索与回答。";
      if (this.selectedMethod.custom)
        return `${String(this.selectedMethod.description || "按自定义配置处理本轮问题").replace(/[。；]$/, "")}；${this.selectedMethod.requirement || "需要可用的知识资料"}。`;
      return this.selectedMethod.hint || this.selectedMethod.description;
    },
    selectedMethodStatus() {
      return this.selectedMethod
        ? this.methodStatus(this.selectedMethod)
        : null;
    },
    configMethod() {
      if (this.configIsNew)
        return {
          id: "",
          name: "",
          description: "",
          custom: true,
          type: "RAG 问答",
        };
      return (
        this.allMethods.find((method) => method.id === this.configMethodId) ||
        null
      );
    },
    sharedMethodConfig() {
      return this.configMethod && !this.configMethod.custom
        ? state.knowledgeMethodConfigs?.[this.configMethod.id] || null
        : null;
    },
    canManageMethods() {
      return state.knowledgeMethodManagePermission !== false;
    },
    effectiveCapabilities() {
      return [
        ...new Set(
          this.effectiveLibraries.flatMap((item) => item.capabilities),
        ),
      ];
    },
    savedConfig() {
      return this.expert.knowledge || defaultKnowledgeConfig(this.expert.id);
    },
    isDirty() {
      return JSON.stringify(this.draft) !== JSON.stringify(this.savedConfig);
    },
    effectiveLibraries() {
      return this.draft.scope === "all"
        ? this.availableLibraries
        : this.catalog.filter(
            (item) =>
              this.draft.libraryIds.includes(item.id) &&
              item.status === "ready",
          );
    },
    validationErrors() {
      if (this.draft.scope === "none") return [];
      const errors = [];
      if (
        this.draft.defaultMethodId === "auto" &&
        !this.allMethods.some(
          (method) => this.methodStatus(method).kind !== "incompatible",
        )
      )
        errors.push("自动选择没有可用的方式，请调整资料范围。");
      const selected = this.allMethods.find(
        (method) => method.id === this.draft.defaultMethodId,
      );
      if (this.draft.defaultMethodId !== "auto" && !selected)
        errors.push("默认方式不存在，请重新选择。");
      const unavailable = this.draft.libraryIds.filter(
        (id) => !this.availableLibraries.some((item) => item.id === id),
      );
      if (this.draft.scope === "selected" && unavailable.length)
        errors.push("已选知识库中有不可用项，请重新选择。");
      if (
        (selected && this.draft.scope !== "selected") ||
        (selected && this.draft.libraryIds.length)
      ) {
        const status = this.methodStatus(selected);
        if (status.kind === "incompatible")
          errors.push(`${selected.name}与当前资料不兼容：${status.reason}`);
      }
      return errors;
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
      this.draft = clone(
        migrateKnowledgeConfig(this.savedConfig, this.expert.id),
      );
    },
    statusLabel(item) {
      return item.status === "ready" ? "可用" : item.statusReason || "不可用";
    },
    capabilityLabel(item) {
      return item.capabilities
        .map(
          (capability) =>
            ({ rag: "RAG", wiki: "Wiki", table: "表格" })[capability],
        )
        .join("／");
    },
    methodStatus(method) {
      if (this.draft.scope === "none")
        return {
          kind: "neutral",
          label: "配置保留",
          reason: "当前不使用知识库",
        };
      if (this.draft.scope === "selected" && !this.draft.libraryIds.length)
        return {
          kind: "neutral",
          label: "待本轮选资料",
          reason: "对话中指定资料后可用",
        };
      if (
        !this.effectiveLibraries.some((item) =>
          item.capabilities.includes(method.capability),
        )
      )
        return {
          kind: "incompatible",
          label: "资料不兼容",
          reason: method.requirement,
        };
      if (
        method.capability === "table" &&
        this.draft.fileTypes.length &&
        !this.draft.fileTypes.some((type) =>
          ["CSV", "Excel（XLSX）"].includes(type),
        )
      )
        return {
          kind: "incompatible",
          label: "类型不兼容",
          reason: "文件类型需包含 CSV 或 Excel（XLSX）",
        };
      return { kind: "ready", label: "可用", reason: "" };
    },
    selectDefaultMethod(id) {
      if (id === this.draft.defaultMethodId) return;
      const nextMethod = this.allMethods.find((item) => item.id === id);
      const nextName = nextMethod?.name || "自动选择";
      return this.$confirm(
        `不同处理方式支持的知识库能力和文档类型不同。切换到「${nextName}」后，当前绑定的知识库或文件类型可能与处理方式不匹配，影响资料检索。请确认处理方式与当前知识范围、文件类型相对应；如不匹配，请在切换后调整。`,
        "确认切换处理方式",
        {
          confirmButtonText: "确认切换",
          cancelButtonText: "保持当前方式",
          type: "warning",
        },
      )
        .then(() => this.applyDefaultMethod(id))
        .catch(() => {});
    },
    applyDefaultMethod(id) {
      this.draft.defaultMethodId = id;
      const method = this.allMethods.find((item) => item.id === id);
      if (method?.capability === "table") {
        this.draft.scope = "all";
        this.draft.fileTypes = ["CSV", "Excel（XLSX）"];
        this.$message.info(
          "已按数据分析方式填入全部知识库与表格类型，请检查后保存。",
        );
      }
    },
    openMethodDetail(method) {
      this.configIsNew = false;
      this.configMethodId = method.id;
      this.configVisible = true;
    },
    openCustomDialog() {
      this.configIsNew = true;
      this.configMethodId = "";
      this.configVisible = true;
    },
    customRequirement(capability) {
      return capability === "table"
        ? "需要 CSV 或 Excel（XLSX）表格"
        : capability === "wiki"
          ? "需要可访问的 Wiki 资料"
          : "需要可检索的知识资料";
    },
    saveMethodConfig({ method, config }) {
      const form = clone(config);
      form.tools = effectiveExpertTools(form.tools);
      if (!method.id) {
        const id = `custom_${Date.now().toString(36)}`;
        const capability =
          form.type === "数据分析"
            ? "table"
            : form.type === "Wiki 问答"
              ? "wiki"
              : "rag";
        if (this.allMethods.some((item) => item.name === form.name.trim())) {
          this.$message.error("方式名称已存在，请更换名称。");
          return;
        }
        this.draft.customMethods.push({
          id,
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          capability,
          requirement: this.customRequirement(capability),
          config: summarizeMethodConfig(form),
          editConfig: form,
        });
        this.$message.success("方式已创建，请保存专家知识配置。");
      } else if (method.custom) {
        const capability =
          form.type === "数据分析"
            ? "table"
            : form.type === "Wiki 问答"
              ? "wiki"
              : "rag";
        const updated = {
          ...method,
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          capability,
          requirement: this.customRequirement(capability),
          config: summarizeMethodConfig(form),
          editConfig: form,
        };
        const index = this.draft.customMethods.findIndex(
          (item) => item.id === method.id,
        );
        if (index >= 0) this.$set(this.draft.customMethods, index, updated);
        for (const expert of state.experts) {
          const saved = expert.knowledge?.customMethods;
          const savedIndex =
            saved?.findIndex((item) => item.id === method.id) ?? -1;
          if (savedIndex >= 0) Vue.set(saved, savedIndex, clone(updated));
        }
        persist();
        this.$message.success(
          "方式配置已保存，将影响引用此方式的专家（演示）。",
        );
      } else {
        Vue.set(state.knowledgeMethodConfigs, method.id, form);
        persist();
        this.$message.success(
          "内置方式配置已保存，将影响使用该方式的专家（演示）。",
        );
      }
      this.configVisible = false;
    },
    save() {
      if (this.validationErrors.length) {
        this.$message.error(this.validationErrors[0]);
        return;
      }
      Vue.set(this.expert, "knowledge", clone(this.draft));
      persist();
      this.$message.success("知识配置已保存，将对后续运行生效（演示）");
    },
  },
};
</script>
