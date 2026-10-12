<template>
  <el-dialog
    :visible="visible"
    width="620px"
    custom-class="pd-form-dialog pd-goal-dialog"
    :close-on-click-modal="false"
    @close="$emit('update:visible', false)"
  >
    <div slot="title" class="pd-dialog-heading">
      <span class="pd-dialog-icon">⊕</span>
      <span
        ><strong>发起目标</strong
        ><small>描述业务目标，系统将自动拆解并分派任务</small></span
      >
    </div>
    <div class="pd-goal-tip">
      <i class="el-icon-lightbulb" />
      清楚描述目标背景、范围和预期结果，有助于系统生成更准确的执行任务。
    </div>
    <div class="pd-form-card">
      <el-form label-position="top" @submit.native.prevent="submit">
        <el-form-item label="目标标题" required>
          <el-input
            v-model.trim="form.title"
            maxlength="100"
            show-word-limit
            placeholder="一句话概括要达成的目标"
          />
        </el-form-item>
        <el-form-item label="目标描述" required>
          <el-input
            v-model.trim="form.description"
            type="textarea"
            :rows="6"
            placeholder="描述目标背景、范围和期望结果"
          />
        </el-form-item>
        <el-form-item label="拆解模型" class="pd-last-field">
          <el-select v-model="form.model"
            ><el-option label="系统默认" value="系统默认"
          /></el-select>
          <small class="pd-field-help"
            >默认使用当前服务配置的拆解模型，仅影响本次目标拆解。本页面仅模拟拆解。</small
          >
        </el-form-item>
      </el-form>
    </div>
    <div slot="footer" class="pd-dialog-actions">
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="submit">发起目标</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: "ProjectGoalDialog",
  props: { visible: { type: Boolean, default: false } },
  data() {
    return { form: { title: "", description: "", model: "系统默认" } };
  },
  watch: {
    visible(value) {
      if (value) this.form = { title: "", description: "", model: "系统默认" };
    },
  },
  methods: {
    submit() {
      if (!this.form.title) return this.$message.warning("请输入目标标题");
      if (!this.form.description)
        return this.$message.warning("请输入目标描述");
      this.$emit("submit", { ...this.form });
    },
  },
};
</script>
