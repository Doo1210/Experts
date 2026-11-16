<template>
  <div class="pc-file-diff" role="group" :aria-label="title">
    <div
      v-for="(section, sectionIndex) in visibleSections"
      :key="sectionIndex"
      class="pc-file-diff-section"
    >
      <div class="pc-file-diff-head">
        <span class="pc-file-diff-path" :title="section.path || title">{{
          section.path || title
        }}</span>
        <span
          class="pc-file-diff-counts"
          :aria-label="`新增 ${section.added} 行，删除 ${section.removed} 行`"
        >
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
    <div v-if="hasPreview" class="pc-file-diff-note">
      改动预览
      <button
        v-if="$listeners['view-all']"
        type="button"
        class="pc-output-view-all"
        aria-haspopup="dialog"
        @click="viewAll"
      >
        查看全部
      </button>
    </div>
    <div v-else-if="parsed.truncated" class="pc-file-diff-note">
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

const PREVIEW_ROWS = 8;

export default {
  name: "ConversationDiff",
  props: {
    text: { type: String, default: "" },
    path: { type: String, default: "" },
    title: { type: String, default: "文件改动" },
    preview: Boolean,
  },
  computed: {
    parsed() {
      return parseConversationDiff(this.text, this.path);
    },
    hasPreview() {
      return (
        this.preview &&
        this.parsed.sections.reduce(
          (count, section) => count + section.rows.length,
          0,
        ) > PREVIEW_ROWS
      );
    },
    visibleSections() {
      if (!this.hasPreview) return this.parsed.sections;

      const sections = [];
      let remaining = PREVIEW_ROWS;
      for (const section of this.parsed.sections) {
        if (!remaining) break;
        const rows = section.rows.slice(0, remaining);
        sections.push({
          ...section,
          rows,
          added: rows.filter((row) => row.kind === "added").length,
          removed: rows.filter((row) => row.kind === "removed").length,
        });
        remaining -= rows.length;
      }
      return sections;
    },
  },
  methods: {
    viewAll(event) {
      this.$emit(
        "view-all",
        {
          kind: "diff",
          text: this.text,
          path: this.path,
          title: this.title,
        },
        event,
      );
    },
  },
};
</script>
