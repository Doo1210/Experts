<template>
  <div class="expert-manage-root">
    <div v-if="expert" class="detail-page expert-manage-page">
      <aside class="expert-manage-side">
        <div class="expert-manage-identity">
          <button
            type="button"
            class="expert-manage-back"
            title="返回专家列表"
            @click="$router.push('/')"
          >
            <i class="el-icon-arrow-left" /><span>{{ expert.name }}</span>
          </button>
        </div>
        <div class="expert-manage-side-action">
          <button type="button" class="expert-assign-btn" @click="startTask">
            <i class="el-icon-s-promotion" />发起任务</button
          ><button
            type="button"
            class="expert-manage-delete-btn"
            title="删除专家"
            aria-label="删除专家"
            @click="deleteVisible = true"
          >
            <i class="el-icon-delete" />
          </button>
        </div>
        <nav class="expert-manage-nav" aria-label="专家配置菜单">
          <button
            v-for="item in tabs"
            :key="item.key"
            type="button"
            class="expert-manage-nav-item"
            :class="{ active: tab === item.key }"
            @click="setTab(item.key)"
          >
            <span>{{ item.label }}</span
            ><span v-if="badgeFor(item.key)" class="expert-manage-nav-badge">{{
              badgeFor(item.key)
            }}</span>
          </button>
        </nav>
      </aside>
      <section
        class="detail-content"
        :class="{
          'is-card-scroll-tab': ['skill', 'tool', 'mcp', 'knowledge'].includes(
            tab,
          ),
          'is-knowledge-tab': tab === 'knowledge',
        }"
      >
        <expert-basic-tab v-if="tab === 'basic'" :expert="expert" />
        <template v-else-if="tab === 'persona'">
          <div class="section-heading">
            <div>
              <h2>岗位说明</h2>
              <p>定义专家负责什么、怎么工作、遵守什么规范。</p>
            </div>
            <div class="persona-head-actions">
              <span class="save-state" :class="{ dirty: personaDirty }">{{
                personaDirty ? "有未保存修改" : "已保存"
              }}</span
              ><el-button
                type="primary"
                :disabled="
                  !personaDirty || personaLength > 20000 || !!personaConflict
                "
                @click="savePersona"
                >保存</el-button
              >
            </div>
          </div>
          <div class="setting-line persona-preset-card">
            <div class="persona-preset-copy">
              <strong>预置问题</strong>
              <span>对话页一键填入，不写入岗位说明正文</span>
              <small v-if="expert.presetQuestions.length"
                >已配置 {{ expert.presetQuestions.length }} 条</small
              >
            </div>
            <div class="persona-preset-controls">
              <el-switch
                v-model="expert.presetEnabled"
                @change="togglePresets"
              /><el-button
                v-if="expert.presetQuestions.length || expert.presetEnabled"
                type="text"
                @click="questionsVisible = true"
                >配置</el-button
              >
            </div>
          </div>
          <div class="persona-editor-card">
            <div class="segmented secondary">
              <button
                v-for="part in personaParts"
                :key="part.key"
                :class="{ active: personaTab === part.key }"
                @click="personaTab = part.key"
              >
                {{ part.label }}
              </button>
            </div>
            <el-input
              v-model="personaDraft[personaTab]"
              type="textarea"
              :rows="16"
              resize="vertical"
              :placeholder="
                personaParts.find((part) => part.key === personaTab).placeholder
              "
            />
            <div
              class="persona-footer"
              :class="{ danger: personaLength > 20000 || !!personaConflict }"
            >
              <span>{{
                personaConflict
                  ? `正文不能使用保留标题 ${personaConflict}`
                  : personaLength > 20000
                    ? "岗位说明不能超过 20000 字符，请删减后保存。"
                    : "三段内容保存为一份岗位说明"
              }}</span
              ><span>{{ personaLength }} / 20000</span>
            </div>
          </div>
        </template>
        <workspace
          v-else-if="tab === 'workspace'"
          :expert="expert"
          :open-path="workspaceOpenPath"
        />
        <task-overview
          v-else-if="tab === 'task'"
          :expert="expert"
          @workspace="openTaskWorkspace"
          @new-task="startTask"
        />
        <expert-knowledge-tab
          v-else-if="tab === 'knowledge'"
          :expert="expert"
        />
        <template v-else-if="tab === 'memory'"
          ><div class="section-heading">
            <div>
              <h2>记忆</h2>
              <p>专家长期记忆与用户画像，由会话自动沉淀</p>
            </div>
          </div>
          <div class="setting-line memory-switch-line">
            <div class="memory-switch-copy">
              <strong>启用记忆</strong>
              <span>关闭后新会话不再使用或写入专家画像和用户画像</span>
              <small>已有文件保留</small>
            </div>
            <el-switch
              v-model="expert.memoryEnabled"
              aria-label="启用记忆"
              @change="toggleMemoryEnabled"
            />
          </div>
          <div
            class="memory-content-card"
            :class="{ 'is-memory-disabled': !expert.memoryEnabled }"
          >
            <div class="memory-tabs">
              <button
                type="button"
                :class="{ active: memorySubTab === 'expert' }"
                @click="memorySubTab = 'expert'"
              >
                专家画像</button
              ><button
                type="button"
                :class="{ active: memorySubTab === 'user' }"
                @click="memorySubTab = 'user'"
              >
                用户画像
              </button>
            </div>
            <div class="memory-readonly-content">
              {{ memorySubTab === "expert" ? memoryText : userMemoryText }}
            </div>
          </div></template
        >
        <expert-skill-tab v-else-if="tab === 'skill'" :expert="expert" />
        <expert-tool-tab v-else-if="tab === 'tool'" :expert="expert" />
        <expert-mcp-tab v-else-if="tab === 'mcp'" :expert="expert" />
        <expert-channel-tab v-else-if="tab === 'im'" :expert="expert" />
      </section>
      <el-dialog
        title="配置预置问题"
        custom-class="manage-dialog manage-questions-dialog"
        :visible.sync="questionsVisible"
        width="680px"
        :close-on-click-modal="false"
        @open="prepareQuestions"
        ><div slot="title" class="questions-dialog-title">
          <span class="questions-dialog-icon"
            ><i class="el-icon-chat-line-square" /></span
          ><span
            ><strong>配置预置问题</strong
            ><small
              >对话页点击「预置问题」后，可一键把问题填入输入框</small
            ></span
          >
        </div>
        <div class="questions-dialog-list">
          <div
            v-for="(question, index) in questionsDraft"
            :key="index"
            class="question-row"
            draggable="true"
            @dragstart="questionDragIndex = index"
            @dragover.prevent
            @drop.prevent="dropQuestion(index)"
          >
            <span class="question-index">{{ index + 1 }}</span>
            <el-input
              v-model="questionsDraft[index]"
              maxlength="200"
              :placeholder="`问题 ${index + 1}`"
            /><button
              type="button"
              class="question-drag"
              title="拖拽调整顺序"
              aria-label="拖拽调整顺序"
              @keydown.up.prevent="moveQuestion(index, -1)"
              @keydown.down.prevent="moveQuestion(index, 1)"
            >
              <i class="el-icon-rank" /></button
            ><button
              type="button"
              class="question-remove"
              :aria-label="`删除预置问题 ${index + 1}`"
              title="删除"
              @click="questionsDraft.splice(index, 1)"
            >
              <i class="el-icon-close" />
            </button>
          </div>
          <el-button
            type="text"
            :disabled="questionsDraft.length >= 20"
            @click="questionsDraft.push('')"
            >+ 添加问题</el-button
          >
        </div>
        <span slot="footer"
          ><el-button @click="questionsVisible = false">取消</el-button
          ><el-button type="primary" @click="saveQuestions"
            >保存</el-button
          ></span
        ></el-dialog
      >
      <el-dialog
        title="删除专家"
        :visible.sync="deleteVisible"
        width="560px"
        custom-class="manage-dialog manage-delete-dialog"
        @open="deleteConfirmName = ''"
      >
        <div class="manage-delete-warning">
          <i class="el-icon-warning-outline" />
          <div>
            <strong>即将删除专家「{{ expert.name }}」</strong>
            <p>专家配置、任务和消息渠道演示记录将从本地列表清除。</p>
            <p v-if="runningCount">
              当前有 {{ runningCount }} 个运行中演示会话，删除后会中断这些会话。
            </p>
          </div>
        </div>
        <label class="manage-delete-confirm"
          >请输入专家名称「{{ expert.name }}」以确认<el-input
            v-model="deleteConfirmName"
            placeholder="输入专家名称"
        /></label>
        <span slot="footer"
          ><el-button @click="deleteVisible = false">取消</el-button
          ><el-button
            type="danger"
            :disabled="deleteConfirmName !== expert.name"
            @click="confirmDeleteExpert"
            >{{ runningCount ? "强制删除" : "删除专家" }}</el-button
          ></span
        >
      </el-dialog>
    </div>
    <el-empty v-else description="专家不存在" />
  </div>
