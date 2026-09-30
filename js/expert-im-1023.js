/* 1023 mock-mode channel configuration; secret presence only, no real platform traffic. */
(function () {
  var store = window.AppStore;
  var CHANNELS = [
    { id: 'wecom', label: '企业微信', hint: 'AI Bot · 仅对已有会话主动发送' },
    { id: 'dingtalk', label: '钉钉', hint: '应用机器人 · 单聊及群聊' },
    { id: 'feishu', label: '飞书', hint: '应用 Bot · WebSocket 连接' }
  ];
  var TARGETS = {
    wecom: { people: [{ name: '授权人', id: 'wc-owner' }, { name: '设备主管', id: 'wc-recent-1' }], groups: [{ name: '产线协作群', id: 'wc-group-1' }] },
    dingtalk: { people: [{ name: '设备主管', id: 'dt-user-1' }, { name: '生产经理', id: 'dt-user-2' }], groups: [{ name: '产线值班群', id: 'dt-group-1' }, { name: '质量改进群', id: 'dt-group-2' }] },
    feishu: { people: [{ name: '研发主管', id: 'ou_demo_1' }, { name: '项目经理', id: 'ou_demo_2' }], groups: [{ name: '研发协同群', id: 'oc_demo_1' }, { name: '项目例会群', id: 'oc_demo_2' }] }
  };
  window.ExpertIm1023 = {
    props: ['expertId'],
    setup: function (props) {
      var selected = Vue.ref('wecom'), configs = Vue.ref({}), secretDraft = Vue.ref('');
      var targetDialog = Vue.ref(false), targetKind = Vue.ref('people'), targetId = Vue.ref('');
      function load() { configs.value = store.getImPrototypeConfigs(props.expertId); selected.value = 'wecom'; secretDraft.value = ''; }
      Vue.watch(function () { return props.expertId; }, load, { immediate: true });
      var current = Vue.computed(function () { return configs.value[selected.value] || {}; });
      var selectedMeta = Vue.computed(function () { return CHANNELS.find(function (item) { return item.id === selected.value; }); });
      var options = Vue.computed(function () { return (TARGETS[selected.value] || {})[targetKind.value] || []; });
      function choose(id) { selected.value = id; secretDraft.value = ''; }
      function save() {
        var value = Object.assign({}, current.value);
        if (secretDraft.value.trim()) value.configured = true;
        if (value.enabled && !value.configured) { ElementPlus.ElMessage.warning('请先填写渠道凭据'); value.enabled = false; }
        if (!value.configured) value.connection = 'unconfigured';
        else if (value.enabled) value.connection = 'pending';
        else value.connection = 'disabled';
        configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
        secretDraft.value = '';
        ElementPlus.ElMessage.success('配置已保存' + (value.enabled ? '，待应用连接' : ''));
      }
      function applyConnection() {
        var value = Object.assign({}, current.value);
        if (!value.enabled || !value.configured) return ElementPlus.ElMessage.warning('请先启用并配置渠道');
        value.connection = 'connected'; configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
        ElementPlus.ElMessage.success('演示连接已就绪');
      }
      function openTarget(kind) { targetKind.value = kind; targetId.value = ''; targetDialog.value = true; }
      function addTarget() {
        var picked = options.value.find(function (item) { return item.id === targetId.value; });
        if (!picked) return ElementPlus.ElMessage.warning('请选择唯一目标');
        var value = Object.assign({}, current.value), list = (value[targetKind.value] || []).slice();
        if (list.some(function (item) { return item.id === picked.id; })) return ElementPlus.ElMessage.info('已在名单中');
        list.push(picked); value[targetKind.value] = list; configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
        targetDialog.value = false;
      }
      function removeTarget(kind, id) {
        var value = Object.assign({}, current.value);
        value[kind] = (value[kind] || []).filter(function (item) { return item.id !== id; });
        configs.value[selected.value] = value; store.saveImPrototypeConfig(props.expertId, selected.value, value);
      }
      function status(value) {
        return ({ connected: '已连接', pending: '待应用', disabled: '已关闭', unconfigured: '未配置', failed: '连接失败' })[value.connection] || '未配置';
      }
      function scan() { ElementPlus.ElMessage.info('演示模式：扫码配置入口已展示，未连接真实平台'); }
      return { channels: CHANNELS, selected: selected, configs: configs, current: current, selectedMeta: selectedMeta,
        secretDraft: secretDraft, targetDialog: targetDialog, targetKind: targetKind, targetId: targetId,
        options: options, choose: choose, save: save, applyConnection: applyConnection,
        openTarget: openTarget, addTarget: addTarget, removeTarget: removeTarget, status: status, scan: scan };
    },
    template: `
      <div class="detail-tab-pane im-1023">
        <div class="detail-section-head"><h3 class="detail-section-title">消息渠道</h3><p class="detail-section-desc">配置企业微信、钉钉和飞书机器人。主动沟通与收发文件按渠道单独控制。</p></div>
        <div class="im-1023-layout">
          <nav class="im-1023-nav" aria-label="消息渠道"><button v-for="channel in channels" :key="channel.id" type="button" :class="{ active: selected === channel.id }" @click="choose(channel.id)"><b>{{ channel.label }}</b><small>{{ status(configs[channel.id] || {}) }}</small></button></nav>
          <div class="im-1023-main" v-if="selectedMeta && current">
            <div class="im-1023-heading"><div><h4>{{ selectedMeta.label }}</h4><p>{{ selectedMeta.hint }}</p></div><el-tag :type="current.connection === 'connected' ? 'success' : current.connection === 'failed' ? 'danger' : 'info'">{{ status(current) }}</el-tag></div>
            <div class="im-1023-card"><div class="im-1023-row im-1023-enable-row"><div><strong>启用渠道</strong><small>启用后持续接收并回复此渠道消息</small></div><el-switch v-model="current.enabled" /></div><div class="im-1023-fields"><el-input v-if="selected === 'wecom'" v-model="current.botId" placeholder="Bot ID" /><el-input v-if="selected === 'dingtalk'" v-model="current.clientId" placeholder="Client ID" /><el-input v-if="selected === 'dingtalk'" v-model="current.robotCode" placeholder="机器人 Code" /><el-input v-if="selected === 'feishu'" v-model="current.appId" placeholder="App ID" /><el-input v-model="secretDraft" type="password" show-password :placeholder="current.configured ? '密钥已配置，留空则不修改' : '填写 Secret'" /><el-input v-model="current.home" placeholder="Home 会话或群 ID（用于结果投递）" /></div><div class="im-1023-actions"><el-button v-if="selected !== 'dingtalk'" size="small" @click="scan">扫码配置</el-button><el-button size="small" @click="applyConnection">应用并连接</el-button><el-button type="primary" size="small" @click="save">保存</el-button></div></div>
            <div v-if="selected !== 'wecom'" class="im-1023-card"><div class="im-1023-row"><div><strong>群聊需 @</strong><small>群里有人 @ 专家时才响应</small></div><el-switch v-model="current.requireMention" @change="save" /></div></div>
            <div class="im-1023-card"><div class="im-1023-row"><div><strong>主动沟通</strong><small>开启后可向下列人员或群发送机器人消息</small></div><el-switch v-model="current.proactiveEnabled" @change="save" /></div><div class="im-1023-lists"><div><div class="im-1023-list-head">可私聊的人 <el-button link type="primary" @click="openTarget('people')">+ 添加</el-button></div><div v-if="!current.people || !current.people.length" class="im-1023-empty">尚未添加人员</div><div v-for="person in current.people" :key="person.id" class="im-1023-target">{{ person.name }}<el-button link type="danger" @click="removeTarget('people',person.id)">移除</el-button></div></div><div><div class="im-1023-list-head">可发的群 <el-button link type="primary" @click="openTarget('groups')">+ 添加</el-button></div><div v-if="!current.groups || !current.groups.length" class="im-1023-empty">尚未添加群聊</div><div v-for="group in current.groups" :key="group.id" class="im-1023-target">{{ group.name }}<el-button link type="danger" @click="removeTarget('groups',group.id)">移除</el-button></div></div></div><p class="im-1023-note">{{ selected === 'wecom' ? '企业微信只能向本次最近会话中的名单目标发送；群里不支持平台 @。' : '群内 @ 仅用于可发群名单中的成员，文件和 @ 文本分开发送。' }}</p></div>
            <div class="im-1023-card"><div class="im-1023-row"><div><strong>允许收发文件</strong><small>覆盖图片、文件、语音和视频；当前会话文件保存在该任务工作目录</small></div><el-switch v-model="current.fileEnabled" @change="save" /></div></div>
            <div class="im-1023-guide">可用命令：/help · /new · /stop · /sethome · /status。{{ selected === 'wecom' ? '' : '在群里使用时先 @ 机器人。' }}</div>
          </div>
        </div>
        <el-dialog v-model="targetDialog" :title="targetKind === 'people' ? '添加可私聊的人' : '添加可发的群'" width="480px" append-to-body><p class="im-1023-note">从当前渠道可用的模拟对象中选择，重名时按对象逐一确认。</p><el-select v-model="targetId" filterable style="width:100%" placeholder="搜索并选择"><el-option v-for="item in options" :key="item.id" :label="item.name" :value="item.id" /></el-select><template #footer><el-button @click="targetDialog = false">取消</el-button><el-button type="primary" @click="addTarget">添加</el-button></template></el-dialog>
      </div>`
  };
})();
