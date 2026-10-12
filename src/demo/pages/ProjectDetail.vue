<template>
  <div class="project-detail-root">
    <div v-if="project" class="page project-detail">
      <div class="detail-top">
        <el-button
          type="text"
          icon="el-icon-arrow-left"
          @click="$router.push('/projects')"
          >返回项目</el-button
        >
        <div>
          <el-button @click="editProject">编辑项目</el-button
          ><el-button type="danger" plain @click="removeProject"
            >删除项目</el-button
          >
        </div>
      </div>
      <div class="profile-hero">
        <div class="avatar large">
          <img
            v-if="isProjectImageIcon(project.icon)"
            :src="project.icon"
            :alt="project.name"
          /><span v-else>{{ projectIconLabel(project.icon) }}</span>
        </div>
        <div class="profile-main">
          <h1>{{ project.name }}</h1>
          <p>{{ project.description }}</p>
        </div>
        <span class="demo-badge">演示数据</span>
      </div>
      <div class="segmented">
        <button
          v-for="item in tabs"
          :key="item.key"
          :class="{ active: tab === item.key }"
          @click="setTab(item.key)"
        >
          {{ item.label }}
        </button>
      </div>

      <template v-if="tab === 'board'">
        <div class="section-heading">
          <div>
            <h2>项目看板</h2>
            <p>拖动由状态按钮模拟；看板卡归档与专家对话归档互不影响</p>
          </div>
          <div>
            <el-button @click="showArchived = !showArchived"
              >{{ showArchived ? "隐藏" : "显示" }}已归档 ({{
                project.tasks.filter((item) => item.archived).length
              }})</el-button
            ><el-button type="primary" icon="el-icon-plus" @click="openTask()"
              >创建任务</el-button
            >
          </div>
        </div>
        <div class="kanban">
          <div
            v-for="column in columns"
            :key="column.key"
            class="kanban-column"
          >
            <div class="kanban-head">
              <strong>{{ column.label }}</strong
              ><span>{{ columnTasks(column.key).length }}</span>
            </div>
            <article
              v-for="task in columnTasks(column.key)"
              :key="task.id"
              class="kanban-card"
              @click="openTask(task)"
            >
              <strong>{{ task.title }}</strong>
              <p>{{ task.description || "暂无描述" }}</p>
              <div class="card-foot">
                <span>{{ memberName(task.assigneeId) }}</span
                ><el-dropdown
                  trigger="click"
                  @command="(command) => moveTask(task, command)"
                  @click.native.stop
                  ><el-button type="text" size="mini">移动 / 归档</el-button
                  ><el-dropdown-menu slot="dropdown"
                    ><el-dropdown-item
                      v-for="target in columns"
                      :key="target.key"
                      :command="target.key"
                      >{{ target.label }}</el-dropdown-item
                    ><el-dropdown-item command="archive" divided>{{
                      task.archived ? "恢复" : "归档"
                    }}</el-dropdown-item></el-dropdown-menu
                  ></el-dropdown
                >
              </div>
            </article>
          </div>
        </div>
      </template>
      <goal-panel v-else-if="tab === 'goals'" :project="project" />
      <template v-else-if="tab === 'members'">
        <div class="section-heading">
          <div>
            <h2>项目成员</h2>
            <p>参与当前项目的专家</p>
          </div>
          <el-button type="primary" @click="membersVisible = true"
            >添加成员</el-button
          >
        </div>
        <div v-for="id in project.members" :key="id" class="list-row">
          <strong>{{ memberName(id) }}</strong
          ><el-button type="text" @click="removeMember(id)">移除</el-button>
        </div>
        <el-empty v-if="!project.members.length" description="暂无成员" />
      </template>
      <template v-else>
        <div class="section-heading">
          <div>
            <h2>项目工作空间</h2>
            <p>与专家工作空间独立的演示文件区</p>
          </div>
          <el-button type="primary" @click="$refs.upload.click()"
            >上传文件</el-button
          >
        </div>
        <input ref="upload" type="file" hidden @change="uploadFile" />
        <div v-for="file in project.files" :key="file.id" class="list-row">
          <span><i class="el-icon-document" /> {{ file.name }}</span>
          <div>
            <el-button type="text" @click="downloadFile(file)">下载</el-button
            ><el-button type="text" @click="removeFile(file)">删除</el-button>
          </div>
        </div>
        <el-empty v-if="!project.files.length" description="暂无项目文件" />
      </template>

      <el-dialog
        :title="editingTaskId ? '编辑任务' : '创建任务'"
        :visible.sync="taskVisible"
        width="540px"
      >
        <el-form label-position="top"
          ><el-form-item label="任务名称" required
            ><el-input v-model.trim="taskForm.title" /></el-form-item
          ><el-form-item label="任务描述"
            ><el-input
              v-model="taskForm.description"
              type="textarea"
              :rows="3" /></el-form-item
          ><el-form-item label="负责人"
            ><el-select v-model="taskForm.assigneeId" clearable
              ><el-option
                v-for="id in project.members"
                :key="id"
                :label="memberName(id)"
                :value="id" /></el-select></el-form-item
          ><el-form-item label="状态"
            ><el-select v-model="taskForm.status"
              ><el-option
                v-for="column in columns"
                :key="column.key"
                :label="column.label"
                :value="column.key" /></el-select></el-form-item
        ></el-form>
        <span slot="footer"
          ><el-button
            v-if="editingTaskId"
            type="danger"
            plain
            @click="deleteTask"
            >删除</el-button
          ><el-button @click="taskVisible = false">取消</el-button
          ><el-button type="primary" @click="saveTask">保存</el-button></span
        >
      </el-dialog>
      <el-dialog
        title="添加项目成员"
        :visible.sync="membersVisible"
        width="480px"
        ><el-checkbox-group v-model="draftMembers"
          ><el-checkbox
            v-for="expert in state.experts"
            :key="expert.id"
            :label="expert.id"
            >{{ expert.name }}</el-checkbox
          ></el-checkbox-group
        ><span slot="footer"
          ><el-button @click="membersVisible = false">取消</el-button
          ><el-button type="primary" @click="saveMembers">保存</el-button></span
        ></el-dialog
      >
    </div>
    <el-empty v-else description="项目不存在" />
  </div>
