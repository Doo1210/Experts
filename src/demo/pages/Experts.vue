<template>
  <div class="page page-list expert-list-page">
    <list-header
      :active="tab"
      @create-expert="openCreate"
      @create-project="goCreateProject"
    >
      <template #tools>
        <div
          class="expert-list-search"
          :class="{ 'is-open': searchVisible || keyword }"
        >
          <button
            type="button"
            class="expert-list-search-toggle"
            :aria-label="
              keyword ? '清除搜索' : tab === 'mine' ? '搜索专家' : '搜索模板'
            "
            :aria-expanded="Boolean(searchVisible || keyword)"
            @click="toggleSearch"
          >
            <i :class="keyword ? 'el-icon-close' : 'el-icon-search'" />
          </button>
          <el-input
            v-if="searchVisible || keyword"
            ref="expertSearch"
            v-model="keyword"
            size="small"
            clearable
            :placeholder="tab === 'mine' ? '搜索专家' : '搜索模板'"
            @keyup.esc.native="closeSearch"
          />
        </div>
      </template>
    </list-header>
    <div class="expert-list-scroll">
      <div v-if="filtered.length" class="card-grid">
        <article
          v-for="item in filtered"
          :key="item.id"
          class="expert-card"
          :class="{
            'expert-card-mine': tab === 'mine',
            'expert-card-template': tab === 'template',
          }"
        >
          <template v-if="tab === 'mine'">
            <div
              class="expert-card-body"
              role="button"
              tabindex="0"
              :aria-label="`打开${item.name}的配置`"
              @click="openExpert(item)"
              @keydown.enter.prevent="openExpert(item)"
              @keydown.space.prevent="openExpert(item)"
            >
              <img
                class="card-avatar"
                :src="avatarSrc(item)"
                :alt="item.name"
              />
              <div class="card-header-text">
                <h2 class="card-name">{{ item.name }}</h2>
                <p class="card-desc">{{ item.description || "暂无简介" }}</p>
              </div>
            </div>
            <el-dropdown
              class="card-more"
              trigger="click"
              @command="(command) => onCommand(command, item)"
              @click.native.stop
            >
              <button
                type="button"
                class="card-more-btn"
                aria-label="更多操作"
                @click.stop
              >
                ···
              </button>
              <el-dropdown-menu slot="dropdown"
                ><el-dropdown-item command="edit">编辑资料</el-dropdown-item
                ><el-dropdown-item command="publish"
                  >发布为模板</el-dropdown-item
                ><el-dropdown-item command="delete" divided
                  >删除</el-dropdown-item
                ></el-dropdown-menu
              >
            </el-dropdown>
            <div class="expert-card-foot">
              <div class="expert-card-info">
                <span
                  class="expert-card-stat"
                  :title="`正在执行 ${runningCount(item)}`"
                  ><span>正在执行</span
                  ><span class="expert-card-stat-number">{{
                    runningCount(item)
                  }}</span></span
                >
                <span class="expert-card-info-divider">|</span>
                <span class="expert-card-stat"
                  ><span>自主任务</span
                  ><span class="expert-card-stat-number">{{
                    eventCount(item)
                  }}</span></span
                >
                <span class="expert-card-info-divider">|</span>
                <span class="expert-card-channel"
                  ><span>渠道</span
                  ><span
                    v-if="!enabledChannels(item).length"
                    class="expert-card-channel-empty"
                    >未接入</span
                  ><span v-else class="expert-card-channel-icons"
                    ><span
                      v-for="channel in enabledChannels(item)"
                      :key="channel.id"
                      class="expert-card-channel-icon"
                      :title="channel.name"
                      ><img
                        :src="channelIcon(channel.id)"
                        :alt="channel.name" /></span></span
                ></span>
              </div>
              <div class="expert-card-hover-actions">
                <button
                  type="button"
                  class="expert-card-start-btn"
                  @click.stop="startChat(item)"
                >
                  <i class="el-icon-s-promotion" />发起任务
                </button>
                <button
                  type="button"
                  class="expert-card-icon-btn"
                  title="配置专家"
                  aria-label="配置专家"
                  @click.stop="openExpert(item)"
                >
                  <img
                    :src="publicAsset('/experts/icons/settings-filled.svg')"
                    alt=""
                  />
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <div
              class="expert-card-body"
              role="button"
              tabindex="0"
              :aria-label="`打开${templateName(item)}模板介绍`"
              @click="openTemplate(item)"
              @keydown.enter.prevent="openTemplate(item)"
              @keydown.space.prevent="openTemplate(item)"
            >
              <img
                class="card-avatar"
                :src="templateAvatar(item)"
                :alt="templateName(item)"
              />
              <div class="card-header-text">
                <h2 class="card-name">{{ templateName(item) }}</h2>
                <p class="card-desc">{{ item.description }}</p>
              </div>
            </div>
            <div class="expert-card-template-foot">
              <div class="expert-card-template-tags">
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="template-card-tag"
                  :title="tag"
                  >{{ tag }}</span
                >
              </div>
              <div class="expert-card-template-actions">
                <button type="button" @click.stop="useTemplate(item)">
                  <i class="el-icon-document-copy" />使用模板
                </button>
              </div>
            </div>
          </template>
        </article>
      </div>
      <div v-else class="expert-list-empty">
        <div class="expert-list-empty-icon" aria-hidden="true">
          {{ tab === "template" ? "▦" : "👤" }}
        </div>
        <p>
          {{
            keyword
              ? "暂无匹配结果"
              : tab === "template"
                ? "暂无专家模板"
                : "暂无专家"
          }}
        </p>
        <button
          v-if="keyword"
          type="button"
          class="expert-list-empty-action"
          @click="clearSearch"
        >
          <span class="expert-list-empty-action-icon">×</span>清除搜索
        </button>
        <button
          v-else-if="tab === 'mine'"
          type="button"
          class="expert-list-empty-action"
          @click="openCreate"
        >
          <span class="expert-list-empty-action-icon">+</span>创建第一位专家
        </button>
      </div>
    </div>

    <create-expert-dialog
      :visible.sync="createVisible"
      :templates="state.templates"
      :experts="state.experts"
      :preset-template-id="templateId"
      @submit="createExpert"
      @closed="clearCreateRoute"
    />
    <el-dialog
      v-if="editingId"
      title="编辑专家资料"
      :visible.sync="editVisible"
      width="540px"
      :close-on-click-modal="false"
      @closed="clearForm"
    >
      <el-form label-position="top"
        ><el-form-item label="名称" required
          ><el-input
            v-model.trim="form.name"
            maxlength="40"
            show-word-limit /></el-form-item
        ><el-form-item label="简介"
          ><el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="240"
            show-word-limit /></el-form-item
        ><el-form-item label="标签（用逗号分隔）"
          ><el-input
            v-model="tagsText"
            placeholder="例如：质量管理, 数据分析" /></el-form-item
        ><el-form-item label="默认模型"
          ><el-select v-model="form.model" style="width: 100%"
            ><el-option label="通用大模型" value="通用大模型" /><el-option
              label="推理模型"
              value="推理模型" /><el-option
              label="视觉模型"
              value="视觉模型" /></el-select></el-form-item
      ></el-form>
      <span slot="footer"
        ><el-button @click="editVisible = false">取消</el-button
        ><el-button type="primary" @click="saveEdit">保存</el-button></span
      >
    </el-dialog>
    <template-intro-dialog
      :visible.sync="templateVisible"
      :template="selectedTemplate"
      :experts="state.experts"
      @use-template="useTemplate"
    />
  </div>
