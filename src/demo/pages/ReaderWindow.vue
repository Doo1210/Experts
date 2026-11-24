<template>
  <div
    class="reader-window"
    :class="{ 'is-graph': snapshot && snapshot.mode === 'graph' }"
  >
    <div v-if="error" class="reader-window-empty" role="alert">{{ error }}</div>
    <div v-else-if="!snapshot" class="reader-window-empty" role="status">
      正在打开文档…
    </div>
    <template v-else>
      <aside
        v-if="snapshot.mode === 'graph'"
        class="reader-wiki-graph"
        aria-label="Wiki 所在图谱"
      >
        <header>
          <strong>知识图谱</strong><span>当前 Wiki 的索引关系</span>
        </header>
        <svg
          :viewBox="'0 0 480 ' + (graphNodes.length * 100 + 80)"
          role="img"
          :aria-label="snapshot.context.path"
        >
          <g
            v-for="(node, index) in graphNodes"
            :key="index"
            :class="{ 'is-current': index === graphNodes.length - 1 }"
          >
            <path
              v-if="index"
              :d="`M240 ${index * 100 - 14}V${index * 100 + 34}`"
            />
            <rect
              x="60"
              :y="index * 100 + 34"
              width="360"
              height="52"
              rx="10"
            />
            <text x="240" :y="index * 100 + 65" text-anchor="middle">
              {{ node }}
            </text>
          </g>
        </svg>
        <p>已定位到「{{ snapshot.tab.item.name }}」</p>
      </aside>
      <FileReader
        :tabs="[snapshot.tab]"
        :active-key="snapshot.tab.key"
        :width="900"
        :max-width="4000"
        :context="snapshot.context"
        standalone
        @retry="restorePreview"
      />
    </template>
  </div>
</template>

<script>
import FileReader from "../components/FileReader.vue";
import { readReaderWindow } from "../reader-window";
import { demoPreviewFor } from "../file-preview";

export default {
  name: "ReaderWindow",
  components: { FileReader },
  data: () => ({ snapshot: null, error: "", loadId: 0 }),
  computed: {
    graphNodes() {
      return this.snapshot.context.path.split("/");
    },
  },
  async mounted() {
    try {
      const snapshot = await readReaderWindow(this.$route.params.id);
      if (!snapshot)
        throw new Error("文档预览已过期或不可用，请从原入口重新打开");
      this.snapshot = snapshot;
      await this.restorePreview();
      document.title =
        snapshot.tab.item.name +
        (snapshot.mode === "graph" ? " · 知识图谱" : " · 文件预览");
    } catch (error) {
      this.error = error.message;
    }
  },
  beforeDestroy() {
    this.loadId++;
    if (this.snapshot?.tab.url?.startsWith("blob:"))
      URL.revokeObjectURL(this.snapshot.tab.url);
  },
  methods: {
    async restorePreview() {
      const tab = this.snapshot.tab;
      const loadId = ++this.loadId;
      tab.status = "loading";
      this.$set(tab, "error", "");
      if (tab.url?.startsWith("blob:")) URL.revokeObjectURL(tab.url);
      try {
        let url = "";
        // Older local snapshots can reopen with the current static demo renderer.
        if (
          !["demo", "image", "pdf", "markdown", "text"].includes(tab.format)
        ) {
          const demo = demoPreviewFor(tab.item);
          if (!demo) throw new Error("请从文件入口重新打开预览");
          tab.format = "demo";
          this.$set(tab, "demo", demo);
        }
        if (tab.blob && ["image", "pdf"].includes(tab.format))
          url = URL.createObjectURL(tab.blob);
        if (loadId !== this.loadId) return;
        this.$set(tab, "url", url);
        tab.status = "ready";
      } catch (error) {
        if (loadId !== this.loadId) return;
        tab.error = error.message || "文档暂时无法打开，请重试";
        tab.status = "error";
      }
    },
  },
};
</script>

<style>
.demo-app.is-reader-window > .platform-sidebar {
  display: none;
}
.demo-app.is-reader-window .main-area {
  margin: 0;
  padding: 0;
}
.demo-app.is-reader-window .main-area > main {
  height: 100vh;
  padding: 0;
  overflow: hidden;
}
.reader-window {
  display: flex;
  width: 100%;
  height: 100%;
  background: #fff;
}
.reader-window-empty {
  margin: auto;
  padding: 24px;
  color: #737373;
}
.reader-wiki-graph {
  flex: 0 0 48%;
  min-width: 0;
  padding: 28px;
  overflow: auto;
  border-right: 1px solid #e8e8e8;
  background: #fafafa;
}
.reader-wiki-graph header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #333;
}
.reader-wiki-graph header span,
.reader-wiki-graph p {
  color: #8a8a8a;
  font-size: 12px;
}
.reader-wiki-graph svg {
  width: 100%;
  max-height: 70vh;
  margin: 24px 0;
}
.reader-wiki-graph path {
  stroke: #d4d4d4;
  stroke-width: 1.5;
}
.reader-wiki-graph rect {
  fill: #fff;
  stroke: #ddd;
}
.reader-wiki-graph text {
  fill: #737373;
  font-size: 14px;
}
.reader-wiki-graph .is-current rect {
  fill: #e8f0ff;
  stroke: #407dff;
}
.reader-wiki-graph .is-current text {
  fill: #3070ef;
  font-weight: 600;
}
@media (max-width: 700px) {
  .reader-window.is-graph {
    flex-direction: column;
    overflow: auto;
  }
  .reader-wiki-graph {
    flex: 0 0 auto;
  }
  .reader-window.is-graph .pc-reader-standalone {
    flex: 0 0 80vh;
  }
}
</style>
