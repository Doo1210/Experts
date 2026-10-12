// Local display fixtures adapted from the product prototype's IM task examples.
const at = (day, time) => `2026-10-${day}T${time}:00+08:00`;
const message = (id, role, day, time, content, extra = {}) => ({
  id,
  role,
  at: at(day, time),
  content,
  ...extra,
});

export function createImDemoChats(expertId = "exp_quality") {
  const group = {
    id: `im_${expertId}_group`,
    expertId,
    platform: "企业微信",
    chatType: "group",
    chatId: `wecom-chat81-${expertId}`,
    title: "产线协作群",
    cwd: "消息渠道/企业微信/产线协作群--chat81",
    updatedAt: at("10", "10:24"),
    lastInitiator: "张三",
    members: [
      {
        id: "zhang42",
        name: "张三",
        lastActivityAt: at("10", "10:24"),
        segments: [
          {
            id: "S1",
            sessionId: `im-${expertId}-zhang-S1-full`,
            startedAt: at("09", "15:20"),
            current: false,
            messages: [
              message(
                "g-z-1",
                "user",
                "09",
                "15:20",
                "昨天工位 8 的良率为什么有波动？",
                { question: true, title: "昨天的良率波动" },
              ),
              message(
                "g-z-2",
                "assistant",
                "09",
                "15:22",
                "主要集中在换型后的前 30 分钟，建议先核对相机标定和来料批次。",
              ),
            ],
          },
          {
            id: "S2",
            sessionId: `im-${expertId}-zhang-S2-full`,
            startedAt: at("10", "09:20"),
            current: false,
            resetCommand: "/reset",
            messages: [
              message(
                "g-z-3",
                "user",
                "10",
                "09:20",
                "请分析这份设备表格并指出异常工位。",
                { question: true, title: "分析设备表格" },
              ),
              message("g-z-4", "file", "10", "09:20", "", {
                fileName: "设备表格.xlsx",
                direction: "received",
                transferStatus: "已保存",
              }),
              message(
                "g-z-5",
                "tool",
                "10",
                "09:22",
                "已读取表格并核对各工位节拍。",
              ),
              message(
                "g-z-6",
                "assistant",
                "10",
                "09:24",
                "工位 8 的节拍偏差最大，建议复核视觉检测参数。",
              ),
              message("g-z-7", "file", "10", "09:25", "", {
                fileName: "检查结果.md",
                direction: "generated",
                transferStatus: "已生成",
              }),
              message("g-z-8", "command", "10", "10:02", "/new"),
            ],
          },
          {
            id: "S3",
            sessionId: `im-${expertId}-zhang-S3-full`,
            startedAt: at("10", "10:03"),
            current: true,
            resetCommand: "/new",
            messages: [
              message(
                "g-z-9",
                "user",
                "10",
                "10:03",
                "重新开始。请先看这张现场照片。",
                { question: true, title: "查看现场照片" },
              ),
              message("g-z-10", "file", "10", "10:03", "", {
                fileName: "现场照片.png",
                direction: "received",
                transferStatus: "已保存",
              }),
              message(
                "g-z-11",
                "assistant",
                "10",
                "10:06",
                "照片显示工位 8 的物料遮挡了相机视野，建议调整料架位置。",
              ),
              message(
                "g-z-12",
                "user",
                "10",
                "10:24",
                "今天的数据结论是什么？",
                { question: true, title: "今天的数据结论" },
              ),
              message(
                "g-z-13",
                "assistant",
                "10",
                "10:25",
                "今天良率为 98.1%。移开遮挡后，工位 8 的误判率已下降。",
              ),
              message("g-z-14", "file", "10", "10:26", "", {
                fileName: "良率分析.md",
                direction: "generated",
                transferStatus: "已生成",
              }),
            ],
          },
        ],
      },
      {
        id: "li73",
        name: "李四",
        lastActivityAt: at("10", "09:10"),
        segments: [
          {
            id: "S4",
            sessionId: `im-${expertId}-li-S4-full`,
            startedAt: at("10", "09:05"),
            current: true,
            messages: [
              message(
                "g-l-1",
                "user",
                "10",
                "09:05",
                "包装线的设备报警该怎么处理？",
                { question: true, title: "包装线设备报警" },
              ),
              message(
                "g-l-2",
                "assistant",
                "10",
                "09:10",
                "先隔离故障设备，再按报警码核对传感器和气路。",
              ),
            ],
          },
        ],
      },
      {
        id: "wang55",
        name: "王五",
        lastActivityAt: at("10", "08:35"),
        segments: [
          {
            id: "S5",
            sessionId: `im-${expertId}-wang-S5-full`,
            startedAt: at("10", "08:30"),
            current: true,
            messages: [
              message(
                "g-w-1",
                "user",
                "10",
                "08:30",
                "请确认 AGV 今天的调度窗口。",
                { question: true, title: "AGV 调度窗口" },
              ),
              message(
                "g-w-2",
                "assistant",
                "10",
                "08:35",
                "建议 11:30 后安排穿越主通道，避开物料补给高峰。",
              ),
            ],
          },
        ],
      },
    ],
  };
  const dm = {
    id: `im_${expertId}_dm`,
    expertId,
    platform: "钉钉",
    chatType: "single",
    chatId: `dingtalk-chat30-${expertId}`,
    title: "设备主管",
    cwd: "消息渠道/钉钉/设备主管--chat30",
    updatedAt: at("09", "16:42"),
    lastInitiator: "设备主管",
    members: [
      {
        id: "dm12",
        name: "设备主管",
        lastActivityAt: at("09", "16:42"),
        segments: [
          {
            id: "S5",
            sessionId: `im-${expertId}-dm-S5-full`,
            startedAt: at("09", "15:40"),
            current: false,
            messages: [
              message(
                "d-1",
                "user",
                "09",
                "15:40",
                "请确认设备今天的巡检安排。",
                { question: true, title: "设备巡检安排" },
              ),
              message(
                "d-2",
                "assistant",
                "09",
                "15:42",
                "下午先检查机器人关节温度，再复核安全光栅。",
              ),
              message("d-3", "command", "09", "16:05", "/reset"),
            ],
          },
          {
            id: "S6",
            sessionId: `im-${expertId}-dm-S6-full`,
            startedAt: at("09", "16:06"),
            current: true,
            resetCommand: "/reset",
            messages: [
              message(
                "d-4",
                "user",
                "09",
                "16:42",
                "根据这份巡检记录给出结论。",
                { question: true, title: "巡检记录结论" },
              ),
              message("d-5", "file", "09", "16:42", "", {
                fileName: "巡检记录.pdf",
                direction: "received",
                transferStatus: "已保存",
              }),
              message(
                "d-6",
                "assistant",
                "09",
                "16:44",
                "设备整体运行稳定，建议继续观察关节温度的短时波动。",
              ),
            ],
          },
        ],
      },
    ],
  };
  return [group, dm];
}
