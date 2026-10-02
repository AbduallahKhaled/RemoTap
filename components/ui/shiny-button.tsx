"use client";

import type React from "react";
import { cn } from "@/lib/utils";

/*
 * Shiny call-to-action: dark pill with a light running around the border and a dotted shimmer on hover.
 * The styles live in app/globals.css (.shiny-cta) so every primary <Button> can share them;
 * <Button> (components/ui/button.tsx) uses this look for its default variant.
 */
interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function ShinyButton({ children, className, type = "button", ...props }: ShinyButtonProps) {
  return (
    <button
      type={type}
      className={cn("shiny-cta tap inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-10 py-5 text-lg font-semibold leading-tight", className)}
      {...props}
    >
      {children}
    </button>
  );
}
