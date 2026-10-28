<template>
  <el-dialog
    :visible="visible"
    width="75vw"
    top="20px"
    custom-class="manage-dialog demo-im-dialog"
    modal-class="demo-im-backdrop"
    :title="chat ? `${chat.title}的对话记录` : '消息渠道对话记录'"
    @close="close"
    @opened="scrollToBottom"
  >
    <div v-if="chat" slot="title" class="demo-im-header">
      <div class="demo-im-title">
        <h3 :title="chat.title">{{ chat.title }}的对话记录</h3>
        <img :src="channelLogo(chat.platform)" :alt="chat.platform" />
        <span>{{ chat.chatType === "group" ? "群聊" : "单聊" }}</span>
      </div>
      <div class="demo-im-header-meta">
        <span>{{ chatIdentifier(chat).name }}：</span>
        <code :title="chatIdentifier(chat).value">{{
          compactImId(chatIdentifier(chat).value, 32)
        }}</code>
        <button
          type="button"
          :aria-label="`复制 ${chatIdentifier(chat).name}`"
          title="复制完整标识"
          @click="copy(chatIdentifier(chat).value)"
        >
          <i class="el-icon-document-copy" />
        </button>
        <button
          type="button"
          class="demo-im-path"
          :title="chat.cwd || '选择成员目录'"
          @click="openChatDirectory"
        >
          工作目录 <i class="el-icon-top-right" />
        </button>
      </div>
    </div>

    <div
      v-if="chat"
      class="demo-im-layout"
      :class="{ 'is-single': chat.chatType === 'single' }"
    >
      <aside
        v-if="chat.chatType === 'group'"
        class="demo-im-members"
        aria-label="成员对话"
      >
        <h4>成员对话</h4>
        <el-input
          v-model.trim="memberQuery"
          size="small"
          clearable
          prefix-icon="el-icon-search"
          placeholder="搜索成员名称或标识"
        />
        <div class="demo-im-member-list">
          <button
            v-for="member in filteredMembers"
            :key="member.memberKey"
            type="button"
            class="demo-im-member"
            :class="{ active: selectedMemberKey === member.memberKey }"
            @click="selectMember(member)"
          >
            <strong :title="memberLabel(member)">{{
              memberLabel(member)
            }}</strong>
            <small
              v-if="duplicateMemberNames.has(memberLabel(member))"
              :title="member.memberKey"
              >{{ compactImId(member.memberKey, 16) }}</small
            >
            <span
              >最近
              {{ member.lastAt ? formatTime(member.lastAt) : "暂无记录" }}</span
            >
          </button>
          <el-empty v-if="!filteredMembers.length" description="暂无匹配成员" />
        </div>
      </aside>

      <section class="demo-im-history" aria-label="历史对话记录">
        <div v-if="chat.chatType === 'group'" class="demo-im-history-head">
          <h4>{{ memberLabel(activeMember) }}与专家的对话</h4>
          <small>仅展示专家已接收并保存的对话。</small>
          <button
            v-if="activeMember"
            type="button"
            class="demo-im-path"
            :title="historyDirectoryHint"
            @click="openHistoryDirectory"
          >
            工作目录 <i class="el-icon-top-right" />
          </button>
        </div>
        <div class="pc-messages-wrap demo-im-messages-wrap">
          <div
            ref="timeline"
            class="pc-messages demo-im-timeline"
            @scroll.passive="onTimelineScroll"
          >
            <div v-if="historyLoadFailed" class="demo-im-history-error">
              加载失败，请重试
              <el-button type="text" @click="retryHistory">重试</el-button>
            </div>
            <template v-else-if="visibleEntries.length">
              <div
                v-for="item in visibleEntries"
                :key="item.key"
                class="demo-im-entry"
                :data-entry-key="item.key"
              >
                <im-history-round
                  :round="item"
                  :expert-name="expertName"
                  :avatar="expertAvatar"
                  :file-items="expert?.files || []"
                  @workspace="openWorkspace"
                  @preview="previewFile"
                  @download="downloadFile"
                />
              </div>
            </template>
            <el-empty v-else description="暂无对话记录" />
          </div>
          <div
            v-if="questionPreviews.length"
            ref="questionRail"
            class="pc-question-rail demo-im-question-rail"
            :class="{
              'is-dense': questionRailDense,
              'can-scroll-up': questionRailCanScrollUp,
              'can-scroll-down': questionRailCanScrollDown,
            }"
            aria-label="问题快速定位"
            @scroll.passive="updateQuestionRailEdges"
          >
            <el-popover
              v-for="(item, index) in questionPreviews"
              :key="item.key"
              placement="right"
              trigger="hover"
              :open-delay="120"
              width="320"
              popper-class="pc-question-popover"
            >
              <div class="pc-question-preview">
                <div class="pc-question-preview-head">
                  <strong>{{ questionLabel(item) }}</strong>
                  <button
                    type="button"
                    class="pc-question-mark"
                    :class="{
                      'is-marked': markedQuestionKeys.includes(
                        bookmarkKey(item.key),
                      ),
                    }"
                    :title="
                      markedQuestionKeys.includes(bookmarkKey(item.key))
                        ? '取消标记'
                        : '标记问题'
                    "
                    :aria-label="
                      markedQuestionKeys.includes(bookmarkKey(item.key))
                        ? '取消标记问题'
                        : '标记问题'
                    "
                    @click.stop="toggleQuestionMark(item.key)"
                  >
                    <svg viewBox="0 0 20 22" aria-hidden="true">
                      <path
                        d="M4 2.5h12a1 1 0 0 1 1 1v16l-7-4.5-7 4.5v-16a1 1 0 0 1 1-1Z"
                      />
                    </svg>
                  </button>
                </div>
                <p>{{ item.finalReply || "尚无最终回复" }}</p>
              </div>
              <button
                slot="reference"
                type="button"
                class="pc-question-bar"
                :class="{
                  'is-marked': markedQuestionKeys.includes(
                    bookmarkKey(item.key),
                  ),
                  'is-hovered': hoveredQuestionIndex === index,
                  'is-neighbor':
                    hoveredQuestionIndex !== null &&
                    Math.abs(hoveredQuestionIndex - index) === 1,
                  'is-nearby':
                    hoveredQuestionIndex !== null &&
                    Math.abs(hoveredQuestionIndex - index) === 2,
                }"
                :aria-label="`定位问题：${questionLabel(item)}`"
                @mouseenter="hoveredQuestionIndex = index"
                @mouseleave="hoveredQuestionIndex = null"
                @focus="hoveredQuestionIndex = index"
                @blur="hoveredQuestionIndex = null"
                @click="jumpToQuestion(item.key)"
              />
            </el-popover>
          </div>
        </div>
        <button
          v-if="!atBottom && !historyLoadFailed && historyEntries.length"
          type="button"
          class="demo-im-back-latest"
          @click="scrollToBottom"
        >
          {{ hasNewMessages ? "有新消息 · 回到最新" : "↓ 回到最新" }}
        </button>
      </section>
    </div>
    <div v-if="chat" slot="footer" class="demo-im-footer">
      历史记录仅供查看，请前往{{ chat.platform
      }}{{ chat.chatType === "group" ? "群聊" : "" }}继续对话。
    </div>
    <el-dialog
      title="选择工作目录"
      :visible.sync="directoryVisible"
      append-to-body
      width="560px"
      custom-class="manage-dialog demo-im-directory-dialog"
    >
      <p>选择要查看的历史目录：</p>
      <button
        v-for="choice in directoryChoices"
        :key="choice.path"
        type="button"
        class="demo-im-directory-choice"
        :title="choice.path"
        @click="openWorkspace(choice.path)"
      >
        {{ choice.label }} <i class="el-icon-top-right" />
      </button>
    </el-dialog>
    <el-dialog
      :title="previewFileRecord ? previewFileRecord.fileName : '文件预览'"
      :visible.sync="filePreviewVisible"
      append-to-body
      width="720px"
      custom-class="manage-dialog demo-im-preview-dialog"
    >
      <pre v-if="previewFileRecord">{{ previewFileRecord.content }}</pre>
      <span slot="footer">
        <el-button @click="filePreviewVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadFile(previewFileRecord)"
          >下载</el-button
        >
      </span>
    </el-dialog>
  </el-dialog>
