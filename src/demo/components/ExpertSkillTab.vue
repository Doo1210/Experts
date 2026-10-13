<template>
  <div class="expert-skill-page">
    <div class="section-heading">
      <div>
        <h2>技能</h2>
        <p>查看技能来源、管理启停与习得方式。配置变更在新会话生效。</p>
      </div>
    </div>
    <div class="setting-line skill-learning-line">
      <div>
        <strong>主动学习技能</strong
        ><span>允许专家在对话和后台复盘中主动沉淀经验。</span>
      </div>
      <el-switch v-model="expert.learningEnabled" @change="persist" />
    </div>
    <div class="skill-action-bar">
      <strong
        >已安装 {{ expert.skills.length }} 项 · 已启用
        {{ enabledCount }} 项</strong
      >
      <div class="skill-action-controls">
        <el-input
          v-model="search"
          size="small"
          clearable
          placeholder="搜索技能"
        /><el-select v-model="enabledFilter" size="small"
          ><el-option label="全部" value="all" /><el-option
            label="仅已启用"
            value="enabled" /><el-option
            label="仅已禁用"
            value="disabled" /></el-select
        ><el-select v-model="sourceFilter" size="small"
          ><el-option label="全部来源" value="all" /><el-option
            v-for="source in sources"
            :key="source"
            :label="source"
            :value="source" /></el-select
        ><el-button type="primary" size="small" @click="openImport"
          >从平台导入</el-button
        ><el-button size="small" @click="$refs.skillUpload.click()"
          >本地上传</el-button
        >
      </div>
    </div>
    <input
      ref="skillUpload"
      type="file"
      accept=".zip,.md,.json,.skill"
      hidden
      @change="uploadSkill"
    />
    <div class="skill-card-scroll">
      <div class="skill-card-grid">
        <div
          v-for="item in visibleSkills"
          :key="item.id"
          class="skill-card"
          role="button"
          tabindex="0"
          :aria-label="`查看${item.name}详情`"
          @click="openDetail(item)"
          @keydown.enter.self.prevent="openDetail(item)"
          @keydown.space.self.prevent="openDetail(item)"
        >
          <div class="skill-card-top">
            <strong>{{ item.name }}</strong
            ><el-switch
              v-model="item.enabled"
              @click.native.stop
              @change="persist"
            />
          </div>
          <p>{{ description(item) }}</p>
          <div class="skill-card-foot">
            <span>{{ sourceLabel(item.source) }}</span
            ><el-dropdown
              trigger="click"
              @click.native.stop
              @command="(command) => skillCommand(command, item)"
              ><button
                type="button"
                class="skill-card-more"
                :aria-label="`更多操作：${item.name}`"
              >
                ···</button
              ><el-dropdown-menu slot="dropdown"
                ><el-dropdown-item command="remove"
                  >卸载技能</el-dropdown-item
                ></el-dropdown-menu
              ></el-dropdown
            >
          </div>
        </div>
      </div>
      <el-empty v-if="!visibleSkills.length" description="暂无匹配技能" />
    </div>
    <el-dialog
      title="从平台导入技能"
      :visible.sync="importVisible"
      width="640px"
      custom-class="manage-dialog skill-import-dialog"
      :close-on-click-modal="false"
      ><div slot="title" class="skill-dialog-title">
        <span class="skill-dialog-icon">✦</span
        ><span
          ><strong>从平台导入技能</strong
          ><small>从我发布的、我添加的或内置技能库导入到当前专家</small></span
        >
      </div>
      <div class="skill-import-tabs">
        <button
          v-for="tab in importTabs"
          :key="tab.key"
          type="button"
          :class="{ active: importTab === tab.key }"
          @click="importTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="skill-import-list">
        <div class="skill-import-head">技能</div>
        <label
          v-for="candidate in visibleCandidates"
          :key="candidate.id"
          class="skill-import-row"
          ><el-checkbox
            :value="selectedImports.includes(candidate.id)"
            @change="toggleImport(candidate.id)"
          /><span class="skill-import-icon">✦</span
          ><strong>{{ candidate.name }}</strong></label
        ><el-empty
          v-if="!visibleCandidates.length"
          description="暂无可导入技能"
        />
      </div>
      <span slot="footer"
        ><span
          >已选择 <strong>{{ selectedImports.length }}</strong> 个技能</span
        ><el-button @click="importVisible = false">取消</el-button
        ><el-button
          type="primary"
          :disabled="!selectedImports.length"
          @click="importSkills"
          >导入</el-button
        ></span
      ></el-dialog
    >
    <el-dialog
      :visible.sync="detailVisible"
      width="900px"
      custom-class="manage-dialog skill-detail-dialog"
      ><div v-if="selectedSkill" slot="title" class="skill-detail-head">
        <span class="skill-dialog-icon">✦</span>
        <div class="skill-detail-copy">
          <div class="skill-detail-heading">
            <strong>{{ selectedSkill.name }}</strong>
            <em>{{ sourceLabel(selectedSkill.source) }}</em>
            <em>{{ selectedSkill.enabled ? "已启用" : "已停用" }}</em>
          </div>
          <small>{{ description(selectedSkill) }}</small>
        </div>
      </div>
      <div v-if="selectedSkill" class="skill-detail-body">
        <aside class="skill-file-tree" aria-label="技能包文件">
          <strong>技能包文件</strong>
          <button
            type="button"
            class="skill-file-entry"
            :class="{ active: detailFile === 'SKILL.md' }"
            @click="detailFile = 'SKILL.md'"
          >
            <i class="el-icon-document" aria-hidden="true" />SKILL.md
          </button>
          <button
            type="button"
            class="skill-folder-entry"
            :aria-expanded="foldersOpen.references"
            @click="foldersOpen.references = !foldersOpen.references"
          >
            <i
              :class="
                foldersOpen.references
                  ? 'el-icon-caret-bottom'
                  : 'el-icon-caret-right'
              "
              aria-hidden="true"
            />
            <i class="el-icon-folder" aria-hidden="true" />references/
          </button>
          <button
            v-if="foldersOpen.references"
            type="button"
            class="skill-file-entry nested"
            :class="{ active: detailFile === '使用说明.md' }"
            @click="detailFile = '使用说明.md'"
          >
            <i class="el-icon-document" aria-hidden="true" />使用说明.md
          </button>
          <button
            type="button"
            class="skill-folder-entry"
            :aria-expanded="foldersOpen.templates"
            @click="foldersOpen.templates = !foldersOpen.templates"
          >
            <i
              :class="
                foldersOpen.templates
                  ? 'el-icon-caret-bottom'
                  : 'el-icon-caret-right'
              "
              aria-hidden="true"
            />
            <i class="el-icon-folder" aria-hidden="true" />templates/
          </button>
          <button
            v-if="foldersOpen.templates"
            type="button"
            class="skill-file-entry nested"
            :class="{ active: detailFile === '模板说明.md' }"
            @click="detailFile = '模板说明.md'"
          >
            <i class="el-icon-document" aria-hidden="true" />模板说明.md
          </button>
        </aside>
        <div>
          <strong>{{ detailFile }}</strong>
          <pre>{{ detailContent }}</pre>
        </div>
      </div>
      <span slot="footer"
        ><el-button @click="detailVisible = false">关闭</el-button></span
      ></el-dialog
    >
  </div>
