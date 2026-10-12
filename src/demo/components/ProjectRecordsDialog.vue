<template>
  <el-dialog
    :visible="visible"
    width="960px"
    top="8vh"
    custom-class="pd-records-dialog"
    @close="$emit('update:visible', false)"
  >
    <div slot="title" class="pd-records-heading">
      <i class="el-icon-document" /><strong>发起记录</strong
      ><em>{{ goals.length }} 条</em>
    </div>
    <div class="pd-records-layout">
      <div class="pd-records-list">
        <h3>全部记录</h3>
        <button
          v-for="goal in sortedGoals"
          :key="goal.id"
          type="button"
          :class="{ selected: selectedId === goal.id }"
          @click="selectedId = goal.id"
        >
          <span
            class="pd-record-icon"
            :class="'pd-record-icon--' + goal.status"
            >{{
              goal.status === "ready"
                ? "✓"
                : goal.status === "decomposing"
                  ? "◌"
                  : "○"
            }}</span
          ><span
            ><strong>{{ goal.title }}</strong
            ><small
              >{{ timeLabel(goal.createdAt) }} ·
              {{ statusName(goal.status) }}</small
            ></span
          ><em>{{ statusName(goal.status) }}</em>
        </button>
        <div v-if="!goals.length" class="pd-records-empty">暂无发起记录</div>
      </div>
      <div class="pd-records-detail" v-if="selectedGoal">
        <h2>{{ selectedGoal.title }}</h2>
        <div class="pd-records-meta">
          <em>{{ statusName(selectedGoal.status) }}</em
          ><time>{{ timeLabel(selectedGoal.createdAt) }}</time>
        </div>
        <section>
          <h3>目标描述</h3>
          <div class="pd-records-box">
            {{
              selectedGoal.description ||
              selectedGoal.summary ||
              selectedGoal.title
            }}
          </div>
        </section>
        <section>
          <h3>目标结果</h3>
          <div class="pd-records-box">
            {{
              selectedGoal.summary ||
              (selectedGoal.status === "decomposing"
                ? "正在模拟拆解任务…"
                : "尚未生成任务")
            }}
          </div>
        </section>
        <section v-if="generatedTasks.length">
          <h3>拆解出的任务</h3>
          <div
            v-for="task in generatedTasks"
            :key="task.id"
            class="pd-record-task"
          >
            ☑ {{ task.title }}
          </div>
        </section>
        <el-button
          v-if="selectedGoal.status !== 'decomposing' && !selectedGoal.archived"
          type="primary"
          size="small"
          @click="$emit('retry', selectedGoal)"
          >{{
            selectedGoal.status === "planned" ? "模拟拆解" : "重新模拟拆解"
          }}</el-button
        >
      </div>
      <div v-else class="pd-records-detail pd-records-empty">
        选择一条记录查看详情
      </div>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: "ProjectRecordsDialog",
  props: {
    visible: { type: Boolean, default: false },
    goals: { type: Array, default: () => [] },
    tasks: { type: Array, default: () => [] },
  },
  data() {
    return { selectedId: "" };
  },
  computed: {
    sortedGoals() {
      return this.goals.slice().reverse();
    },
    selectedGoal() {
      return (
        this.goals.find((goal) => goal.id === this.selectedId) ||
        this.sortedGoals[0]
      );
    },
    generatedTasks() {
      return this.tasks.filter((task) =>
        (this.selectedGoal?.generatedTaskIds || []).includes(task.id),
      );
    },
  },
  watch: {
    visible(value) {
      if (value) this.selectedId = this.sortedGoals[0]?.id || "";
    },
  },
  methods: {
    statusName(status) {
      return (
        {
          planned: "待拆解",
          decomposing: "拆解中",
          ready: "已完成",
          failed: "拆解失败",
        }[status] || status
      );
    },
    timeLabel(value) {
      return value
        ? new Date(value).toLocaleString("zh-CN", { hour12: false })
        : "演示数据";
    },
  },
};
</script>