</template>

<script>
import {
  chatIdentifier,
  compactImId,
  directSegmentsFor,
  imHistoryEntries,
  imHistoryRounds,
  imMemberHistories,
  imQuestionPreviews,
} from "../im-chat-model";
import { avatarSrcFor } from "../avatar";
import { state, persist } from "../state";
import { publicAsset } from "../public-asset";
import ImHistoryRound from "./ImHistoryRound.vue";

export default {
  name: "DemoImChatDetail",
  components: { ImHistoryRound },
  props: {
    visible: { type: Boolean, default: false },
    chat: { type: Object, default: null },
    expert: { type: Object, default: null },
    expertName: { type: String, default: "专家" },
  },
  data() {
    return {
      memberQuery: "",
      selectedMemberKey: "",
      visibleCount: 8,
      atBottom: true,
      hasNewMessages: false,
      suppressNewIndicator: false,
      historyLoadFailed: false,
      directoryVisible: false,
      directoryChoices: [],
      filePreviewVisible: false,
      previewFileRecord: null,
      hoveredQuestionIndex: null,
      markedQuestionKeys: [],
      questionRailDense: false,
      questionRailCanScrollUp: false,
      questionRailCanScrollDown: false,
    };
  },
  computed: {
    expertAvatar() {
      return avatarSrcFor(this.expert);
    },
    members() {
      return imMemberHistories(this.chat);
    },
    filteredMembers() {
      const query = this.memberQuery.toLowerCase();
      return this.members.filter((member) =>
        `${this.memberLabel(member)} ${member.memberKey}`
          .toLowerCase()
          .includes(query),
      );
    },
    duplicateMemberNames() {
      const counts = new Map();
      for (const member of this.members) {
        const name = this.memberLabel(member);
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      return new Set(
        [...counts].filter(([, count]) => count > 1).map(([name]) => name),
      );
    },
    activeMember() {
      return (
        this.members.find(
          (member) => member.memberKey === this.selectedMemberKey,
        ) ||
        this.members[0] ||
        null
      );
    },
    historyEntries() {
      return imHistoryEntries(
        this.chat?.chatType === "single"
          ? directSegmentsFor(this.chat)
          : this.activeMember?.segments || [],
      );
    },
    historyItems() {
      return imHistoryRounds(this.historyEntries).filter(
        (item) => item.kind !== "boundary",
      );
    },
    questionPreviews() {
      return imQuestionPreviews(this.historyEntries);
    },
    visibleEntries() {
      return this.historyItems.slice(-this.visibleCount);
    },
    historyDirectories() {
      const segments =
        this.chat?.chatType === "single"
          ? directSegmentsFor(this.chat)
          : this.activeMember?.segments || [];
      const unique = new Map();
      for (const segment of segments)
        if (segment.cwd && !unique.has(segment.cwd))
          unique.set(segment.cwd, {
            path: segment.cwd,
            label: `${this.formatTime(segment.startedAt)} · ${segment.cwd}`,
          });
      return [...unique.values()];
    },
    historyDirectoryHint() {
      return this.historyDirectories.length === 1
        ? this.historyDirectories[0].path
        : "选择历史工作目录";
    },
  },
  watch: {
    chat: { handler: "resetSelection", immediate: true },
    visible(value) {
      if (value) this.resetSelection();
    },
    "historyEntries.length"(value, oldValue) {
      if (!this.visible || this.suppressNewIndicator || value <= oldValue)
        return;
      if (this.atBottom) this.scrollToBottom();
      else this.hasNewMessages = true;
    },
  },
  methods: {
    chatIdentifier,
    compactImId,
    channelLogo(platform) {
      return publicAsset(
        `/experts/channel-icons/${{ 企业微信: "wecom", 钉钉: "dingtalk", 飞书: "feishu" }[platform] || "wecom"}.svg`,
      );
    },
    memberLabel(member) {
      return member?.memberName || member?.label || member?.id || "成员";
    },
    formatTime(value) {
      return value
        ? new Date(value)
            .toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
            .replaceAll("/", "-")
        : "-";
    },
    resetSelection() {
      this.memberQuery = "";
      this.selectedMemberKey = this.members[0]?.memberKey || "";
      this.markedQuestionKeys = [
        ...(state.imChats.find((item) => item.id === this.chat?.id)
          ?.bookmarkedQuestionKeys || []),
      ];
      this.hoveredQuestionIndex = null;
      this.historyLoadFailed = Boolean(this.chat?.historyError);
      this.resetHistoryPosition();
    },
    selectMember(member) {
      this.selectedMemberKey = member.memberKey;
      this.resetHistoryPosition();
    },
    resetHistoryPosition() {
      this.suppressNewIndicator = true;
      this.visibleCount = 8;
      this.hasNewMessages = false;
      this.atBottom = true;
      this.$nextTick(() => {
        const box = this.$refs.timeline;
        if (box) box.scrollTop = box.scrollHeight;
        this.suppressNewIndicator = false;
        this.updateQuestionRailEdges();
      });
    },
    questionLabel(item) {
      return item.message.title || item.message.content || "资料消息";
    },
    bookmarkKey(key) {
      return `${this.chat?.chatType === "group" ? this.activeMember?.memberKey : "single"}:${key}`;
    },
    toggleQuestionMark(key) {
      const id = this.bookmarkKey(key);
      this.markedQuestionKeys = this.markedQuestionKeys.includes(id)
        ? this.markedQuestionKeys.filter((item) => item !== id)
        : [...this.markedQuestionKeys, id];
      const saved = state.imChats.find((item) => item.id === this.chat?.id);
      if (saved) {
        this.$set(saved, "bookmarkedQuestionKeys", [
          ...this.markedQuestionKeys,
        ]);
        persist();
      }
    },
    jumpToQuestion(key) {
      this.visibleCount = this.historyItems.length;
      this.$nextTick(() => {
        const box = this.$refs.timeline;
        const target = Array.from(
          box?.querySelectorAll("[data-entry-key]") || [],
        ).find((item) => item.dataset.entryKey === key);
        if (!box || !target) return;
        const offset =
          target.getBoundingClientRect().top -
          box.getBoundingClientRect().top +
          box.scrollTop -
          box.clientHeight / 2;
        box.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      });
    },
    updateQuestionRailEdges() {
      const rail = this.$refs.questionRail;
      if (!rail) return;
      const remaining = rail.scrollHeight - rail.clientHeight;
      this.questionRailDense = remaining > 1;
      this.questionRailCanScrollUp = remaining > 1 && rail.scrollTop > 1;
      this.questionRailCanScrollDown =
        remaining > 1 && rail.scrollTop < remaining - 1;
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const box = this.$refs.timeline;
        if (box) box.scrollTop = box.scrollHeight;
        this.atBottom = true;
        this.hasNewMessages = false;
      });
    },
    onTimelineScroll(event) {
      const box = event.target;
      this.atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
      if (this.atBottom) this.hasNewMessages = false;
      if (!this.suppressNewIndicator && box.scrollTop < 48) this.loadOlder();
    },
    loadOlder() {
      if (this.visibleCount >= this.historyItems.length) return;
      const box = this.$refs.timeline;
      if (!box) return;
      const oldHeight = box.scrollHeight;
      const oldTop = box.scrollTop;
      this.visibleCount = Math.min(
        this.visibleCount + 8,
        this.historyItems.length,
      );
      this.$nextTick(() => {
        box.scrollTop = oldTop + box.scrollHeight - oldHeight;
      });
    },
    retryHistory() {
      this.historyLoadFailed = false;
      this.resetHistoryPosition();
    },
    openChatDirectory() {
      if (this.chat?.cwd) return this.openWorkspace(this.chat.cwd);
      const choices = this.members
        .filter((member) => member.cwd)
        .map((member) => ({
          path: member.cwd,
          label: this.memberLabel(member),
        }));
      if (choices.length) {
        this.directoryChoices = choices;
        this.directoryVisible = true;
      } else this.$message.info("暂无工作目录");
    },
    openHistoryDirectory() {
      this.chooseDirectory(this.historyDirectories);
    },
    chooseDirectory(choices) {
      if (choices.length === 1) this.openWorkspace(choices[0].path);
      else if (choices.length) {
        this.directoryChoices = choices;
        this.directoryVisible = true;
      }
    },
    fileItem(file) {
      return this.expert?.files?.find(
        (item) => item.id === `f_im_file_${file?.id}`,
      );
    },
    previewFile(file) {
      const item = this.fileItem(file);
      if (!item) return this.$message.warning("文件已不可用");
      this.previewFileRecord = {
        id: file.id,
        fileName: file.fileName,
        content: String(item.content || ""),
      };
      this.filePreviewVisible = true;
    },
    downloadFile(file) {
      const item = this.fileItem(file);
      if (!item) return this.$message.warning("文件已不可用");
      const blob = new Blob([String(item.content || "")], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
    },
    async copy(value) {
      try {
        if (navigator.clipboard?.writeText)
          await navigator.clipboard.writeText(value);
        else {
          const input = document.createElement("textarea");
          input.value = value;
          input.style.position = "fixed";
          input.style.opacity = "0";
          document.body.appendChild(input);
          input.select();
          const copied = document.execCommand("copy");
          input.remove();
          if (!copied) throw new Error("copy failed");
        }
        this.$message.success("已复制");
      } catch {
        this.$message.warning("复制失败");
      }
    },
    openWorkspace(path) {
      if (!path) return;
      this.directoryVisible = false;
      this.$emit("workspace", path);
      this.close();
    },
    close() {
      this.$emit("update:visible", false);
    },
  },
};
</script>
