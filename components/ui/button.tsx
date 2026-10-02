import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "tap inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] cursor-pointer",
  {
    variants: {
      variant: {
        default: "shiny-cta hover:-translate-y-0.5",
        grad: "btn-grad text-white shadow-[0_10px_40px_-10px_rgba(140,82,255,.7)] hover:shadow-[0_14px_50px_-8px_rgba(55,118,255,.8)] hover:-translate-y-0.5",
        white: "bg-white text-ink hover:bg-white/90 hover:-translate-y-0.5",
        outline: "rt-box bg-[#0b0b26] text-white hover:bg-[#12123a]",
        ghost: "text-white/80 hover:text-white hover:bg-white/10",
        whatsapp: "bg-[#25D366] text-[#04220f] hover:bg-[#3be07a]",
      },
      size: {
        default: "h-11 px-6 text-sm [&_svg]:size-4",
        sm: "h-9 px-4 text-[13px] [&_svg]:size-4",
        lg: "h-14 px-8 text-base [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
