<template>
  <div class="expert-api-runs">
    <div class="toolbar task-action-bar expert-api-filters">
      <strong class="task-action-summary" aria-live="polite">
        {{ filteredRuns.length }} 次调用 · {{ sessions.length }} 个会话 ·
        {{ runningCount }} 个运行中
      </strong>
      <div
        class="task-action-controls expert-api-controls"
        role="group"
        aria-label="API 调用筛选"
      >
        <el-select
          v-model="keyId"
          size="small"
          filterable
          clearable
          class="expert-api-key-filter"
          placeholder="全部 API Key"
          aria-label="筛选 API Key"
          :filter-method="filterKeys"
          @visible-change="resetKeyFilter"
        >
          <el-option
            v-for="key in visibleKeys"
            :key="key.id"
            :value="key.id"
            :label="`${key.name} · …${keyPreview(key.id).slice(-4)}`"
          >
            <span>{{ key.name }}</span>
            <small class="expert-api-option-meta"
              >{{ keyPreview(key.id) }} · {{ keyStatus(key) }}</small
            >
          </el-option>
        </el-select>
        <el-date-picker
          v-model="range"
          type="daterange"
          size="small"
          value-format="yyyy-MM-dd"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          aria-label="筛选提交时间"
          class="expert-api-date-filter"
          popper-class="expert-api-date-panel"
        />
        <el-select
          v-model="status"
          size="small"
          clearable
          placeholder="全部状态"
          aria-label="筛选运行状态"
        >
          <el-option
            v-for="(item, value) in statuses"
            :key="value"
            :label="item.label"
            :value="value"
          />
        </el-select>
        <el-input
          v-model="search"
          size="small"
          clearable
          prefix-icon="el-icon-search"
          aria-label="搜索运行或会话 ID"
          placeholder="搜索运行或会话 ID"
        />
      </div>
    </div>
    <div class="expert-api-viewbar">
      <div class="segmented expert-api-view-switch" aria-label="查看方式">
        <button
          type="button"
          :class="{ active: view === 'runs' }"
          :aria-pressed="String(view === 'runs')"
          @click="view = 'runs'"
        >
          调用
        </button>
        <button
          type="button"
          :class="{ active: view === 'sessions' }"
          :aria-pressed="String(view === 'sessions')"
          @click="view = 'sessions'"
        >
          会话
        </button>
      </div>
    </div>

    <el-table
      v-if="view === 'runs'"
      key="runs"
      :data="filteredRuns"
      row-key="id"
      size="small"
      class="expert-api-table"
    >
      <el-table-column
        v-for="column in runColumns"
        :key="column.field"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth"
      >
        <template slot-scope="{ row }">
          <api-run-cell :field="column.field" :run="row" @view="openRun" />
        </template>
      </el-table-column>
      <template slot="empty">
        <el-empty :description="emptyText">
          <el-button v-if="filtersActive" size="small" @click="resetFilters"
            >清除筛选</el-button
          >
        </el-empty>
      </template>
    </el-table>
    <el-table
      v-else
      key="sessions"
      ref="sessionTable"
      :data="sessions"
      row-key="id"
      row-class-name="expert-api-session-row"
      size="small"
      class="expert-api-table expert-api-session-table"
      @row-click="toggleSession"
    >
      <el-table-column label="conversation_id" min-width="194">
        <template slot-scope="{ row }">
          <api-record-id :value="row.id" label="conversation_id" />
        </template>
      </el-table-column>
      <el-table-column
        label="首轮输入"
        prop="firstInput"
        min-width="185"
        show-overflow-tooltip
      />
      <el-table-column label="轮数" width="112">
        <template slot-scope="{ row, isExpanded }">
          <button
            type="button"
            class="expert-api-session-toggle"
            :aria-label="`会话 ${row.id} 的 ${row.runs.length} 轮运行记录`"
            :aria-expanded="String(isExpanded)"
            :title="isExpanded ? '收起' : '展开'"
            @click.stop="toggleSession(row)"
          >
            <span>{{ row.runs.length }} 轮</span>
            <i
              :class="isExpanded ? 'el-icon-arrow-down' : 'el-icon-arrow-right'"
              aria-hidden="true"
            />
          </button>
          <span
            v-if="row.matchedIds.size < row.runs.length"
            class="expert-api-secondary"
            >命中 {{ row.matchedIds.size }} 轮</span
          >
        </template>
      </el-table-column>
      <el-table-column label="最新一轮状态" width="110">
        <template slot-scope="{ row }">
          <el-tag
            size="mini"
            effect="light"
            :type="statuses[row.latest.status].type"
            >{{ statuses[row.latest.status].label }}</el-tag
          >
        </template>
      </el-table-column>
      <el-table-column label="最近活动时间" min-width="147">
        <template slot-scope="{ row }">{{ time(row.lastActivity) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="87">
        <template slot-scope="{ row }">
          <el-button type="text" @click.stop="openRun(row.latest)"
            >查看会话</el-button
          >
        </template>
      </el-table-column>
      <el-table-column
        type="expand"
        width="1"
        class-name="expert-api-session-expander"
      >
        <template slot-scope="{ row }">
          <div
            class="expert-api-expanded"
            role="region"
            aria-label="会话运行明细"
            tabindex="0"
          >
            <table class="expert-api-expanded-table" aria-label="会话运行明细">
              <colgroup>
                <col
                  v-for="column in expandedRunColumns"
                  :key="column.field"
                  :class="`expert-api-expanded-col-${column.field}`"
                />
              </colgroup>
              <thead>
                <tr>
                  <th
                    v-for="column in expandedRunColumns"
                    :key="column.field"
                    scope="col"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="run in row.runs.slice().reverse()"
                  :key="run.id"
                  class="expert-api-expanded-row"
                >
                  <td v-for="column in expandedRunColumns" :key="column.field">
                    <span
                      v-if="
                        column.field === 'id' &&
                        row.matchedIds.size < row.runs.length &&
                        row.matchedIds.has(run.id)
                      "
                      class="expert-api-run-match"
                      role="img"
                      aria-label="命中筛选"
                      title="命中筛选"
                    />
                    <api-run-cell
                      :field="column.field"
                      :run="run"
                      @view="openRun"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </el-table-column>
      <template slot="empty">
        <el-empty :description="emptyText">
          <el-button v-if="filtersActive" size="small" @click="resetFilters"
            >清除筛选</el-button
          >
        </el-empty>
      </template>
    </el-table>

    <external-api-conversation
      :visible.sync="detailVisible"
      :expert="expert"
      :conversation-id="selectedConversationId"
      :runs="detailRuns"
      :target-run-id="selectedRunId"
    />
  </div>
</template>

<script>
import ApiRecordId from "./ApiRecordId.vue";
import ApiRunCell from "./ApiRunCell.vue";
import ExternalApiConversation from "./ExternalApiConversation.vue";
import { state } from "../state";
import {
  API_RUN_STATUSES,
  apiConversationsForResults,
  apiKeyPreview,
  apiKeyStatus,
  apiTime,
  filterApiRuns,
} from "../external-api";

const RUN_COLUMNS = [
  { field: "id", label: "run_id", minWidth: 196 },
  { field: "input", label: "输入", minWidth: 185 },
  { field: "keyName", label: "Key 名称", minWidth: 130 },
  { field: "status", label: "状态", width: 86 },
  { field: "submittedAt", label: "提交时间", minWidth: 147 },
  { field: "durationMs", label: "耗时", width: 82 },
  { field: "action", label: "操作", width: 87 },
];
const EXPANDED_RUN_COLUMNS = RUN_COLUMNS.filter(
  ({ field }) => field !== "durationMs",
);

export default {
  components: { ApiRecordId, ApiRunCell, ExternalApiConversation },
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      search: "",
      status: "",
      view: "runs",
      keySearch: "",
      detailVisible: false,
      selectedRunId: "",
      selectedConversationId: "",
      statuses: API_RUN_STATUSES,
      runColumns: RUN_COLUMNS,
      expandedRunColumns: EXPANDED_RUN_COLUMNS,
    };
  },
  computed: {
    keyId: {
      get() {
        const value = this.$route.query.apiKey;
        return typeof value === "string" ? value : "";
      },
      set(value) {
        this.setQuery({ apiKey: value });
      },
    },
    range: {
      get() {
        const { apiFrom, apiTo } = this.$route.query;
        const isDate = (value) =>
          typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
        return isDate(apiFrom) && isDate(apiTo) && apiFrom <= apiTo
          ? [apiFrom, apiTo]
          : null;
      },
      set(value) {
        this.setQuery({ apiFrom: value?.[0], apiTo: value?.[1] });
      },
    },
    runs() {
      return state.externalApiRuns.filter(
        (run) => run.expertId === this.expert.id,
      );
    },
    keys() {
      const usedKeyIds = new Set(this.runs.map((run) => run.keyId));
      return state.externalApiKeys.filter(
        (key) =>
          key.expertId === this.expert.id &&
          (!key.deletedAt || usedKeyIds.has(key.id)),
      );
    },
    visibleKeys() {
      const keyword = this.keySearch.trim().toLowerCase();
      if (!keyword) return this.keys;
      const historicalIds = new Set(
        this.runs
          .filter((run) => run.keyName.toLowerCase().includes(keyword))
          .map((run) => run.keyId),
      );
      return this.keys.filter(
        (key) =>
          key.id === this.keyId ||
          historicalIds.has(key.id) ||
          `${key.name} ${apiKeyPreview(key.id)}`
            .toLowerCase()
            .includes(keyword),
      );
    },
    filteredRuns() {
      return filterApiRuns(this.runs, {
        keyId: this.keyId,
        status: this.status,
        search: this.search,
        range: this.range,
      });
    },
    runningCount() {
      return this.filteredRuns.filter((run) => run.status === "running").length;
    },
    sessions() {
      const conversations = state.externalApiConversations.filter(
        (item) => item.expertId === this.expert.id,
      );
      return apiConversationsForResults(
        conversations,
        this.runs,
        this.filteredRuns,
      );
    },
    detailRuns() {
      return this.runs
        .filter((run) => run.conversationId === this.selectedConversationId)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    },
    filtersActive() {
      return Boolean(
        this.keyId || this.status || this.range || this.search.trim(),
      );
    },
    emptyText() {
      return this.filtersActive ? "没有匹配的调用记录" : "暂无 API 调用记录";
    },
  },
  methods: {
    toggleSession(row) {
      this.$refs.sessionTable.toggleRowExpansion(row);
    },
    keyPreview: apiKeyPreview,
    keyStatus: apiKeyStatus,
    time: apiTime,
    setQuery(values) {
      const query = { ...this.$route.query };
      for (const [name, value] of Object.entries(values)) {
        if (value) query[name] = value;
        else delete query[name];
      }
      if (
        Object.keys(values).some(
          (name) => query[name] !== this.$route.query[name],
        )
      ) {
        this.$router.replace({ query });
      }
    },
    filterKeys(value) {
      this.keySearch = value;
    },
    resetKeyFilter(open) {
      if (!open) this.keySearch = "";
    },
    resetFilters() {
      this.status = "";
      this.search = "";
      this.setQuery({ apiKey: "", apiFrom: "", apiTo: "" });
    },
    openRun(run) {
      this.selectedConversationId = run.conversationId;
      this.selectedRunId = run.id;
      this.detailVisible = true;
    },
  },
};
</script>
