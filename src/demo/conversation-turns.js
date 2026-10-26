import {
  toolAction,
  toolArgumentSummary,
  toolOutcome,
  toolInputText,
  toolOutputSections,
  toolProgressText,
} from "./conversation-tools";

const terminalStatuses = new Set(["complete", "interrupted", "error"]);
const errorFallback = /^Error:\s*/i;
const lifecycleText = {
  waiting_model: "正在等待回复",
};

function safeNotice(value) {
  const text = String(value || "")
    .split(/\r?\n/)[0]
    .trim()
    .replace(
      /((?:password|token|api[_-]?key|secret)\s*[=:]\s*)\S+/gi,
      "$1[已隐藏]",
    );
  return text.startsWith("{") || text.startsWith("[") ? "" : text.slice(0, 200);
}

function appendNotice(assistant, ...values) {
  const messages = (assistant.error || "").split("；").filter(Boolean);
  for (const value of values) {
    const text = safeNotice(value);
    if (text && !messages.includes(text)) messages.push(text);
  }
  assistant.error = messages.join("；").slice(0, 500);
}

function subagentIdentity(event) {
  return event.subagentId || event.delegationId || event.childSessionId || null;
}

function normalizeRequestQuestions(questions) {
  return Array.isArray(questions)
    ? questions.map((item, index) => ({
        qid: String(item.qid || `q${index + 1}`),
        question: safeNotice(item.question),
        choices: Array.isArray(item.choices)
          ? item.choices.map(safeNotice).filter(Boolean)
          : [],
        multiSelect: Boolean(item.multiSelect),
      }))
    : [];
}

function acceptedAnswers(request, value) {
  const submitted = value && typeof value === "object" ? value.answers : null;
  if (!submitted || typeof submitted !== "object") return null;
  const answers = {};
  for (const question of request.questions) {
    if (!Object.prototype.hasOwnProperty.call(submitted, question.qid))
      continue;
    const answer = submitted[question.qid];
    if (question.multiSelect)
      answers[question.qid] = Array.isArray(answer)
        ? answer
            .filter((item) => typeof item === "string")
            .map(safeNotice)
            .filter(Boolean)
        : [];
    else
      answers[question.qid] =
        typeof answer === "string" ? safeNotice(answer) : "";
  }
  return answers;
}

function addToActivityGroup(turn, activity, seq) {
  let group = turn.groups.find((item) => item.id === turn.activeGroupId);
  if (!group) {
    group = {
      id: `group_${turn.id}_${turn.groups.length + 1}`,
      startedSeq: seq,
      activityIds: [],
    };
    turn.groups.push(group);
    turn.activeGroupId = group.id;
  }
  if (!group.activityIds.includes(activity.id))
    group.activityIds.push(activity.id);
  activity.groupId = group.id;
}

function closeReasoningSegment(turn) {
  if (!turn.reasoningActivityId) return;
  const activity = turn.activities.find(
    (item) => item.id === turn.reasoningActivityId,
  );
  if (activity?.status === "running") activity.status = "complete";
  turn.reasoningActivityId = null;
}

const stageFinalText = {
  model_wait: "模型等待已结束",
  compression: "上下文压缩结果未确认",
  reconnect: "服务重连结果未确认",
};

function updateStage(turn, kind, text, seq, state = "running") {
  const current = [...(turn.stages || [])]
    .reverse()
    .find((item) => item.kind === kind && item.state === "running");
  if (current) {
    current.text = text;
    current.state = state;
    return current;
  }
  const stage = { id: `stage_${turn.id}_${seq}`, kind, seq, text, state };
  turn.stages.push(stage);
  return stage;
}

function finishStage(turn, kind, text, state = "complete") {
  const current = [...(turn.stages || [])]
    .reverse()
    .find((item) => item.kind === kind && item.state === "running");
  if (!current) return;
  current.text = text;
  current.state = state;
}

function finishActiveStages(turn, confirmed = false) {
  for (const stage of turn.stages || []) {
    if (stage.state !== "running") continue;
    stage.text =
      confirmed && stage.kind !== "compression"
        ? stageFinalText[stage.kind] || "阶段已结束"
        : stageFinalText[stage.kind] || "阶段结果未确认";
    stage.state =
      confirmed && stage.kind !== "compression" ? "complete" : "unknown";
  }
}

