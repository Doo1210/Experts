<template>
  <div class="expert-knowledge-page">
    <div class="section-heading">
      <div>
        <h2>知识</h2>
        <p>配置专家的检索回答方式和知识范围。</p>
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
          <h3 id="knowledge-mode-title">检索回答方式</h3>
          <p>可同时启用多种方式，并指定默认方式。</p>
        </div>
        <div class="knowledge-mode-body">
          <div class="knowledge-default-row">
            <div class="knowledge-form-label">
              <strong>默认方式</strong>
              <span>未在对话中选择时使用；自动选择从已启用方式中匹配</span>
            </div>
            <el-select
              v-model="draft.defaultMethodId"
              aria-label="默认检索回答方式"
              placeholder="选择默认方式"
              @change="onDefaultChange"
            >
              <el-option
                label="自动选择"
                value="auto"
                :disabled="!draft.methodIds.length"
              />
              <el-option
                v-for="method in allMethods"
                :key="method.id"
                :label="method.name"
                :value="method.id"
                :disabled="!isMethodEnabled(method.id)"
              />
            </el-select>
          </div>
          <div class="knowledge-method-heading">
            <strong
              >可用方式
              <small>{{ draft.methodIds.length }} 已启用</small></strong
            >
            <el-button type="text" @click="openCustomDialog"
              >+ 添加自定义方式</el-button
            >
          </div>
          <div class="knowledge-method-grid">
            <article
              v-for="method in allMethods"
              :key="method.id"
              class="knowledge-method-card"
              :class="{ 'is-method-off': !isMethodEnabled(method.id) }"
            >
              <div class="knowledge-method-card-top">
                <strong>{{ method.name }}</strong>
                <span
                  class="knowledge-method-status"
                  :class="methodStatus(method).kind"
                  >{{ methodStatus(method).label }}</span
                >
                <el-switch
                  :value="isMethodEnabled(method.id)"
                  :aria-label="`${method.name}启用状态`"
                  @change="toggleMethod(method.id, $event)"
                />
              </div>
              <p>{{ method.description }}</p>
              <small>{{ method.requirement }}</small>
              <div class="knowledge-method-card-foot">
                <span>{{ method.custom ? "自定义方式" : "平台内置" }}</span>
                <el-button type="text" @click="openMethodDetail(method)">{{
                  method.custom ? "查看／编辑配置" : "查看配置"
                }}</el-button>
              </div>
            </article>
          </div>
          <p v-if="draft.scope === 'none'" class="knowledge-field-hint">
            当前设置为不使用知识库；方式配置会保留，切换知识范围后可使用。
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

    <el-dialog
      :visible.sync="detailVisible"
      width="640px"
      custom-class="manage-dialog knowledge-detail-dialog"
      :close-on-click-modal="false"
    >
      <template v-if="detailMethod">
        <div slot="title" class="knowledge-dialog-title">
          <strong>{{ detailMethod.name }}</strong
          ><small>当前平台配置 · 演示数据</small>
        </div>
        <div class="knowledge-detail-meta">
          <span>{{ detailMethod.requirement }}</span
          ><span>{{ methodStatus(detailMethod).label }}</span
          ><span>最近同步：2026-10-16 18:30</span>
        </div>
        <div class="knowledge-detail-section">
          <strong>基本信息</strong>
          <p>
            类型：{{ detailMethod.type || "RAG 问答" }} · 用途：{{
              detailMethod.description
            }}
          </p>
        </div>
        <div class="knowledge-detail-section">
          <strong>模型配置</strong>
          <p>
            知识任务模型：{{ detailMethod.config.model
            }}<template v-if="detailMethod.custom">
              · 温度：{{ detailMethod.config.temperature }} · 输出限制：{{
                detailMethod.config.outputLimit
              }}</template
            >
          </p>
        </div>
        <div class="knowledge-detail-section">
          <strong>多轮对话</strong>
          <p>{{ detailMethod.config.multiTurn }}</p>
        </div>
        <div v-if="usesRag(detailMethod)" class="knowledge-detail-section">
          <strong>RAG 检索策略</strong>
          <p>{{ detailMethod.config.rag }}</p>
        </div>
        <div
          v-if="detailMethod.config.tools.length"
          class="knowledge-detail-section"
        >
          <strong>工具扩展</strong>
          <p>{{ detailMethod.config.tools.join("、") }}</p>
        </div>
        <div class="knowledge-detail-section">
          <strong>本专家执行范围</strong>
          <p>
            由专家知识范围和用户本轮选择决定；不在方式配置中单独绑定知识库。
          </p>
        </div>
        <span slot="footer"
          ><el-button @click="detailVisible = false">关闭</el-button
          ><el-button
            v-if="detailMethod.custom"
            type="primary"
            @click="editSelectedCustom"
            >编辑配置</el-button
          ></span
        >
      </template>
    </el-dialog>

    <el-dialog
      :visible.sync="customVisible"
      width="680px"
      custom-class="manage-dialog knowledge-custom-dialog"
      :close-on-click-modal="false"
    >
      <div slot="title" class="knowledge-dialog-title">
        <strong>{{
          editingCustomId ? "编辑自定义方式" : "添加自定义方式"
        }}</strong
        ><small>仅配置知识查询、阅读和分析能力</small>
      </div>
      <div v-if="!editingCustomId" class="knowledge-custom-tabs">
        <button
          :class="{ active: customTab === 'existing' }"
          @click="customTab = 'existing'"
        >
          选择已有方式</button
        ><button
          :class="{ active: customTab === 'new' }"
          @click="customTab = 'new'"
        >
          新建方式
        </button>
      </div>
      <p v-if="editingSharedCandidate" class="knowledge-custom-shared-note">
        该方式来自平台目录，正式修改会影响引用它的其他专家；当前页面仅演示本地配置。
      </p>
      <div
        v-if="customTab === 'existing' && !editingCustomId"
        class="knowledge-existing-list"
      >
        <label v-for="candidate in availableCandidates" :key="candidate.id"
          ><input
            v-model="selectedCandidateId"
            type="radio"
            :value="candidate.id"
          /><strong>{{ candidate.name }}</strong
          ><span>{{ candidate.description }}</span
          ><small>{{
            candidate.status === "ready" ? "已审核" : "不可用"
          }}</small></label
        >
        <el-empty
          v-if="!availableCandidates.length"
          description="暂无可添加的已审核方式"
        />
      </div>
      <el-form
        v-else
        class="knowledge-custom-form"
        label-position="top"
        @submit.native.prevent="saveCustomMethod"
      >
        <div class="knowledge-custom-form-grid">
          <el-form-item label="名称" required
            ><el-input
              v-model.trim="customDraft.name"
              maxlength="40"
              placeholder="输入方式名称" /></el-form-item
          ><el-form-item label="描述" required
            ><el-input
              v-model.trim="customDraft.description"
              maxlength="160"
              placeholder="说明适用任务与资料"
          /></el-form-item>
        </div>
        <div class="knowledge-custom-form-grid">
          <el-form-item label="运行模式"
            ><el-select
              v-model="customDraft.runtime"
              @change="onCustomRuntimeChange"
              ><el-option label="快速问答" value="quick-answer" /><el-option
                label="智能推理"
                value="smart-reasoning" /></el-select></el-form-item
          ><el-form-item label="类型"
            ><el-select v-model="customDraft.type" @change="onCustomTypeChange"
              ><el-option label="RAG 问答" value="RAG 问答" /><el-option
                label="Wiki 问答"
                value="Wiki 问答" /><el-option
                label="Wiki＋RAG 混合"
                value="Wiki＋RAG 混合" /><el-option
                label="数据分析"
                value="数据分析" /><el-option
                label="自定义"
                value="自定义" /></el-select
          ></el-form-item>
        </div>
        <div class="knowledge-custom-form-grid">
          <el-form-item label="知识任务模型" required
            ><el-input
              v-model.trim="customDraft.model"
              placeholder="知识推理模型" /></el-form-item
          ><el-form-item label="输出限制"
            ><el-input-number
              v-model="customDraft.outputLimit"
              :min="256"
              :max="8192"
              :step="256"
          /></el-form-item>
        </div>
        <div class="knowledge-custom-form-grid">
          <el-form-item label="温度"
            ><el-slider
              v-model="customDraft.temperature"
              :min="0"
              :max="1"
              :step="0.1"
              show-input /></el-form-item
          ><el-form-item label="多轮对话"
            ><el-switch
              v-model="customDraft.multiTurn"
              :disabled="customDraft.runtime === 'smart-reasoning'"
            /><span class="knowledge-inline-note">{{
              customDraft.runtime === "smart-reasoning"
                ? "智能推理由后端保持多轮"
                : "快速问答可选择是否保留历史"
            }}</span></el-form-item
          >
        </div>
        <div v-if="customUsesRag" class="knowledge-custom-block">
          <strong>RAG 检索策略</strong>
          <div class="knowledge-custom-form-grid">
            <el-form-item label="召回数量"
              ><el-input-number
                v-model="customDraft.topK"
                :min="1"
                :max="100" /></el-form-item
            ><el-form-item label="重排模型"
              ><el-input
                v-model.trim="customDraft.rerankModel"
                placeholder="选择重排模型"
            /></el-form-item>
          </div>
          <div class="knowledge-custom-form-grid">
            <el-form-item label="向量阈值"
              ><el-slider
                v-model="customDraft.vectorThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                show-input
            /></el-form-item>
            <el-form-item label="关键词阈值"
              ><el-slider
                v-model="customDraft.keywordThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                show-input
            /></el-form-item>
          </div>
          <el-checkbox
            v-if="customDraft.runtime === 'quick-answer'"
            v-model="customDraft.faqFirst"
            >FAQ 优先</el-checkbox
          >
        </div>
        <div
          v-if="customDraft.runtime === 'smart-reasoning'"
          class="knowledge-custom-block"
        >
          <strong>工具扩展</strong
          ><el-checkbox-group v-model="customDraft.tools"
            ><el-checkbox
              v-for="tool in customToolOptions"
              :key="tool"
              :label="tool"
          /></el-checkbox-group>
        </div>
        <p class="knowledge-field-hint">
          知识库范围由当前专家和用户本轮选择决定。提示词、联网、写入及其他能力由平台统一管理；当前为演示配置。
        </p>
      </el-form>
      <span slot="footer"
        ><el-button @click="customVisible = false">取消</el-button
        ><el-button
          type="primary"
          :disabled="
            customTab === 'existing' && !editingCustomId
              ? !selectedCandidateId
              : !canSaveCustom
          "
          @click="saveCustomMethod"
          >{{ editingCustomId ? "保存方式" : "添加方式" }}</el-button
        ></span
      >
    </el-dialog>
  </div>
