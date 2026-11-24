<template>
  <section class="demo-file-preview" aria-label="文档阅读查看器">
    <div class="demo-preview-tools" role="toolbar" aria-label="阅读操作">
      <span class="demo-preview-label">{{
        imageUrl ? "图片" : "模拟预览 · " + preview.extension.toUpperCase()
      }}</span>
      <template v-if="kind === 'document' || kind === 'slides'">
        <button
          type="button"
          aria-label="上一页"
          :disabled="page === 1"
          @click="page--"
        >
          ‹
        </button>
        <span>{{ page }} / {{ pageCount }}</span>
        <button
          type="button"
          aria-label="下一页"
          :disabled="page === pageCount"
          @click="page++"
        >
          ›
        </button>
      </template>
      <span class="demo-preview-tools-spacer" />
      <button
        type="button"
        aria-label="缩小"
        :disabled="zoom <= 50"
        @click="zoom = Math.max(50, zoom - 25)"
      >
        −
      </button>
      <output aria-label="缩放比例">{{ zoom }}%</output>
      <button
        type="button"
        aria-label="放大"
        :disabled="zoom >= 200"
        @click="zoom = Math.min(200, zoom + 25)"
      >
        ＋
      </button>
      <button
        v-if="kind === 'image' || kind === 'model'"
        type="button"
        aria-label="旋转"
        @click="angle += 90"
      >
        ↻
      </button>
      <button type="button" aria-label="适合窗口并复位" @click="resetView">
        复位
      </button>
    </div>
    <div v-if="kind === 'archive'" class="demo-archive">
      <nav aria-label="模拟压缩包目录">
        <strong>包内文件</strong>
        <button
          v-for="(entry, index) in archiveFiles"
          :key="entry"
          type="button"
          :class="{ active: archiveIndex === index }"
          @click="archiveIndex = index"
        >
          {{ entry }}
        </button>
      </nav>
      <article :style="{ zoom: zoom / 100 }">
        <ConversationMarkdown
          :text="
            archiveIndex === 0
              ? report
              : archiveIndex === 1
                ? calibration
                : '# 阅读说明\n\n这是随原型提供的模拟包内文件，可切换左侧文件查看。实际上传的压缩包不会在此解压。'
          "
        />
      </article>
    </div>
    <template v-else>
      <div
        ref="stage"
        class="demo-preview-stage"
        :class="{
          'is-sheet': kind === 'spreadsheet',
          'is-visual': kind === 'image' || kind === 'model',
        }"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      >
        <div
          v-if="kind === 'spreadsheet'"
          class="demo-sheet-content"
          :style="{ zoom: zoom / 100 }"
        >
          <table aria-label="模拟质量统计表">
            <thead>
              <tr>
                <th />
                <th v-for="letter in columns" :key="letter">{{ letter }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in sheetRows" :key="index">
                <th>{{ index + 1 }}</th>
                <td
                  v-for="(cell, col) in row"
                  :key="col"
                  :class="{ 'sheet-heading': index === 0 }"
                >
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-else-if="kind === 'image'"
          class="demo-visual"
          :style="visualStyle"
        >
          <img v-if="imageUrl" :src="imageUrl" :alt="name" draggable="false" />
          <svg
            v-else
            viewBox="0 0 720 450"
            role="img"
            aria-label="模拟设备校准示意图"
          >
            <rect width="720" height="450" rx="12" fill="#edf3fa" />
            <path d="M50 350H670M80 60V380" stroke="#c4d4e5" stroke-width="2" />
            <rect
              x="160"
              y="170"
              width="210"
              height="140"
              rx="16"
              fill="#4b7ce8"
            />
            <rect x="187" y="192" width="156" height="58" rx="6" fill="#fff" />
            <text
              x="265"
              y="230"
              text-anchor="middle"
              fill="#365e9e"
              font-size="24"
            >
              ZX-42
            </text>
            <path
              d="M370 235H500V150"
              fill="none"
              stroke="#5f7694"
              stroke-width="12"
            />
            <circle
              cx="500"
              cy="135"
              r="42"
              fill="#ecf7ef"
              stroke="#5b9b70"
              stroke-width="6"
            />
            <path d="m500 135 20-20" stroke="#5b9b70" stroke-width="5" />
            <text
              x="360"
              y="65"
              text-anchor="middle"
              fill="#28496e"
              font-size="28"
            >
              设备校准示意图
            </text>
            <text
              x="360"
              y="410"
              text-anchor="middle"
              fill="#74869c"
              font-size="18"
            >
              模拟图片 · 缩放 / 拖拽 / 旋转
            </text>
          </svg>
        </div>
        <div
          v-else-if="kind === 'model'"
          class="demo-visual"
          :style="visualStyle"
        >
          <svg viewBox="0 0 720 520" role="img" aria-label="模拟工装三维示意图">
            <defs>
              <pattern
                id="demo-model-grid"
                width="40"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M40 0H0V24"
                  fill="none"
                  stroke="#dfe7ef"
                  stroke-width="1"
                />
              </pattern>
            </defs>
            <rect
              y="310"
              width="720"
              height="210"
              fill="url(#demo-model-grid)"
            />
            <g stroke="#6289a8" stroke-width="2" stroke-linejoin="round">
              <path d="m110 320 290-135 225 125-290 150Z" fill="#c8dfef" />
              <path d="m110 320 225 140v28L110 348Z" fill="#759fbe" />
              <path d="m335 460 290-150v28L335 488Z" fill="#8bb4d1" />
              <path
                d="m205 288 0-138 45-22 125 70v145l-45 22Z"
                fill="#82abc9"
              />
              <path d="m205 150 45-22 125 70-45 22Z" fill="#cee6f5" />
              <path d="m330 220 45-22v145l-45 22Z" fill="#527e9f" />
              <path
                d="m430 260 0-138 45-22 125 70v145l-45 22Z"
                fill="#82abc9"
              />
              <path d="m430 122 45-22 125 70-45 22Z" fill="#cee6f5" />
              <path d="m555 192 45-22v145l-45 22Z" fill="#527e9f" />
              <path d="m292 238 190-92" stroke="#4871cb" stroke-width="18" />
            </g>
            <text
              x="360"
              y="45"
              text-anchor="middle"
              fill="#47617c"
              font-size="23"
            >
              ZX-42 工装装配
            </text>
            <text
              x="360"
              y="80"
              text-anchor="middle"
              fill="#8192a6"
              font-size="16"
            >
              模拟工程视图 · 缩放 / 拖拽 / 旋转
            </text>
          </svg>
        </div>
        <article
          v-else-if="kind === 'slides'"
          class="demo-slide"
          :style="{ zoom: zoom / 100 }"
        >
          <span class="demo-slide-kicker">QUALITY REVIEW · 2026</span>
          <h1>
            {{
              page === 1
                ? "产线质量分析"
                : page === 2
                  ? "异常分布与改进重点"
                  : "后续行动与验收"
            }}
          </h1>
          <template v-if="page === 1"
            ><p>ZX-42 传感器组件 · 周度检验复核</p>
            <div class="demo-slide-metrics">
              <div><strong>97.0%</strong><span>首次检验良率</span></div>
              <div><strong>10,000</strong><span>本期检验数量</span></div>
            </div></template
          >
          <template v-else-if="page === 2"
            ><p>尺寸偏差与表面划伤占不合格品的 81%</p>
            <ul>
              <li>尺寸偏差：156 件，核查量具与工装</li>
              <li>表面划伤：87 件，完善周转防护</li>
              <li>标识缺失：36 件，复核出站检查</li>
            </ul></template
          >
          <template v-else
            ><ul>
              <li>质量组：补齐异常记录与测点示值</li>
              <li>设备组：复核量具校准及工装定位</li>
              <li>生产组：连续三个生产日跟踪良率</li>
            </ul>
            <p>验收目标：首次检验良率不低于 97.5%</p></template
          >
        </article>
        <article v-else class="demo-paper" :style="{ zoom: zoom / 100 }">
          <ConversationMarkdown :text="page === 1 ? report : calibration" />
          <footer>模拟文档 · 第 {{ page }} 页 / 共 {{ pageCount }} 页</footer>
        </article>
      </div>
      <div
        v-if="kind === 'spreadsheet'"
        class="demo-sheet-tabs"
        role="tablist"
        aria-label="工作表切换"
      >
        <button
          v-for="(sheet, index) in sheetNames"
          :key="sheet"
          type="button"
          role="tab"
          :aria-selected="sheetIndex === index"
          :class="{ active: sheetIndex === index }"
          @click="sheetIndex = index"
        >
          {{ sheet }}
        </button>
      </div>
    </template>
  </section>
</template>

<script>
import ConversationMarkdown from "./ConversationMarkdown.vue";
import { QUALITY_REPORT_CONTENT } from "../file-demo-content";

export default {
  name: "DemoFilePreview",
  components: { ConversationMarkdown },
  props: {
    preview: {
      type: Object,
      default: () => ({ kind: "image", extension: "" }),
    },
    imageUrl: { type: String, default: "" },
    name: { type: String, default: "" },
  },
  data: () => ({
    zoom: 100,
    page: 1,
    sheetIndex: 0,
    archiveIndex: 0,
    angle: 0,
    offsetX: 0,
    offsetY: 0,
    drag: null,
  }),
  computed: {
    kind() {
      return this.imageUrl ? "image" : this.preview.kind;
    },
    pageCount() {
      return this.kind === "slides" ? 3 : 2;
    },
    report() {
      return QUALITY_REPORT_CONTENT;
    },
    calibration() {
      return "# 设备校准与复核记录\n\n设备型号：ZX-42 传感器组件\n\n## 校准前检查\n\n断开测量输入，检查传感器外观、接线与固定支架，确认设备编号与任务单一致。\n\n## 测点验证\n\n| 测点 | 参考值 | 实际示值 | 状态 |\n| --- | --- | --- | --- |\n| 零点 | 0.00 | 0.01 | 通过 |\n| 中间测点 | 50.00 | 50.02 | 通过 |\n| 高位测点 | 100.00 | 100.04 | 待复核 |\n\n## 交接要求\n\n保留初测与复测记录，填写设备编号、复核人和确认时间。待复核项目单独交接，结论确认后归档。";
    },
    columns() {
      return "ABCDEFGH".split("");
    },
    sheetNames() {
      return ["检验统计", "异常明细", "改进计划"];
    },
    sheetRows() {
      const sheets = [
        [
          [
            "日期",
            "检验数量",
            "合格数量",
            "不合格",
            "良率",
            "产线",
            "复核状态",
            "备注",
          ],
          ["11-20", 5000, 4860, 140, "97.2%", "装配一线", "已复核", "正常"],
          ["11-21", 5000, 4840, 160, "96.8%", "装配一线", "已复核", "关注尺寸"],
          ["合计", 10000, 9700, 300, "97.0%", "", "", ""],
        ],
        [
          [
            "异常类型",
            "数量",
            "占比",
            "责任组",
            "状态",
            "批次",
            "复核人",
            "备注",
          ],
          [
            "尺寸偏差",
            156,
            "52%",
            "设备组",
            "复核中",
            "QC-01",
            "李工",
            "检查量具",
          ],
          [
            "表面划伤",
            87,
            "29%",
            "生产组",
            "处理中",
            "QC-02",
            "张工",
            "完善防护",
          ],
          [
            "标识缺失",
            36,
            "12%",
            "质量组",
            "已安排",
            "QC-03",
            "王工",
            "补核标识",
          ],
          ["其他", 21, "7%", "质量组", "已记录", "", "", ""],
        ],
        [
          [
            "任务",
            "责任组",
            "负责人",
            "截止日期",
            "进度",
            "验收标准",
            "复核时间",
            "备注",
          ],
          ["复核量具", "设备组", "李工", "11-25", "进行中", "校准有效", "", ""],
          [
            "周转防护",
            "生产组",
            "张工",
            "11-26",
            "待验收",
            "无新增划伤",
            "",
            "",
          ],
          [
            "良率跟踪",
            "质量组",
            "王工",
            "11-27",
            "进行中",
            "≥97.5%",
            "",
            "连续三日",
          ],
        ],
      ];
      return [
        ...sheets[this.sheetIndex],
        ...Array.from({ length: 22 }, () => Array(8).fill("")),
      ];
    },
    archiveFiles() {
      return ["质量报告.md", "校准记录.md", "阅读说明.txt"];
    },
    visualStyle() {
      return {
        transform: `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.zoom / 100}) rotate(${this.angle}deg)`,
      };
    },
  },
  methods: {
    resetView() {
      this.zoom = 100;
      this.angle = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    },
    startDrag(event) {
      if (!["image", "model"].includes(this.kind) || event.button !== 0) return;
      this.drag = {
        x: event.clientX - this.offsetX,
        y: event.clientY - this.offsetY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    moveDrag(event) {
      if (this.drag) {
        this.offsetX = event.clientX - this.drag.x;
        this.offsetY = event.clientY - this.drag.y;
      }
    },
    endDrag() {
      this.drag = null;
    },
  },
};
</script>

<style scoped>
.demo-file-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f2f4f7;
  color: #35445a;
}
.demo-preview-tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 40px;
  padding: 6px 10px;
  border-bottom: 1px solid #e1e6ed;
  background: #fff;
  font-size: 12px;
}
.demo-preview-label {
  color: #7c8a9c;
  font-size: 11px;
  margin-right: 4px;
}
.demo-preview-tools-spacer {
  flex: 1;
}
.demo-preview-tools button {
  padding: 3px 7px;
  min-width: 25px;
  border: 1px solid #dce3ed;
  border-radius: 4px;
  background: #fff;
  color: #526982;
  cursor: pointer;
}
.demo-preview-tools button:disabled {
  opacity: 0.35;
  cursor: default;
}
.demo-preview-tools output {
  min-width: 35px;
  text-align: center;
}
.demo-preview-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px;
  overscroll-behavior: contain;
}
.demo-paper {
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  min-height: 100%;
  margin: 0 auto;
  padding: clamp(16px, 4vw, 46px);
  background: #fff;
  box-shadow: 0 1px 5px #243b5314;
}
.demo-paper footer {
  padding-top: 32px;
  text-align: center;
  color: #9aa6b3;
  font-size: 11px;
}
.demo-slide {
  box-sizing: border-box;
  width: 100%;
  max-width: 960px;
  min-height: 360px;
  margin: 10px auto;
  padding: 36px;
  border-top: 6px solid #567edf;
  background: #fff;
  box-shadow: 0 2px 10px #243b5314;
}
.demo-slide-kicker {
  color: #7e94b2;
  letter-spacing: 2px;
  font-size: 11px;
}
.demo-slide h1 {
  margin: 32px 0 20px;
  color: #2b4a76;
  font-size: 28px;
}
.demo-slide p,
.demo-slide li {
  line-height: 2;
}
.demo-slide-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 36px;
  margin: 40px 0;
}
.demo-slide-metrics div {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.demo-slide-metrics strong {
  color: #4c76cf;
  font-size: 32px;
}
.is-sheet {
  padding: 0;
  background: #fff;
}
.demo-sheet-content table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
}
.demo-sheet-content th {
  background: #f2f5f8;
  color: #7a899a;
  font-weight: 400;
}
.demo-sheet-content td,
.demo-sheet-content th {
  height: 29px;
  padding: 4px 8px;
  border: 1px solid #e3e8ef;
  white-space: nowrap;
  overflow: hidden;
}
.demo-sheet-content th:first-child {
  width: 34px;
  text-align: center;
}
.demo-sheet-content .sheet-heading {
  background: #eef4ff;
  font-weight: 600;
  color: #3e5f8e;
}
.demo-sheet-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding: 6px 12px;
  overflow: auto;
  border-top: 1px solid #dce3ed;
  background: #f8fafc;
}
.demo-sheet-tabs button {
  padding: 6px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  white-space: nowrap;
  color: #687c94;
  cursor: pointer;
}
.demo-sheet-tabs button.active {
  color: #3d71d4;
  border-bottom-color: #5b87df;
  background: #fff;
}
.is-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
}
.is-visual:active {
  cursor: grabbing;
}
.demo-visual {
  flex: 0 0 100%;
  max-width: 900px;
  user-select: none;
  transform-origin: center;
}
.demo-visual img {
  display: block;
  max-width: 100%;
  max-height: 75vh;
  margin: auto;
  object-fit: contain;
  pointer-events: none;
}
.demo-visual svg {
  display: block;
  width: 100%;
  max-height: 75vh;
}
.demo-archive {
  display: flex;
  flex: 1;
  min-height: 0;
}
.demo-archive nav {
  display: flex;
  flex: 0 0 180px;
  flex-direction: column;
  gap: 6px;
  padding: 16px 10px;
  overflow: auto;
  border-right: 1px solid #e1e6ed;
  background: #fff;
}
.demo-archive nav strong {
  margin: 0 8px 12px;
  font-size: 12px;
}
.demo-archive nav button {
  padding: 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  color: #61758e;
  cursor: pointer;
}
.demo-archive nav button.active {
  color: #3d71d4;
  background: #edf3ff;
}
.demo-archive article {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 24px;
  background: #fff;
}
</style>
