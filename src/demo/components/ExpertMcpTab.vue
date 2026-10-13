<template>
  <div class="expert-mcp-page">
    <div class="section-heading">
      <div>
        <h2>MCP 服务</h2>
        <p>管理当前专家的外部能力，配置变更在新会话生效。</p>
      </div>
      <el-select
        :value="expert.id"
        size="small"
        class="mcp-profile-select"
        @change="switchProfile"
      >
        <el-option
          v-for="profile in demoProfiles"
          :key="profile.id"
          :label="`当前 Profile：${profile.name}`"
          :value="profile.id"
        />
      </el-select>
    </div>
    <div class="mcp-action-bar">
      <strong
        >已配置 {{ expert.mcps.length }} · 已启用 {{ enabledCount }}</strong
      >
      <div>
        <el-input
          v-model="search"
          size="small"
          clearable
          placeholder="搜索 MCP 服务名称"
        /><el-button type="primary" size="small" @click="openImport"
          >从平台导入</el-button
        ><el-button size="small" @click="openForm()">添加服务</el-button>
      </div>
    </div>
    <div class="mcp-card-scroll">
      <div class="mcp-card-grid">
        <div
          v-for="service in visibleServices"
          :key="service.id"
          class="mcp-card"
          role="button"
          tabindex="0"
          :aria-label="`查看 ${service.name} 详情`"
          @click="openDetail(service)"
          @keydown.enter.self.prevent="openDetail(service)"
          @keydown.space.self.prevent="openDetail(service)"
        >
          <div class="mcp-card-top">
            <strong>{{ service.name }}</strong>
            <el-switch
              :value="service.enabled"
              :aria-label="`${service.name} 启用开关`"
              @click.native.stop
              @change="toggleService(service, $event)"
            />
          </div>
          <p class="mcp-card-config" :title="connectionSummary(service)">
            {{ connectionSummary(service) }}
          </p>
          <div class="mcp-card-tool-count">{{ capabilityLabel(service) }}</div>
          <div class="mcp-card-foot">
            <span
              class="mcp-card-status"
              :class="{ pending: needsAttention(service) }"
              >{{ connectionLabel(service) }}</span
            >
            <el-dropdown
              trigger="click"
              @click.native.stop
              @command="handleCardCommand($event, service)"
            >
              <button
                type="button"
                class="mcp-card-more"
                :aria-label="`${service.name} 更多操作`"
                @click.stop
              >
                ···
              </button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="edit">编辑配置</el-dropdown-item>
                <el-dropdown-item command="delete" divided
                  >删除</el-dropdown-item
                >
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>
      <el-empty v-if="!expert.mcps.length" description="还没有 MCP 服务" />
      <el-empty
        v-else-if="!visibleServices.length"
        description="当前筛选下没有服务"
      />
    </div>
    <el-dialog
      :visible.sync="formVisible"
      width="640px"
      custom-class="manage-dialog mcp-form-dialog"
      :close-on-click-modal="false"
      ><div slot="title" class="mcp-dialog-title">
        <span class="mcp-dialog-icon"><i class="el-icon-monitor" /></span
        ><strong>{{ editing ? "编辑 MCP 服务" : "添加外部 MCP 服务" }}</strong>
      </div>
      <div v-if="!editing" class="mcp-form-tabs">
        <button
          type="button"
          :class="{ active: formTab === 'manual' }"
          @click="formTab = 'manual'"
        >
          手动添加</button
        ><button
          v-if="!editing"
          type="button"
          :class="{ active: formTab === 'paste' }"
          @click="formTab = 'paste'"
        >
          粘贴配置
        </button>
      </div>
      <el-form
        v-if="formTab === 'manual'"
        label-position="top"
        @submit.native.prevent="saveForm(false)"
      >
        <el-form-item label="服务名称" required
          ><el-input
            v-model.trim="draft.name"
            maxlength="80"
            placeholder="company-api"
        /></el-form-item>
        <el-form-item label="连接方式" required>
          <el-radio-group v-model="draft.type"
            ><el-radio label="http">Streamable HTTP</el-radio
            ><el-radio label="sse">SSE</el-radio
            ><el-radio label="stdio">本地命令 stdio</el-radio></el-radio-group
          >
        </el-form-item>
        <template v-if="draft.type === 'stdio'">
          <p class="mcp-form-help">
            启动程序在 Hermes 后端所在机器运行，不在当前浏览器电脑运行。
          </p>
          <el-form-item label="启动程序" required
            ><el-input v-model.trim="draft.command" placeholder="npx"
          /></el-form-item>
          <el-form-item label="参数"
            ><el-input
              v-model.trim="draft.args"
              placeholder="-y @company/quality-mcp"
          /></el-form-item>
          <el-form-item label="环境变量"
            ><el-input
              v-model="draft.env"
              type="textarea"
              :rows="3"
              placeholder="QUALITY_API_KEY=${QUALITY_API_KEY}"
          /></el-form-item>
        </template>
        <template v-else>
          <el-form-item label="服务地址" required
            ><el-input
              v-model.trim="draft.url"
              :placeholder="
                draft.type === 'sse'
                  ? 'https://example.com/sse'
                  : 'https://example.com/mcp'
              "
          /></el-form-item>
          <el-form-item label="认证方式"
            ><el-select v-model="draft.auth"
              ><el-option label="无需认证" value="none" /><el-option
                label="Bearer Token"
                value="bearer" /></el-select
          ></el-form-item>
          <el-form-item v-if="draft.auth === 'bearer'" label="Bearer Token"
            ><el-input
              v-model.trim="draft.bearer"
              type="password"
              show-password
              :placeholder="
                editing ? '留空表示沿用已保存密钥' : '输入 Bearer Token'
              "
          /></el-form-item>
        </template>
        <section class="mcp-test-panel">
          <div class="mcp-test-panel-head">
            <div>
              <h4>测试连接</h4>
              <p>测试当前表单，不保存配置</p>
            </div>
            <el-button size="small" @click="testDraft">测试连接</el-button>
          </div>
          <McpTestResult
            v-if="currentFormTest"
            ref="draftTestResult"
            :result="currentFormTest"
          />
        </section>
      </el-form>
      <div v-else class="mcp-paste-panel">
        <div class="mcp-paste-heading">
          <strong>服务配置 JSON</strong>
          <p v-if="editing">编辑当前服务的配置；已保存的密钥不会回显。</p>
          <p v-else>一次只添加一台外部 MCP 服务。粘贴后可直接测试并保存。</p>
        </div>
        <el-input
          v-model="pastedConfig"
          type="textarea"
          :rows="7"
          aria-label="单台 MCP 服务 JSON 配置"
          placeholder='{"mcpServers":{"example":{"url":"https://example.com/mcp"}}}'
        />
        <section class="mcp-test-panel">
          <div class="mcp-test-panel-head">
            <div>
              <h4>测试连接</h4>
              <p>自动解析当前内容，不保存配置</p>
            </div>
            <el-button size="small" @click="testPaste">测试连接</el-button>
          </div>
          <p v-if="pasteError" class="mcp-form-error">{{ pasteError }}</p>
          <McpTestResult
            v-if="currentPasteTest"
            ref="pasteTestResult"
            :result="currentPasteTest"
          />
        </section>
        <div v-if="pastePreview" class="mcp-paste-preview">
          <strong>配置预览</strong>
          <p>
            名称：{{ pastePreview.name }}
            <em v-if="pastePreview.duplicate">重名，保存时自动编号</em>
          </p>
          <p>
            连接方式：{{ transport(pastePreview) }} ·
            {{
              pastePreview.type === "stdio"
                ? `${pastePreview.command} ${pastePreview.args}`
                : pastePreview.url
            }}
          </p>
          <p v-if="pastePreview.variableReminder">
            包含变量占位符，保存前请核对环境变量。
          </p>
        </div>
      </div>
      <p v-if="formTab === 'manual' && formError" class="mcp-form-error">
        {{ formError }}
      </p>
      <div slot="footer" class="mcp-form-footer">
        <small>未测试可保存并启用；测试未通过时请先修复或仅保存</small>
        <div class="mcp-form-footer-actions">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button @click="saveForm(false)">保存</el-button>
          <el-button type="primary" @click="saveForm(true)"
            >保存并启用</el-button
          >
        </div>
      </div>
    </el-dialog>
    <el-dialog
      title="从平台导入 MCP 服务"
      :visible.sync="importVisible"
      width="640px"
      custom-class="manage-dialog mcp-import-dialog"
      :show-close="!importing"
      :close-on-click-modal="false"
      :close-on-press-escape="!importing"
      ><div slot="title" class="mcp-dialog-title">
        <span class="mcp-dialog-icon"><i class="el-icon-monitor" /></span
        ><span
          ><strong>从平台导入 MCP 服务</strong
          ><small>从已导入或已创建的服务中选择，并添加到当前专家</small></span
        >
      </div>
      <div v-if="importing" class="mcp-import-progress">
        <strong>正在导入 MCP 服务… {{ importProgress }}%</strong>
        <el-progress :percentage="importProgress" :stroke-width="10" />
      </div>
      <template v-else>
        <div class="mcp-import-tabs" role="tablist" aria-label="平台 MCP 分类">
          <button
            type="button"
            role="tab"
            :aria-selected="importTab === 'imported'"
            :class="{ active: importTab === 'imported' }"
            @click="changeImportTab('imported')"
          >
            我导入的
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="importTab === 'created'"
            :class="{ active: importTab === 'created' }"
            @click="changeImportTab('created')"
          >
            我创建的
          </button>
        </div>
        <el-table
          ref="importTable"
          :data="importCandidates"
          row-key="id"
          stripe
          max-height="520"
          class="mcp-import-catalog"
          empty-text="暂无可导入的 MCP 服务"
          @selection-change="onImportSelectionChange"
        >
          <el-table-column type="selection" width="48" align="center" />
          <el-table-column label="MCP 服务" min-width="280">
            <template slot-scope="scope">
              <div class="mcp-import-cell">
                <span class="mcp-import-icon" aria-hidden="true">{{
                  scope.row.icon || "🔌"
                }}</span>
                <span class="mcp-import-name"
                  >{{ scope.row.nameZh || scope.row.englishId
                  }}<small>({{ transport(scope.row) }})</small></span
                >
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <span slot="footer"
        ><span
          >已选择 <strong>{{ selectedImports.length }}</strong> 项服务</span
        ><el-button :disabled="importing" @click="importVisible = false"
          >取消</el-button
        ><el-button
          type="primary"
          :loading="importing"
          :disabled="importing || !selectedImports.length"
          @click="importServices"
          >导入</el-button
        ></span
      ></el-dialog
    >
    <el-dialog
      :visible.sync="detailVisible"
      width="800px"
      custom-class="manage-dialog mcp-detail-dialog"
    >
      <div v-if="selectedService" slot="title" class="mcp-detail-head">
        <span class="mcp-dialog-icon"><i class="el-icon-monitor" /></span>
        <span
          ><strong>{{ selectedService.name }}</strong
          ><small
            >{{ transport(selectedService) }} ·
            {{ selectedService.enabled ? "已启用" : "已停用" }}</small
          ></span
        >
      </div>
      <template v-if="selectedService">
        <section class="mcp-detail-card mcp-test-panel">
          <div class="mcp-test-panel-head">
            <div>
              <h4>连接测试</h4>
              <p>测试已保存配置，不执行具体业务工具</p>
            </div>
            <el-button size="small" @click="testService(selectedService)"
              >测试连接</el-button
            >
          </div>
          <McpTestResult
            :result="selectedService"
            :message="detailTestMessage(selectedService)"
            :show-tools="false"
          />
        </section>
        <section class="mcp-detail-card">
          <div class="mcp-detail-section-head">
            <h4>连接配置</h4>
            <el-button type="text" @click="openForm(selectedService)"
              >编辑配置</el-button
            >
          </div>
          <div class="mcp-detail-fields">
            <div>
              <small>连接方式</small
              ><strong>{{ transport(selectedService) }}</strong>
            </div>
            <div v-if="selectedService.type === 'stdio'">
              <small>启动程序</small
              ><strong>{{ selectedService.command }}</strong>
            </div>
            <div v-if="selectedService.type === 'stdio'">
              <small>参数</small
              ><strong>{{ selectedService.args || "无" }}</strong>
            </div>
            <div v-if="selectedService.type === 'stdio'">
              <small>环境变量名</small
              ><strong>{{
                selectedService.envKeys?.join(", ") || "无"
              }}</strong>
            </div>
            <div v-if="selectedService.type !== 'stdio'">
              <small>服务地址</small><strong>{{ selectedService.url }}</strong>
            </div>
            <div v-if="selectedService.type !== 'stdio'">
              <small>认证方式</small
              ><strong>{{
                selectedService.auth === "bearer" ? "Bearer Token" : "无需认证"
              }}</strong>
            </div>
          </div>
        </section>
        <section class="mcp-detail-card">
          <h4>
            已发现工具 <span>{{ selectedService.tools.length }} 项</span>
          </h4>
          <div v-if="selectedService.tools.length">
            <div
              v-for="tool in selectedService.tools"
              :key="tool.name"
              class="mcp-tool-row"
            >
              <span
                ><strong>{{ tool.name }}</strong
                ><small
                  >{{ tool.description
                  }}{{ tool.write ? " · 写操作" : "" }}</small
                ></span
              >
            </div>
          </div>
          <p v-else>
            {{
              selectedService.probe === "ok"
                ? selectedService.promptCount || selectedService.resourceCount
                  ? "该服务没有工具，但提供提示模板或资源。"
                  : "未发现能力。"
                : "测试连接并完成能力发现后，可在这里查看工具。"
            }}
          </p>
        </section>
        <section
          v-if="selectedService.promptCount || selectedService.resourceCount"
          class="mcp-detail-card"
        >
          <button type="button" @click="advancedOpen = !advancedOpen">
            {{ advancedOpen ? "收起" : "展开" }}高级能力：提示模板与资源内容
          </button>
          <div v-if="advancedOpen" class="mcp-advanced-body">
            <p>
              Prompts 是可复用提示模板，Resources
              是可读取内容；它们不同于可执行操作的 Tools。
            </p>
            <div v-if="selectedService.promptCount" class="mcp-advanced-item">
              <strong>提示模板</strong
              ><span>发现 {{ selectedService.promptCount }} 项</span>
            </div>
            <div v-if="selectedService.resourceCount" class="mcp-advanced-item">
              <strong>资源内容</strong
              ><span>发现 {{ selectedService.resourceCount }} 项</span>
            </div>
          </div>
        </section>
      </template>
      <span slot="footer"
        ><el-button @click="detailVisible = false">关闭</el-button></span
      >
    </el-dialog>
  </div>
