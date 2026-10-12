<template>
  <el-dialog
    :visible="visible"
    width="560px"
    custom-class="pd-form-dialog pd-task-form-dialog"
    :close-on-click-modal="false"
    @close="$emit('update:visible', false)"
  >
    <div slot="title" class="pd-dialog-heading">
      <span class="pd-dialog-icon">☑</span>
      <span
        ><strong>{{ task ? "编辑任务" : "新建任务" }}</strong
        ><small>创建一项具体工作，并安排负责人和执行顺序</small></span
      >
    </div>
    <div class="pd-form-card">
      <el-form label-position="top" @submit.native.prevent="submit">
        <el-form-item label="任务标题" required>
          <el-input
            v-model.trim="form.title"
            maxlength="100"
            placeholder="一句话说明需要完成的工作"
          />
        </el-form-item>
        <el-form-item label="任务说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="补充任务背景、具体要求和验收标准"
          />
        </el-form-item>
        <div class="pd-form-two-col">
          <el-form-item label="负责人" required>
            <el-select
              v-model="form.assigneeId"
              placeholder="选择项目成员"
              filterable
            >
              <el-option
                v-for="member in members"
                :key="member.id"
                :label="member.name"
                :value="member.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="form.priority">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="前置任务" class="pd-last-field">
          <el-select
            v-model="form.predecessorId"
            clearable
            placeholder="可选；该任务完成后，本任务才能开始"
          >
            <el-option
              v-for="item in availableTasks"
              :key="item.id"
              :label="item.title"
              :value="item.id"
            />
          </el-select>
          <small class="pd-field-help"
            >未选择时，任务创建后可直接进入执行队列。</small
          >
        </el-form-item>
      </el-form>
    </div>
    <div slot="footer" class="pd-dialog-actions">
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="submit">{{
        task ? "保存" : "创建"
      }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: "ProjectTaskFormDialog",
  props: {
    visible: { type: Boolean, default: false },
    task: { type: Object, default: null },
    members: { type: Array, default: () => [] },
    tasks: { type: Array, default: () => [] },
    presetAssigneeId: { type: String, default: "" },
  },
  data() {
    return {
      form: {
        title: "",
        description: "",
        assigneeId: "",
        priority: "medium",
        predecessorId: "",
      },
    };
  },
  computed: {
    availableTasks() {
      return this.tasks.filter(
        (item) => item.id !== this.task?.id && !item.archived,
      );
    },
  },
  watch: {
    visible(value) {
      if (value) this.reset();
    },
  },
  methods: {
    reset() {
      this.form = this.task
        ? {
            title: this.task.title,
            description: this.task.description || "",
            assigneeId: this.task.assigneeId || "",
            priority: this.task.priority || "medium",
            predecessorId: this.task.predecessorId || "",
          }
        : {
            title: "",
            description: "",
            assigneeId: this.presetAssigneeId || "",
            priority: "medium",
            predecessorId: "",
          };
    },
    submit() {
      if (!this.form.title) return this.$message.warning("请输入任务标题");
      if (!this.form.assigneeId) return this.$message.warning("请选择负责人");
      this.$emit("submit", { ...this.form });
    },
  },
};
</script>
