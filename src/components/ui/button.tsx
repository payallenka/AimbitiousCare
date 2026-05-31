import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-white hover:text-black border-2 border-black shadow-md hover:shadow-lg",
        destructive:
          "bg-black text-white hover:bg-white hover:text-black border-2 border-black shadow-md hover:shadow-lg",
        outline:
          "border-2 border-black bg-white hover:bg-black text-black hover:text-white shadow-sm",
        secondary:
          "bg-white text-black border-2 border-black hover:bg-black hover:text-white",
        ghost: "bg-transparent text-black hover:bg-white/70",
        link: "text-black underline-offset-4 hover:underline",
        glass: "bg-white/60 backdrop-blur-xl border-2 border-black/10 hover:bg-white/80 text-black shadow-md hover:shadow-lg",
        success: "bg-black text-white hover:bg-white hover:text-black border-2 border-black shadow-md hover:shadow-lg",
        warning: "bg-black text-white hover:bg-white hover:text-black border-2 border-black shadow-md hover:shadow-lg",
        info: "bg-black text-white hover:bg-white hover:text-black border-2 border-black shadow-md hover:shadow-lg",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
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
