<template>
  <el-dialog
    :visible="visible"
    width="640px"
    :custom-class="`project-list-dialog project-list-dialog--${mode}${isCreate && step === 1 ? ' project-list-dialog--members' : ''}`"
    :close-on-click-modal="false"
    @close="$emit('update:visible', false)"
  >
    <div slot="title" class="project-list-dialog-header">
      <span class="project-list-dialog-header-icon"
        ><img
          v-if="isProjectImageIcon(form.icon)"
          :src="form.icon"
          alt=""
        /><span v-else>{{ projectIconLabel(form.icon) }}</span></span
      >
      <span class="project-list-dialog-header-copy"
        ><strong>{{ isCreate ? "新建项目" : "编辑项目" }}</strong
        ><small>{{
          isCreate ? "分步配置项目信息与协作成员" : "修改项目信息与图标"
        }}</small></span
      >
    </div>

    <div class="project-list-dialog-content">
      <nav v-if="isCreate" class="project-wizard-steps" aria-label="创建步骤">
        <div
          v-for="(title, index) in ['项目信息', '项目成员']"
          :key="title"
          class="project-wizard-step"
          :class="{ active: step === index, done: step > index }"
        >
          <span class="project-wizard-index">{{
            step > index ? "✓" : index + 1
          }}</span
          >{{ title }}
        </div>
      </nav>

      <div v-if="!isCreate || step === 0" class="project-list-info-grid">
        <div class="project-list-icon-column">
          <button
            type="button"
            class="project-list-icon-upload"
            @click="$refs.iconInput.click()"
          >
            <span class="project-list-icon-preview"
              ><img
                v-if="isProjectImageIcon(form.icon)"
                :src="form.icon"
                alt="项目图标"
              /><span v-else>{{ projectIconLabel(form.icon) }}</span></span
            ><small>点击上传图片</small>
          </button>
          <input
            ref="iconInput"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            hidden
            @change="uploadIcon"
          />
          <div class="project-list-icon-presets" aria-label="可选项目图标">
            <button
              v-for="icon in iconPresets"
              :key="icon"
              type="button"
              :class="{ selected: form.icon === icon }"
              :aria-label="`选择图标 ${icon}`"
              :aria-pressed="form.icon === icon"
              @click="form.icon = icon"
            >
              {{ icon }}
            </button>
          </div>
        </div>
        <el-form
          class="project-list-basic-form"
          label-position="top"
          @submit.native.prevent="submit"
        >
          <el-form-item label="项目名称" required
            ><el-input
              v-model.trim="form.name"
              maxlength="50"
              placeholder="如：12寸产线良率提升项目"
          /></el-form-item>
          <el-form-item label="项目描述" required
            ><el-input
              v-model.trim="form.description"
              type="textarea"
              :rows="4"
              maxlength="240"
              placeholder="简要描述项目目标与背景"
          /></el-form-item>
        </el-form>
      </div>

      <div v-if="isCreate && step === 1" class="project-member-step">
        <div class="project-member-toolbar">
          <el-input
            v-model="memberSearch"
            clearable
            prefix-icon="el-icon-search"
            placeholder="搜索专家名称、介绍或擅长领域"
          /><span>{{ form.memberIds.length }} 人已选</span>
        </div>
        <div v-if="filteredExperts.length" class="project-member-grid">
          <button
            v-for="expert in filteredExperts"
            :key="expert.id"
            type="button"
            class="project-member-card"
            :class="{ selected: form.memberIds.includes(expert.id) }"
            @click="toggleMember(expert.id)"
          >
            <img :src="expertAvatarUrl(expert)" :alt="expert.name" /><span
              class="project-member-copy"
              ><strong>{{ expert.name }}</strong
              ><small>{{ expert.description || "暂无介绍" }}</small
              ><span class="project-member-tags"
                ><em
                  v-for="tag in (expert.tags || []).slice(0, 3)"
                  :key="tag"
                  >{{ tag }}</em
                ></span
              ></span
            ><span class="project-member-check">{{
              form.memberIds.includes(expert.id) ? "✓" : ""
            }}</span>
          </button>
        </div>
        <el-empty v-else description="未找到匹配的专家" :image-size="72" />
      </div>
    </div>

    <div slot="footer" class="project-list-dialog-footer">
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button v-if="isCreate && step === 1" @click="step = 0"
        >上一步</el-button
      >
      <el-button v-if="isCreate && step === 0" type="primary" @click="next"
        >下一步</el-button
      >
      <el-button v-else type="primary" @click="submit">{{
        isCreate ? "创建项目" : "保存"
      }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  expertAvatarUrl,
  isProjectImageIcon,
  projectIconLabel,
} from "../avatar";

export default {
  name: "ProjectFormDialog",
  props: {
    visible: { type: Boolean, default: false },
    mode: { type: String, default: "create" },
    project: { type: Object, default: null },
    experts: { type: Array, required: true },
  },
  data() {
    return {
      step: 0,
      memberSearch: "",
      form: { name: "", description: "", icon: "📁", memberIds: [] },
      iconPresets: ["📁", "🏭", "📊", "🔧", "⚙️", "🎯", "📋", "🚀", "💡", "🔬"],
    };
  },
  computed: {
    isCreate() {
      return this.mode === "create";
    },
    filteredExperts() {
      const query = this.memberSearch.trim().toLowerCase();
      return this.experts.filter(
        (expert) =>
          !query ||
          `${expert.name} ${expert.description} ${(expert.tags || []).join(" ")}`
            .toLowerCase()
            .includes(query),
      );
    },
  },
  watch: {
    visible(value) {
      if (value) this.reset();
    },
  },
  methods: {
    expertAvatarUrl,
    isProjectImageIcon,
    projectIconLabel,
    reset() {
      this.step = 0;
      this.memberSearch = "";
      this.form =
        this.project && !this.isCreate
          ? {
              name: this.project.name,
              description: this.project.description,
              icon: this.project.icon || "📁",
              memberIds: (this.project.members || []).slice(),
            }
          : { name: "", description: "", icon: "📁", memberIds: [] };
    },
    uploadIcon(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        this.$message.warning("图片不能超过 1 MB");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.form.icon = String(reader.result || "");
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    toggleMember(id) {
      const index = this.form.memberIds.indexOf(id);
      if (index >= 0) this.form.memberIds.splice(index, 1);
      else this.form.memberIds.push(id);
    },
    validInfo() {
      if (!this.form.name.trim()) {
        this.$message.warning("请填写项目名称");
        return false;
      }
      if (!this.form.description.trim()) {
        this.$message.warning("请填写项目描述");
        return false;
      }
      return true;
    },
    next() {
      if (this.validInfo()) this.step = 1;
    },
    submit() {
      if (!this.validInfo()) return;
      this.$emit("submit", {
        ...this.form,
        memberIds: this.form.memberIds.slice(),
      });
    },
  },
};
</script>
