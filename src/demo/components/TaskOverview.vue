<template>
  <div class="task-overview">
    <div class="section-heading">
      <div>
        <h2>任务</h2>
        <p>查看平台对话，消息渠道对话以及事件中心自主任务的记录</p>
      </div>
    </div>
    <div class="segmented">
      <button
        :class="{ active: section === 'conversation' }"
        @click="section = 'conversation'"
      >
        平台对话</button
      ><button :class="{ active: section === 'im' }" @click="section = 'im'">
        消息渠道对话</button
      ><button
        :class="{ active: section === 'event' }"
        @click="section = 'event'"
      >
        自主任务（事件中心）
      </button>
    </div>
    <template v-if="section === 'conversation'">
      <div class="toolbar task-action-bar">
        <strong class="task-action-summary"
          ><strong>{{ conversations.length }}</strong> 个对话任务 ·
          <strong>{{
            conversations.filter((x) => x.status === "running").length
          }}</strong>
          个运行中</strong
        >
        <div class="task-action-controls">
          <el-input
            v-model="keyword"
            size="small"
            prefix-icon="el-icon-search"
            clearable
            placeholder="搜索名称或 ID"
          /><el-select v-model="statusFilter" size="small"
            ><el-option label="全部" value="" /><el-option
              label="运行中"
              value="running" /><el-option
              label="已就绪"
              value="ready" /></el-select
          ><el-button size="small" @click="archiveVisible = true"
            >归档 {{ archived.length }}</el-button
          ><el-button type="primary" size="small" @click="newConversation"
            >+ 新建任务</el-button
          >
        </div>
      </div>
      <el-table
        :data="filteredConversations"
        class="conversation-task-table"
        empty-text="暂无任务"
        ><el-table-column label="任务" min-width="190"
          ><template slot-scope="scope"
            ><strong>{{ scope.row.title }}</strong>
            <p class="muted mono">
              {{ scope.row.id }}
              <el-button
                type="text"
                class="task-id-copy"
                icon="el-icon-document-copy"
                :aria-label="`复制任务 ID ${scope.row.id}`"
                title="复制任务 ID"
                @click="copy(scope.row.id)"
              /></p></template></el-table-column
        ><el-table-column label="状态" width="90"
          ><template slot-scope="scope"
            ><el-tag
              size="mini"
              class="task-state-tag"
              :class="scope.row.status"
              >{{
                scope.row.status === "running" ? "运行中" : "已就绪"
              }}</el-tag
            ></template
          ></el-table-column
        ><el-table-column label="当前工作目录" min-width="115"
          ><template slot-scope="scope"
            ><el-button type="text" @click="$emit('workspace')"
              >{{ scope.row.cwd === "/" ? "工作空间" : scope.row.cwd }}
              <i
                class="el-icon-top-right" /></el-button></template></el-table-column
        ><el-table-column label="最近活跃" width="180"
          ><template slot-scope="scope">{{
            formatTime(scope.row.updatedAt)
          }}</template></el-table-column
        ><el-table-column label="操作" width="172"
          ><template slot-scope="scope"
            ><el-button type="text" @click="openConversation(scope.row)"
              >打开</el-button
            ><el-button type="text" @click="rename(scope.row)"
              >编辑名称</el-button
            ><el-dropdown
              @command="
                (command) =>
                  command === 'archive' ? archive(scope.row) : remove(scope.row)
              "
              ><span class="el-dropdown-link">···</span
              ><el-dropdown-menu slot="dropdown"
                ><el-dropdown-item command="archive">归档</el-dropdown-item
                ><el-dropdown-item command="delete"
                  >删除</el-dropdown-item
                ></el-dropdown-menu
              ></el-dropdown
            ></template
          ></el-table-column
        ></el-table
      >
      <el-dialog
        title="归档任务"
        :visible.sync="archiveVisible"
        width="760px"
        custom-class="manage-dialog manage-archive-dialog"
        ><div slot="title" class="archive-dialog-title">
          <span class="archive-dialog-icon"><i class="el-icon-box" /></span
          ><span
            ><strong
              >归档任务 <em>{{ archived.length }}</em></strong
            ><small>恢复任务后，才能查看历史记录或继续对话</small></span
          >
        </div>
        <el-input
          v-model="archiveKeyword"
          class="archive-search"
          clearable
          placeholder="搜索归档任务名称或 ID"
        />
        <el-table
          v-if="filteredArchived.length"
          :data="filteredArchived"
          class="archive-table"
          ><el-table-column prop="title" label="任务" /><el-table-column
            label="最近活跃"
            ><template slot-scope="scope">{{
              formatTime(scope.row.updatedAt)
            }}</template></el-table-column
          ><el-table-column label="操作" width="160"
            ><template slot-scope="scope"
              ><el-button type="text" @click="restore(scope.row)"
                >恢复</el-button
              ><el-button type="text" @click="remove(scope.row)"
                >删除</el-button
              ></template
            ></el-table-column
          ></el-table
        ><el-empty v-else description="没有匹配的归档任务" /><span slot="footer"
          ><el-button @click="archiveVisible = false">关闭</el-button></span
        ></el-dialog
      >
    </template>
    <template v-else-if="section === 'im'"
      ><div class="toolbar task-action-bar">
        <strong class="task-action-summary"
          >{{ filteredChats.length }} 个对话任务 · {{ runningSummary }}</strong
        >
        <div class="task-action-controls">
          <el-input
            v-model="imKeyword"
            size="small"
            clearable
            prefix-icon="el-icon-search"
            placeholder="搜索聊天名称或标识"
          /><el-select v-model="chatType" size="small"
            ><el-option label="全部类型" value="" /><el-option
              label="群聊"
              value="group" /><el-option
              label="单聊"
              value="single" /></el-select
          ><el-select
            v-model="platform"
            size="small"
            class="task-platform-select"
            ><el-option label="全部渠道" value="" /><el-option
              v-for="item in ['企业微信', '钉钉', '飞书']"
              :key="item"
              :label="item"
              :value="item" /></el-select
          ><el-button size="small" @click="openCardArchive('im')"
            >归档 {{ archivedChats.length }}</el-button
          >
        </div>
      </div>
      <div class="im-grid">
        <div
          v-for="chat in filteredChats"
          :key="chatIdentity(chat)"
          class="im-card task-im-card"
          role="button"
          tabindex="0"
          :aria-label="`查看 ${chat.title} 的对话记录`"
          @click="openChat(chat)"
          @keydown.enter.self.prevent="openChat(chat)"
          @keydown.space.self.prevent="openChat(chat)"
        >
          <div class="task-im-card-top">
            <span class="task-card-title-group">
              <strong :title="chat.title">{{ chat.title }}</strong>
              <span
                v-if="isImCardRunning(chat)"
                class="pc-spinner task-card-spinner"
                role="img"
                aria-label="运行中"
                title="运行中"
              />
            </span>
            <span class="task-im-source-group">
              <span class="task-im-channel" :title="chat.platform">
                <img :src="channelLogo(chat.platform)" :alt="chat.platform" />
              </span>
              <span class="task-im-type">{{
                chat.chatType === "group" ? "群聊" : "单聊"
              }}</span>
            </span>
          </div>
          <p>
            最近活跃：{{
              imChatActivity(chat).at
                ? formatTime(imChatActivity(chat).at)
                : "暂无记录"
            }}<template
              v-if="chat.chatType === 'group' && imChatActivity(chat).member"
            >
              · {{ imChatActivity(chat).member }}</template
            >
          </p>
          <div class="task-im-card-foot">
            <span class="task-im-identifier">
              <span class="task-im-identifier-name"
                >{{ chatIdentifier(chat).name }}：</span
              ><strong :title="chatIdentifier(chat).value">{{
                compactImId(chatIdentifier(chat).value)
              }}</strong>
              <button
                type="button"
                class="task-im-copy"
                :title="`复制 ${chatIdentifier(chat).name}`"
                :aria-label="`复制 ${chatIdentifier(chat).name} ${chatIdentifier(chat).value}`"
                @click.stop="copy(chatIdentifier(chat).value, '已复制')"
              >
                <i class="el-icon-document-copy" />
              </button>
            </span>
            <button
              type="button"
              class="task-im-workspace"
              :title="chat.cwd"
              aria-label="打开工作目录"
              @click.stop="openChatWorkspace(chat)"
            >
              工作目录 <i class="el-icon-top-right" />
            </button>
            <el-dropdown
              trigger="click"
              @click.native.stop
              @command="(command) => imCommand(command, chat)"
            >
              <button
                type="button"
                class="task-im-more"
                aria-label="更多操作"
                @click.stop
              >
                ···
              </button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="rename">编辑名称</el-dropdown-item>
                <el-dropdown-item command="archive">归档</el-dropdown-item>
                <el-dropdown-item command="delete">删除</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>
      <el-empty v-if="!filteredChats.length" description="暂无匹配聊天" />
      <im-chat-detail
        :visible.sync="imVisible"
        :chat="selectedChat"
        :expert="expert"
        :expert-name="expert.name"
        @workspace="$emit('workspace', $event)"
      />
      <el-dialog
        title="选择工作目录"
        :visible.sync="workspaceChooserVisible"
        width="520px"
        append-to-body
        custom-class="manage-dialog demo-im-directory-dialog"
      >
        <p>该群聊只有成员独立目录，请选择要打开的目录。</p>
        <button
          v-for="choice in workspaceChoices"
          :key="choice.path"
          type="button"
          class="demo-im-directory-choice"
          :title="choice.path"
          @click="chooseWorkspace(choice.path)"
        >
          {{ choice.label }} <i class="el-icon-top-right" />
        </button>
      </el-dialog>
    </template>
    <template v-else
      ><div class="toolbar task-action-bar">
        <strong class="task-action-summary"
          >{{ activeEvents.length }} 个自主任务 ·
          {{ runningEventCount }} 个运行中</strong
        >
        <div class="task-action-controls">
          <el-input
            v-model="eventKeyword"
            size="small"
            clearable
            prefix-icon="el-icon-search"
            placeholder="搜索名称"
          />
          <el-select
            v-model="eventSourceFilter"
            size="small"
            class="task-event-source-select"
            aria-label="筛选事件触发源类型"
          >
            <el-option label="全部触发源" value="" />
            <el-option
              v-for="type in eventSourceTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
          <el-button size="small" @click="openCardArchive('event')"
            >归档 {{ archivedEvents.length }}</el-button
          >
        </div>
      </div>
      <div class="event-action-list">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-action-card"
          role="button"
          tabindex="0"
          :aria-label="`查看 ${event.displayName || event.name} 的执行记录`"
          @click="openEventDetail(event)"
          @keydown.enter.self.prevent="openEventDetail(event)"
          @keydown.space.self.prevent="openEventDetail(event)"
        >
          <div class="event-action-card-top">
            <span class="task-card-title-group">
              <strong :title="event.displayName || event.name">{{
                event.displayName || event.name
              }}</strong>
              <span
                v-if="isEventCardRunning(event)"
                class="pc-spinner task-card-spinner"
                role="img"
                aria-label="运行中"
                title="运行中"
              />
            </span>
            <span class="event-source-tag">{{ event.trigger }}</span>
          </div>
          <p>
            最近活跃：{{
              event.runs.length ? formatTime(event.runs[0].at) : "暂无记录"
            }}
          </p>
          <div class="event-action-card-foot">
            <span
              :title="event.sourceSummary || event.sourceName || event.trigger"
              >{{
                event.sourceSummary || event.sourceName || event.trigger
              }}</span
            >
            <button
              type="button"
              :title="event.cwd || `自主任务/${event.id}`"
              aria-label="打开工作目录"
              @click.stop="
                $emit('workspace', event.cwd || `自主任务/${event.id}`)
              "
            >
              工作目录 <i class="el-icon-top-right" />
            </button>
            <el-dropdown
              trigger="click"
              @click.native.stop
              @command="(command) => eventCommand(command, event)"
            >
              <button
                type="button"
                class="event-card-more"
                aria-label="更多操作"
                @click.stop
              >
                ···
              </button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="rename">编辑名称</el-dropdown-item>
                <el-dropdown-item command="archive">归档</el-dropdown-item>
                <el-dropdown-item command="delete">删除</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>
      <el-empty v-if="!filteredEvents.length" description="暂无自主任务" />

      <event-task-detail
        :visible.sync="eventDetailVisible"
        :event="selectedEvent"
        :expert="expert"
        @workspace="$emit('workspace', $event)"
    /></template>
    <el-dialog
      title="编辑名称"
      :visible.sync="cardRenameVisible"
      width="440px"
      custom-class="manage-dialog task-card-rename-dialog"
    >
      <el-form label-position="top" @submit.native.prevent="saveCardName">
        <div class="task-card-name-heading">
          <label for="task-card-name-input">名称</label>
          <span class="task-card-source-name" :title="cardSourceName">
            原名称：{{ cardSourceName }}
          </span>
        </div>
        <el-input
          id="task-card-name-input"
          v-model="cardNameDraft"
          maxlength="80"
          show-word-limit
        />
      </el-form>
      <span slot="footer">
        <el-button @click="cardRenameVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCardName">保存</el-button>
      </span>
    </el-dialog>
    <el-dialog
      :title="cardArchiveKind === 'im' ? '归档对话' : '归档自主任务'"
      :visible.sync="cardArchiveVisible"
      width="680px"
      custom-class="manage-dialog task-card-archive-dialog"
    >
      <el-input
        v-model="cardArchiveKeyword"
        clearable
        prefix-icon="el-icon-search"
        placeholder="搜索名称"
      />
      <div v-if="filteredCardArchives.length" class="task-card-archive-list">
        <div
          v-for="item in filteredCardArchives"
          :key="cardArchiveKind === 'im' ? chatIdentity(item) : item.id"
          class="task-card-archive-row"
        >
          <strong :title="cardDisplayName(item)">{{
            cardDisplayName(item)
          }}</strong>
          <span>{{
            cardArchiveKind === "im" ? item.platform : item.trigger
          }}</span>
          <el-button type="text" @click="restoreCard(item)">恢复</el-button>
          <el-button type="text" @click="deleteCard(cardArchiveKind, item)"
            >删除</el-button
          >
        </div>
      </div>
      <el-empty v-else description="没有匹配的归档卡片" />
      <span slot="footer"
        ><el-button @click="cardArchiveVisible = false">关闭</el-button></span
      >
    </el-dialog>
  </div>
