"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-blue-500 text-white hover:bg-blue-600 shadow-sm",
                destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
                outline: "border border-blue-400 text-blue-200 hover:bg-blue-900/30",
                secondary: "bg-slate-700 text-white hover:bg-slate-800 shadow-sm",
                ghost: "hover:bg-slate-800 hover:text-slate-200 text-slate-300",
                link: "text-blue-400 underline-offset-4 hover:underline",
                accent: "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-900/20",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 py-1.5 text-xs",
                lg: "h-10 px-6 py-2.5",
                icon: "h-9 w-9",
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
        const Comp = asChild ? React.Fragment : "button"
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