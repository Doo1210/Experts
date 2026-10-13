<template>
  <div class="mcp-test-result">
    <div class="mcp-test-result-summary">
      <span>上次连接测试</span>
      <strong :class="{ pending: result.probe !== 'ok' }">{{
        statusLabel
      }}</strong>
      <time v-if="result.checkedAt">{{ result.checkedAt }}</time>
    </div>
    <p
      v-if="resultMessage"
      :class="{ pending: result.probe !== 'ok' || result.stale }"
    >
      {{ resultMessage }}
    </p>
    <div
      v-if="showTools && result.probe === 'ok'"
      class="mcp-test-result-tools"
    >
      <strong
        >发现的工具 <span>{{ tools.length }} 项</span></strong
      >
      <ul v-if="tools.length">
        <li v-for="tool in tools" :key="tool.name">
          <span>{{ tool.name }}</span>
          <small>{{
            tool.description || (tool.write ? "写操作" : "读取操作")
          }}</small>
        </li>
      </ul>
      <p v-else>未发现工具</p>
    </div>
  </div>
</template>

<script>
export default {
  name: "McpTestResult",
  props: {
    result: { type: Object, required: true },
    message: { type: String, default: "" },
    showTools: { type: Boolean, default: true },
  },
  computed: {
    statusLabel() {
      return (
        { ok: "成功", auth: "需要凭据", error: "失败", untested: "未测试" }[
          this.result.probe
        ] || "未测试"
      );
    },
    resultMessage() {
      return this.message || this.result.error || this.result.message || "";
    },
    tools() {
      return Array.isArray(this.result.tools) ? this.result.tools : [];
    },
  },
};
</script>
