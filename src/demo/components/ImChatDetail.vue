<template>
  <el-dialog
    :visible="visible"
    width="1280px"
    top="7.5vh"
    custom-class="manage-dialog demo-im-dialog"
    :title="chat ? chat.title : '消息渠道对话记录'"
    @close="close"
    @opened="scrollToBottom"
  >
    <div v-if="chat" slot="title" class="demo-im-header">
      <div class="demo-im-title">
        <h3>{{ chat.title }}</h3>
        <img :src="channelLogo(chat.platform)" :alt="chat.platform" />
        <span>{{ chat.chatType === "group" ? "群聊" : "单聊" }}</span>
      </div>
      <p>{{ chat.platform }} · chat_id：{{ chat.chatId }}</p>
      <button
        type="button"
        class="demo-im-path"
        @click="openWorkspace(chat.cwd)"
      >
        打开工作目录 <i class="el-icon-top-right" />
      </button>
    </div>
    <div
      v-if="chat"
      class="demo-im-layout"
      :class="{ 'is-single': chat.chatType === 'single' }"
    >
      <aside
        v-if="chat.chatType === 'group'"
        class="demo-im-scopes"
        aria-label="会话范围"
      >
        <h4>会话范围</h4>
        <div
          v-for="scope in scopes"
          :key="scope.sessionKey"
          class="demo-im-scope"
          :class="{ active: selectedScopeKey === scope.sessionKey }"
        >
          <button
            type="button"
            class="demo-im-select"
            @click="selectScope(scope)"
          >
            <span class="demo-im-scope-kind">{{ scopeKind(scope) }}</span>
            <strong>{{ scopeLabel(scope) }}</strong>
          </button>
          <div class="demo-im-card-meta">
            <code :title="scope.sessionKey">{{
              abbreviatedImId(scope.sessionKey, 17)
            }}</code>
            <div class="demo-im-actions">
              <button
                type="button"
                :aria-label="`复制会话范围 ${scope.sessionKey}`"
                title="复制 session_key"
                @click="copy(scope.sessionKey)"
              >
                <i class="el-icon-document-copy" />
              </button>
              <button
                type="button"
                aria-label="打开工作目录"
                title="打开工作目录"
                @click="openWorkspace(scope.cwd)"
              >
                <i class="el-icon-folder-opened" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      <nav class="demo-im-segments" aria-label="会话段">
        <h4>会话段</h4>
        <div
          v-for="segment in segments"
          :key="segment.sessionId"
          class="demo-im-segment"
          :class="{ active: selectedSegmentId === segment.sessionId }"
        >
          <button
            type="button"
            class="demo-im-select"
            @click="selectSegment(segment)"
          >
            <code :title="segment.sessionId">{{
              abbreviatedImId(segment.sessionId)
            }}</code>
            <em v-if="segment.current">当前</em>
          </button>
          <div class="demo-im-card-meta">
            <span>{{ formatTime(segment.startedAt) }}</span>
            <div class="demo-im-actions">
              <button
                type="button"
                :aria-label="`复制会话段 ${segment.sessionId}`"
                title="复制 session_id"
                @click="copy(segment.sessionId)"
              >
                <i class="el-icon-document-copy" />
              </button>
              <button
                type="button"
                aria-label="打开工作目录"
                title="打开工作目录"
                @click="openWorkspace(segment.cwd)"
              >
                <i class="el-icon-folder-opened" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main ref="timeline" class="demo-im-record" aria-label="会话记录">
        <div class="demo-im-record-head">
          <h4>会话记录</h4>
          <small>仅展示专家已接收并处理的消息</small>
        </div>
        <template v-if="activeSegment">
          <div v-if="activeSegment.boundaryLabel" class="demo-im-boundary">
            {{ activeSegment.boundaryLabel }}
          </div>
          <div
            v-for="entry in messages"
            :key="entry.id"
            class="demo-im-message"
            :class="`is-${entry.role}`"
          >
            <details v-if="entry.role === 'tool'" class="demo-im-tool">
              <summary>{{ imClock(entry.at) }} · 工具调用</summary>
              <p>{{ entry.content }}</p>
            </details>
            <div
              v-else-if="entry.role === 'command' || entry.role === 'notice'"
              class="demo-im-notice"
            >
              {{ imClock(entry.at) }} · {{ entry.content }}
            </div>
            <button
              v-else-if="entry.role === 'file'"
              type="button"
              class="demo-im-file"
              :disabled="!entry.fileDirectory"
              @click="openWorkspace(entry.fileDirectory)"
            >
              <i class="el-icon-document" />
              <span
                ><strong>{{ entry.fileName }}</strong
                ><small
                  >{{
                    entry.direction === "received" ? "收到文件" : "生成文件"
                  }}
                  · {{ entry.transferStatus }} · {{ imClock(entry.at) }}</small
                ></span
              >
              <i class="el-icon-top-right" />
            </button>
            <div v-else class="demo-im-bubble">
              <div>
                <strong>{{
                  entry.role === "user"
                    ? entry.senderName || activeScope?.memberName || "用户"
                    : "专家"
                }}</strong>
                <time>{{ imClock(entry.at) }}</time>
              </div>
              <p>{{ entry.content }}</p>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无会话记录" />
      </main>
    </div>
    <span slot="footer"><el-button @click="close">关闭</el-button></span>
  </el-dialog>
