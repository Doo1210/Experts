// 每条演示名单属于固定专家与渠道；只作为历史线索，不代表平台当前可发送。
const entries = {
  exp_quality: {
    wecom: {
      people: [
        {
          id: "wc-owner",
          name: "授权人",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 17:29",
          result: "成功",
          testedAt: "10-10 17:29",
        },
        {
          id: "wc-recent-1",
          name: "设备主管",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 17:20",
          result: "失败",
          testedAt: "10-10 17:20",
        },
        {
          id: "wc-expired-1",
          name: "历史联系人",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 17:11",
          result: "未知",
          testedAt: "10-10 17:11",
        },
        {
          id: "wc-shift-lead",
          name: "当班负责人",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 16:45",
        },
        {
          id: "wc-maintenance",
          name: "维修工程师",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 16:15",
          result: "成功",
          testedAt: "10-10 16:20",
        },
        {
          id: "wc-inspector",
          name: "巡检人员",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 15:40",
        },
      ],
      groups: [
        {
          id: "wc-group-1",
          name: "产线协作群",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 17:29",
          result: "部分成功",
          testedAt: "10-10 17:35",
        },
        {
          id: "wc-group-partial",
          name: "质量复盘群",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 16:55",
          result: "部分成功",
          testedAt: "10-10 17:40",
        },
      ],
    },
  },
  exp_ops: {
    dingtalk: {
      people: [
        {
          id: "ding_user_001",
          name: "设备主管",
          source: "历史单聊 sender_staff_id",
          lastInteractionAt: "10-10 17:20",
          result: "成功",
          testedAt: "10-10 17:30",
        },
      ],
      groups: [
        {
          id: "cid_demo_line_001",
          name: "产线协作群",
          source: "历史群聊 conversation_id",
          lastInteractionAt: "10-10 17:29",
          result: "失败",
          testedAt: "10-10 17:32",
        },
      ],
    },
    feishu: {
      people: [
        {
          id: "ou_demo_ops_001",
          name: "运营同事",
          source: "入站消息 open_id",
          lastInteractionAt: "10-10 16:40",
          result: "未知",
          testedAt: "10-10 17:15",
        },
      ],
      groups: [
        {
          id: "oc_demo_ops_001",
          name: "运营协作群",
          source: "机器人可见群",
          lastInteractionAt: "",
        },
      ],
    },
  },
};

export function demoChannelTargets(expertId, channelId) {
  const samples = entries[expertId]?.[channelId] || {};
  return {
    people: (samples.people || []).map((item) => ({
      ...item,
      purpose: "",
      approved: true,
      checkedAt: "10-10 17:30",
      result: item.result || "",
      testedAt: item.testedAt || "",
    })),
    groups: (samples.groups || []).map((item) => ({
      ...item,
      purpose: "",
      approved: true,
      checkedAt: "10-10 17:30",
      result: item.result || "",
      testedAt: item.testedAt || "",
    })),
  };
}

const candidates = {
  exp_quality: {
    wecom: {
      person: [
        {
          id: "wc-timeout-1",
          name: "网络波动会话",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 17:02",
        },
      ],
      group: [
        {
          id: "wc-group-expired",
          name: "历史通知群",
          source: "该机器人历史互动",
          lastInteractionAt: "10-10 17:20",
        },
      ],
    },
  },
  exp_ops: {
    dingtalk: {
      person: [
        {
          id: "ding_user_002",
          name: "运营负责人",
          source: "历史单聊 sender_staff_id",
          lastInteractionAt: "10-10 15:20",
        },
      ],
      group: [
        {
          id: "cid_demo_ops_002",
          name: "运营通知群",
          source: "历史群聊 conversation_id",
          lastInteractionAt: "10-10 15:35",
        },
      ],
    },
    feishu: {
      person: [
        {
          id: "ou_demo_ops_002",
          name: "协作同事",
          source: "入站消息 open_id",
          lastInteractionAt: "10-10 16:10",
        },
        {
          id: "ou_demo_directory_003",
          name: "项目协调人",
          source: "应用通讯录查询（需权限）",
          lastInteractionAt: "",
        },
      ],
      group: [
        {
          id: "oc_demo_ops_002",
          name: "周报协作群",
          source: "机器人可见群",
          lastInteractionAt: "",
        },
      ],
    },
  },
};

export function demoChannelCandidates(expertId, channelId, kind) {
  return (candidates[expertId]?.[channelId]?.[kind] || []).map((item) => ({
    ...item,
  }));
}

export function demoChannelDeliveries(expertId, channelId) {
  if (expertId !== "exp_ops" || channelId !== "dingtalk") return [];
  return [
    {
      id: "dly-20261010-accepted",
      platform: channelId,
      targetName: "设备主管",
      targetId: "ding_user_001",
      initiator: "管理员测试",
      summary: "文字：设备巡检提醒",
      at: "2026-10-10T17:31:00+08:00",
      status: "accepted",
      receipt: "ACCEPTED",
      parts: "文字已受理；不代表送达或已读",
    },
    {
      id: "dly-20261010-failed",
      platform: channelId,
      targetName: "产线协作群",
      targetId: "cid_demo_line_001",
      initiator: "管理员测试",
      summary: "文字：群通知",
      at: "2026-10-10T17:32:00+08:00",
      status: "failed",
      receipt: "BOT_NOT_IN_GROUP",
      parts: "发送失败：机器人不在目标群",
    },
    {
      id: "dly-20261010-unknown",
      platform: channelId,
      targetName: "设备主管",
      targetId: "ding_user_001",
      initiator: "管理员测试",
      summary: "文字：结果待确认",
      at: "2026-10-10T17:33:00+08:00",
      status: "unknown",
      receipt: "TIMEOUT",
      parts: "结果未知；可能已发出，请核对后再决定是否重试",
    },
    {
      id: "dly-20261010-partial",
      platform: channelId,
      targetName: "产线协作群",
      targetId: "cid_demo_line_001",
      initiator: "管理员测试",
      summary: "文字加文件：质检报告.pdf",
      at: "2026-10-10T17:34:00+08:00",
      status: "partial",
      receipt: "PARTIAL",
      parts: "文字已受理；附件上传失败",
    },
  ];
}
