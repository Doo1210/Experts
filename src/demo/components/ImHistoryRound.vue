<template>
  <div class="demo-im-round">
    <div v-if="round.user" class="pc-message user demo-im-round-user">
      <div
        v-if="round.inputs.length"
        class="pc-user-resources demo-im-round-inputs"
      >
        <div class="pc-user-resources-list" role="list" aria-label="已发送资料">
          <button
            v-for="file in round.inputs"
            :key="file.id"
            type="button"
            class="pc-resource-chip pc-user-resource-chip is-upload demo-im-resource"
            :disabled="!file.fileDirectory"
            :title="file.fileName"
            @click="$emit('workspace', file.fileDirectory)"
          >
            <span class="pc-resource-format" aria-hidden="true">{{
              fileFormat(file.fileName)
            }}</span>
            <span class="pc-resource-copy">
              <strong>{{ file.fileName }}</strong>
              <small
                >收到文件 · {{ file.transferStatus || "状态未记录" }}</small
              >
            </span>
          </button>
        </div>
      </div>
      <div v-if="round.user.content" class="pc-user-bubble">
        <conversation-markdown :text="round.user.content" />
      </div>
      <time v-if="round.user.at" class="demo-im-user-time">{{
        fullTime(round.user.at)
      }}</time>
    </div>
    <div
      v-if="round.assistant || round.process.length || round.outputs.length"
      class="pc-message assistant demo-im-round-assistant"
    >
      <div class="pc-sender">
        <img :src="avatar" :alt="expertName" />
        <span>{{ expertName }}</span>
      </div>
      <div
        class="pc-process"
        :class="{ 'has-expanded-content': expanded && round.process.length }"
      >
        <button
          v-if="round.process.length"
          type="button"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ statusLabel }}
          <span v-if="durationLabel">{{ durationLabel }}</span>
          <i :class="expanded ? 'el-icon-arrow-down' : 'el-icon-arrow-right'" />
        </button>
        <div v-else class="pc-process-summary">
          {{ statusLabel }}<span v-if="durationLabel">{{ durationLabel }}</span>
        </div>
        <div
          v-if="round.process.length && expanded"
          class="pc-process-steps demo-im-process-steps"
        >
          <div
            v-for="item in round.process"
            :key="item.id"
            :class="
              item.role === 'notice'
                ? 'pc-stage-line'
                : item.role === 'interim'
                  ? 'pc-process-interim-wrap'
                  : 'pc-activity-group'
            "
          >
            <template v-if="item.role === 'notice'">{{
              item.content
            }}</template>
            <div
              v-else-if="item.role === 'interim'"
              class="pc-reply pc-process-interim"
            >
              <conversation-markdown :text="item.content" />
            </div>
            <details v-else class="demo-im-tool-detail">
              <summary class="pc-activity-title">
                处理经过：{{ item.title || "工具执行" }}
                <i class="el-icon-arrow-right" />
              </summary>
              <div class="pc-activity-list">
                <div class="pc-process-activity">
                  <span class="pc-process-step-mark" aria-hidden="true" />
                  <span class="pc-process-step-content">{{
                    item.content
                  }}</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
      <div v-if="round.assistant && round.assistant.content" class="pc-reply">
        <conversation-markdown :text="round.assistant.content" />
      </div>
      <div v-if="round.outputs.length" class="pc-results">
        <div class="pc-result-file-list" role="list" aria-label="本轮产出文件">
          <div
            v-for="file in round.outputs"
            :key="file.id"
            class="pc-result-file-card is-created"
            role="listitem"
          >
            <span class="pc-result-file-icon"
              ><i class="el-icon-document"
            /></span>
            <span class="pc-result-file-copy">
              <span class="pc-result-file-heading">
                <strong :title="file.fileName">{{ file.fileName }}</strong>
                <span class="pc-result-file-kind">新建</span>
              </span>
              <small class="pc-result-file-path" :title="file.fileDirectory">{{
                file.fileDirectory || "位置未确认"
              }}</small>
            </span>
            <span class="pc-result-file-actions">
              <button
                type="button"
                :disabled="!canPreview(file)"
                :aria-label="`预览 ${file.fileName}`"
                title="预览"
                @click="$emit('preview', file)"
              >
                <i class="el-icon-view" />
              </button>
              <button
                type="button"
                :disabled="!fileItem(file)"
                :aria-label="`下载 ${file.fileName}`"
                title="下载"
                @click="$emit('download', file)"
              >
                <i class="el-icon-download" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ConversationMarkdown from "./ConversationMarkdown.vue";

export default {
  name: "ImHistoryRound",
  components: { ConversationMarkdown },
  props: {
    round: { type: Object, required: true },
    expertName: { type: String, required: true },
    avatar: { type: String, required: true },
    fileItems: { type: Array, default: () => [] },
  },
  data() {
    return { expanded: this.round.assistant?.turnStatus === "running" };
  },
  computed: {
    statusLabel() {
      const status =
        this.round.assistant?.turnStatus || this.round.assistant?.status;
      return (
        {
          completed: "已完成",
          done: "已完成",
          interrupted: "已中断",
          failed: "处理失败",
          running: "处理中",
        }[status] || "状态未确认"
      );
    },
    durationLabel() {
      const ms = this.round.assistant?.durationMs;
      if (!Number.isFinite(ms)) return "";
      const seconds = Math.round(ms / 1000);
      return seconds < 60
        ? `用时 ${seconds} 秒`
        : `用时 ${Math.ceil(seconds / 60)} 分钟`;
    },
  },
  methods: {
    fileItem(file) {
      return this.fileItems.find((item) => item.id === `f_im_file_${file.id}`);
    },
    canPreview(file) {
      return Boolean(this.fileItem(file) && /\.(md|txt)$/i.test(file.fileName));
    },
    fullTime(value) {
      return value
        ? new Date(value)
            .toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })
            .replaceAll("/", "-")
        : "";
    },
    fileFormat(name) {
      return String(name || "")
        .split(".")
        .at(-1)
        .slice(0, 4)
        .toUpperCase();
    },
  },
};
</script>
