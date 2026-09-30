/* 1023 mock-mode岗位说明：三段 UI，一份 SOUL.md。 */
(function () {
  var store = window.AppStore;
  var util = window.Expert1023Utils;
  window.ExpertSoulEditor = {
    props: ['expertId', 'expert', 'runningCount'],
    setup: function (props, ctx) {
      var sections = Vue.reactive(util.emptySections());
      var active = Vue.ref('duty');
      var savedText = Vue.ref('');
      var importInput = Vue.ref(null);
      var presetEnabled = Vue.ref(false);
      var questions = Vue.ref([]);
      var presetDialog = Vue.ref(false);
      var presetDraft = Vue.ref([]);
      var dragged = Vue.ref(-1);
      var tabs = [
        { key: 'duty', label: '岗位职责', placeholder: '例：负责产线良率分析与工艺窗口建议；不负责设备采购决策' },
        { key: 'flow', label: '作业流程', placeholder: '例：1. 核对工作目录与数据  2. 分析  3. 结论先行  4. 高风险先问人' },
        { key: 'rules', label: '工作规范', placeholder: '填写红线、表达规范、审批要求和产物约定' }
      ];
      function load() {
        var p = store.getPersona(props.expertId);
        var parsed = util.splitSoul(p.soulMd || '');
        Object.assign(sections, parsed.sections);
        savedText.value = util.composeSoul(parsed.sections);
        presetEnabled.value = !!p.presetQuestionsEnabled;
        questions.value = (p.presetQuestions || []).slice();
        active.value = 'duty';
        if (parsed.legacy) Vue.nextTick(function () { ElementPlus.ElMessage.info('未识别出分段，旧内容已放入岗位职责。'); });
      }
      Vue.watch([function () { return props.expertId; }, function () { return props.expert && props.expert.source; }], load, { immediate: true });
      var validation = Vue.computed(function () { return util.validateSoul(sections); });
      var dirty = Vue.computed(function () { return util.composeSoul(sections) !== savedText.value; });
      function save() {
        if (validation.value.conflict) return ElementPlus.ElMessage.warning('正文中不能使用保留标题「' + validation.value.conflict + '」，请改用其他标题。');
        if (validation.value.overLimit) return ElementPlus.ElMessage.warning('岗位说明超过 20000 字符，请删减后保存。');
        var content = util.composeSoul(sections);
        store.savePersona(props.expertId, { soulMd: content });
        savedText.value = content;
        ElementPlus.ElMessage({
          type: 'success',
          message: props.runningCount > 0
            ? '岗位说明已保存，新会话生效；当前 ' + props.runningCount + ' 个运行中会话仍使用原岗位说明。'
            : '岗位说明已保存，新会话生效；已打开的会话继续使用原岗位说明。',
          duration: 4500,
          offset: 24,
          showClose: true
        });
      }
      function triggerImport() { if (importInput.value) importInput.value.click(); }
      function importFile(event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (!/\.(md|markdown)$/i.test(file.name)) return ElementPlus.ElMessage.warning('请选择 .md 或 .markdown 文件');
        var proceed = function () {
          var reader = new FileReader();
          reader.onerror = function () { ElementPlus.ElMessage.error('无法读取，请使用 UTF-8 文件'); };
          reader.onload = function () {
            var parsed = util.splitSoul(reader.result || '');
            Object.assign(sections, parsed.sections);
            ElementPlus.ElMessage.success(parsed.legacy ? '未识别出分段，已放入岗位职责，请按需拆分。' : '已导入，点击保存后生效。');
          };
          reader.readAsText(file, 'UTF-8');
        };
        if (!dirty.value) return proceed();
        ElementPlus.ElMessageBox.confirm('导入将覆盖未保存的岗位说明，确定继续？', '导入岗位说明', {
          confirmButtonText: '覆盖', cancelButtonText: '取消', type: 'warning'
        }).then(proceed).catch(function () {});
      }
      function exportFile() {
        var url = URL.createObjectURL(new Blob([util.composeSoul(sections)], { type: 'text/markdown;charset=utf-8' }));
        var a = document.createElement('a'); a.href = url; a.download = 'SOUL.md'; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }
      function openPreset() {
        presetDraft.value = questions.value.length ? questions.value.slice() : ['请说明你能帮我完成哪些工作', '基于现有资料给出下一步建议'];
        presetDialog.value = true;
      }
      function togglePreset(value) {
        if (value && !questions.value.length) { openPreset(); return; }
        presetEnabled.value = !!value;
        store.savePresetQuestions(props.expertId, { enabled: !!value, questions: questions.value });
      }
      function savePreset() {
        var list = [];
        presetDraft.value.forEach(function (item) {
          var value = String(item || '').trim();
          if (value && list.indexOf(value) < 0) list.push(value);
        });
        if (!list.length) return ElementPlus.ElMessage.warning('请至少填写一个预置问题');
        questions.value = list.slice(0, 20);
        presetEnabled.value = true;
        store.savePresetQuestions(props.expertId, { enabled: true, questions: questions.value });
        presetDialog.value = false;
        ElementPlus.ElMessage.success('预置问题已保存');
      }
      function onDragStart(index, event) { dragged.value = index; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }
      function onDrop(index) {
        var from = dragged.value; dragged.value = -1;
        if (from < 0 || from === index) return;
        var list = presetDraft.value.slice(); var item = list.splice(from, 1)[0]; list.splice(index, 0, item); presetDraft.value = list;
      }
      ctx.expose({
        isDirty: function () { return dirty.value; },
        discard: load
      });
      return { sections: sections, active: active, tabs: tabs, validation: validation, dirty: dirty,
        importInput: importInput, presetEnabled: presetEnabled, questions: questions,
        presetDialog: presetDialog, presetDraft: presetDraft, dragged: dragged, save: save,
        triggerImport: triggerImport, importFile: importFile, exportFile: exportFile,
        openPreset: openPreset, togglePreset: togglePreset, savePreset: savePreset,
        onDragStart: onDragStart, onDrop: onDrop };
    },
    template: `
      <div class="detail-tab-pane soul-1023 expert-config-page">
        <div class="expert-config-head">
          <div>
            <h2>岗位说明</h2>
            <p>定义专家负责什么、怎么工作、遵守什么规范。</p>
          </div>
          <div class="expert-config-head-actions">
            <span class="expert-save-state" :class="{ 'is-dirty': dirty }">{{ dirty ? '有未保存修改' : '已保存' }}</span>
            <el-button type="primary" :disabled="!dirty || !validation.ok" @click="save">保存</el-button>
          </div>
        </div>
        <div class="expert-config-content">
          <section class="expert-config-card soul-preset-card" aria-labelledby="soul-preset-heading">
            <div class="soul-preset-copy">
              <h3 id="soul-preset-heading">预置问题</h3>
              <p>对话页一键填入，不写入岗位说明正文</p>
              <span v-if="questions.length" class="soul-preset-count">已配置 {{ questions.length }} 条</span>
            </div>
            <div class="soul-preset-controls">
              <el-switch :model-value="presetEnabled" @change="togglePreset" />
              <el-button v-if="questions.length || presetEnabled" link type="primary" @click="openPreset">配置</el-button>
            </div>
          </section>
          <section class="expert-config-card soul-editor-card" aria-label="岗位说明正文">
            <div class="soul-toolbar">
              <div class="soul-tabs" role="tablist" aria-label="岗位说明分段">
                <button v-for="tab in tabs" :key="tab.key" type="button" role="tab" :aria-selected="active === tab.key" class="soul-tab" :class="{ active: active === tab.key }" @click="active = tab.key">{{ tab.label }}<i v-if="sections[tab.key].trim()"></i></button>
              </div>
              <div class="soul-actions">
                <input ref="importInput" type="file" accept=".md,.markdown" hidden @change="importFile" />
                <el-button size="small" @click="triggerImport">导入</el-button>
                <el-button size="small" @click="exportFile">导出</el-button>
              </div>
            </div>
            <el-input v-model="sections[active]" type="textarea" :rows="16" class="soul-source-input" :placeholder="tabs.find(t => t.key === active).placeholder" />
            <div class="soul-footer" :class="{ danger: !validation.ok }">
              <span v-if="validation.conflict">正文不能使用保留标题 {{ validation.conflict }}</span>
              <span v-else-if="validation.overLimit">岗位说明不能超过 20000 字符，请删减后保存。</span>
              <span v-else>三段内容保存为一份岗位说明</span>
              <span>{{ validation.length }} / 20000</span>
            </div>
          </section>
          </div>
        <el-dialog v-model="presetDialog" title="配置预置问题" width="620px" append-to-body>
          <p class="soul-dialog-intro">对话页点击「预置问题」后，可一键把问题填入输入框。</p>
          <div class="soul-question-list">
            <div v-for="(question, index) in presetDraft" :key="index" class="soul-question-row" draggable="true" @dragstart="onDragStart(index, $event)" @dragover.prevent @drop.prevent="onDrop(index)" @dragend="dragged = -1">
              <span class="soul-drag-handle" title="拖拽排序">⋮⋮</span><el-input v-model="presetDraft[index]" maxlength="200" :placeholder="'预置问题 ' + (index + 1)" />
              <el-button link type="danger" @click="presetDraft.splice(index, 1)">删除</el-button>
            </div>
          </div>
          <el-button link type="primary" :disabled="presetDraft.length >= 20" @click="presetDraft.push('')">+ 添加问题</el-button>
          <template #footer><el-button @click="presetDialog = false">取消</el-button><el-button type="primary" @click="savePreset">保存</el-button></template>
        </el-dialog>
      </div>`
  };
})();