function modelWaitKind(text) {
  if (/重连|reconnect/i.test(text)) return "reconnect";
  if (/本地模型|local.model/i.test(text)) return "model_wait";
  return /等待|waiting|no output/i.test(text) ? "model_wait" : null;
}

export function turnStatusForMessage(message) {
  if (message.status === "streaming") return "running";
  if (message.status === "stopped") return "interrupted";
  if (message.kind === "error" || message.status === "error") return "error";
  if (message.status === "waiting") return "waiting";
  return "complete";
}

export function createConversationTurn(userMessage, assistantMessage) {
  const status = turnStatusForMessage(assistantMessage);
  return {
    id: assistantMessage.turnId || `turn_${assistantMessage.id}`,
    userMessageId: userMessage?.id || null,
    assistantMessageId: assistantMessage.id,
    startedAt: userMessage?.createdAt || assistantMessage.createdAt,
    endedAt: terminalStatuses.has(status)
      ? assistantMessage.finishedAt || assistantMessage.createdAt
      : null,
    durationMs: Number.isFinite(assistantMessage.durationMs)
      ? assistantMessage.durationMs
      : null,
    status,
    lastSeq: 0,
    interims: [],
    stages: [],
    corrections: [],
    temporary: null,
    groups: [],
    activeGroupId: null,
    reasoningActivityId: null,
    reasoningCount: 0,
    activities: Array.isArray(assistantMessage.steps)
      ? assistantMessage.steps.map((step, index) => ({
          id: step.id || `legacy_${assistantMessage.id}_${index}`,
          title: step.title,
          detail: "",
          status: step.status || "unknown",
        }))
      : [],
    requests:
      status === "waiting" &&
      ["clarify", "approval"].includes(assistantMessage.kind)
        ? [
            {
              id: `legacy_request_${assistantMessage.id}`,
              kind: assistantMessage.kind,
              prompt: assistantMessage.content || "",
              status: "waiting",
              response: null,
              questions: [],
              choices: [],
              answers: {},
            },
          ]
        : [],
    results: [],
    risks: [],
  };
}

export function normalizeConversationTurns(conversation) {
  let changed = false;
  if (!Array.isArray(conversation.turns)) {
    conversation.turns = [];
    changed = true;
  }
  const byAssistantId = new Map(
    conversation.turns.map((turn) => [turn.assistantMessageId, turn]),
  );
  let latestUser = null;
  for (const message of conversation.messages || []) {
    if (message.role === "user") {
      latestUser = message;
      continue;
    }
    if (message.role !== "assistant") continue;
    if (typeof message.error !== "string") {
      message.error = "";
      changed = true;
    }
    let turn = byAssistantId.get(message.id);
    if (!turn) {
      turn = createConversationTurn(latestUser, message);
      conversation.turns.push(turn);
      byAssistantId.set(message.id, turn);
      if (turn.requests.length) message.content = "";
      changed = true;
    }
    if (message.turnId !== turn.id) {
      message.turnId = turn.id;
      changed = true;
    }
    if (latestUser && latestUser.turnId !== turn.id) {
      latestUser.turnId = turn.id;
      changed = true;
    }
  }
  if (["running", "recovering"].includes(conversation.status)) {
    conversation.status = "ready";
    changed = true;
  }
  for (const turn of conversation.turns) {
    if (!Array.isArray(turn.stages)) {
      turn.stages = [];
      changed = true;
    }
    if (!Array.isArray(turn.corrections)) {
      turn.corrections = [];
      changed = true;
    }
    if (!Array.isArray(turn.risks)) {
      turn.risks = [];
      changed = true;
    }
    if (
      !Array.isArray(turn.groups) ||
      (!turn.groups.length && turn.activities?.length)
    ) {
      turn.groups = turn.activities?.length
        ? [
            {
              id: `group_${turn.id}_legacy`,
              startedSeq: 0,
              activityIds: turn.activities.map((item) => item.id),
            },
          ]
        : [];
      if (turn.groups.length)
        turn.activities.forEach((activity) => {
          activity.groupId = turn.groups[0].id;
        });
      changed = true;
    }
    if (turn.activeGroupId === undefined) {
      turn.activeGroupId = null;
      changed = true;
    }
    if (turn.reasoningActivityId === undefined) {
      turn.reasoningActivityId = null;
      changed = true;
    }
    if (!Number.isInteger(turn.reasoningCount)) {
      turn.reasoningCount = 0;
      changed = true;
    }
    for (const request of turn.requests || []) {
      if (!Array.isArray(request.questions)) {
        request.questions = [];
        changed = true;
      }
      if (!Array.isArray(request.choices)) {
        request.choices = [];
        changed = true;
      }
      if (!request.answers || typeof request.answers !== "object") {
        request.answers = {};
        changed = true;
      }
    }
    for (const activity of turn.activities || []) {
      if (activity.kind === "tool") {
        if (!Array.isArray(activity.outputSections)) {
          activity.outputSections = [];
          changed = true;
        }
        for (const key of [
          "args",
          "result",
          "context",
          "argsText",
          "resultText",
        ]) {
          if (Object.prototype.hasOwnProperty.call(activity, key)) {
            delete activity[key];
            changed = true;
          }
        }
        for (const key of ["startedSeq", "lastProgressSeq", "endedSeq"]) {
          if (activity[key] === undefined) {
            activity[key] = null;
            changed = true;
          }
        }
      }
      if (
        activity.status !== "running" &&
        /正在/.test(activity.progressText || "")
      ) {
        activity.progressText = "";
        changed = true;
      }
      if (
        terminalStatuses.has(turn.status) &&
        ["running", "requested"].includes(activity.status)
      ) {
        activity.status = "unknown";
        activity.progressText = "";
        changed = true;
      }
    }
    if (!["running", "recovering"].includes(turn.status)) continue;
    turn.status = "unknown";
    turn.temporary = null;
    finishActiveStages(turn);
    const assistant = conversation.messages.find(
      (message) => message.id === turn.assistantMessageId,
    );
    if (assistant) assistant.status = "stopped";
    for (const activity of turn.activities)
      if (["running", "requested"].includes(activity.status)) {
        activity.status = "unknown";
        activity.progressText = "";
      }
    changed = true;
  }
  return changed;
}

