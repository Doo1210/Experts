<template>
  <div class="pc-reader-context" aria-label="文档路径与操作">
    <div ref="pathSlot" class="pc-reader-location-slot">
      <div
        ref="location"
        class="pc-reader-location"
        :title="pathTitle"
        :data-tooltip-heading="pathSourceLabel || null"
        :data-tooltip-description="pathSourceLabel ? context.path : null"
      >
        <ReaderSourceIcon ref="sourceIcon" :kind="context.kind" />
        <div
          ref="path"
          class="pc-reader-path"
          :title="pathTitle"
          :data-tooltip-heading="pathSourceLabel || null"
          :data-tooltip-description="pathSourceLabel ? context.path : null"
        >
          <span>{{ displayPath }}</span>
          <span
            ref="measure"
            class="pc-reader-path-measure"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
    <div class="pc-reader-context-actions">
      <button
        v-for="action in actions"
        :key="action"
        type="button"
        :aria-label="labels[action]"
        :title="labels[action]"
        :disabled="busy || (action === 'locate' && !ready)"
        @click="$emit(action)"
      >
        <svg v-if="action === 'locate'" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2v3m0 10v3M2 10h3m10 0h3" />
          <circle cx="10" cy="10" r="5" />
          <circle cx="10" cy="10" r="1.5" />
        </svg>
        <svg
          v-else-if="action === 'open'"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M11 3h6v6m0-6-8 8M8 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4"
          />
        </svg>
        <svg v-else viewBox="0 0 20 20" aria-hidden="true">
          <path d="m7 6 6 2M6 8l2 6m4-2-2 3" />
          <circle cx="5" cy="5" r="3" />
          <circle cx="15" cy="9" r="3" />
          <circle cx="9" cy="16" r="2.5" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { compactReaderPath } from "../reader-context";
import ReaderSourceIcon from "./ReaderSourceIcon.vue";

export default {
  name: "ReaderContextBar",
  components: { ReaderSourceIcon },
  props: {
    context: { type: Object, required: true },
    availableWidth: { type: Number, default: 0 },
    ready: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    standalone: { type: Boolean, default: false },
  },
  data: () => ({
    displayPath: "",
    labels: {
      locate: "定位到引用片段",
      open: "新开网页标签页查看",
      graph: "在图谱中查看",
    },
  }),
  computed: {
    pathSourceLabel() {
      return (
        {
          workspace: "工作空间文件",
          knowledge: "知识库文档",
          wiki: "知识库 Wiki",
        }[this.context.kind] || ""
      );
    },
    pathTitle() {
      return this.pathSourceLabel
        ? `${this.pathSourceLabel}\n${this.context.path}`
        : this.context.path;
    },
    actions() {
      return this.context.actions.filter(
        (action) => !this.standalone || action === "locate",
      );
    },
  },
  mounted() {
    this._pathObserver = new ResizeObserver(this.updatePath);
    this._pathObserver.observe(this.$refs.pathSlot);
    this.updatePath();
  },
  watch: {
    availableWidth() {
      this.$nextTick(this.updatePath);
    },
    "context.path"() {
      this.$nextTick(this.updatePath);
    },
  },
  beforeDestroy() {
    this._pathObserver?.disconnect();
  },
  methods: {
    updatePath() {
      const measure = this.$refs.measure;
      if (!measure) return;
      const style = getComputedStyle(this.$refs.location);
      const inset = [
        "paddingLeft",
        "paddingRight",
        "borderLeftWidth",
        "borderRightWidth",
        "columnGap",
      ].reduce((total, name) => total + (parseFloat(style[name]) || 0), 0);
      const iconWidth = this.$refs.sourceIcon.$el.getBoundingClientRect().width;
      measure.style.width =
        Math.max(1, this.$refs.pathSlot.clientWidth - inset - iconWidth) + "px";
      this.displayPath = compactReaderPath(this.context.path, (candidate) => {
        measure.textContent = candidate;
        return measure.scrollWidth <= measure.clientWidth;
      });
    },
  },
};
</script>
