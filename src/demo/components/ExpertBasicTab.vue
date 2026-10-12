<template>
  <div class="expert-basic-page">
    <div class="manage-section-head">
      <div>
        <h2>基本信息</h2>
        <p>设置专家的展示资料和默认模型。</p>
      </div>
      <div class="manage-head-actions">
        <span class="save-state" :class="{ dirty }">{{
          dirty ? "有未保存修改" : "已保存"
        }}</span
        ><el-button type="primary" size="small" :disabled="!dirty" @click="save"
          >保存</el-button
        >
      </div>
    </div>
    <div class="manage-section-scroll">
      <section class="manage-card">
        <div class="manage-card-heading">
          <h3>专家资料</h3>
          <p>名称和介绍会展示在专家列表中。</p>
        </div>
        <div class="basic-info-grid">
          <div class="basic-avatar-field">
            <strong>专家头像</strong
            ><button
              class="basic-avatar-picker"
              type="button"
              title="更换专家头像"
              @click="$refs.avatarInput.click()"
            >
              <img
                :src="publicAsset(draft.avatarUrl)"
                alt="专家头像预览"
              /><span>更换头像</span></button
            ><input
              ref="avatarInput"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              hidden
              @change="uploadAvatar"
            />
            <div
              class="basic-avatar-presets"
              role="group"
              aria-label="可选头像"
            >
              <button
                v-for="preset in avatarPresets"
                :key="preset.id"
                type="button"
                :class="{ selected: draft.avatarUrl === preset.src }"
                :title="preset.label"
                :aria-label="preset.label"
                :aria-pressed="draft.avatarUrl === preset.src"
                @click="draft.avatarUrl = preset.src"
              >
                <img :src="publicAsset(preset.src)" :alt="preset.label" />
              </button>
            </div>
            <small>支持 JPG、PNG，最大 2MB</small>
          </div>
          <el-form
            label-position="top"
            class="basic-fields"
            @submit.native.prevent="save"
            ><el-form-item label="专家名称" required
              ><el-input
                v-model.trim="draft.name"
                maxlength="60"
                placeholder="请输入专家名称" /></el-form-item
            ><el-form-item label="专家介绍" required
              ><el-input
                v-model.trim="draft.description"
                type="textarea"
                :rows="8"
                placeholder="简要描述专家能提供的帮助" /></el-form-item
          ></el-form>
        </div>
      </section>
      <section class="manage-card">
        <div class="manage-card-heading">
          <h3>默认模型</h3>
          <p>对话任务未指定模型时使用此模型。</p>
        </div>
        <el-select
          v-model="draft.model"
          filterable
          class="basic-model-select"
          placeholder="搜索或选择默认模型"
          ><el-option
            v-for="model in models"
            :key="model"
            :label="model"
            :value="model"
        /></el-select>
      </section>
    </div>
  </div>
</template>

<script>
import { updateExpert } from "../state";
import { publicAsset } from "../public-asset";

const AVATAR_NAMES = [
  "general-man",
  "general-woman",
  "process-man",
  "process-woman",
  "algorithm-man",
  "algorithm-woman",
  "operations-man",
  "operations-woman",
  "quality-man",
  "quality-woman",
  "supply-woman",
  "safety-man",
  "safety-woman",
  "energy-man",
  "digital-woman",
];
const AVATAR_LABELS = [
  "通用专家 · 男",
  "通用专家 · 女",
  "工艺专家 · 男",
  "工艺专家 · 女",
  "算法专家 · 男",
  "算法专家 · 女",
  "运维专家 · 男",
  "运维专家 · 女",
  "质量专家 · 男",
  "质量专家 · 女",
  "供应链专家 · 女",
  "安全专家 · 男",
  "安全专家 · 女",
  "能源专家 · 男",
  "数字化顾问 · 女",
];
const avatarFor = (expert) =>
  expert.avatarUrl ||
  (expert.id === "exp_quality"
    ? "/experts/avatars/quality-man.svg"
    : expert.id === "exp_ops"
      ? "/experts/avatars/operations-woman.svg"
      : "/experts/avatars/general-man.svg");

export default {
  name: "ExpertBasicTab",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      draft: { name: "", description: "", model: "", avatarUrl: "" },
      avatarPresets: AVATAR_NAMES.map((id, index) => ({
        id,
        label: AVATAR_LABELS[index],
        src: `/experts/avatars/${id}.svg`,
      })),
      models: ["通用大模型", "推理模型", "视觉模型"],
    };
  },
  computed: {
    dirty() {
      return (
        this.draft.name !== this.expert.name ||
        this.draft.description !== this.expert.description ||
        this.draft.model !== this.expert.model ||
        this.draft.avatarUrl !== avatarFor(this.expert)
      );
    },
  },
  created() {
    this.load();
  },
  watch: {
    "expert.id"() {
      this.load();
    },
  },
  methods: {
    publicAsset,
    load() {
      this.draft = {
        name: this.expert.name || "",
        description: this.expert.description || "",
        model: this.expert.model || "",
        avatarUrl: avatarFor(this.expert),
      };
    },
    save() {
      if (!this.draft.name) return this.$message.warning("请填写专家名称");
      if (!this.draft.description)
        return this.$message.warning("请填写专家介绍");
      if (!this.draft.model) return this.$message.warning("请选择默认模型");
      updateExpert(this.expert.id, {
        ...this.draft,
        avatar: this.draft.name.slice(0, 1),
      });
      this.$message.success("基本信息已保存（演示）");
    },
    uploadAvatar(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        this.$message.warning("头像文件不能超过 2MB");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.draft.avatarUrl = String(reader.result || "");
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
  },
};
</script>
