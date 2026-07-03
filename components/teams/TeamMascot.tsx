import Image from "next/image";
import { getTeamTheme, type TeamSide } from "@/utils/constants";

type TeamMascotSize = "xs" | "sm" | "md" | "lg" | "xl";

type TeamMascotProps = {
  side: TeamSide;
  size?: TeamMascotSize;
  priority?: boolean;
  className?: string;
};

const sizeClasses: Record<TeamMascotSize, string> = {
  xs: "h-6 w-6",
  sm: "h-9 w-9",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-28 w-28",
};

const imageSizes: Record<TeamMascotSize, string> = {
  xs: "24px",
  sm: "36px",
  md: "56px",
  lg: "80px",
  xl: "112px",
};

export function TeamMascot({
  side,
  size = "md",
  priority = false,
  className = "",
}: TeamMascotProps) {
  const team = getTeamTheme(side);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border bg-zinc-950 ring-2 ${sizeClasses[size]} ${team.classes.border} ${team.classes.ring} ${className}`}
      aria-label={`Mascote ${team.identity}`}
      title={team.identity}
    >
      <Image
        src={team.mascot.src}
        alt={`Mascote ${team.identity}`}
        fill
        priority={priority}
        sizes={imageSizes[size]}
        className="object-cover"
        style={{
          objectPosition: team.mascot.objectPosition,
          transform: team.mascot.transform,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
