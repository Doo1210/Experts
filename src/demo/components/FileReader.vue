<template>
  <section
    id="pc-file-reader"
    class="pc-file-reader"
    :style="{ width: width + 'px', flexBasis: width + 'px' }"
    aria-label="文件阅读区"
  >
    <PanelResizeHandle
      class="pc-reader-resize"
      label="调整文件阅读区宽度"
      controls="pc-file-reader"
      :min-width="minWidth"
      :max-width="maxWidth"
      :width="width"
      @resize="$emit('resize', $event)"
    />
    <div class="pc-reader-toolbar">
      <div class="pc-reader-tabs-wrap">
        <button
          v-show="tabsCanScrollLeft"
          key="reader-tabs-left"
          type="button"
          class="pc-resource-nav pc-reader-tabs-nav is-left"
          aria-label="向左查看文件标签"
          @click="scrollTabs(-1)"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
        </button>
        <div
          key="reader-tabs-strip"
          ref="tabs"
          class="pc-reader-tabs"
          role="tablist"
          aria-label="已打开的文件"
          @scroll.passive="updateTabsOverflow"
        >
          <div
            v-for="(tab, index) in tabs"
            :key="tab.key"
            class="pc-reader-tab"
            :class="{ active: tab.key === activeKey }"
          >
            <button
              :id="'pc-reader-tab-' + index"
              class="pc-reader-tab-select"
              type="button"
              role="tab"
              :aria-selected="tab.key === activeKey"
              aria-controls="pc-reader-document"
              :tabindex="tab.key === activeKey ? 0 : -1"
              :title="tab.item.name"
              @click="selectTab(tab.key)"
              @keydown="navigateTabs($event, index)"
            >
              <i
                :class="
                  tab.item.knowledgeSource
                    ? 'el-icon-reading'
                    : 'el-icon-document'
                "
                aria-hidden="true"
              />
              <span>{{ tab.item.name }}</span>
            </button>
            <button
              class="pc-reader-tab-close"
              type="button"
              :aria-label="'关闭文件 ' + tab.item.name"
              @click="$emit('close-tab', tab.key)"
            >
              <i class="el-icon-close" aria-hidden="true" />
            </button>
          </div>
        </div>
        <button
          v-show="tabsCanScrollRight"
          key="reader-tabs-right"
          type="button"
          class="pc-resource-nav pc-reader-tabs-nav is-right"
          aria-label="向右查看文件标签"
          @click="scrollTabs(1)"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
          </svg>
        </button>
      </div>
      <div class="pc-reader-panel-actions">
        <button
          type="button"
          class="pc-reader-close-panel"
          aria-label="关闭预览区"
          title="关闭预览区"
          @click="$emit('close')"
        >
          <i class="el-icon-circle-close" aria-hidden="true" />
        </button>
      </div>
    </div>
    <template v-if="activeTab">
      <div
        id="pc-reader-document"
        :key="activeTab.key"
        ref="document"
        class="pc-reader-document"
        role="tabpanel"
        :aria-labelledby="'pc-reader-tab-' + activeIndex"
        :aria-busy="activeTab.status === 'loading'"
        @scroll="rememberScroll"
      >
        <div
          v-if="activeTab.status === 'loading'"
          class="pc-reader-empty"
          role="status"
        >
          <i class="el-icon-loading" /> 正在读取文件…
        </div>
        <div
          v-else-if="activeTab.status === 'error'"
          class="pc-reader-empty"
          role="alert"
        >
          <p>{{ activeTab.error }}</p>
          <button type="button" @click="$emit('retry', activeTab)">
            重新读取
          </button>
        </div>
        <img
          v-else-if="activeTab.format === 'image'"
          :src="activeTab.url"
          :alt="activeTab.item.name"
        />
        <iframe
          v-else-if="activeTab.format === 'pdf'"
          :src="activeTab.url"
          :title="activeTab.item.name"
        />
        <ConversationMarkdown
          v-else-if="activeTab.format === 'markdown'"
          :text="activeTab.text"
        />
        <pre v-else :class="{ 'is-code': isCodeFile }">{{
          activeTab.text
        }}</pre>
      </div>
    </template>
  </section>
</template>

