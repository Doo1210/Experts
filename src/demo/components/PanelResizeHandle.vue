<template>
  <div
    class="pc-panel-resize"
    :class="'is-' + side"
    role="separator"
    tabindex="0"
    :aria-label="label"
    :aria-controls="controls"
    aria-orientation="vertical"
    :aria-valuemin="minWidth"
    :aria-valuemax="maxWidth"
    :aria-valuenow="width"
    @pointerdown="startResize"
    @lostpointercapture="stopResize"
    @keydown="resizeWithKeyboard"
  />
</template>

<script>
export default {
  name: "PanelResizeHandle",
  props: {
    label: { type: String, required: true },
    controls: { type: String, required: true },
    width: { type: Number, required: true },
    minWidth: { type: Number, required: true },
    maxWidth: { type: Number, required: true },
    side: {
      type: String,
      default: "left",
      validator: (value) => ["left", "right"].includes(value),
    },
  },
  beforeDestroy() {
    this.stopResize();
  },
  methods: {
    startResize(event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault();
      this.stopResize();
      this._dragStart = {
        x: event.clientX,
        width: this.width,
        pointerId: event.pointerId,
      };
      this._dragElement = event.currentTarget;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      document.addEventListener("pointermove", this.moveResize);
      document.addEventListener("pointerup", this.stopResize);
      document.addEventListener("pointercancel", this.stopResize);
      document.body.classList.add("pc-panel-resizing");
    },
    moveResize(event) {
      const start = this._dragStart;
      if (!start || event.pointerId !== start.pointerId) return;
      const direction = this.side === "right" ? 1 : -1;
      this.$emit("resize", start.width + (event.clientX - start.x) * direction);
    },
    stopResize(event) {
      if (
        event &&
        this._dragStart &&
        event.pointerId !== this._dragStart.pointerId
      )
        return;
      const wasDragging = Boolean(this._dragStart);
      const pointerId = this._dragStart?.pointerId;
      this._dragStart = null;
      if (this._dragElement?.hasPointerCapture?.(pointerId))
        this._dragElement.releasePointerCapture(pointerId);
      this._dragElement = null;
      document.removeEventListener("pointermove", this.moveResize);
      document.removeEventListener("pointerup", this.stopResize);
      document.removeEventListener("pointercancel", this.stopResize);
      if (wasDragging) document.body.classList.remove("pc-panel-resizing");
    },
    resizeWithKeyboard(event) {
      const direction = this.side === "right" ? 1 : -1;
      let width;
      if (event.key === "ArrowRight") width = this.width + 20 * direction;
      else if (event.key === "ArrowLeft") width = this.width - 20 * direction;
      else if (event.key === "Home") width = this.minWidth;
      else if (event.key === "End") width = this.maxWidth;
      else return;
      event.preventDefault();
      this.$emit("resize", width);
    },
  },
};
</script>