</template>

<script>
import Vue from "vue";
import { persist } from "../state";
import {
  defaultKnowledgeConfig,
  migrateKnowledgeConfig,
  KNOWLEDGE_CATALOG,
  KNOWLEDGE_CUSTOM_CANDIDATES,
  KNOWLEDGE_FILE_TYPES,
  KNOWLEDGE_MODES,
} from "../knowledge-demo";

const clone = (value) => JSON.parse(JSON.stringify(value));
const customTemplate = () => ({
  name: "",
  description: "",
  runtime: "smart-reasoning",
  type: "RAG 问答",
  model: "知识推理模型",
  outputLimit: 2048,
  temperature: 0.3,
  multiTurn: true,
  topK: 10,
  rerankModel: "默认重排模型",
  vectorThreshold: 0.5,
  keywordThreshold: 0.3,
  faqFirst: true,
  tools: ["检索知识", "阅读文档"],
});

export default {
  name: "ExpertKnowledgeTab",
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
      customToolOptions: [
        "检索知识",
        "列出文档",
        "阅读文档",
        "搜索 Wiki",
        "阅读页面",
        "读取表结构",
        "分析数据",
      ],
      draft: defaultKnowledgeConfig(),
      detailVisible: false,
      detailId: "",
      customVisible: false,
      customTab: "existing",
      customDraft: customTemplate(),
      editingCustomId: "",
      selectedCandidateId: "",
    };
  },
  computed: {
    availableLibraries() {
      return this.catalog.filter((item) => item.status === "ready");
    },
    allMethods() {
      return [
        ...this.builtInMethods,
        ...this.draft.customMethods.map((method) => ({
          ...method,
          custom: true,
        })),
      ];
    },
    availableCandidates() {
      return KNOWLEDGE_CUSTOM_CANDIDATES.filter(
        (candidate) =>
          !this.draft.customMethods.some(
            (method) => method.sourceId === candidate.id,
          ),
      );
    },
    detailMethod() {
      return (
        this.allMethods.find((method) => method.id === this.detailId) || null
      );
    },
    editingSharedCandidate() {
      return Boolean(
        this.draft.customMethods.find(
          (method) => method.id === this.editingCustomId,
        )?.sourceId,
      );
    },
    customUsesRag() {
      return (
        ["RAG 问答", "Wiki＋RAG 混合"].includes(this.customDraft.type) ||
        (this.customDraft.runtime === "smart-reasoning" &&
          this.customDraft.tools.includes("检索知识"))
      );
    },
    canSaveCustom() {
      if (
        !this.customDraft.name.trim() ||
        !this.customDraft.description.trim() ||
        !this.customDraft.model.trim()
      )
        return false;
      if (this.customUsesRag && !this.customDraft.rerankModel.trim())
        return false;
      if (
        this.customDraft.runtime === "smart-reasoning" &&
        !this.customDraft.tools.length
      )
        return false;
      return true;
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
      if (!this.draft.methodIds.length)
        errors.push("至少启用一种检索回答方式。");
      if (
        this.draft.defaultMethodId === "auto" &&
        !this.draft.methodIds.some((id) => {
          const method = this.allMethods.find((item) => item.id === id);
          return method && this.methodStatus(method).kind !== "incompatible";
        })
      )
        errors.push("自动选择没有可用的方式，请调整资料范围或方式配置。");
      if (
        this.draft.defaultMethodId !== "auto" &&
        !this.draft.methodIds.includes(this.draft.defaultMethodId)
      )
        errors.push("默认方式必须已启用。");
      const unavailable = this.draft.libraryIds.filter(
        (id) => !this.availableLibraries.some((item) => item.id === id),
      );
      if (this.draft.scope === "selected" && unavailable.length)
        errors.push("已选知识库中有不可用项，请重新选择。");
      const selected = this.allMethods.find(
        (method) => method.id === this.draft.defaultMethodId,
      );
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
    isMethodEnabled(id) {
      return this.draft.methodIds.includes(id);
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
    toggleMethod(id, enabled) {
      this.draft.methodIds = enabled
        ? [...new Set([...this.draft.methodIds, id])]
        : this.draft.methodIds.filter((item) => item !== id);
      if (!enabled && this.draft.defaultMethodId === id)
        this.draft.defaultMethodId = this.draft.methodIds[0] || "";
    },
    onDefaultChange(id) {
      const method = this.allMethods.find((item) => item.id === id);
      if (method?.capability === "table") {
        this.draft.scope = "all";
        this.draft.fileTypes = ["CSV", "Excel（XLSX）"];
        this.$message.info(
          "已按数据分析方式填入全部知识库与表格类型，请检查后保存。",
        );
      }
    },
    usesRag(method) {
      return (
        method.capability === "rag" ||
        method.type === "Wiki＋RAG 混合" ||
        method.config.tools.includes("检索知识")
      );
    },
    openMethodDetail(method) {
      this.detailId = method.id;
      this.detailVisible = true;
    },
    openCustomDialog() {
      this.editingCustomId = "";
      this.customTab = "existing";
      this.selectedCandidateId = "";
      this.customDraft = customTemplate();
      this.customVisible = true;
    },
    onCustomRuntimeChange(runtime) {
      if (runtime === "smart-reasoning") this.customDraft.multiTurn = true;
      else {
        this.customDraft.type = "RAG 问答";
        this.customDraft.tools = [];
      }
    },
    onCustomTypeChange(type) {
      const tools = {
        "RAG 问答": ["检索知识", "阅读文档"],
        "Wiki 问答": ["搜索 Wiki", "阅读页面"],
        "Wiki＋RAG 混合": ["检索知识", "阅读文档", "搜索 Wiki", "阅读页面"],
        数据分析: ["读取表结构", "分析数据"],
        自定义: [],
      };
      this.customDraft.tools =
        this.customDraft.runtime === "smart-reasoning" ? tools[type] : [];
    },
    editSelectedCustom() {
      const method = this.detailMethod;
      if (!method?.custom) return;
      this.editingCustomId = method.id;
      this.customTab = "new";
      this.customDraft = {
        ...customTemplate(),
        ...clone(method.editConfig || {}),
        name: method.name,
        description: method.description,
      };
      this.detailVisible = false;
      this.customVisible = true;
    },
    saveCustomMethod() {
      if (this.customTab === "existing" && !this.editingCustomId) {
        const candidate = KNOWLEDGE_CUSTOM_CANDIDATES.find(
          (item) => item.id === this.selectedCandidateId,
        );
        if (!candidate) return;
        const id = `custom_${candidate.id}`;
        this.draft.customMethods.push({
          id,
          sourceId: candidate.id,
          name: candidate.name,
          description: candidate.description,
          requirement: "适合质量规范核对",
          capability: "rag",
          type: candidate.type,
          config: {
            model: candidate.model,
            multiTurn: "按上下文窗口管理历史",
            rag: "召回 10 条 · 启用重排",
            tools: ["检索知识", "阅读文档"],
          },
        });
        this.draft.methodIds.push(id);
      } else {
        const form = this.customDraft;
        if (!this.canSaveCustom) return;
        if (
          this.allMethods.some(
            (item) =>
              item.name === form.name.trim() &&
              item.id !== this.editingCustomId,
          )
        ) {
          this.$message.error("方式名称已存在，请更换名称。");
          return;
        }
        const capability =
          form.type === "数据分析"
            ? "table"
            : form.type === "Wiki 问答"
              ? "wiki"
              : "rag";
        const method = {
          id: this.editingCustomId || `custom_${Date.now().toString(36)}`,
          name: form.name.trim(),
          description: form.description.trim(),
          requirement:
            capability === "table"
              ? "需要 CSV 或 Excel（XLSX）表格"
              : capability === "wiki"
                ? "需要可访问的 Wiki 资料"
                : "需要可检索的知识资料",
          capability,
          type: form.type,
          config: {
            model: form.model.trim(),
            temperature: form.temperature,
            outputLimit: form.outputLimit,
            multiTurn:
              form.runtime === "smart-reasoning"
                ? "按上下文窗口管理历史"
                : form.multiTurn
                  ? "启用多轮"
                  : "关闭多轮",
            rag: this.customUsesRag
              ? `召回 ${form.topK} 条 · 向量阈值 ${form.vectorThreshold} · 关键词阈值 ${form.keywordThreshold} · ${form.rerankModel}${form.runtime === "quick-answer" && form.faqFirst ? " · FAQ 优先" : ""}`
              : "不使用 RAG 召回",
            tools: form.runtime === "smart-reasoning" ? [...form.tools] : [],
          },
          editConfig: clone(form),
        };
        const index = this.draft.customMethods.findIndex(
          (item) => item.id === method.id,
        );
        if (index >= 0) this.$set(this.draft.customMethods, index, method);
        else {
          this.draft.customMethods.push(method);
          this.draft.methodIds.push(method.id);
        }
      }
      this.customVisible = false;
      this.$message.success("方式已加入当前专家，请保存知识配置。");
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