</template>

<script>
import {
  state,
  projectById,
  expertById,
  persist,
  updateProject,
  deleteProject,
  addProjectTask,
  updateProjectTask,
  deleteProjectTask,
} from "../state";
import { saveFile, readFile, deleteFile } from "../file-db";
import { isProjectImageIcon, projectIconLabel } from "../avatar";
import GoalPanel from "../components/GoalPanel.vue";

export default {
  name: "DemoProjectDetail",
  components: { GoalPanel },
  data() {
    return {
      state,
      tab: "board",
      tabs: [
        { key: "board", label: "项目看板" },
        { key: "goals", label: "项目目标" },
        { key: "members", label: "项目成员" },
        { key: "workspace", label: "工作空间" },
      ],
      columns: [
        { key: "todo", label: "待办" },
        { key: "ready", label: "已就绪" },
        { key: "doing", label: "进行中" },
        { key: "done", label: "已完成" },
      ],
      showArchived: false,
      taskVisible: false,
      taskForm: { title: "", description: "", status: "todo", assigneeId: "" },
      editingTaskId: "",
      membersVisible: false,
      draftMembers: [],
    };
  },
  computed: {
    project() {
      return projectById(this.$route.params.id);
    },
  },
  watch: {
    membersVisible(value) {
      if (value && this.project)
        this.draftMembers = this.project.members.slice();
    },
    "$route.query.tab"(value) {
      if (this.tabs.some((item) => item.key === value)) this.tab = value;
    },
  },
  mounted() {
    if (this.tabs.some((item) => item.key === this.$route.query.tab))
      this.tab = this.$route.query.tab;
  },
  methods: {
    isProjectImageIcon,
    projectIconLabel,
    setTab(tab) {
      this.tab = tab;
      this.$router
        .replace({ query: { ...this.$route.query, tab } })
        .catch(() => {});
    },
    memberName(id) {
      return expertById(id)?.name || "未分配";
    },
    columnTasks(status) {
      return this.project.tasks.filter(
        (item) =>
          item.status === status && (this.showArchived || !item.archived),
      );
    },
    openTask(task) {
      this.editingTaskId = task?.id || "";
      this.taskForm = task
        ? {
            title: task.title,
            description: task.description,
            status: task.status,
            assigneeId: task.assigneeId,
          }
        : { title: "", description: "", status: "todo", assigneeId: "" };
      this.taskVisible = true;
    },
    saveTask() {
      if (!this.taskForm.title) return this.$message.warning("请输入任务名称");
      if (this.editingTaskId)
        updateProjectTask(this.project.id, this.editingTaskId, this.taskForm);
      else addProjectTask(this.project.id, this.taskForm);
      this.taskVisible = false;
      this.$message.success("任务已保存（演示）");
    },
    deleteTask() {
      this.$confirm("确定删除此看板任务？", "删除任务", { type: "warning" })
        .then(() => {
          deleteProjectTask(this.project.id, this.editingTaskId);
          this.taskVisible = false;
        })
        .catch(() => {});
    },
    moveTask(task, command) {
      const patch =
        command === "archive"
          ? { archived: !task.archived }
          : { status: command };
      updateProjectTask(this.project.id, task.id, patch);
    },
    editProject() {
      this.$prompt("项目名称", "编辑项目", { inputValue: this.project.name })
        .then(({ value }) => {
          if (value.trim())
            updateProject(this.project.id, { name: value.trim() });
        })
        .catch(() => {});
    },
    removeProject() {
      this.$confirm("确定删除项目及看板任务？", "删除项目", { type: "warning" })
        .then(() => {
          deleteProject(this.project.id);
          this.$router.push("/projects");
        })
        .catch(() => {});
    },
    removeMember(id) {
      this.project.members.splice(this.project.members.indexOf(id), 1);
      persist();
    },
    saveMembers() {
      this.project.members = this.draftMembers.slice();
      persist();
      this.membersVisible = false;
    },
    async uploadFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const item = { id: `project_file_${Date.now()}`, name: file.name };
      this.project.files.push(item);
      await saveFile(item.id, file);
      persist();
      event.target.value = "";
      this.$message.success("已保存演示文件");
    },
    async downloadFile(file) {
      const blob = await readFile(file.id);
      if (!blob) return this.$message.warning("演示文件内容不可用");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async removeFile(file) {
      await deleteFile(file.id);
      this.project.files.splice(this.project.files.indexOf(file), 1);
      persist();
    },
  },
};
</script>
