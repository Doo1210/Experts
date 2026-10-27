<template>
  <div class="pc-file-diff" role="group" :aria-label="title">
    <div
      v-for="(section, sectionIndex) in parsed.sections"
      :key="sectionIndex"
      class="pc-file-diff-section"
    >
      <div class="pc-file-diff-head">
        <span class="pc-file-diff-path" :title="section.path || title">{{
          section.path || title
        }}</span>
        <span class="pc-file-diff-counts" :aria-label="`新增 ${section.added} 行，删除 ${section.removed} 行`">
          <span class="is-added">+{{ section.added }}</span>
          <span class="is-removed">-{{ section.removed }}</span>
        </span>
      </div>
      <div class="pc-file-diff-lines">
        <div
          v-for="(row, rowIndex) in section.rows"
          :key="rowIndex"
          class="pc-file-diff-line"
          :class="`is-${row.kind}`"
        >
          <span class="pc-file-diff-number">{{
            row.number === null ? "" : row.number
          }}</span>
          <span class="pc-file-diff-sign">{{
            row.kind === "added" ? "+" : row.kind === "removed" ? "−" : ""
          }}</span>
          <span class="pc-file-diff-text">{{ row.text }}</span>
        </div>
      </div>
    </div>
    <div v-if="parsed.truncated" class="pc-file-diff-note">
      差异已截断，上方仅统计显示的增删行。
    </div>
    <div
      v-else-if="parsed.sections.length && !parsed.hasLineNumbers"
      class="pc-file-diff-note"
    >
      差异来源未提供行号。
    </div>
  </div>
</template>

<script>
import { parseConversationDiff } from "../conversation-diff";

export default {
  name: "ConversationDiff",
  props: {
    text: { type: String, default: "" },
    path: { type: String, default: "" },
    title: { type: String, default: "文件改动" },
  },
  computed: {
    parsed() {
      return parseConversationDiff(this.text, this.path);
    },
  },
};
</script>
