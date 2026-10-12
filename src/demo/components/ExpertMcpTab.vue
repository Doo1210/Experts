<template>
  <div class="expert-mcp-page">
    <div class="section-heading">
      <div>
        <h2>MCP</h2>
        <p>
          添加 Streamable HTTP、SSE
          或本地命令服务，也可粘贴配置或从平台导入。变更在新会话生效。
        </p>
      </div>
    </div>
    <div class="mcp-action-bar">
      <strong
        >已启用 {{ enabledCount }} 台 · 需处理 {{ pendingCount }} 台</strong
      >
      <div>
        <el-input
          v-model="search"
          size="small"
          clearable
          placeholder="搜索 MCP 服务名称"
        /><el-button type="primary" size="small" @click="openImport"
          >从平台导入</el-button
        ><el-button size="small" @click="openForm()">添加</el-button>
      </div>
    </div>
    <div class="mcp-card-grid">
      <div
        v-for="service in visibleServices"
        :key="service.id"
        class="mcp-card"
      >
        <div class="mcp-card-top">
          <button type="button" @click="openDetail(service)">
            {{ service.name }}</button
          ><el-switch v-model="service.enabled" @change="persist" />
        </div>
        <p>
          {{ transport(service) }} ·<br />{{
            service.url ||
            (service.type === "stdio" ? "本地命令" : "演示服务地址")
          }}
        </p>
        <div class="mcp-card-foot">
          <span :class="{ pending: service.status !== 'connected' }"
            >{{ service.status === "connected" ? "正常" : "需处理" }} ·
            {{ service.toolCount || 4 }} 个工具</span
          ><el-dropdown @command="(command) => serviceCommand(command, service)"
            ><button type="button" :aria-label="`更多操作：${service.name}`">
              ···</button
            ><el-dropdown-menu slot="dropdown"
              ><el-dropdown-item command="detail">查看详情</el-dropdown-item
              ><el-dropdown-item command="edit">编辑配置</el-dropdown-item
              ><el-dropdown-item command="test">模拟测通</el-dropdown-item
              ><el-dropdown-item command="remove"
                >删除</el-dropdown-item
              ></el-dropdown-menu
            ></el-dropdown
          >
        </div>
      </div>
    </div>
    <el-empty v-if="!visibleServices.length" description="暂无 MCP 服务" />
    <el-dialog
      :visible.sync="formVisible"
      width="640px"
      custom-class="manage-dialog mcp-form-dialog"
      :close-on-click-modal="false"
      ><div slot="title" class="mcp-dialog-title">
        <span class="mcp-dialog-icon"><i class="el-icon-monitor" /></span
        ><strong>{{ editing ? "编辑 MCP 服务" : "添加外部 MCP 服务" }}</strong>
      </div>
      <div class="mcp-form-tabs">
        <button
          type="button"
          :class="{ active: formTab === 'manual' }"
          @click="formTab = 'manual'"
        >
          手动添加</button
        ><button
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
        @submit.native.prevent="saveForm"
        ><el-form-item label="服务名称" required
          ><el-input
            v-model.trim="draft.name"
            maxlength="80"
            placeholder="company-api" /></el-form-item
        ><el-form-item label="连接方式" required
          ><el-radio-group v-model="draft.type"
            ><el-radio label="http">Streamable HTTP</el-radio
            ><el-radio label="sse">SSE</el-radio
            ><el-radio label="stdio">本地命令 stdio</el-radio></el-radio-group
          ></el-form-item
        ><el-form-item
          :label="draft.type === 'stdio' ? '启动命令' : '服务地址'"
          required
          ><el-input
            v-model.trim="draft.url"
            :placeholder="
              draft.type === 'stdio' ? 'npx server' : 'https://example.com/mcp'
            " /></el-form-item
        ><el-form-item label="认证方式"
          ><el-select v-model="draft.auth"
            ><el-option label="无需认证" value="none" /><el-option
              label="Bearer Token（演示）"
              value="bearer" /></el-select></el-form-item
        ><el-form-item label="服务状态"
          ><el-switch v-model="draft.enabled" /><span class="mcp-enable-label"
            >添加后启用</span
          ></el-form-item
        ></el-form
      >
      <div v-else class="mcp-paste-panel">
        <p>粘贴 MCP JSON 配置，在浏览器本地解析并加入演示列表。</p>
        <el-input
          v-model="pastedConfig"
          type="textarea"
          :rows="10"
          placeholder='{"mcpServers":{"example":{"url":"https://example.com/mcp"}}}'
        />
      </div>
      <span slot="footer"
        ><el-button @click="formVisible = false">取消</el-button
        ><el-button
          type="primary"
          :disabled="
            formTab === 'manual'
              ? !draft.name || !draft.url
              : !pastedConfig.trim()
          "
          @click="saveForm"
          >{{ editing ? "保存" : "添加并测试" }}</el-button
        ></span
      ></el-dialog
    >
    <el-dialog
      title="从平台导入 MCP"
      :visible.sync="importVisible"
      width="640px"
      custom-class="manage-dialog mcp-import-dialog"
      ><div slot="title" class="mcp-dialog-title">
        <span class="mcp-dialog-icon"><i class="el-icon-connection" /></span
        ><span
          ><strong>从平台导入 MCP</strong
          ><small>选择可用的演示服务加入当前专家</small></span
        >
      </div>
      <div class="mcp-import-list">
        <label v-for="candidate in importCandidates" :key="candidate.id"
          ><el-checkbox
            :value="selectedImports.includes(candidate.id)"
            @change="toggleImport(candidate.id)"
          /><strong>{{ candidate.name }}</strong
          ><small
            >{{ transport(candidate) }} · {{ candidate.url }}</small
          ></label
        ><el-empty
          v-if="!importCandidates.length"
          description="暂无可导入服务"
        />
      </div>
      <span slot="footer"
        ><span>已选择 {{ selectedImports.length }} 台</span
        ><el-button @click="importVisible = false">取消</el-button
        ><el-button
          type="primary"
          :disabled="!selectedImports.length"
          @click="importServices"
          >导入</el-button
        ></span
      ></el-dialog
    >
    <el-dialog
      :visible.sync="detailVisible"
      width="800px"
      custom-class="manage-dialog mcp-detail-dialog"
      ><div v-if="selectedService" slot="title" class="mcp-detail-head">
        <span class="mcp-dialog-icon"><i class="el-icon-monitor" /></span
        ><span
          ><strong>{{ selectedService.name }}</strong
          ><small>{{ selectedService.url || "本地命令" }}</small></span
        ><em>{{ transport(selectedService) }}</em
        ><em>{{ selectedService.enabled ? "已启用" : "已停用" }}</em>
      </div>
      <template v-if="selectedService"
        ><div class="mcp-connect-line">
          <strong
            >●
            {{
              selectedService.status === "connected"
                ? "模拟连接正常"
                : "尚未测试"
            }}</strong
          ><el-button size="mini" @click="testService(selectedService)"
            >模拟测通</el-button
          >
        </div>
        <section class="mcp-detail-card">
          <h4>① 配置信息</h4>
          <div class="mcp-detail-fields">
            <div>
              <small>连接方式</small
              ><strong>{{ transport(selectedService) }}</strong>
            </div>
            <div>
              <small>服务地址</small
              ><strong>{{ selectedService.url || "本地命令" }}</strong>
            </div>
            <div>
              <small>认证方式</small
              ><strong>{{
                selectedService.auth === "bearer"
                  ? "Bearer Token（演示）"
                  : "无认证"
              }}</strong>
            </div>
          </div>
          <button type="button" @click="openForm(selectedService)">
            配置操作 ▾
          </button>
        </section>
        <section class="mcp-detail-card">
          <h4>② 可用能力 · {{ selectedService.toolCount || 4 }} 项</h4>
          <div
            v-for="tool in abilityNames(selectedService)"
            :key="tool"
            class="mcp-ability"
          >
            <strong>{{ tool }}</strong
            ><small>按条件处理相关数据或资源（演示）。</small>
          </div>
        </section></template
      ><span slot="footer"
        ><span>变更将在新会话生效</span
        ><el-button @click="detailVisible = false">关闭</el-button
        ><el-button type="primary" disabled>保存</el-button></span
      ></el-dialog
    >
  </div>
