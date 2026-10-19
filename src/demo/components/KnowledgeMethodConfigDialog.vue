<template>
  <el-dialog
    :visible="visible"
    width="1060px"
    custom-class="manage-dialog knowledge-config-dialog"
    :close-on-click-modal="false"
    :before-close="requestClose"
  >
    <div slot="title" class="knowledge-config-title">
      <strong>{{ isNew ? "创建处理方式" : "编辑处理方式" }}</strong>
    </div>

    <div v-if="loading" class="knowledge-config-loading" role="status">
      <i class="el-icon-loading" /> 正在加载配置…
      <div class="knowledge-config-skeleton" />
      <div class="knowledge-config-skeleton short" />
    </div>
    <div v-else-if="loadError" class="knowledge-config-error" role="alert">
      <i class="el-icon-warning-outline" /><strong>配置读取失败</strong>
      <p>{{ loadError }}</p>
      <el-button type="primary" size="small" @click="load">重试</el-button>
    </div>
    <div v-else class="knowledge-config-layout">
      <nav class="knowledge-config-nav" aria-label="方式配置分区">
        <button
          v-for="section in visibleSections"
          :key="section"
          type="button"
          :class="{
            active: activeTab === section,
            error: formErrors[section].length,
          }"
          @click="activeTab = section"
        >
          {{ sectionLabel(section)
          }}<span v-if="formErrors[section].length" aria-label="此分区有错误"
            >●</span
          >
        </button>
        <p>知识库范围由专家配置与用户本轮选择决定。</p>
      </nav>
      <div class="knowledge-config-scroll">
        <section v-if="activeTab === 'basic'" class="knowledge-config-panel">
          <h3>基本信息</h3>
          <p class="knowledge-config-intro">
            {{
              isCustom
                ? "配置方式的运行模式与用途。"
                : "系统内置方式，基本信息由平台维护。"
            }}
          </p>
          <div class="knowledge-config-row">
            <div>
              <strong>运行模式 <em>*</em></strong
              ><small>快速问答使用固定流程；智能推理可调用知识工具。</small>
            </div>
            <div class="knowledge-config-control">
              <el-radio-group
                v-model="draft.runtime"
                :disabled="!editableBasic"
                @change="onRuntimeChange"
                ><el-radio-button label="quick-answer">快速问答</el-radio-button
                ><el-radio-button label="smart-reasoning"
                  >智能推理</el-radio-button
                ></el-radio-group
              >
            </div>
          </div>
          <div
            v-if="draft.runtime === 'smart-reasoning'"
            class="knowledge-config-row"
          >
            <div>
              <strong>方式类型</strong
              ><small>切换类型会更新推荐工具与后台提示词。</small>
            </div>
            <div class="knowledge-config-control">
              <el-select
                v-model="draft.type"
                :disabled="!editableBasic"
                @change="onTypeChange"
                ><el-option
                  v-for="type in types"
                  :key="type"
                  :label="type"
                  :value="type"
              /></el-select>
            </div>
          </div>
          <div v-else class="knowledge-config-row">
            <div>
              <strong>方式类型</strong
              ><small>快速问答沿用固定知识问答流程。</small>
            </div>
            <div class="knowledge-config-control">
              <el-input value="RAG 问答" disabled />
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>名称 <em>*</em></strong
              ><small>用于专家配置和对话中的方式选择。</small>
            </div>
            <div class="knowledge-config-control">
              <el-input
                v-model.trim="draft.name"
                :disabled="!editableBasic"
                maxlength="40"
                placeholder="输入方式名称"
                @input="nameTouched = true"
              />
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>描述</strong
              ><small>说明适用问题、资料要求与处理特点。</small>
            </div>
            <div class="knowledge-config-control">
              <el-input
                v-model.trim="draft.description"
                type="textarea"
                :rows="3"
                :disabled="!editableBasic"
                maxlength="200"
                placeholder="填写用途描述"
                @input="descriptionTouched = true"
              />
            </div>
          </div>
          <p
            v-for="message in formErrors.basic"
            :key="message"
            class="knowledge-config-field-error"
          >
            {{ message }}
          </p>
        </section>

        <section
          v-else-if="activeTab === 'model'"
          class="knowledge-config-panel"
        >
          <h3>模型配置</h3>
          <p class="knowledge-config-intro">
            完成本次知识任务使用的模型和输出规则。
          </p>
          <div class="knowledge-config-row">
            <div>
              <strong>模型 <em>*</em></strong
              ><small>从当前可用的知识任务模型中选择。</small>
            </div>
            <div class="knowledge-config-control">
              <el-select
                v-model="draft.model"
                :disabled="!canManage"
                placeholder="选择模型"
                ><el-option
                  v-for="model in models"
                  :key="model"
                  :label="model"
                  :value="model"
              /></el-select>
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>温度</strong><small>数值越低，回答越稳定。</small>
            </div>
            <div class="knowledge-config-control">
              <el-slider
                v-model="draft.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
                :disabled="!canManage"
              />
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>最大生成 Token 数</strong
              ><small>跟随平台默认时使用当前默认上限 4096 Token。</small>
            </div>
            <div class="knowledge-config-control">
              <el-radio-group v-model="draft.tokenMode" :disabled="!canManage"
                ><el-radio-button label="default">跟随平台默认</el-radio-button
                ><el-radio-button label="custom"
                  >自定义</el-radio-button
                ></el-radio-group
              ><el-input-number
                v-if="draft.tokenMode === 'custom'"
                v-model="draft.maxTokens"
                :min="256"
                :max="8192"
                :step="256"
                :disabled="!canManage"
              /><span v-if="draft.tokenMode === 'custom'">Token</span>
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>思考模式</strong><small>选项随模型能力变化。</small>
            </div>
            <div class="knowledge-config-control">
              <el-select v-model="draft.thinkingMode" :disabled="!canManage"
                ><el-option label="关闭" value="off" /><el-option
                  label="自动"
                  value="auto" /><el-option
                  v-if="draft.model !== '知识问答模型'"
                  label="高强度"
                  value="high"
              /></el-select>
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>来源引用</strong
              ><small
                >关闭后知识结论可能不显示引用标记，但证据仍保存在工具结果中。</small
              >
            </div>
            <div class="knowledge-config-control">
              <el-switch v-model="draft.citations" :disabled="!canManage" />
            </div>
          </div>
          <template v-if="draft.runtime === 'smart-reasoning'">
            <div class="knowledge-config-row">
              <div>
                <strong>最大迭代次数</strong
                ><small>限制单次知识任务内部的工具执行步骤。</small>
              </div>
              <div class="knowledge-config-control">
                <el-radio-group
                  v-model="draft.iterationMode"
                  :disabled="!canManage"
                  ><el-radio-button label="limited">限制次数</el-radio-button
                  ><el-radio-button label="unlimited"
                    >不限次数</el-radio-button
                  ></el-radio-group
                ><el-input-number
                  v-if="draft.iterationMode === 'limited'"
                  v-model="draft.maxIterations"
                  :min="1"
                  :max="100"
                  :disabled="!canManage"
                />
              </div>
            </div>
            <div class="knowledge-config-row">
              <div>
                <strong>模型调用超时</strong
                ><small>单次知识任务的模型等待时间。</small>
              </div>
              <div class="knowledge-config-control">
                <el-input-number
                  v-model="draft.timeout"
                  :min="10"
                  :max="600"
                  :disabled="!canManage"
                /><span>秒</span>
              </div>
            </div>
          </template>
          <div v-if="showRag" class="knowledge-config-row">
            <div>
              <strong>重排模型</strong
              ><small>仅在实际执行 RAG 检索时生效。</small>
            </div>
            <div class="knowledge-config-control">
              <el-select
                v-model="draft.rerankModel"
                :disabled="!canManage"
                placeholder="选择重排模型"
                ><el-option
                  label="默认重排模型"
                  value="默认重排模型" /><el-option
                  label="高精度重排模型"
                  value="高精度重排模型"
              /></el-select>
            </div>
          </div>
          <p
            v-for="message in formErrors.model"
            :key="message"
            class="knowledge-config-field-error"
          >
            {{ message }}
          </p>
        </section>

        <section v-else-if="activeTab === 'rag'" class="knowledge-config-panel">
          <h3>RAG 检索策略</h3>
          <p class="knowledge-config-intro">
            控制本次文档分块检索的召回和筛选。
          </p>
          <p v-if="smartRagReadOnly" class="knowledge-config-note">
            智能推理当前展示生效值；方式级召回参数接入前不可编辑。
          </p>
          <div
            v-if="draft.runtime === 'quick-answer'"
            class="knowledge-config-row"
          >
            <div>
              <strong>本轮查询扩展</strong
              ><small>只优化本次查询，跨轮指代由 Hermes 处理。</small>
            </div>
            <div class="knowledge-config-control">
              <el-switch
                v-model="draft.queryExpansion"
                :disabled="!canManage"
              />
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>召回数量</strong><small>检索返回的最大文档片段数。</small>
            </div>
            <div class="knowledge-config-control">
              <el-input-number
                v-model="draft.topK"
                :min="1"
                :max="100"
                :disabled="!canManage || smartRagReadOnly"
              />
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>关键词阈值</strong
              ><small>过滤低相关性的关键词结果。</small>
            </div>
            <div class="knowledge-config-control">
              <el-slider
                v-model="draft.keywordThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                show-input
                :disabled="!canManage || smartRagReadOnly"
              />
            </div>
          </div>
          <div class="knowledge-config-row">
            <div>
              <strong>向量阈值</strong><small>过滤低相似度的向量结果。</small>
            </div>
            <div class="knowledge-config-control">
              <el-slider
                v-model="draft.vectorThreshold"
                :min="0"
                :max="1"
                :step="0.05"
                show-input
                :disabled="!canManage || smartRagReadOnly"
              />
            </div>
          </div>
          <template v-if="draft.rerankModel"
            ><div class="knowledge-config-row">
              <div>
                <strong>重排保留数量</strong
                ><small>重排后保留的片段数量。</small>
              </div>
              <div class="knowledge-config-control">
                <el-input-number
                  v-model="draft.rerankTopK"
                  :min="1"
                  :max="100"
                  :disabled="!canManage || smartRagReadOnly"
                />
              </div>
            </div>
            <div class="knowledge-config-row">
              <div>
                <strong>重排阈值</strong><small>重排后的最低相关性。</small>
              </div>
              <div class="knowledge-config-control">
                <el-slider
                  v-model="draft.rerankThreshold"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  show-input
                  :disabled="!canManage || smartRagReadOnly"
                />
              </div></div
          ></template>
          <div class="knowledge-config-row">
            <div>
              <strong>FAQ 优先</strong
              ><small>当前方式可处理 FAQ 资料时优先匹配。</small>
            </div>
            <div class="knowledge-config-control">
              <el-switch
                v-model="draft.faqFirst"
                :disabled="!canManage || smartRagReadOnly"
              />
            </div>
          </div>
          <template v-if="draft.faqFirst"
            ><div class="knowledge-config-row">
              <div>
                <strong>直接回答阈值</strong
                ><small>高分 FAQ 可直接形成知识结论。</small>
              </div>
              <div class="knowledge-config-control">
                <el-slider
                  v-model="draft.faqDirectThreshold"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  show-input
                  :disabled="!canManage || smartRagReadOnly"
                />
              </div>
            </div>
            <div class="knowledge-config-row">
              <div>
                <strong>FAQ 分数加权</strong
                ><small>调节 FAQ 与文档召回的评分权重。</small>
              </div>
              <div class="knowledge-config-control">
                <el-slider
                  v-model="draft.faqWeight"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  show-input
                  :disabled="!canManage || smartRagReadOnly"
                />
              </div></div
          ></template>
          <div
            v-if="draft.runtime === 'quick-answer'"
            class="knowledge-config-row"
          >
            <div>
              <strong>表格数据分析</strong
              ><small>命中 CSV／Excel 时可能增加一次模型调用。</small>
            </div>
            <div class="knowledge-config-control">
              <el-switch v-model="draft.tableAnalysis" :disabled="!canManage" />
            </div>
          </div>
          <p
            v-for="message in formErrors.rag"
            :key="message"
            class="knowledge-config-field-error"
          >
            {{ message }}
          </p>
        </section>

        <section
          v-else-if="activeTab === 'tools'"
          class="knowledge-config-panel"
        >
          <h3>工具扩展</h3>
          <p class="knowledge-config-intro">
            选择此方式可调用的知识工具；实际生效能力还受资料和权限限制。
          </p>
          <p v-if="preservedToolsNotice" class="knowledge-config-note">
            {{ preservedToolsNotice }}
          </p>
          <p v-if="deprecatedTools.length" class="knowledge-config-note">
            旧配置中的
            {{ deprecatedTools.join("、") }}
            不在专家知识任务中生效；保存后将从工具配置中移除。
          </p>
          <div class="knowledge-tool-status">
            <span v-for="capability in capabilities" :key="capability"
              >{{ capabilityName(capability) }} 可用</span
            ><span v-if="!capabilities.length"
              >当前暂无默认资料，工具将在执行时重新校验</span
            >
            <span v-if="unavailableToolCount" class="unavailable"
              >{{ unavailableToolCount }} 项工具暂不可用</span
            >
          </div>
          <div
            v-for="group in toolGroups"
            :key="group.name"
            class="knowledge-tool-group"
          >
            <strong>{{ group.name }}（{{ group.items.length }}）</strong>
            <div class="knowledge-tool-grid">
              <label
                v-for="tool in group.items"
                :key="tool.id"
                class="knowledge-tool-card"
                :class="{
                  disabled: !!toolReason(tool),
                  dangerous: tool.dangerous,
                }"
              >
                <el-checkbox
                  :value="draft.tools.includes(tool.id)"
                  :disabled="!canManage || !!toolReason(tool)"
                  @change="toggleTool(tool.id, $event)"
                />
                <span
                  ><b>{{ tool.id }}</b
                  ><small>{{ tool.description }}</small
                  ><em v-if="toolReason(tool)">{{ toolReason(tool) }}</em></span
                >
              </label>
            </div>
          </div>
          <div class="knowledge-effective-tools">
            <strong>实际生效工具</strong>
            <div>
              <span v-for="tool in effectiveTools" :key="tool">{{ tool }}</span
              ><small v-if="!effectiveTools.length"
                >当前没有可执行的知识工具</small
              >
            </div>
          </div>
          <p v-if="unknownTools.length" class="knowledge-config-note">
            已保存但当前工具目录未识别：{{
              unknownTools.join("、")
            }}。这些工具未计入实际生效工具，请核对后再保存。
          </p>
          <p
            v-for="message in formErrors.tools"
            :key="message"
            class="knowledge-config-field-error"
          >
            {{ message }}
          </p>
        </section>
      </div>
    </div>

    <span slot="footer" class="knowledge-config-footer">
      <small v-if="!canManage && !loading && !loadError"
        >缺少方式管理权限，仅可查看当前配置</small
      >
      <small v-else-if="deprecatedTools.length">旧基础工具将在保存后移除</small>
      <small v-else-if="isDirty">有未保存修改</small>
      <el-button @click="requestClose">取消</el-button>
      <el-button
        type="primary"
        :disabled="
          loading ||
          !!loadError ||
          !canManage ||
          hasErrors ||
          (!isDirty && !deprecatedTools.length)
        "
        @click="save"
        >保存配置</el-button
      >
    </span>
  </el-dialog>
