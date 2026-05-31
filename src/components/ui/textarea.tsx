import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 transition-all duration-200 resize-none shadow-sm hover:border-gray-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
