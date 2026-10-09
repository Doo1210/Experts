/* 1023 mock-mode channel configuration; secret presence only, no real platform traffic. */
(function () {
  var store = window.AppStore;
  var CHANNELS = [
    { id: 'wecom', label: '企业微信', hint: 'AI Bot · 仅对已有会话主动发送' },
    { id: 'dingtalk', label: '钉钉', hint: '应用机器人 · 单聊及群聊' },
    { id: 'feishu', label: '飞书', hint: '应用 Bot · WebSocket 连接' }
  ];
  var SAMPLE_WECOM_SESSIONS = { people: ['wc-owner', 'wc-recent-1', 'wc-timeout-1'], groups: ['wc-group-1'] };
  var SAMPLE_TARGETS = {
    wecom: {
      people: [
        ['授权人', 'wc-owner', 'accepted'],
        ['设备主管', 'wc-recent-1', 'accepted'],
        ['已离开最近会话', 'wc-expired-1', 'failed'],
        ['网络波动会话', 'wc-timeout-1', 'unknown']
      ],
      groups: [
        ['产线协作群', 'wc-group-1', 'accepted'],
        ['历史通知群', 'wc-group-expired', 'failed']
      ]
    },
    dingtalk: {
      people: [
        ['生产经理', 'dt-user-ok', 'accepted'],
        ['权限受限用户', 'dt-user-denied', 'failed'],
        ['响应超时用户', 'dt-user-timeout', 'unknown']
      ],
      groups: [
        ['设备值班群', 'dt-group-ok', 'accepted'],
        ['机器人未入群', 'dt-group-no-bot', 'failed'],
        ['网络波动群', 'dt-group-timeout', 'unknown']
      ]
    },
    feishu: {
      people: [
        ['研发主管', 'ou_demo_ok', 'accepted'],
        ['未建立单聊', 'ou_demo_no-dm', 'failed'],
        ['响应超时用户', 'ou_demo_timeout', 'unknown']
      ],
      groups: [
        ['研发协同群', 'oc_demo_ok', 'accepted'],
        ['应用未入群', 'oc_demo_no-bot', 'failed'],
        ['网络波动群', 'oc_demo_timeout', 'unknown']
      ]
    }
  };
  function sampleResult(status, channel, kind, id, minutesAgo) {
    var detail = status === 'accepted' ? '平台已接受发送请求；不代表对方已读' :
      status === 'unknown' ? '请求超时，消息可能已经发出，请先核对目标会话' :
      channel === 'wecom' ? '目标不在本次可发送会话中' :
      channel === 'dingtalk' ? (kind === 'groups' ? '机器人未加入目标群' : '机器人没有向该用户发送消息的权限') :
      (kind === 'groups' ? '应用 Bot 未加入目标群' : '应用 Bot 尚未与该用户建立单聊关系');
    return {
      status: status, at: new Date(Date.now() - minutesAgo * 60000).toISOString(), detail: detail,
      code: status === 'accepted' ? 'PLATFORM_ACCEPTED' : status === 'unknown' ? 'SEND_RESULT_UNKNOWN' :
        channel === 'wecom' ? 'SESSION_NOT_AVAILABLE' : channel === 'dingtalk' ?
        (kind === 'groups' ? 'BOT_NOT_IN_GROUP' : 'BOT_SEND_FORBIDDEN') :
        (kind === 'groups' ? 'BOT_NOT_IN_GROUP' : 'BOT_RELATION_REQUIRED')
    };
  }
  window.ExpertIm1023 = {
    props: ['expertId'],
    setup: function (props) {
      var selected = Vue.ref('wecom'), configs = Vue.ref({}), secretDraft = Vue.ref(''), advancedOpen = Vue.ref(false);
      var targetDialog = Vue.ref(false), targetKind = Vue.ref('people'), targetId = Vue.ref(''), targetName = Vue.ref('');
      var testDialog = Vue.ref(false), testKind = Vue.ref('people'), testId = Vue.ref('');
      var testType = Vue.ref('text'), testText = Vue.ref(''), testMarkdown = Vue.ref(false);
      var testImageUrl = Vue.ref(''), testFileName = Vue.ref(''), testFileKey = Vue.ref(0);
      var testMention = Vue.ref(false), testMentionId = Vue.ref('');
      var testResult = Vue.ref(null);
      function load() {
        var loaded = store.getImPrototypeConfigs(props.expertId);
        if (loaded.feishu) loaded.feishu = Object.assign({}, loaded.feishu, { domain: 'feishu', connectionMode: 'websocket' });
        if (String(props.expertId) === '9') {
          CHANNELS.forEach(function (channel, channelIndex) {
            var value = Object.assign({}, loaded[channel.id] || {});
            if (value.sampleTargetsVersion === 2) return;
            ['people', 'groups'].forEach(function (kind) {
              var existing = (value[kind] || []).slice();
              SAMPLE_TARGETS[channel.id][kind].forEach(function (entry, index) {
                if (existing.some(function (item) { return item.id === entry[1]; })) return;
                existing.push({
                  name: entry[0], id: entry[1],
                  lastTest: sampleResult(entry[2], channel.id, kind, entry[1], 12 + channelIndex * 15 + index * 9)
                });
              });
              value[kind] = existing;
            });
            value.sampleTargetsVersion = 2;
            loaded[channel.id] = value;
            store.saveImPrototypeConfig(props.expertId, channel.id, value);
          });
        }
        configs.value = loaded;
        selected.value = 'wecom';
        secretDraft.value = '';
        advancedOpen.value = false;
        targetDialog.value = false;
        testDialog.value = false;
      }
      Vue.watch(function () { return props.expertId; }, load, { immediate: true });
      var current = Vue.computed(function () { return configs.value[selected.value] || {}; });
      var selectedMeta = Vue.computed(function () { return CHANNELS.find(function (item) { return item.id === selected.value; }); });
      var testTarget = Vue.computed(function () {
        return (current.value[testKind.value] || []).find(function (item) { return item.id === testId.value; }) || null;
      });
      var targetIdLabel = Vue.computed(function () {
        if (selected.value === 'wecom') return '会话 chat_id';
        if (selected.value === 'dingtalk') return targetKind.value === 'people' ? '用户 userId' : '群 openConversationId';
        return targetKind.value === 'people' ? '用户 open_id' : '群 chat_id';
      });
      var sendStatus = Vue.computed(function () {
        if (!current.value.enabled) return '渠道已关闭';
        if (!current.value.configured) return '尚未配置';
        return (current.value.sendCheck || {}).status === 'ready' ? '已就绪' : '待检查';
      });
      function choose(id) { selected.value = id; secretDraft.value = ''; advancedOpen.value = id === 'dingtalk' && !!(configs.value.dingtalk || {}).robotCode; }
      function save() {
        var value = Object.assign({}, current.value);
        var idField = { wecom: 'botId', dingtalk: 'clientId', feishu: 'appId' }[selected.value];
        var hasId = !!String(value[idField] || '').trim() || !!value.configured;
        var hasSecret = !!secretDraft.value.trim() || !!value.configured;
        if (value.enabled && (!hasId || !hasSecret)) {
          current.value.enabled = false;
          ElementPlus.ElMessage.warning('请填写渠道 ID 和 Secret 后再启用');
          return;
        }
        value.configured = hasId && hasSecret;
        if (selected.value === 'feishu') {
          value.domain = 'feishu';
          value.connectionMode = 'websocket';
        }
        value.connection = !value.configured ? 'unconfigured' : value.enabled ? 'connected' : 'disabled';
        configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
        secretDraft.value = '';
        ElementPlus.ElMessage.success(value.enabled ? '配置已保存，连接已建立' : '渠道配置已保存');
      }
      function saveSetting() {
        var value = Object.assign({}, current.value);
        configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
      }
      function toggleProactive() {
        if (current.value.proactiveEnabled && !current.value.enabled) {
          current.value.proactiveEnabled = false;
          ElementPlus.ElMessage.warning('请先启用渠道');
        }
        saveSetting();
      }
      function checkSendingConfig() {
        if (!current.value.enabled || !current.value.configured) return ElementPlus.ElMessage.warning('请先启用并保存渠道配置');
        var value = Object.assign({}, current.value, { sendCheck: { status: 'ready', checkedAt: new Date().toISOString() } });
        configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
        ElementPlus.ElMessage.success('机器人发送配置已通过检查');
      }
      function openTarget(kind) {
        targetKind.value = kind;
        targetId.value = '';
        targetName.value = '';
        targetDialog.value = true;
      }
      function addTarget(thenTest) {
        var id = String(targetId.value || '').trim();
        if (!id) return ElementPlus.ElMessage.warning('请输入目标 ID');
        if (id.length > 200 || id.split('').some(function (char) { return char <= ' '; })) {
          return ElementPlus.ElMessage.warning('目标 ID 不能包含空白字符，且不能超过 200 个字符');
        }
        if (selected.value === 'feishu' && !id.startsWith(targetKind.value === 'people' ? 'ou_' : 'oc_')) {
          return ElementPlus.ElMessage.warning(targetKind.value === 'people' ? '飞书人员 ID 应以 ou_ 开头' : '飞书群 ID 应以 oc_ 开头');
        }
        var value = Object.assign({}, current.value), list = (value[targetKind.value] || []).slice();
        if (list.some(function (item) { return item.id === id; })) return ElementPlus.ElMessage.info('该目标已在名单中');
        list.push({ id: id, name: String(targetName.value || '').trim() || (targetKind.value === 'people' ? '未命名人员' : '未命名群') });
        value[targetKind.value] = list; configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
        targetDialog.value = false;
        ElementPlus.ElMessage.success('已添加目标');
        if (thenTest) openTest(targetKind.value, id);
      }
      function removeTarget(kind, id) {
        var value = Object.assign({}, current.value);
        value[kind] = (value[kind] || []).filter(function (item) { return item.id !== id; });
        configs.value[selected.value] = value; store.saveImPrototypeConfig(props.expertId, selected.value, value);
      }
      function shortId(id) {
        var value = String(id || '');
        return value.length > 18 ? '…' + value.slice(-10) : value;
      }
      function lastTestLabel(test) {
        if (!test) return '未测试';
        var date = new Date(test.at);
        var time = Number.isNaN(date.getTime()) ? '' :
          ' · ' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') +
          ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
        return '上次测试' + ({ accepted: '成功', failed: '失败', unknown: '结果未知' }[test.status] || '结果未知') + time;
      }
      function openTest(kind, id) {
        if (!current.value.enabled || !current.value.configured) return ElementPlus.ElMessage.warning('请先启用并保存渠道配置');
        testKind.value = kind;
        testId.value = id;
        testType.value = 'text';
        testText.value = '';
        testMarkdown.value = false;
        testImageUrl.value = '';
        testFileName.value = '';
        testFileKey.value += 1;
        testMention.value = false;
        testMentionId.value = '';
        testResult.value = null;
        testDialog.value = true;
      }
      function selectTestType(type) {
        testType.value = type;
        testResult.value = null;
        testFileName.value = '';
        testFileKey.value += 1;
      }
      function onTestFileChange(event) {
        var file = event.target.files && event.target.files[0];
        testFileName.value = file ? file.name : '';
      }
      function sendDemoTest() {
        if (testType.value === 'text' && !testText.value.trim()) return ElementPlus.ElMessage.warning('请输入测试文字');
        if (testType.value === 'image' && selected.value === 'dingtalk' &&
            !testImageUrl.value.trim().startsWith('https://') && !testImageUrl.value.trim().startsWith('http://')) {
          return ElementPlus.ElMessage.warning('钉钉图片消息需要可访问的 HTTP(S) 图片地址');
        }
        if ((testType.value === 'file' || (testType.value === 'image' && selected.value !== 'dingtalk')) && !testFileName.value) {
          return ElementPlus.ElMessage.warning('请选择测试文件');
        }
        if (testMention.value && !testMentionId.value.trim()) return ElementPlus.ElMessage.warning('请输入要 @ 的群成员 ID');
        if (testMention.value && selected.value === 'feishu' && !testMentionId.value.trim().startsWith('ou_')) {
          return ElementPlus.ElMessage.warning('飞书群成员 open_id 应以 ou_ 开头');
        }
        var result;
        if (!current.value.fileEnabled && testType.value !== 'text') {
          result = { status: 'failed', at: new Date().toISOString(), detail: '请先开启“允许收发文件”', code: 'FILE_SWITCH_OFF' };
        } else if (selected.value === 'wecom' && SAMPLE_WECOM_SESSIONS[testKind.value].indexOf(testId.value) === -1) {
          result = sampleResult('failed', selected.value, testKind.value, testId.value, 0);
        } else {
          var sample = SAMPLE_TARGETS[selected.value][testKind.value].find(function (entry) { return entry[1] === testId.value; });
          result = sampleResult(sample ? sample[2] : 'accepted', selected.value, testKind.value, testId.value, 0);
        }
        testResult.value = result;
        var value = Object.assign({}, current.value);
        value[testKind.value] = (value[testKind.value] || []).map(function (item) {
          return item.id === testId.value ? Object.assign({}, item, { lastTest: result }) : item;
        });
        configs.value[selected.value] = value;
        store.saveImPrototypeConfig(props.expertId, selected.value, value);
      }
      function status(value) {
        return ({ connected: '已连接', pending: '待连接', disabled: '已关闭', unconfigured: '未配置', failed: '连接失败' })[value.connection] || '未配置';
      }
      function scan() { ElementPlus.ElMessage.info('扫码配置入口已打开'); }
      return { channels: CHANNELS, selected: selected, configs: configs, current: current, selectedMeta: selectedMeta,
        secretDraft: secretDraft, advancedOpen: advancedOpen, targetDialog: targetDialog, targetKind: targetKind,
        targetId: targetId, targetName: targetName, targetIdLabel: targetIdLabel,
        testDialog: testDialog, testKind: testKind, testTarget: testTarget, testType: testType, testText: testText,
        testMarkdown: testMarkdown, testImageUrl: testImageUrl, testFileName: testFileName, testFileKey: testFileKey,
        testMention: testMention, testMentionId: testMentionId, testResult: testResult, sendStatus: sendStatus,
        choose: choose, save: save, saveSetting: saveSetting, toggleProactive: toggleProactive,
        checkSendingConfig: checkSendingConfig, openTarget: openTarget, addTarget: addTarget, removeTarget: removeTarget,
        shortId: shortId, lastTestLabel: lastTestLabel, openTest: openTest, selectTestType: selectTestType,
        onTestFileChange: onTestFileChange, sendDemoTest: sendDemoTest, status: status, scan: scan };
    },
    template: `
      <div class="detail-tab-pane im-1023">
        <div class="detail-section-head"><h3 class="detail-section-title">消息渠道</h3><p class="detail-section-desc">配置企业微信、钉钉和飞书机器人。主动沟通与收发文件按渠道单独控制。</p></div>
        <div class="im-1023-layout">
          <nav class="im-1023-nav" aria-label="消息渠道"><button v-for="channel in channels" :key="channel.id" type="button" :class="{ active: selected === channel.id }" @click="choose(channel.id)"><b>{{ channel.label }}</b><small>{{ status(configs[channel.id] || {}) }}</small></button></nav>
          <div class="im-1023-main" v-if="selectedMeta && current">
            <div class="im-1023-heading"><div><h4>{{ selectedMeta.label }}</h4><p>{{ selectedMeta.hint }}</p></div><el-tag :type="current.connection === 'connected' ? 'success' : current.connection === 'failed' ? 'danger' : 'info'">{{ status(current) }}</el-tag></div>
            <div class="im-1023-card im-1023-connection-card">
              <div class="im-1023-row im-1023-enable-row"><div><strong>启用渠道</strong><small>启用后持续接收并回复此渠道消息</small></div><el-switch v-model="current.enabled" aria-label="启用渠道" /></div>
              <div class="im-1023-fields">
                <label class="im-1023-field"><span>{{ selected === 'wecom' ? 'Bot ID' : selected === 'dingtalk' ? 'Client ID' : 'App ID' }} <em>*</em></span><el-input v-if="selected === 'wecom'" v-model="current.botId" :placeholder="current.configured ? '已配置，留空则不修改' : '输入 Bot ID'" aria-label="Bot ID" /><el-input v-else-if="selected === 'dingtalk'" v-model="current.clientId" :placeholder="current.configured ? '已配置，留空则不修改' : '输入 Client ID'" aria-label="Client ID" /><el-input v-else v-model="current.appId" :placeholder="current.configured ? '已配置，留空则不修改' : '输入 App ID'" aria-label="App ID" /></label>
                <label class="im-1023-field"><span>{{ selected === 'wecom' ? 'Bot Secret' : selected === 'dingtalk' ? 'Client Secret' : 'App Secret' }} <em>*</em></span><el-input v-model="secretDraft" type="password" show-password :placeholder="current.configured ? '已配置，留空则不修改' : '输入 Secret'" /></label>
              </div>
              <div class="im-1023-options-row">
                <label class="im-1023-field"><span>Home 会话或群 ID <small>选填，用于结果投递</small></span><el-input v-model="current.home" placeholder="填写默认投递的会话或群 ID" /></label>
                <div v-if="selected !== 'wecom'" class="im-1023-mention-control"><strong>群聊需 @</strong><div class="im-1023-mention-detail"><small>群里有人 @ 专家时才响应</small><el-switch v-model="current.requireMention" aria-label="群聊需 @" /></div></div>
              </div>
              <div v-if="selected === 'dingtalk'" class="im-1023-advanced"><button type="button" class="im-1023-advanced-toggle" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen">高级选项 {{ advancedOpen ? '▴' : '▾' }}</button><label v-if="advancedOpen" class="im-1023-field"><span>机器人 Code <small>选填，与 Client ID 不同时填写</small></span><el-input v-model="current.robotCode" placeholder="留空时使用 Client ID" /></label></div>
              <div class="im-1023-actions"><el-button v-if="selected !== 'dingtalk'" size="small" @click="scan">扫码配置</el-button><el-button type="primary" size="small" @click="save">{{ current.enabled ? '保存并连接' : '保存配置' }}</el-button></div>
            </div>
            <div class="im-1023-card im-1023-proactive-card">
              <div class="im-1023-proactive-top"><div class="im-1023-proactive-title"><strong>主动沟通</strong><span>以当前渠道的机器人身份，向名单内人员或群主动发送</span></div><div class="im-1023-proactive-tools"><span class="im-1023-send-label">机器人发送配置</span><span class="im-1023-send-status" :class="{ 'is-ready': sendStatus === '已就绪' }">{{ sendStatus }}</span><el-button link type="primary" size="small" @click="checkSendingConfig">检查配置</el-button><span class="im-1023-switch-slot"><el-switch v-model="current.proactiveEnabled" aria-label="主动沟通" @change="toggleProactive" /></span></div></div>
              <div class="im-1023-lists">
                <div class="im-1023-list">
                  <div class="im-1023-list-head"><span>可私聊的人 <small>{{ (current.people || []).length }}</small></span><el-button link type="primary" @click="openTarget('people')">+ 添加人员</el-button></div>
                  <div v-if="!current.people || !current.people.length" class="im-1023-empty">还没有允许私聊的人员，添加用户 ID 后可测试。</div>
                  <div v-for="person in current.people" :key="person.id" class="im-1023-target">
                    <div class="im-1023-target-main"><strong>{{ person.name }}</strong><code :title="person.id">{{ shortId(person.id) }}</code></div>
                    <div class="im-1023-target-actions"><span class="im-1023-last-test" :class="'is-' + ((person.lastTest || {}).status || 'none')" :title="(person.lastTest || {}).detail || ''">{{ lastTestLabel(person.lastTest) }}</span><el-button link type="primary" size="small" :disabled="!current.enabled || !current.configured" @click="openTest('people', person.id)">测试</el-button><el-button link type="danger" size="small" @click="removeTarget('people', person.id)">移除</el-button></div>
                  </div>
                </div>
                <div class="im-1023-list">
                  <div class="im-1023-list-head"><span>可发的群 <small>{{ (current.groups || []).length }}</small></span><el-button link type="primary" @click="openTarget('groups')">+ 添加群</el-button></div>
                  <div v-if="!current.groups || !current.groups.length" class="im-1023-empty">还没有允许发送的群，添加群 ID 后可测试。</div>
                  <div v-for="group in current.groups" :key="group.id" class="im-1023-target">
                    <div class="im-1023-target-main"><strong>{{ group.name }}</strong><code :title="group.id">{{ shortId(group.id) }}</code></div>
                    <div class="im-1023-target-actions"><span class="im-1023-last-test" :class="'is-' + ((group.lastTest || {}).status || 'none')" :title="(group.lastTest || {}).detail || ''">{{ lastTestLabel(group.lastTest) }}</span><el-button link type="primary" size="small" :disabled="!current.enabled || !current.configured" @click="openTest('groups', group.id)">测试</el-button><el-button link type="danger" size="small" @click="removeTarget('groups', group.id)">移除</el-button></div>
                  </div>
                </div>
              </div>
              <p class="im-1023-note">{{ selected === 'wecom' ? '企微发送前会重新核对当前可发送会话。' : '群聊需 @ 只控制专家收到群消息时是否响应。' }}关闭主动沟通后仍可手动测试；图片和文件由收发文件开关控制。</p>
            </div>
            <div class="im-1023-card"><div class="im-1023-row"><div><strong>允许收发文件</strong><small>覆盖图片、文件、语音和视频；当前会话文件保存在该任务工作目录</small></div><el-switch v-model="current.fileEnabled" @change="saveSetting" /></div></div>
            <div class="im-1023-guide">可用命令：/help · /new · /stop · /sethome · /status。{{ selected === 'wecom' ? '' : '在群里使用时先 @ 机器人。' }}</div>
          </div>
        </div>
        <el-dialog v-model="targetDialog" :title="targetKind === 'people' ? '添加可私聊的人' : '添加可发的群'" :show-close="false" width="540px" append-to-body class="im-1023-dialog im-1023-add-dialog">
          <template #header>
            <div class="im-1023-dialog-header">
              <div class="im-1023-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" /><path d="M3.5 19v-1.1A5.9 5.9 0 0 1 9.4 12h.2a5.9 5.9 0 0 1 5.9 5.9V19" /><path d="M18 9v7M14.5 12.5h7" /></svg></div>
              <div class="im-1023-dialog-header-copy"><h3>{{ targetKind === 'people' ? '添加可私聊的人' : '添加可发的群' }}</h3><p>{{ selectedMeta.label }} · {{ targetKind === 'people' ? '人员名单' : '群聊名单' }}</p></div>
              <button type="button" class="im-1023-dialog-close" aria-label="关闭弹窗" @click="targetDialog = false">×</button>
            </div>
          </template>
          <div class="im-1023-dialog-body">
            <p class="im-1023-dialog-intro">填写目标的平台 ID，保存后可从名单中测试发送。</p>
            <div class="im-1023-dialog-fields">
              <label class="im-1023-field"><span>{{ targetIdLabel }} <em>*</em></span><el-input v-model="targetId" :maxlength="200" :placeholder="'输入' + targetIdLabel" /></label>
              <label class="im-1023-field"><span>名称或备注 <small>选填</small></span><el-input v-model="targetName" placeholder="例如：设备主管、产线协作群" /></label>
            </div>
            <div class="im-1023-dialog-tip"><strong>发送依据</strong><span>{{ selected === 'wecom' ? '企微发送前还会用本次可发送会话核对 chat_id；不能填写通讯录 userid。' : '名称仅用于识别；实际发送以保存的平台 ID 为准。' }}</span></div>
          </div>
          <template #footer><div class="im-1023-dialog-footer"><span>可先保存，稍后再测试</span><div><el-button @click="targetDialog = false">取消</el-button><el-button @click="addTarget(false)">保存</el-button><el-button type="primary" :disabled="!current.enabled || !current.configured" @click="addTarget(true)">保存并测试</el-button></div></div></template>
        </el-dialog>
        <el-dialog v-model="testDialog" :title="'主动沟通测试 · ' + ((testTarget || {}).name || '')" :show-close="false" width="620px" append-to-body class="im-1023-dialog im-1023-test-dialog">
          <template #header>
            <div class="im-1023-dialog-header">
              <div class="im-1023-dialog-icon is-test" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m3 11 17-8-6.8 18-2.7-7.5L3 11Z" /><path d="m10.5 13.5 5.2-5.1" /></svg></div>
              <div class="im-1023-dialog-header-copy"><h3>主动沟通测试</h3><p>{{ selectedMeta.label }}机器人 → {{ (testTarget || {}).name || '目标' }}</p></div>
              <button type="button" class="im-1023-dialog-close" aria-label="关闭弹窗" @click="testDialog = false">×</button>
            </div>
          </template>
          <div v-if="testTarget" class="im-1023-dialog-body">
            <div class="im-1023-test-context"><span class="im-1023-test-context-label">发送目标</span><strong>{{ testTarget.name }}</strong><code :title="testTarget.id">{{ shortId(testTarget.id) }}</code></div>
            <div v-if="testResult" class="im-1023-test-result" :class="'is-' + testResult.status" role="status"><div class="im-1023-result-head"><span aria-hidden="true">{{ testResult.status === 'accepted' ? '✓' : testResult.status === 'failed' ? '!' : '?' }}</span><strong>{{ testResult.status === 'accepted' ? '平台已接受' : testResult.status === 'failed' ? '发送失败' : '结果未知' }}</strong></div><p>{{ testResult.detail }}</p><details><summary>技术详情</summary><code>{{ testResult.code }} · {{ selectedMeta.label }} · {{ shortId(testTarget.id) }}</code></details></div>
            <div class="im-1023-type-tabs" role="group" aria-label="测试内容类型"><button type="button" :class="{ active: testType === 'text' }" @click="selectTestType('text')">文字</button><button type="button" :class="{ active: testType === 'image' }" :disabled="!current.fileEnabled" @click="selectTestType('image')">图片</button><button type="button" :class="{ active: testType === 'file' }" :disabled="!current.fileEnabled" @click="selectTestType('file')">文件</button></div>
            <p v-if="!current.fileEnabled" class="im-1023-media-hint">开启“允许收发文件”后，可测试图片和文件。</p>
            <template v-if="testType === 'text'"><div class="im-1023-test-input-head"><span>测试内容 <em>*</em></span><el-checkbox v-model="testMarkdown">按 Markdown 发送</el-checkbox></div><el-input v-model="testText" type="textarea" :rows="4" maxlength="20000" show-word-limit placeholder="输入将要发送的文字" /></template>
            <label v-else-if="testType === 'image' && selected === 'dingtalk'" class="im-1023-field"><span>公网图片地址 <em>*</em></span><el-input v-model="testImageUrl" placeholder="https://example.com/image.png" /><small>钉钉本地图片按文件附件发送；原生图片消息需要公网地址。</small></label>
            <div v-else class="im-1023-upload-field">
              <div class="im-1023-test-input-head"><span>{{ testType === 'image' ? '选择图片' : '选择文件' }} <em>*</em></span></div>
              <input id="im-1023-upload-input" :key="testFileKey" class="im-1023-file-input" type="file" :accept="testType === 'image' ? 'image/*' : undefined" :aria-label="testType === 'image' ? '选择图片' : '选择文件'" @change="onTestFileChange" />
              <label class="im-1023-upload-zone" for="im-1023-upload-input">
                <span class="im-1023-upload-icon" aria-hidden="true"><svg v-if="testType === 'image'" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m5 18 5-5 3.5 3 2.5-2.5 3 3" /></svg><svg v-else viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M8 12h8M8 16h6" /></svg></span>
                <span class="im-1023-upload-copy"><strong>{{ testFileName || (testType === 'image' ? '添加图片' : '添加文件') }}</strong><small>{{ testFileName ? '已选择，可重新更换' : '从本机选择要发送的' + (testType === 'image' ? '图片' : '文件') }}</small></span>
              </label>
              <p class="im-1023-upload-help">文件将从当前专家的工作目录发送。</p>
            </div>
            <div v-if="testKind === 'groups' && selected !== 'wecom' && testType === 'text'" class="im-1023-test-mention"><el-checkbox v-model="testMention">在群里 @ 指定成员</el-checkbox><el-input v-if="testMention" v-model="testMentionId" :placeholder="selected === 'feishu' ? '输入成员 open_id' : '输入成员 userId'" /></div>
          </div>
          <template #footer><div class="im-1023-dialog-footer"><span>每次仅测试一条消息</span><div><el-button @click="testDialog = false">关闭</el-button><el-button type="primary" @click="sendDemoTest">发送测试消息</el-button></div></div></template>
        </el-dialog>
      </div>`
  };
})();