</template>

<script>
import Vue from "vue";
import McpTestResult from "./McpTestResult.vue";
import { persist, state } from "../state";
import { MCP_HUB_CATALOG } from "../mcp-catalog";
import {
  normalizeMcpService,
  mcpNeedsAttention,
  mcpConnectionLabel,
  mcpCapabilityLabel,
  mcpIsPlatformImported,
  mcpServiceToConfigJson,
  parseSingleMcpConfig,
  mcpDemoOutcome,
  mcpDemoProbe,
} from "../mcp-demo";

const blankDraft = () => ({
  name: "",
  type: "http",
  url: "",
  command: "",
  args: "",
  env: "",
  auth: "none",
  bearer: "",
});
const testFingerprint = (draft) =>
  JSON.stringify([
    draft.name,
    draft.type,
    draft.url,
    draft.command,
    draft.args,
    draft.env,
    draft.type === "stdio" ? "none" : draft.auth,
    draft.bearer,
  ]);
const envNames = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.split("=")[0].trim())
    .filter(Boolean);

export default {
  name: "ExpertMcpTab",
  components: { McpTestResult },
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      search: "",
      formVisible: false,
      formTab: "manual",
      editing: null,
      draft: blankDraft(),
      formTest: null,
      formError: "",
      pastedConfig: "",
      pastePreview: null,
      pasteTest: null,
      pasteError: "",
      importVisible: false,
      importTab: "imported",
      selectedImports: [],
      selectionSyncing: false,
      importing: false,
      importProgress: 0,
      importTimer: null,
      detailVisible: false,
      selectedService: null,
      advancedOpen: false,
    };
  },
  computed: {
    demoProfiles() {
      const profiles = state.experts.filter((item) =>
        ["exp_quality", "exp_ops"].includes(item.id),
      );
      return profiles.some((item) => item.id === this.expert.id)
        ? profiles
        : [this.expert, ...profiles];
    },
    enabledCount() {
      return this.expert.mcps.filter((item) => item.enabled).length;
    },
    visibleServices() {
      const q = this.search.trim().toLowerCase();
      return this.expert.mcps.filter(
        (item) =>
          !q ||
          `${item.name} ${item.url || ""} ${item.command || ""}`
            .toLowerCase()
            .includes(q),
      );
    },
    importCandidates() {
      const installed = new Set(this.expert.mcps.map((item) => item.name));
      const installedCatalogIds = new Set(
        this.expert.mcps
          .filter(mcpIsPlatformImported)
          .map(
            (item) =>
              item.catalogId || String(item.id).replace(/^mcp_import_/, ""),
          ),
      );
      return MCP_HUB_CATALOG.filter(
        (item) =>
          item.scope === this.importTab &&
          !installed.has(item.englishId) &&
          !installedCatalogIds.has(item.id),
      );
    },
    currentFormTest() {
      return this.formTest?.fingerprint === testFingerprint(this.draft)
        ? this.formTest
        : null;
    },
    currentPasteTest() {
      return this.pasteTest?.fingerprint === this.pastedConfig
        ? this.pasteTest
        : null;
    },
  },
  created() {
    this.normalizeServices();
  },
  watch: {
    "expert.id"() {
      this.normalizeServices();
      this.search = "";
      this.detailVisible = false;
      this.formVisible = false;
    },
    "draft.type"(type) {
      if (type === "stdio") this.draft.auth = "none";
    },
    pastedConfig() {
      this.pastePreview = null;
      this.pasteTest = null;
      this.pasteError = "";
    },
    importCandidates() {
      if (this.importVisible && !this.importing)
        this.$nextTick(this.syncImportSelection);
    },
    importVisible(visible) {
      if (visible) this.$nextTick(this.syncImportSelection);
    },
  },
  beforeDestroy() {
    clearInterval(this.importTimer);
  },
  methods: {
    persist,
    normalizeServices() {
      for (const service of this.expert.mcps) {
        const normalized = normalizeMcpService(service);
        for (const [key, value] of Object.entries(normalized))
          if (service[key] === undefined) Vue.set(service, key, value);
      }
    },
    transport(item) {
      return (
        { http: "Streamable HTTP", sse: "SSE", stdio: "本地命令 stdio" }[
          item.type
        ] || item.type
      );
    },
    connectionSummary(item) {
      if (item.type === "stdio")
        return (
          [item.command, item.args].filter(Boolean).join(" ") ||
          "未配置启动程序"
        );
      return item.url || "未配置服务地址";
    },
    needsAttention: mcpNeedsAttention,
    connectionLabel: mcpConnectionLabel,
    capabilityLabel: mcpCapabilityLabel,
    detailTestMessage(item) {
      if (item.stale) return "当前为历史测试结果，请重新测试确认连接。";
      if (item.error) return item.error;
      if (item.probe === "ok" && item.tools.length && !item.allowed.length)
        return "连接正常，当前发现的工具均未启用。";
      if (
        item.probe === "ok" &&
        !item.tools.length &&
        !item.promptCount &&
        !item.resourceCount
      )
        return "连接成功，但未发现工具、提示模板或资源。";
      return "";
    },
    switchProfile(id) {
      if (id === this.expert.id) return;
      this.$router
        .push({
          name: "expert",
          params: { id },
          query: { tab: "mcp", embed: this.$route.query.embed },
        })
        .catch(() => {});
    },
    toggleService(service, enabled) {
      if (enabled && ["auth", "error"].includes(service.probe)) {
        this.$message.warning("当前配置测试未通过；请先修复或重新测试");
        return;
      }
      Vue.set(service, "enabled", Boolean(enabled));
      persist();
    },
    openForm(service = null) {
      this.detailVisible = false;
      this.editing = service;
      this.formVisible = true;
      this.formTab =
        service && mcpIsPlatformImported(service) ? "paste" : "manual";
      this.draft = service
        ? {
            name: service.name,
            type: service.type,
            url: service.url || "",
            command: service.command || "",
            args: service.args || "",
            env: (service.envKeys || [])
              .map((key) => `${key}=\${${key}}`)
              .join("\n"),
            auth: service.auth || "none",
            bearer: "",
          }
        : blankDraft();
      this.formTest = null;
      this.formError = "";
      this.pastedConfig =
        this.formTab === "paste" ? mcpServiceToConfigJson(service) : "";
      this.pastePreview = null;
      this.pasteTest = null;
      this.pasteError = "";
    },
    validateDraft() {
      if (!this.draft.name.trim()) return "请填写服务名称";
      if (
        !this.editing &&
        this.expert.mcps.some((item) => item.name === this.draft.name.trim())
      )
        return "服务名称已存在";
      if (this.draft.type === "stdio" && !this.draft.command.trim())
        return "请填写启动程序";
      if (
        this.draft.type !== "stdio" &&
        !/^https?:\/\//i.test(this.draft.url.trim())
      )
        return "请输入 HTTP(S) 服务地址";
      return "";
    },
    testDraft() {
      const error = this.validateDraft();
      if (error) {
        this.formError = error;
        return;
      }
      this.formError = "";
      const outcome = mcpDemoOutcome({
        ...this.draft,
        bearerConfigured: Boolean(
          this.draft.bearer || this.editing?.bearerConfigured,
        ),
        demoOutcome: this.sameConnection(this.editing)
          ? this.editing.demoOutcome
          : undefined,
      });
      this.formTest = {
        ...mcpDemoProbe(outcome, this.draft.name.trim()),
        fingerprint: testFingerprint(this.draft),
      };
      this.scrollTestResult("draftTestResult");
    },
    sameConnection(service) {
      if (
        !service ||
        service.type !== this.draft.type ||
        service.auth !==
          (this.draft.type === "stdio" ? "none" : this.draft.auth) ||
        this.draft.bearer
      )
        return false;
      return this.draft.type === "stdio"
        ? service.command === this.draft.command.trim() &&
            service.args === this.draft.args.trim() &&
            JSON.stringify(service.envKeys || []) ===
              JSON.stringify(envNames(this.draft.env))
        : service.url === this.draft.url.trim();
    },
    saveForm(enable) {
      if (this.formTab === "paste") return this.savePaste(enable);
      const error = this.validateDraft();
      if (error) {
        this.formError = error;
        return;
      }
      const tested = this.currentFormTest;
      const unchanged = this.sameConnection(this.editing);
      if (
        enable &&
        ((tested && tested.probe !== "ok") ||
          (!tested &&
            unchanged &&
            ["auth", "error"].includes(this.editing.probe)))
      ) {
        this.formError = "当前配置测试未通过；请修复后重试，或先保存为停用";
        return;
      }
      const old = this.editing;
      const probe = tested?.probe || (unchanged ? old.probe : "untested");
      const tools = tested ? tested.tools : unchanged ? old.tools : [];
      const allowed = tested ? tested.allowed : unchanged ? old.allowed : [];
      const service = {
        id: old?.id || `mcp_${Date.now()}`,
        name: this.draft.name.trim(),
        type: this.draft.type,
        url: this.draft.type === "stdio" ? "" : this.draft.url.trim(),
        command: this.draft.type === "stdio" ? this.draft.command.trim() : "",
        args: this.draft.type === "stdio" ? this.draft.args.trim() : "",
        envKeys: this.draft.type === "stdio" ? envNames(this.draft.env) : [],
        auth: this.draft.type === "stdio" ? "none" : this.draft.auth,
        bearerConfigured:
          this.draft.type !== "stdio" && this.draft.auth === "bearer"
            ? Boolean(this.draft.bearer || old?.bearerConfigured)
            : false,
        enabled: enable ? true : (old?.enabled ?? false),
        probe,
        tools,
        allowed,
        promptCount: unchanged ? old.promptCount || 0 : 0,
        resourceCount: unchanged ? old.resourceCount || 0 : 0,
        promptsEnabled: unchanged ? old.promptsEnabled : false,
        resourcesEnabled: unchanged ? old.resourcesEnabled : false,
        checkedAt: tested?.checkedAt || (unchanged ? old.checkedAt : undefined),
        stale: tested ? false : unchanged ? old.stale : false,
        demoOutcome: unchanged ? old.demoOutcome : undefined,
        error:
          tested?.probe !== "ok" && tested
            ? tested.message
            : unchanged
              ? old.error
              : undefined,
        status: probe === "ok" ? "connected" : "pending",
      };
      if (old)
        Object.keys(service).forEach((key) => Vue.set(old, key, service[key]));
      else this.expert.mcps.push(service);
      persist();
      this.formVisible = false;
      this.selectedService = old || service;
      this.detailVisible = true;
      this.$message.success("配置已保存");
    },
    parsePaste() {
      try {
        const preview = parseSingleMcpConfig(
          this.pastedConfig,
          this.expert.mcps
            .filter((item) => item !== this.editing)
            .map((item) => item.name),
        );
        this.pastePreview = preview;
        this.pasteError = "";
        return preview;
      } catch (error) {
        this.pastePreview = null;
        this.pasteTest = null;
        this.pasteError = error.message;
        return null;
      }
    },
    testPaste() {
      const preview = this.parsePaste();
      if (!preview) return;
      const unchanged = this.samePasteConnection(this.editing, preview);
      const result = mcpDemoProbe(
        mcpDemoOutcome({
          ...preview,
          bearerConfigured: Boolean(
            preview.bearerConfigured ||
            (unchanged && this.editing?.bearerConfigured),
          ),
          demoOutcome: unchanged ? this.editing?.demoOutcome : undefined,
        }),
        preview.name,
      );
      this.pasteTest = { ...result, fingerprint: this.pastedConfig };
      this.scrollTestResult("pasteTestResult");
    },
    samePasteConnection(service, preview) {
      return Boolean(
        service &&
        service.type === preview.type &&
        (service.url || "") === preview.url &&
        (service.command || "") === preview.command &&
        (service.args || "") === preview.args &&
        (service.auth || "none") === preview.auth &&
        JSON.stringify(service.envKeys || []) ===
          JSON.stringify(preview.envKeys),
      );
    },
    scrollTestResult(ref) {
      this.$nextTick(() =>
        this.$refs[ref]?.$el?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        }),
      );
    },
    savePaste(enable) {
      const preview = this.parsePaste();
      if (!preview) return;
      const old = this.editing;
      const tested = this.currentPasteTest;
      const sameConnection = this.samePasteConnection(old, preview);
      const unchanged =
        sameConnection && !(preview.bearerConfigured && !old?.bearerConfigured);
      if (
        enable &&
        ((tested && tested.probe !== "ok") ||
          (!tested && unchanged && ["auth", "error"].includes(old.probe)))
      ) {
        this.pasteError = "当前配置测试未通过；请修复后重试，或先保存为停用";
        return;
      }
      const service = {
        ...old,
        id: old?.id || `mcp_paste_${Date.now()}`,
        name: preview.name,
        type: preview.type,
        url: preview.url,
        command: preview.command,
        args: preview.args,
        envKeys: preview.envKeys,
        auth: preview.auth,
        bearerConfigured:
          preview.auth === "bearer"
            ? Boolean(
                preview.bearerConfigured ||
                (sameConnection && old?.bearerConfigured),
              )
            : false,
        enabled: enable ? true : (old?.enabled ?? false),
        probe: tested?.probe || (unchanged ? old.probe : "untested"),
        tools: tested?.tools || (unchanged ? old.tools : []),
        allowed: tested?.allowed || (unchanged ? old.allowed : []),
        promptCount: unchanged ? old.promptCount || 0 : 0,
        resourceCount: unchanged ? old.resourceCount || 0 : 0,
        promptsEnabled: unchanged ? old.promptsEnabled : false,
        resourcesEnabled: unchanged ? old.resourcesEnabled : false,
        checkedAt: tested?.checkedAt || (unchanged ? old.checkedAt : undefined),
        stale: tested ? false : unchanged ? old.stale : false,
        demoOutcome: unchanged ? old.demoOutcome : undefined,
        error:
          tested?.probe !== "ok" && tested
            ? tested.message
            : unchanged
              ? old.error
              : undefined,
        origin:
          old?.origin || (mcpIsPlatformImported(old) ? "platform" : "paste"),
        status:
          (tested?.probe || (unchanged ? old.probe : "untested")) === "ok"
            ? "connected"
            : "pending",
      };
      if (old)
        Object.keys(service).forEach((key) => Vue.set(old, key, service[key]));
      else this.expert.mcps.push(service);
      persist();
      this.formVisible = false;
      this.selectedService = old || service;
      this.detailVisible = true;
      this.$message.success(old ? "配置已保存" : "已添加一台外部 MCP 服务");
    },
    openImport() {
      this.importTab = "imported";
      this.selectedImports = [];
      this.importProgress = 0;
      this.importVisible = true;
    },
    changeImportTab(tab) {
      if (this.importTab === tab) return;
      this.selectionSyncing = true;
      this.importTab = tab;
      this.$nextTick(this.syncImportSelection);
    },
    syncImportSelection() {
      const table = this.$refs.importTable;
      if (!table) return;
      this.selectionSyncing = true;
      table.clearSelection();
      for (const candidate of this.importCandidates)
        if (this.selectedImports.includes(candidate.id))
          table.toggleRowSelection(candidate, true);
      this.$nextTick(() => {
        this.selectionSyncing = false;
      });
    },
    onImportSelectionChange(rows) {
      if (this.selectionSyncing) return;
      const visibleIds = new Set(this.importCandidates.map((item) => item.id));
      this.selectedImports = [
        ...this.selectedImports.filter((id) => !visibleIds.has(id)),
        ...rows.map((item) => item.id),
      ];
    },
    importServices() {
      const selected = MCP_HUB_CATALOG.filter((item) =>
        this.selectedImports.includes(item.id),
      );
      if (!selected.length || this.importing)
        return this.$message.warning("请先勾选要导入的 MCP 服务");
      this.importing = true;
      this.importProgress = 0;
      this.importTimer = setInterval(() => {
        this.importProgress = Math.min(100, this.importProgress + 20);
        if (this.importProgress < 100) return;
        clearInterval(this.importTimer);
        this.importTimer = null;
        for (const item of selected) {
          if (
            this.expert.mcps.some((service) => service.name === item.englishId)
          )
            continue;
          const needsKey = Boolean(item.missingEnv?.length);
          const tools = needsKey
            ? []
            : [
                {
                  name: `${item.englishId}_search`,
                  description: "查询数据",
                  write: false,
                },
                {
                  name: `${item.englishId}_get`,
                  description: "读取数据",
                  write: false,
                },
              ];
          this.expert.mcps.push({
            id: `mcp_import_${item.id}`,
            catalogId: item.id,
            origin: "platform",
            name: item.englishId,
            nameZh: item.nameZh,
            icon: item.icon,
            type: item.transport === "sse" ? "sse" : "http",
            transport: item.transport,
            url: item.url,
            auth: needsKey ? "bearer" : "none",
            bearerConfigured: false,
            enabled: true,
            probe: needsKey ? "auth" : "ok",
            tools,
            allowed: tools.map((tool) => tool.name),
            promptCount: 0,
            resourceCount: 0,
            status: needsKey ? "pending" : "connected",
            error: needsKey ? "需要配置 Bearer Token" : undefined,
          });
        }
        persist();
        this.importing = false;
        this.importVisible = false;
        this.selectedImports = [];
        this.$message.success(`已从平台导入 ${selected.length} 项 MCP 服务`);
      }, 400);
    },
    openDetail(item) {
      this.selectedService = item;
      this.advancedOpen = false;
      this.detailVisible = true;
    },
    handleCardCommand(command, item) {
      if (command === "edit") this.openForm(item);
      if (command === "delete") this.removeService(item);
    },
    testService(item) {
      const outcome = mcpDemoOutcome(item);
      const result = mcpDemoProbe(outcome, item.name);
      const preserveTools =
        result.probe === "ok" && outcome !== "zero" && item.tools.length;
      const resourcesOnly =
        result.probe === "ok" &&
        outcome !== "zero" &&
        !item.tools.length &&
        Boolean(item.promptCount || item.resourceCount);
      Vue.set(item, "probe", result.probe);
      Vue.set(
        item,
        "tools",
        preserveTools ? item.tools : resourcesOnly ? [] : result.tools,
      );
      Vue.set(
        item,
        "allowed",
        preserveTools ? item.allowed : resourcesOnly ? [] : result.allowed,
      );
      Vue.set(item, "checkedAt", result.checkedAt);
      Vue.set(item, "error", result.probe === "ok" ? "" : result.message);
      Vue.set(item, "stale", false);
      Vue.set(item, "status", result.probe === "ok" ? "connected" : "pending");
      if (outcome === "zero") {
        Vue.set(item, "promptCount", 0);
        Vue.set(item, "resourceCount", 0);
      }
      persist();
      this.$message.info("仅模拟连接、握手和能力发现；没有发起真实请求");
    },
    removeService(item) {
      this.$confirm(
        "删除服务配置？相关凭据可能需要单独清理。",
        "删除 MCP 服务",
        {
          type: "warning",
          customClass: "manage-message-box",
        },
      )
        .then(() => {
          this.expert.mcps.splice(this.expert.mcps.indexOf(item), 1);
          persist();
          this.detailVisible = false;
        })
        .catch(() => {});
    },
  },
};
</script>
