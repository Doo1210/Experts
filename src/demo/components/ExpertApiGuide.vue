<template>
  <el-drawer
    title="调用指南"
    :visible="visible"
    size="min(720px, 100vw)"
    append-to-body
    custom-class="expert-api-guide"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="expert-api-guide-content">
      <p class="expert-api-guide-intro">
        示例使用演示地址。实际接入时，由第三方后台通过
        <code>EXPERT_API_KEY</code> 提供有效的专家 Key。
      </p>
      <section
        v-for="step in steps"
        :key="step.title"
        class="expert-api-guide-step"
      >
        <h3>{{ step.title }}</h3>
        <p>{{ step.description }}</p>
        <div
          v-for="example in step.examples"
          :key="example.label"
          class="expert-api-code"
        >
          <div>
            <span>{{ example.label }}</span>
            <el-button
              type="text"
              icon="el-icon-document-copy"
              :aria-label="`复制${example.label}示例`"
              @click="copy(example.code)"
              >复制</el-button
            >
          </div>
          <pre><code>{{ example.code }}</code></pre>
        </div>
        <p v-if="step.note">{{ step.note }}</p>
      </section>
      <section class="expert-api-guide-step">
        <h3>维护多个业务会话</h3>
        <p>
          同一地址和 Key 可用于不同业务会话。在业务系统中分别保存对应的专家会话
          ID。
        </p>
        <el-table :data="sessions" size="small" class="expert-api-table">
          <el-table-column prop="business" label="业务会话" min-width="120" />
          <el-table-column
            prop="conversation"
            label="conversation_id"
            min-width="135"
          />
          <el-table-column
            prop="runs"
            label="首轮与追问的 run_id"
            min-width="180"
          />
        </el-table>
        <p>同一专家的其他有效 Key 持有这些 ID 时，也可以查询或续接。</p>
      </section>
    </div>
  </el-drawer>
</template>

<script>
import { copyApiText } from "../external-api";

const AUTH = '  -H "Authorization: Bearer $EXPERT_API_KEY"';
const CONTENT = "  -H 'Content-Type: application/json'";
const joinCommand = (lines) => lines.join(" \\\n");

export default {
  props: {
    visible: { type: Boolean, required: true },
    address: { type: String, required: true },
  },
  data() {
    return {
      sessions: [
        {
          business: "MES · A 线",
          conversation: "conv_A",
          runs: "run_001 → run_003",
        },
        {
          business: "MES · B 线",
          conversation: "conv_B",
          runs: "run_002 → run_004",
        },
      ],
    };
  },
  computed: {
    steps() {
      const submit = (first) =>
        joinCommand([
          `${first ? "first" : "next"}_response="$(curl -fsS "$RUNS_URL"`,
          AUTH,
          CONTENT,
          `  -H "Idempotency-Key: $${first ? "FIRST" : "NEXT"}_REQUEST_ID"`,
          first
            ? `  --data '{"input":"分析今天 A 线的良率异常。"}')"`
            : '  --data "$next_body")"',
        ]);
      return [
        {
          title: "提交首轮",
          description:
            "首轮输入为文本，省略 conversation_id。收到 202 后保存会话 ID 和运行 ID。示例使用 jq 读取响应。",
          examples: [
            {
              label: "提交首轮",
              code: [
                `RUNS_URL='${this.address}'`,
                'FIRST_REQUEST_ID="$(uuidgen)"',
                submit(true),
                `CONVERSATION_ID="$(jq -r '.conversation_id' <<< "$first_response")"`,
                `RUN_ID="$(jq -r '.run_id' <<< "$first_response")"`,
              ].join("\n"),
            },
          ],
          note: "请求超时时，用原请求体和原幂等键重试，取回原来的两个 ID。",
        },
        {
          title: "查询本轮结果或订阅执行过程",
          description:
            "用 run_id 查询本轮结果。SSE 提供回答增量、工具开始与完成事件。最终结果以 GET 为准。",
          examples: [
            {
              label: "查询结果",
              code: joinCommand(['curl -fsS "$RUNS_URL/$RUN_ID"', AUTH]),
            },
            {
              label: "订阅 SSE",
              code: joinCommand([
                'curl -fsSN "$RUNS_URL/$RUN_ID/events"',
                AUTH,
                "  -H 'Accept: text/event-stream'",
              ]),
            },
          ],
          note: "SSE 断线后携带 Last-Event-ID 续接。游标过期返回 410，可在结果保留期内继续查询。",
        },
        {
          title: "提交追问",
          description:
            "等上一轮结束后，使用原 conversation_id 和新的幂等键提交追问。响应中的新 run_id 用于查询这一轮。",
          examples: [
            {
              label: "提交追问",
              code: [
                'NEXT_REQUEST_ID="$(uuidgen)"',
                joinCommand([
                  'next_body="$(jq -n --arg conversation_id "$CONVERSATION_ID"',
                  "  --arg input '刚才的异常集中在哪个工序？'",
                  `  '{conversation_id: $conversation_id, input: $input}')"`,
                ]),
                submit(false),
                `RUN_ID="$(jq -r '.run_id' <<< "$next_response")"`,
              ].join("\n"),
            },
          ],
          note: "返回 409 CONVERSATION_BUSY 时，等当前轮结束后再重试。",
        },
      ];
    },
  },
  methods: {
    copy(code) {
      return copyApiText(this, code, "已复制示例");
    },
  },
};
</script>
