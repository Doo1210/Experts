<template>
  <div class="expert-tool-page">
    <div class="section-heading">
      <div>
        <h2>工具</h2>
        <p>管理本专家可调用的内置工具集。配置变更将在新会话生效。</p>
      </div>
    </div>
    <div class="tool-action-bar">
      <strong>已启用 {{ enabledCount }} / 共 {{ catalog.length }} 个</strong>
      <div>
        <el-input
          v-model="search"
          size="small"
          clearable
          placeholder="搜索工具集"
        /><el-select v-model="enabledFilter" size="small"
          ><el-option label="全部" value="all" /><el-option
            label="仅已启用"
            value="enabled" /><el-option label="仅已停用" value="disabled"
        /></el-select>
      </div>
    </div>
    <div class="tool-card-grid">
      <div v-for="tool in visibleTools" :key="tool.id" class="tool-card">
        <div class="tool-card-top">
          <button type="button" @click="openDetail(tool)">
            {{ tool.name }}</button
          ><el-switch
            :value="toolEnabled(tool)"
            @change="setToolEnabled(tool, $event)"
          />
        </div>
        <p>{{ tool.description }}</p>
        <div>
          <span>{{ tool.functions.length }} 个工具 · </span
          ><span :class="tool.needsKey ? 'key-needed' : 'ready'">{{
            tool.needsKey ? "缺密钥" : "就绪"
          }}</span>
        </div>
      </div>
    </div>
    <el-empty v-if="!visibleTools.length" description="暂无匹配工具集" />
    <el-dialog
      :visible.sync="detailVisible"
      width="800px"
      custom-class="manage-dialog tool-detail-dialog"
      ><div v-if="selectedTool" slot="title" class="tool-dialog-head">
        <span class="tool-dialog-icon"><i class="el-icon-setting" /></span
        ><span
          ><strong>{{ selectedTool.name }}</strong
          ><small>{{ selectedTool.description }}</small></span
        ><em>{{ draftEnabled ? "已启用" : "已停用" }}</em>
      </div>
      <template v-if="selectedTool"
        ><section class="tool-detail-card">
          <h4>① 配置信息</h4>
          <div class="tool-detail-meta">
            <div><small>可用性</small><strong>未验证</strong></div>
            <div><small>服务提供方</small><strong>内置</strong></div>
            <div>
              <small>凭据状态</small
              ><strong>{{
                selectedTool.needsKey ? "缺少演示密钥" : "无需额外凭据"
              }}</strong>
            </div>
          </div>
        </section>
        <section class="tool-detail-card">
          <h4>② 工具清单 · {{ selectedTool.functions.length }} 个</h4>
          <div
            v-for="fn in selectedTool.functions"
            :key="fn"
            class="tool-function"
          >
            <button
              type="button"
              @click="expandedTool = expandedTool === fn ? '' : fn"
            >
              {{ expandedTool === fn ? "▾" : "▸" }} {{ fn }}
              <span>● 未验证</span>
            </button>
            <p v-if="expandedTool === fn">
              {{ fn }}：当前为本地演示工具，未连接真实服务。
            </p>
          </div>
        </section>
        <div class="tool-detail-toggle">
          <span>是否启用工具集</span
          ><el-switch v-model="draftEnabled" /></div></template
      ><span slot="footer"
        ><span>变更将在新会话生效</span
        ><el-button @click="detailVisible = false">关闭</el-button
        ><el-button
          type="primary"
          :disabled="
            !selectedTool || draftEnabled === toolEnabled(selectedTool)
          "
          @click="saveDetail"
          >保存</el-button
        ></span
      ></el-dialog
    >
  </div>
</template>

<script>
import Vue from "vue";
import { persist } from "../state";

const CATALOG = [
  {
    id: "terminal",
    name: "Terminal",
    description: "Terminal/command execution and process management",
    functions: [
      "terminal",
      "process",
      "write_file",
      "read_file",
      "search_files",
    ],
  },
  {
    id: "file",
    name: "File",
    description: "Read and write files in the workspace",
    functions: ["read_file", "write_file", "list_files", "search_files"],
  },
  {
    id: "browser",
    name: "Browser",
    description: "Browser automation for interactive web tasks",
    functions: [
      "open_page",
      "click",
      "type",
      "screenshot",
      "scroll",
      "navigate",
      "extract",
      "inspect",
      "download",
      "upload",
      "wait",
      "close",
    ],
  },
  {
    id: "web",
    name: "Web",
    description: "Web research and public document retrieval",
    functions: ["web_search", "open_url"],
    needsKey: true,
  },
  {
    id: "vision",
    name: "Vision",
    description: "Image understanding and visual analysis",
    functions: ["analyze_image", "extract_text"],
    needsKey: true,
  },
  {
    id: "code",
    name: "Code Execution",
    description: "Execute code in a sandbox",
    functions: ["run_code", "run_script"],
  },
];

export default {
  name: "ExpertToolTab",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      catalog: CATALOG,
      search: "",
      enabledFilter: "all",
      detailVisible: false,
      selectedTool: null,
      draftEnabled: false,
      expandedTool: "",
    };
  },
  computed: {
    enabledCount() {
      return this.catalog.filter((tool) => this.toolEnabled(tool)).length;
    },
    visibleTools() {
      const q = this.search.trim().toLowerCase();
      return this.catalog.filter(
        (tool) =>
          (!q ||
            `${tool.name} ${tool.description}`.toLowerCase().includes(q)) &&
          (this.enabledFilter === "all" ||
            this.toolEnabled(tool) === (this.enabledFilter === "enabled")),
      );
    },
  },
  methods: {
    toolBinding(tool) {
      return this.expert.tools.find(
        (item) =>
          item.id === `tool_${tool.id}` ||
          (tool.id === "web" && item.id === "tool_search"),
      );
    },
    toolEnabled(tool) {
      return !!this.toolBinding(tool)?.enabled;
    },
    setToolEnabled(tool, enabled) {
      const binding = this.toolBinding(tool);
      if (binding) Vue.set(binding, "enabled", enabled);
      else
        this.expert.tools.push({
          id: `tool_${tool.id}`,
          name: tool.name,
          enabled,
        });
      persist();
    },
    openDetail(tool) {
      this.selectedTool = tool;
      this.draftEnabled = this.toolEnabled(tool);
      this.expandedTool = "";
      this.detailVisible = true;
    },
    saveDetail() {
      this.setToolEnabled(this.selectedTool, this.draftEnabled);
      this.detailVisible = false;
      this.$message.success("工具配置已保存（演示）");
    },
  },
};
</script>
