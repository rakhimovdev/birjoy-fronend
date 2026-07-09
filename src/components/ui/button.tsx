import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl text-center text-sm font-semibold leading-tight tracking-[-0.01em] ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(11,72,214,0.24)] hover:-translate-y-px hover:bg-primary/92",
        destructive:
          "border border-transparent bg-destructive text-destructive-foreground shadow-[0_12px_28px_rgba(220,38,38,0.2)] hover:-translate-y-px hover:bg-destructive/92",
        outline:
          "border border-border/70 bg-card/78 text-foreground shadow-[0_8px_20px_rgba(7,28,85,0.06)] backdrop-blur-sm hover:border-primary/20 hover:bg-primary/5 hover:text-primary",
        secondary: "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "text-foreground/80 hover:bg-accent/12 hover:text-foreground",
        link: "rounded-none px-0 py-0 text-primary shadow-none hover:text-primary/80 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-10 rounded-2xl px-3.5 py-2",
        lg: "min-h-12 rounded-2xl px-6 py-3 text-base sm:px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