</template>

<script>
import {
  abbreviatedImId,
  currentFirst,
  directSegmentsFor,
  sortedImMessages,
  scopesFor,
} from "../im-chat-model";
import { publicAsset } from "../public-asset";

export default {
  name: "DemoImChatDetail",
  props: {
    visible: { type: Boolean, default: false },
    chat: { type: Object, default: null },
  },
  data() {
    return { selectedScopeKey: "", selectedSegmentId: "" };
  },
  computed: {
    scopes() {
      return currentFirst(scopesFor(this.chat));
    },
    activeScope() {
      return (
        this.scopes.find(
          (scope) => scope.sessionKey === this.selectedScopeKey,
        ) ||
        this.scopes[0] ||
        null
      );
    },
    segments() {
      return currentFirst(
        this.chat?.chatType === "single"
          ? directSegmentsFor(this.chat)
          : this.activeScope?.segments,
      );
    },
    activeSegment() {
      return (
        this.segments.find(
          (segment) => segment.sessionId === this.selectedSegmentId,
        ) ||
        this.segments[0] ||
        null
      );
    },
    messages() {
      return sortedImMessages(this.activeSegment);
    },
  },
  watch: {
    chat: { handler: "resetSelection", immediate: true },
    visible(value) {
      if (value) this.resetSelection();
    },
  },
  methods: {
    abbreviatedImId,
    channelLogo(platform) {
      return publicAsset(
        `/experts/channel-icons/${{ 企业微信: "wecom", 钉钉: "dingtalk", 飞书: "feishu" }[platform] || "wecom"}.svg`,
      );
    },
    scopeLabel(scope) {
      return scope.memberName || scope.label;
    },
    scopeKind() {
      return "成员";
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
    imClock(value) {
      return value
        ? new Date(value).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "-";
    },
    resetSelection() {
      const scope = this.scopes[0];
      this.selectedScopeKey = scope?.sessionKey || "";
      this.selectedSegmentId = this.segments[0]?.sessionId || "";
      this.scrollToBottom();
    },
    selectScope(scope) {
      this.selectedScopeKey = scope.sessionKey;
      this.selectedSegmentId = currentFirst(scope.segments)[0]?.sessionId || "";
      this.scrollToBottom();
    },
    selectSegment(segment) {
      this.selectedSegmentId = segment.sessionId;
      this.scrollToBottom();
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const box = this.$refs.timeline;
        if (box) box.scrollTop = box.scrollHeight;
      });
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
        this.$message.success("完整 ID 已复制");
      } catch {
        this.$message.warning("复制失败");
      }
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
