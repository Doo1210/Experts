<template>
  <div class="expert-channel-page">
    <div class="section-heading">
      <div>
        <h2>消息渠道</h2>
        <p>
          接入钉钉、企业微信和飞书机器人。回复当前会话无需主动沟通；向其他人或群发送须开启主动沟通并将目标加入名单。
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
        <img
          class="channel-switcher-icon"
          :src="channelIcon(item.id)"
          alt=""
          aria-hidden="true"
        />
        <span>{{ item.name }}</span>
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
          ><label v-if="channel.id !== 'wecom'" class="channel-mention-field"
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
            v-if="channel.id === 'wecom'"
            size="mini"
            @click="qrVisible = true"
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
            >发送条件检查　{{ channelCheckSummary }}</span
          ><el-button type="text" @click="checkConfig">检查配置</el-button
          ><el-switch
            v-model="channel.proactive"
            :disabled="!channel.enabled || !channel.connected"
            @change="resetCheck"
          />
        </div>
        <p
          v-if="channel.proactive && !people.length && !groups.length"
          class="channel-empty-warning"
        >
          主动沟通已开启，暂无已加入名单的可发送目标。
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
                <div class="channel-target-primary">
                  <strong :title="item.name">{{ item.name }}</strong>
                  <span
                    class="channel-target-interaction"
                    :title="`最近主动沟通时间：${formatRecentProactiveTime(item)}`"
                    ><span class="channel-target-interaction-label"
                      >最近主动沟通时间：</span
                    >{{ formatRecentProactiveTime(item) }}</span
                  >
                </div>
                <div class="channel-target-actions">
                  <button
                    type="button"
                    aria-label="查看详情"
                    title="查看详情"
                    @click="openTargetDetail('person', item)"
                  >
                    <i class="el-icon-view" aria-hidden="true" /><span
                      class="channel-action-label"
                      >详情</span
                    >
                  </button>
                  <button
                    type="button"
                    :disabled="
                      !channel.enabled ||
                      !channel.connected ||
                      !channel.proactive
                    "
                    aria-label="测试发送"
                    title="测试发送"
                    @click="openTest('person', item)"
                  >
                    <i class="el-icon-s-promotion" aria-hidden="true" /><span
                      class="channel-action-label"
                      >测试</span
                    >
                  </button>
                  <button
                    type="button"
                    class="remove"
                    aria-label="移除目标"
                    title="移除目标"
                    @click="removeTarget('person', item)"
                  >
                    <i class="el-icon-delete" aria-hidden="true" /><span
                      class="channel-action-label"
                      >移除</span
                    >
                  </button>
                </div>
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
                <div class="channel-target-primary">
                  <strong :title="item.name">{{ item.name }}</strong>
                  <span
                    class="channel-target-interaction"
                    :title="`最近主动沟通时间：${formatRecentProactiveTime(item)}`"
                    ><span class="channel-target-interaction-label"
                      >最近主动沟通时间：</span
                    >{{ formatRecentProactiveTime(item) }}</span
                  >
                </div>
                <div class="channel-target-actions">
                  <button
                    type="button"
                    aria-label="查看详情"
                    title="查看详情"
                    @click="openTargetDetail('group', item)"
                  >
                    <i class="el-icon-view" aria-hidden="true" /><span
                      class="channel-action-label"
                      >详情</span
                    >
                  </button>
                  <button
                    type="button"
                    :disabled="
                      !channel.enabled ||
                      !channel.connected ||
                      !channel.proactive
                    "
                    aria-label="测试发送"
                    title="测试发送"
                    @click="openTest('group', item)"
                  >
                    <i class="el-icon-s-promotion" aria-hidden="true" /><span
                      class="channel-action-label"
                      >测试</span
                    >
                  </button>
                  <button
                    type="button"
                    class="remove"
                    aria-label="移除目标"
                    title="移除目标"
                    @click="removeTarget('group', item)"
                  >
                    <i class="el-icon-delete" aria-hidden="true" /><span
                      class="channel-action-label"
                      >移除</span
                    >
                  </button>
                </div>
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
          }}关闭主动沟通后不能发送；文件还受文件开关控制。
        </p>
        <p class="channel-proactive-note">
          例如：“把工作空间里的质检报告发到产线协作群”。专家会先确认文件，再查名单目标；跨平台同名群会询问平台。回复当前消息会话无需主动沟通。
        </p>
      </section>
      <section class="channel-file-card">
        <div>
          <strong>允许收发文件</strong>
          <p>开启后，专家可处理收到的文件，并发送专家工作空间中的文件</p>
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
      :visible.sync="qrVisible"
      title="扫码配置企业微信 AI Bot"
      width="720px"
      custom-class="manage-dialog channel-qr-dialog"
      :close-on-click-modal="false"
    >
      <div class="channel-qr-body">
        <div class="channel-qr-image">
          <img :src="wecomConfigQr" alt="企业微信扫码配置二维码" />
        </div>
        <div class="channel-qr-guide">
          <h3>使用企业微信扫一扫</h3>
          <p>扫描二维码后，按手机端提示完成授权。</p>
          <a :href="wecomConfigQr" target="_blank" rel="noopener noreferrer"
            >在新窗口打开二维码 <i class="el-icon-top-right" aria-hidden="true"
          /></a>
        </div>
      </div>
    </el-dialog>
    <el-dialog
      :visible.sync="targetVisible"
      width="620px"
      custom-class="manage-dialog channel-target-dialog"
      :close-on-click-modal="false"
    >
      <div slot="title" class="channel-dialog-title">
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
          ><small>{{ channel.name }} · 当前{{ channelDescription }}</small>
        </div>
      </div>
      <div class="channel-target-body">
        <div class="channel-target-modes" role="group" aria-label="添加方式">
          <button
            v-if="channel.id !== 'wecom'"
            type="button"
            :aria-pressed="targetMode === 'manual'"
            :class="{ active: targetMode === 'manual' }"
            @click="setManualTarget"
          >
            {{ manualModeLabel }}
          </button>
          <button
            type="button"
            :aria-pressed="targetMode === 'candidate'"
            :class="{ active: targetMode === 'candidate' }"
            @click="setCandidateMode"
          >
            {{ candidateModeLabel }}
          </button>
        </div>

        <el-form
          v-if="targetMode === 'manual'"
          class="channel-target-form"
          label-position="top"
          @submit.native.prevent="saveTarget"
        >
          <el-form-item :label="targetIdLabel" required>
            <el-input
              v-model.trim="targetDraft.id"
              :placeholder="`请输入${targetIdLabel}`"
            />
          </el-form-item>
          <el-form-item
            :label="targetKind === 'person' ? '平台显示名称' : '群名称'"
            required
          >
            <el-input
              v-model.trim="targetDraft.name"
              :placeholder="
                targetKind === 'person' ? '例如：设备主管' : '例如：产线协作群'
              "
            />
          </el-form-item>
        </el-form>

        <div v-else class="channel-candidate-section">
          <div class="channel-candidate-search">
            <el-input
              v-model.trim="targetSearch"
              prefix-icon="el-icon-search"
              :placeholder="candidateSearchPlaceholder"
            />
            <el-button
              v-if="channel.id === 'feishu' && targetKind === 'group'"
              size="mini"
              @click="$message.info('群列表已刷新')"
              >刷新</el-button
            >
          </div>
          <div v-if="filteredCandidates.length" class="channel-candidate-list">
            <button
              v-for="item in filteredCandidates"
              :key="item.id"
              type="button"
              :disabled="item.isAdded"
              :aria-pressed="isCandidateSelected(item.id)"
              :class="{ selected: isCandidateSelected(item.id) }"
              @click="selectCandidate(item)"
            >
              <span class="channel-candidate-radio" aria-hidden="true">{{
                isCandidateSelected(item.id) ? "✓" : ""
              }}</span>
              <span class="channel-candidate-copy">
                <span class="channel-candidate-name">
                  <strong>{{ item.name }}</strong>
                  <small v-if="item.isAdded">已加入名单</small>
                </span>
                <span class="channel-candidate-meta">
                  <code :title="item.id">ID {{ item.id }}</code>
                  <small v-if="item.lastInteractionAt"
                    >最近互动 {{ item.lastInteractionAt }}</small
                  >
                </span>
              </span>
            </button>
          </div>
          <div v-else class="channel-candidate-empty">
            <strong>{{
              targetSearch
                ? `未找到匹配的${targetKind === "person" ? "单聊" : "群聊"}`
                : `暂无已有${targetKind === "person" ? "单聊" : "群聊"}`
            }}</strong>
            <p>{{ targetSearch ? "试试其他名称或 ID。" : targetEmptyHint }}</p>
            <button
              v-if="targetSearch"
              type="button"
              @click="targetSearch = ''"
            >
              清空搜索
            </button>
            <button
              v-else-if="channel.id !== 'wecom'"
              type="button"
              @click="setManualTarget"
            >
              输入 ID 并核对
            </button>
          </div>
        </div>

        <div class="channel-target-review">
          <div
            v-if="targetMode === 'candidate'"
            class="channel-selected-targets"
          >
            <div class="channel-selected-head">
              <strong
                >已选 {{ selectedCandidates.length }}
                {{ targetKind === "person" ? "人" : "个群" }}</strong
              >
              <button
                v-if="selectedCandidates.length"
                type="button"
                @click="clearSelectedCandidates"
              >
                清空
              </button>
            </div>
            <p v-if="!selectedCandidates.length" class="channel-selected-empty">
              从上方选择要加入名单的{{
                targetKind === "person" ? "单聊" : "群聊"
              }}。
            </p>
            <div v-else class="channel-selected-list">
              <div
                v-for="item in selectedCandidates"
                :key="item.id"
                class="channel-selected-item"
              >
                <div class="channel-selected-summary">
                  <div>
                    <strong>{{ item.name || item.platformName }}</strong>
                    <small :title="item.id">{{ item.id }}</small>
                  </div>
                  <button
                    type="button"
                    @click="
                      editingCandidateId =
                        editingCandidateId === item.id ? '' : item.id
                    "
                  >
                    {{ editingCandidateId === item.id ? "收起" : "编辑" }}
                  </button>
                  <button
                    type="button"
                    class="remove"
                    :aria-label="`移除${item.platformName}`"
                    @click="removeSelectedCandidate(item.id)"
                  >
                    移除
                  </button>
                </div>
                <div
                  v-if="editingCandidateId === item.id"
                  class="channel-selected-fields"
                >
                  <label
                    ><span>平台显示名称</span>
                    <el-input
                      v-model.trim="item.name"
                      maxlength="80"
                      placeholder="填写平台显示名称"
                  /></label>
                  <label
                    ><span>说明 <small>选填</small></span
                    ><el-input
                      v-model.trim="item.purpose"
                      maxlength="200"
                      placeholder="填写该目标的说明"
                  /></label>
                </div>
              </div>
            </div>
          </div>
          <label v-else class="channel-target-purpose-label">
            <span>说明 <small>选填</small></span>
            <el-input
              v-model.trim="targetDraft.purpose"
              :placeholder="
                targetKind === 'person'
                  ? '例如：负责设备维护与停机协调'
                  : '例如：用于产线异常协同'
              "
            />
          </label>
          <p class="channel-target-caveat">
            请确认目标身份和平台
            ID。加入名单后可作为主动发送目标，实际可达性以测试结果为准。
          </p>
        </div>
      </div>
      <span slot="footer" class="channel-target-footer">
        <el-button @click="targetVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="targetMode === 'candidate' && !selectedCandidates.length"
          @click="saveTarget"
          >{{
            targetMode === "candidate"
              ? `添加 ${selectedCandidates.length} ${targetKind === "person" ? "人" : "个群"}到名单`
              : "添加到名单"
          }}</el-button
        >
      </span>
    </el-dialog>
    <el-dialog
      :visible.sync="detailVisible"
      title="目标详情"
      width="500px"
      custom-class="manage-dialog channel-detail-dialog"
    >
      <div v-if="detailItem" class="channel-detail-body">
        <div class="channel-detail-row">
          <strong>平台显示名称</strong>
          <div class="channel-detail-cell">
            <el-input
              v-if="detailNameEditing"
              v-model.trim="detailName"
              maxlength="80"
              placeholder="填写平台显示名称"
            />
            <template v-else>
              <span class="channel-detail-value">{{ detailItem.name }}</span>
              <button
                type="button"
                class="channel-detail-icon-button"
                aria-label="编辑平台显示名称"
                title="编辑平台显示名称"
                @click="detailNameEditing = true"
              >
                <i class="el-icon-edit" aria-hidden="true" />
              </button>
            </template>
          </div>
        </div>
        <div class="channel-detail-row">
          <strong>{{ detailIdLabel }}</strong>
          <div class="channel-detail-cell">
            <code>{{ detailItem.id }}</code>
            <button
              type="button"
              class="channel-detail-icon-button"
              aria-label="复制目标 ID"
              title="复制目标 ID"
              @click="copyTargetId"
            >
              <i class="el-icon-document-copy" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="channel-detail-row">
          <strong>说明</strong>
          <div class="channel-detail-cell">
            <el-input
              v-if="detailPurposeEditing"
              v-model.trim="detailPurpose"
              maxlength="200"
              :placeholder="
                detailKind === 'person'
                  ? '负责设备维护与停机协调'
                  : '用于产线异常协同'
              "
            />
            <template v-else>
              <span
                class="channel-detail-value"
                :class="{ empty: !detailItem.purpose }"
                >{{ detailItem.purpose || "未填写" }}</span
              >
              <button
                type="button"
                class="channel-detail-icon-button"
                aria-label="编辑说明"
                title="编辑说明"
                @click="detailPurposeEditing = true"
              >
                <i class="el-icon-edit" aria-hidden="true" />
              </button>
            </template>
          </div>
        </div>
        <div class="channel-detail-row">
          <strong>来源</strong>
          <span class="channel-detail-value">{{ detailSourceLabel }}</span>
        </div>
        <div class="channel-detail-row">
          <strong>最近主动沟通时间</strong>
          <span class="channel-detail-value">{{
            formatRecentProactiveTime(detailItem)
          }}</span>
        </div>
      </div>
      <span slot="footer"
        ><el-button @click="detailVisible = false">取消</el-button
        ><el-button type="primary" @click="saveTargetDetail"
          >保存修改</el-button
        ></span
      >
    </el-dialog>
    <el-dialog
      :visible.sync="checkVisible"
      width="560px"
      custom-class="manage-dialog channel-check-dialog"
      :close-on-click-modal="false"
    >
      <div slot="title" class="channel-check-dialog-title">
        <strong>发送条件检查</strong>
        <small>{{ channel.name }} · 当前机器人</small>
      </div>
      <div
        class="channel-check-overview"
        :class="{
          'has-blocker': checkHasBlocker,
          'has-pending': !checkHasBlocker && checkHasPending,
        }"
      >
        <strong>{{
          checkHasBlocker
            ? "有条件待补齐"
            : checkHasPending
              ? "机器人发送链路尚未验证"
              : "发送前提已满足"
        }}</strong>
        <span>{{
          checkHasBlocker
            ? "请处理下方未满足的条件。"
            : checkHasPending
              ? "机器人发送链路仍需通过平台核验。"
              : "可以对名单目标进行测试发送。"
        }}</span>
      </div>
      <ul class="channel-check-list">
        <li v-for="item in channel.checkReport || []" :key="item.label">
          <span
            class="channel-check-marker"
            :class="`is-${item.status}`"
            aria-hidden="true"
            >{{
              item.status === "ok" ? "✓" : item.status === "blocked" ? "!" : "·"
            }}</span
          >
          <div>
            <strong>{{ item.label }}</strong>
            <p>{{ productCopy(item.detail) }}</p>
          </div>
          <small>{{
            item.status === "ok"
              ? "已满足"
              : item.status === "blocked"
                ? "待处理"
                : "待验证"
          }}</small>
        </li>
      </ul>
      <p class="channel-check-caveat">
        检查不会发送消息；平台是否允许发给某个目标、目标是否可达，请以该目标的测试发送结果为准。
      </p>
      <span slot="footer" class="channel-check-footer">
        <el-button @click="checkConfig">重新检查</el-button>
        <el-button type="primary" @click="checkVisible = false">完成</el-button>
      </span>
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
            {{ channel?.name }}机器人（{{ channel?.botId || "当前机器人" }}）
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
        <div class="im-1023-test-summary">
          <div class="im-1023-test-context">
            <span class="im-1023-test-target-icon" aria-hidden="true">
              <i
                :class="
                  testKind === 'person'
                    ? 'el-icon-user'
                    : 'el-icon-chat-line-round'
                "
              />
            </span>
            <div class="im-1023-test-target-main">
              <small>发送目标</small>
              <div>
                <strong>{{ testTargetItem.name }}</strong>
                <span>{{ testKind === "person" ? "单聊" : "群聊" }}</span>
              </div>
            </div>
            <div class="im-1023-test-target-id">
              <small>目标 ID</small>
              <code :title="testTargetItem.id">{{ testTargetItem.id }}</code>
            </div>
          </div>
          <div class="im-1023-last-test">
            <small>上次测试发送：</small>
            <strong>{{ lastTestSendValue(testTargetItem) }}</strong>
          </div>
        </div>
        <div class="im-1023-test-input-head">
          <span>文字</span>
        </div>
        <el-input
          v-model="testText"
          type="textarea"
          :rows="3"
          maxlength="1000"
          show-word-limit
          placeholder="输入将发送的文字"
          @input="testResult = null"
        />
        <div class="im-1023-upload-field">
          <div class="im-1023-test-input-head">
            <span :class="{ 'is-disabled': !channel.files }">文件</span>
          </div>
          <el-tooltip
            :disabled="channel.files"
            content="请先开启“允许收发文件”"
            placement="top"
          >
            <div
              ref="testFileControl"
              class="im-1023-file-control"
              :class="{
                'is-disabled': !channel.files,
                'has-file': !!selectedTestFile,
              }"
              @click.capture="syncTestFilePopoverWidth"
            >
              <el-popover
                ref="testFilePopover"
                v-model="testFilePickerVisible"
                :disabled="!channel.files"
                placement="top-start"
                trigger="click"
                :width="testFilePopoverWidth"
                popper-class="pc-reference-popper im-test-file-popper"
                @show="syncTestFilePopoverWidth"
              >
                <div class="pc-reference-picker im-test-file-picker">
                  <div class="pc-reference-search">
                    <i class="el-icon-search" />
                    <input
                      v-model="testFileSearch"
                      type="search"
                      placeholder="搜索工作空间文件"
                      @input="repositionTestFilePopover"
                    />
                  </div>
                  <div class="pc-reference-list">
                    <div
                      v-for="node in testWorkspaceRows"
                      :key="node.item.id"
                      class="pc-reference-tree-row"
                      :style="{ paddingLeft: `${8 + node.depth * 16}px` }"
                    >
                      <button
                        v-if="node.item.kind === 'folder'"
                        type="button"
                        class="pc-reference-tree-entry"
                        @click="toggleTestFolder(node.item.id)"
                      >
                        <i
                          :class="
                            testExpandedFolderIds.includes(node.item.id)
                              ? 'el-icon-arrow-down'
                              : 'el-icon-arrow-right'
                          "
                        />
                        <i class="el-icon-folder" />
                        <span>{{ node.item.name }}</span>
                      </button>
                      <button
                        v-else
                        type="button"
                        class="pc-reference-tree-entry"
                        :class="{ selected: testFileId === node.item.id }"
                        :title="testFilePath(node.item)"
                        @click="selectTestFile(node.item)"
                      >
                        <span class="pc-reference-tree-spacer" />
                        <i class="el-icon-document" />
                        <span>{{ node.item.name }}</span>
                        <i
                          v-if="testFileId === node.item.id"
                          class="el-icon-check"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    <p
                      v-if="!testWorkspaceRows.length"
                      class="pc-reference-empty"
                    >
                      没有匹配的文件
                    </p>
                  </div>
                </div>
                <button
                  slot="reference"
                  type="button"
                  class="im-1023-file-trigger"
                  :disabled="!channel.files"
                  :aria-label="
                    selectedTestFile
                      ? `更换文件：${selectedTestFile.name}`
                      : '选择文件'
                  "
                  :title="
                    selectedTestFile ? testFilePath(selectedTestFile) : ''
                  "
                >
                  <span v-if="selectedTestFile" class="im-1023-file-chip">
                    <i class="el-icon-document" aria-hidden="true" />
                    {{ selectedTestFile.name }}
                  </span>
                  <span v-else>从当前专家工作空间选择文件</span>
                  <i class="el-icon-arrow-down" aria-hidden="true" />
                </button>
              </el-popover>
              <button
                v-if="selectedTestFile && channel.files"
                type="button"
                class="im-1023-file-clear"
                aria-label="移除已选文件"
                title="移除已选文件"
                @click="clearTestFile"
              >
                <i class="el-icon-close" aria-hidden="true" />
              </button>
            </div>
          </el-tooltip>
          <p
            v-if="channel.files && !selectableWorkspaceFiles.length"
            class="im-1023-upload-help"
          >
            当前专家工作空间暂无文件，请先上传后再选择。
          </p>
        </div>
        <div
          v-if="testResult"
          class="im-1023-test-result"
          :class="
            testResult.status === 'accepted' ? 'is-accepted' : 'is-failed'
          "
          role="status"
        >
          <div class="im-1023-result-head">
            <span aria-hidden="true">{{
              testResult.status === "accepted" ? "✓" : "!"
            }}</span>
            <strong>{{
              testResult.status === "accepted" ? "发送成功" : "发送失败"
            }}</strong>
          </div>
          <p class="im-1023-result-time">
            发送时间：{{ formatDeliveryTime(testResult.at) }}
          </p>
          <details>
            <summary>查看返回信息</summary>
            <pre>{{ formatReturnInfo(testResult.returnInfo) }}</pre>
          </details>
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
import { publicAsset } from "../public-asset";
import wecomConfigQr from "../assets/wecom-config-qr.svg";

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
      qrVisible: false,
      wecomConfigQr,
      targetVisible: false,
      targetKind: "person",
      targetMode: "candidate",
      targetSearch: "",
      selectedCandidates: [],
      editingCandidateId: "",
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
      detailName: "",
      detailNameEditing: false,
      detailPurpose: "",
      detailPurposeEditing: false,
      checkVisible: false,
      testVisible: false,
      testKind: "person",
      testTargetItem: null,
      testText: "",
      testFileId: "",
      testFilePickerVisible: false,
      testFilePopoverWidth: 440,
      testFileSearch: "",
      testExpandedFolderIds: [],
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
    channelCheckSummary() {
      const status = this.channel?.checkStatus || "待检查";
      if (
        status === "发送前提已满足" &&
        this.channel?.sendLinkStatus !== "verified"
      )
        return "发送链路待验证";
      return this.productCopy(status);
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
    detailIdLabel() {
      const labels = {
        dingtalk: { person: "userId", group: "openConversationId" },
        feishu: { person: "open_id", group: "chat_id" },
        wecom: { person: "userid", group: "chatid" },
      };
      return labels[this.channel?.id]?.[this.detailKind] || "目标 ID";
    },
    detailSourceLabel() {
      return /手动|管理员|旧版/.test(this.detailItem?.source || "") ||
        !this.detailItem?.source
        ? "手动添加"
        : "从消息渠道已有对话选择";
    },
    candidateModeLabel() {
      return this.targetKind === "person" ? "从已有单聊选择" : "从已有群聊选择";
    },
    manualModeLabel() {
      if (this.targetKind === "group") return "输入群 ID 并核对";
      return `输入 ${this.channel?.id === "feishu" ? "open_id" : "userId"} 并核对`;
    },
    candidateSearchPlaceholder() {
      const id =
        this.channel?.id === "dingtalk"
          ? this.targetKind === "person"
            ? "userId"
            : "openConversationId"
          : this.channel?.id === "feishu"
            ? this.targetKind === "person"
              ? "open_id"
              : "chat_id"
            : "目标 ID";
      return this.targetKind === "person"
        ? `搜索姓名或 ${id}`
        : `搜索群名称或 ${id}`;
    },
    targetEmptyHint() {
      if (this.channel?.id === "feishu" && this.targetKind === "group")
        return "刷新机器人可见群列表，或输入 chat_id 并核对。";
      if (this.channel?.id === "feishu")
        return "让目标先发来消息，或在有权限时从通讯录核对 open_id。";
      if (this.channel?.id === "dingtalk" && this.targetKind === "group")
        return "让机器人在目标群收到一次消息，或输入 openConversationId 并核对。";
      if (this.channel?.id === "dingtalk")
        return "让目标先与当前机器人互动，或输入 userId 并核对。";
      return "请先让目标与当前机器人发生一次消息交互。";
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
      )
        .map((item) => ({ ...item, isAdded: known.has(item.id) }))
        .sort((a, b) => Number(a.isAdded) - Number(b.isAdded));
    },
    filteredCandidates() {
      const query = this.targetSearch.trim().toLowerCase();
      return query
        ? this.availableCandidates.filter((item) =>
            `${item.name} ${item.id}`.toLowerCase().includes(query),
          )
        : this.availableCandidates;
    },
    people() {
      return this.channel?.people || [];
    },
    groups() {
      return this.channel?.groups || [];
    },
    selectableWorkspaceFiles() {
      return (this.expert.files || []).filter((file) => file.kind === "file");
    },
    selectedTestFile() {
      return this.selectableWorkspaceFiles.find(
        (file) => file.id === this.testFileId,
      );
    },
    testWorkspaceRows() {
      const files = this.expert.files || [];
      const allowed = new Set(
        this.selectableWorkspaceFiles.map((file) => file.id),
      );
      const visibleFolders = new Set();
      for (const file of this.selectableWorkspaceFiles) {
        let parentId = file.parentId;
        while (parentId && !visibleFolders.has(parentId)) {
          visibleFolders.add(parentId);
          parentId = files.find((item) => item.id === parentId)?.parentId;
        }
      }
      const search = this.testFileSearch.trim().toLowerCase();
      if (search)
        return files
          .filter(
            (item) =>
              allowed.has(item.id) &&
              this.testFilePath(item).toLowerCase().includes(search),
          )
          .map((item) => ({ item, depth: 0 }));
      const rows = [];
      const visit = (parentId, depth) => {
        const children = files
          .filter((item) => item.parentId === parentId)
          .sort((a, b) =>
            a.kind === b.kind
              ? a.name.localeCompare(b.name)
              : a.kind === "folder"
                ? -1
                : 1,
          );
        for (const item of children) {
          if (item.kind === "file" && !allowed.has(item.id)) continue;
          if (item.kind === "folder" && !visibleFolders.has(item.id)) continue;
          rows.push({ item, depth });
          if (
            item.kind === "folder" &&
            this.testExpandedFolderIds.includes(item.id)
          )
            visit(item.id, depth + 1);
        }
      };
      visit(null, 0);
      return rows;
    },
    checkHasBlocker() {
      return (this.channel?.checkReport || []).some(
        (item) => item.status === "blocked",
      );
    },
    checkHasPending() {
      return (this.channel?.checkReport || []).some(
        (item) => item.status === "pending",
      );
    },
  },
  watch: {
    testVisible(visible) {
      if (!visible) this.testFilePickerVisible = false;
    },
    activeId() {
      this.qrVisible = false;
      this.targetVisible = false;
      this.detailVisible = false;
      this.testVisible = false;
      this.checkVisible = false;
      this.loadDraft();
    },
    "expert.id"() {
      this.qrVisible = false;
      this.targetVisible = false;
      this.detailVisible = false;
      this.testVisible = false;
      this.checkVisible = false;
      this.activeId = this.orderedChannels[0]?.id || "";
      this.loadDraft();
    },
  },
  created() {
    this.loadDraft();
  },
  methods: {
    persist,
    channelIcon(id) {
      return publicAsset(`/experts/channel-icons/${id}.svg`);
    },
    setRequireMention(enabled) {
      Vue.set(this.channel, "requireMention", Boolean(enabled));
      persist();
    },
    resetCheck() {
      Vue.set(this.channel, "checkStatus", "待检查");
      Vue.set(this.channel, "checkReport", []);
      persist();
    },
    onEnabledChange(enabled) {
      if (!enabled) {
        Vue.set(this.channel, "connected", false);
        Vue.set(this.channel, "proactive", false);
        Vue.set(this.channel, "sendLinkStatus", null);
        this.testVisible = false;
      }
      this.resetCheck();
    },
    loadDraft() {
      this.botIdDraft = "";
      this.botSecretDraft = "";
      this.robotCodeDraft = this.channel?.robotCode || "";
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
      Vue.set(this.channel, "connected", Boolean(this.channel.enabled));
      Vue.set(this.channel, "sendLinkStatus", null);
      this.resetCheck();
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
      const isWecom = this.channel.id === "wecom";
      const sendLinkStatus = this.channel.sendLinkStatus;
      const linkDetail =
        sendLinkStatus === "verified"
          ? isWecom
            ? "机器人 WebSocket 已认证"
            : "应用身份凭证已取得"
          : sendLinkStatus === "failed"
            ? isWecom
              ? "机器人 WebSocket 认证失败"
              : "应用身份凭证获取失败"
            : hasCredentials
              ? "已填写，尚未验证"
              : isWecom && this.channel.connected
                ? "已连接，WebSocket 认证尚未验证"
                : isWecom
                  ? "机器人 WebSocket 未认证"
                  : "应用凭据未填写完整";
      const linkStatus =
        sendLinkStatus === "verified"
          ? "ok"
          : sendLinkStatus === "failed" ||
              (!hasCredentials && !(isWecom && this.channel.connected))
            ? "blocked"
            : "pending";
      const report = [
        {
          label: "渠道已启用",
          detail: this.channel.enabled
            ? "可接收并回复此渠道消息"
            : "请先启用渠道",
          status: this.channel.enabled ? "ok" : "blocked",
        },
        {
          label: "机器人发送链路",
          detail: linkDetail,
          status: linkStatus,
        },
        {
          label: "主动沟通已开启",
          detail: this.channel.proactive
            ? "可向名单目标发起发送"
            : "请先开启主动沟通",
          status: this.channel.proactive ? "ok" : "blocked",
        },
      ];
      Vue.set(this.channel, "checkReport", report);
      Vue.set(
        this.channel,
        "checkStatus",
        report.some((item) => item.status === "blocked")
          ? "部分条件待补"
          : report.some((item) => item.status === "pending")
            ? "发送链路待验证"
            : "发送前提已满足",
      );
      persist();
      this.checkVisible = true;
    },
    targetEmptyFor(kind) {
      if (this.channel.id === "feishu" && kind === "group")
        return "可刷新机器人可见群，或让机器人先在群内互动。";
      if (this.channel.id === "feishu")
        return "可从入站 open_id 或有权限的通讯录查询中核对目标。";
      if (this.channel.id === "dingtalk" && kind === "group")
        return "让机器人先加入群并互动，或输入并核对 openConversationId。";
      return "让目标先与当前专家机器人互动，再从线索中核对并加入名单。";
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
          "请求超时，结果未知；请人工核实后再决定是否重试。",
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
    formatReturnInfo(info) {
      return JSON.stringify(info, null, 2);
    },
    demoReturnInfo(status, deliveryId) {
      const success = status === "accepted";
      const messageId = success ? `msg_${deliveryId.slice(4)}` : null;
      const platform = this.channel.id;
      const result = { success, message_id: messageId };
      if (!success) {
        result.error =
          status === "unknown"
            ? `Timeout sending message to ${platform === "dingtalk" ? "DingTalk" : platform === "wecom" ? "WeCom" : "Feishu"}`
            : status === "partial"
              ? "File upload failed after text send"
              : platform === "wecom"
                ? this.testKind === "group"
                  ? "No req_id available for group chat (passive reply required)"
                  : "WeCom errcode 846609: subscription lost"
                : platform === "dingtalk"
                  ? "HTTP 403: send failed"
                  : "[1] send failed";
      }
      if (status === "partial")
        result.parts = {
          text: { success: true },
          attachment: { success: false, error: "File upload failed" },
        };
      if (platform === "wecom" && success)
        result.raw_response = {
          errcode: 0,
          errmsg: "ok",
          headers: { req_id: messageId },
        };
      if (platform === "feishu" && status !== "unknown")
        result.raw_response = success
          ? { code: 0, msg: "success", data: { message_id: messageId } }
          : { code: 1, msg: "send failed" };
      return result;
    },
    formatDeliveryTime(at) {
      return new Date(at).toLocaleString("zh-CN", { hour12: false });
    },
    openTargetDetail(kind, item) {
      this.detailKind = kind;
      this.detailItem = item;
      this.detailName = item.name || "";
      this.detailNameEditing = false;
      this.detailPurpose = item.purpose || "";
      this.detailPurposeEditing = false;
      this.detailVisible = true;
    },
    saveTargetDetail() {
      if (!this.detailItem) return;
      if (this.detailNameEditing && !this.detailName.trim())
        return this.$message.warning("平台显示名称不能为空");
      if (this.detailNameEditing)
        Vue.set(this.detailItem, "name", this.detailName.trim());
      if (this.detailPurposeEditing)
        Vue.set(this.detailItem, "purpose", this.detailPurpose.trim());
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
      this.targetMode =
        this.channel.id === "wecom" ||
        demoChannelCandidates(this.expert.id, this.channel.id, kind).length
          ? "candidate"
          : "manual";
      this.targetSearch = "";
      this.selectedCandidates = [];
      this.editingCandidateId = "";
      this.targetDraft = {
        id: "",
        name: "",
        purpose: "",
        source: this.targetMode === "manual" ? "手动添加" : "",
        lastInteractionAt: "",
      };
      this.targetVisible = true;
    },
    setManualTarget() {
      if (this.targetMode === "manual") return;
      this.targetMode = "manual";
      this.targetSearch = "";
      this.selectedCandidates = [];
      this.editingCandidateId = "";
      this.targetDraft = {
        id: "",
        name: "",
        purpose: "",
        source: "手动添加",
        lastInteractionAt: "",
      };
    },
    setCandidateMode() {
      if (this.targetMode === "candidate") return;
      this.targetMode = "candidate";
      this.targetSearch = "";
      this.selectedCandidates = [];
      this.editingCandidateId = "";
      this.targetDraft = {
        id: "",
        name: "",
        purpose: "",
        source: "",
        lastInteractionAt: "",
      };
    },
    selectCandidate(item) {
      if (item.isAdded) return;
      if (this.isCandidateSelected(item.id)) {
        this.removeSelectedCandidate(item.id);
        return;
      }
      this.selectedCandidates.push({
        id: item.id,
        name: item.name,
        platformName: item.name,
        purpose: "",
        lastInteractionAt: item.lastInteractionAt || "",
      });
    },
    isCandidateSelected(id) {
      return this.selectedCandidates.some((item) => item.id === id);
    },
    removeSelectedCandidate(id) {
      this.selectedCandidates = this.selectedCandidates.filter(
        (item) => item.id !== id,
      );
      if (this.editingCandidateId === id) this.editingCandidateId = "";
    },
    clearSelectedCandidates() {
      this.selectedCandidates = [];
      this.editingCandidateId = "";
    },
    ensureTargets(kind) {
      const key = kind === "person" ? "people" : "groups";
      if (!Array.isArray(this.channel[key])) Vue.set(this.channel, key, []);
      return this.channel[key];
    },
    saveTarget() {
      const drafts =
        this.targetMode === "candidate"
          ? this.selectedCandidates
          : [this.targetDraft];
      if (!drafts.length || drafts.some((item) => !item.id.trim()))
        return this.$message.warning("请先选择或输入目标");
      if (drafts.some((item) => !item.name.trim()))
        return this.$message.warning("请填写每个目标的平台显示名称");
      const list = this.ensureTargets(this.targetKind);
      if (drafts.some((item) => list.some((target) => target.id === item.id)))
        return this.$message.warning(
          "所选目标中已有加入名单的目标，请重新选择",
        );
      const addedAt = new Date().toLocaleString("zh-CN", { hour12: false });
      list.push(
        ...drafts.map((item) => ({
          id: item.id.trim(),
          name: item.name.trim(),
          platformName: item.platformName || item.name.trim(),
          purpose: item.purpose.trim(),
          source:
            this.targetMode === "manual"
              ? "手动添加"
              : "从消息渠道已有对话选择",
          lastInteractionAt: item.lastInteractionAt,
          lastProactiveAt: "",
          checkedAt: addedAt,
          result: "",
          testedAt: "",
        })),
      );
      persist();
      this.targetVisible = false;
      this.$message.success(`${drafts.length} 个目标已加入名单，尚未发送测试`);
    },
    shortId(id) {
      return String(id).length > 18 ? `…${String(id).slice(-10)}` : id;
    },
    lastTestSendValue(item) {
      if (!item.testedAt) return "未测试";
      const status = item.lastTest?.status || item.result;
      const success = [
        "accepted",
        "sent",
        "success",
        "成功",
        "已受理",
      ].includes(status);
      const time = this.formatRecentProactiveTime({
        lastProactiveAt: item.lastTest?.at || item.testedAt,
      });
      return `${time} ${success ? "成功" : "失败"}`;
    },
    formatRecentProactiveTime(item) {
      const raw = String(
        item?.lastProactiveAt || item?.lastTest?.at || item?.testedAt || "",
      );
      if (!raw) return "无记录";
      const isoDate = /^\d{4}-\d{2}-\d{2}T/.test(raw) ? new Date(raw) : null;
      if (isoDate && !Number.isNaN(isoDate.getTime()))
        return `${isoDate.getFullYear()}年${isoDate.getMonth() + 1}月${isoDate.getDate()}日 ${String(isoDate.getHours()).padStart(2, "0")}:${String(isoDate.getMinutes()).padStart(2, "0")}`;
      const match = raw.match(
        /^(?:(\d{4})[-/])?(\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})/,
      );
      return match
        ? `${match[1] || new Date().getFullYear()}年${Number(match[2])}月${Number(match[3])}日 ${match[4].padStart(2, "0")}:${match[5]}`
        : raw;
    },
    openTest(kind, item) {
      if (
        !this.channel.enabled ||
        !this.channel.connected ||
        !this.channel.proactive ||
        !this.ensureTargets(kind).some((target) => target.id === item.id)
      )
        return this.$message.warning("请先连接渠道并开启主动沟通");
      this.testKind = kind;
      this.testTargetItem = item;
      this.testText = "";
      this.testFileId = "";
      this.testFilePickerVisible = false;
      this.testFileSearch = "";
      this.testExpandedFolderIds = [];
      this.testResult = null;
      this.testVisible = true;
    },
    toggleTestFolder(id) {
      this.testExpandedFolderIds = this.testExpandedFolderIds.includes(id)
        ? this.testExpandedFolderIds.filter((item) => item !== id)
        : [...this.testExpandedFolderIds, id];
      this.repositionTestFilePopover();
    },
    repositionTestFilePopover() {
      this.$nextTick(() => this.$refs.testFilePopover?.updatePopper?.());
    },
    selectTestFile(file) {
      this.testFileId = file.id;
      this.testResult = null;
      this.testFilePickerVisible = false;
    },
    syncTestFilePopoverWidth() {
      const width = this.$refs.testFileControl?.getBoundingClientRect().width;
      if (!width) return;
      this.testFilePopoverWidth = width;
      this.$nextTick(() => {
        const popover = this.$refs.testFilePopover;
        if (!popover?.popperElm) return;
        popover.popperElm.style.width = `${width}px`;
        popover.updatePopper?.();
      });
    },
    clearTestFile() {
      this.testFileId = "";
      this.testResult = null;
      this.testFilePickerVisible = false;
    },
    testFilePath(file) {
      const parts = [file.name];
      const seen = new Set([file.id]);
      let parentId = file.parentId;
      while (parentId && !seen.has(parentId)) {
        const folder = (this.expert.files || []).find(
          (item) => item.id === parentId,
        );
        if (!folder) break;
        parts.unshift(folder.name);
        seen.add(parentId);
        parentId = folder.parentId;
      }
      return `/${parts.join("/")}`;
    },
    sendDemoTest() {
      // 原型交互只更新本地状态；这里不调用任何消息平台接口。
      if (
        !this.testTargetItem ||
        !this.channel.enabled ||
        !this.channel.connected ||
        !this.channel.proactive ||
        !this.ensureTargets(this.testKind).some(
          (item) => item.id === this.testTargetItem.id,
        )
      )
        return this.$message.warning("请先连接渠道并开启主动沟通");
      if (!this.testText.trim() && !this.testFileId)
        return this.$message.warning("请输入文字或选择文件");
      if (this.testText.length > 1000)
        return this.$message.warning("测试文字最多 1000 字");
      if (this.testFileId && !this.channel.files)
        return this.$message.warning("请先开启允许收发文件");
      if (
        this.testFileId &&
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
      const previousResult = this.testTargetItem.result;
      const status =
        selectedFile &&
        this.testText.trim() &&
        /partial|upload-fail/i.test(`${id} ${selectedFile.name}`)
          ? "partial"
          : /timeout/i.test(id) || previousResult === "未知"
            ? "unknown"
            : unavailableWecom ||
                /expired|denied|no-bot|no-dm/i.test(id) ||
                ["失败", "部分成功"].includes(previousResult)
              ? "failed"
              : "accepted";
      const detail =
        status === "accepted"
          ? "平台已受理发送请求；不代表对方已读。"
          : status === "partial"
            ? "文字已受理，但附件上传失败；请分别查看发送结果。"
            : status === "unknown"
              ? "请求超时，结果未知；请人工核实后再决定是否重试。"
              : this.channel.id === "wecom"
                ? this.testKind === "group"
                  ? "群聊缺少可用的发送上下文，当前无法发送。"
                  : "目标会话已失效，当前无法发送。"
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
      result.returnInfo = this.demoReturnInfo(status, result.deliveryId);
      this.testResult = result;
      if (!Array.isArray(this.channel.deliveries))
        Vue.set(this.channel, "deliveries", []);
      this.channel.deliveries.unshift({
        id: result.deliveryId,
        platform: this.channel.id,
        targetName: this.testTargetItem.name,
        targetId: id,
        initiator: "管理员测试",
        summary: `${this.testText.trim() ? `文字：${this.testText.trim().slice(0, 28)}` : ""}${selectedFile ? `${this.testText.trim() ? " + " : ""}文件：${selectedFile.name}` : ""}`,
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
        Vue.set(stored, "lastProactiveAt", result.at);
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