</template>

<script>
import {
  initialMethodForm,
  methodSections,
  methodFormErrors,
  usesRagConfig,
  KNOWLEDGE_MODELS,
  EXPERT_KNOWLEDGE_TOOL_GROUPS,
  KNOWLEDGE_TYPE_TOOLS,
  excludedExpertTools,
  effectiveExpertTools,
} from "../knowledge-config";

const clone = (value) => JSON.parse(JSON.stringify(value));
const typeNames = {
  "RAG 问答": "资料检索",
  "Wiki 问答": "维基阅读",
  "Wiki＋RAG 混合": "综合检索",
  数据分析: "表格分析",
  自定义: "自定义知识方式",
};

export default {
  name: "KnowledgeMethodConfigDialog",
  props: {
    visible: { type: Boolean, required: true },
    method: { type: Object, default: null },
    sharedConfig: { type: Object, default: null },
    canManage: { type: Boolean, default: true },
    capabilities: { type: Array, default: () => [] },
  },
  data() {
    return {
      models: KNOWLEDGE_MODELS,
      types: ["RAG 问答", "Wiki 问答", "Wiki＋RAG 混合", "数据分析", "自定义"],
      toolGroups: EXPERT_KNOWLEDGE_TOOL_GROUPS,
      loading: false,
      loadError: "",
      activeTab: "basic",
      draft: initialMethodForm(),
      original: {},
      nameTouched: false,
      descriptionTouched: false,
      preservedToolsNotice: "",
      loadToken: 0,
    };
  },
  computed: {
    isCustom() {
      return Boolean(this.method?.custom);
    },
    isNew() {
      return !this.method?.id;
    },
    editableBasic() {
      return this.canManage && this.isCustom;
    },
    showRag() {
      return usesRagConfig(this.draft);
    },
    smartRagReadOnly() {
      return this.draft.runtime === "smart-reasoning";
    },
    visibleSections() {
      return methodSections(this.draft);
    },
    formErrors() {
      return methodFormErrors(this.draft, this.isCustom);
    },
    hasErrors() {
      return Object.values(this.formErrors).some((errors) => errors.length);
    },
    isDirty() {
      return (
        !this.loading &&
        !this.loadError &&
        JSON.stringify(this.draft) !== JSON.stringify(this.original)
      );
    },
    effectiveTools() {
      return effectiveExpertTools(this.draft.tools).filter((id) => {
        const tool = this.toolGroups
          .flatMap((group) => group.items)
          .find((item) => item.id === id);
        return tool && !this.toolReason(tool);
      });
    },
    unknownTools() {
      const known = new Set(
        this.toolGroups.flatMap((group) => group.items.map((item) => item.id)),
      );
      return effectiveExpertTools(this.draft.tools).filter(
        (id) => !known.has(id),
      );
    },
    deprecatedTools() {
      return excludedExpertTools(this.draft.tools);
    },
    unavailableToolCount() {
      return this.toolGroups
        .flatMap((group) => group.items)
        .filter((tool) => this.toolReason(tool)).length;
    },
  },
  watch: {
    visible(next) {
      if (next) this.load();
    },
    "method.id"() {
      if (this.visible) this.load();
    },
    visibleSections(sections) {
      if (!sections.includes(this.activeTab)) this.activeTab = "basic";
    },
  },
  methods: {
    sectionLabel(key) {
      return {
        basic: "基本信息",
        model: "模型配置",
        rag: "RAG 检索策略",
        tools: "工具扩展",
      }[key];
    },
    capabilityName(key) {
      return { rag: "RAG", wiki: "Wiki", table: "表格" }[key] || key;
    },
    load() {
      const token = ++this.loadToken;
      this.loading = true;
      this.loadError = "";
      this.activeTab = "basic";
      this.preservedToolsNotice = "";
      window.setTimeout(() => {
        if (token !== this.loadToken || !this.visible) return;
        if (
          !this.method ||
          (this.method.id &&
            !this.method.config &&
            !this.method.editConfig &&
            !this.sharedConfig)
        ) {
          this.loadError = "未读取到当前方式的有效配置。";
          this.loading = false;
          return;
        }
        this.draft = initialMethodForm(this.method, this.sharedConfig || {});
        this.original = clone(this.draft);
        this.nameTouched = Boolean(this.method.id && this.isCustom);
        this.descriptionTouched = Boolean(this.method.id && this.isCustom);
        this.loading = false;
      }, 180);
    },
    requestClose() {
      if (!this.isDirty) {
        this.$emit("close");
        return;
      }
      this.$confirm("当前配置尚未保存，要放弃本次修改吗？", "未保存修改", {
        confirmButtonText: "放弃修改",
        cancelButtonText: "继续编辑",
        type: "warning",
      })
        .then(() => this.$emit("close"))
        .catch(() => {});
    },
    onRuntimeChange(runtime) {
      if (runtime === "quick-answer") {
        this.draft.type = "RAG 问答";
        if (!this.draft.rerankModel) this.draft.rerankModel = "默认重排模型";
      } else {
        this.draft.tools = [
          ...new Set([
            ...this.draft.tools,
            ...(KNOWLEDGE_TYPE_TOOLS[this.draft.type] || []),
          ]),
        ];
      }
    },
    onTypeChange(type) {
      const recommended = KNOWLEDGE_TYPE_TOOLS[type] || [];
      const previous = effectiveExpertTools(this.draft.tools).filter(
        (id) => !recommended.includes(id),
      );
      this.draft.tools = [...new Set([...this.draft.tools, ...recommended])];
      this.preservedToolsNotice = previous.length
        ? `已保留原有工具：${previous.join("、")}。请检查它们是否仍适合当前方式类型。`
        : "";
      if (
        ["RAG 问答", "Wiki＋RAG 混合"].includes(type) &&
        !this.draft.rerankModel
      )
        this.draft.rerankModel = "默认重排模型";
      if (!this.nameTouched) this.draft.name = typeNames[type] || "";
      if (!this.descriptionTouched)
        this.draft.description = `使用${typeNames[type] || type}处理知识问题`;
    },
    toolReason(tool) {
      if (tool.blocked) return tool.blocked;
      if (
        tool.capability &&
        this.capabilities.length &&
        !this.capabilities.includes(tool.capability)
      )
        return `当前资料未提供${this.capabilityName(tool.capability)}能力`;
      return "";
    },
    toggleTool(id, enabled) {
      this.draft.tools = enabled
        ? [...new Set([...this.draft.tools, id])]
        : this.draft.tools.filter((item) => item !== id);
    },
    async save() {
      if (!this.canManage || this.hasErrors) {
        this.activeTab =
          Object.keys(this.formErrors).find(
            (key) => this.formErrors[key].length,
          ) || this.activeTab;
        return;
      }
      if (!this.isCustom) {
        try {
          await this.$confirm(
            "修改内置方式的配置会影响所有使用该方式的专家。后续知识任务将使用新配置，已完成任务保留原记录。",
            "保存平台内置方式",
            {
              confirmButtonText: "确认保存",
              cancelButtonText: "取消",
              type: "warning",
            },
          );
        } catch {
          return;
        }
      } else if (!this.isNew) {
        try {
          await this.$confirm(
            "修改此自定义方式会影响所有引用它的专家。后续知识任务使用新配置，已完成任务保留原记录。",
            "保存共享方式",
            {
              confirmButtonText: "确认保存",
              cancelButtonText: "取消",
              type: "warning",
            },
          );
        } catch {
          return;
        }
      }
      this.$emit("save", {
        method: this.method,
        config: {
          ...clone(this.draft),
          tools: effectiveExpertTools(this.draft.tools),
        },
      });
    },
  },
};
</script>
