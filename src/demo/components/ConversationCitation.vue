<template>
  <button
    type="button"
    class="pc-knowledge-citation"
    :data-kind="token.kind"
    aria-haspopup="dialog"
    data-knowledge-source-trigger
    :aria-label="`查看引用 ${token.title}`"
    @mouseenter="emitCitation('citation-enter', $event)"
    @mouseleave="$emit('citation-leave')"
    @click="emitCitation('citation', $event)"
  >
    <i
      :class="token.kind === 'wiki' ? 'el-icon-reading' : 'el-icon-document'"
      aria-hidden="true"
    />
    <span>{{ token.text }}</span>
  </button>
</template>

<script>
export default {
  props: {
    token: { type: Object, required: true },
  },
  methods: {
    emitCitation(name, event) {
      this.$emit(name, {
        numbers: this.token.numbers,
        documentId: this.token.documentId,
        event,
      });
    },
  },
};
</script>
