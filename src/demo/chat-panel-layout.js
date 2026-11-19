import {
  TASK_PANEL_WIDTH,
  WORKSPACE_PANEL_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  READER_MIN_WIDTH,
  READER_DEFAULT_WIDTH,
} from "./file-reader";

export const CONVERSATION_MIN_WIDTH = 320;
const PANELS = ["task", "reader", "workspace"];
const MIN = {
  task: SIDEBAR_MIN_WIDTH,
  reader: READER_MIN_WIDTH,
  workspace: SIDEBAR_MIN_WIDTH,
};
const MAX = {
  task: SIDEBAR_MAX_WIDTH,
  reader: Infinity,
  workspace: SIDEBAR_MAX_WIDTH,
};

const widthKey = (panel) => `${panel}Width`;
const visibleKey = (panel) => `${panel}Visible`;
const sumWidths = (layout, panels = PANELS) =>
  panels.reduce(
    (sum, panel) =>
      sum + (layout[visibleKey(panel)] ? layout[widthKey(panel)] : 0),
    0,
  );

export function minimumPanelCanvasWidth(layout) {
  return (
    CONVERSATION_MIN_WIDTH +
    PANELS.reduce(
      (sum, panel) => sum + (layout[visibleKey(panel)] ? MIN[panel] : 0),
      0,
    )
  );
}

export function panelWidthLimits(layout) {
  const limits = {};
  for (const panel of PANELS) {
    const capacity = Math.floor(
      layout.containerWidth -
        CONVERSATION_MIN_WIDTH -
        sumWidths(
          layout,
          PANELS.filter((other) => other !== panel),
        ),
    );
    limits[panel] = { min: MIN[panel], max: Math.min(MAX[panel], capacity) };
  }
  limits.conversation = {
    min: CONVERSATION_MIN_WIDTH,
    max:
      layout.containerWidth -
      minimumPanelCanvasWidth(layout) +
      CONVERSATION_MIN_WIDTH,
  };
  return limits;
}

export function resizePanelLayout(layout, panel, requestedWidth) {
  if (!PANELS.includes(panel) || !Number.isFinite(requestedWidth)) return null;
  const max = layout[visibleKey(panel)]
    ? panelWidthLimits(layout)[panel].max
    : MAX[panel];
  if (max < MIN[panel]) return null;
  return {
    ...layout,
    [widthKey(panel)]: Math.min(
      max,
      Math.max(MIN[panel], Math.round(requestedWidth)),
    ),
  };
}

export function planPanelVisibility(layout, visibility, preferredWidths = {}) {
  const next = { ...layout, ...visibility };
  const opening = PANELS.filter(
    (panel) => next[visibleKey(panel)] && !layout[visibleKey(panel)],
  );
  let available =
    next.containerWidth -
    CONVERSATION_MIN_WIDTH -
    sumWidths(
      next,
      PANELS.filter((panel) => !opening.includes(panel)),
    );
  const minimum = opening.reduce((sum, panel) => sum + MIN[panel], 0);
  if (available < minimum) return null;
  for (let index = 0; index < opening.length; index++) {
    const panel = opening[index];
    const reserved = opening
      .slice(index + 1)
      .reduce((sum, other) => sum + MIN[other], 0);
    const preferred = preferredWidths[widthKey(panel)] ?? next[widthKey(panel)];
    next[widthKey(panel)] = Math.min(
      MAX[panel],
      available - reserved,
      Math.max(MIN[panel], Math.round(preferred)),
    );
    available -= next[widthKey(panel)];
  }
  return next;
}

// Only host/window size changes use this recovery path. User drags and opening
// panels must be planned first and never take width from another visible panel.
export function fitPanelLayout(layout) {
  const next = { ...layout };
  const canvasWidth = Math.max(
    next.containerWidth,
    minimumPanelCanvasWidth(next),
  );
  let excess = sumWidths(next) + CONVERSATION_MIN_WIDTH - canvasWidth;
  for (const panel of ["reader", "task", "workspace"]) {
    if (!next[visibleKey(panel)] || excess <= 0) continue;
    const reduction = Math.min(excess, next[widthKey(panel)] - MIN[panel]);
    next[widthKey(panel)] -= reduction;
    excess -= reduction;
  }
  return next;
}

export function chatPanelLayout(vm) {
  return {
    containerWidth:
      vm.$refs?.chatBody?.clientWidth || vm.panelContainerWidth || Infinity,
    taskVisible: !vm.taskListCollapsed,
    workspaceVisible: Boolean(vm.workspaceOpen),
    readerVisible: Boolean(vm.reader?.tabs.length),
    taskWidth: vm.taskPanelWidth ?? TASK_PANEL_WIDTH,
    workspaceWidth: vm.workspacePanelWidth ?? WORKSPACE_PANEL_WIDTH,
    readerWidth: vm.reader?.width ?? READER_DEFAULT_WIDTH,
  };
}

export function applyChatPanelLayout(vm, layout) {
  vm.taskPanelWidth = layout.taskWidth;
  vm.workspacePanelWidth = layout.workspaceWidth;
  if (vm.reader) vm.reader.width = layout.readerWidth;
  vm.taskListCollapsed = !layout.taskVisible;
  vm.workspaceOpen = layout.workspaceVisible;
  if (Number.isFinite(layout.containerWidth))
    vm.panelContainerWidth = layout.containerWidth;
  const limits = panelWidthLimits(layout);
  vm.taskMaxWidth = Math.max(MIN.task, limits.task.max);
  vm.workspaceMaxWidth = Math.max(MIN.workspace, limits.workspace.max);
  vm.readerMaxWidth = Math.max(MIN.reader, limits.reader.max);
  vm.conversationMaxWidth = limits.conversation.max;
}

export function requestPanelVisibility(vm, visibility, preferredWidths = {}) {
  const plan = planPanelVisibility(
    chatPanelLayout(vm),
    visibility,
    preferredWidths,
  );
  if (!plan) {
    vm.$message?.info?.("空间不足，请先收窄或收起其他区域");
    return false;
  }
  applyChatPanelLayout(vm, plan);
  return true;
}