export function applyConversationEvent(conversation, event) {
  if (event.sessionId !== conversation.id) return false;
  const turn = conversation.turns?.find((item) => item.id === event.turnId);
  if (!turn || !Number.isInteger(event.seq) || event.seq <= turn.lastSeq)
    return false;
  const assistant = conversation.messages.find(
    (message) => message.id === turn.assistantMessageId,
  );
  if (!assistant) return false;
  const lateToolCompletion =
    event.type === "tool.complete" &&
    turn.activities.some(
      (activity) =>
        activity.kind === "tool" &&
        activity.id === event.toolId &&
        activity.status === "unknown",
    );
  if (
    terminalStatuses.has(turn.status) &&
    event.type !== "subagent.complete" &&
    !lateToolCompletion
  )
    return false;
  if (
    ![
      "message.delta",
      "message.interim",
      "thinking.delta",
      "reasoning.delta",
      "tool.start",
      "tool.progress",
      "tool.complete",
      "tool.output_risk",
      "activity.start",
      "activity.progress",
      "activity.delta",
      "activity.complete",
      "message.complete",
      "request.open",
      "request.resolve",
      "request.answer.accepted",
      "request.expire",
      "request.late_answer",
      "result.add",
      "warning.add",
      "status.update",
      "error",
      "session.info",
      "subagent.spawn_requested",
      "subagent.start",
      "subagent.progress",
      "subagent.complete",
      "moa.progress",
      "moa.reference",
      "moa.phase",
    ].includes(event.type)
  )
    return false;
  if (
    ["request.resolve", "request.answer.accepted", "request.expire"].includes(
      event.type,
    ) &&
    !turn.requests.some(
      (item) => item.id === event.requestId && item.status === "waiting",
    )
  )
    return false;
  if (event.type === "request.resolve") {
    const request = turn.requests.find((item) => item.id === event.requestId);
    if (
      ["secret", "sudo"].includes(request.kind) &&
      !["submitted", "rejected"].includes(event.response)
    )
      return false;
  }
  if (
    event.type === "request.open" &&
    turn.requests.some((item) => item.id === event.requestId)
  )
    return false;
  if (event.type === "request.open" && !event.requestId) return false;
  if (event.type === "request.answer.accepted") {
    const request = turn.requests.find((item) => item.id === event.requestId);
    if (!request.questions.some((item) => item.qid === event.qid)) return false;
  }
  if (event.type.startsWith("subagent.") && !subagentIdentity(event))
    return false;
  turn.lastSeq = event.seq;
  switch (event.type) {
    case "message.delta":
      assistant.content += event.text || "";
      if (event.text) {
        closeReasoningSegment(turn);
        turn.activeGroupId = null;
        finishStage(turn, "model_wait", "模型等待已结束");
        finishStage(turn, "reconnect", "服务连接已恢复");
      }
      turn.temporary = null;
      break;
    case "message.interim": {
      const text = String(event.text || "").trim();
      if (text && !turn.interims.some((item) => item.text === text))
        turn.interims.push({
          id: `interim_${event.seq}`,
          seq: event.seq,
          text,
        });
      if (assistant.content.trim() === text) assistant.content = "";
      closeReasoningSegment(turn);
      turn.activeGroupId = null;
      turn.temporary = null;
      break;
    }
    case "thinking.delta": {
      const waitingText = safeNotice(event.text);
      const kind = modelWaitKind(waitingText);
      if (kind)
        updateStage(
          turn,
          kind,
          kind === "reconnect" ? "正在重新连接服务" : "正在等待模型响应",
          event.seq,
        );
      if (waitingText && !/^[.·…\s]+$/.test(waitingText))
        turn.temporary = waitingText;
      else if (!waitingText) {
        finishStage(turn, "model_wait", "模型等待已结束");
        turn.temporary = null;
      }
      break;
    }
    case "reasoning.delta": {
      if (event.visible === false || !event.text) break;
      let activity = turn.activities.find(
        (item) => item.id === turn.reasoningActivityId,
      );
      if (!activity) {
        turn.reasoningCount++;
        activity = {
          id: `reasoning_${turn.id}_${turn.reasoningCount}`,
          kind: "reasoning",
          title: "思考",
          name: "",
          argumentSummary: "",
          progressText: "",
          detail: "",
          inputDetail: "",
          outputDetail: "",
          status: "running",
        };
        turn.activities.push(activity);
        addToActivityGroup(turn, activity, event.seq);
        turn.reasoningActivityId = activity.id;
      }
      activity.detail += event.text;
      turn.temporary = null;
      break;
    }
    case "status.update":
      if (event.kind === "compacting") {
        updateStage(turn, "compression", "正在压缩上下文", event.seq);
        turn.temporary = "正在整理较早对话";
      } else if (event.kind === "compacted") {
        finishStage(turn, "compression", "上下文压缩完成");
        turn.temporary = null;
      } else if (event.kind === "lifecycle") {
        if (event.phase === "reconnecting")
          updateStage(turn, "reconnect", "正在重新连接服务", event.seq);
        else if (event.phase === "reconnected")
          finishStage(turn, "reconnect", "服务连接已恢复");
        turn.temporary = lifecycleText[event.phase] || turn.temporary;
      } else if (event.kind === "warn") {
        const notice = safeNotice(event.text);
        if (notice) appendNotice(assistant, notice);
      }
      break;
    case "error":
      appendNotice(assistant, event.message);
      if (event.terminal) {
        turn.status = "recovering";
        turn.temporary = "正在核对回合状态";
        conversation.status = "recovering";
      }
      break;
    case "session.info":
      if (
        event.running === false &&
        ["running", "recovering"].includes(turn.status)
      ) {
        turn.status = "unknown";
        turn.temporary = null;
        finishActiveStages(turn);
        assistant.status = "stopped";
        conversation.status = "ready";
        turn.activeGroupId = null;
        closeReasoningSegment(turn);
        for (const activity of turn.activities)
          if (["running", "requested"].includes(activity.status)) {
            activity.status = "unknown";
            activity.progressText = "";
          }
      } else if (event.running === true && turn.status === "recovering") {
        turn.status = "running";
        turn.temporary = null;
        finishStage(turn, "reconnect", "服务连接已恢复");
        conversation.status = "running";
      }
      break;
    case "subagent.spawn_requested":
    case "subagent.start": {
      const id = `subagent_${subagentIdentity(event)}`;
      let activity = turn.activities.find((item) => item.id === id);
      if (!activity) {
        activity = {
          id,
          kind: "subagent",
          title: "子代理",
          argumentSummary: safeNotice(event.goal),
          progressText: "",
          detail: "",
          inputDetail: "",
          outputDetail: "",
          childSessionId: event.childSessionId || null,
          status: event.type === "subagent.start" ? "running" : "requested",
        };
        turn.activities.push(activity);
        addToActivityGroup(turn, activity, event.seq);
      } else if (event.type === "subagent.start") {
        activity.status = "running";
        if (event.childSessionId)
          activity.childSessionId = event.childSessionId;
      }
      turn.temporary = null;
      break;
    }
    case "subagent.progress": {
      const activity = turn.activities.find(
        (item) => item.id === `subagent_${subagentIdentity(event)}`,
      );
      if (activity && activity.status === "running")
        activity.progressText = safeNotice(event.text || event.toolPreview);
      break;
    }
    case "subagent.complete": {
      const activity = turn.activities.find(
        (item) => item.id === `subagent_${subagentIdentity(event)}`,
      );
      if (activity) {
        activity.status =
          event.status === "completed"
            ? "complete"
            : event.status === "failed"
              ? "error"
              : event.status === "interrupted"
                ? "interrupted"
                : "unknown";
        activity.progressText = "";
        if (event.summary) activity.outputDetail = safeNotice(event.summary);
      }
      break;
    }
    case "moa.progress":
    case "moa.reference":
    case "moa.phase": {
      const id = `moa_${turn.id}`;
      let activity = turn.activities.find((item) => item.id === id);
      if (!activity) {
        activity = {
          id,
          kind: "moa",
          title: "并行模型",
          argumentSummary: "",
          progressText: "",
          detail: "",
          inputDetail: "",
          outputDetail: "",
          references: [],
          status: "running",
        };
        turn.activities.push(activity);
        addToActivityGroup(turn, activity, event.seq);
      }
      if (
        event.type === "moa.progress" &&
        Number.isInteger(event.refsDone) &&
        Number.isInteger(event.refsTotal) &&
        event.refsTotal > 0
      )
        activity.progressText = `已完成 ${event.refsDone}/${event.refsTotal} 个参考模型`;
      if (event.type === "moa.reference") {
        const refId = Number.isInteger(event.index)
          ? `index_${event.index}`
          : event.label
            ? `label_${event.label}`
            : null;
        if (refId && !activity.references.some((item) => item.id === refId)) {
          activity.references.push({
            id: refId,
            label: safeNotice(event.label) || "参考意见",
            text: String(event.text || "").slice(0, 4000),
          });
          activity.outputDetail = activity.references
            .map((item) => `${item.label}：${item.text}`)
            .join("\n\n");
        }
      }
      if (event.type === "moa.phase" && event.phase === "aggregator")
        activity.progressText = "正在汇总";
      turn.temporary = null;
      break;
    }
    case "activity.start":
    case "tool.start": {
      const activityId = event.activityId || event.toolId;
      if (event.type === "tool.start" && event.name === "clarify") break;
      if (
        event.type === "tool.start" &&
        event.name === "delegate_task" &&
        event.hasSubagentEvents
      )
        break;
      const isTool = event.type === "tool.start";
      if (
        activityId &&
        !turn.activities.some((item) => item.id === activityId)
      ) {
        const activity = {
          id: activityId,
          kind: event.kind || (isTool ? "tool" : "activity"),
          name: isTool ? event.name || "" : "",
          title: event.title || (isTool ? toolAction(event.name) : "活动"),
          detail: event.detail || "",
          argumentSummary: isTool
            ? toolArgumentSummary(event.name, event.args)
            : "",
          progressText: "",
          inputDetail: isTool ? toolInputText(event.name, event.args) : "",
          outputDetail: "",
          outputSections: [],
          outputKind: "text",
          status: "running",
          ...(isTool
            ? { startedSeq: event.seq, lastProgressSeq: null, endedSeq: null }
            : {}),
        };
        turn.activities.push(activity);
        addToActivityGroup(turn, activity, event.seq);
      }
      turn.temporary = null;
      finishStage(turn, "model_wait", "模型等待已结束");
      break;
    }
    case "activity.progress":
    case "tool.progress": {
      const activityId = event.activityId || event.toolId;
      const activity = turn.activities.find((item) => item.id === activityId);
      if (activity && activity.status === "running") {
        if (event.type === "tool.progress") {
          const progress = toolProgressText(event);
          if (progress) {
            activity.progressText = progress;
            activity.lastProgressSeq = event.seq;
          }
        }
        if (event.detail) activity.detail = event.detail;
      }
      turn.temporary = null;
      break;
    }
    case "activity.delta": {
      const activity = turn.activities.find(
        (item) => item.id === event.activityId,
      );
      if (activity && activity.status === "running")
        activity.detail += event.text || "";
      turn.temporary = null;
      break;
    }
    case "activity.complete":
    case "tool.complete": {
      const activityId = event.activityId || event.toolId;
      let activity = turn.activities.find((item) => item.id === activityId);
      if (!activity && activityId) {
        activity = {
          id: activityId,
          kind: event.kind || "tool",
          name: event.name || "",
          title: event.title || toolAction(event.name),
          detail: "",
          argumentSummary: toolArgumentSummary(event.name, event.args),
          progressText: "",
          inputDetail: toolInputText(event.name, event.args),
          outputDetail: "",
          outputSections: [],
          outputKind: "text",
          status: "unknown",
          startedSeq: null,
          lastProgressSeq: null,
          endedSeq: event.seq,
        };
        turn.activities.push(activity);
        addToActivityGroup(turn, activity, event.seq);
      }
      if (activity) {
        activity.status =
          event.type === "tool.complete"
            ? toolOutcome({ ...event, name: event.name || activity.name })
            : event.error
              ? "error"
              : "complete";
        activity.detail = event.detail || activity.detail;
        if (
          event.type === "activity.complete" &&
          /正在/.test(activity.progressText || "")
        )
          activity.progressText = "";
        if (event.type === "tool.complete") {
          activity.endedSeq = event.seq;
          if (
            activity.status !== "complete" ||
            !/已完成|全部完成/.test(activity.progressText || "")
          )
            activity.progressText = "";
          activity.outputSections = toolOutputSections(
            event.name || activity.name,
            event.result,
            event.inlineDiff,
            activity.status,
          );
          activity.outputDetail = "";
          activity.outputKind =
            typeof event.inlineDiff === "string" && event.inlineDiff.trim()
              ? "diff"
              : "text";
          if (
            event.error &&
            !activity.outputDetail &&
            !activity.outputSections.length
          )
            activity.outputDetail =
              typeof event.error === "string"
                ? safeNotice(event.error)
                : "执行失败";
        }
      }
      break;
    }
    case "tool.output_risk": {
      const level = String(event.risk || "").toLowerCase();
      if (level === "low" || (!level && !event.userVisible)) break;
      const activity = turn.activities.find((item) => item.id === event.toolId);
      const findings = Array.isArray(event.findings)
        ? event.findings.map(safeNotice).filter(Boolean).slice(0, 2)
        : [];
      const detail = findings.join("；") || safeNotice(event.text);
      const risk = {
        id: event.toolId
          ? `tool_risk_${event.toolId}`
          : `tool_risk_${event.seq}`,
        toolId: event.toolId || null,
        source: activity?.title || toolAction(event.name),
        level: ["medium", "high", "critical"].includes(level)
          ? level
          : "warning",
        text:
          detail ||
          (event.redacted
            ? "部分输出已隐藏，请核对后使用。"
            : "工具输出需要核对后使用。"),
      };
      const prior = turn.risks.findIndex((item) => item.id === risk.id);
      if (prior >= 0) turn.risks.splice(prior, 1, risk);
      else turn.risks.push(risk);
      break;
    }
    case "message.complete": {
      const status = terminalStatuses.has(event.status)
        ? event.status
        : "complete";
      const finalText = typeof event.text === "string" ? event.text.trim() : "";
      if (status === "error" && errorFallback.test(finalText)) {
        if (errorFallback.test(assistant.content.trim()))
          assistant.content = "";
        if (!event.error) appendNotice(assistant, finalText);
      } else if (finalText) {
        assistant.content = event.text;
      }
      turn.interims = turn.interims.filter(
        (item) =>
          item.text !== assistant.content.trim() &&
          !assistant.content.trim().startsWith(item.text),
      );
      assistant.status =
        status === "complete"
          ? "done"
          : status === "interrupted"
            ? "stopped"
            : "error";
      appendNotice(
        assistant,
        event.error,
        event.errorSurface?.message || event.errorSurface?.description,
        typeof event.failureReason === "string"
          ? event.failureReason
          : event.failureReason?.message,
        event.billing?.blocked ? "当前额度不足，演示操作无法继续" : "",
        event.warning,
      );
      turn.status = status;
      finishActiveStages(turn, status === "complete");
      turn.endedAt = event.at || new Date().toISOString();
      const elapsed =
        new Date(turn.endedAt).getTime() - new Date(turn.startedAt).getTime();
      turn.durationMs =
        Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null;
      turn.temporary = null;
      turn.activeGroupId = null;
      closeReasoningSegment(turn);
      for (const activity of turn.activities)
        if (["running", "requested"].includes(activity.status)) {
          activity.status = "unknown";
          activity.progressText = "";
        }
      conversation.status = "ready";
      break;
    }
    case "request.open":
      if (
        event.requestId &&
        !turn.requests.some((item) => item.id === event.requestId)
      )
        turn.requests.push({
          id: event.requestId,
          kind: event.kind || "clarify",
          prompt:
            safeNotice(event.prompt) ||
            (["secret", "sudo"].includes(event.kind) ? "请确认凭据操作" : ""),
          questions: normalizeRequestQuestions(event.questions),
          multiSelect: Boolean(event.multiSelect),
          choices: Array.isArray(event.choices)
            ? event.choices.map((choice) => ({
                value: String(choice.value || choice),
                label: safeNotice(choice.label || choice),
              }))
            : [],
          failAfterApproval: Boolean(event.failAfterApproval),
          actionTitle: safeNotice(event.actionTitle),
          actionDetail: safeNotice(event.actionDetail),
          safeCommand: safeNotice(event.safeCommand),
          openedSeq: event.seq,
          status: "waiting",
          response: null,
          answers: {},
        });
      if (event.answers && typeof event.answers === "object") {
        const request = turn.requests.find(
          (item) => item.id === event.requestId,
        );
        request.answers =
          acceptedAnswers(request, { answers: event.answers }) || {};
      }
      turn.status = "waiting";
      finishStage(turn, "model_wait", "模型等待已结束");
      turn.activeGroupId = null;
      closeReasoningSegment(turn);
      assistant.status = "waiting";
      conversation.status = "ready";
      break;
    case "request.resolve": {
      const request = turn.requests.find((item) => item.id === event.requestId);
      if (request && request.status === "waiting") {
        request.status = "resolved";
        request.skipped = Boolean(event.skipped) && request.kind === "clarify";
        if (["secret", "sudo"].includes(request.kind))
          request.response =
            event.response === "submitted"
              ? "已模拟安全提交（未输入真实值）"
              : "未提供";
        else if (request.questions?.length) {
          request.answers = {
            ...request.answers,
            ...(acceptedAnswers(request, event.response) || {}),
          };
          request.response = Object.values(request.answers)
            .flat()
            .filter(Boolean)
            .join("；");
        } else request.response = safeNotice(event.response);
        if (
          ["rejected", "deny"].includes(event.response) &&
          request.kind !== "approval"
        ) {
          turn.status = "interrupted";
          assistant.status = "stopped";
          turn.endedAt = event.at || new Date().toISOString();
          const elapsed =
            new Date(turn.endedAt).getTime() -
            new Date(turn.startedAt).getTime();
          turn.durationMs =
            Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null;
        } else {
          turn.status = "running";
          assistant.status = "streaming";
          conversation.status = "running";
        }
      }
      break;
    }
    case "request.answer.accepted": {
      const request = turn.requests.find((item) => item.id === event.requestId);
      const answers = acceptedAnswers(request, {
        answers: { [event.qid]: event.answer },
      });
      if (answers && Object.prototype.hasOwnProperty.call(answers, event.qid))
        request.answers = {
          ...request.answers,
          [event.qid]: answers[event.qid],
        };
      break;
    }
    case "request.expire": {
      const request = turn.requests.find((item) => item.id === event.requestId);
      request.status = "expired";
      request.expiredAt = event.at || new Date().toISOString();
      if (!turn.requests.some((item) => item.status === "waiting")) {
        turn.status = event.autoContinue ? "running" : "unknown";
        assistant.status = event.autoContinue ? "streaming" : "stopped";
        conversation.status = event.autoContinue ? "running" : "ready";
      }
      break;
    }
    case "request.late_answer": {
      const request = turn.requests.find((item) => item.id === event.requestId);
      if (!request || request.status !== "expired" || request.lateAnswer) break;
      const text = safeNotice(event.text);
      if (!text) break;
      request.lateAnswer = text;
      request.lateAnswerMode = event.mode || "current";
      if (request.lateAnswerMode === "current")
        turn.corrections.push({
          id: `correction_${event.seq}`,
          requestId: request.id,
          seq: event.seq,
          text,
        });
      break;
    }
    case "result.add":
      if (
        event.resultId &&
        !turn.results.some((item) => item.id === event.resultId)
      ) {
        if (
          event.kind === "todo" &&
          Array.isArray(event.items) &&
          event.items.length
        )
          turn.results.push({
            id: event.resultId,
            kind: "todo",
            label: safeNotice(event.label) || "本轮清单",
            items: event.items.map((item) => ({
              id: String(item.id),
              content: safeNotice(item.content),
              status: [
                "pending",
                "in_progress",
                "completed",
                "cancelled",
              ].includes(item.status)
                ? item.status
                : "pending",
            })),
          });
        else if (event.fileId) {
          const operation =
            event.operation === "modified" ? "modified" : "created";
          const existing = turn.results.find(
            (item) => item.kind === "file" && item.fileId === event.fileId,
          );
          const hasSnapshot = typeof event.snapshotContent === "string";
          const diff =
            typeof event.roundDiff === "string"
              ? toolOutputSections("patch", null, event.roundDiff)[0]?.text ||
                ""
              : "";
          if (existing) {
            existing.operation =
              existing.operation === "created" && operation === "modified"
                ? "created_modified"
                : existing.operation;
            if (hasSnapshot) existing.snapshotContent = event.snapshotContent;
            if (diff) existing.roundDiff = diff;
            if (event.versionId) existing.versionId = String(event.versionId);
            if (event.name) existing.name = safeNotice(event.name);
            if (event.path) existing.path = safeNotice(event.path);
            if (event.changeSummary)
              existing.changeSummary = safeNotice(event.changeSummary);
            if (event.sourceToolId) existing.sourceToolId = event.sourceToolId;
          } else
            turn.results.push({
              id: event.resultId,
              kind: "file",
              label: safeNotice(event.label) || "本轮文件",
              fileId: event.fileId,
              name: safeNotice(event.name),
              path: safeNotice(event.path),
              operation,
              ...(hasSnapshot
                ? { snapshotContent: event.snapshotContent }
                : {}),
              ...(event.versionId
                ? { versionId: String(event.versionId) }
                : {}),
              ...(diff ? { roundDiff: diff } : {}),
              changeSummary: safeNotice(event.changeSummary),
              sourceToolId: event.sourceToolId || null,
            });
        }
      }
      break;
    case "warning.add":
      appendNotice(assistant, event.text);
      break;
    default:
      return false;
  }
  return true;
}

