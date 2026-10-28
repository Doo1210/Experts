export const EVENT_SOURCE_TYPES = [
  "Timer",
  "WebHook",
  "Kafka",
  "MQTT",
  "Pulsar",
];

export function filterEventTasks(
  events,
  { keyword = "", sourceType = "" } = {},
) {
  const name = String(keyword).trim().toLowerCase();
  return (events || []).filter(
    (event) =>
      (!sourceType || event.trigger === sourceType) &&
      (!name ||
        `${event.displayName || ""} ${event.name || ""}`
          .toLowerCase()
          .includes(name)),
  );
}
