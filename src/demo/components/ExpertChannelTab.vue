<template>
  <div class="expert-channel-page">
    <div class="section-heading">
      <div>
        <h2>消息渠道</h2>
        <p>
          接入钉钉、企业微信和飞书机器人。回复当前会话无需主动沟通；向其他人或群发送须开启主动沟通并批准目标。
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
          <p>{{ channelDescription }}</p>
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
          <el-switch v-model="channel.enabled" @change="onEnabledChange" />
        </div>
        <div class="channel-fields">
          <label
            ><span
              >{{
                channel.id === "wecom"
                  ? "Bot ID"
                  : channel.id === "dingtalk"
                    ? "Client ID"
                    : "App ID"
              }}
              <em>*</em></span
            ><el-input
              v-model.trim="botIdDraft"
              :placeholder="
                channel.botId ? '已配置，留空则不修改' : '请输入应用或机器人 ID'
              " /></label
          ><label
            ><span
              >{{
                channel.id === "wecom"
                  ? "Bot Secret"
                  : channel.id === "dingtalk"
                    ? "Client Secret"
                    : "App Secret"
              }}
              <em>*</em></span
            ><el-input
              v-model.trim="botSecretDraft"
              type="password"
              show-password
              :placeholder="
                channel.botSecretConfigured
                  ? '已配置，留空则不修改'
                  : '请输入密钥'
              " /></label
          ><label v-if="channel.id === 'dingtalk'"
            ><span>Robot Code <small>选填，与 Client ID 不同时填写</small></span
            ><el-input
              v-model.trim="robotCodeDraft"
              placeholder="留空则使用 Client ID" /></label
          ><label
            ><span
              >Home 会话或群 ID
              <small>仅用于默认结果投递，不自动加入主动沟通名单</small></span
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
            v-if="channel.id !== 'dingtalk'"
            size="mini"
            @click="$message.info('请按扫码配置指引完成机器人授权')"
            >扫码配置</el-button
          ><el-button type="primary" size="mini" @click="saveConnection">{{
            channel.enabled ? "保存并连接" : "保存配置"
          }}</el-button>
        </div>
      </section>
      <section class="channel-proactive-card">
        <div class="channel-card-title">
          <div class="channel-proactive-copy">
            <strong>主动沟通</strong
            ><span
              >专家可根据用户指令或已批准的任务规则，以本渠道机器人身份向名单内目标发送。</span
            >
          </div>
          <span class="channel-check-state"
            >发送条件检查　{{
              productCopy(channel.checkStatus || "待检查")
            }}</span
          ><el-button type="text" @click="checkConfig">检查配置</el-button
          ><el-button type="text" @click="openDeliveries">发送记录</el-button
          ><el-switch
            v-model="channel.proactive"
            :disabled="!channel.enabled || !channel.connected"
            @change="persist"
          />
        </div>
        <div v-if="channel.checkReport" class="channel-check-report">
          <p v-for="item in channel.checkReport" :key="item.label">
            <strong>{{ item.label }}</strong
            ><span>{{ productCopy(item.detail) }}</span>
          </p>
          <small>目标可达性需通过实际发送结果确认。</small>
        </div>
        <p
          v-if="
            channel.proactive &&
            !people.some((item) => item.approved !== false) &&
            !groups.some((item) => item.approved !== false)
          "
          class="channel-empty-warning"
        >
          主动沟通已开启，暂无已批准的可发送目标。
        </p>
        <div class="channel-target-columns">
          <div class="channel-target-group">
            <div class="channel-target-head">
              <strong
                >可私聊的人 <small>{{ people.length }}</small></strong
              ><button type="button" @click="openTarget('person')">
                + 添加人员
              </button>
            </div>
            <div class="channel-target-list">
              <div
                v-for="item in people"
                :key="item.id"
                class="channel-target-row"
              >
                <strong>{{ item.name }}</strong
                ><small v-if="item.purpose" class="channel-target-purpose">{{
                  item.purpose
                }}</small
                ><span :class="targetStatusClass(item)">{{
                  targetStatusLabel(item)
                }}</span
                ><button
                  type="button"
                  @click="openTargetDetail('person', item)"
                >
                  详情</button
                ><button
                  type="button"
                  :disabled="
                    !channel.enabled || !channel.connected || !channel.proactive
                  "
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
              <p v-if="!people.length">
                暂无可私聊的人。{{ targetEmptyFor("person") }}
              </p>
            </div>
          </div>
          <div class="channel-target-group">
            <div class="channel-target-head">
              <strong
                >可发的群 <small>{{ groups.length }}</small></strong
              ><button type="button" @click="openTarget('group')">
                + 添加群
              </button>
            </div>
            <div class="channel-target-list">
              <div
                v-for="item in groups"
                :key="item.id"
                class="channel-target-row"
              >
                <strong>{{ item.name }}</strong
                ><small v-if="item.purpose" class="channel-target-purpose">{{
                  item.purpose
                }}</small
                ><span :class="targetStatusClass(item)">{{
                  targetStatusLabel(item)
                }}</span
                ><button type="button" @click="openTargetDetail('group', item)">
                  详情</button
                ><button
                  type="button"
                  :disabled="
                    !channel.enabled || !channel.connected || !channel.proactive
                  "
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
              <p v-if="!groups.length">
                暂无可发的群。{{ targetEmptyFor("group") }}
              </p>
            </div>
          </div>
        </div>
        <p class="channel-proactive-note">
          {{
            channel.id === "wecom"
              ? "企微名单来自本专家机器人的历史互动，当前可达性仍以平台发送结果为准。"
              : "群聊需 @ 只控制专家收到群消息时是否响应。"
          }}关闭主动沟通后不能发送；图片和文件还受文件开关控制。
        </p>
        <p class="channel-proactive-note">
          例如：“把工作空间里的质检报告发到产线协作群”。专家会先确认文件，再查已批准目标；跨平台同名群会询问平台。回复当前消息会话无需主动沟通；Home
          投递目标不会自动加入名单。
        </p>
      </section>
      <section class="channel-file-card">
        <div>
          <strong>允许收发图片与文件</strong>
          <p>
            文件保存在当前渠道对话工作目录；向名单目标发送附件还需开启主动沟通。<template
              v-if="channel.id === 'dingtalk'"
              >钉钉群内 @机器人不支持发送语音、视频和文件。<a
                href="https://open.dingtalk.com/document/development/robot-message-type.md"
                target="_blank"
                rel="noopener noreferrer"
                >查看钉钉说明</a
              ></template
            >
          </p>
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
      <p>{{ targetDiscoveryHint }}</p>
      <div class="channel-target-modes">
        <el-button
          size="mini"
          :type="targetMode === 'candidate' ? 'primary' : ''"
          @click="setCandidateMode"
          >{{
            channel.id === "feishu" && targetKind === "group"
              ? "机器人可见群"
              : "历史互动线索"
          }}</el-button
        >
        <el-button
          v-if="channel.id !== 'wecom'"
          size="mini"
          :type="targetMode === 'manual' ? 'primary' : ''"
          @click="setManualTarget"
          >手动输入并核对 ID</el-button
        >
      </div>
      <div v-if="targetMode === 'candidate'" class="channel-candidate-list">
        <el-button
          v-if="channel.id === 'feishu' && targetKind === 'group'"
          size="mini"
          @click="$message.info('群列表已刷新')"
          >刷新群列表</el-button
        >
        <button
          v-for="item in availableCandidates"
          :key="item.id"
          type="button"
          :class="{ selected: targetDraft.id === item.id }"
          @click="selectCandidate(item)"
        >
          <strong>{{ item.name }}</strong
          ><small
            >{{ productCopy(item.source)
            }}<template v-if="item.lastInteractionAt">
              · 最近互动 {{ item.lastInteractionAt }}</template
            ></small
          ><code>{{ shortId(item.id) }}</code>
        </button>
        <p v-if="!availableCandidates.length">{{ targetEmptyHint }}</p>
      </div>
      <el-form
        v-else
        label-position="top"
        @submit.native.prevent="saveTarget(false)"
      >
        <el-form-item :label="targetIdLabel" required
          ><el-input
            v-model.trim="targetDraft.id"
            :placeholder="`输入${targetIdLabel}`"
        /></el-form-item>
        <el-form-item label="平台显示名称" required
          ><el-input
            v-model.trim="targetDraft.name"
            :placeholder="
              targetKind === 'person' ? '例如：设备主管' : '例如：产线协作群'
            "
        /></el-form-item>
      </el-form>
      <div v-if="targetDraft.id" class="channel-target-review">
        <p>
          核对目标：{{ targetDraft.name || "待填写平台显示名称" }} ·
          {{ targetIdLabel }} {{ shortId(targetDraft.id) }}
        </p>
        <p>
          来源：{{ productCopy(targetDraft.source || "管理员手动输入") }}。{{
            targetDraft.lastInteractionAt
              ? `最近互动 ${targetDraft.lastInteractionAt}；`
              : ""
          }}历史线索与通讯录结果均不证明当前可发送。
        </p>
        <el-input
          v-model.trim="targetDraft.purpose"
          :placeholder="
            targetKind === 'person'
              ? '用途说明（选填）：负责设备维护与停机协调'
              : '用途说明（选填）：用于产线异常协同'
          "
        />
        <el-checkbox v-model="targetConfirmed"
          >我已核对目标身份、ID 与当前机器人适用范围，批准加入名单</el-checkbox
        >
      </div>
      <div class="channel-send-basis">
        <strong>发送依据</strong><span>{{ targetSendBasis }}</span>
      </div>
      <span slot="footer"
        ><span>保存只批准名单，不向平台发送</span
        ><el-button @click="targetVisible = false">取消</el-button
        ><el-button type="primary" @click="saveTarget(false)"
          >批准加入名单</el-button
        ><el-button
          :disabled="
            !channel.enabled || !channel.connected || !channel.proactive
          "
          @click="saveTarget(true)"
          >批准并测试</el-button
        ></span
      ></el-dialog
    >
    <el-dialog
      :visible.sync="detailVisible"
      title="已批准目标详情"
      width="500px"
      custom-class="manage-dialog channel-detail-dialog"
    >
      <div v-if="detailItem" class="channel-detail-body">
        <p>
          <strong>平台显示名称</strong><span>{{ detailItem.name }}</span>
        </p>
        <p>
          <strong>目标类型</strong
          ><span>{{ detailKind === "person" ? "人员" : "群聊" }}</span>
        </p>
        <p>
          <strong>来源</strong
          ><span>{{ productCopy(detailItem.source || "管理员添加") }}</span>
        </p>
        <p>
          <strong>最近互动</strong
          ><span>{{ detailItem.lastInteractionAt || "无记录" }}</span>
        </p>
        <p>
          <strong>最近核对</strong
          ><span>{{ detailItem.checkedAt || "旧版记录，待重新核对" }}</span>
        </p>
        <p>
          <strong>原生 ID</strong><code>{{ detailItem.id }}</code
          ><el-button type="text" @click="copyTargetId">复制</el-button>
        </p>
        <p>
          <strong>验证状态</strong
          ><span>{{
            detailItem.testedAt
              ? targetStatusLabel(detailItem)
              : "已批准 · 尚未验证"
          }}</span>
        </p>
        <label
          >用途说明（选填）<el-input
            v-model.trim="detailPurpose"
            :placeholder="
              detailKind === 'person'
                ? '负责设备维护与停机协调'
                : '用于产线异常协同'
            "
        /></label>
      </div>
      <span slot="footer"
        ><el-button @click="detailVisible = false">取消</el-button
        ><el-button type="primary" @click="saveTargetDetail"
          >保存用途说明</el-button
        ></span
      >
    </el-dialog>
    <el-dialog
      :visible.sync="deliveriesVisible"
      title="主动沟通 · 发送记录"
      width="760px"
      custom-class="manage-dialog channel-deliveries-dialog"
    >
      <p>查看当前专家的发送流水。平台已受理不代表对方已读。</p>
      <div class="channel-delivery-filters">
        <el-select v-model="deliveryPlatform" size="mini" aria-label="筛选平台"
          ><el-option label="全部平台" value="" /><el-option
            v-for="item in expert.channels"
            :key="item.id"
            :label="item.name"
            :value="item.id"
        /></el-select>
        <el-input
          v-model.trim="deliveryQuery"
          size="mini"
          placeholder="搜索目标名称或 ID"
        />
        <el-select v-model="deliveryStatus" size="mini" aria-label="筛选状态"
          ><el-option label="全部状态" value="" /><el-option
            label="已受理"
            value="accepted" /><el-option
            label="发送失败"
            value="failed" /><el-option
            label="结果未知"
            value="unknown" /><el-option label="部分成功" value="partial"
        /></el-select>
        <el-input
          v-model.trim="deliveryDate"
          size="mini"
          placeholder="日期 YYYY-MM-DD"
        />
        <el-input
          v-model.trim="deliveryInitiator"
          size="mini"
          placeholder="发起来源"
        />
      </div>
      <div v-if="filteredDeliveries.length" class="channel-delivery-list">
        <article v-for="record in filteredDeliveries" :key="record.id">
          <div>
            <strong
              >{{ platformName(record.platform) }} ·
              {{ record.targetName }}</strong
            ><span>{{ deliveryStatusLabel(record.status) }}</span>
          </div>
          <p>
            {{ record.summary }} · {{ productCopy(record.initiator) }} ·
            {{ formatDeliveryTime(record.at) }}
          </p>
          <small
            >{{ productCopy(record.parts) }} · delivery_id
            {{ productDeliveryId(record.id) }} · 平台回执
            {{ productReceipt(record.receipt) }}</small
          >
        </article>
      </div>
      <p v-else>当前筛选下暂无发送记录。</p>
      <span slot="footer"
        ><el-button @click="deliveriesVisible = false">关闭</el-button></span
      >
    </el-dialog>
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
            {{ channel?.name }}机器人（{{ channel?.botId || "当前机器人" }}）→
            {{ testTargetItem?.name || "目标" }}
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
          ><strong
            >{{ testTargetItem.name }} ·
            {{ testKind === "person" ? "单聊" : "群聊" }}</strong
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
                  : testResult.status === "partial"
                    ? "!"
                    : "?"
            }}</span
            ><strong>{{
              testResult.status === "accepted"
                ? "平台已受理"
                : testResult.status === "failed"
                  ? "发送失败"
                  : testResult.status === "partial"
                    ? "部分成功"
                    : "结果未知"
            }}</strong>
          </div>
          <p>{{ productCopy(testResult.detail) }}</p>
          <p>
            发送时间：{{ formatDeliveryTime(testResult.at) }} · 平台回执：{{
              productReceipt(testResult.code)
            }}
          </p>
          <details>
            <summary>技术详情</summary>
            <code
              >{{ productReceipt(testResult.code) }} ·
              {{ productDeliveryId(testResult.deliveryId) }} ·
              {{ channel.name }} · {{ shortId(testTargetItem.id) }}</code
            >
          </details>
        </div>
        <div class="im-1023-test-input-head">
          <span>测试文字（可选，与附件可一起发送）</span>
        </div>
        <el-input
          v-model="testText"
          type="textarea"
          :rows="3"
          maxlength="20000"
          show-word-limit
          placeholder="输入将发送的文字；没有附件时必填"
        />
        <div class="im-1023-type-tabs" role="group" aria-label="附件类型">
          <button
            type="button"
            :class="{ active: testType === 'none' }"
            @click="selectTestType('none')"
          >
            无附件
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
          开启“允许收发图片与文件”后，才可附加工作空间文件；文字仍可单独发送。
        </p>
        <div v-if="testType !== 'none'" class="im-1023-upload-field">
          <div class="im-1023-test-input-head">
            <span
              >从当前专家工作空间选择{{
                testType === "image" ? "图片" : "文件"
              }}
              <em>*</em></span
            >
          </div>
          <el-select
            v-model="testFileId"
            placeholder="选择一个工作空间文件"
            style="width: 100%"
          >
            <el-option
              v-for="file in selectableWorkspaceFiles"
              :key="file.id"
              :label="file.name"
              :value="file.id"
            />
          </el-select>
          <p class="im-1023-upload-help">
            {{
              selectableWorkspaceFiles.length
                ? "选择当前专家工作空间中的文件。"
                : "工作空间暂无此类文件；请先在专家工作空间上传，再返回此处选择。"
            }}
          </p>
        </div>
      </div>
      <div slot="footer" class="im-1023-dialog-footer">
        <span>将向目标发送测试消息；文字与附件可能分步处理</span>
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
import { demoChannelCandidates } from "../channel-target-fixtures";

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
      robotCodeDraft: "",
      homeDraft: "",
      targetVisible: false,
      targetKind: "person",
      targetMode: "candidate",
      targetConfirmed: false,
      targetDraft: {
        id: "",
        name: "",
        purpose: "",
        source: "",
        lastInteractionAt: "",
      },
      detailVisible: false,
      detailItem: null,
      detailKind: "person",
      detailPurpose: "",
      deliveriesVisible: false,
      deliveryPlatform: "",
      deliveryQuery: "",
      deliveryStatus: "",
      deliveryDate: "",
      deliveryInitiator: "",
      testVisible: false,
      testKind: "person",
      testTargetItem: null,
      testType: "none",
      testText: "",
      testFileId: "",
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
    channelDescription() {
      return (
        {
          wecom: "AI Bot · 仅对已有会话主动发送",
          dingtalk: "企业内部应用机器人",
          feishu: "企业自建应用机器人",
        }[this.channel?.id] || ""
      );
    },
    targetIdLabel() {
      const labels = {
        dingtalk: { person: "人员 userId", group: "群 openConversationId" },
        feishu: { person: "人员 open_id", group: "群 chat_id" },
        wecom: {
          person: "人员机器人会话目标 ID",
          group: "群机器人会话目标 ID",
        },
      };
      return labels[this.channel?.id]?.[this.targetKind] || "目标 ID";
    },
    targetSendBasis() {
      return this.channel?.id === "wecom"
        ? "仅从本专家机器人已互动记录中选择。历史记录不保证平台当前可达，最终以发送回执判断。"
        : this.channel?.id === "dingtalk"
          ? "人员使用 userId，群使用 openConversationId。手动输入须核对身份；机器人须在目标群内。"
          : "人员使用 open_id，群使用 chat_id。可见群取决于应用权限，手动输入须核对身份。";
    },
    targetDiscoveryHint() {
      if (this.channel?.id === "wecom")
        return "从当前专家机器人已互动的会话中选择；不提供任意通讯录 userid 冷启动。";
      if (this.channel?.id === "feishu" && this.targetKind === "group")
        return "优先从机器人可见群中选择；需要群信息权限，也可手动输入并核对 chat_id。";
      if (this.channel?.id === "feishu")
        return "人员线索来自入站 open_id；有通讯录权限时可查询，仍需核对应用可用范围。";
      return "可输入并核对平台 ID，或选择当前专家机器人历史互动线索；通讯录命中不证明可发送。";
    },
    targetEmptyHint() {
      if (this.channel?.id === "feishu" && this.targetKind === "group")
        return "暂无可见群。可刷新列表，或让机器人在目标群收到消息后输入并核对 chat_id。";
      if (this.channel?.id === "feishu")
        return "暂无入站人员线索。有通讯录权限时可按人员查询，仍需核对应用可用范围。";
      if (this.channel?.id === "dingtalk" && this.targetKind === "group")
        return "暂无历史群线索。先让机器人加入目标群并收到一条消息，或手动输入并核对 openConversationId。";
      return "暂无历史互动线索。先让目标与当前专家机器人发生一次实际消息交互。";
    },
    availableCandidates() {
      const known = new Set(
        (this.targetKind === "person" ? this.people : this.groups).map(
          (item) => item.id,
        ),
      );
      return demoChannelCandidates(
        this.expert.id,
        this.channel?.id,
        this.targetKind,
      ).filter((item) => !known.has(item.id));
    },
    people() {
      return this.channel?.people || [];
    },
    groups() {
      return this.channel?.groups || [];
    },
    selectableWorkspaceFiles() {
      return (this.expert.files || []).filter(
        (file) =>
          file.kind === "file" &&
          (this.testType !== "image" ||
            file.mime?.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)),
      );
    },
    filteredDeliveries() {
      return this.expert.channels
        .flatMap((channel) =>
          (channel.deliveries || []).map((record) => ({
            ...record,
            platform: channel.id,
          })),
        )
        .filter(
          (record) =>
            (!this.deliveryPlatform ||
              record.platform === this.deliveryPlatform) &&
            (!this.deliveryStatus || record.status === this.deliveryStatus) &&
            (!this.deliveryQuery ||
              `${record.targetName} ${record.targetId}`
                .toLowerCase()
                .includes(this.deliveryQuery.toLowerCase())) &&
            (!this.deliveryDate || record.at.startsWith(this.deliveryDate)) &&
            (!this.deliveryInitiator ||
              record.initiator.includes(this.deliveryInitiator)),
        )
        .sort((a, b) => b.at.localeCompare(a.at));
    },
  },
  watch: {
    activeId() {
      this.targetVisible = false;
      this.detailVisible = false;
      this.testVisible = false;
      this.deliveriesVisible = false;
      this.loadDraft();
    },
    "expert.id"() {
      this.targetVisible = false;
      this.detailVisible = false;
      this.testVisible = false;
      this.deliveriesVisible = false;
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
    onEnabledChange(enabled) {
      if (!enabled) {
        Vue.set(this.channel, "connected", false);
        Vue.set(this.channel, "proactive", false);
        this.testVisible = false;
      }
      persist();
    },
    loadDraft() {
      this.botIdDraft = "";
      this.botSecretDraft = "";
      this.robotCodeDraft = this.channel?.robotCode || "";
      this.homeDraft = this.channel?.homeId || "";
    },
    saveConnection() {
      if (
        this.channel.enabled &&
        (!(this.botIdDraft || this.channel.botId) ||
          !(this.botSecretDraft || this.channel.botSecretConfigured))
      )
        return this.$message.warning(
          `请填写${this.channel.id === "dingtalk" ? " Client ID 和 Client Secret" : "机器人 ID 和 Secret"}`,
        );
      if (this.botIdDraft) Vue.set(this.channel, "botId", this.botIdDraft);
      if (this.botSecretDraft)
        Vue.set(this.channel, "botSecretConfigured", true);
      if (this.channel.id === "dingtalk")
        Vue.set(this.channel, "robotCode", this.robotCodeDraft);
      Vue.set(this.channel, "homeId", this.homeDraft);
      Vue.set(this.channel, "connected", Boolean(this.channel.enabled));
      persist();
      this.botSecretDraft = "";
      this.$message.success(
        this.channel.enabled
          ? "渠道配置已保存，连接成功"
          : "渠道配置已保存；启用渠道后再连接",
      );
    },
    checkConfig() {
      const hasCredentials = Boolean(
        this.channel.botId && this.channel.botSecretConfigured,
      );
      const report = [
        {
          label: "渠道启用",
          detail: this.channel.enabled ? "已开启" : "未开启；无法发送",
        },
        {
          label: "机器人凭据",
          detail: hasCredentials
            ? "凭据已填写；发送权限仍需核对"
            : "凭据未填写完整；请补齐后重新检查",
        },
        {
          label: "应用发送权限",
          detail: "请确认平台授权范围与机器人发送权限",
        },
        {
          label: "连接条件",
          detail:
            this.channel.id === "wecom"
              ? this.channel.connected
                ? "已连接；发送时仍需确认目标会话可达"
                : "未连接；企微主动发送需要该机器人连接"
              : "渠道连接与发送权限需分别确认",
        },
        { label: "目标可达性", detail: "静态检查无法确认；需实际发送验证" },
      ];
      Vue.set(this.channel, "checkReport", report);
      Vue.set(
        this.channel,
        "checkStatus",
        this.channel.enabled && hasCredentials ? "条件已检查" : "部分条件待补",
      );
      persist();
      this.$message.info("发送条件已检查；目标可达性需实际发送确认");
    },
    targetEmptyFor(kind) {
      if (this.channel.id === "feishu" && kind === "group")
        return "可刷新机器人可见群，或让机器人先在群内互动。";
      if (this.channel.id === "feishu")
        return "可从入站 open_id 或有权限的通讯录查询中核对目标。";
      if (this.channel.id === "dingtalk" && kind === "group")
        return "让机器人先加入群并互动，或输入并核对 openConversationId。";
      return "让目标先与当前专家机器人互动，再从线索中核对并批准。";
    },
    openDeliveries() {
      this.deliveryPlatform = this.channel.id;
      this.deliveryQuery = "";
      this.deliveryStatus = "";
      this.deliveryDate = "";
      this.deliveryInitiator = "";
      this.deliveriesVisible = true;
    },
    platformName(id) {
      return this.expert.channels.find((item) => item.id === id)?.name || id;
    },
    deliveryStatusLabel(status) {
      return (
        {
          accepted: "已受理",
          failed: "发送失败",
          unknown: "结果未知",
          partial: "部分成功",
        }[status] || status
      );
    },
    productCopy(value) {
      return String(value || "")
        .replaceAll(
          "本地无法核验平台授权范围与机器人发送权限",
          "请确认平台授权范围与机器人发送权限",
        )
        .replaceAll(
          "本地连接状态仅供演示；出站权限需平台验证",
          "渠道连接与发送权限需分别确认",
        )
        .replaceAll(
          "未填写完整演示凭据；预置连接也不代表凭据已验证",
          "凭据未填写完整；请补齐后重新检查",
        )
        .replaceAll(
          "已填写演示凭据，未向平台验证",
          "凭据已填写；发送权限仍需核对",
        )
        .replaceAll(
          "本地显示已连接；真实 WebSocket 状态未验证",
          "已连接；发送时仍需确认目标会话可达",
        )
        .replaceAll("旧版演示名单", "管理员添加")
        .replaceAll("管理员模拟测试", "管理员测试")
        .replaceAll("文字模拟已受理", "文字已受理")
        .replaceAll("附件模拟上传失败", "附件上传失败")
        .replaceAll(
          "本地模拟已接受发送请求；不代表对方已读，也没有发送到真实渠道。",
          "请求已受理；不代表对方已读。",
        )
        .replaceAll(
          "本地模拟请求超时，结果未知；演示版没有发送真实消息。",
          "请求超时，结果未知；请核对发送记录，勿直接重试。",
        )
        .replaceAll(
          "本地模拟：文字已受理，但附件上传失败；不能按全部成功处理，也未发送到真实渠道。",
          "文字已受理，但附件上传失败；请分别查看发送结果。",
        )
        .replaceAll("模拟失败：", "发送失败：")
        .replaceAll("模拟结果未知", "结果未知")
        .replaceAll("本地模拟：", "")
        .replaceAll("（演示，需权限）", "（需权限）")
        .replaceAll("（演示）", "")
        .replaceAll("演示", "")
        .replaceAll("模拟", "");
    },
    productDeliveryId(id) {
      return String(id || "")
        .replace(/^demo-delivery-/, "dly-")
        .replace(/^demo-/, "dly-");
    },
    productReceipt(receipt) {
      return String(receipt || "").replace(/^DEMO_/, "");
    },
    formatDeliveryTime(at) {
      return new Date(at).toLocaleString("zh-CN", { hour12: false });
    },
    openTargetDetail(kind, item) {
      this.detailKind = kind;
      this.detailItem = item;
      this.detailPurpose = item.purpose || "";
      this.detailVisible = true;
    },
    saveTargetDetail() {
      if (!this.detailItem) return;
      Vue.set(this.detailItem, "purpose", this.detailPurpose);
      persist();
      this.detailVisible = false;
    },
    async copyTargetId() {
      if (!this.detailItem) return;
      try {
        await navigator.clipboard.writeText(this.detailItem.id);
        this.$message.success("目标 ID 已复制");
      } catch {
        this.$message.warning("复制失败，可从详情中手动复制");
      }
    },
    openTarget(kind) {
      this.targetKind = kind;
      this.targetMode = "candidate";
      this.targetConfirmed = false;
      this.targetDraft = {
        id: "",
        name: "",
        purpose: "",
        source: "",
        lastInteractionAt: "",
      };
      this.targetVisible = true;
    },
    setManualTarget() {
      this.targetMode = "manual";
      this.targetConfirmed = false;
      this.targetDraft = {
        id: "",
        name: "",
        purpose: "",
        source: "管理员手动输入",
        lastInteractionAt: "",
      };
    },
    setCandidateMode() {
      this.targetMode = "candidate";
      this.targetConfirmed = false;
      this.targetDraft = {
        id: "",
        name: "",
        purpose: "",
        source: "",
        lastInteractionAt: "",
      };
    },
    selectCandidate(item) {
      this.targetConfirmed = false;
      this.targetDraft = { ...item, purpose: "" };
    },
    ensureTargets(kind) {
      const key = kind === "person" ? "people" : "groups";
      if (!Array.isArray(this.channel[key])) Vue.set(this.channel, key, []);
      return this.channel[key];
    },
    saveTarget(test) {
      const id = this.targetDraft.id.trim();
      if (!id) return this.$message.warning("请先选择或输入目标");
      if (!this.targetDraft.name.trim())
        return this.$message.warning("请填写已核对的平台显示名称");
      if (!this.targetConfirmed)
        return this.$message.warning("请先核对身份并明确批准");
      const list = this.ensureTargets(this.targetKind);
      if (list.some((item) => item.id === id))
        return this.$message.warning("目标已存在");
      const item = {
        id,
        name: this.targetDraft.name.trim(),
        purpose: this.targetDraft.purpose.trim(),
        source: this.targetDraft.source,
        lastInteractionAt: this.targetDraft.lastInteractionAt,
        checkedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        approved: true,
        result: "",
        testedAt: "",
      };
      list.push(item);
      persist();
      this.targetVisible = false;
      this.$message.success("目标已批准加入名单，尚未发送验证");
      if (test) this.openTest(this.targetKind, item);
    },
    shortId(id) {
      return String(id).length > 18 ? `…${String(id).slice(-10)}` : id;
    },
    targetStatusClass(item) {
      if (!item.testedAt) return "untested";
      const status = item.lastTest?.status || item.result;
      if (status === "failed" || status === "失败") return "failed";
      if (status === "unknown" || status === "未知") return "unknown";
      if (status === "partial" || status === "部分成功") return "partial";
      return "success";
    },
    targetStatusLabel(item) {
      if (!item.testedAt) return "已批准 · 尚未验证";
      const labels = {
        accepted: "已受理",
        成功: "已受理",
        failed: "发送失败",
        失败: "发送失败",
        unknown: "结果未知",
        未知: "结果未知",
        partial: "部分成功",
        部分成功: "部分成功",
      };
      return `上次测试${labels[item.lastTest?.status || item.result] || "结果待确认"} · ${item.testedAt}`;
    },
    openTest(kind, item) {
      if (
        !this.channel.enabled ||
        !this.channel.connected ||
        !this.channel.proactive ||
        !this.ensureTargets(kind).some(
          (target) => target.id === item.id && target.approved !== false,
        )
      )
        return this.$message.warning("请先连接渠道并开启主动沟通");
      this.testKind = kind;
      this.testTargetItem = item;
      this.testType = "none";
      this.testText = "";
      this.testFileId = "";
      this.testResult = null;
      this.testVisible = true;
    },
    selectTestType(type) {
      this.testType = type;
      this.testResult = null;
      this.testFileId = "";
    },
    sendDemoTest() {
      // 原型交互只更新本地状态；这里不调用任何消息平台接口。
      if (
        !this.testTargetItem ||
        !this.channel.enabled ||
        !this.channel.connected ||
        !this.channel.proactive ||
        !this.ensureTargets(this.testKind).some(
          (item) =>
            item.id === this.testTargetItem.id && item.approved !== false,
        )
      )
        return this.$message.warning("请先连接渠道并开启主动沟通");
      if (!this.testText.trim() && this.testType === "none")
        return this.$message.warning("请输入测试文字或选择一个工作空间附件");
      if (this.testType !== "none" && !this.channel.files)
        return this.$message.warning("请先开启允许收发图片与文件");
      if (
        this.testType !== "none" &&
        !this.selectableWorkspaceFiles.some(
          (file) => file.id === this.testFileId,
        )
      )
        return this.$message.warning("请选择当前专家工作空间中的文件");

      const id = this.testTargetItem.id;
      const selectedFile = this.selectableWorkspaceFiles.find(
        (file) => file.id === this.testFileId,
      );
      const unavailableWecom =
        this.channel.id === "wecom" &&
        ![
          "wc-owner",
          "wc-recent-1",
          "wc-timeout-1",
          "wc-group-1",
          "wc-shift-lead",
          "wc-maintenance",
          "wc-inspector",
          "wc-group-partial",
        ].includes(id);
      const status =
        selectedFile &&
        this.testText.trim() &&
        /partial|upload-fail/i.test(`${id} ${selectedFile.name}`)
          ? "partial"
          : /timeout/i.test(id)
            ? "unknown"
            : unavailableWecom || /expired|denied|no-bot|no-dm/i.test(id)
              ? "failed"
              : "accepted";
      const detail =
        status === "accepted"
          ? "平台已受理发送请求；不代表对方已读。"
          : status === "partial"
            ? "文字已受理，但附件上传失败；请分别查看发送结果。"
            : status === "unknown"
              ? "请求超时，结果未知；请核对发送记录，勿直接重试。"
              : this.channel.id === "wecom"
                ? "目标会话已失效，当前无法发送。"
                : this.testKind === "group"
                  ? "机器人未加入目标群，发送失败。"
                  : "机器人没有向该用户发送消息的权限。";
      const result = {
        status,
        at: new Date().toISOString(),
        detail,
        deliveryId: `dly-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        code:
          status === "accepted"
            ? "ACCEPTED"
            : status === "partial"
              ? "PARTIAL"
              : status === "unknown"
                ? "RESULT_UNKNOWN"
                : unavailableWecom
                  ? "SESSION_UNAVAILABLE"
                  : "SEND_FORBIDDEN",
      };
      this.testResult = result;
      if (!Array.isArray(this.channel.deliveries))
        Vue.set(this.channel, "deliveries", []);
      this.channel.deliveries.unshift({
        id: result.deliveryId,
        platform: this.channel.id,
        targetName: this.testTargetItem.name,
        targetId: id,
        initiator: "管理员测试",
        summary: `${this.testText.trim() ? `文字：${this.testText.trim().slice(0, 28)}` : ""}${selectedFile ? `${this.testText.trim() ? " + " : ""}${this.testType === "image" ? "图片" : "文件"}：${selectedFile.name}` : ""}`,
        at: result.at,
        status,
        receipt: result.code,
        parts: detail,
      });
      const stored = this.ensureTargets(this.testKind).find(
        (target) => target.id === id,
      );
      if (stored) {
        const label = {
          accepted: "成功",
          failed: "失败",
          unknown: "未知",
          partial: "部分成功",
        }[status];
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
    async removeTarget(kind, item) {
      try {
        await this.$confirm(
          `移除“${item.name}”后，新的主动发送将不再允许使用此目标。`,
          "确认移除目标",
          { type: "warning" },
        );
      } catch {
        return;
      }
      const list = this.ensureTargets(kind);
      const index = list.findIndex((x) => x.id === item.id);
      if (index < 0) return;
      list.splice(index, 1);
      persist();
    },
  },
};
</script>
