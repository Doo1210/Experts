// Local display fixtures adapted from the product prototype's IM task examples.
const at = (day, time) => `2026-10-${day}T${time}:00+08:00`;
const message = (id, role, day, time, content, extra = {}) => ({
  id,
  role,
  at: at(day, time),
  content,
  ...(role === "assistant" ? { turnStatus: "completed" } : {}),
  ...extra,
});

export function createImDemoChats(expertId = "exp_quality") {
  const group = {
    id: `im_${expertId}_group`,
    expertId,
    platform: "企业微信",
    chatType: "group",
    chatId: `wecom-chat81-${expertId}`,
    identifierName: "chatid",
    identifierValue: `wecom-chat81-${expertId}`,
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
                { title: "读取表格" },
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
                content:
                  "# 检查结果\n\n工位 8 的节拍偏差最大。建议复核视觉检测参数，并核对相机标定与来料批次。",
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
                "g-z-notice",
                "notice",
                "10",
                "10:04",
                "已开始新的成员会话。",
              ),
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
                "g-z-12-tool",
                "tool",
                "10",
                "10:24",
                "已对照今日产线日报和工位 8 的复检记录。",
                { title: "核对当日良率" },
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
                content:
                  "# 良率分析\n\n今日良率为 98.1%。移开遮挡后，工位 8 的误判率已下降。",
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
    identifierName: "conversationId",
    identifierValue: `dingtalk-chat30-${expertId}`,
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
                "d-5-stage",
                "notice",
                "09",
                "16:42",
                "已核对巡检范围与设备清单。",
              ),
              message(
                "d-5-tool",
                "tool",
                "09",
                "16:43",
                "已读取巡检记录并对照关节温度与安全光栅检查项。",
                { title: "读取巡检记录" },
              ),
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
  group.platformScope = "org-fab-a";
  group.runState = "ready";
  group.cwd = "消息渠道/wecom/chat-wecom81";
  dm.platformScope = "org-fab-a";
  dm.runState = "unknown";
  dm.gatewayStatus = "disconnected";
  dm.cwd = "消息渠道/dingtalk/chat-dingtalk30";

  function segmentWithPath(
    segment,
    scopePath,
    senderName,
    dbStart,
    current,
    boundaryLabel = "",
  ) {
    const cwd = `${scopePath}/session-${segment.id.toLowerCase()}`;
    let lastUserAt = null;
    return {
      ...segment,
      current,
      cwd,
      boundaryLabel,
      messages: segment.messages.map((entry, index) => {
        if (entry.role === "user") lastUserAt = entry.at;
        const durationMs =
          entry.role === "assistant" &&
          entry.turnStatus !== "running" &&
          lastUserAt
            ? new Date(entry.at).getTime() - new Date(lastUserAt).getTime()
            : null;
        return {
          ...entry,
          dbId: dbStart + index,
          ...(Number.isFinite(durationMs) && durationMs >= 0
            ? { durationMs }
            : {}),
          senderName: entry.role === "user" ? senderName : undefined,
          fileDirectory:
            entry.role === "file"
              ? `${cwd}/${entry.direction === "received" ? "收到文件" : "生成文件"}`
              : undefined,
        };
      }),
    };
  }

  group.scopes = group.members.map((member, index) => {
    const scopePath = `${group.cwd}/scope-m${String(index + 1).padStart(2, "0")}`;
    return {
      id: member.id,
      label: member.name,
      memberName: member.name,
      mode: "member",
      current: true,
      lastActivityAt: member.lastActivityAt,
      sessionKey: `agent:${expertId}:wecom:group:${group.chatId}:${member.id}`,
      cwd: scopePath,
      segments: member.segments.map((segment, segmentIndex) =>
        segmentWithPath(
          segment,
          scopePath,
          member.name,
          (index + 2) * 1000 + segmentIndex * 100,
          segmentIndex === member.segments.length - 1,
          segmentIndex === 0
            ? ""
            : segment.resetCommand === "/new"
              ? "/new"
              : "开始新会话",
        ),
      ),
    };
  });
  dm.sessionKey = null;
  dm.scopes = [];
  dm.segments = dm.members[0].segments.map((segment, index) =>
    segmentWithPath(
      segment,
      dm.cwd,
      "设备主管",
      6000 + index * 100,
      index === dm.members[0].segments.length - 1,
      index === 0 ? "" : "/reset",
    ),
  );
  function sampleChat({
    id,
    platform,
    chatType,
    title,
    identifierName,
    identifierValue,
    sender,
    day,
    time,
    longHistory = false,
    runState = "ready",
    ongoingTime = "",
  }) {
    const cwd = `消息渠道/${platform}/${id}`;
    const historyPairs = [
      [
        "请汇总本周二号产线的良率变化。",
        "本周良率整体稳定，周三夜班有一次短时下降。",
      ],
      [
        "周三下降主要集中在哪个时段？",
        "主要集中在 22:00 至 23:30，随后逐步恢复。",
      ],
      [
        "请对比这段时间的设备报警。",
        "相机与输送线各出现一次报警，建议先核对相机标定。",
      ],
      ["来料批次有变化吗？", "同一时段切换了一个来料批次，需复核抽检记录。"],
      ["能列出需要复核的工位吗？", "优先复核工位 3、工位 8 和末端复检工位。"],
      [
        "工位 8 的误判率是多少？",
        "样例记录中误判率为 1.8%，高于本周其余时段。",
      ],
      [
        "请整理一份排查顺序。",
        "建议依次检查光源、相机标定、料架遮挡与批次标签。",
      ],
      [
        "夜班复核结果更新了吗？",
        "已收到夜班记录，遮挡问题已排除，标定仍待复核。",
      ],
      ["请对照白班数据。", "白班同期波动较小，设备参数差异值得进一步核查。"],
      [
        "把异常点按影响程度排序。",
        "当前顺序为相机标定、来料批次、输送线短时报警。",
      ],
      [
        "形成一段给班组的摘要。",
        "周三夜班良率短时下降，请先复核工位 8 的相机标定。",
      ],
      ["下一步还需要哪些数据？", "还需工位图像样本、抽检记录和报警处理单。"],
    ];
    const olderMessages = longHistory
      ? historyPairs.flatMap(([question, answer], index) => [
          message(
            `${id}-history-question-${index + 1}`,
            "user",
            day,
            `09:${String(index * 3).padStart(2, "0")}`,
            question,
            { question: true, title: question },
          ),
          ...((index + 1) % 3 === 0
            ? [
                message(
                  `${id}-history-tool-${index + 1}`,
                  "tool",
                  day,
                  `09:${String(index * 3).padStart(2, "0")}`,
                  `已核对与“${question}”相关的本地样例记录。`,
                  {
                    title: [
                      "读取产线日报",
                      "检索报警记录",
                      "核对抽检数据",
                      "整理分析摘要",
                    ][Math.floor(index / 3) % 4],
                  },
                ),
              ]
            : []),
          message(
            `${id}-history-answer-${index + 1}`,
            "assistant",
            day,
            `09:${String(index * 3 + 1).padStart(2, "0")}`,
            answer,
          ),
        ])
      : [];
    const segment = segmentWithPath(
      {
        id: "S1",
        sessionId: `im-${expertId}-${id}-S1-full`,
        startedAt: at(day, time),
        messages: [
          ...olderMessages,
          message(`${id}-user`, "user", day, time, "请查看最新情况。", {
            question: true,
            title: "查看最新情况",
          }),
          message(
            `${id}-stage`,
            "notice",
            day,
            time,
            "已确认问题范围，开始核对近期记录。",
          ),
          message(
            `${id}-tool-1`,
            "tool",
            day,
            time,
            "已读取该聊天关联的近期工作记录。",
            { title: "读取近期记录" },
          ),
          ...(longHistory
            ? [
                message(
                  `${id}-interim`,
                  "assistant",
                  day,
                  time,
                  "我先核对报警与良率变化，再给出结论。",
                ),
                message(
                  `${id}-tool-2`,
                  "tool",
                  day,
                  time,
                  "已将报警时间与良率波动时段进行对照。",
                  { title: "对照异常时段" },
                ),
              ]
            : []),
          message(
            `${id}-assistant`,
            "assistant",
            day,
            `${time.slice(0, 3)}${String(Number(time.slice(3)) + 1).padStart(2, "0")}`,
            "已收到，当前记录已整理完毕。",
          ),
          ...(ongoingTime
            ? [
                message(
                  `${id}-running-user`,
                  "user",
                  "28",
                  ongoingTime,
                  "请继续核对最新异常。",
                  {
                    question: true,
                    title: "核对最新异常",
                  },
                ),
                message(
                  `${id}-running-stage`,
                  "notice",
                  "28",
                  ongoingTime,
                  "已收到新消息，正在核对近期记录。",
                ),
                message(
                  `${id}-running-tool`,
                  "tool",
                  "28",
                  ongoingTime,
                  "正在比对关联工作目录中的样例数据。",
                  {
                    title: "比对近期数据",
                  },
                ),
                message(
                  `${id}-running-assistant`,
                  "assistant",
                  "28",
                  ongoingTime,
                  "",
                  {
                    turnStatus: "running",
                  },
                ),
              ]
            : []),
        ],
      },
      chatType === "group" ? `${cwd}/scope-m01` : cwd,
      sender,
      9000,
      true,
    );
    return {
      id: `im_${expertId}_${id}`,
      expertId,
      platform,
      chatType,
      chatId: identifierValue,
      identifierName,
      identifierValue,
      title,
      cwd,
      updatedAt: at(day, time),
      lastInitiator: sender,
      platformScope: "org-fab-a",
      runState,
      scopes:
        chatType === "group"
          ? [
              {
                id: `${id}-sender`,
                label: sender,
                memberName: sender,
                mode: "member",
                current: true,
                sessionKey: `agent:${expertId}:${platform}:${id}:${sender}`,
                cwd: `${cwd}/scope-m01`,
                segments: [segment],
              },
            ]
          : [],
      segments: chatType === "single" ? [segment] : [],
      sessionKey: null,
    };
  }
  return [
    group,
    dm,
    sampleChat({
      id: "dingtalk-group",
      platform: "钉钉",
      chatType: "group",
      title: "产线质量分析群",
      identifierName: "conversationId",
      identifierValue: `cid-quality-82ab-${expertId}`,
      sender: "张工",
      day: "11",
      time: "14:32",
      runState: "running",
      ongoingTime: "15:08",
    }),
    sampleChat({
      id: "feishu-group",
      platform: "飞书",
      chatType: "group",
      title: "设备异常处理群",
      identifierName: "chat_id",
      identifierValue: `oc_92bd-6c81-${expertId}`,
      sender: "李工",
      day: "12",
      time: "14:32",
      runState: "running",
      ongoingTime: "15:10",
    }),
    sampleChat({
      id: "feishu-single",
      platform: "飞书",
      chatType: "single",
      title: "李工",
      identifierName: "chat_id",
      identifierValue: `oc_73af-9d20-${expertId}`,
      sender: "李工",
      day: "13",
      time: "14:32",
      longHistory: true,
    }),
    sampleChat({
      id: "wecom-single",
      platform: "企业微信",
      chatType: "single",
      title: "王工",
      identifierName: "userid",
      identifierValue: `wang-0042-${expertId}`,
      sender: "王工",
      day: "14",
      time: "14:32",
      runState: "running",
      ongoingTime: "15:12",
    }),
  ];
}

