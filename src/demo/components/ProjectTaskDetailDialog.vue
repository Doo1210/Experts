<template>
  <el-dialog
    :visible="visible"
    width="840px"
    top="5vh"
    custom-class="pd-task-detail-dialog"
    :show-close="false"
    @close="$emit('update:visible', false)"
  >
    <template v-if="task">
      <div class="pd-task-detail-head">
        <button
          type="button"
          class="pd-dialog-close"
          aria-label="关闭"
          @click="$emit('update:visible', false)"
        >
          ×
        </button>
        <h2>{{ task.title }}</h2>
        <div class="pd-task-detail-meta">
          <span>@{{ memberName(task.assigneeId) }}</span
          ><em class="pd-status" :class="'pd-status--' + task.status">{{
            statusName(task)
          }}</em
          ><span
            class="pd-priority"
            :class="'pd-priority--' + (task.priority || 'medium')"
            >{{ priorityName(task.priority) }}</span
          >
        </div>
        <p class="pd-task-detail-summary">
          {{ task.description || "暂无任务说明" }}
        </p>
      </div>
      <div class="pd-task-detail-tabs" role="tablist">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === item.key"
          :class="{ active: activeTab === item.key }"
          @click="activeTab = item.key"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="pd-task-detail-content">
        <template v-if="activeTab === 'detail'">
          <div v-if="task.status === 'paused'" class="pd-task-notice">
            ⓘ 任务已暂停：{{ task.blockedReason || "等待项目成员处理阻塞问题" }}
          </div>
          <div
            v-if="task.predecessorId && predecessor?.status !== 'done'"
            class="pd-task-notice"
          >
            ⓘ 正在等待前置任务「{{
              predecessor?.title || "未知任务"
            }}」完成；完成后将进入可执行状态。
          </div>
          <section>
            <h3>任务说明</h3>
            <div class="pd-task-detail-field">
              {{ task.description || "暂无任务说明" }}
            </div>
          </section>
          <section v-if="predecessor">
            <h3>执行依赖</h3>
            <div class="pd-task-detail-field">
              <span class="muted">前置任务　</span>{{ predecessor.title }}
            </div>
          </section>
          <section v-if="task.status === 'done'">
            <h3>执行结果</h3>
            <div class="pd-task-detail-field">
              {{ task.result || "演示任务已完成" }}
            </div>
          </section>
        </template>
        <template v-else-if="activeTab === 'process'">
          <div class="pd-process-item">
            <i />任务已创建，等待项目成员协作执行
            <time>{{ timeLabel(task.createdAt) }}</time>
          </div>
          <div v-if="task.status !== 'todo'" class="pd-process-item">
            <i />当前状态：{{ statusName(task) }}
          </div>
          <div class="pd-process-note">
            执行过程为本地模拟记录，不连接真实任务服务。
          </div>
        </template>
        <template v-else>
          <div v-if="!(task.comments || []).length" class="pd-comment-empty">
            暂无评论
          </div>
          <div
            v-for="(comment, index) in task.comments || []"
            :key="index"
            class="pd-comment-row"
          >
            <strong>演示用户</strong
            ><time>{{ timeLabel(comment.createdAt) }}</time>
            <p>{{ comment.body }}</p>
          </div>
          <div class="pd-comment-input">
            <el-input
              v-model.trim="commentDraft"
              type="textarea"
              :rows="2"
              placeholder="输入评论（仅保存在演示数据中）"
            /><el-button type="primary" size="small" @click="submitComment"
              >发表评论</el-button
            >
          </div>
        </template>
      </div>
      <div slot="footer" class="pd-task-detail-footer">
        <div>
          <el-button size="mini" @click="$emit('edit', task)">编辑</el-button
          ><el-button size="mini" @click="$emit('transfer', task)"
            >转交</el-button
          ><el-button size="mini" @click="$emit('archive', task)">{{
            task.archived ? "恢复" : "归档"
          }}</el-button
          ><el-button
            size="mini"
            type="text"
            class="pd-danger-link"
            @click="$emit('delete', task)"
            >删除</el-button
          >
        </div>
        <el-dropdown
          trigger="click"
          @command="(status) => $emit('status', task, status)"
          ><el-button type="primary" size="small"
            >更新状态 <i class="el-icon-arrow-down el-icon--right" /></el-button
          ><el-dropdown-menu slot="dropdown"
            ><el-dropdown-item command="todo">待办</el-dropdown-item
            ><el-dropdown-item command="doing">进行中</el-dropdown-item
            ><el-dropdown-item command="paused">暂停</el-dropdown-item
            ><el-dropdown-item command="done"
              >已完成</el-dropdown-item
            ></el-dropdown-menu
          ></el-dropdown
        >
      </div>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: "ProjectTaskDetailDialog",
  props: {
    visible: { type: Boolean, default: false },
    task: { type: Object, default: null },
    tasks: { type: Array, default: () => [] },
    members: { type: Array, default: () => [] },
  },
  data() {
    return {
      activeTab: "detail",
      commentDraft: "",
      tabs: [
        { key: "detail", label: "任务详情" },
        { key: "process", label: "执行过程" },
        { key: "comments", label: "评论" },
      ],
    };
  },
  computed: {
    predecessor() {
      return this.tasks.find((item) => item.id === this.task?.predecessorId);
    },
  },
  watch: {
    visible(value) {
      if (value) {
        this.activeTab = "detail";
        this.commentDraft = "";
      }
    },
  },
  methods: {
    memberName(id) {
      return this.members.find((member) => member.id === id)?.name || "未指派";
    },
    statusName(task) {
      return task.archived
        ? "已归档"
        : {
            todo: "待开始",
            ready: "可执行",
            doing: "执行中",
            paused: "待介入",
            done: "已完成",
          }[task.status] || "待开始";
    },
    priorityName(priority) {
      return { high: "高", medium: "中", low: "低" }[priority] || "中";
    },
    timeLabel(value) {
      return value
        ? new Date(value).toLocaleString("zh-CN", { hour12: false })
        : "演示数据";
    },
    submitComment() {
      if (!this.commentDraft) return;
      this.$emit("comment", this.task, this.commentDraft);
      this.commentDraft = "";
    },
  },
};
</script>
