<template>
  <div v-if="project" class="pd-shell">
    <header class="pd-header">
      <button
        class="pd-back"
        type="button"
        aria-label="返回项目"
        @click="goBack"
      >
        <i class="el-icon-arrow-left" />
      </button>
      <span class="pd-project-icon"
        ><img
          v-if="isProjectImageIcon(project.icon)"
          :src="project.icon"
          :alt="project.name"
        /><span v-else>{{ projectIconLabel(project.icon) }}</span></span
      >
      <div class="pd-title">
        <div>
          <h1>{{ project.name }}</h1>
          <span class="pd-progress-pill"
            >{{ completedCount }}/{{ activeTasks.length }} 已完成</span
          >
        </div>
        <p>{{ project.description || "暂无项目描述" }}</p>
      </div>
      <el-dropdown
        class="pd-project-menu"
        trigger="click"
        @command="projectCommand"
        ><button type="button" aria-label="项目操作">···</button
        ><el-dropdown-menu slot="dropdown"
          ><el-dropdown-item command="edit">编辑项目</el-dropdown-item
          ><el-dropdown-item command="delete" divided
            >删除项目</el-dropdown-item
          ></el-dropdown-menu
        ></el-dropdown
      >
      <div class="pd-header-actions">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="goalVisible = true"
          >发起目标</el-button
        ><el-button icon="el-icon-document" @click="recordsVisible = true"
          >发起记录</el-button
        ><el-button
          icon="el-icon-user"
          :class="{ 'pd-active': membersSidebarVisible }"
          @click="membersSidebarVisible = !membersSidebarVisible"
          >项目成员 {{ project.members.length }}</el-button
        >
      </div>
    </header>
    <div class="pd-body">
      <div class="pd-primary">
        <nav class="pd-tabs" aria-label="项目详情导航">
          <button
            v-for="item in tabs"
            :key="item.key"
            type="button"
            :class="{ active: tab === item.key }"
            @click="setTab(item.key)"
          >
            {{ item.label }}
          </button>
        </nav>
        <div v-if="tab === 'board'" class="pd-board pd-tab-content">
          <section
            v-for="column in columns"
            :key="column.key"
            class="pd-column"
          >
            <header>
              <strong>{{ column.label }}</strong
              ><em>{{ columnTasks(column.key).length }}</em
              ><button
                v-if="column.key === 'todo'"
                type="button"
                class="pd-add-task"
                @click="openTaskForm()"
              >
                + 新建任务</button
              ><button
                v-if="column.key === 'done'"
                type="button"
                class="pd-archived-switch"
                :class="{ active: showArchived }"
                @click="showArchived = !showArchived"
              >
                已归档 {{ archivedTasks.length }}
              </button>
            </header>
            <div class="pd-column-scroll">
              <article
                v-for="task in columnTasks(column.key)"
                :key="task.id"
                class="pd-task-card"
                :class="{ 'pd-task-card--archived': task.archived }"
                role="button"
                tabindex="0"
                @click="openTaskDetail(task)"
                @keydown.enter.prevent="openTaskDetail(task)"
              >
                <div class="pd-task-card-title">
                  <h3>{{ task.title }}</h3>
                  <span
                    class="pd-status"
                    :class="'pd-status--' + task.status"
                    >{{ statusName(task) }}</span
                  >
                </div>
                <div class="pd-task-card-meta">
                  <span>@{{ memberName(task.assigneeId) }}</span
                  ><span
                    class="pd-priority"
                    :class="'pd-priority--' + (task.priority || 'medium')"
                    >{{ priorityName(task.priority) }}</span
                  >
                </div>
                <p>{{ task.description || "等待项目成员处理" }}</p>
              </article>
              <div
                v-if="!columnTasks(column.key).length"
                class="pd-column-empty"
              >
                暂无任务
              </div>
            </div>
          </section>
        </div>
        <div v-else-if="tab === 'activity'" class="pd-activity pd-tab-content">
          <div class="pd-activity-filters">
            <button
              v-for="item in activityFilters"
              :key="item.key"
              type="button"
              :class="{ active: activityFilter === item.key }"
              @click="activityFilter = item.key"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="pd-timeline">
            <template v-for="group in activityGroups">
              <div :key="group.day + '-heading'" class="pd-day-label">
                {{ group.label }}
              </div>
              <div
                v-for="item in group.items"
                :key="item.id"
                class="pd-timeline-item"
              >
                <span
                  class="pd-timeline-dot"
                  :class="'pd-timeline-dot--' + item.category"
                />
                <div class="pd-timeline-card">
                  <strong>{{ item.text }}</strong
                  ><time>{{ activityTimeLabel(item.createdAt) }}</time>
                </div>
              </div>
            </template>
            <div v-if="!filteredActivity.length" class="pd-activity-empty">
              暂无符合条件的动态
            </div>
          </div>
        </div>
        <div v-else class="pd-workspace pd-tab-content">
          <div class="pd-workspace-toolbar">
            <div class="pd-breadcrumb">
              <button type="button" @click="folderId = null">workspace</button
              ><template v-for="crumb in breadcrumbs"
                ><span :key="crumb.id + '-slash'">/</span
                ><button
                  :key="crumb.id"
                  type="button"
                  @click="folderId = crumb.id"
                >
                  {{ crumb.name }}
                </button></template
              ><small
                >{{ folderCount }} 个文件夹 · {{ fileCount }} 个文件</small
              >
            </div>
            <div>
              <el-button size="small" @click="openFolderDialog()"
                >新建文件夹</el-button
              ><el-button
                size="small"
                type="primary"
                @click="$refs.upload.click()"
                >上传文件</el-button
              >
            </div>
          </div>
          <input ref="upload" type="file" hidden @change="uploadFile" />
          <div class="pd-workspace-panel">
            <div v-if="!currentFiles.length" class="pd-workspace-empty">
              <strong>工作目录暂无内容</strong>
              <p>你可以新建文件夹整理项目资料，或上传文件作为任务输入。</p>
              <el-button size="small" @click="openFolderDialog()"
                >新建文件夹</el-button
              ><el-button
                size="small"
                type="primary"
                @click="$refs.upload.click()"
                >上传文件</el-button
              >
            </div>
            <template v-else
              ><div class="pd-file-head">
                <span>名称</span><span>类型</span><span>更新时间</span
                ><span>大小</span><span>操作</span>
              </div>
              <div
                v-for="file in currentFiles"
                :key="file.id"
                class="pd-file-row"
              >
                <button type="button" @click="openFile(file)">
                  <i
                    :class="
                      file.kind === 'folder'
                        ? 'el-icon-folder'
                        : 'el-icon-document'
                    "
                  />{{ file.name }}</button
                ><span>{{ file.kind === "folder" ? "文件夹" : "文件" }}</span
                ><span>{{
                  timeLabel(file.updatedAt || project.updatedAt)
                }}</span
                ><span>{{ file.size ? sizeLabel(file.size) : "—" }}</span
                ><el-dropdown
                  trigger="click"
                  @command="(command) => fileCommand(command, file)"
                  ><el-button type="text" size="mini"
                    >操作 <i class="el-icon-arrow-down" /></el-button
                  ><el-dropdown-menu slot="dropdown"
                    ><el-dropdown-item
                      v-if="file.kind !== 'folder'"
                      command="preview"
                      >预览</el-dropdown-item
                    ><el-dropdown-item
                      v-if="file.kind !== 'folder'"
                      command="download"
                      >下载</el-dropdown-item
                    ><el-dropdown-item command="rename">重命名</el-dropdown-item
                    ><el-dropdown-item command="delete" divided
                      >删除</el-dropdown-item
                    ></el-dropdown-menu
                  ></el-dropdown
                >
              </div></template
            >
          </div>
        </div>
      </div>
      <aside v-if="membersSidebarVisible" class="pd-members-sidebar">
        <div class="pd-members-head">
          <strong
            ><i class="el-icon-user" /> 项目成员
            <em>{{ project.members.length }}</em></strong
          ><button
            type="button"
            aria-label="收起项目成员"
            @click="membersSidebarVisible = false"
          >
            ×
          </button>
        </div>
        <div class="pd-members-summary">
          <span
            >{{ project.members.length }} 位专家参与 ·
            {{ activeTasks.length }} 个任务</span
          ><el-button size="mini" @click="openAddMembers">+ 添加成员</el-button>
        </div>
        <div class="pd-members-scroll">
          <article
            v-for="member in members"
            :key="member.id"
            class="pd-member-card"
          >
            <div>
              <img
                :src="expertAvatarUrl(member)"
                :alt="member.name"
              /><strong>{{ member.name }}</strong
              ><em>{{ memberProgress(member.id) }}</em>
            </div>
            <p>{{ member.description || "暂无介绍" }}</p>
            <div>
              <el-button size="mini" @click="openTaskForm(null, member.id)"
                >给 TA 创建任务</el-button
              ><el-button
                size="mini"
                type="text"
                @click="removeMember(member.id)"
                >移除</el-button
              >
            </div>
          </article>
          <div v-if="!members.length" class="pd-members-empty">
            暂无项目成员
          </div>
        </div>
      </aside>
    </div>
    <project-goal-dialog :visible.sync="goalVisible" @submit="submitGoal" />
    <project-records-dialog
      :visible.sync="recordsVisible"
      :goals="project.goals"
      :tasks="project.tasks"
      @retry="retryGoal"
    />
    <project-task-form-dialog
      :visible.sync="taskFormVisible"
      :task="editingTask"
      :members="members"
      :tasks="project.tasks"
      :preset-assignee-id="presetAssigneeId"
      @submit="saveTask"
    />
    <project-task-detail-dialog
      :visible.sync="taskDetailVisible"
      :task="activeTask"
      :members="members"
      :tasks="project.tasks"
      @edit="(task) => openTaskForm(task)"
      @transfer="openTransfer"
      @archive="toggleArchive"
      @delete="removeTask"
      @status="requestStatus"
      @comment="addComment"
    />
    <project-form-dialog
      :visible.sync="editVisible"
      mode="edit"
      :project="project"
      :experts="state.experts"
      @submit="saveProjectEdit"
    />
    <el-dialog
      :visible.sync="addMembersVisible"
      width="640px"
      custom-class="pd-member-dialog"
      :close-on-click-modal="false"
      ><div slot="title" class="pd-dialog-heading">
        <span class="pd-dialog-icon pd-dialog-icon--purple">👥</span
        ><span
          ><strong>添加项目成员</strong
          ><small>搜索并选择专家加入项目</small></span
        >
      </div>
      <div class="pd-member-picker-toolbar">
        <el-input
          v-model="memberSearch"
          clearable
          prefix-icon="el-icon-search"
          placeholder="搜索专家名称、介绍或擅长领域"
        /><span>{{ selectedNewMembers.length }} 人已选</span>
      </div>
      <div class="project-member-grid pd-member-picker-grid">
        <button
          v-for="expert in filteredAddableExperts"
          :key="expert.id"
          type="button"
          class="project-member-card"
          :class="{ selected: selectedNewMembers.includes(expert.id) }"
          @click="toggleNewMember(expert.id)"
        >
          <img :src="expertAvatarUrl(expert)" :alt="expert.name" /><span
            class="project-member-copy"
            ><strong>{{ expert.name }}</strong
            ><small>{{ expert.description || "暂无介绍" }}</small
            ><span class="project-member-tags"
              ><em v-for="tag in (expert.tags || []).slice(0, 3)" :key="tag">{{
                tag
              }}</em></span
            ></span
          ><span class="project-member-check">{{
            selectedNewMembers.includes(expert.id) ? "✓" : ""
          }}</span>
        </button>
        <div v-if="!filteredAddableExperts.length" class="pd-members-empty">
          {{
            addableExperts.length ? "未找到匹配的专家" : "所有专家已加入项目"
          }}
        </div>
      </div>
      <div slot="footer" class="pd-dialog-actions">
        <el-button @click="addMembersVisible = false">取消</el-button
        ><el-button type="primary" @click="saveMembers">确认添加</el-button>
      </div></el-dialog
    >
    <el-dialog
      :visible.sync="folderVisible"
      width="420px"
      custom-class="pd-folder-dialog"
      ><div slot="title" class="pd-dialog-heading">
        <span class="pd-dialog-icon">▣</span
        ><span
          ><strong>{{ renameTarget ? "重命名" : "新建文件夹" }}</strong
          ><small>整理项目工作空间中的文件与资料</small></span
        >
      </div>
      <div class="pd-folder-field">
        <label>{{ renameTarget ? "名称" : "文件夹名称" }} <em>*</em></label
        ><el-input
          v-model.trim="folderDraft"
          maxlength="60"
          show-word-limit
          placeholder="例如：分析报告、原始数据"
        />
      </div>
      <div slot="footer" class="pd-dialog-actions">
        <el-button @click="folderVisible = false">取消</el-button
        ><el-button type="primary" :disabled="!folderDraft" @click="saveFolder"
          >保存</el-button
        >
      </div></el-dialog
    >
    <el-dialog
      :visible.sync="previewVisible"
      width="580px"
      custom-class="pd-preview-dialog"
      ><div slot="title" class="pd-dialog-heading">
        <span class="pd-dialog-icon">▤</span
        ><span
          ><strong>{{ previewFile?.name }}</strong
          ><small>项目文件预览 · 演示数据</small></span
        >
      </div>
      <div class="pd-preview-content">
        <img
          v-if="previewImageUrl"
          :src="previewImageUrl"
          :alt="previewFile?.name"
        />
        <pre v-else-if="previewText">{{ previewText }}</pre>
        <span v-else>此文件格式暂不支持预览，可下载查看。</span>
      </div>
      <div slot="footer" class="pd-dialog-actions">
        <el-button @click="previewVisible = false">关闭</el-button
        ><el-button type="primary" @click="downloadFile(previewFile)"
          >下载</el-button
        >
      </div></el-dialog
    >
    <el-dialog
      :visible.sync="transferVisible"
      width="460px"
      custom-class="pd-form-dialog"
      ><div slot="title" class="pd-dialog-heading">
        <span class="pd-dialog-icon">↗</span
        ><span
          ><strong>转交任务</strong
          ><small>选择新的项目成员作为负责人</small></span
        >
      </div>
      <div class="pd-transfer-field">
        <el-select v-model="transferAssigneeId" placeholder="选择项目成员"
          ><el-option
            v-for="member in members"
            :key="member.id"
            :label="member.name"
            :value="member.id"
        /></el-select>
      </div>
      <div slot="footer" class="pd-dialog-actions">
        <el-button @click="transferVisible = false">取消</el-button
        ><el-button type="primary" @click="saveTransfer">确认转交</el-button>
      </div></el-dialog
    >
    <el-dialog
      :visible.sync="statusActionVisible"
      width="460px"
      custom-class="pd-form-dialog pd-status-action-dialog"
      :close-on-click-modal="false"
    >
      <div slot="title" class="pd-dialog-heading">
        <span class="pd-dialog-icon">↻</span>
        <span
          ><strong>更新任务状态</strong
          ><small>本操作只更新本地演示任务</small></span
        >
      </div>
      <div class="pd-action-target">
        目标任务：<strong>{{ activeTask?.title }}</strong>
      </div>
      <el-form label-position="top">
        <el-form-item
          :label="
            statusActionTarget === 'done'
              ? '完成说明'
              : statusActionTarget === 'paused'
                ? '阻塞原因'
                : '更新说明'
          "
          :required="statusActionTarget === 'paused'"
        >
          <el-input
            v-model.trim="statusActionNote"
            type="textarea"
            :rows="3"
            :placeholder="
              statusActionTarget === 'done'
                ? '填写任务完成结果'
                : statusActionTarget === 'paused'
                  ? '说明任务无法继续的原因'
                  : '补充状态变更说明（可选）'
            "
          />
        </el-form-item>
      </el-form>
      <div slot="footer" class="pd-dialog-actions">
        <el-button @click="statusActionVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusAction"
          >确认更新</el-button
        >
      </div>
    </el-dialog>
  </div>
  <el-empty v-else description="项目不存在" />