</template>

<script>
import { persist } from "../state";
import { saveFile } from "../file-db";

const CANDIDATES = [
  {
    id: "mes-connector",
    name: "MES 连接器",
    group: "published",
    description: "连接 MES 数据与工单",
  },
  {
    id: "spc-dashboard",
    name: "SPC 看板",
    group: "published",
    description: "控制图与过程能力可视化",
  },
  {
    id: "workorder-assist",
    name: "工单助手",
    group: "published",
    description: "整理工单和处理记录",
  },
  {
    id: "shift-handover",
    name: "交接班纪要",
    group: "published",
    description: "生成交接班纪要",
  },
  {
    id: "tooling-life",
    name: "刀具寿命预测",
    group: "published",
    description: "预测刀具磨损与维护时机",
  },
  {
    id: "andon-router",
    name: "安灯路由",
    group: "published",
    description: "异常告警分发",
  },
  {
    id: "recipe-diff",
    name: "配方差异比对",
    group: "added",
    description: "比对配方参数变化",
  },
  {
    id: "oee-brief",
    name: "OEE 简报",
    group: "added",
    description: "生成设备效率简报",
  },
  {
    id: "fixture-checker",
    name: "夹具点检",
    group: "added",
    description: "夹具点检记录",
  },
  {
    id: "lot-trace",
    name: "批次追溯",
    group: "builtin",
    description: "生产批次追溯",
  },
  {
    id: "changeover-plan",
    name: "换型计划",
    group: "builtin",
    description: "制定换型执行计划",
  },
  {
    id: "alarm-digest",
    name: "告警摘要",
    group: "builtin",
    description: "聚合告警并给出摘要",
  },
];
const DESCRIPTIONS = {
  表格分析: "产线表格统计、异常对比与数据分析",
  报告撰写: "根据任务过程整理结构化分析报告",
};

