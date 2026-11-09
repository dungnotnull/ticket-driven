import { avatarHue, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const AVATAR_SIZES = {
  xs: 20,
  sm: 24,
  md: 28,
  lg: 32,
} as const;

type AvatarSize = keyof typeof AVATAR_SIZES;

type AvatarProps = {
  name: string;
  email?: string;
  size?: AvatarSize;
  className?: string;
};

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <div
      title={name}
      style={{
        width: AVATAR_SIZES[size],
        height: AVATAR_SIZES[size],
        backgroundColor: `hsl(${avatarHue(name)}, 45%, 40%)`,
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white ring-1 ring-inset ring-border",
        size === "xs" ? "text-[8px]" : "text-[10px]",
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
