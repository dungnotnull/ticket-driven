import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTON_BASE =
  "press inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const BUTTON_VARIANTS = {
  default:
    "bg-gradient-primary text-white shadow-[0_6px_18px_-8px_rgb(49_46_129/0.55)] hover:bg-gradient-primary-hover",
  secondary: "bg-surface-2 border border-border text-foreground hover:bg-surface-2/75",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
  danger: "bg-danger/90 text-white hover:bg-danger",
  outline: "border border-border text-muted hover:text-foreground hover:border-border-strong",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  icon: "h-8 w-8 justify-center",
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;
type ButtonSize = keyof typeof BUTTON_SIZES;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  className,
  variant = "default",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
    >
      {loading ? (
        <>
          <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
