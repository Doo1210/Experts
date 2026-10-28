<template>
  <el-dialog
    :visible="visible"
    width="75vw"
    top="20px"
    custom-class="manage-dialog demo-im-dialog event-task-dialog"
    modal-class="demo-im-backdrop"
    :title="event ? `${event.displayName || event.name}的执行记录` : '自主任务执行记录'"
    @close="close"
    @opened="scrollBottom"
  >
    <div v-if="event" slot="title" class="demo-im-header">
      <div class="demo-im-title">
        <h3 :title="event.displayName || event.name">{{ event.displayName || event.name }}的执行记录</h3>
        <span class="event-source-tag">{{ event.trigger }}</span>
      </div>
      <div class="demo-im-header-meta">
        <span :title="event.sourceSummary">{{
          event.sourceSummary || "来源信息未记录"
        }}</span>
        <button
          type="button"
          class="demo-im-path"
          :title="eventPath"
          @click="openWorkspace(eventPath)"
        >
          工作目录 <i class="el-icon-top-right" />
        </button>
      </div>
    </div>
    <div v-if="event" class="demo-im-layout is-single">
      <section class="demo-im-history" aria-label="自主任务对话记录">
        <div class="pc-messages-wrap demo-im-messages-wrap">
          <div
            ref="timeline"
            class="pc-messages demo-im-timeline"
            @scroll.passive="trackScroll"
          >
            <el-empty v-if="!rounds.length" description="暂无执行记录" />
            <template v-else>
              <div
                v-for="round in visibleRounds"
                :key="round.key"
                class="demo-im-entry"
                :data-entry-key="round.key"
              >
                <im-history-round
                  :round="round"
                  :expert-name="expert.name"
                  :avatar="expertAvatar"
                  :file-items="expert.files || []"
                  @workspace="openWorkspace"
                  @preview="previewFile"
                  @download="downloadFile"
                />
              </div>
            </template>
          </div>
          <div
            v-if="rounds.length"
            class="pc-question-rail demo-im-question-rail"
            aria-label="执行记录快速定位"
          >
            <el-popover
              v-for="round in rounds"
              :key="round.key"
              placement="right"
              trigger="hover"
              width="300"
              popper-class="pc-question-popover"
            >
              <div class="pc-question-preview">
                <div class="pc-question-preview-head">
                  <strong>{{ round.user.content }}</strong>
                </div>
                <p>{{ round.assistant.content || "处理中，尚无最终回复" }}</p>
              </div>
              <button
                slot="reference"
                type="button"
                class="pc-question-bar"
                :aria-label="`定位执行记录：${round.user.content}`"
                @click="jumpTo(round.key)"
              />
            </el-popover>
          </div>
        </div>
        <button
          v-if="!atBottom && rounds.length"
          type="button"
          class="demo-im-back-latest"
          @click="scrollBottom"
        >
          ↓ 回到最新
        </button>
      </section>
    </div>
    <div v-if="event" slot="footer" class="demo-im-footer">
      仅展示当前专家已保存的自主任务执行记录。
    </div>
    <el-dialog
      :title="previewRecord ? previewRecord.fileName : '文件预览'"
      :visible.sync="previewVisible"
      append-to-body
      width="720px"
      custom-class="manage-dialog demo-im-preview-dialog"
    >
      <pre v-if="previewRecord">{{ previewRecord.content }}</pre>
      <span slot="footer">
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadFile(previewRecord)"
          >下载</el-button
        >
      </span>
    </el-dialog>
  </el-dialog>
</template>

<script>
import { avatarSrcFor } from "../avatar";
import ImHistoryRound from "./ImHistoryRound.vue";

export default {
  name: "EventTaskDetail",
  components: { ImHistoryRound },
  props: {
    visible: { type: Boolean, default: false },
    event: { type: Object, default: null },
    expert: { type: Object, required: true },
  },
  data() {
    return {
      visibleCount: 8,
      atBottom: true,
      previewVisible: false,
      previewRecord: null,
    };
  },
  computed: {
    expertAvatar() {
      return avatarSrcFor(this.expert);
    },
    eventPath() {
      return this.event?.cwd || `自主任务/${this.event?.id || ""}`;
    },
    rounds() {
      return [...(this.event?.runs || [])]
        .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")))
        .map((run) => ({
          kind: "round",
          key: run.id,
          user: {
            id: `${run.id}-input`,
            role: "user",
            at: run.at,
            content: run.input || this.event.instruction || "事件触发",
          },
          assistant: {
            id: `${run.id}-reply`,
            role: "assistant",
            at: run.at,
            content:
              run.reply || (run.status === "running" ? "" : run.summary || ""),
            turnStatus:
              { success: "completed", running: "running", failed: "failed" }[
                run.status
              ] || "unknown",
            durationMs: run.status === "running" ? undefined : run.durationMs,
          },
          inputs: [],
          process: run.process || [],
          outputs: run.outputs || [],
        }));
    },
    visibleRounds() {
      return this.rounds.slice(-this.visibleCount);
    },
  },
  watch: {
    event() {
      this.visibleCount = 8;
      this.$nextTick(this.scrollBottom);
    },
  },
  methods: {
    scrollBottom() {
      this.$nextTick(() => {
        const box = this.$refs.timeline;
        if (box) box.scrollTop = box.scrollHeight;
        this.atBottom = true;
      });
    },
    trackScroll(event) {
      const box = event.target;
      this.atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
      if (box.scrollTop < 48 && this.visibleCount < this.rounds.length) {
        const height = box.scrollHeight;
        const top = box.scrollTop;
        this.visibleCount = Math.min(this.visibleCount + 8, this.rounds.length);
        this.$nextTick(() => {
          box.scrollTop = top + box.scrollHeight - height;
        });
      }
    },
    jumpTo(key) {
      this.visibleCount = this.rounds.length;
      this.$nextTick(() => {
        const box = this.$refs.timeline;
        const target = Array.from(
          box?.querySelectorAll("[data-entry-key]") || [],
        ).find((item) => item.dataset.entryKey === key);
        if (!box || !target) return;
        const top =
          target.getBoundingClientRect().top -
          box.getBoundingClientRect().top +
          box.scrollTop -
          box.clientHeight / 2;
        box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      });
    },
    fileItem(file) {
      return this.expert.files?.find(
        (item) => item.id === `f_im_file_${file?.id}`,
      );
    },
    previewFile(file) {
      const item = this.fileItem(file);
      if (!item) return this.$message.warning("文件已不可用");
      this.previewRecord = {
        id: file.id,
        fileName: file.fileName,
        content: String(item.content || ""),
      };
      this.previewVisible = true;
    },
    downloadFile(file) {
      const item = this.fileItem(file);
      if (!item) return this.$message.warning("文件已不可用");
      const url = URL.createObjectURL(
        new Blob([String(item.content || "")], {
          type: "text/markdown;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
    },
    openWorkspace(path) {
      if (!path) return;
      this.$emit("workspace", path);
      this.close();
    },
    close() {
      this.$emit("update:visible", false);
    },
  },
};
</script>
