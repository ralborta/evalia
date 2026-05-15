import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-violet-600/25",
        secondary: "border border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300",
        outline: "border border-slate-200 bg-white/90 text-slate-800 hover:bg-slate-50 hover:border-slate-300",
        ghost: "shadow-none hover:bg-slate-100/80",
        destructive: "bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20 hover:from-red-500 hover:to-rose-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