</template>

<script>
import {
  state,
  projectById,
  expertById,
  updateProject,
  deleteProject,
  addProjectTask,
  updateProjectTask,
  deleteProjectTask,
  addGoal,
  launchGoal,
  persist,
} from "../state";
import { saveFile, readFile, deleteFile } from "../file-db";
import {
  expertAvatarUrl,
  isProjectImageIcon,
  projectIconLabel,
} from "../avatar";
import ProjectFormDialog from "../components/ProjectFormDialog.vue";
import ProjectGoalDialog from "../components/ProjectGoalDialog.vue";
import ProjectRecordsDialog from "../components/ProjectRecordsDialog.vue";
import ProjectTaskFormDialog from "../components/ProjectTaskFormDialog.vue";
import ProjectTaskDetailDialog from "../components/ProjectTaskDetailDialog.vue";

export default {
  name: "DemoProjectDetailPrototype",
  components: {
    ProjectFormDialog,
    ProjectGoalDialog,
    ProjectRecordsDialog,
    ProjectTaskFormDialog,
    ProjectTaskDetailDialog,
  },
  data() {
    return {
      state,
      tab: "board",
      tabs: [
        { key: "board", label: "看板" },
        { key: "activity", label: "动态" },
        { key: "workspace", label: "工作空间" },
      ],
      columns: [
        { key: "todo", label: "待办" },
        { key: "doing", label: "进行中" },
        { key: "paused", label: "暂停" },
        { key: "done", label: "已完成" },
      ],
      activityFilters: [
        { key: "all", label: "全部" },
        { key: "task", label: "任务协作" },
        { key: "project", label: "项目与成员" },
      ],
      activityFilter: "all",
      membersSidebarVisible: false,
      showArchived: false,
      goalVisible: false,
      recordsVisible: false,
      taskFormVisible: false,
      taskDetailVisible: false,
      editVisible: false,
      activeTaskId: "",
      editingTask: null,
      presetAssigneeId: "",
      addMembersVisible: false,
      memberSearch: "",
      selectedNewMembers: [],
      folderId: null,
      folderVisible: false,
      folderDraft: "",
      renameTarget: null,
      previewVisible: false,
      previewFile: null,
      previewText: "",
      previewImageUrl: "",
      transferVisible: false,
      transferAssigneeId: "",
      statusActionVisible: false,
      statusActionTarget: "",
      statusActionNote: "",
    };
  },
  computed: {
    project() {
      return projectById(this.$route.params.id);
    },
    members() {
      return (this.project?.members || []).map(expertById).filter(Boolean);
    },
    addableExperts() {
      return this.state.experts.filter(
        (expert) => !this.project.members.includes(expert.id),
      );
    },
    filteredAddableExperts() {
      const query = this.memberSearch.trim().toLowerCase();
      return this.addableExperts.filter(
        (expert) =>
          !query ||
          `${expert.name} ${expert.description} ${(expert.tags || []).join(" ")}`
            .toLowerCase()
            .includes(query),
      );
    },
    activeTasks() {
      return (this.project?.tasks || []).filter((task) => !task.archived);
    },
    archivedTasks() {
      return (this.project?.tasks || []).filter((task) => task.archived);
    },
    completedCount() {
      return this.activeTasks.filter((task) => task.status === "done").length;
    },
    activeTask() {
      return (
        this.project?.tasks.find((task) => task.id === this.activeTaskId) ||
        null
      );
    },
    activityItems() {
      const saved = this.project?.activity || [];
      const seed = [
        ...(this.project?.goals || [])
          .filter((goal) => !goal.createdAt)
          .map((goal) => ({
            id: `goal-${goal.id}`,
            text: `发起了目标「${goal.title}」`,
            category: "project",
            createdAt: goal.createdAt || this.project.updatedAt,
          })),
        ...(this.project?.tasks || [])
          .filter((task) => !task.createdAt)
          .map((task) => ({
            id: `task-${task.id}`,
            text: `创建了任务「${task.title}」 · 负责人 @${this.memberName(task.assigneeId)}`,
            category: "task",
            createdAt: task.createdAt || this.project.updatedAt,
          })),
      ];
      return [...saved, ...seed].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
    },
    filteredActivity() {
      return this.activityItems.filter(
        (item) =>
          this.activityFilter === "all" ||
          item.category === this.activityFilter,
      );
    },
    activityGroups() {
      const today = new Date().toLocaleDateString("sv-SE");
      const groups = [];
      this.filteredActivity.forEach((item) => {
        const day = item.createdAt
          ? new Date(item.createdAt).toLocaleDateString("sv-SE")
          : "演示数据";
        let group = groups.find((entry) => entry.day === day);
        if (!group) {
          group = { day, label: day === today ? "今天" : day, items: [] };
          groups.push(group);
        }
        group.items.push(item);
      });
      return groups;
    },
    currentFiles() {
      return (this.project?.files || []).filter(
        (file) => (file.parentId || null) === this.folderId,
      );
    },
    folderCount() {
      return this.currentFiles.filter((file) => file.kind === "folder").length;
    },
    fileCount() {
      return this.currentFiles.filter((file) => file.kind !== "folder").length;
    },
    breadcrumbs() {
      const result = [];
      let current = this.project?.files.find(
        (file) => file.id === this.folderId,
      );
      while (current) {
        result.unshift(current);
        current = this.project.files.find(
          (file) => file.id === current.parentId,
        );
      }
      return result;
    },
  },
  mounted() {
    this.readRouteTab();
  },
  watch: {
    "$route.query.tab"() {
      this.readRouteTab();
    },
    previewVisible(value) {
      if (!value && this.previewImageUrl) {
        URL.revokeObjectURL(this.previewImageUrl);
        this.previewImageUrl = "";
      }
    },
  },
  methods: {
    expertAvatarUrl,
    isProjectImageIcon,
    projectIconLabel,
    readRouteTab() {
      const value = this.$route.query.tab;
      if (this.tabs.some((item) => item.key === value)) this.tab = value;
      else if (value === "members") this.membersSidebarVisible = true;
      else if (value === "goals") this.recordsVisible = true;
    },
    goBack() {
      this.$router.push({
        name: "projects",
        query: this.$route.query.embed
          ? { embed: this.$route.query.embed }
          : {},
      });
    },
    setTab(value) {
      this.tab = value;
      this.$router
        .replace({ query: { ...this.$route.query, tab: value } })
        .catch(() => {});
    },
    memberName(id) {
      return expertById(id)?.name || "未指派";
    },
    memberProgress(id) {
      const tasks = this.activeTasks.filter((task) => task.assigneeId === id);
      return `${tasks.filter((task) => task.status === "done").length}/${tasks.length}`;
    },
    columnTasks(key) {
      return (this.project?.tasks || []).filter((task) => {
        if (key === "done")
          return (
            task.status === "done" && (!task.archived || this.showArchived)
          );
        if (task.archived) return false;
        return key === "todo"
          ? ["todo", "ready"].includes(task.status)
          : task.status === key;
      });
    },
    statusName(task) {
      return task.archived
        ? "已归档"
        : {
            todo: "待开始",
            ready: "可执行",
            doing: "执行中",
            paused: "待介入",
            done: "已完成",
          }[task.status] || "待开始";
    },
    priorityName(value) {
      return { high: "高", medium: "中", low: "低" }[value] || "中";
    },
    timeLabel(value) {
      return value
        ? new Date(value).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "演示数据";
    },
    activityTimeLabel(value) {
      return value
        ? new Date(value).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "演示数据";
    },
    sizeLabel(value) {
      return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
    },
    log(text, category = "task") {
      if (!this.project.activity) this.$set(this.project, "activity", []);
      this.project.activity.unshift({
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text,
        category,
        createdAt: new Date().toISOString(),
      });
      persist();
    },
    openTaskForm(task = null, assigneeId = "") {
      this.taskDetailVisible = false;
      this.editingTask = task;
      this.presetAssigneeId = assigneeId;
      this.taskFormVisible = true;
    },
    openTaskDetail(task) {
      this.activeTaskId = task.id;
      this.taskDetailVisible = true;
    },
    saveTask(form) {
      if (this.editingTask) {
        updateProjectTask(this.project.id, this.editingTask.id, form);
        this.log(`更新了任务「${form.title}」`);
      } else {
        addProjectTask(this.project.id, {
          ...form,
          status: form.predecessorId ? "todo" : "ready",
        });
        this.log(
          `创建了任务「${form.title}」 · 负责人 @${this.memberName(form.assigneeId)}`,
        );
      }
      this.taskFormVisible = false;
      this.$message.success("任务已保存（演示）");
    },
    requestStatus(task, value) {
      this.activeTaskId = task.id;
      this.statusActionTarget = value;
      this.statusActionNote = "";
      this.statusActionVisible = true;
    },
    confirmStatusAction() {
      if (!this.activeTask) return;
      if (this.statusActionTarget === "paused" && !this.statusActionNote)
        return this.$message.warning("请填写阻塞原因");
      const task = this.activeTask;
      updateProjectTask(this.project.id, task.id, {
        status: this.statusActionTarget,
        ...(this.statusActionTarget === "done"
          ? { result: this.statusActionNote }
          : {}),
        ...(this.statusActionTarget === "paused"
          ? { blockedReason: this.statusActionNote }
          : {}),
      });
      this.log(`将「${task.title}」更新为${this.statusName(task)}`);
      this.statusActionVisible = false;
    },
    toggleArchive(task) {
      const archived = task.archived;
      updateProjectTask(this.project.id, task.id, {
        archived: !archived,
        ...(archived ? {} : { status: "done" }),
      });
      this.log(`${archived ? "恢复" : "归档"}了任务「${task.title}」`);
      this.taskDetailVisible = false;
    },
    removeTask(task) {
      this.$confirm(`确定删除任务「${task.title}」？`, "删除任务", {
        type: "warning",
      })
        .then(() => {
          deleteProjectTask(this.project.id, task.id);
          this.log(`删除了任务「${task.title}」`);
          this.taskDetailVisible = false;
        })
        .catch(() => {});
    },
    openTransfer(task) {
      this.activeTaskId = task.id;
      this.transferAssigneeId = task.assigneeId || "";
      this.transferVisible = true;
    },
    saveTransfer() {
      if (!this.transferAssigneeId || !this.activeTask)
        return this.$message.warning("请选择项目成员");
      const title = this.activeTask.title;
      updateProjectTask(this.project.id, this.activeTaskId, {
        assigneeId: this.transferAssigneeId,
      });
      this.log(
        `将「${title}」转交给 @${this.memberName(this.transferAssigneeId)}`,
      );
      this.transferVisible = false;
    },
    addComment(task, body) {
      updateProjectTask(this.project.id, task.id, {
        comments: [
          ...(task.comments || []),
          { body, createdAt: new Date().toISOString() },
        ],
      });
      this.log(`评论了「${task.title}」`);
    },
    submitGoal(form) {
      const goal = addGoal(this.project.id, form);
      launchGoal(this.project.id, goal.id);
      this.log(`发起了目标「${goal.title}」`, "project");
      this.goalVisible = false;
      this.recordsVisible = true;
      this.$message.success("正在模拟拆解（演示）");
    },
    retryGoal(goal) {
      launchGoal(this.project.id, goal.id);
      this.$message.success("正在重新模拟拆解");
    },
    openAddMembers() {
      this.memberSearch = "";
      this.selectedNewMembers = [];
      this.addMembersVisible = true;
    },
    toggleNewMember(id) {
      const index = this.selectedNewMembers.indexOf(id);
      if (index >= 0) this.selectedNewMembers.splice(index, 1);
      else this.selectedNewMembers.push(id);
    },
    saveMembers() {
      if (!this.selectedNewMembers.length)
        return this.$message.warning("请选择专家");
      updateProject(this.project.id, {
        members: [...this.project.members, ...this.selectedNewMembers],
      });
      this.log(
        `添加了 ${this.selectedNewMembers.length} 位项目成员`,
        "project",
      );
      this.addMembersVisible = false;
    },
    removeMember(id) {
      const name = this.memberName(id);
      this.$confirm(`确定将「${name}」移出项目？`, "移除成员", {
        type: "warning",
      })
        .then(() => {
          updateProject(this.project.id, {
            members: this.project.members.filter((value) => value !== id),
          });
          this.log(`移除了项目成员「${name}」`, "project");
        })
        .catch(() => {});
    },
    projectCommand(value) {
      if (value === "edit") this.editVisible = true;
      else this.removeProject();
    },
    saveProjectEdit(form) {
      updateProject(this.project.id, {
        name: form.name,
        description: form.description,
        icon: form.icon,
      });
      this.editVisible = false;
      this.log("更新了项目信息", "project");
    },
    removeProject() {
      this.$confirm(
        `确定删除项目「${this.project.name}」？删除后不可恢复。`,
        "删除项目",
        { type: "warning" },
      )
        .then(() => {
          deleteProject(this.project.id);
          this.goBack();
        })
        .catch(() => {});
    },
    openFolderDialog(target = null) {
      this.renameTarget = target;
      this.folderDraft = target?.name || "";
      this.folderVisible = true;
    },
    saveFolder() {
      if (!this.folderDraft) return;
      if (this.renameTarget) {
        this.renameTarget.name = this.folderDraft;
        this.renameTarget.updatedAt = new Date().toISOString();
      } else
        this.project.files.push({
          id: `folder_${Date.now()}`,
          name: this.folderDraft,
          kind: "folder",
          parentId: this.folderId,
          updatedAt: new Date().toISOString(),
        });
      persist();
      this.folderVisible = false;
      this.$message.success("已保存到演示工作空间");
    },
    openFile(file) {
      if (file.kind === "folder") this.folderId = file.id;
      else this.openPreview(file);
    },
    fileCommand(value, file) {
      if (value === "rename") this.openFolderDialog(file);
      else if (value === "download") this.downloadFile(file);
      else if (value === "preview") this.openPreview(file);
      else this.removeFile(file);
    },
    async uploadFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const entry = {
        id: `project_file_${Date.now()}`,
        name: file.name,
        kind: "file",
        parentId: this.folderId,
        size: file.size,
        mime: file.type,
        updatedAt: new Date().toISOString(),
      };
      await saveFile(entry.id, file);
      this.project.files.push(entry);
      persist();
      event.target.value = "";
      this.$message.success("已保存演示文件");
    },
    async openPreview(file) {
      this.previewFile = file;
      this.previewText = "";
      if (this.previewImageUrl) URL.revokeObjectURL(this.previewImageUrl);
      this.previewImageUrl = "";
      const blob = await this.readProjectBlob(file);
      if (blob) {
        if ((file.mime || blob.type).startsWith("image/"))
          this.previewImageUrl = URL.createObjectURL(blob);
        else if (
          blob.type.startsWith("text/") ||
          /\.(txt|md|csv|json|log)$/i.test(file.name)
        )
          this.previewText = await blob.text();
      }
      this.previewVisible = true;
    },
    async downloadFile(file) {
      if (!file) return;
      const blob = await this.readProjectBlob(file);
      if (!blob) return this.$message.warning("演示文件内容不可用");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    readProjectBlob(file) {
      if (file.content != null)
        return new Blob([file.content], { type: file.mime || "text/plain" });
      return readFile(file.id);
    },
    removeFile(file) {
      this.$confirm(`确定删除「${file.name}」？`, "删除文件", {
        type: "warning",
      })
        .then(async () => {
          const ids = new Set([file.id]);
          let previous;
          do {
            previous = ids.size;
            this.project.files.forEach((entry) => {
              if (ids.has(entry.parentId)) ids.add(entry.id);
            });
          } while (ids.size !== previous);
          await Promise.all(
            this.project.files
              .filter((entry) => ids.has(entry.id) && entry.kind !== "folder")
              .map((entry) => deleteFile(entry.id)),
          );
          this.project.files = this.project.files.filter(
            (entry) => !ids.has(entry.id),
          );
          persist();
        })
        .catch(() => {});
    },
  },
};
</script>
