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
      selectedFileId: { type: String, default: '' }
    },
    emits: ['toggle', 'select-cwd', 'preview-file'],
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
        return this.isFile && this.node.id === this.selectedFileId;
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
        if (this.isFolder) {
          this.$emit('toggle', this.node);
        } else if (this.isFile) {
          this.$emit('preview-file', this.node);
        }
      },
      onSetCwd: function (ev) {
        ev.stopPropagation();
        this.$emit('select-cwd', this.node);
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
            <span v-if="isCwd" class="ws-tree-cwd-star">★</span>\
            <span v-else>{{ isFolder ? (expanded ? \'📂\' : \'📁\') : fileIcon(node.name) }}</span>\
          </span>\
          <span class="ws-tree-name" :title="node.name">{{ node.name }}</span>\
          <button v-if="isFolder" type="button" class="ws-tree-setcwd-btn" title="设为当前工作目录" @click="onSetCwd">\
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
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
            :selected-file-id="selectedFileId"\
            @toggle="$emit(\'toggle\', $event)"\
            @select-cwd="$emit(\'select-cwd\', $event)"\
            @preview-file="$emit(\'preview-file\', $event)" />\
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
    emits: ['close', 'select-cwd', 'preview-file'],
    data: function () {
      return {
        expandedKeys: {},
        selectedFileId: ''
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
      isExpanded: function (folder) {
        return !!this.expandedKeys[folder.id] || folder.id === this.cwdFolderId;
      },
      isCwd: function (folder) {
        return folder.id === this.cwdFolderId;
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
      onPreviewFile: function (file) {
        this.selectedFileId = file.id;
        this.$emit('preview-file', file);
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
      }
    },
    template: '\
      <aside v-show="open" class="chat-workspace-panel">\
        <div class="chat-workspace-inner">\
          <div class="chat-workspace-head">\
            <div class="chat-workspace-head-body">\
              <span class="task-panel-title-icon">\
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
              </span>\
              <div class="chat-workspace-title-line">工作空间</div>\
              <div class="chat-workspace-subline">\
                <span class="chat-workspace-rootpath" :title="rootPath">{{ rootPath || \'未设置\' }}</span>\
              </div>\
            </div>\
            <button type="button" class="chat-workspace-close" title="关闭" @click="close">\
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\
            </button>\
          </div>\
          <div class="chat-workspace-tree">\
            <workspace-tree-node\
              v-for="node in tree"\
              :key="node.id"\
              :node="node"\
              :depth="0"\
              :expanded-keys="expandedKeys"\
              :cwd-folder-id="cwdFolderId"\
              :selected-file-id="selectedFileId"\
              @toggle="toggleFolder"\
              @select-cwd="onSetCwd"\
              @preview-file="onPreviewFile" />\
            <div v-if="tree.length === 0" class="chat-workspace-empty">\
              <div class="chat-workspace-empty-icon">📁</div>\
              <p>暂无工作空间数据</p>\
              <span>请检查工作空间根目录设置</span>\
            </div>\
          </div>\
          <div v-if="previewFile" class="chat-workspace-preview">\
            <div class="chat-workspace-preview-head">\
              <span class="chat-workspace-preview-title">{{ previewFile.name }}</span>\
              <span class="chat-workspace-preview-size">{{ fileSizeLabel(previewFile.size) }}</span>\
            </div>\
            <div class="chat-workspace-preview-body">\
              <img v-if="previewFile.kind === \'image\' && previewFile.previewUrl" :src="previewFile.previewUrl" :alt="previewFile.name" class="chat-workspace-preview-img" />\
              <pre v-else-if="previewFile.content" class="chat-workspace-preview-text">{{ previewFile.content }}</pre>\
              <div v-else class="chat-workspace-preview-binary">\
                <span class="chat-workspace-preview-binary-icon">{{ fileIcon(previewFile.name) }}</span>\
                <span>{{ previewFile.name }}</span>\
                <span class="chat-workspace-preview-binary-info">{{ fileSizeLabel(previewFile.size) }} · {{ previewFile.mime || \'未知类型\' }}</span>\
              </div>\
            </div>\
          </div>\
        </div>\
      </aside>'
  };

  window.ChatWorkspace = ChatWorkspace;
  window.WorkspaceTreeNode = WorkspaceTreeNode;
})();
