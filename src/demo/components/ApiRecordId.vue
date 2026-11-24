<template>
  <span class="expert-api-copy-value">
    <code :title="value">{{ value }}</code>
    <el-button
      type="text"
      class="expert-api-icon-copy"
      icon="el-icon-document-copy"
      :title="`复制 ${label}`"
      :aria-label="`复制 ${label} ${value}`"
      @click.stop="copy"
    />
  </span>
</template>

<script>
import { copyApiText } from "../external-api";

export default {
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  methods: {
    copy() {
      return copyApiText(this, this.value, "已复制 ID");
    },
  },
};
</script>
