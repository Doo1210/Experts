<template>
  <el-dialog
    :visible="visible"
    width="760px"
    custom-class="create-expert-dialog"
    :close-on-click-modal="false"
    :before-close="attemptClose"
    @close="$emit('update:visible', false)"
    @closed="$emit('closed')"
  >
    <div slot="title" class="create-expert-header">
      <strong>新建专家</strong>
      <span>选择创建方式，确认专家基本信息与默认模型配置</span>
    </div>

    <div class="create-expert-content">
      <section class="create-expert-panel create-mode-section">
        <h3>创建方式</h3>
        <div
          class="create-mode-options"
          role="radiogroup"
          aria-label="创建方式"
        >
          <button
            v-for="mode in modes"
            :key="mode.key"
            type="button"
            role="radio"
            class="create-mode-card"
            :class="{ 'is-selected': sourceMode === mode.key }"
            :aria-checked="sourceMode === mode.key"
            @click="setMode(mode.key)"
          >
            <i :class="mode.icon" aria-hidden="true" />
            <span>{{ mode.label }}</span>
          </button>
        </div>
        <div v-if="sourceMode !== 'blank'" class="create-source-row">
          <label
            >{{ sourceMode === "template" ? "选择专家模板" : "选择已有专家"
            }}<b>*</b></label
          >
          <el-select
            v-model="sourceId"
            class="create-source-select"
            filterable
            popper-class="create-source-select-popper"
            :placeholder="
              sourceMode === 'template' ? '请选择专家模板' : '请选择已有专家'
            "
            @change="fillFromSource"
          >
            <el-option
              v-for="source in sourceOptions"
              :key="source.id"
              :label="source.name"
              :value="source.id"
            >
              <div class="create-source-option">
                <img :src="sourceAvatar(source)" alt="" /><span
                  ><strong>{{ source.name }}</strong
                  ><small>{{ source.description }}</small></span
                >
              </div>
            </el-option>
          </el-select>
        </div>
      </section>

      <section
        class="create-expert-panel create-basic-section"
        :class="{ 'is-disabled': fieldsDisabled }"
      >
        <h3>专家基本信息</h3>
        <div class="create-basic-layout">
          <div class="create-avatar-column">
            <button
              type="button"
              class="create-avatar-main"
              :disabled="fieldsDisabled"
              title="更换头像"
              @click="$refs.avatarInput.click()"
            >
              <img :src="publicAsset(form.avatarUrl)" alt="头像预览" />
              <span class="create-avatar-overlay">更换头像</span>
            </button>
            <input
              ref="avatarInput"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              hidden
              @change="uploadAvatar"
            />
            <div
              class="create-avatar-presets"
              role="group"
              aria-label="可选头像"
            >
              <button
                v-for="preset in avatarPresets"
                :key="preset.id"
                type="button"
                class="create-avatar-preset"
                :class="{ 'is-selected': form.avatarUrl === preset.src }"
                :aria-label="preset.label"
                :aria-pressed="form.avatarUrl === preset.src"
                :title="preset.label"
                :disabled="fieldsDisabled"
                @click="form.avatarUrl = preset.src"
              >
                <img :src="publicAsset(preset.src)" :alt="preset.label" />
              </button>
            </div>
          </div>
          <el-form
            class="create-basic-form"
            label-position="top"
            @submit.native.prevent="submit"
          >
            <el-form-item label="专家名称" required
              ><el-input
                v-model.trim="form.name"
                :disabled="fieldsDisabled"
                maxlength="32"
                placeholder="如：首席工艺专家"
            /></el-form-item>
            <el-form-item label="专家介绍" required
              ><el-input
                v-model.trim="form.description"
                :disabled="fieldsDisabled"
                type="textarea"
                :rows="6"
                maxlength="200"
                placeholder="简要描述专家定位、能力与使用场景"
            /></el-form-item>
          </el-form>
        </div>
      </section>

      <section
        class="create-expert-panel create-model-section"
        :class="{ 'is-disabled': fieldsDisabled }"
      >
        <h3>默认模型配置</h3>
        <el-select
          v-model="form.model"
          filterable
          class="create-model-select"
          :disabled="fieldsDisabled"
          placeholder="搜索或选择默认模型"
        >
          <el-option
            v-for="model in models"
            :key="model"
            :label="model"
            :value="model"
          />
        </el-select>
      </section>
    </div>

    <div slot="footer" class="create-expert-footer">
      <el-button @click="attemptClose">取消</el-button>
      <el-button type="primary" @click="submit">创建并进入</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { DEFAULT_AVATAR, avatarSrcForSource } from "../avatar";
import { publicAsset } from "../public-asset";

