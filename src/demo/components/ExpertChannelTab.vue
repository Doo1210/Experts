<template>
  <div class="expert-channel-page">
    <div class="section-heading">
      <div>
        <h2>消息渠道</h2>
        <p>
          配置企业微信、钉钉和飞书机器人。主动沟通与收发文件按渠道单独控制。
        </p>
      </div>
    </div>
    <div class="channel-switcher">
      <button
        v-for="item in orderedChannels"
        :key="item.id"
        type="button"
        :class="{ active: item.id === activeId }"
        @click="activeId = item.id"
      >
        {{ item.name }}
        <small>{{ item.connected ? "已连接" : "未连接" }}</small>
      </button>
    </div>
    <div v-if="channel" class="channel-scroll">
      <div class="channel-profile">
        <div>
          <strong>{{ channel.name }}</strong>
          <p>AI Bot · 仅对已有会话主动发送</p>
        </div>
        <span :class="{ disconnected: !channel.connected }">{{
          channel.connected ? "已连接" : "未连接"
        }}</span>
      </div>
      <section class="channel-config-card">
        <div class="channel-card-title">
          <div>
            <strong>启用渠道</strong>
            <p>启用后持续接收并回复此渠道消息</p>
          </div>
          <el-switch v-model="channel.enabled" @change="persist" />
        </div>
        <div class="channel-fields">
          <label
            ><span
              >{{ channel.id === "wecom" ? "Bot ID" : "App ID" }}
              <em>*</em></span
            ><el-input
              v-model.trim="botIdDraft"
              :placeholder="
                channel.connected
                  ? '已配置，留空则不修改'
                  : '请输入应用或机器人 ID'
              " /></label
          ><label
            ><span
              >{{ channel.id === "wecom" ? "Bot Secret" : "App Secret" }}
              <em>*</em></span
            ><el-input
              v-model.trim="botSecretDraft"
              type="password"
              show-password
              :placeholder="
                channel.connected ? '已配置，留空则不修改' : '请输入演示密钥'
              " /></label
          ><label
            ><span>Home 会话或群 ID <small>选填，用于结果投递</small></span
            ><el-input
              v-model.trim="homeDraft"
              placeholder="填写默认投递的会话或群 ID"
          /></label>
          <label v-if="channel.id !== 'wecom'" class="channel-mention-field"
            ><span>群聊需 @ <small>群里有人 @ 专家时才响应</small></span
            ><el-select
              :value="channel.requireMention !== false"
              aria-label="群聊需 @"
              @change="setRequireMention"
            >
              <el-option label="开启" :value="true" />
              <el-option label="关闭" :value="false" />
            </el-select>
          </label>
        </div>
        <div class="channel-config-actions">
          <el-button
            size="mini"
            @click="$message.info('扫码配置入口已打开（演示）')"
            >扫码配置</el-button
          ><el-button type="primary" size="mini" @click="saveConnection"
            >保存并连接</el-button
          >
        </div>
      </section>
      <section class="channel-proactive-card">
        <div class="channel-card-title">
          <div class="channel-proactive-copy">
            <strong>主动沟通</strong
            ><span>以当前渠道的机器人身份，向名单内人员或群主动发送</span>
          </div>
          <span class="channel-check-state"
            >机器人发送配置　{{ channel.checkStatus || "待检查" }}</span
          ><el-button type="text" @click="checkConfig">检查配置</el-button
          ><el-switch
            v-model="channel.proactive"
            :disabled="!channel.enabled"
            @change="persist"
          />
        </div>
        <div class="channel-target-group">
          <div class="channel-target-head">
            <strong
              >可私聊的人 <small>{{ people.length }}</small></strong
            ><button type="button" @click="openTarget('person')">
              + 添加人员
            </button>
          </div>
          <div v-for="item in people" :key="item.id" class="channel-target-row">
            <strong>{{ item.name }}</strong
            ><code>{{ item.id }}</code
            ><span
              :class="
                item.result === '失败'
                  ? 'failed'
                  : item.result === '未知'
                    ? 'unknown'
                    : 'success'
              "
              >{{
                item.testedAt
                  ? `上次测试${item.result} · ${item.testedAt}`
                  : "尚未测试"
              }}</span
            ><button
              type="button"
              :disabled="!channel.enabled || !channel.connected"
              @click="openTest('person', item)"
            >
              测试</button
            ><button
              type="button"
              class="remove"
              @click="removeTarget('person', item)"
            >
              移除
            </button>
          </div>
          <p v-if="!people.length">暂无可私聊的人</p>
        </div>
        <div class="channel-target-group">
          <div class="channel-target-head">
            <strong
              >可发的群 <small>{{ groups.length }}</small></strong
            ><button type="button" @click="openTarget('group')">
              + 添加群
            </button>
          </div>
          <div v-for="item in groups" :key="item.id" class="channel-target-row">
            <strong>{{ item.name }}</strong
            ><code>{{ item.id }}</code
            ><span
              :class="
                item.result === '失败'
                  ? 'failed'
                  : item.result === '未知'
                    ? 'unknown'
                    : 'success'
              "
              >{{
                item.testedAt
                  ? `上次测试${item.result} · ${item.testedAt}`
                  : "尚未测试"
              }}</span
            ><button
              type="button"
              :disabled="!channel.enabled || !channel.connected"
              @click="openTest('group', item)"
            >
              测试</button
            ><button
              type="button"
              class="remove"
              @click="removeTarget('group', item)"
            >
              移除
            </button>
          </div>
          <p v-if="!groups.length">暂无可发的群</p>
        </div>
        <p class="channel-proactive-note">
          {{
            channel.id === "wecom"
              ? "企微发送前会重新核对当前可发送会话。"
              : "群聊需 @ 只控制专家收到群消息时是否响应。"
          }}关闭主动沟通后仍可手动测试；图片和文件由收发文件开关控制。所有发送结果均为演示。
        </p>
      </section>
      <section class="channel-file-card">
        <div>
          <strong>允许收发文件</strong>
          <p>覆盖图片、文件、语音和视频；当前会话文件保存在该任务工作目录</p>
        </div>
        <el-switch
          v-model="channel.files"
          :disabled="!channel.enabled"
          @change="persist"
        />
      </section>
      <div class="channel-command-hint">
        可用命令：/help · /new · /stop · /sethome · /status。{{
          channel.id === "wecom" ? "" : "在群里使用时先 @ 机器人。"
        }}
      </div>
    </div>
    <el-dialog
      :visible.sync="targetVisible"
      width="540px"
      custom-class="manage-dialog channel-target-dialog"
      :close-on-click-modal="false"
      ><div slot="title" class="channel-dialog-title">
        <span
          ><i
            :class="
              targetKind === 'person'
                ? 'el-icon-user'
                : 'el-icon-chat-line-round'
            "
        /></span>
        <div>
          <strong>{{
            targetKind === "person" ? "添加可私聊的人" : "添加可发的群"
          }}</strong
          ><small
            >{{ channel.name }} ·
            {{ targetKind === "person" ? "人员名单" : "群名单" }}</small
          >
        </div>
      </div>
      <p>填写目标的平台 ID，保存后可从名单中测试发送。</p>
      <el-form label-position="top" @submit.native.prevent="saveTarget(false)"
        ><el-form-item
          :label="targetKind === 'person' ? '会话 chat_id' : '群 chat_id'"
          required
          ><el-input
            v-model.trim="targetDraft.id"
            placeholder="输入会话 chat_id" /></el-form-item
        ><el-form-item label="名称或备注"
          ><el-input
            v-model.trim="targetDraft.name"
            placeholder="例如：设备主管、产线协作群" /></el-form-item
      ></el-form>
      <div class="channel-send-basis">
        <strong>发送依据</strong
        ><span
          >发送前还会用本次可发送会话核对 chat_id；不能填写通讯录
          userid。演示版仅在本地模拟。</span
        >
      </div>
      <span slot="footer"
        ><span>可先保存，稍后再测试</span
        ><el-button @click="targetVisible = false">取消</el-button
        ><el-button @click="saveTarget(false)">保存</el-button
        ><el-button type="primary" @click="saveTarget(true)"
          >保存并测试</el-button
        ></span
      ></el-dialog
    >
    <el-dialog
      :visible.sync="testVisible"
      :title="`主动沟通测试 · ${testTargetItem?.name || ''}`"
      width="620px"
      top="6vh"
      :show-close="false"
      :close-on-click-modal="false"
      custom-class="manage-dialog im-1023-dialog im-1023-test-dialog"
    >
      <div slot="title" class="im-1023-dialog-header">
        <div class="im-1023-dialog-icon is-test" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m3 11 17-8-6.8 18-2.7-7.5L3 11Z" />
            <path d="m10.5 13.5 5.2-5.1" />
          </svg>
        </div>
        <div class="im-1023-dialog-header-copy">
          <h3>主动沟通测试</h3>
          <p>
            {{ channel?.name }}机器人 → {{ testTargetItem?.name || "目标" }}
          </p>
        </div>
        <button
          type="button"
          class="im-1023-dialog-close"
          aria-label="关闭弹窗"
          @click="testVisible = false"
        >
          ×
        </button>
      </div>
      <div v-if="testTargetItem" class="im-1023-dialog-body">
        <div class="im-1023-test-context">
          <span class="im-1023-test-context-label">发送目标</span
          ><strong>{{ testTargetItem.name }}</strong
          ><code :title="testTargetItem.id">{{
            shortId(testTargetItem.id)
          }}</code>
        </div>
        <div
          v-if="testResult"
          class="im-1023-test-result"
          :class="`is-${testResult.status}`"
          role="status"
        >
          <div class="im-1023-result-head">
            <span aria-hidden="true">{{
              testResult.status === "accepted"
                ? "✓"
                : testResult.status === "failed"
                  ? "!"
                  : "?"
            }}</span
            ><strong>{{
              testResult.status === "accepted"
                ? "模拟请求已接受"
                : testResult.status === "failed"
                  ? "模拟发送失败"
                  : "模拟结果未知"
            }}</strong>
          </div>
          <p>{{ testResult.detail }}</p>
          <details>
            <summary>技术详情</summary>
            <code
              >{{ testResult.code }} · {{ channel.name }} ·
              {{ shortId(testTargetItem.id) }}</code
            >
          </details>
        </div>
        <div class="im-1023-type-tabs" role="group" aria-label="测试内容类型">
          <button
            type="button"
            :class="{ active: testType === 'text' }"
            @click="selectTestType('text')"
          >
            文字
          </button>
          <button
            type="button"
            :class="{ active: testType === 'image' }"
            :disabled="!channel.files"
            @click="selectTestType('image')"
          >
            图片
          </button>
          <button
            type="button"
            :class="{ active: testType === 'file' }"
            :disabled="!channel.files"
            @click="selectTestType('file')"
          >
            文件
          </button>
        </div>
        <p v-if="!channel.files" class="im-1023-media-hint">
          开启“允许收发文件”后，可测试图片和文件。
        </p>
        <template v-if="testType === 'text'">
          <div class="im-1023-test-input-head">
            <span>测试内容 <em>*</em></span
            ><el-checkbox v-model="testMarkdown">按 Markdown 发送</el-checkbox>
          </div>
          <el-input
            v-model="testText"
            type="textarea"
            :rows="4"
            maxlength="20000"
            show-word-limit
            placeholder="输入将要发送的文字"
          />
        </template>
        <label
          v-else-if="testType === 'image' && channel.id === 'dingtalk'"
          class="im-1023-field"
          ><span>公网图片地址 <em>*</em></span
          ><el-input
            v-model.trim="testImageUrl"
            placeholder="https://example.com/image.png"
          /><small
            >钉钉本地图片按文件附件发送；原生图片消息需要公网地址。</small
          ></label
        >
        <div v-else class="im-1023-upload-field">
          <div class="im-1023-test-input-head">
            <span
              >{{ testType === "image" ? "选择图片" : "选择文件" }}
              <em>*</em></span
            >
          </div>
          <input
            :id="`im-test-upload-${expert.id}`"
            :key="testFileKey"
            class="im-1023-file-input"
            type="file"
            :accept="testType === 'image' ? 'image/*' : undefined"
            :aria-label="testType === 'image' ? '选择图片' : '选择文件'"
            @change="onTestFileChange"
          />
          <label
            class="im-1023-upload-zone"
            :for="`im-test-upload-${expert.id}`"
            ><span class="im-1023-upload-icon" aria-hidden="true"
              ><i
                :class="
                  testType === 'image'
                    ? 'el-icon-picture-outline'
                    : 'el-icon-document'
                " /></span
            ><span class="im-1023-upload-copy"
              ><strong>{{
                testFileName || (testType === "image" ? "添加图片" : "添加文件")
              }}</strong
              ><small>{{
                testFileName
                  ? "已选择，可重新更换"
                  : `从本机选择要发送的${testType === "image" ? "图片" : "文件"}`
              }}</small></span
            ></label
          >
          <p class="im-1023-upload-help">
            文件将从当前专家的工作目录发送（演示）。
          </p>
        </div>
        <div
          v-if="
            testKind === 'group' &&
            channel.id !== 'wecom' &&
            testType === 'text'
          "
          class="im-1023-test-mention"
        >
          <el-checkbox v-model="testMention">在群里 @ 指定成员</el-checkbox
          ><el-input
            v-if="testMention"
            v-model.trim="testMentionId"
            :placeholder="
              channel.id === 'feishu' ? '输入成员 open_id' : '输入成员 userId'
            "
          />
        </div>
      </div>
      <div slot="footer" class="im-1023-dialog-footer">
        <span>每次仅模拟一条消息，不向真实渠道发送</span>
        <div>
          <el-button @click="testVisible = false">关闭</el-button
          ><el-button type="primary" @click="sendDemoTest"
            >发送测试消息</el-button
          >
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Vue from "vue";
import { persist } from "../state";