</template>

<script>
import {
  state,
  addExpert,
  updateExpert,
  deleteExpert,
  createConversation,
  publishTemplate,
} from "../state";
import ListHeader from "../components/ListHeader.vue";
import CreateExpertDialog from "../components/CreateExpertDialog.vue";
import TemplateIntroDialog from "../components/TemplateIntroDialog.vue";
import { avatarSrcFor, avatarSrcForSource } from "../avatar";
import { publicAsset } from "../public-asset";
export default {
  name: "ExpertsPage",
  components: { ListHeader, CreateExpertDialog, TemplateIntroDialog },
  data() {
    return {
      state,
      keyword: "",
      searchVisible: false,
      createVisible: false,
      editVisible: false,
      templateVisible: false,
      selectedTemplate: null,
      editingId: "",
      templateId: "",
      form: { name: "", description: "", model: "通用大模型" },
      tagsText: "",
    };
  },
  computed: {
    tab() {
      return this.$route.query.tab === "template" ? "template" : "mine";
    },
    filtered() {
      const list =
        this.tab === "mine" ? this.state.experts : this.state.templates;
      const q = this.keyword.trim().toLowerCase();
      return list.filter(
        (item) =>
          !q ||
          `${item.name} ${item.description} ${(item.tags || []).join(" ")}`
            .toLowerCase()
            .includes(q),
      );
    },
  },
  mounted() {
    if (this.$route.query.create === "1") this.createVisible = true;
  },
  watch: {
    tab() {
      this.keyword = "";
      this.searchVisible = false;
    },
    "$route.query.create"(value) {
      if (value === "1") this.createVisible = true;
    },
  },
  methods: {
    publicAsset,
    toggleSearch() {
      if (this.keyword) return this.clearSearch();
      this.searchVisible = !this.searchVisible;
      if (this.searchVisible)
        this.$nextTick(() => this.$refs.expertSearch?.focus());
    },
    closeSearch() {
      if (!this.keyword) this.searchVisible = false;
    },
    clearSearch() {
      this.keyword = "";
      this.searchVisible = false;
    },
    openCreate() {
      this.templateId = "";
      this.createVisible = true;
    },
    avatarSrc: avatarSrcFor,
    templateAvatar(item) {
      return avatarSrcForSource(item, this.state.experts);
    },
    templateName(item) {
      return item.name.replace(/模板$/, "");
    },
    enabledChannels(item) {
      return (item.channels || []).filter((channel) => channel.enabled);
    },
    channelIcon(id) {
      return publicAsset(`/experts/channel-icons/${id}.svg`);
    },
    runningCount(item) {
      return (
        this.state.conversations.filter(
          (task) => task.expertId === item.id && task.status === "running",
        ).length +
        this.state.imChats.filter(
          (chat) => chat.expertId === item.id && chat.running,
        ).length +
        this.state.eventRuns.filter(
          (event) =>
            event.expertId === item.id &&
            event.runs.some((run) => run.status === "running"),
        ).length
      );
    },
    eventCount(item) {
      return this.state.eventRuns.filter((event) => event.expertId === item.id)
        .length;
    },
    goCreateProject() {
      this.$router.push({
        name: "projects",
        query: { create: "1", embed: this.$route.query.embed },
      });
    },
    openExpert(item) {
      this.$router.push({
        name: "expert",
        params: { id: item.id },
        query: { embed: this.$route.query.embed },
      });
    },
    openTemplate(item) {
      this.selectedTemplate = item;
      this.templateVisible = true;
    },
    startChat(item) {
      const conv = createConversation(item.id);
      this.$router.push({
        name: "chat",
        params: { id: item.id },
        query: { conv: conv.id, embed: this.$route.query.embed },
      });
    },
    useTemplate(item) {
      if (!item) return;
      this.templateId = item.id;
      this.templateVisible = false;
      this.createVisible = true;
    },
    onCommand(command, item) {
      if (command === "edit") {
        this.editingId = item.id;
        this.form = {
          name: item.name,
          description: item.description,
          model: item.model,
        };
        this.tagsText = item.tags.join(", ");
        this.editVisible = true;
      } else if (command === "publish") {
        publishTemplate(item.id);
        this.$message.success("已发布到演示模板库");
      } else
        this.$confirm(`确定删除“${item.name}”？`, "删除专家", {
          type: "warning",
        })
          .then(() => {
            deleteExpert(item.id);
            this.$message.success("已删除");
          })
          .catch(() => {});
    },
    clearForm() {
      this.editingId = "";
      this.form = { name: "", description: "", model: "通用大模型" };
      this.tagsText = "";
    },
    clearCreateRoute() {
      this.templateId = "";
      if (this.$route.query.create) {
        const query = { ...this.$route.query };
        delete query.create;
        this.$router.replace({ name: "experts", query }).catch(() => {});
      }
    },
    createExpert({ form, templateId, copyExpertId }) {
      const item = addExpert(form, templateId, copyExpertId);
      this.createVisible = false;
      this.templateId = "";
      this.$message.success("专家创建成功（演示）");
      this.openExpert(item);
    },
    saveEdit() {
      if (!this.form.name) return this.$message.warning("请填写专家名称");
      const payload = {
        ...this.form,
        tags: this.tagsText
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
      updateExpert(this.editingId, payload);
      this.editVisible = false;
      this.$message.success("已更新");
    },
  },
};
</script>