<script>
import ConversationMarkdown from "./ConversationMarkdown.vue";
import PanelResizeHandle from "./PanelResizeHandle.vue";
import { READER_MIN_WIDTH } from "../file-reader";

export default {
  name: "FileReader",
  components: {
    ConversationMarkdown,
    PanelResizeHandle,
  },
  props: {
    tabs: { type: Array, required: true },
    activeKey: { type: String, default: null },
    width: { type: Number, required: true },
    maxWidth: { type: Number, required: true },
  },
  data() {
    return {
      minWidth: READER_MIN_WIDTH,
      scrollPositions: {},
      tabsCanScrollLeft: false,
      tabsCanScrollRight: false,
    };
  },
  computed: {
    activeIndex() {
      return this.tabs.findIndex((tab) => tab.key === this.activeKey);
    },
    activeTab() {
      return this.tabs[this.activeIndex] || null;
    },
    isCodeFile() {
      return /\.(?:[cm]?[jt]sx?|py|css|html?|json|xml|ya?ml)$/i.test(
        this.activeTab?.item.name || "",
      );
    },
    tabSignature() {
      return this.tabs.map((tab) => [tab.key, tab.item.name]).join("|");
    },
  },
  mounted() {
    if (typeof ResizeObserver !== "undefined") {
      this._tabsResizeObserver = new ResizeObserver(this.updateTabsOverflow);
      this._tabsResizeObserver.observe(this.$refs.tabs);
    }
    this.$nextTick(this.revealActiveTab);
  },
  watch: {
    activeKey() {
      this.$nextTick(() => {
        if (this.$refs.document)
          this.$refs.document.scrollTop =
            this.scrollPositions[this.activeKey] || 0;
        this.revealActiveTab();
      });
    },
    tabSignature() {
      this.$nextTick(this.updateTabsOverflow);
    },
    width() {
      this.$nextTick(this.revealActiveTab);
    },
  },
  beforeDestroy() {
    this._tabsResizeObserver?.disconnect();
  },
  methods: {
    resetReadingPosition(key) {
      this.scrollPositions[key] = 0;
      if (this.activeKey === key && this.$refs.document)
        this.$refs.document.scrollTop = 0;
    },
    selectTab(key) {
      this.$emit("select", key);
      this.$nextTick(this.revealActiveTab);
    },
    updateTabsOverflow() {
      const strip = this.$refs.tabs;
      if (!strip) return;
      const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
      this.tabsCanScrollLeft = strip.scrollLeft > 1;
      this.tabsCanScrollRight = strip.scrollLeft < maxScrollLeft - 1;
    },
    revealActiveTab() {
      const strip = this.$refs.tabs;
      const tab = strip
        ?.querySelector('[aria-selected="true"]')
        ?.closest(".pc-reader-tab");
      if (!tab) return;
      const bounds = strip.getBoundingClientRect();
      const rect = tab.getBoundingClientRect();
      const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
      const leftInset = strip.scrollLeft > 1 ? 28 : 6;
      const rightInset = strip.scrollLeft < maxScrollLeft - 1 ? 28 : 6;
      let scrollLeft = strip.scrollLeft;
      if (rect.left < bounds.left + leftInset)
        scrollLeft -= bounds.left + leftInset - rect.left;
      else if (rect.right > bounds.right - rightInset)
        scrollLeft += rect.right - bounds.right + rightInset;
      strip.scrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollLeft));
      this.updateTabsOverflow();
    },
    scrollTabs(direction) {
      const strip = this.$refs.tabs;
      if (!strip) return;
      strip.scrollBy({
        left: direction * Math.max(160, Math.floor(strip.clientWidth * 0.75)),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    rememberScroll(event) {
      this.scrollPositions[this.activeKey] = event.target.scrollTop;
    },
    navigateTabs(event, index) {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % this.tabs.length;
      else if (event.key === "ArrowLeft")
        next = (index + this.tabs.length - 1) % this.tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = this.tabs.length - 1;
      else if (event.key === "Delete") {
        event.preventDefault();
        this.$emit("close-tab", this.tabs[index].key);
        return;
      } else return;
      event.preventDefault();
      this.selectTab(this.tabs[next].key);
      this.$nextTick(() =>
        this.$refs.tabs
          ?.querySelector('[aria-selected="true"]')
          ?.focus({ preventScroll: true }),
      );
    },
  },
};
</script>
