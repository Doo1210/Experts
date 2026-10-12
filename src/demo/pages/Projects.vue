<template>
  <div class="page page-list project-list-page">
    <list-header
      active="project"
      @create-expert="goCreateExpert"
      @create-project="createVisible = true"
    >
      <template #tools
        ><el-input
          v-model="keyword"
          size="small"
          clearable
          prefix-icon="el-icon-search"
          placeholder="搜索项目"
      /></template>
    </list-header>
    <div class="expert-list-scroll">
      <div v-if="filtered.length" class="card-grid">
        <article
          v-for="project in filtered"
          :key="project.id"
          class="project-list-card"
          role="button"
          tabindex="0"
          :aria-label="`打开项目 ${project.name}`"
          @click="openProject(project)"
          @keydown.enter.prevent="openProject(project)"
        >
          <div class="project-list-card-accent" />
          <el-dropdown
            class="project-list-card-more"
            trigger="click"
            @command="(command) => cardCommand(command, project)"
            @click.native.stop
            ><button type="button" aria-label="更多操作" @click.stop>···</button
            ><el-dropdown-menu slot="dropdown"
              ><el-dropdown-item command="edit">编辑</el-dropdown-item
              ><el-dropdown-item command="delete" divided
                >删除</el-dropdown-item
              ></el-dropdown-menu
            ></el-dropdown
          >
          <div class="project-list-card-body">
            <div class="project-list-card-head">
              <span class="project-list-card-icon"
                ><img
                  v-if="isProjectImageIcon(project.icon)"
                  :src="project.icon"
                  :alt="project.name"
                /><span v-else>{{ projectIconLabel(project.icon) }}</span></span
              >
              <div class="project-list-card-title">
                <strong>{{ project.name }}</strong
                ><small>进行中</small>
              </div>
            </div>
            <p class="project-list-card-description">
              {{ project.description || "暂无项目描述" }}
            </p>
            <div v-if="stats(project).total" class="project-list-progress">
              <div>
                <span>看板进度</span
                ><b>{{ stats(project).done }}/{{ stats(project).total }}</b>
              </div>
              <div class="project-list-progress-track">
                <span :style="{ width: stats(project).percent + '%' }" />
              </div>
            </div>
            <div class="project-list-card-footer">
              <div class="project-list-members">
                <span class="project-list-member-avatars"
                  ><img
                    v-for="member in members(project).slice(0, 2)"
                    :key="member.id"
                    :src="expertAvatarUrl(member)"
                    :alt="member.name"
                    :title="member.name"
                  /><span v-if="members(project).length > 2"
                    >+{{ members(project).length - 2 }}</span
                  ></span
                ><small>{{ members(project).length }} 位专家</small>
              </div>
              <time>{{ formatTime(project.updatedAt) }}</time>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="project-list-empty">
        <span class="project-list-empty-icon" aria-hidden="true">📁</span>
        <p>{{ keyword.trim() ? "未找到匹配的项目" : "暂无项目" }}</p>
        <button
          v-if="!keyword.trim()"
          type="button"
          @click="createVisible = true"
        >
          <span>＋</span> 创建第一个项目
        </button>
        <button v-else type="button" @click="keyword = ''">清空搜索</button>
      </div>
    </div>
    <project-form-dialog
      :visible.sync="createVisible"
      mode="create"
      :experts="state.experts"
      @submit="createProject"
    />
    <project-form-dialog
      :visible.sync="editVisible"
      mode="edit"
      :project="editingProject"
      :experts="state.experts"
      @submit="saveEdit"
    />
  </div>
</template>

<script>
import { state, addProject, updateProject, deleteProject } from "../state";
import {
  expertAvatarUrl,
  isProjectImageIcon,
  projectIconLabel,
} from "../avatar";
import ListHeader from "../components/ListHeader.vue";
import ProjectFormDialog from "../components/ProjectFormDialog.vue";

export default {
  name: "DemoProjectsPage",
  components: { ListHeader, ProjectFormDialog },
  data() {
    return {
      state,
      keyword: "",
      createVisible: false,
      editVisible: false,
      editingProject: null,
    };
  },
  computed: {
    filtered() {
      const query = this.keyword.trim().toLowerCase();
      return this.state.projects.filter(
        (project) =>
          !query ||
          `${project.name} ${project.description}`
            .toLowerCase()
            .includes(query),
      );
    },
  },
  mounted() {
    if (this.$route.query.create === "1") this.createVisible = true;
  },
  watch: {
    "$route.query.create"(value) {
      if (value === "1") this.createVisible = true;
    },
    createVisible(value) {
      if (!value && this.$route.query.create) {
        const query = { ...this.$route.query };
        delete query.create;
        this.$router.replace({ name: "projects", query }).catch(() => {});
      }
    },
  },
  methods: {
    expertAvatarUrl,
    isProjectImageIcon,
    projectIconLabel,
    goCreateExpert() {
      this.$router.push({
        name: "experts",
        query: { create: "1", embed: this.$route.query.embed },
      });
    },
    openProject(project) {
      this.$router.push({
        name: "project",
        params: { id: project.id },
        query: { embed: this.$route.query.embed },
      });
    },
    members(project) {
      return (project.members || [])
        .map((id) => this.state.experts.find((expert) => expert.id === id))
        .filter(Boolean);
    },
    stats(project) {
      const active = (project.tasks || []).filter((task) => !task.archived);
      const done = active.filter((task) => task.status === "done").length;
      return {
        total: active.length,
        done,
        percent: active.length ? Math.round((done / active.length) * 100) : 0,
      };
    },
    formatTime(value) {
      return new Date(value || "2026-10-10T08:50:00+08:00")
        .toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replaceAll("/", "-");
    },
    cardCommand(command, project) {
      if (command === "edit") {
        this.editingProject = project;
        this.editVisible = true;
        return;
      }
      this.$confirm(
        `确定删除项目「${project.name}」？删除后不可恢复。`,
        "删除项目",
        {
          type: "warning",
          confirmButtonText: "删除",
          cancelButtonText: "取消",
        },
      )
        .then(() => {
          deleteProject(project.id);
          this.$message.success("项目已删除（演示）");
        })
        .catch(() => {});
    },
    createProject(form) {
      const project = addProject(form);
      this.createVisible = false;
      this.$message.success("项目创建成功（演示）");
      this.openProject(project);
    },
    saveEdit(form) {
      if (!this.editingProject) return;
      updateProject(this.editingProject.id, {
        name: form.name,
        description: form.description,
        icon: form.icon,
      });
      this.editVisible = false;
      this.editingProject = null;
      this.$message.success("项目信息已更新（演示）");
    },
  },
};
</script>