export function createImWorkspaceItems(chats = createImDemoChats()) {
  const items = [];
  const folders = new Map([["消息渠道", "f_quality_im"]]);
  function folderId(path) {
    if (folders.has(path)) return folders.get(path);
    const parts = path.split("/");
    const name = parts.pop();
    const parentId = folderId(parts.join("/"));
    let hash = 2166136261;
    for (const char of path)
      hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    const id = `f_im_${(hash >>> 0).toString(16)}`;
    folders.set(path, id);
    items.push({ id, name, parentId, kind: "folder" });
    return id;
  }
  for (const chat of chats) {
    folderId(chat.cwd);
    function addSegments(segments) {
      for (const segment of segments || []) {
        folderId(segment.cwd);
        for (const entry of segment.messages || []) {
          if (entry.role !== "file") continue;
          const parentId = folderId(
            entry.fileDirectory ||
              `${segment.cwd}/${entry.direction === "received" ? "收到文件" : "生成文件"}`,
          );
          items.push({
            id: `f_im_file_${entry.id}`,
            name: entry.fileName,
            parentId,
            kind: "file",
            content: entry.content || `演示文件：${entry.fileName}`,
          });
        }
      }
    }
    for (const scope of chat.scopes || []) {
      folderId(scope.cwd);
      addSegments(scope.segments);
    }
    addSegments(chat.segments);
  }
  return items;
}
