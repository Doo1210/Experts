<template>
  <div class="workspace-panel">
    <div class="section-heading">
      <div>
        <h2>工作空间</h2>
        <p>
          集中管理专家执行任务时使用的文件与资料，也可按需要划分不同文件夹。
        </p>
      </div>
    </div>
    <div class="workspace-action-bar">
      <div class="workspace-breadcrumb">
        <button
          type="button"
          class="workspace-root"
          :title="expert.workspaceRoot"
          @click="folderId = null"
        >
          workspace</button
        ><template v-for="part in crumbs"
          ><span :key="part.id + '-slash'" class="workspace-slash">/</span
          ><button :key="part.id" type="button" @click="folderId = part.id">
            {{ part.name }}
          </button></template
        ><span class="workspace-count"
          >{{ folderCount }} 个文件夹 · {{ fileCount }} 个文件</span
        >
      </div>
      <div class="workspace-bar-actions">
        <el-button v-if="selected.length" size="mini" @click="downloadZip"
          >下载 ZIP ({{ selected.length }})</el-button
        ><el-button
          v-if="selected.length"
          size="mini"
          type="danger"
          plain
          @click="deleteSelected"
          >删除 ({{ selected.length }})</el-button
        ><el-button size="mini" @click="newFolder">新建文件夹</el-button
        ><el-button type="primary" size="mini" @click="$refs.upload.click()"
          >上传文件</el-button
        >
      </div>
    </div>
    <input ref="upload" type="file" multiple hidden @change="uploadFiles" />
    <div class="workspace-table">
      <div class="workspace-table-head">
        <el-checkbox
          :value="allSelected"
          :indeterminate="someSelected && !allSelected"
          aria-label="全选当前列表"
          @change="toggleAll"
        /><span>名称</span><span>类型</span><span>更新时间</span
        ><span>大小</span><span>操作</span>
      </div>
      <div class="workspace-table-scroll">
        <div v-for="item in items" :key="item.id" class="workspace-table-row">
          <el-checkbox
            :value="selected.includes(item.id)"
            :aria-label="`选择${item.name}`"
            @change="toggle(item.id)"
          />
          <button
            type="button"
            class="workspace-file-name"
            :title="item.name"
            @click="item.kind === 'folder' ? enter(item) : preview(item)"
          >
            <span
              class="workspace-file-icon"
              :class="{ folder: item.kind === 'folder' }"
              ><span v-if="item.kind === 'folder'">📁</span
              ><i v-else class="el-icon-document" /></span
            ><strong>{{ item.name }}</strong>
          </button>
          <span class="workspace-cell-muted">{{ fileType(item) }}</span
          ><span
            class="workspace-cell-muted workspace-date"
            :title="displayTime(item)"
            >{{ displayTime(item) }}</span
          ><span class="workspace-cell-muted">{{ fileSize(item) }}</span>
          <div class="workspace-row-actions">
            <el-button
              v-if="item.kind === 'file'"
              type="text"
              @click="preview(item)"
              >预览</el-button
            ><el-button
              v-if="item.kind === 'file'"
              type="text"
              @click="download(item)"
              >下载</el-button
            ><el-button type="text" @click="rename(item)">重命名</el-button
            ><el-button
              type="text"
              class="workspace-delete"
              @click="deleteOne(item)"
              >删除</el-button
            >
          </div>
        </div>
        <el-empty v-if="!items.length" description="当前目录为空" />
      </div>
    </div>
    <el-dialog
      :visible.sync="workspaceDialogVisible"
      width="420px"
      custom-class="manage-dialog workspace-form-dialog"
      :close-on-click-modal="false"
    >
      <div slot="title" class="workspace-dialog-title">
        <span class="workspace-dialog-icon"
          ><i
            :class="
              workspaceDialogMode === 'new'
                ? 'el-icon-folder-add'
                : 'el-icon-edit'
            " /></span
        ><span
          ><strong>{{
            workspaceDialogMode === "new"
              ? "新建文件夹"
              : `重命名${workspaceDialogItem && workspaceDialogItem.kind === "folder" ? "文件夹" : "文件"}`
          }}</strong
          ><small>{{
            workspaceDialogMode === "new"
              ? "整理工作空间中的文件与任务产物"
              : "修改文件显示名称"
          }}</small></span
        >
      </div>
      <el-form label-position="top" @submit.native.prevent="saveWorkspaceName"
        ><el-form-item
          :label="workspaceDialogMode === 'new' ? '文件夹名称' : '名称'"
          required
          ><el-input
            v-model="workspaceName"
            maxlength="60"
            show-word-limit
            :placeholder="
              workspaceDialogMode === 'new'
                ? '例如：分析报告、原始数据'
                : '输入新名称'
            " /></el-form-item
      ></el-form>
      <span slot="footer"
        ><el-button @click="workspaceDialogVisible = false">取消</el-button
        ><el-button
          type="primary"
          :disabled="!workspaceName.trim()"
          @click="saveWorkspaceName"
          >保存</el-button
        ></span
      >
    </el-dialog>
    <el-dialog
      :title="previewTitle"
      :visible.sync="previewVisible"
      width="580px"
      custom-class="manage-dialog manage-preview-dialog"
      ><div slot="title" class="workspace-dialog-title">
        <span class="workspace-dialog-icon"><i class="el-icon-document" /></span
        ><span
          ><strong>{{ previewTitle }}</strong
          ><small>{{
            previewItem
              ? `${fileType(previewItem)} · ${displayTime(previewItem)} · 只读预览`
              : "只读预览"
          }}</small></span
        >
      </div>
      <div class="workspace-preview-body">
        <img v-if="previewUrl" :src="previewUrl" class="image-preview" />
        <pre v-else class="text-preview">{{ previewText }}</pre>
      </div>
      <span slot="footer"
        ><el-button @click="previewVisible = false">关闭</el-button
        ><el-button type="primary" @click="download(previewItem)"
          ><i class="el-icon-download" /> 下载</el-button
        ></span
      ></el-dialog
    >
  </div>
