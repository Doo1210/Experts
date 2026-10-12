<template>
  <el-dialog
    :visible="visible"
    width="720px"
    custom-class="template-intro-dialog"
    append-to-body
    :close-on-click-modal="true"
    @close="$emit('update:visible', false)"
  >
    <div slot="title" class="template-intro-dialog-title">专家详情</div>
    <div v-if="template" class="template-intro-content">
      <div class="template-intro-hero">
        <img
          class="template-intro-avatar"
          :src="avatarSrcForSource(template, experts)"
          :alt="displayName"
        />
        <div class="template-intro-identity">
          <h2>{{ displayName }}</h2>
        </div>
        <el-button
          type="primary"
          class="template-intro-use-btn"
          @click="$emit('use-template', template)"
          >使用模板</el-button
        >
      </div>
      <section class="template-intro-section template-intro-capability">
        <div class="template-intro-capability-block">
          <h3>能力介绍</h3>
          <p>{{ template.description }}</p>
        </div>
        <div class="template-intro-capability-block">
          <h3>擅长领域</h3>
          <div class="template-intro-tags">
            <span
              v-for="(tag, index) in template.tags"
              :key="tag"
              class="template-intro-tag"
              :class="`tag-${index % 3}`"
              >{{ tag }}</span
            >
          </div>
        </div>
      </section>
      <section class="template-intro-section template-intro-skills">
        <h3>内置技能</h3>
        <div v-if="skills.length" class="template-intro-skill-list">
          <div
            v-for="skill in skills"
            :key="skill.id || skill.name"
            class="template-intro-skill-item"
          >
            <strong>{{ skill.name }}：</strong
            ><span>{{ skill.description }}</span>
          </div>
        </div>
        <p v-else>暂无内置技能</p>
      </section>
    </div>
  </el-dialog>
</template>

<script>
import { avatarSrcForSource } from "../avatar";

const SKILL_DESCRIPTIONS = {
  skill_csv: "读取和整理表格数据，辅助形成可核对的分析结论",
  skill_report: "整理资料与结论，生成结构清晰的报告内容",
};

export default {
  name: "TemplateIntroDialog",
  props: {
    visible: { type: Boolean, default: false },
    template: { type: Object, default: null },
    experts: { type: Array, required: true },
  },
  computed: {
    displayName() {
      return this.template ? this.template.name.replace(/模板$/, "") : "";
    },
    skills() {
      if (!this.template) return [];
      if (Array.isArray(this.template.skills)) return this.template.skills;
      const source =
        this.template.snapshot ||
        this.experts.find((item) => item.id === this.template.sourceExpertId);
      return (source?.skills || []).map((skill) => ({
        ...skill,
        description:
          skill.description ||
          SKILL_DESCRIPTIONS[skill.id] ||
          "可在创建专家后查看和配置",
      }));
    },
  },
  methods: { avatarSrcForSource },
};
</script>
