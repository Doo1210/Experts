<template>
  <section
    class="pc-citation-preview"
    role="dialog"
    :aria-label="`引用详情 ${document.title}`"
    @keydown.esc.stop="$emit('close')"
  >
    <header class="pc-citation-preview-head pc-knowledge-document-heading">
      <strong :title="document.title">{{ document.title }}</strong>
      <small v-if="document.library" :title="document.library">{{
        document.library
      }}</small>
    </header>
    <div
      v-if="fragments.length > 1"
      class="pc-citation-preview-tabs"
      role="group"
      aria-label="命中片段"
    >
      <button
        v-for="(fragment, index) in fragments"
        :key="index"
        type="button"
        :aria-pressed="activeIndex === index"
        @click="activeIndex = index"
      >
        片段 {{ index + 1 }}
      </button>
    </div>
    <div :key="activeIndex" class="pc-citation-preview-list">
      <p v-if="fragments.length">{{ fragments[activeIndex] }}</p>
      <p v-else>{{ document.id ? "暂无命中片段" : "当前无法访问此资料" }}</p>
    </div>
  </section>
</template>

<script>
export default {
  props: {
    document: { type: Object, required: true },
    evidence: { type: Array, required: true },
  },
  data() {
    return { activeIndex: 0 };
  },
  computed: {
    fragments() {
      return [
        ...new Set(
          this.evidence
            .map((item) => item.hit?.text || item.calculation?.summary)
            .filter(Boolean),
        ),
      ];
    },
  },
};
</script>