</template>

<script>
import JSZip from "jszip";
import { addWorkspaceItem, removeWorkspaceItems, persist } from "../state";
import { saveFile, readFile, deleteFile } from "../file-db";

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default {
  name: "DemoWorkspace",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      folderId: null,
      selected: [],
      previewVisible: false,
      previewItem: null,
      previewTitle: "",
      previewText: "",
      previewUrl: "",
      workspaceDialogVisible: false,
      workspaceDialogMode: "new",
      workspaceDialogItem: null,
      workspaceName: "",
    };
  },
  computed: {
    folderCount() {
      return this.expert.files.filter((item) => item.kind === "folder").length;
    },
    fileCount() {
      return this.expert.files.filter((item) => item.kind === "file").length;
    },
    items() {
      return this.expert.files
        .filter((item) => item.parentId === this.folderId)
        .sort((a, b) =>
          a.kind === b.kind
            ? a.name.localeCompare(b.name)
            : a.kind === "folder"
              ? -1
              : 1,
        );
    },
    crumbs() {
      const out = [];
      let id = this.folderId;
      while (id) {
        const item = this.expert.files.find((x) => x.id === id);
        if (!item) break;
        out.unshift(item);
        id = item.parentId;
      }
      return out;
    },
    allSelected() {
      return (
        !!this.items.length &&
        this.items.every((item) => this.selected.includes(item.id))
      );
    },
    someSelected() {
      return this.items.some((item) => this.selected.includes(item.id));
    },
  },
  beforeDestroy() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  },
  methods: {
    fileType(item) {
      return item.kind === "folder"
        ? "文件夹"
        : item.name.split(".").pop().toLowerCase();
    },
    displayTime(item) {
      return item.updatedAt
        ? new Date(item.updatedAt).toLocaleString("zh-CN", { hour12: false })
        : "2026-10-10 08:50:01";
    },
    fileSize(item) {
      if (item.kind === "folder") return "-";
      const bytes =
        item.size ?? new TextEncoder().encode(item.content || "").length;
      return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
    },
    changeRoot() {
      this.$prompt(
        "新的工作空间根路径；已有对话工作目录不会自动迁移",
        "更改根路径",
        {
          inputValue: this.expert.workspaceRoot,
          customClass: "manage-message-box",
        },
      )
        .then(({ value }) => {
          if (!value.trim().startsWith("/"))
            return this.$message.warning("请输入以 / 开头的路径");
          this.expert.workspaceRoot = value.trim();
          persist();
          this.$message.success("演示根路径已更新");
        })
        .catch(() => {});
    },
    enter(item) {
      this.folderId = item.id;
      this.selected = [];
    },
    toggle(id) {
      this.selected = this.selected.includes(id)
        ? this.selected.filter((x) => x !== id)
        : [...this.selected, id];
    },
    toggleAll(value) {
      this.selected = value ? this.items.map((item) => item.id) : [];
    },
    newFolder() {
      this.workspaceDialogMode = "new";
      this.workspaceDialogItem = null;
      this.workspaceName = "";
      this.workspaceDialogVisible = true;
    },
    rename(item) {
      this.workspaceDialogMode = "rename";
      this.workspaceDialogItem = item;
      this.workspaceName = item.name;
      this.workspaceDialogVisible = true;
    },
    saveWorkspaceName() {
      const value = this.workspaceName.trim();
      if (!value) return this.$message.warning("请输入名称");
      if (/[/\\:*?"<>|]/.test(value))
        return this.$message.warning("名称包含非法字符");
      if (
        this.items.some(
          (item) =>
            item.name === value && item.id !== this.workspaceDialogItem?.id,
        )
      )
        return this.$message.warning("名称已存在");
      if (this.workspaceDialogMode === "new") {
        const folder = addWorkspaceItem(this.expert.id, {
          name: value,
          parentId: this.folderId,
          kind: "folder",
        });
        this.$set(folder, "updatedAt", new Date().toISOString());
      } else {
        this.workspaceDialogItem.name = value;
        this.$set(
          this.workspaceDialogItem,
          "updatedAt",
          new Date().toISOString(),
        );
      }
      persist();
      this.workspaceDialogVisible = false;
    },
    async uploadFiles(event) {
      const files = [...event.target.files];
      for (const file of files) {
        if (this.items.some((item) => item.name === file.name)) {
          this.$message.warning(`${file.name} 已存在`);
          continue;
        }
        const entry = addWorkspaceItem(this.expert.id, {
          name: file.name,
          parentId: this.folderId,
          kind: "file",
        });
        try {
          await saveFile(entry.id, file);
          this.$set(entry, "size", file.size);
          this.$set(entry, "updatedAt", new Date().toISOString());
          persist();
        } catch (error) {
          removeWorkspaceItems(this.expert.id, [entry.id]);
          this.$message.error(`无法保存 ${file.name}`);
        }
      }
      event.target.value = "";
      if (files.length) this.$message.success("上传已保存到浏览器演示数据");
    },
    async getBlob(item) {
      return (
        (await readFile(item.id)) ||
        new Blob([item.content || ""], {
          type: item.name.endsWith(".csv") ? "text/csv" : "text/plain",
        })
      );
    },
    async preview(item) {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = "";
      this.previewTitle = item.name;
      this.previewItem = item;
      const blob = await this.getBlob(item);
      if (blob.type.startsWith("image/"))
        this.previewUrl = URL.createObjectURL(blob);
      else this.previewText = await blob.text();
      this.previewVisible = true;
    },
    async download(item) {
      saveBlob(await this.getBlob(item), item.name);
    },
    descendants(id) {
      const children = this.expert.files.filter((item) => item.parentId === id);
      return children.flatMap((item) => [item, ...this.descendants(item.id)]);
    },
    async downloadZip() {
      const zip = new JSZip();
      const selected = new Set(this.selected);
      const roots = this.expert.files.filter(
        (item) =>
          selected.has(item.id) &&
          !this.ancestors(item).some((parent) => selected.has(parent.id)),
      );
      const add = async (item, path) => {
        const nextPath = path ? `${path}/${item.name}` : item.name;
        if (item.kind === "folder") {
          zip.folder(nextPath);
          for (const child of this.expert.files.filter(
            (x) => x.parentId === item.id,
          ))
            await add(child, nextPath);
        } else zip.file(nextPath, await this.getBlob(item));
      };
      for (const item of roots) await add(item, "");
      saveBlob(
        await zip.generateAsync({ type: "blob" }),
        "工作空间演示文件.zip",
      );
    },
    ancestors(item) {
      const out = [];
      let id = item.parentId;
      while (id) {
        const parent = this.expert.files.find((x) => x.id === id);
        if (!parent) break;
        out.push(parent);
        id = parent.parentId;
      }
      return out;
    },
    async deleteIds(ids) {
      const all = new Set(ids);
      ids.forEach((id) =>
        this.descendants(id).forEach((item) => all.add(item.id)),
      );
      for (const id of all) await deleteFile(id).catch(() => {});
      removeWorkspaceItems(this.expert.id, ids);
      this.selected = this.selected.filter((id) => !all.has(id));
      this.$message.success("已删除演示文件");
    },
    deleteSelected() {
      this.$confirm(
        `确定删除选中的 ${this.selected.length} 项？文件夹内的文件和子文件夹将一并删除，且无法恢复。`,
        "批量删除",
        {
          type: "warning",
          customClass: "manage-message-box workspace-delete-box",
          confirmButtonText: "删除",
        },
      )
        .then(() => this.deleteIds(this.selected))
        .catch(() => {});
    },
    deleteOne(item) {
      this.$confirm(
        item.kind === "folder"
          ? `确定删除文件夹「${item.name}」？文件夹内的文件和子文件夹将一并删除，且无法恢复。`
          : `确定删除文件「${item.name}」？删除后无法恢复。`,
        item.kind === "folder" ? "删除文件夹" : "删除文件",
        {
          type: "warning",
          customClass: "manage-message-box workspace-delete-box",
          confirmButtonText: "删除",
        },
      )
        .then(() => this.deleteIds([item.id]))
        .catch(() => {});
    },
  },
};
</script>
