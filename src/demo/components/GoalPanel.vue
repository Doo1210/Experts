<template>
  <div>
    <div class="section-heading">
      <div>
        <h2>项目目标</h2>
        <p>目标拆解为看板任务的演示流程</p>
      </div>
      <el-button type="primary" @click="dialogVisible = true"
        >新建目标</el-button
      >
    </div>
    <div v-for="goal in project.goals" :key="goal.id" class="event-card">
      <div>
        <h3>{{ goal.title }}</h3>
        <p>{{ goal.summary || "尚未发起拆解" }}</p>
      </div>
      <div>
        <el-tag v-if="goal.archived" size="mini" type="info">已归档</el-tag>
        <el-tag
          size="mini"
          :type="goal.status === 'ready' ? 'success' : 'info'"
          >{{ statusName(goal.status) }}</el-tag
        ><el-button
          v-if="goal.status !== 'decomposing'"
          size="small"
          type="primary"
          plain
          :disabled="goal.archived"
          @click="launch(goal)"
          >{{ goal.status === "ready" ? "重新拆解" : "发起拆解" }}</el-button
        ><el-button size="small" @click="archive(goal)">{{
          goal.archived ? "恢复" : "归档"
        }}</el-button>
      </div>
      <div class="event-runs muted">
        目标 ID：{{ goal.id }} · 与专家会话归档相互独立
      </div>
    </div>
    <el-empty v-if="!project.goals.length" description="暂无项目目标" />
    <el-dialog title="新建项目目标" :visible.sync="dialogVisible" width="480px"
      ><el-input
        v-model.trim="title"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="描述希望项目达成的结果"
      /><span slot="footer"
        ><el-button @click="dialogVisible = false">取消</el-button
        ><el-button type="primary" @click="create">创建</el-button></span
      ></el-dialog
    >
  </div>
</template>

<script>
import { addGoal, updateGoal, launchGoal } from "../state";
export default {
  name: "DemoGoalPanel",
  props: { project: { type: Object, required: true } },
  data() {
    return { dialogVisible: false, title: "" };
  },
  methods: {
    statusName(status) {
      return (
        { planned: "待拆解", decomposing: "拆解中", ready: "已完成" }[status] ||
        status
      );
    },
    create() {
      if (!this.title) return this.$message.warning("请输入目标");
      addGoal(this.project.id, this.title);
      this.title = "";
      this.dialogVisible = false;
    },
    launch(goal) {
      this.$confirm("模拟拆解将新增两项看板任务，继续吗？", "发起目标拆解")
        .then(() => {
          launchGoal(this.project.id, goal.id);
          this.$message.success("正在模拟拆解");
        })
        .catch(() => {});
    },
    archive(goal) {
      updateGoal(this.project.id, goal.id, { archived: !goal.archived });
    },
  },
};
</script>
