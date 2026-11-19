<template>
  <div class="pc-knowledge-detail">
    <ol class="pc-knowledge-process">
      <li
        v-for="step in steps"
        :key="step.id"
        class="pc-knowledge-process-entry"
        :data-tool="step.tool"
        :data-status="step.status"
        :aria-current="step.status === 'running' ? 'step' : null"
      >
        <i
          class="pc-knowledge-step-icon"
          :class="step.icon"
          aria-hidden="true"
        />
        <div class="pc-knowledge-step-content">
          <div class="pc-knowledge-step-heading">
            <span class="pc-knowledge-step-action">{{ step.action }}</span>
            <div
              v-if="step.queries.length"
              class="pc-knowledge-step-queries"
              :title="step.queries.join(' ｜ ')"
            >
              <span class="pc-knowledge-query-bracket">「</span>
              <span class="pc-knowledge-query-text">{{
                step.queries.join(" ｜ ")
              }}</span>
              <span class="pc-knowledge-query-bracket">」</span>
            </div>
            <div
              v-if="step.documents.length"
              class="pc-knowledge-step-documents"
            >
              <span
                v-for="document in step.documents"
                :key="document.id"
                class="pc-knowledge-object"
                :title="document.title"
              >
                <span class="pc-knowledge-object-name">{{
                  document.name
                }}</span>
                <span
                  v-if="document.suffix"
                  class="pc-knowledge-object-suffix"
                  >{{ document.suffix }}</span
                >
              </span>
            </div>
          </div>
          <p
            v-if="step.status !== 'running' && step.result"
            class="pc-knowledge-step-result"
            :class="{ 'is-error': step.status === 'error' }"
          >
            {{ step.result }}
          </p>
        </div>
      </li>
      <li
        v-if="finished"
        class="pc-knowledge-process-entry pc-knowledge-summary-entry"
      >
        <i
          class="pc-knowledge-step-icon el-icon-circle-check"
          aria-hidden="true"
        />
        <div class="pc-knowledge-step-content">
          <strong class="pc-knowledge-step-action">完成检索</strong>
          <p class="pc-knowledge-result-counts">{{ returnedSummary }}</p>
          <p
            v-if="activity.summary"
            ref="summary"
            class="pc-knowledge-result-summary"
            :class="{ 'is-expanded': summaryExpanded }"
          >
            {{ activity.summary }}
          </p>
          <button
            v-if="summaryOverflow"
            type="button"
            class="pc-knowledge-link pc-knowledge-summary-toggle"
            @click="summaryExpanded = !summaryExpanded"
          >
            {{ summaryExpanded ? "收起" : "展开" }}
          </button>
        </div>
      </li>
    </ol>
    <p v-if="activity.detail" class="pc-knowledge-notice">
      {{ activity.detail }}
    </p>
  </div>
</template>

<script>
import {
  knowledgeEvidenceSummary,
  knowledgeProcessActions,
  knowledgeSourceDocument,
} from "../knowledge-activity";

const processIcons = {
  query_understand: "el-icon-magic-stick",
  search_knowledge: "el-icon-search",
  read_document: "el-icon-document",
  wiki_search: "el-icon-search",
  wiki_read_page: "el-icon-reading",
  data_analysis: "el-icon-data-analysis",
};

export default {
  props: {
    activity: { type: Object, required: true },
  },
  data() {
    return { summaryExpanded: false, summaryOverflow: false };
  },
  computed: {
    returnedSummary() {
      return `共返回 ${knowledgeEvidenceSummary(this.activity.evidence, true)}`;
    },
    steps() {
      return (this.activity.processSteps || []).map((step) => ({
        ...step,
        action: knowledgeProcessActions[step.tool],
        icon: processIcons[step.tool],
        queries: step.queries || [],
        documents: (step.sources || []).map((source) => {
          const document = knowledgeSourceDocument(source);
          const suffix =
            document.kind === "rag"
              ? document.title.match(/\.[a-z\d]{1,8}$/i)?.[0] || ""
              : "";
          return {
            id: document.id,
            title: document.title,
            suffix,
            name: suffix
              ? document.title.slice(0, -suffix.length)
              : document.title,
          };
        }),
      }));
    },
    finished() {
      return ["success", "partial", "empty"].includes(
        this.activity.resultStatus,
      );
    },
  },
  mounted() {
    if (typeof ResizeObserver !== "undefined") {
      this.summaryObserver = new ResizeObserver(this.measureSummary);
      this.summaryObserver.observe(this.$el);
    }
    this.measureSummary();
  },
  beforeDestroy() {
    this.summaryObserver?.disconnect();
  },
  watch: {
    "activity.summary"() {
      this.summaryExpanded = false;
      this.$nextTick(this.measureSummary);
    },
  },
  methods: {
    measureSummary() {
      if (this.summaryExpanded) return;
      const summary = this.$refs.summary;
      this.summaryOverflow = Boolean(
        summary && summary.scrollHeight > summary.clientHeight + 1,
      );
    },
  },
};
</script>
