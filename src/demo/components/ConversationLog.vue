<template>
  <div>
    <pre class="pc-tool-code pc-log-output"
      >{{ preview }}{{ truncated ? "…" : "" }}</pre>
    <button
      v-if="truncated"
      type="button"
      class="pc-output-view-all"
      aria-haspopup="dialog"
      @click="viewAll"
    >
      查看全部
    </button>
  </div>
</template>

<script>
export default {
  name: "ConversationLog",
  props: {
    text: { type: String, required: true },
    title: { type: String, default: "执行结果" },
  },
  computed: {
    preview() {
      return Array.from(this.text.split(/\r?\n/, 8).join("\n"))
        .slice(0, 600)
        .join("");
    },
    truncated() {
      return this.preview.length < this.text.replace(/\r\n/g, "\n").length;
    },
  },
  methods: {
    viewAll(event) {
      this.$emit(
        "view-all",
        {
          kind: "log",
          text: this.text,
          title: this.title,
        },
        event,
      );
    },
  },
};
</script>
