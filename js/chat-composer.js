/**
 * 底部输入区组件（阶段2 三层布局）
 * 层级：附件预览区 / 输入框+操作按钮+状态提示 / 配置行（模型+工作目录）
 */
(function () {
  var ChatComposer = {
    props: {
      inputText: { type: String, default: '' },
      pendingFiles: { type: Array, default: function () { return []; } },
      sending: { type: Boolean, default: false },
      expertStatus: { type: String, default: 'idle' },
      remoteError: { type: String, default: '' },
      formatFileSizeFn: { type: Function, default: function (b) { return b + ' B'; } },
      modelList: { type: Array, default: function () { return []; } },
      modelOverride: { type: String, default: '' },
      sessionCwd: { type: String, default: '' },
      tokenEstimate: { type: Number, default: 0 },
      workspaceFiles: { type: Array, default: function () { return []; } }
    },
    emits: [
      'update:inputText', 'submit', 'interrupt',
      'fileSelect', 'removeFile',
      'selectModel', 'selectCwd', 'openWorkspace'
    ],
    data: function () {
      return {
        fileInputRef: null,
        showPathPopover: false,
        pathQuery: '',
        pathSelectedIndex: 0,
        pathAnchorPos: -1
      };
    },
    computed: {
      isRunning: function () {
        return this.expertStatus === 'running';
      },
      btnDisabled: function () {
        if (this.isRunning) return false;
        if (this.sending) return true;
        if (this.expertStatus === 'idle' && !this.inputText.trim() && !this.pendingFiles.length) return true;
        return false;
      },
      mainBtnTitle: function () {
        return this.isRunning ? '停止' : '发送 (Ctrl+Enter)';
      },
      placeholder: function () {
        if (this.expertStatus === 'hitl') return '请先回应专家的提问';
        if (this.expertStatus === 'error') return '专家出错，请重试';
        if (this.expertStatus === 'running') return '专家执行中，可点击停止';
        return '向专家发起任务指令…';
      },
      displayModel: function () {
        return this.modelOverride || 'gpt-4o';
      },
      cwdDisplay: function () {
        return this.sessionCwd || '工作空间';
      },
      tokenOverLimit: function () {
        return this.tokenEstimate > 4000;
      },
      tokenLabel: function () {
        if (this.tokenEstimate <= 0) return '';
        if (this.tokenEstimate >= 1000) {
          return (this.tokenEstimate / 1000).toFixed(1).replace(/\.0$/, '') + 'k tokens';
        }
        return this.tokenEstimate + ' tokens';
      },
      hintText: function () {
        if (this.expertStatus === 'hitl') return '请先回应上方卡片';
        if (this.expertStatus === 'error') return '可修改输入后重试';
        if (this.expertStatus === 'running') return '执行中 · 点击停止可中断';
        return 'Ctrl + Enter 发送 · Shift + Enter 换行 · @file: 引用文件';
      },
      filteredFiles: function () {
        var q = this.pathQuery.toLowerCase();
        var files = this.workspaceFiles || [];
        if (!q) return files.slice(0, 10);
        return files.filter(function (f) {
          return (f.name || '').toLowerCase().indexOf(q) >= 0 || (f.path || '').toLowerCase().indexOf(q) >= 0;
        }).slice(0, 10);
      }
    },
    methods: {
      onMainBtnClick: function () {
        if (this.isRunning) {
          this.$emit('interrupt');
          return;
        }
        this.onSubmit();
      },
      onSubmit: function () {
        if (this.btnDisabled) return;
        this.$emit('submit');
      },
      onCtrlEnter: function () {
        if (this.expertStatus === 'running' || this.expertStatus === 'hitl') return;
        this.onSubmit();
      },
      onSelectModel: function (id) {
        this.$emit('selectModel', id);
      },
      onSelectCwd: function (cwd) {
        if (cwd === '__workspace__') {
          this.$emit('openWorkspace');
          return;
        }
        if (cwd === '__root__') {
          this.$emit('selectCwd', '');
          return;
        }
        this.$emit('selectCwd', cwd);
      },
      onTriggerUpload: function () {
        if (this.fileInputRef) this.fileInputRef.click();
      },
      onFileSelect: function (ev) {
        this.$emit('fileSelect', ev);
      },
      onRemoveFile: function (id) {
        this.$emit('removeFile', id);
      },
      setFileInputRef: function (el) {
        this.fileInputRef = el;
      },
      fileIcon: function (f) {
        if (!f || !f.name) return '📄';
        var ext = (f.name.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') return '📕';
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return '📊';
        if (ext === 'zip' || ext === 'rar') return '📦';
        if (ext === 'md' || ext === 'txt') return '📝';
        return '📄';
      },
      imageDimLabel: function (f) {
        if (!f || !f.width || !f.height) return '';
        return f.width + '×' + f.height;
      },
      onTextInput: function (val) {
        this.$emit('update:inputText', val);
        // 检测 @file: 触发文件路径补全
        var match = this.detectFileTrigger(val);
        if (match) {
          this.pathQuery = match.query;
          this.pathAnchorPos = match.start;
          this.pathSelectedIndex = 0;
          this.showPathPopover = true;
        } else {
          this.showPathPopover = false;
        }
      },
      detectFileTrigger: function (text) {
        if (!text) return null;
        // 查找最后一个 @file: 且其后无空格/换行
        var idx = text.lastIndexOf('@file:');
        if (idx < 0) return null;
        var after = text.substring(idx + 6);
        // 如果 @file: 前有非空白字符（不是词首），则不触发
        if (idx > 0 && !/\s/.test(text[idx - 1])) return null;
        // 如果后面有换行或空格，说明已结束
        if (/\s/.test(after)) return null;
        return { start: idx, query: after };
      },
      pathKeydown: function (ev) {
        // Ctrl+Enter 始终触发提交
        if (ev.ctrlKey && ev.key === 'Enter') {
          ev.preventDefault();
          this.onCtrlEnter();
          return;
        }
        if (!this.showPathPopover || !this.filteredFiles.length) {
          return;
        }
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          this.pathSelectedIndex = (this.pathSelectedIndex + 1) % this.filteredFiles.length;
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          this.pathSelectedIndex = (this.pathSelectedIndex - 1 + this.filteredFiles.length) % this.filteredFiles.length;
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          this.selectPath(this.filteredFiles[this.pathSelectedIndex]);
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          this.showPathPopover = false;
        }
      },
      selectPath: function (file) {
        if (!file) return;
        var text = this.inputText;
        var insert = file.path || file.name;
        var newText = text.substring(0, this.pathAnchorPos) + '@file:' + insert + ' ' + text.substring(this.pathAnchorPos + 6 + this.pathQuery.length);
        this.$emit('update:inputText', newText);
        this.showPathPopover = false;
      },
      closePathPopover: function () {
        this.showPathPopover = false;
      },
      fileIconForPath: function (name) {
        if (!name) return '📄';
        var ext = (name.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') return '📕';
        if (ext === 'xlsx' || ext === 'xls') return '📊';
        if (ext === 'csv') return '📈';
        if (ext === 'md') return '📝';
        if (ext === 'json') return '🔧';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp') return '🖼️';
        return '📄';
      }
    },
    template: '\
      <div class="chat-input">\
        <div class="chat-composer">\
          <div v-if="pendingFiles.length" class="chat-pending-files">\
            <div v-for="f in pendingFiles" :key="f.id" class="chat-pending-file" :class="{ \'is-image\': f.kind === \'image\' }">\
              <img v-if="f.previewUrl" :src="f.previewUrl" class="chat-pending-file-thumb" :alt="f.name" />\
              <span v-else class="chat-pending-file-icon">{{ fileIcon(f) }}</span>\
              <div class="chat-pending-file-meta">\
                <span class="chat-pending-file-name" :title="f.name">{{ f.name }}</span>\
                <span class="chat-pending-file-size">\
                  {{ formatFileSizeFn(f.size) }}\
                  <template v-if="f.kind === \'image\' && imageDimLabel(f)"> · {{ imageDimLabel(f) }}</template>\
                </span>\
              </div>\
              <button type="button" class="chat-pending-file-remove" @click="onRemoveFile(f.id)" title="移除">×</button>\
            </div>\
          </div>\
          <div class="chat-composer-main">\
            <el-input\
              :model-value="inputText"\
              type="textarea"\
              :rows="2"\
              :autosize="{ minRows: 2, maxRows: 6 }"\
              :placeholder="placeholder"\
              :disabled="expertStatus === \'hitl\'"\
              class="chat-composer-textarea"\
              @update:model-value="onTextInput"\
              @keydown="pathKeydown"\
              @blur="closePathPopover" />\
            <div v-if="showPathPopover && filteredFiles.length" class="chat-path-popover">\
              <div class="chat-path-popover-head">文件路径补全</div>\
              <div\
                v-for="(f, idx) in filteredFiles"\
                :key="f.id || f.path"\
                class="chat-path-popover-item"\
                :class="{ \'is-active\': idx === pathSelectedIndex }"\
                @mousedown.prevent="selectPath(f)"\
                @mouseenter="pathSelectedIndex = idx">\
                <span class="chat-path-popover-icon">{{ fileIconForPath(f.name) }}</span>\
                <span class="chat-path-popover-name">{{ f.name }}</span>\
                <span class="chat-path-popover-path">{{ f.path || f.name }}</span>\
              </div>\
              <div v-if="!filteredFiles.length" class="chat-path-popover-empty">无匹配文件</div>\
            </div>\
            <div class="chat-composer-actions">\
              <input :ref="setFileInputRef" type="file" multiple class="chat-file-input-hidden" @change="onFileSelect" />\
              <button type="button" class="chat-upload-btn" :disabled="isRunning || expertStatus === \'hitl\'" @click="onTriggerUpload" title="上传文件">\
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\
              </button>\
              <button type="button" class="chat-send-btn" :class="{ loading: sending, \'is-stop\': isRunning }" :disabled="btnDisabled && !isRunning" @click="onMainBtnClick" :title="mainBtnTitle">\
                <svg v-if="isRunning" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>\
                <svg v-else-if="!sending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\
                <span v-else class="chat-send-spinner"></span>\
              </button>\
            </div>\
          </div>\
          <div class="chat-composer-hint" :class="{ \'is-hitl\': expertStatus === \'hitl\', \'is-error\': expertStatus === \'error\' }">\
            <span>{{ hintText }}</span>\
            <span v-if="tokenLabel" class="chat-token-est" :class="{ over: tokenOverLimit }">· {{ tokenLabel }}</span>\
          </div>\
          <div v-if="remoteError" class="task-remote-error">{{ remoteError }}</div>\
          <div class="chat-composer-config">\
            <el-dropdown trigger="click" @command="onSelectModel">\
              <span class="chat-config-trigger chat-config-model">\
                模型: {{ displayModel }} ▾\
              </span>\
              <template #dropdown>\
                <el-dropdown-menu>\
                  <el-dropdown-item\
                    v-for="m in modelList"\
                    :key="m.id"\
                    :command="m.id"\
                    :class="{ \'is-active\': m.id === displayModel }">\
                    {{ m.name }}\
                    <span v-if="m.reasoning" class="chat-config-tag">推理</span>\
                  </el-dropdown-item>\
                </el-dropdown-menu>\
              </template>\
            </el-dropdown>\
            <el-dropdown trigger="click" @command="onSelectCwd">\
              <span class="chat-config-trigger chat-config-cwd">\
                工作目录: {{ cwdDisplay }} ▾\
              </span>\
              <template #dropdown>\
                <el-dropdown-menu>\
                  <el-dropdown-item\
                    command="__root__"\
                    :class="{ \'is-active\': !sessionCwd }">\
                    工作空间\
                  </el-dropdown-item>\
                  <el-dropdown-item divided command="__workspace__">在工作空间中选择…</el-dropdown-item>\
                </el-dropdown-menu>\
              </template>\
            </el-dropdown>\
          </div>\
        </div>\
      </div>'
  };

  window.ChatComposer = ChatComposer;
})();
