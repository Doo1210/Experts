/**
 * 应用共享工具与基础组件
 */
(function () {
  var catalog = window;

  function createChatFileUpload() {
    var pendingFiles = Vue.ref([]);
    var fileInputRef = Vue.ref(null);

    function triggerFileUpload() {
      if (fileInputRef.value) fileInputRef.value.click();
    }

    function handleFileSelect(ev) {
      var files = ev.target.files;
      if (!files) return;
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        pendingFiles.value.push({
          id: 'f_' + Date.now() + '_' + i,
          name: f.name,
          size: f.size
        });
      }
      ev.target.value = '';
    }

    function removePendingFile(id) {
      pendingFiles.value = pendingFiles.value.filter(function (f) { return f.id !== id; });
    }

    function takePendingFiles() {
      var files = pendingFiles.value.slice();
      pendingFiles.value = [];
      return files;
    }

    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    return {
      pendingFiles: pendingFiles,
      fileInputRef: fileInputRef,
      triggerFileUpload: triggerFileUpload,
      handleFileSelect: handleFileSelect,
      removePendingFile: removePendingFile,
      takePendingFiles: takePendingFiles,
      formatFileSize: formatFileSize
    };
  }

  function decodeRoutePart(value) {
    try {
      return decodeURIComponent(value || '');
    } catch (_ignore) {
      return value || '';
    }
  }

  function parseRoute() {
    var hash = location.hash.slice(1) || '/experts';
    var parts = hash.split('?')[0].split('/').filter(Boolean);
    var query = {};
    if (location.hash.indexOf('?') >= 0) {
      location.hash.split('?')[1].split('&').forEach(function (p) {
        var kv = p.split('=');
        query[kv[0]] = decodeURIComponent(kv[1] || '');
      });
    }
    var r = { name: 'experts', params: {}, query: query };
    if (parts[0] === 'experts') {
      if (parts.length === 1) r.name = 'experts';
      else if (parts[1] === 'new') {
        r.name = 'experts';
        r.query.create = '1';
      } else if (parts[2] === 'tasks') {
        r.name = 'expert-tasks';
        r.params.id = decodeRoutePart(parts[1]);
        r.params.taskId = parts[3] ? decodeRoutePart(parts[3]) : null;
      } else {
        r.name = 'expert-detail';
        r.params.id = decodeRoutePart(parts[1]);
      }
    } else if (parts[0] === 'projects') {
      if (parts.length === 1) r.name = 'projects';
      else if (parts[1] === 'new') {
        r.name = 'projects';
        r.query.create = '1';
      } else {
        r.name = 'project-detail';
        r.params.id = decodeRoutePart(parts[1]);
      }
    }
    return r;
  }

  function nav(path) {
    location.hash = path;
  }

  var BackLink = {
    props: {
      label: { type: String, default: '返回' },
      inline: { type: Boolean, default: false }
    },
    emits: ['click'],
    template: '\
      <a\
        class="back-link"\
        :class="{ \'back-link-inline\': inline }"\
        :title="label"\
        :aria-label="label"\
        href="#"\
        @click.prevent="$emit(\'click\')">\
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>\
      </a>'
  };

  var AppSidebar = {
    props: ['active'],
    template: '\
      <aside class="platform-sidebar">\
        <nav class="sidebar-nav">\
          <a class="nav-item" :class="{ active: active === \'experts\' }" @click.prevent="$emit(\'nav\', \'/experts\')">👤 专家</a>\
          <a class="nav-item" :class="{ active: active === \'projects\' }" @click.prevent="$emit(\'nav\', \'/projects\')">📁 项目</a>\
        </nav>\
      </aside>'
  };

  var PROJECT_ICON_PRESETS = ['📁', '🏭', '📊', '🔧', '⚙️', '🎯', '📋', '🚀', '💡', '🔬'];

  function isProjectIconImage(icon) {
    return !!(icon && String(icon).indexOf('data:image') === 0);
  }

  function inferProjectFileType(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return 'spreadsheet';
    if (ext === 'csv' || ext === 'json') return 'data';
    return 'document';
  }

  function readUploadedFileContent(file, callback) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var textExts = ['md', 'txt', 'csv', 'json', 'log', 'xml', 'html', 'js', 'ts', 'py'];
    var reader = new FileReader();
    reader.onload = function (ev) { callback(ev.target.result); };
    reader.onerror = function () { callback(''); };
    if (textExts.indexOf(ext) >= 0 || (file.type && file.type.indexOf('text/') === 0)) {
      reader.readAsText(file);
    } else {
      callback('已上传文件：' + file.name);
    }
  }

  function expertMatchesSearch(expert, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    if (expert.name && expert.name.toLowerCase().indexOf(q) !== -1) return true;
    if (expert.description && expert.description.toLowerCase().indexOf(q) !== -1) return true;
    if (expert.expertise && expert.expertise.some(function (tag) {
      return tag.toLowerCase().indexOf(q) !== -1;
    })) return true;
    return false;
  }

  var CreateActionBtn = {
    props: {
      label: { type: String, required: true },
      theme: { type: String, default: 'expert' },
      soft: { type: Boolean, default: false }
    },
    emits: ['click'],
    template: '\
      <button\
        type="button"\
        class="page-create-btn"\
        :class="[\'page-create-btn-\' + theme, { \'page-create-btn-soft\': soft }]"\
        @click="$emit(\'click\')">\
        <span class="page-create-btn-icon-wrap">\
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">\
            <path d="M12 5v14M5 12h14"/>\
          </svg>\
        </span>\
        <span>{{ label }}</span>\
      </button>'
  };

  window.AppShared = {
    createChatFileUpload: createChatFileUpload,
    parseRoute: parseRoute,
    nav: nav,
    expertMatchesSearch: expertMatchesSearch,
    inferProjectFileType: inferProjectFileType,
    readUploadedFileContent: readUploadedFileContent,
    isProjectIconImage: isProjectIconImage,
    PROJECT_ICON_PRESETS: PROJECT_ICON_PRESETS
  };
  window.BackLink = BackLink;
  window.AppSidebar = AppSidebar;
  window.CreateActionBtn = CreateActionBtn;
})();
