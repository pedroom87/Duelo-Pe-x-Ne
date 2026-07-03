import { getTeamTheme, type TeamSide } from "@/utils/constants";
import { TeamMascot } from "./TeamMascot";

type TeamBadgeVariant = "soft" | "solid" | "outline";
type TeamBadgeSize = "sm" | "md";

type TeamBadgeProps = {
  side: TeamSide;
  label?: string;
  variant?: TeamBadgeVariant;
  size?: TeamBadgeSize;
  withMascot?: boolean;
  className?: string;
};

const sizeClasses: Record<TeamBadgeSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function TeamBadge({
  side,
  label,
  variant = "soft",
  size = "sm",
  withMascot = false,
  className = "",
}: TeamBadgeProps) {
  const team = getTeamTheme(side);

  const variantClass =
    variant === "solid"
      ? `border-transparent ${team.classes.solid}`
      : variant === "outline"
        ? `bg-zinc-950/70 ${team.classes.border} ${team.classes.text}`
        : `${team.classes.border} ${team.classes.panel} ${team.classes.text}`;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-bold ${sizeClasses[size]} ${variantClass} ${className}`}
    >
      {withMascot ? <TeamMascot side={side} size="xs" /> : null}
      <span>{label ?? team.short}</span>
    </span>
  );
}
