const HOVER_DELAY_MS = 320;

export function installHoverFeedback() {
  let activeElement = null;
  let activeTitle = "";
  let previousDescription = null;
  let showTimer = null;
  let tooltip = null;

  function getTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.id = "demo-hover-tooltip";
    tooltip.className = "demo-hover-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function hide() {
    if (showTimer !== null) window.clearTimeout(showTimer);
    showTimer = null;
    if (activeElement) {
      if (!activeElement.hasAttribute("title"))
        activeElement.setAttribute("title", activeTitle);
      if (previousDescription === null)
        activeElement.removeAttribute("aria-describedby");
      else activeElement.setAttribute("aria-describedby", previousDescription);
    }
    activeElement = null;
    activeTitle = "";
    previousDescription = null;
    if (tooltip) tooltip.hidden = true;
  }

  function position(element) {
    const popup = getTooltip();
    const rect = element.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(
      margin,
      Math.min(
        window.innerWidth - popup.offsetWidth - margin,
        rect.left + (rect.width - popup.offsetWidth) / 2,
      ),
    );
    const below = rect.bottom + margin;
    const top =
      below + popup.offsetHeight <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - popup.offsetHeight - margin);
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function showFor(element) {
    if (element === activeElement) return;
    hide();
    const title = element.getAttribute("title")?.trim();
    if (!title) return;
    const popup = getTooltip();
    activeElement = element;
    activeTitle = title;
    previousDescription = element.getAttribute("aria-describedby");
    element.removeAttribute("title");
    element.setAttribute(
      "aria-describedby",
      [previousDescription, popup.id].filter(Boolean).join(" "),
    );
    popup.textContent = title;
    popup.hidden = false;
    popup.style.visibility = "hidden";
    position(element);
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (activeElement !== element) return;
      if (!element.isConnected) return hide();
      position(element);
      popup.style.visibility = "visible";
    }, HOVER_DELAY_MS);
  }

  function titledElement(target) {
    if (!(target instanceof Element) || !target.closest(".demo-app"))
      return null;
    return target.closest("[title]");
  }

  function isInside(element, target) {
    return target instanceof Node && element.contains(target);
  }

  document.addEventListener("pointerover", (event) => {
    if (activeElement && isInside(activeElement, event.target)) return;
    const element = titledElement(event.target);
    if (element) showFor(element);
    else hide();
  });
  document.addEventListener("pointerout", (event) => {
    if (
      activeElement &&
      isInside(activeElement, event.target) &&
      !isInside(activeElement, event.relatedTarget)
    )
      hide();
  });
  document.addEventListener("focusin", (event) => {
    const element = titledElement(event.target);
    if (element) showFor(element);
  });
  document.addEventListener("focusout", (event) => {
    if (
      activeElement &&
      isInside(activeElement, event.target) &&
      !isInside(activeElement, event.relatedTarget)
    )
      hide();
  });
  document.addEventListener("pointerdown", hide);
  document.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  window.addEventListener("blur", hide);
}
