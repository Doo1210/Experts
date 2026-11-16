<template>
  <section
    class="pc-citation-preview"
    :data-kind="document.kind"
    role="dialog"
    :aria-label="`引用详情 ${document.title}`"
    @keydown.esc.stop="$emit('close')"
  >
    <header class="pc-citation-preview-head pc-knowledge-document-heading">
      <strong :title="document.title">{{ document.title }}</strong>
      <small v-if="document.library" :title="document.library">{{
        document.library
      }}</small>
      <span
        v-if="document.kind"
        class="pc-knowledge-type"
        :data-kind="document.kind"
      >
        {{ document.kind === "wiki" ? "Wiki" : "RAG" }}
      </span>
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
    <div ref="excerpt" class="pc-citation-preview-list">
      <p v-if="fragments.length">{{ fragments[activeIndex] }}</p>
      <p v-else-if="document.kind === 'wiki'">
        {{
          document.original
            ? "点击「查看」阅读完整页面"
            : "点击引用标签定位 Wiki 页面"
        }}
      </p>
      <p v-else>{{ document.id ? "暂无命中片段" : "当前无法访问此资料" }}</p>
    </div>
    <footer v-if="document.original" class="pc-citation-preview-footer">
      <button
        type="button"
        class="pc-knowledge-link"
        @click="$emit('preview', document)"
      >
        查看
      </button>
    </footer>
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
            .filter((item) => item.access === "available")
            .map((item) => item.hit?.text || item.calculation?.summary)
            .filter(Boolean),
        ),
      ];
    },
  },
  methods: {
    visibleLineCount(availableHeight) {
      const excerpt = this.$refs.excerpt;
      const maxHeight = parseFloat(
        getComputedStyle(this.$el).getPropertyValue("--pc-citation-max-height"),
      );
      const { paddingTop, paddingBottom } = getComputedStyle(excerpt);
      const fixedHeight =
        this.$el.offsetHeight -
        excerpt.offsetHeight +
        parseFloat(paddingTop) +
        parseFloat(paddingBottom);
      const lineHeight = parseFloat(
        getComputedStyle(excerpt.firstElementChild).lineHeight,
      );
      return Math.max(
        1,
        Math.floor(
          (Math.min(maxHeight, availableHeight) - fixedHeight) / lineHeight,
        ),
      );
    },
  },
};
</script>
