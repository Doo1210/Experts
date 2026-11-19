<template>
  <svg
    class="pc-reader-source-icon"
    viewBox="0 0 20 20"
    :data-source="kind"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <path v-if="kind === 'workspace'" d="M2.5 6V4.5h5l2 2h8v10h-15zM2.5 9h15" />
    <g v-else-if="kind === 'wiki'">
      <path
        d="M10 5C7.5 3.5 5 3 2.5 3.5v12C5 15 7.5 15.5 10 17c2.5-1.5 5-2 7.5-1.5v-12C15 3 12.5 3.5 10 5v12"
      />
      <path d="m5 7 2.5.5M5 10l2.5.5m5-3L15 7m-2.5 3.5L15 10" />
    </g>
    <g v-else>
      <path d="M4 2.5h7l5 5v10H4zM11 2.5v5h5M7 11h6m-6 3h6" />
      <path v-if="kind === 'knowledge'" d="M2 6v13h10" />
    </g>
  </svg>
</template>

<script>
export default {
  name: "ReaderSourceIcon",
  props: { kind: { type: String, default: "temporary" } },
  computed: {
    label() {
      return (
        {
          workspace: "工作空间文档",
          knowledge: "知识库文档",
          wiki: "知识库wiki",
          temporary: "临时文件",
          unavailable: "来源不可用",
        }[this.kind] || "文件"
      );
    },
  },
};
</script>