</template>

<script>
import {
  state,
  conversationsFor,
  imChatsFor,
  eventsFor,
  updateConversation,
  deleteConversation,
  persist,
} from "../state";
import { publicAsset } from "../public-asset";
import {
  chatIdentity,
  chatIdentifier,
  compactImId,
  filterImChats,
  groupImChats,
  imChatActivity,
  imChatStats,
} from "../im-chat-model";
import ImChatDetail from "./ImChatDetail.vue";
import EventTaskDetail from "./EventTaskDetail.vue";
import { EVENT_SOURCE_TYPES, filterEventTasks } from "../event-task-model";
export default {
  name: "DemoTaskOverview",
  components: { ImChatDetail, EventTaskDetail },
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      state,
      section: "conversation",
      keyword: "",
      statusFilter: "",
      archiveVisible: false,
      archiveKeyword: "",
      imKeyword: "",
      chatType: "",
      platform: "",
      imVisible: false,
      selectedChat: null,
      workspaceChooserVisible: false,
      workspaceChoices: [],
      eventKeyword: "",
      eventSourceTypes: EVENT_SOURCE_TYPES,
      eventSourceFilter: "",
      cardRenameVisible: false,
      cardRenameKind: "",
      cardRenameTarget: null,
      cardNameDraft: "",
      cardSourceName: "",
      cardArchiveVisible: false,
      cardArchiveKind: "im",
      cardArchiveKeyword: "",
      eventDetailVisible: false,
      selectedEvent: null,
    };
  },
  computed: {
    conversations() {
      return conversationsFor(this.expert.id);
    },
    archived() {
      return conversationsFor(this.expert.id, true);
    },
    filteredArchived() {
      const q = this.archiveKeyword.trim().toLowerCase();
      return this.archived.filter(
        (item) => !q || `${item.title} ${item.id}`.toLowerCase().includes(q),
      );
    },
    filteredConversations() {
      const q = this.keyword.toLowerCase();
      return this.conversations.filter(
        (x) =>
          (!this.statusFilter || x.status === this.statusFilter) &&
          (!q || `${x.title} ${x.id}`.toLowerCase().includes(q)),
      );
    },
    chats() {
      return groupImChats(imChatsFor(this.expert.id));
    },
    activeChats() {
      return this.chats.filter((chat) => !chat.archived);
    },
    archivedChats() {
      return this.chats.filter((chat) => chat.archived);
    },
    filteredChats() {
      return filterImChats(this.activeChats, {
        keyword: this.imKeyword,
        chatType: this.chatType,
        platform: this.platform,
      });
    },
    runningSummary() {
      const stats = imChatStats(this.filteredChats);
      if (stats.unknown === stats.total && stats.total > 0) return "状态未知";
      return `${stats.running} 个运行中`;
    },
    events() {
      return eventsFor(this.expert.id);
    },
    activeEvents() {
      return this.events.filter((event) => !event.archived);
    },
    archivedEvents() {
      return this.events.filter((event) => event.archived);
    },
    runningEventCount() {
      return this.activeEvents.filter((event) => this.isEventCardRunning(event))
        .length;
    },
    filteredEvents() {
      return filterEventTasks(this.activeEvents, {
        keyword: this.eventKeyword,
        sourceType: this.eventSourceFilter,
      });
    },
    filteredCardArchives() {
      const items =
        this.cardArchiveKind === "im"
          ? this.archivedChats
          : this.archivedEvents;
      const query = this.cardArchiveKeyword.trim().toLowerCase();
      return items.filter(
        (item) =>
          !query || this.cardDisplayName(item).toLowerCase().includes(query),
      );
    },
  },
  methods: {
    chatIdentity,
    chatIdentifier,
    compactImId,
    imChatActivity,
    isImCardRunning(chat) {
      return (
        chat.runState !== "unknown" &&
        chat.gatewayStatus !== "disconnected" &&
        (chat.runState === "running" || Boolean(chat.running))
      );
    },
    isEventCardRunning(event) {
      return (event.runs || []).some((run) => run.status === "running");
    },
    persist,
    cardDisplayName(item) {
      return item.displayName || item.title || item.name || "未命名";
    },
    imRows(chat) {
      const key = chatIdentity(chat);
      return this.state.imChats.filter((item) => chatIdentity(item) === key);
    },
    imCommand(command, chat) {
      if (command === "rename") this.openCardRename("im", chat);
      else if (command === "archive") this.archiveCard("im", chat);
      else if (command === "delete") this.deleteCard("im", chat);
    },
    openCardRename(kind, item) {
      this.cardRenameKind = kind;
      this.cardRenameTarget = item;
      this.cardSourceName =
        kind === "im" ? item.sourceTitle || item.title : item.name;
      this.cardNameDraft = item.displayName || this.cardSourceName;
      this.cardRenameVisible = true;
    },
    saveCardName() {
      const name = this.cardNameDraft.trim();
      if (!name) return this.$message.warning("请输入名称");
      const alias = name === this.cardSourceName ? "" : name;
      if (this.cardRenameKind === "im")
        this.imRows(this.cardRenameTarget).forEach((item) =>
          this.$set(item, "displayName", alias),
        );
      else if (this.cardRenameTarget)
        this.$set(this.cardRenameTarget, "displayName", alias);
      persist();
      this.cardRenameVisible = false;
      this.$message.success("名称已保存");
    },
    openCardArchive(kind) {
      this.cardArchiveKind = kind;
      this.cardArchiveKeyword = "";
      this.cardArchiveVisible = true;
    },
    archiveCard(kind, item) {
      if (kind === "im")
        this.imRows(item).forEach((row) => this.$set(row, "archived", true));
      else this.$set(item, "archived", true);
      persist();
      this.$message.success("已归档，可从归档列表恢复");
    },
    restoreCard(item) {
      if (this.cardArchiveKind === "im")
        this.imRows(item).forEach((row) => this.$set(row, "archived", false));
      else this.$set(item, "archived", false);
      persist();
      this.$message.success("已恢复");
    },
    deleteCard(kind, item) {
      const name = this.cardDisplayName(item);
      const description =
        kind === "im"
          ? "将删除该聊天卡片及本地对话历史。工作空间文件保留；外部渠道再次产生对话时可重新出现。"
          : "将删除该自主任务卡片及本地执行记录。工作空间文件保留；事件中心再次触发时可重新出现。";
      this.$confirm(description, `删除“${name}”？`, {
        type: "warning",
        customClass: "manage-message-box task-message-box",
        confirmButtonText: "删除",
      })
        .then(() => {
          if (kind === "im") {
            const rows = new Set(this.imRows(item));
            this.state.imChats = this.state.imChats.filter(
              (row) => !rows.has(row),
            );
            if (
              this.selectedChat &&
              chatIdentity(this.selectedChat) === chatIdentity(item)
            )
              this.imVisible = false;
          } else {
            const index = this.state.eventRuns.indexOf(item);
            if (index >= 0) this.state.eventRuns.splice(index, 1);
            if (this.selectedEvent?.id === item.id)
              this.eventDetailVisible = false;
          }
          persist();
          this.$message.success("已删除");
        })
        .catch(() => {});
    },
    openEventDetail(event) {
      this.selectedEvent = event;
      this.eventDetailVisible = true;
    },
    eventCommand(command, event) {
      if (command === "rename") this.openCardRename("event", event);
      else if (command === "archive") this.archiveCard("event", event);
      else if (command === "delete") this.deleteCard("event", event);
    },
    formatTime(value) {
      return value
        ? new Date(value)
            .toLocaleString("zh-CN", {
              hour12: false,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
            .replaceAll("/", "-")
        : "-";
    },
    channelLogo(platform) {
      return publicAsset(
        `/experts/channel-icons/${{ 企业微信: "wecom", 钉钉: "dingtalk", 飞书: "feishu" }[platform] || "wecom"}.svg`,
      );
    },
    copy(value, successMessage = "已复制 ID") {
      navigator.clipboard
        .writeText(value)
        .then(() => this.$message.success(successMessage))
        .catch(() => this.$message.warning("复制失败"));
    },
    newConversation() {
      this.$emit("new-task");
    },
    openConversation(conv) {
      this.$router.push({
        name: "chat",
        params: { id: this.expert.id },
        query: { conv: conv.id, embed: this.$route.query.embed },
      });
    },
    rename(conv) {
      this.$prompt("请输入任务名称", "编辑名称", {
        inputValue: conv.title,
        customClass: "manage-message-box task-message-box",
        confirmButtonText: "确定",
      })
        .then(({ value }) => {
          if (value.trim())
            updateConversation(conv.id, { title: value.trim() });
        })
        .catch(() => {});
    },
    archive(conv) {
      updateConversation(conv.id, { archived: true });
      this.$message.success("已归档，消息仍保留");
    },
    restore(conv) {
      updateConversation(conv.id, { archived: false });
      this.$message.success("已恢复");
    },
    remove(conv) {
      this.$confirm("永久删除此对话记录？", "删除任务", {
        type: "warning",
        customClass: "manage-message-box task-message-box",
      })
        .then(() => deleteConversation(conv.id))
        .catch(() => {});
    },
    openChat(chat) {
      this.selectedChat = chat;
      this.imVisible = true;
    },
    openChatWorkspace(chat) {
      if (chat.cwd) {
        this.$emit("workspace", chat.cwd);
        return;
      }
      const choices = (chat.scopes || [])
        .filter((scope) => scope.cwd)
        .map((scope) => ({
          label: scope.memberName || scope.label || scope.id,
          path: scope.cwd,
        }));
      if (choices.length) {
        this.workspaceChoices = choices;
        this.workspaceChooserVisible = true;
      } else this.$message.info("暂无工作目录");
    },
    chooseWorkspace(path) {
      this.workspaceChooserVisible = false;
      this.$emit("workspace", path);
    },
  },
};
</script>