export default {
  name: "ExpertSkillTab",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      search: "",
      enabledFilter: "all",
      sourceFilter: "all",
      sources: ["从平台导入", "本地上传", "对话习得", "复制专家"],
      importVisible: false,
      importTab: "published",
      selectedImports: [],
      importTabs: [
        { key: "published", label: "我发布的" },
        { key: "added", label: "我添加的" },
        { key: "builtin", label: "内置" },
      ],
      detailVisible: false,
      selectedSkill: null,
      detailFile: "SKILL.md",
      foldersOpen: { references: true, templates: false },
    };
  },
  computed: {
    enabledCount() {
      return this.expert.skills.filter((item) => item.enabled).length;
    },
    visibleSkills() {
      const q = this.search.trim().toLowerCase();
      return this.expert.skills.filter(
        (item) =>
          (!q ||
            `${item.name} ${this.description(item)}`
              .toLowerCase()
              .includes(q)) &&
          (this.enabledFilter === "all" ||
            item.enabled === (this.enabledFilter === "enabled")) &&
          (this.sourceFilter === "all" ||
            this.sourceLabel(item.source) === this.sourceFilter),
      );
    },
    visibleCandidates() {
      return CANDIDATES.filter(
        (item) =>
          item.group === this.importTab &&
          !this.expert.skills.some((skill) => skill.id === `skill_${item.id}`),
      );
    },
    detailContent() {
      if (!this.selectedSkill) return "";
      const title = this.selectedSkill.name;
      const description = this.description(this.selectedSkill);
      return this.detailFile === "SKILL.md"
        ? `---\nname: ${title}\ndescription: ${description}\n---\n\n# ${title}\n\n${description}`
        : `# ${this.detailFile}\n\n${description}\n\n此文件为浏览器本地演示内容。`;
    },
  },
  methods: {
    persist,
    description(item) {
      return (
        item.description ||
        DESCRIPTIONS[item.name] ||
        "辅助专家完成当前岗位内的工作"
      );
    },
    sourceLabel(source) {
      return (
        {
          平台导入: "从平台导入",
          内置: "从平台导入",
          主动学习: "对话习得",
          习得: "对话习得",
          专家模板: "复制专家",
        }[source] || source
      );
    },
    openImport() {
      this.selectedImports = [];
      this.importTab = "published";
      this.importVisible = true;
    },
    toggleImport(id) {
      this.selectedImports = this.selectedImports.includes(id)
        ? this.selectedImports.filter((value) => value !== id)
        : [...this.selectedImports, id];
    },
    importSkills() {
      for (const id of this.selectedImports) {
        const candidate = CANDIDATES.find((item) => item.id === id);
        if (
          candidate &&
          !this.expert.skills.some((item) => item.id === `skill_${id}`)
        )
          this.expert.skills.push({
            id: `skill_${id}`,
            name: candidate.name,
            description: candidate.description,
            source: "从平台导入",
            enabled: true,
            usageCount: 0,
          });
      }
      persist();
      this.importVisible = false;
      this.$message.success("技能已导入（演示）");
    },
    async uploadSkill(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const id = `skill_upload_${Date.now()}`;
      try {
        await saveFile(id, file);
        this.expert.skills.push({
          id,
          name: file.name.replace(/\.(zip|md|json|skill)$/i, ""),
          description: `本地上传：${file.name}`,
          source: "本地上传",
          enabled: true,
          usageCount: 0,
        });
        persist();
        this.$message.success("技能文件已保存到浏览器演示数据");
      } catch {
        this.$message.error("无法保存技能文件");
      }
      event.target.value = "";
    },
    openDetail(item) {
      this.selectedSkill = item;
      this.detailFile = "SKILL.md";
      this.foldersOpen = { references: true, templates: false };
      this.detailVisible = true;
    },
    skillCommand(command, item) {
      if (command !== "remove") return;
      this.$confirm(`确定卸载“${item.name}”？`, "卸载技能", {
        type: "warning",
        customClass: "manage-message-box",
      })
        .then(() => {
          this.expert.skills.splice(this.expert.skills.indexOf(item), 1);
          persist();
        })
        .catch(() => {});
    },
  },
};
</script>
