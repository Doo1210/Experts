/**
 * 工作空间侧边栏组件（阶段3）
 * PRD 第 9 节：目录树 + 内嵌文件 + cwd 高亮 + 文件预览
 */
(function () {
  // 递归树节点子组件（先定义，便于 ChatWorkspace 引用）
  var WorkspaceTreeNode = {
    name: 'WorkspaceTreeNode',
    props: {
      node: { type: Object, required: true },
      depth: { type: Number, default: 0 },
      expandedKeys: { type: Object, default: function () { return {}; } },
      cwdFolderId: { type: String, default: '' },
      selectedNodeId: { type: String, default: '' }
    },
    emits: ['toggle', 'select', 'select-cwd', 'preview-file', 'download-file'],
    computed: {
      isFolder: function () { return this.node.type === 'folder'; },
      isFile: function () { return this.node.type === 'file'; },
      expanded: function () {
        return !!this.expandedKeys[this.node.id] || this.node.id === this.cwdFolderId;
      },
      isCwd: function () {
        return this.isFolder && this.node.id === this.cwdFolderId;
      },
      isSelected: function () {
        return this.node.id === this.selectedNodeId;
      },
      indent: function () {
        return { paddingLeft: (this.depth * 14 + 8) + 'px' };
      }
    },
    methods: {
      fileIcon: function (name) {
        if (!name) return '📄';
        var ext = (name.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') return '📕';
        if (ext === 'xlsx' || ext === 'xls') return '📊';
        if (ext === 'csv') return '📈';
        if (ext === 'md') return '📝';
        if (ext === 'json') return '🔧';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp') return '🖼️';
        if (ext === 'zip' || ext === 'rar') return '📦';
        return '📄';
      },
      onClick: function () {
        this.$emit('select', this.node);
        if (this.isFolder) {
          this.$emit('toggle', this.node);
        } else if (this.isFile) {
          this.$emit('preview-file', this.node);
        }
      },
      onSetCwd: function (ev) {
        ev.stopPropagation();
        this.$emit('select-cwd', this.node);
      },
      onPreview: function (ev) {
        ev.stopPropagation();
        this.$emit('preview-file', this.node);
      },
      onDownload: function (ev) {
        ev.stopPropagation();
        this.$emit('download-file', this.node);
      }
    },
    template: '\
      <div class="ws-tree-node">\
        <div\
          class="ws-tree-row"\
          :class="{ \'is-folder\': isFolder, \'is-file\': isFile, \'is-cwd\': isCwd, \'is-selected\': isSelected }"\
          :style="indent"\
          role="button"\
          tabindex="0"\
          :aria-label="node.name + (isFolder ? \' 文件夹\' : \' 文件\')"\
          @click="onClick"\
          @keydown.enter="onClick">\
          <span v-if="isFolder" class="ws-tree-arrow" :class="{ expanded: expanded }">\
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>\
          </span>\
          <span v-else class="ws-tree-arrow-placeholder"></span>\
          <span class="ws-tree-icon">\
            <svg v-if="isFolder && isCwd" class="ws-tree-folder-icon is-cwd" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>\
            </svg>\
            <span v-else-if="isFolder">{{ expanded ? \'📂\' : \'📁\' }}</span>\
            <span v-else>{{ fileIcon(node.name) }}</span>\
          </span>\
          <span class="ws-tree-name" :title="node.name">{{ node.name }}</span>\
          <button v-if="isFile" type="button" class="ws-tree-setcwd-btn" title="预览" @click="onPreview">\
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>\
          </button>\
          <button v-if="isFile" type="button" class="ws-tree-setcwd-btn" title="下载" @click="onDownload">\
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
          </button>\
          <button v-if="isFolder" type="button" class="ws-tree-setcwd-btn" title="设为当前任务工作目录" @click="onSetCwd">\
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
          </button>\
        </div>\
        <div v-if="isFolder && expanded && node.children && node.children.length" class="ws-tree-children">\
          <workspace-tree-node\
            v-for="child in node.children"\
            :key="child.id"\
            :node="child"\
            :depth="depth + 1"\
            :expanded-keys="expandedKeys"\
            :cwd-folder-id="cwdFolderId"\
            :selected-node-id="selectedNodeId"\
            @toggle="$emit(\'toggle\', $event)"\
            @select="$emit(\'select\', $event)"\
            @select-cwd="$emit(\'select-cwd\', $event)"\
            @preview-file="$emit(\'preview-file\', $event)"\
            @download-file="$emit(\'download-file\', $event)" />\
        </div>\
      </div>'
  };
  // 支持递归自引用
  WorkspaceTreeNode.components = { WorkspaceTreeNode: WorkspaceTreeNode };

  var ChatWorkspace = {
    components: { WorkspaceTreeNode: WorkspaceTreeNode },
    props: {
      open: { type: Boolean, default: false },
      rootPath: { type: String, default: '' },
      tree: { type: Array, default: function () { return []; } },
      sessionCwd: { type: String, default: '' },
      previewFile: { type: Object, default: null }
    },
    emits: ['close', 'select-cwd', 'preview-file', 'download-file', 'create-folder', 'upload-file'],
    data: function () {
      return {
        expandedKeys: {},
        selectedNodeId: '',
        fileInputRef: null,
        folderDialogVisible: false,
        folderName: '',
        folderDialogParentId: null,
        folderDialogTargetName: '工作空间'
      };
    },
    computed: {
      cwdFolderId: function () {
        var cwd = this.sessionCwd;
        if (!cwd) return '';
        var found = '';
        function walk(nodes) {
          for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].type === 'folder' && nodes[i].name === cwd) {
              found = nodes[i].id;
              return;
            }
            if (nodes[i].children) walk(nodes[i].children);
          }
        }
        walk(this.tree);
        return found;
      },
      // 上传文件 / 新建文件夹的目标目录：
      // 1) 选中了文件夹 → 在该文件夹下
      // 2) 选中了文件 → 在该文件所在目录（父文件夹）下
      // 3) 选中了根目录 → 工作空间根目录
      // 4) 未选中 → 当前任务工作目录（cwd）文件夹
      // 5) 都没有 → 工作空间根目录
      targetFolderId: function () {
        var sel = this.selectedNodeId;
        if (sel) {
          if (sel === '__root__') return null;
          var node = this.findNode(this.tree, sel);
          if (node) {
            if (node.type === 'folder') return node.id;
            var parent = this.findParentFolder(this.tree, sel);
            if (parent) return parent.id;
          }
        }
        if (this.cwdFolderId) return this.cwdFolderId;
        return null;
      },
      targetFolderName: function () {
        var tid = this.targetFolderId;
        if (!tid) return '工作空间';
        var node = this.findNode(this.tree, tid);
        return node ? node.name : '工作空间';
      },
      isRootCwd: function () {
        return !this.sessionCwd;
      },
      isRootSelected: function () {
        return this.selectedNodeId === '__root__';
      },
      previewDialogVisible: {
        get: function () { return !!this.previewFile; },
        set: function (val) { if (!val) this.$emit('preview-file', null); }
      }
    },
    watch: {
      open: function (val) {
        if (val) this.expandCwdAncestors();
      },
      sessionCwd: function () {
        if (this.open) this.expandCwdAncestors();
      },
      tree: function () {
        if (this.open) this.expandCwdAncestors();
      }
    },
    mounted: function () {
      if (this.open) this.expandCwdAncestors();
    },
    methods: {
      close: function () { this.$emit('close'); },
      toggleFolder: function (folder) {
        var k = folder.id;
        if (this.expandedKeys[k]) {
          var copy = Object.assign({}, this.expandedKeys);
          delete copy[k];
          this.expandedKeys = copy;
        } else {
          var patch = {};
          patch[k] = true;
          this.expandedKeys = Object.assign({}, this.expandedKeys, patch);
        }
      },
      onSelectNode: function (node) {
        if (node && node.id) this.selectedNodeId = node.id;
        if (node && node.type === 'folder') {
          this.$emit('preview-file', null);
        }
      },
      selectRoot: function () {
        this.selectedNodeId = '__root__';
        this.$emit('preview-file', null);
      },
      onTreeBlankClick: function (ev) {
        if (ev.target.closest('.ws-tree-row')) return;
        this.selectRoot();
      },
      isExpanded: function (folder) {
        return !!this.expandedKeys[folder.id] || folder.id === this.cwdFolderId;
      },
      isCwd: function (folder) {
        return folder.id === this.cwdFolderId;
      },
      findNode: function (nodes, id) {
        if (!nodes || !id) return null;
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].id === id) return nodes[i];
          if (nodes[i].children) {
            var found = this.findNode(nodes[i].children, id);
            if (found) return found;
          }
        }
        return null;
      },
      findParentFolder: function (nodes, id) {
        if (!nodes || !id) return null;
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].id === id) return null;
          if (nodes[i].children) {
            for (var j = 0; j < nodes[i].children.length; j++) {
              if (nodes[i].children[j].id === id) return nodes[i];
            }
            var found = this.findParentFolder(nodes[i].children, id);
            if (found) return found;
          }
        }
        return null;
      },
      expandCwdAncestors: function () {
        var targetId = this.cwdFolderId;
        if (!targetId) return;
        var chain = [];
        function find(nodes, path) {
          for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var cur = path.concat([n]);
            if (n.id === targetId) { chain = cur; return true; }
            if (n.children && find(n.children, cur)) return true;
          }
          return false;
        }
        find(this.tree, []);
        var next = Object.assign({}, this.expandedKeys);
        for (var i = 0; i < chain.length - 1; i++) {
          next[chain[i].id] = true;
        }
        this.expandedKeys = next;
        var self = this;
        this.$nextTick(function () {
          var el = self.$refs['cwd-node'];
          if (el && el.scrollIntoView) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        });
      },
      onSetCwd: function (folder) {
        this.$emit('select-cwd', folder.name);
      },
      onSetRootCwd: function (ev) {
        ev.stopPropagation();
        this.$emit('select-cwd', '');
      },
      onPreviewFile: function (file) {
        if (file && file.id) this.selectedNodeId = file.id;
        this.$emit('preview-file', file);
      },
      onDownloadFile: function (file) {
        if (!file) return;
        if (file.id) this.selectedNodeId = file.id;
        this.$emit('download-file', file);
      },
      handleCreateFolder: function () {
        this.folderDialogParentId = this.targetFolderId;
        this.folderDialogTargetName = this.targetFolderName;
        this.folderName = '';
        this.folderDialogVisible = true;
      },
      onFolderDialogOpened: function () {
        var self = this;
        this.$nextTick(function () {
          var input = self.$refs.folderNameInput;
          if (input && input.focus) input.focus();
        });
      },
      submitCreateFolder: function () {
        var name = (this.folderName || '').trim();
        if (!name) {
          ElementPlus.ElMessage.warning('请输入文件夹名称');
          return;
        }
        var parentId = this.folderDialogParentId;
        if (parentId) {
          this.expandedKeys = Object.assign({}, this.expandedKeys, (function () { var p = {}; p[parentId] = true; return p; })());
        }
        this.$emit('create-folder', { name: name, parentId: parentId });
        this.folderDialogVisible = false;
        this.folderName = '';
      },
      handleUploadFile: function () {
        if (!this.fileInputRef) {
          this.fileInputRef = document.createElement('input');
          this.fileInputRef.type = 'file';
          this.fileInputRef.multiple = true;
          this.fileInputRef.style.display = 'none';
          var self = this;
          this.fileInputRef.addEventListener('change', function () {
            self.onFileInputChange();
          });
          document.body.appendChild(this.fileInputRef);
        }
        this.fileInputRef.value = '';
        this.fileInputRef.click();
      },
      onFileInputChange: function () {
        if (!this.fileInputRef || !this.fileInputRef.files || !this.fileInputRef.files.length) return;
        var parentId = this.targetFolderId;
        if (parentId) this.expandedKeys = Object.assign({}, this.expandedKeys, (function () { var p = {}; p[parentId] = true; return p; })());
        var files = [];
        for (var i = 0; i < this.fileInputRef.files.length; i++) {
          var f = this.fileInputRef.files[i];
          files.push({ name: f.name, size: f.size });
        }
        this.$emit('upload-file', { files: files, parentId: parentId });
      },
      fileIcon: function (name) {
        if (!name) return '📄';
        var ext = (name.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') return '📕';
        if (ext === 'xlsx' || ext === 'xls') return '📊';
        if (ext === 'csv') return '📈';
        if (ext === 'md') return '📝';
        if (ext === 'json') return '🔧';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp') return '🖼️';
        if (ext === 'zip' || ext === 'rar') return '📦';
        return '📄';
      },
      fileSizeLabel: function (bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      },
      isImageFile: function (file) {
        if (!file) return false;
        if (file.kind === 'image') return true;
        if (file.mime && file.mime.indexOf('image/') === 0) return true;
        var ext = (file.name.split('.').pop() || '').toLowerCase();
        return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].indexOf(ext) >= 0;
      },
      closePreview: function () {
        this.$emit('preview-file', null);
      },
      downloadFile: function () {
        if (window.AppShared && window.AppShared.downloadWorkspaceFile) {
          window.AppShared.downloadWorkspaceFile(this.previewFile);
        }
      }
    },
    template: '\
      <aside v-show="open" class="chat-workspace-panel">\
        <div class="chat-workspace-inner">\
          <div class="chat-workspace-head">\
            <div class="chat-workspace-head-body" :class="{ \'is-selected\': isRootSelected, \'is-cwd\': isRootCwd }" role="button" tabindex="0" @click="selectRoot" @keydown.enter="selectRoot">\
              <span class="task-panel-title-icon">\
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
              </span>\
              <div class="chat-workspace-title-line">工作空间</div>\
              <button v-if="!isRootCwd" type="button" class="ws-head-setcwd-btn" title="设为当前任务工作目录" @click="onSetRootCwd">\
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
              </button>\
            </div>\
            <div class="chat-workspace-head-actions">\
              <button type="button" class="ws-head-btn" :title="\'上传文件到「\'+targetFolderName+\'』\'" @click="handleUploadFile">\
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
              </button>\
              <button type="button" class="ws-head-btn" :title="\'在「\'+targetFolderName+\'」下新建文件夹\'" @click="handleCreateFolder">\
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>\
              </button>\
              <button type="button" class="chat-workspace-close" title="关闭" @click="close">\
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\
              </button>\
            </div>\
          </div>\
          <div class="chat-workspace-tree" @click="onTreeBlankClick">\
            <workspace-tree-node\
              v-for="node in tree"\
              :key="node.id"\
              :node="node"\
              :depth="0"\
              :expanded-keys="expandedKeys"\
              :cwd-folder-id="cwdFolderId"\
              :selected-node-id="selectedNodeId"\
              @toggle="toggleFolder"\
              @select="onSelectNode"\
              @select-cwd="onSetCwd"\
              @preview-file="onPreviewFile"\
              @download-file="onDownloadFile" />\
            <div v-if="tree.length === 0" class="chat-workspace-empty">\
              <div class="chat-workspace-empty-icon">📁</div>\
              <p>暂无工作空间数据</p>\
              <span>请检查工作空间根目录设置</span>\
            </div>\
          </div>\
        </div>\
        <el-dialog v-model="previewDialogVisible" width="720px" class="form-dialog ws-preview-dialog" append-to-body>\
          <template #header>\
            <div class="dialog-header-custom dialog-header-workspace">\
              <div class="dialog-header-icon dialog-header-icon-workspace">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">\
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
                  <polyline points="14 2 14 8 20 8"/>\
                </svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">{{ previewFile ? previewFile.name : \'\' }}</div>\
                <div class="dialog-header-sub">{{ previewFile ? (fileSizeLabel(previewFile.size) + \' · \' + (previewFile.mime || \'未知类型\') + \' · 只读预览\') : \'\' }}</div>\
              </div>\
            </div>\
          </template>\
          <div v-if="previewFile" class="ws-preview-body">\
            <img v-if="isImageFile(previewFile) && previewFile.previewUrl" :src="previewFile.previewUrl" :alt="previewFile.name" class="ws-preview-img" />\
            <pre v-else-if="previewFile.content" class="ws-preview-text" readonly>{{ previewFile.content }}</pre>\
            <div v-else class="ws-preview-binary">\
              <span class="ws-preview-binary-icon">{{ fileIcon(previewFile.name) }}</span>\
              <span class="ws-preview-binary-name">{{ previewFile.name }}</span>\
              <span class="ws-preview-binary-info">该文件类型暂不支持预览，可下载后查看</span>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="closePreview">关闭</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit" @click="downloadFile">\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px">\
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>\
                    <polyline points="7 10 12 15 17 10"/>\
                    <line x1="12" y1="15" x2="12" y2="3"/>\
                  </svg>下载\
                </el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="folderDialogVisible" width="420px" class="form-dialog form-dialog-sm ws-folder-dialog" :close-on-click-modal="false" append-to-body @opened="onFolderDialogOpened">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-workspace">\
              <div class="dialog-header-icon dialog-header-icon-workspace">\
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">\
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>\
                  <line x1="12" y1="11" x2="12" y2="17"/>\
                  <line x1="9" y1="14" x2="15" y2="14"/>\
                </svg>\
              </div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">新建文件夹</div>\
                <div class="dialog-header-sub">整理工作空间中的文件与任务产物</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body ws-folder-dialog-body">\
            <div class="ws-folder-target">\
              <span class="ws-folder-target-label">目标位置</span>\
              <span class="ws-folder-target-path" :title="folderDialogTargetName">\
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
                {{ folderDialogTargetName }}\
              </span>\
            </div>\
            <el-form label-position="top" class="form-dialog-form ws-folder-form" @submit.prevent="submitCreateFolder">\
              <el-form-item label="文件夹名称" required>\
                <el-input ref="folderNameInput" v-model="folderName" placeholder="例如：分析报告、原始数据" maxlength="60" show-word-limit clearable @keyup.enter="submitCreateFolder" />\
              </el-form-item>\
            </el-form>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="folderDialogVisible = false">取消</el-button>\
                <el-button type="primary" class="wizard-btn wizard-btn-submit" :disabled="!folderName.trim()" @click="submitCreateFolder">创建</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
      </aside>'
  };

  window.ChatWorkspace = ChatWorkspace;
  window.WorkspaceTreeNode = WorkspaceTreeNode;
})();