const DEFAULT_PEOPLE = [
  { id: "wc-owner", name: "授权人", result: "成功", testedAt: "10-10 17:29" },
  {
    id: "wc-recent-1",
    name: "设备主管",
    result: "成功",
    testedAt: "10-10 17:20",
  },
  {
    id: "wc-expired-1",
    name: "已离开最近会话",
    result: "失败",
    testedAt: "10-10 17:11",
  },
  {
    id: "wc-timeout-1",
    name: "网络波动会话",
    result: "未知",
    testedAt: "10-10 17:02",
  },
];
const DEFAULT_GROUPS = [
  {
    id: "wc-group-1",
    name: "产线协作群",
    result: "成功",
    testedAt: "10-10 17:29",
  },
  {
    id: "wc-group-expired",
    name: "历史通知群",
    result: "失败",
    testedAt: "10-10 17:20",
  },
];
const copy = (value) => JSON.parse(JSON.stringify(value));

export default {
  name: "ExpertChannelTab",
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      activeId:
        this.expert.channels.find((item) => item.id === "dingtalk")?.id ||
        this.expert.channels[0]?.id ||
        "",
      botIdDraft: "",
      botSecretDraft: "",
      homeDraft: "",
      targetVisible: false,
      targetKind: "person",
      targetDraft: { id: "", name: "" },
      testVisible: false,
      testKind: "person",
      testTargetItem: null,
      testType: "text",
      testText: "",
      testMarkdown: false,
      testImageUrl: "",
      testFileName: "",
      testFileKey: 0,
      testMention: false,
      testMentionId: "",
      testResult: null,
    };
  },
  computed: {
    orderedChannels() {
      return [...this.expert.channels].sort(
        (a, b) => Number(b.id === "dingtalk") - Number(a.id === "dingtalk"),
      );
    },
    channel() {
      return (
        this.expert.channels.find((item) => item.id === this.activeId) ||
        this.expert.channels[0]
      );
    },
    people() {
      return (
        this.channel?.people ||
        (this.channel?.id === "wecom" ? DEFAULT_PEOPLE : [])
      );
    },
    groups() {
      return (
        this.channel?.groups ||
        (this.channel?.id === "wecom" ? DEFAULT_GROUPS : [])
      );
    },
  },
  watch: {
    activeId() {
      this.testVisible = false;
      this.loadDraft();
    },
    "expert.id"() {
      this.activeId = this.orderedChannels[0]?.id || "";
      this.loadDraft();
    },
  },
  created() {
    this.loadDraft();
  },
  methods: {
    persist,
    setRequireMention(enabled) {
      Vue.set(this.channel, "requireMention", Boolean(enabled));
      persist();
    },
    loadDraft() {
      this.botIdDraft = "";
      this.botSecretDraft = "";
      this.homeDraft = this.channel?.homeId || "";
    },
    saveConnection() {
      if (!this.channel.connected && (!this.botIdDraft || !this.botSecretDraft))
        return this.$message.warning("请填写演示 Bot ID 和 Secret");
      if (this.botIdDraft) Vue.set(this.channel, "botId", this.botIdDraft);
      if (this.botSecretDraft)
        Vue.set(this.channel, "botSecretConfigured", true);
      Vue.set(this.channel, "homeId", this.homeDraft);
      Vue.set(this.channel, "connected", true);
      persist();
      this.botSecretDraft = "";
      this.$message.success("渠道演示配置已保存，本地模拟连接成功");
    },
    checkConfig() {
      Vue.set(this.channel, "checkStatus", "已检查（演示）");
      persist();
      this.$message.success("本地演示配置检查完成");
    },
    openTarget(kind) {
      this.targetKind = kind;
      this.targetDraft = { id: "", name: "" };
      this.targetVisible = true;
    },
    ensureTargets(kind) {
      const key = kind === "person" ? "people" : "groups";
      if (!this.channel[key])
        Vue.set(
          this.channel,
          key,
          copy(
            this.channel.id === "wecom"
              ? kind === "person"
                ? DEFAULT_PEOPLE
                : DEFAULT_GROUPS
              : [],
          ),
        );
      return this.channel[key];
    },
    saveTarget(test) {
      const id = this.targetDraft.id.trim();
      if (!id) return this.$message.warning("请输入会话 chat_id");
      const list = this.ensureTargets(this.targetKind);
      if (list.some((item) => item.id === id))
        return this.$message.warning("目标已存在");
      const item = {
        id,
        name: this.targetDraft.name.trim() || id,
        result: "",
        testedAt: "",
      };
      list.push(item);
      persist();
      this.targetVisible = false;
      this.$message.success("目标已保存到演示名单");
      if (test) this.openTest(this.targetKind, item);
    },
    shortId(id) {
      return String(id).length > 18 ? `…${String(id).slice(-10)}` : id;
    },
    openTest(kind, item) {
      if (!this.channel.enabled || !this.channel.connected)
        return this.$message.warning("请先启用并保存渠道配置");
      this.testKind = kind;
      this.testTargetItem = item;
      this.testType = "text";
      this.testText = "";
      this.testMarkdown = false;
      this.testImageUrl = "";
      this.testFileName = "";
      this.testFileKey += 1;
      this.testMention = false;
      this.testMentionId = "";
      this.testResult = null;
      this.testVisible = true;
    },
    selectTestType(type) {
      this.testType = type;
      this.testResult = null;
      this.testFileName = "";
      this.testFileKey += 1;
    },
    onTestFileChange(event) {
      const file = event.target.files?.[0];
      this.testFileName = file ? file.name : "";
    },
    sendDemoTest() {
      if (
        !this.testTargetItem ||
        !this.channel.enabled ||
        !this.channel.connected
      )
        return this.$message.warning("请先启用并保存渠道配置");
      if (this.testType === "text" && !this.testText.trim())
        return this.$message.warning("请输入测试文字");
      if (
        this.testType === "image" &&
        this.channel.id === "dingtalk" &&
        !/^https?:\/\//i.test(this.testImageUrl.trim())
      )
        return this.$message.warning("钉钉图片消息需要 HTTP(S) 图片地址");
      if (
        (this.testType === "file" ||
          (this.testType === "image" && this.channel.id !== "dingtalk")) &&
        !this.testFileName
      )
        return this.$message.warning("请选择测试文件");
      if (this.testType !== "text" && !this.channel.files)
        return this.$message.warning("请先开启允许收发文件");
      if (this.testMention && !this.testMentionId.trim())
        return this.$message.warning("请输入要 @ 的群成员 ID");
      if (
        this.testMention &&
        this.channel.id === "feishu" &&
        !this.testMentionId.startsWith("ou_")
      )
        return this.$message.warning("飞书群成员 open_id 应以 ou_ 开头");

      const id = this.testTargetItem.id;
      const unavailableWecom =
        this.channel.id === "wecom" &&
        !["wc-owner", "wc-recent-1", "wc-timeout-1", "wc-group-1"].includes(id);
      const status = /timeout/i.test(id)
        ? "unknown"
        : unavailableWecom || /expired|denied|no-bot|no-dm/i.test(id)
          ? "failed"
          : "accepted";
      const detail =
        status === "accepted"
          ? "本地模拟已接受发送请求；不代表对方已读，也没有发送到真实渠道。"
          : status === "unknown"
            ? "本地模拟请求超时，结果未知；演示版没有发送真实消息。"
            : this.channel.id === "wecom"
              ? "本地模拟：目标不在本次可发送会话中。"
              : this.testKind === "group"
                ? "本地模拟：机器人未加入目标群。"
                : "本地模拟：机器人没有向该用户发送消息的权限。";
      const result = {
        status,
        at: new Date().toISOString(),
        detail,
        code:
          status === "accepted"
            ? "DEMO_ACCEPTED"
            : status === "unknown"
              ? "DEMO_RESULT_UNKNOWN"
              : unavailableWecom
                ? "DEMO_SESSION_UNAVAILABLE"
                : "DEMO_SEND_FORBIDDEN",
      };
      this.testResult = result;
      const stored = this.ensureTargets(this.testKind).find(
        (target) => target.id === id,
      );
      if (stored) {
        const label = { accepted: "成功", failed: "失败", unknown: "未知" }[
          status
        ];
        Vue.set(stored, "result", label);
        Vue.set(
          stored,
          "testedAt",
          new Date(result.at)
            .toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
            .replaceAll("/", "-"),
        );
        Vue.set(stored, "lastTest", result);
        persist();
      }
    },
    removeTarget(kind, item) {
      const list = this.ensureTargets(kind);
      list.splice(
        list.findIndex((x) => x.id === item.id),
        1,
      );
      persist();
    },
  },
};
</script>
