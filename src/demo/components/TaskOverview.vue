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
            >归档任务 {{ archived.length }}</el-button
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
            ><small>已归档的对话任务可以恢复或查看历史记录</small></span
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
          ><el-table-column label="操作" width="220"
            ><template slot-scope="scope"
              ><el-button type="text" @click="openConversation(scope.row)"
                >打开</el-button
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
            placeholder="搜索聊天名称或 chat_id"
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
              :value="item"
          /></el-select>
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
            <strong>{{ chat.title }}</strong
            ><span class="task-im-channel"
              ><img
                :src="channelLogo(chat.platform)"
                :alt="chat.platform" /></span
            ><span class="task-im-type">{{
              chat.chatType === "group" ? "群聊" : "单聊"
            }}</span>
          </div>
          <p>最近处理：{{ formatRecent(chat.updatedAt) }}</p>
          <div class="task-im-card-foot">
            <span class="task-im-folder"><i class="el-icon-folder" /></span
            ><span class="task-im-card-directory">
              <span>chat_id</span>
              <span class="task-im-card-directory-line">
                <strong :title="chat.chatId">{{ chat.chatId }}</strong>
                <button
                  type="button"
                  title="打开工作目录"
                  aria-label="打开工作目录"
                  @click.stop="$emit('workspace', chat.cwd)"
                >
                  <i class="el-icon-top-right" />
                </button>
              </span>
            </span>
          </div>
        </div>
      </div>
      <el-empty v-if="!filteredChats.length" description="暂无匹配聊天" />
      <im-chat-detail
        :visible.sync="imVisible"
        :chat="selectedChat"
        @workspace="$emit('workspace', $event)"
      />
    </template>
    <template v-else
      ><div class="toolbar task-action-bar">
        <strong class="task-action-summary"
          >{{ events.length }} 个专家执行动作</strong
        >
        <div class="task-action-controls">
          <el-input
            v-model="eventKeyword"
            size="small"
            clearable
            prefix-icon="el-icon-search"
            placeholder="搜索名称或 ID"
          />
        </div>
      </div>
      <div class="event-action-list">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-action-row"
        >
          <div class="event-action-main">
            <strong>{{ event.name }}</strong
            ><span
              >{{ event.sourceName || event.name }} · {{ event.trigger }} ·
              {{ event.branch || "默认分支" }}</span
            ><button type="button" @click="$emit('workspace')">
              工作目录&nbsp; 自主任务/{{ event.id }} &nbsp; 打开 ↗
            </button>
          </div>
          <span class="event-enabled" :class="{ disabled: !event.enabled }">{{
            event.enabled ? "已启用" : "已停用"
          }}</span>
          <span class="event-updated">{{
            formatTime(event.updatedAt || (event.runs[0] && event.runs[0].at))
          }}</span>
          <el-button type="text" @click="openEventDetail(event)"
            >详情</el-button
          >
          <el-dropdown @command="(command) => eventCommand(command, event)"
            ><span class="event-more">···</span
            ><el-dropdown-menu slot="dropdown"
              ><el-dropdown-item command="edit">编辑配置</el-dropdown-item
              ><el-dropdown-item command="toggle">{{
                event.enabled ? "停用" : "启用"
              }}</el-dropdown-item
              ><el-dropdown-item command="trigger">模拟触发</el-dropdown-item
              ><el-dropdown-item command="delete"
                >删除</el-dropdown-item
              ></el-dropdown-menu
            ></el-dropdown
          >
        </div>
      </div>
      <el-empty v-if="!filteredEvents.length" description="暂无自主任务" />
      <el-dialog
        :title="eventEditing ? '编辑配置' : '配置专家动作'"
        :visible.sync="eventFormVisible"
        width="600px"
        custom-class="manage-dialog event-form-dialog"
        ><el-form label-position="top" @submit.native.prevent="saveEventForm"
          ><el-form-item label="任务名称" required
            ><el-input
              v-model.trim="eventDraft.name"
              maxlength="80" /></el-form-item
          ><el-form-item label="已有事件源" required
            ><el-select v-model="eventDraft.trigger"
              ><el-option
                label="每日良率巡检 · Timer · 每天 09:00"
                value="Timer" /><el-option
                label="设备异常告警 · WebHook"
                value="WebHook" /></el-select></el-form-item
          ><el-form-item label="分支"
            ><el-input v-model.trim="eventDraft.branch" /></el-form-item
          ><el-form-item label="运行指令" required
            ><el-input
              v-model.trim="eventDraft.instruction"
              type="textarea"
              :rows="5"
              placeholder="可插入事件字段，例如 {device_id}" /></el-form-item
          ><el-form-item label="结果投递"
            ><el-select v-model="eventDraft.delivery"
              ><el-option label="仅产品内" value="仅产品内" /><el-option
                label="消息渠道"
                value="消息渠道" /></el-select></el-form-item
          ><el-form-item label="启用"
            ><el-switch v-model="eventDraft.enabled" /></el-form-item></el-form
        ><span slot="footer"
          ><el-button @click="eventFormVisible = false">取消</el-button
          ><el-button type="primary" @click="saveEventForm"
            >保存</el-button
          ></span
        ></el-dialog
      >
      <el-dialog
        title="自主任务详情"
        :visible.sync="eventDetailVisible"
        width="800px"
        custom-class="manage-dialog event-detail-dialog"
        ><template v-if="selectedEvent"
          ><div class="event-detail-summary">
            <div>
              <strong>{{ selectedEvent.name }}</strong>
              <p>
                {{ selectedEvent.sourceName || selectedEvent.name }} ·
                {{ selectedEvent.trigger }} ·
                {{ selectedEvent.branch || "默认分支" }}
              </p>
            </div>
            <span>{{ selectedEvent.enabled ? "已启用" : "已停用" }}</span
            ><el-switch v-model="selectedEvent.enabled" @change="persist" />
          </div>
          <section class="event-detail-card">
            <div class="event-detail-card-head">
              <strong>触发与执行</strong
              ><small
                >v1.0.0 · 更新于
                {{
                  formatTime(
                    selectedEvent.updatedAt ||
                      (selectedEvent.runs[0] && selectedEvent.runs[0].at),
                  )
                }}</small
              >
            </div>
            <div class="event-detail-fields">
              <div>
                <small>事件来源</small
                ><strong>{{
                  selectedEvent.sourceName || selectedEvent.name
                }}</strong>
              </div>
              <div>
                <small>触发类型</small
                ><strong>{{ selectedEvent.trigger }}</strong>
              </div>
              <div>
                <small>执行分支</small
                ><strong>{{ selectedEvent.branch || "默认分支" }}</strong>
              </div>
              <div>
                <small>结果投递</small
                ><strong>{{ selectedEvent.delivery || "仅产品内" }}</strong>
              </div>
            </div>
            <small>任务工作目录</small
            ><button
              type="button"
              class="event-detail-path"
              @click="$emit('workspace')"
            >
              自主任务/{{ selectedEvent.id }} <span>在工作空间中打开 ↗</span>
            </button>
          </section>
          <section class="event-detail-card">
            <strong>运行指令</strong>
            <p class="event-instruction">
              {{ selectedEvent.instruction || "根据事件数据分析并输出结论" }}
            </p>
          </section>
          <section class="event-detail-card">
            <div class="event-detail-card-head">
              <strong>运行记录</strong
              ><small>{{ selectedEvent.runs.length }} 次</small>
            </div>
            <div
              v-for="run in selectedEvent.runs"
              :key="run.id"
              class="event-detail-run"
            >
              <span>{{ formatTime(run.at) }}</span
              ><span>{{ run.status === "success" ? "成功" : "运行中" }}</span>
              <p>{{ run.summary }}</p>
            </div>
            <p v-if="!selectedEvent.runs.length" class="muted">暂无运行记录</p>
          </section></template
        ><span slot="footer"
          ><el-button @click="eventDetailVisible = false">关闭</el-button
          ><el-button @click="openEventForm(selectedEvent)">编辑配置</el-button
          ><el-button type="primary" @click="triggerEvent(selectedEvent.id)"
            >模拟触发一次</el-button
          ></span
        ></el-dialog
      ></template
    >
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
  triggerEvent,
} from "../state";
import { publicAsset } from "../public-asset";
import {
  chatIdentity,
  filterImChats,
  groupImChats,
  imChatStats,
} from "../im-chat-model";
import ImChatDetail from "./ImChatDetail.vue";
export default {
  name: "DemoTaskOverview",
  components: { ImChatDetail },
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
      eventKeyword: "",
      eventFormVisible: false,
      eventDetailVisible: false,
      eventEditing: null,
      selectedEvent: null,
      eventDraft: {
        name: "",
        trigger: "Timer",
        branch: "默认分支",
        instruction: "",
        delivery: "仅产品内",
        enabled: true,
      },
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
    filteredChats() {
      return filterImChats(this.chats, {
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
    filteredEvents() {
      const q = this.eventKeyword.toLowerCase();
      return this.events.filter(
        (x) => !q || `${x.name} ${x.id}`.toLowerCase().includes(q),
      );
    },
  },
  methods: {
    chatIdentity,
    persist,
    triggerEvent,
    openEventForm(event = null) {
      this.eventDetailVisible = false;
      this.eventEditing = event;
      this.eventDraft = event
        ? {
            name: event.name,
            trigger: event.trigger,
            branch: event.branch || "默认分支",
            instruction: event.instruction || "根据事件数据分析并输出结论",
            delivery: event.delivery || "仅产品内",
            enabled: event.enabled,
          }
        : {
            name: "",
            trigger: "Timer",
            branch: "默认分支",
            instruction: "",
            delivery: "仅产品内",
            enabled: true,
          };
      this.eventFormVisible = true;
    },
    saveEventForm() {
      if (!this.eventDraft.name.trim() || !this.eventDraft.instruction.trim())
        return this.$message.warning("请填写任务名称和运行指令");
      const patch = {
        ...this.eventDraft,
        updatedAt: new Date().toISOString(),
        sourceName:
          this.eventDraft.trigger === "Timer" ? "每日良率巡检" : "设备异常告警",
      };
      if (this.eventEditing)
        Object.keys(patch).forEach((key) =>
          this.$set(this.eventEditing, key, patch[key]),
        );
      else
        this.state.eventRuns.unshift({
          id: `evt_${Date.now()}`,
          expertId: this.expert.id,
          runs: [],
          ...patch,
        });
      persist();
      this.eventFormVisible = false;
      this.$message.success("专家动作已保存（演示）");
    },
    openEventDetail(event) {
      this.selectedEvent = event;
      this.eventDetailVisible = true;
    },
    eventCommand(command, event) {
      if (command === "edit") this.openEventForm(event);
      else if (command === "toggle") {
        event.enabled = !event.enabled;
        persist();
      } else if (command === "trigger") triggerEvent(event.id);
      else if (command === "delete")
        this.$confirm(`确定删除“${event.name}”？`, "删除专家动作", {
          type: "warning",
          customClass: "manage-message-box task-message-box",
        })
          .then(() => {
            this.state.eventRuns.splice(this.state.eventRuns.indexOf(event), 1);
            persist();
          })
          .catch(() => {});
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
    formatRecent(value) {
      const date = new Date(value);
      const now = new Date();
      const time = date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (date.toDateString() === now.toDateString()) return time;
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return date.toDateString() === yesterday.toDateString()
        ? `昨天 ${time}`
        : `${date.getMonth() + 1}-${date.getDate()} ${time}`;
    },
    channelLogo(platform) {
      return publicAsset(
        `/experts/channel-icons/${{ 企业微信: "wecom", 钉钉: "dingtalk", 飞书: "feishu" }[platform] || "wecom"}.svg`,
      );
    },
    copy(value) {
      navigator.clipboard
        .writeText(value)
        .then(() => this.$message.success("已复制 ID"))
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
  },
};
</script>
