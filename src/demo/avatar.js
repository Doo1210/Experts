import { publicAsset } from "./public-asset";

export const DEFAULT_AVATAR = "/experts/avatars/general-man.svg";

export function avatarSrcFor(expert) {
  if (expert?.avatarUrl) return publicAsset(expert.avatarUrl);
  if (expert?.id === "exp_quality")
    return publicAsset("/experts/avatars/quality-man.svg");
  if (expert?.id === "exp_ops")
    return publicAsset("/experts/avatars/operations-woman.svg");
  return publicAsset(DEFAULT_AVATAR);
}

export function avatarSrcForSource(source, experts = []) {
  if (source?.avatarUrl) return publicAsset(source.avatarUrl);
  const expert =
    source?.snapshot ||
    experts.find((item) => item.id === source?.sourceExpertId);
  return avatarSrcFor(expert || source);
}

export const expertAvatarUrl = avatarSrcFor;

export function isProjectImageIcon(icon) {
  return /^data:image\//.test(String(icon || ""));
}

export function projectIconLabel(icon) {
  return icon === "品" ? "🏭" : icon || "📁";
}
