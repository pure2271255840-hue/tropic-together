import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(242,99,76,0.22)] hover:bg-primary/90 hover:shadow-[0_14px_30px_rgba(242,99,76,0.26)]",
  secondary:
    "border border-primary/12 bg-secondary text-secondary-foreground hover:bg-secondary/75",
  outline:
    "border border-border bg-white text-foreground hover:border-primary/25 hover:bg-secondary/45 hover:text-primary",
  ghost: "text-foreground hover:bg-secondary/60 hover:text-primary",
  quiet:
    "border border-teal/15 bg-accent text-accent-foreground hover:bg-accent/80"
};

const sizes = {
  default: "h-11 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-sm",
  icon: "h-11 w-11"
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, variants as buttonVariants };