export function formatTurnDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "";
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} 分 ${seconds % 60} 秒` : `${seconds} 秒`;
}

export function conversationProcessBlocks(turn) {
  if (!turn) return [];
  const activities = new Map(
    (turn.activities || []).map((activity) => [activity.id, activity]),
  );
  const requests = turn.requests || [];
  const hasUnsequencedRequest = requests.some(
    (request) => !Number.isInteger(request.openedSeq),
  );
  const blocks = [
    ...(turn.groups || [])
      .map((group) => ({
        type: "group",
        id: group.id,
        seq: group.startedSeq,
        activities: group.activityIds
          .map((id) => activities.get(id))
          .filter(Boolean),
      }))
      .filter((group) => group.activities.length),
    ...(turn.interims || []).map((interim) => ({
      type: "interim",
      id: interim.id,
      seq: interim.seq ?? Number.MAX_SAFE_INTEGER,
      text: interim.text,
    })),
    ...(turn.stages || [])
      // Older demo tasks may still contain the retired routine context stage.
      .filter((stage) => stage.kind !== "context")
      .map((stage) => ({
        type: "stage",
        id: stage.id,
        seq: stage.seq,
        text: stage.text,
        state: stage.state,
      })),
    ...(turn.corrections || []).map((correction) => ({
      type: "correction",
      id: correction.id,
      seq: correction.seq,
      text: correction.text,
      requestId: correction.requestId,
    })),
    ...requests.map((request, index) => ({
      type: request.status === "waiting" ? "requestBoundary" : "request",
      id: request.id,
      seq:
        request.openedSeq ?? Number.MAX_SAFE_INTEGER - requests.length + index,
      request,
    })),
  ].sort((a, b) => a.seq - b.seq);
  const visible = [];
  let canJoinPreviousGroup = !hasUnsequencedRequest;
  for (const block of blocks) {
    if (block.type === "requestBoundary") {
      canJoinPreviousGroup = false;
      continue;
    }
    const previous = visible[visible.length - 1];
    if (
      block.type === "group" &&
      previous?.type === "group" &&
      canJoinPreviousGroup
    )
      previous.activities.push(...block.activities);
    else visible.push(block);
    canJoinPreviousGroup = block.type === "group" && !hasUnsequencedRequest;
  }
  return visible;
}