</template>

<script>
import Vue from "vue";
import { expertById, conversationsFor, deleteExpert, persist } from "../state";
import ExpertBasicTab from "../components/ExpertBasicTab.vue";
import Workspace from "../components/Workspace.vue";
import TaskOverview from "../components/TaskOverview.vue";
import ExpertSkillTab from "../components/ExpertSkillTab.vue";
import ExpertToolTab from "../components/ExpertToolTab.vue";
import ExpertMcpTab from "../components/ExpertMcpTab.vue";
import ExpertKnowledgeTab from "../components/ExpertKnowledgeTab.vue";
import ExpertChannelTab from "../components/ExpertChannelTab.vue";
const DEMO_EXPERT_MEMORY = `# 专家长期记忆

## 用户偏好
- 偏好用数据驱动方式做决策，汇报时需附带量化结论
- 习惯用中文输出，技术术语可保留英文

## 项目背景
- 当前产线为 12 寸晶圆厂，月产能 5 万片
- 重点攻关工序：光刻对准精度与刻蚀均匀性

## 领域知识
- SPC 控制限按 ±3σ 设定，Cpk 目标 ≥ 1.33
- 异常处理流程：发现 -> 隔离 -> 根因分析 -> 纠正措施 -> 验证关闭`;
const DEMO_USER_MEMORY = `# 用户画像

## 角色
- 制造工艺工程师，负责良率提升与工艺优化

## 沟通风格
- 直接、简洁，偏好结论先行
- 喜欢用表格和图表对比方案

## 常用工具
- MES 报表系统、JMP 统计分析、Minitab`;
export default {
  name: "ExpertManagePage",
  components: {
    ExpertBasicTab,
    Workspace,
    TaskOverview,
    ExpertSkillTab,
    ExpertToolTab,
    ExpertMcpTab,
    ExpertKnowledgeTab,
    ExpertChannelTab,
  },
  data() {
    return {
      tabs: [
        { key: "basic", label: "基本信息" },
        { key: "persona", label: "岗位说明", icon: "el-icon-document" },
        { key: "workspace", label: "工作空间", icon: "el-icon-folder" },
        { key: "task", label: "任务", icon: "el-icon-chat-line-square" },
        { key: "knowledge", label: "知识", icon: "el-icon-reading" },
        { key: "memory", label: "记忆", icon: "el-icon-collection" },
        { key: "skill", label: "技能", icon: "el-icon-magic-stick" },
        { key: "tool", label: "工具", icon: "el-icon-setting" },
        { key: "mcp", label: "MCP", icon: "el-icon-connection" },
        { key: "im", label: "消息渠道", icon: "el-icon-message" },
      ],
      personaParts: [
        {
          key: "responsibility",
          label: "岗位职责",
          placeholder: "例：负责产线良率分析与工艺窗口建议；不负责设备采购决策",
        },
        {
          key: "workflow",
          label: "作业流程",
          placeholder:
            "例：1. 核对工作目录与数据  2. 分析  3. 结论先行  4. 高风险先问人",
        },
        {
          key: "rules",
          label: "工作规范",
          placeholder: "填写红线、表达规范、审批要求和产物约定",
        },
      ],
      personaTab: "responsibility",
      personaDraft: {},
      questionsVisible: false,
      questionsDraft: [],
      questionDragIndex: -1,
      memorySubTab: "expert",
      workspaceOpenPath: "",
      deleteVisible: false,
      deleteConfirmName: "",
    };
  },
  computed: {
    expert() {
      return expertById(this.$route.params.id);
    },
    runningCount() {
      return this.expert
        ? conversationsFor(this.expert.id).filter(
            (item) => item.status === "running",
          ).length
        : 0;
    },
    tab() {
      return this.tabs.some((x) => x.key === this.$route.query.tab)
        ? this.$route.query.tab
        : "basic";
    },
    personaLength() {
      const headings = {
        responsibility: "岗位职责",
        workflow: "作业流程",
        rules: "工作规范",
      };
      const parts = Object.entries(headings).flatMap(([key, heading]) => {
        const body = String(this.personaDraft[key] || "")
          .replace(/\r\n?/g, "\n")
          .trim();
        return body ? [`## ${heading}\n\n${body}`] : [];
      });
      const document = parts.length
        ? `# 岗位说明\n\n${parts.join("\n\n")}\n`
        : "";
      return Array.from(document).length;
    },
    personaConflict() {
      return (
        Object.values(this.personaDraft)
          .flatMap((value) => String(value || "").split("\n"))
          .find((line) =>
            /^\s*##\s*(岗位职责|作业流程|工作规范)\s*$/.test(line),
          )
          ?.trim() || ""
      );
    },
    memoryText() {
      if (!this.expert) return "";
      if (this.expert.memoryMarkdown) return this.expert.memoryMarkdown;
      if (this.expert.memories?.length)
        return `# 专家长期记忆\n\n${this.expert.memories.map((item) => `- ${item}`).join("\n")}`;
      return this.expert.id === "exp_quality"
        ? DEMO_EXPERT_MEMORY
        : "（暂无长期记忆，会话过程中自动沉淀）";
    },
    userMemoryText() {
      return (
        this.expert?.userMemoryMarkdown ||
        (this.expert?.id === "exp_quality"
          ? DEMO_USER_MEMORY
          : "（暂无用户画像记忆）")
      );
    },
    personaDirty() {
      if (!this.expert) return false;
      return (
        JSON.stringify(this.personaDraft) !==
        JSON.stringify(
          this.expert.persona || {
            responsibility: "",
            workflow: "",
            rules: "",
          },
        )
      );
    },
  },
  mounted() {
    this.loadPersona();
  },
  watch: {
    "$route.params.id"() {
      this.loadPersona();
    },
  },
  methods: {
    persist,
    toggleMemoryEnabled(enabled) {
      this.expert.memoryEnabled = Boolean(enabled);
      persist();
      this.$message.success(
        enabled
          ? "记忆已开启，将在新会话生效（演示）"
          : "记忆已关闭，将在新会话生效；已有文件仍保留（演示）",
      );
    },
    badgeFor(key) {
      if (key === "skill") return this.expert.skills.length;
      if (key === "tool")
        return this.expert.tools.filter((item) => item.enabled).length;
      if (key === "mcp")
        return this.expert.mcps.filter((item) => item.enabled).length;
      return 0;
    },
    togglePresets(enabled) {
      if (enabled && !this.expert.presetQuestions.length) {
        this.expert.presetEnabled = false;
        this.questionsVisible = true;
      } else persist();
    },
    prepareQuestions() {
      this.questionsDraft = this.expert.presetQuestions.length
        ? [...this.expert.presetQuestions]
        : ["请说明你能帮我完成哪些工作", "基于现有资料给出下一步建议"];
    },
    dropQuestion(index) {
      const from = this.questionDragIndex;
      this.questionDragIndex = -1;
      if (from < 0 || from === index) return;
      const copy = this.questionsDraft.slice();
      copy.splice(index, 0, copy.splice(from, 1)[0]);
      this.questionsDraft = copy;
    },
    loadPersona() {
      this.personaDraft = {
        ...(this.expert?.persona || {
          responsibility: "",
          workflow: "",
          rules: "",
        }),
      };
      if (
        this.expert &&
        this.expert.personaSaved === false &&
        !Object.values(this.personaDraft).some((x) => String(x).trim())
      )
        this.personaDraft.rules =
          "在当前工作目录中读取和保存任务文件；不确定工作目录时先与用户确认。";
    },
    setTab(tab) {
      if (tab === "workspace") this.workspaceOpenPath = "";
      this.$router
        .push({
          name: "expert",
          params: { id: this.expert.id },
          query: { ...this.$route.query, tab },
        })
        .catch(() => {});
    },
    openTaskWorkspace(target) {
      this.workspaceOpenPath =
        typeof target === "string" ? target : target?.cwd || "";
      this.$router
        .push({
          name: "expert",
          params: { id: this.expert.id },
          query: { ...this.$route.query, tab: "workspace" },
        })
        .catch(() => {});
    },
    startTask() {
      this.$router.push({
        name: "chat",
        params: { id: this.expert.id },
        query: { embed: this.$route.query.embed },
      });
    },
    confirmDeleteExpert() {
      if (this.deleteConfirmName !== this.expert.name) return;
      deleteExpert(this.expert.id);
      this.deleteVisible = false;
      this.$message.success("专家已删除（演示）");
      this.$router.push("/");
    },
    savePersona() {
      if (this.personaConflict)
        return this.$message.warning(
          `正文中不能使用保留标题「${this.personaConflict}」`,
        );
      if (this.personaLength > 20000)
        return this.$message.warning("岗位说明不能超过 20000 字符");
      Vue.set(this.expert, "persona", { ...this.personaDraft });
      Vue.set(this.expert, "personaSaved", true);
      persist();
      this.$message.success("岗位说明已保存（演示）");
    },
    moveQuestion(index, delta) {
      const next = index + delta;
      if (next < 0 || next >= this.questionsDraft.length) return;
      const copy = this.questionsDraft.slice();
      [copy[index], copy[next]] = [copy[next], copy[index]];
      this.questionsDraft = copy;
    },
    saveQuestions() {
      const clean = [
        ...new Set(this.questionsDraft.map((x) => x.trim()).filter(Boolean)),
      ];
      if (clean.length > 20 || clean.some((x) => x.length > 200))
        return this.$message.warning("问题数量或长度超出限制");
      if (!clean.length) return this.$message.warning("请至少填写一条预置问题");
      Vue.set(this.expert, "presetQuestions", clean);
      Vue.set(this.expert, "presetEnabled", true);
      persist();
      this.questionsVisible = false;
      this.$message.success("预置问题已保存（演示）");
    },
  },
};
</script>
