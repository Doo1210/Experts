<template>
  <el-dialog
    :visible="visible"
    title="API 会话记录"
    width="75vw"
    top="20px"
    append-to-body
    custom-class="manage-dialog demo-im-dialog event-task-dialog expert-api-conversation"
    modal-class="demo-im-backdrop"
    @close="$emit('update:visible', false)"
    @opened="openTarget"
    @closed="activeRunId = ''"
  >
    <div slot="title" class="demo-im-header">
      <div class="demo-im-title"><h3>API 会话记录</h3></div>
      <div class="demo-im-header-meta expert-api-conversation-meta">
        <span>conversation_id</span>
        <api-record-id :value="conversationId" label="conversation_id" />
        <span class="expert-api-round-count">{{ runs.length }} 轮</span>
      </div>
    </div>
    <div class="demo-im-layout is-single">
      <section class="demo-im-history" aria-label="API 会话问答">
        <div class="pc-messages-wrap demo-im-messages-wrap">
          <div ref="timeline" class="pc-messages demo-im-timeline">
            <article
              v-for="(round, index) in rounds"
              :key="round.key"
              :data-api-run="round.key"
              class="demo-im-entry expert-api-round"
              :class="{ 'is-selected': activeRunId === round.key }"
              :aria-label="`第 ${index + 1} 轮`"
            >
              <div class="expert-api-round-head">
                <strong>第 {{ index + 1 }} 轮</strong>
                <api-record-id :value="round.key" label="run_id" />
                <span class="expert-api-round-key" :title="round.keyName"
                  >Key · {{ round.keyName }}</span
                >
              </div>
              <im-history-round
                :round="round"
                :expert-name="expert.name"
                :avatar="expertAvatar"
                collapse-process
              >
                <template #process="{ items }">
                  <div class="expert-api-events">
                    <div
                      v-for="item in items"
                      :key="item.id"
                      class="expert-api-event"
                    >
                      <time>{{ time(item.at).slice(11) }}</time>
                      <div v-if="item.type === 'message_delta'">
                        {{ item.text }}
                      </div>
                      <div v-else>
                        <div class="expert-api-event-title">
                          <strong
                            >{{
                              item.type === "tool_started"
                                ? "工具开始"
                                : "工具完成"
                            }}
                            · {{ item.name }}</strong
                          >
                          <span v-if="item.status">{{
                            statuses[item.status].label
                          }}</span>
                          <span v-if="item.durationMs != null">{{
                            duration(item.durationMs)
                          }}</span>
                        </div>
                        <p v-if="item.type === 'tool_started' && item.summary">
                          {{ item.summary }}
                        </p>
                        <details
                          v-else-if="item.summary"
                          class="demo-im-tool-detail"
                        >
                          <summary class="pc-activity-title">
                            查看脱敏结果
                            <span
                              v-if="item.truncated"
                              class="expert-api-truncated"
                              >已截断</span
                            >
                            <i class="el-icon-arrow-right" />
                          </summary>
                          <p>{{ item.summary }}</p>
                        </details>
                      </div>
                    </div>
                  </div>
                </template>
              </im-history-round>
            </article>
          </div>
          <div
            v-if="rounds.length > 1"
            class="pc-question-rail demo-im-question-rail"
            aria-label="轮次定位"
          >
            <el-tooltip
              v-for="(round, index) in rounds"
              :key="round.key"
              :content="`第 ${index + 1} 轮 · ${round.user.content}`"
              placement="left"
              :open-delay="320"
            >
              <button
                type="button"
                class="pc-question-bar"
                :class="{ 'is-selected': activeRunId === round.key }"
                :aria-current="activeRunId === round.key ? 'true' : null"
                :aria-label="`定位第 ${index + 1} 轮`"
                @click="jumpTo(round.key)"
              />
            </el-tooltip>
          </div>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script>
import { avatarSrcFor } from "../avatar";
import { API_RUN_STATUSES, apiDuration, apiTime } from "../external-api";
import ApiRecordId from "./ApiRecordId.vue";
import ImHistoryRound from "./ImHistoryRound.vue";

export default {
  components: { ApiRecordId, ImHistoryRound },
  props: {
    visible: { type: Boolean, required: true },
    expert: { type: Object, required: true },
    conversationId: { type: String, required: true },
    runs: { type: Array, required: true },
    targetRunId: { type: String, required: true },
  },
  data() {
    return { activeRunId: "", statuses: API_RUN_STATUSES };
  },
  computed: {
    expertAvatar() {
      return avatarSrcFor(this.expert);
    },
    rounds() {
      return this.runs.map((run) => ({
        key: run.id,
        keyName: run.keyName,
        user: { content: run.input, at: run.submittedAt },
        assistant: {
          turnStatus: run.status,
          durationMs: run.durationMs,
          content: run.error
            ? `**${run.error.message}**\n\n\`${run.error.code}\``
            : run.output || "",
        },
        inputs: [],
        process: run.events,
        outputs: [],
      }));
    },
  },
  methods: {
    time: apiTime,
    duration: apiDuration,
    openTarget() {
      this.jumpTo(this.targetRunId);
    },
    jumpTo(runId) {
      const timeline = this.$refs.timeline;
      const target = [...timeline.children].find(
        (entry) => entry.dataset.apiRun === runId,
      );
      if (!target) return;
      this.activeRunId = runId;
      timeline.scrollTop +=
        target.getBoundingClientRect().top -
        timeline.getBoundingClientRect().top -
        14;
    },
  },
};
</script>
