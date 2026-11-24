<template>
  <div class="expert-external-api">
    <header class="section-heading expert-api-heading">
      <div>
        <h2>对外 API</h2>
        <p>第三方系统可使用 API Key 调用当前专家、查询结果并订阅执行过程。</p>
      </div>
      <div class="expert-api-actions">
        <el-button
          type="text"
          size="small"
          icon="el-icon-document"
          @click="guideVisible = true"
        >
          调用指南
        </el-button>
        <el-button
          type="text"
          size="small"
          icon="el-icon-tickets"
          @click="$emit('view-runs')"
        >
          查看调用记录
        </el-button>
      </div>
    </header>

    <section class="expert-api-address" aria-label="接入信息">
      <div class="expert-api-address-expert">
        <span class="expert-api-address-label">当前专家</span>
        <strong :title="expert.name">{{ expert.name }}</strong>
      </div>
      <div class="expert-api-address-endpoint">
        <span class="expert-api-address-label">调用地址</span>
        <div class="expert-api-address-value">
          <span class="expert-api-method">POST</span>
          <code :title="address">{{ address }}</code>
          <el-button
            type="text"
            class="expert-api-icon-copy"
            icon="el-icon-document-copy"
            title="复制地址"
            aria-label="复制地址"
            @click="copyAddress"
          />
        </div>
      </div>
    </section>

    <div class="expert-api-list-head">
      <h3>
        API Key <span v-if="keys.length">共 {{ keys.length }} 把</span>
      </h3>
      <div>
        <el-button
          type="primary"
          size="small"
          icon="el-icon-plus"
          @click="openForm()"
        >
          创建 API Key
        </el-button>
      </div>
    </div>
    <el-table
      :data="keys"
      row-key="id"
      class="expert-api-table expert-api-key-table"
      size="small"
    >
      <el-table-column label="名称 / 描述" min-width="146">
        <template slot-scope="{ row }">
          <strong class="expert-api-ellipsis" :title="row.name">{{
            row.name
          }}</strong>
          <span
            v-if="row.description"
            class="expert-api-secondary expert-api-ellipsis"
            :title="row.description"
          >
            {{ row.description }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="API Key" min-width="162">
        <template slot-scope="{ row }">
          <span class="expert-api-copy-value">
            <code :title="keyPreview(row.id)">{{ keyPreview(row.id) }}</code>
            <el-button
              type="text"
              class="expert-api-icon-copy"
              icon="el-icon-document-copy"
              :aria-label="`复制 API Key ${row.name}`"
              title="复制 API Key"
              @click="copyKey(row)"
            />
          </span>
        </template>
      </el-table-column>
      <el-table-column label="过期时间" min-width="100">
        <template slot-scope="{ row }">{{ row.expiresOn || "永久" }}</template>
      </el-table-column>
      <el-table-column label="状态" min-width="99">
        <template slot-scope="{ row }">
          <span class="expert-api-key-status">
            <el-switch
              :value="row.enabled"
              :aria-label="`${row.name}启用开关`"
              :disabled="pendingKeyId === row.id"
              @change="changeStatus(row, $event)"
            />
            <span
              :class="{ 'expert-api-expired': keyStatus(row) === '已过期' }"
              >{{ keyStatus(row) }}</span
            >
          </span>
        </template>
      </el-table-column>
      <el-table-column label="调用情况" min-width="148">
        <template slot-scope="{ row }">
          <el-button
            v-if="usage[row.id]?.recent"
            type="text"
            class="expert-api-count"
            @click="$emit('view-runs', { keyId: row.id, range: recentRange })"
          >
            近 7 天 {{ usage[row.id].recent }} 次运行
            <i class="el-icon-top-right" />
          </el-button>
          <span v-else>近 7 天 0 次运行</span>
          <span class="expert-api-secondary">{{
            usage[row.id] ? `最近 ${time(usage[row.id].last)}` : "暂无运行"
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="92">
        <template slot-scope="{ row }">
          <el-button type="text" @click="openForm(row)">编辑</el-button>
          <el-button
            type="text"
            class="expert-api-delete"
            @click="removeKey(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
      <template slot="empty"
        ><el-empty description="暂无 API Key，创建后即可配置第三方系统接入"
      /></template>
    </el-table>

    <el-dialog
      :title="editingId ? '编辑 API Key' : '创建 API Key'"
      :visible.sync="formVisible"
      append-to-body
      width="min(580px, calc(100vw - 24px))"
      custom-class="manage-dialog expert-api-form-dialog"
      :close-on-click-modal="false"
    >
      <el-form
        :model="draft"
        :rules="rules"
        ref="form"
        label-position="top"
        @submit.native.prevent="save"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model.trim="draft.name"
            maxlength="20"
            show-word-limit
            placeholder="例如 MES 质检系统"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model.trim="draft.description"
            type="textarea"
            :rows="2"
            maxlength="100"
            show-word-limit
            placeholder="选填，说明凭证的用途"
          />
        </el-form-item>
        <el-form-item label="过期时间" prop="expiresOn">
          <div class="expert-api-expiry">
            <el-radio-group
              v-model="draft.expiryMode"
              @change="$refs.form.clearValidate('expiresOn')"
            >
              <el-radio label="custom">自定义</el-radio>
              <el-radio label="permanent">永久</el-radio>
            </el-radio-group>
            <el-date-picker
              v-if="draft.expiryMode === 'custom'"
              v-model="draft.expiresOn"
              type="date"
              value-format="yyyy-MM-dd"
              placeholder="选择过期日期"
              :picker-options="pickerOptions"
              aria-label="选择过期日期"
            />
          </div>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="formVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="save">{{
          editingId ? "保存" : "创建"
        }}</el-button>
      </span>
    </el-dialog>
    <expert-api-guide :visible.sync="guideVisible" :address="address" />
  </div>
</template>

<script>
import ExpertApiGuide from "./ExpertApiGuide.vue";
import { persist, saveExternalApiKey, state } from "../state";
import {
  apiKeyPreview,
  apiKeyStatus,
  apiRunsUrl,
  apiTime,
  copyApiText,
  dateText,
  demoApiKeyValue,
  filterApiRuns,
  recentApiDateRange,
} from "../external-api";

export default {
  components: { ExpertApiGuide },
  props: { expert: { type: Object, required: true } },
  data() {
    return {
      guideVisible: false,
      formVisible: false,
      editingId: "",
      originalExpiry: "",
      pendingKeyId: "",
      draft: { name: "", description: "", expiryMode: "custom", expiresOn: "" },
    };
  },
  computed: {
    address() {
      return apiRunsUrl(this.expert.id);
    },
    keys() {
      return state.externalApiKeys.filter(
        (key) => key.expertId === this.expert.id && !key.deletedAt,
      );
    },
    recentRange() {
      return recentApiDateRange();
    },
    usage() {
      const runs = filterApiRuns(
        state.externalApiRuns.filter((run) => run.expertId === this.expert.id),
      );
      const result = Object.create(null);
      for (const run of runs) {
        const entry = result[run.keyId] || { last: run.submittedAt, recent: 0 };
        const date = dateText(new Date(run.submittedAt));
        if (date >= this.recentRange[0] && date <= this.recentRange[1])
          entry.recent++;
        result[run.keyId] = entry;
      }
      return result;
    },
    pickerOptions() {
      return {
        disabledDate: (date) => dateText(date) < dateText(new Date()),
        shortcuts: [
          ["一周后", 7],
          ["一个月后", 30],
          ["三个月后", 90],
        ].map(([text, days]) => ({
          text,
          onClick(picker) {
            const date = new Date();
            date.setDate(date.getDate() + days);
            picker.$emit("pick", date);
          },
        })),
      };
    },
    rules() {
      return {
        name: [
          {
            required: true,
            whitespace: true,
            message: "请输入 Key 名称",
            trigger: "blur",
          },
        ],
        expiresOn: [
          {
            required: this.draft.expiryMode === "custom",
            validator: (rule, value, callback) => {
              if (
                this.draft.expiryMode === "permanent" ||
                (value === this.originalExpiry && value)
              ) {
                callback();
              } else if (!value || value < dateText(new Date())) {
                callback(new Error("请选择今天或之后的过期日期"));
              } else callback();
            },
            trigger: "change",
          },
        ],
      };
    },
  },
  methods: {
    keyPreview: apiKeyPreview,
    keyStatus: apiKeyStatus,
    time: apiTime,
    copyAddress() {
      return copyApiText(this, this.address, "已复制调用地址");
    },
    copyKey(key) {
      return copyApiText(this, demoApiKeyValue(key.id), "已复制演示 API Key");
    },
    openForm(key) {
      this.editingId = key?.id || "";
      this.originalExpiry = key?.expiresOn || "";
      this.draft = {
        name: key?.name || "",
        description: key?.description || "",
        expiryMode: key && !key.expiresOn ? "permanent" : "custom",
        expiresOn: this.originalExpiry,
      };
      this.formVisible = true;
      this.$nextTick(() => this.$refs.form?.clearValidate());
    },
    save() {
      this.$refs.form.validate((valid) => {
        if (!valid) return;
        saveExternalApiKey(
          this.expert.id,
          {
            ...this.draft,
            expiresOn:
              this.draft.expiryMode === "custom" ? this.draft.expiresOn : "",
          },
          this.editingId,
        );
        this.formVisible = false;
        this.$message.success(this.editingId ? "已保存" : "已创建 API Key");
      });
    },
    async changeStatus(key, enabled) {
      if (enabled) {
        key.enabled = true;
        persist();
        this.$message.success(
          this.keyStatus(key) === "已过期"
            ? "已开启开关，请延长有效期后再使用"
            : "已启用 API Key",
        );
        return;
      }
      this.pendingKeyId = key.id;
      try {
        await this.$confirm(
          `停用「${key.name}」后，该 Key 将无法提交、查询或订阅。历史记录可在「API 调用」查看。`,
          "停用 API Key",
          {
            type: "warning",
            confirmButtonText: "停用",
            cancelButtonText: "取消",
          },
        );
        key.enabled = false;
        persist();
        this.$message.success("已停用 API Key");
      } catch {
        // The switch reflects key.enabled after a canceled confirmation.
      } finally {
        this.pendingKeyId = "";
      }
    },
    async removeKey(key) {
      try {
        await this.$confirm(
          `删除「${key.name}」后，该 Key 将立即失效。历史记录可在「API 调用」查看。`,
          "删除 API Key",
          {
            type: "warning",
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            confirmButtonClass: "el-button--danger",
          },
        );
      } catch {
        return;
      }
      key.deletedAt = new Date().toISOString();
      persist();
      this.$message.success("已删除 API Key");
    },
  },
};
</script>