</template>

<script>
import Vue from "vue";
import { persist } from "../state";

const CANDIDATES = [
  {
    id: "filesystem",
    name: "filesystem",
    type: "http",
    url: "https://fs.demo.internal/mcp",
    toolCount: 4,
  },
  {
    id: "agv-fleet",
    name: "agv-fleet",
    type: "sse",
    url: "https://agv.demo.internal/mcp/sse",
    toolCount: 4,
  },
  {
    id: "layout-cad",
    name: "layout-cad",
    type: "http",
    url: "https://cad.demo.internal/mcp",
    toolCount: 4,
  },
];

export default {
  name: "ExpertMcpTab",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      search: "",
      formVisible: false,
      formTab: "manual",
      editing: null,
      draft: { name: "", type: "http", url: "", auth: "none", enabled: true },
      pastedConfig: "",
      importVisible: false,
      selectedImports: [],
      detailVisible: false,
      selectedService: null,
    };
  },
  computed: {
    enabledCount() {
      return this.expert.mcps.filter((item) => item.enabled).length;
    },
    pendingCount() {
      return this.expert.mcps.filter((item) => item.status !== "connected")
        .length;
    },
    visibleServices() {
      const q = this.search.trim().toLowerCase();
      return this.expert.mcps.filter(
        (item) =>
          !q || `${item.name} ${item.url || ""}`.toLowerCase().includes(q),
      );
    },
    importCandidates() {
      return CANDIDATES.filter(
        (item) =>
          !this.expert.mcps.some(
            (service) => service.id === `mcp_import_${item.id}`,
          ),
      );
    },
  },
  methods: {
    persist,
    transport(item) {
      return (
        { http: "Streamable HTTP", sse: "SSE", stdio: "本地命令 stdio" }[
          item.type
        ] || item.type
      );
    },
    openForm(service = null) {
      this.detailVisible = false;
      this.editing = service;
      this.formTab = "manual";
      this.pastedConfig = "";
      this.draft = service
        ? {
            name: service.name,
            type: service.type,
            url: service.url || "",
            auth: service.auth || "none",
            enabled: service.enabled,
          }
        : { name: "", type: "http", url: "", auth: "none", enabled: true };
      this.formVisible = true;
    },
    saveForm() {
      let next = { ...this.draft };
      if (this.formTab === "paste") {
        try {
          const data = JSON.parse(this.pastedConfig);
          const [name, config] =
            Object.entries(data.mcpServers || data)[0] || [];
          if (!name || !config || typeof config !== "object")
            throw new Error("invalid");
          next = {
            name,
            type: config.command
              ? "stdio"
              : String(config.url || "").includes("/sse")
                ? "sse"
                : "http",
            url: config.url || config.command || "",
            auth: "none",
            enabled: true,
          };
        } catch {
          return this.$message.warning("请输入有效的 MCP JSON 配置");
        }
      }
      if (!next.name.trim() || !next.url.trim())
        return this.$message.warning("请填写服务名称和地址或命令");
      if (this.editing)
        Object.keys(next).forEach((key) =>
          Vue.set(this.editing, key, next[key]),
        );
      else
        this.expert.mcps.push({
          id: `mcp_${Date.now()}`,
          ...next,
          status: "connected",
          toolCount: 4,
        });
      persist();
      this.formVisible = false;
      this.$message.success("MCP 服务已加入演示配置；连通结果为本地模拟");
    },
    openImport() {
      this.selectedImports = [];
      this.importVisible = true;
    },
    toggleImport(id) {
      this.selectedImports = this.selectedImports.includes(id)
        ? this.selectedImports.filter((value) => value !== id)
        : [...this.selectedImports, id];
    },
    importServices() {
      for (const id of this.selectedImports) {
        const item = CANDIDATES.find((candidate) => candidate.id === id);
        if (
          item &&
          !this.expert.mcps.some((service) => service.id === `mcp_import_${id}`)
        )
          this.expert.mcps.push({
            ...item,
            id: `mcp_import_${id}`,
            enabled: true,
            status: "connected",
          });
      }
      persist();
      this.importVisible = false;
      this.$message.success("MCP 服务已导入（演示）");
    },
    openDetail(item) {
      this.selectedService = item;
      this.detailVisible = true;
    },
    testService(item) {
      Vue.set(item, "status", "connected");
      persist();
      this.$message.success("本地演示测通成功");
    },
    abilityNames(item) {
      return Array.from(
        { length: item.toolCount || 4 },
        (_, index) =>
          `${item.name}_${["search", "get", "list", "export"][index % 4]}`,
      );
    },
    serviceCommand(command, item) {
      if (command === "detail") this.openDetail(item);
      else if (command === "edit") this.openForm(item);
      else if (command === "test") this.testService(item);
      else
        this.$confirm(`确定删除“${item.name}”？`, "删除 MCP 服务", {
          type: "warning",
          customClass: "manage-message-box",
        })
          .then(() => {
            this.expert.mcps.splice(this.expert.mcps.indexOf(item), 1);
            persist();
          })
          .catch(() => {});
    },
  },
};
</script>
