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
        v-for="item in expert.channels"
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
            ><button type="button" @click="testTarget(item)">测试</button
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
            ><button type="button" @click="testTarget(item)">测试</button
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
          关闭主动沟通后仍可手动测试；图片和文件由收发文件开关控制。所有发送结果均为演示。
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
        可用命令：/help · /new · /stop · /sethome · /status。
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
      activeId: this.expert.channels[0]?.id || "",
      botIdDraft: "",
      botSecretDraft: "",
      homeDraft: "",
      targetVisible: false,
      targetKind: "person",
      targetDraft: { id: "", name: "" },
    };
  },
  computed: {
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
      this.loadDraft();
    },
    "expert.id"() {
      this.activeId = this.expert.channels[0]?.id || "";
      this.loadDraft();
    },
  },
  created() {
    this.loadDraft();
  },
  methods: {
    persist,
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
      if (test) this.testTarget(item);
      persist();
      this.targetVisible = false;
      this.$message.success("目标已保存到演示名单");
    },
    testTarget(item) {
      const kind = this.people.some((person) => person.id === item.id)
        ? "person"
        : "group";
      const stored = this.ensureTargets(kind).find(
        (target) => target.id === item.id,
      );
      Vue.set(stored, "result", "成功");
      Vue.set(
        stored,
        "testedAt",
        new Date()
          .toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replaceAll("/", "-"),
      );
      persist();
      this.$message.success("演示发送测试成功，未向真实渠道发送消息");
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