const AVATAR_SPECS = [
  ["general-man", "通用专家 · 男"],
  ["general-woman", "通用专家 · 女"],
  ["process-man", "工艺专家 · 男"],
  ["process-woman", "工艺专家 · 女"],
  ["algorithm-man", "算法专家 · 男"],
  ["algorithm-woman", "算法专家 · 女"],
  ["operations-man", "运维专家 · 男"],
  ["operations-woman", "运维专家 · 女"],
  ["quality-man", "质量专家 · 男"],
  ["quality-woman", "质量专家 · 女"],
  ["supply-woman", "供应链专家 · 女"],
  ["safety-man", "安全专家 · 男"],
  ["safety-woman", "安全专家 · 女"],
  ["energy-man", "能源专家 · 男"],
  ["digital-woman", "数字化顾问 · 女"],
];
export default {
  name: "CreateExpertDialog",
  props: {
    visible: { type: Boolean, default: false },
    templates: { type: Array, required: true },
    experts: { type: Array, required: true },
    presetTemplateId: { type: String, default: "" },
  },
  data() {
    return {
      sourceMode: "blank",
      sourceId: "",
      form: { name: "", description: "", model: "", avatarUrl: DEFAULT_AVATAR },
      modes: [
        { key: "blank", label: "从零开始", icon: "el-icon-plus" },
        { key: "template", label: "复制专家模板", icon: "el-icon-document" },
        { key: "existing", label: "复制已有专家", icon: "el-icon-user" },
      ],
      avatarPresets: AVATAR_SPECS.map(([id, label]) => ({
        id,
        label,
        src: `/experts/avatars/${id}.svg`,
      })),
      models: ["通用大模型", "推理模型", "视觉模型"],
    };
  },
  computed: {
    fieldsDisabled() {
      return this.sourceMode !== "blank" && !this.sourceId;
    },
    sourceOptions() {
      return this.sourceMode === "template"
        ? this.templates
        : this.sourceMode === "existing"
          ? this.experts
          : [];
    },
  },
  watch: {
    visible(value) {
      if (!value) return;
      this.reset();
      if (this.presetTemplateId) {
        this.sourceMode = "template";
        this.sourceId = this.presetTemplateId;
        this.fillFromSource();
      }
    },
  },
  methods: {
    publicAsset,
    reset() {
      this.sourceMode = "blank";
      this.sourceId = "";
      this.form = {
        name: "",
        description: "",
        model: "",
        avatarUrl: DEFAULT_AVATAR,
      };
    },
    setMode(mode) {
      if (this.sourceMode === mode) return;
      this.sourceMode = mode;
      this.sourceId = "";
      this.form = {
        name: "",
        description: "",
        model: "",
        avatarUrl: DEFAULT_AVATAR,
      };
    },
    sourceAvatar(source) {
      return avatarSrcForSource(source, this.experts);
    },
    fillFromSource() {
      const selected = this.sourceOptions.find(
        (item) => item.id === this.sourceId,
      );
      if (!selected) return;
      if (this.sourceMode === "template") {
        this.form.name = selected.name.replace(/模板$/, "");
        this.form.description = selected.description || "";
        this.form.model = "";
        this.form.avatarUrl = this.sourceAvatar(selected);
      } else {
        this.form.name = `${selected.name} 副本`;
        this.form.description = selected.description || "";
        this.form.model = selected.model || "";
        this.form.avatarUrl = this.sourceAvatar(selected);
      }
    },
    uploadAvatar(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        this.$message.warning("头像文件不能超过 1 MB");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.form.avatarUrl = String(reader.result || "");
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    attemptClose() {
      const changed =
        this.form.name ||
        this.form.description ||
        this.form.avatarUrl !== DEFAULT_AVATAR;
      if (!changed) {
        this.$emit("update:visible", false);
        return;
      }
      this.$confirm("当前表单内容将被丢弃，确定放弃吗？", "放弃当前填写？", {
        confirmButtonText: "放弃",
        cancelButtonText: "继续编辑",
        type: "warning",
      })
        .then(() => this.$emit("update:visible", false))
        .catch(() => {});
    },
    submit() {
      if (this.fieldsDisabled)
        return this.$message.warning(
          `请选择${this.sourceMode === "template" ? "专家模板" : "已有专家"}`,
        );
      if (!this.form.name) return this.$message.warning("请填写专家名称");
      if (this.form.name.length > 32)
        return this.$message.warning("专家名称最多 32 个字符");
      if (!this.form.description)
        return this.$message.warning("请填写专家介绍");
      if (this.form.description.length > 200)
        return this.$message.warning("专家介绍最多 200 个字符");
      if (!this.form.model) return this.$message.warning("请选择默认模型");
      this.$emit("submit", {
        form: { ...this.form },
        templateId: this.sourceMode === "template" ? this.sourceId : "",
        copyExpertId: this.sourceMode === "existing" ? this.sourceId : "",
      });
    },
  },
};
</script>
