<template>
  <section
    class="pc-knowledge-sources"
    role="dialog"
    aria-labelledby="pc-knowledge-sources-title"
    @keydown.esc.stop="$emit('close')"
  >
    <div class="pc-panel-head">
      <span class="pc-panel-icon"><i class="el-icon-document" /></span>
      <strong id="pc-knowledge-sources-title">本轮知识来源</strong>
      <button
        ref="close"
        type="button"
        aria-label="关闭本轮知识来源"
        @click="$emit('close')"
      >
        <i class="el-icon-close" />
      </button>
    </div>
    <div class="pc-knowledge-filters" role="group" aria-label="筛选来源">
      <button
        v-for="option in filters"
        :key="option.value"
        type="button"
        :aria-pressed="filter === option.value"
        @click="selectFilter(option.value)"
      >
        {{ option.label }}
        <span>{{ fragmentsByFilter[option.value].length }}</span>
      </button>
    </div>
    <div ref="list" class="pc-knowledge-evidence">
      <p v-if="!visibleFragments.length">{{ emptyMessage }}</p>
      <article
        v-for="fragment in visibleFragments"
        :key="fragment.key"
        :class="{ 'is-selected': fragment.key === targetId }"
        tabindex="-1"
      >
        <header class="pc-knowledge-fragment-header">
          <span
            v-if="fragment.number !== null"
            class="pc-knowledge-fragment-number"
          >
            [{{ fragment.number }}]
          </span>
          <div class="pc-knowledge-fragment-sources">
            <div
              v-for="source in fragment.sources"
              :key="source.key"
              class="pc-knowledge-document-heading"
            >
              <strong :title="source.title">{{ source.title }}</strong>
              <small v-if="source.library" :title="source.library">{{
                source.library
              }}</small>
            </div>
          </div>
        </header>
        <p v-if="fragment.text" class="pc-knowledge-fragment-text">
          {{ fragment.text }}
        </p>
        <footer class="pc-knowledge-fragment-footer">
          <div
            v-if="fragment.originals.length"
            class="pc-knowledge-fragment-originals"
          >
            <button
              v-for="source in fragment.originals"
              :key="source.key"
              type="button"
              class="pc-knowledge-link"
              @click="previewOriginal(source.original)"
            >
              {{
                fragment.originals.length === 1
                  ? "查看原文"
                  : `查看原文 · ${source.title}`
              }}
            </button>
          </div>
          <span
            class="pc-knowledge-fragment-status"
            :class="{ 'is-cited': fragment.number !== null }"
            >{{ fragment.number === null ? "未引用" : "已引用" }}</span
          >
        </footer>
      </article>
    </div>
  </section>
</template>

<script>
import {
  knowledgeEvidenceSources,
  knowledgeSourceDocument,
} from "../knowledge-activity";
import { knowledgeDemoOriginals } from "../knowledge-activity-scenes";

export default {
  props: {
    evidence: { type: Array, required: true },
    targetId: { type: String, default: "" },
  },
  data() {
    return {
      filter: "all",
      filters: [
        { value: "all", label: "全部" },
        { value: "cited", label: "已引用" },
        { value: "uncited", label: "未引用" },
      ],
    };
  },
  computed: {
    fragmentsByFilter() {
      const cited = [];
      const uncited = [];
      for (const item of this.evidence) {
        const sources = knowledgeEvidenceSources(item);
        const number = Number.isInteger(item.final_citation_number)
          ? item.final_citation_number
          : null;
        const available = item.access === "available";
        const fragment = {
          key: item.key,
          number,
          text: available
            ? item.calculation?.summary || item.hit?.text || ""
            : "当前无法访问此资料",
          sources: sources.map((source, index) => {
            const document = knowledgeSourceDocument(source);
            return {
              ...document,
              key: `${source.id}:${index}`,
              original:
                knowledgeDemoOriginals[document.id] ||
                knowledgeDemoOriginals[source.id],
            };
          }),
        };
        if (!fragment.sources.length)
          fragment.sources.push({
            key: item.key,
            title: available ? "来源资料" : "来源不可用",
          });
        fragment.originals = fragment.sources.filter(
          (source) => source.original,
        );
        (number === null ? uncited : cited).push(fragment);
      }
      cited.sort((a, b) => a.number - b.number);
      return { all: [...cited, ...uncited], cited, uncited };
    },
    visibleFragments() {
      return this.fragmentsByFilter[this.filter];
    },
    emptyMessage() {
      return {
        all: "暂无来源",
        cited: "暂无已引用的来源",
        uncited: "暂无未引用的来源",
      }[this.filter];
    },
  },
  methods: {
    previewOriginal({ name, content }) {
      this.$emit("preview", { name, snapshotContent: content });
    },
    selectFilter(filter) {
      if (filter === this.filter) return;
      this.filter = filter;
      this.$refs.list.scrollTop = 0;
    },
    showSources(filter, focus) {
      this.filter = filter;
      this.$nextTick(() => {
        const list = this.$refs.list;
        if (!list) return;
        const card = list.querySelector("article.is-selected");
        list.scrollTop = card?.offsetTop || 0;
        if (focus) (card || this.$refs.close)?.focus({ preventScroll: true });
      });
    },
  },
};
</script>
