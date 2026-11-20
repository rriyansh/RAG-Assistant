"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { type ComponentPropsWithoutRef, type ReactNode, useState } from "react";

const DOCK_EASE = [0.16, 1, 0.3, 1] as const;
const DOCK_DURATION = 0.5;
const DOCK_WIDTH = { base: "4.25rem", far: "5rem", close: "5.75rem", active: "6.5rem" } as const;
const alignment = { center: "justify-center", start: "justify-start", end: "justify-end" };
export const dockNavVariants = cva("connector-dock w-full", {
  variants: { align: { center: "", start: "", end: "" } }, defaultVariants: { align: "center" },
});
export const dockNavListVariants = cva("mb-0 flex list-none flex-row items-end p-0 text-[clamp(0.75rem,1.1vw,0.95rem)]", {
  variants: { align: alignment }, defaultVariants: { align: "center" },
});
export const dockNavItemVariants = cva("relative flex shrink-0 items-center justify-center");
export const dockNavLinkVariants = cva("relative z-[1] flex h-full w-full items-center justify-center px-[0.45em] py-0");
export const dockNavIconVariants = cva("h-full w-full object-contain");
export const dockNavTooltipVariants = cva("pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-[#e6e4f0]/20 bg-[#141417] px-2.5 py-1 font-bold text-xs text-[#f4f3f8] shadow-lg");

function getItemWidth(index: number, active: number | null) {
  if (active === null) return DOCK_WIDTH.base;
  return [DOCK_WIDTH.active, DOCK_WIDTH.close, DOCK_WIDTH.far][Math.abs(index - active)] ?? DOCK_WIDTH.base;
}

export interface DockNavItem {
  alt?: string;
  href?: string;
  icon?: ReactNode;
  iconSrc?: string;
  label: string;
  onClick?: () => void;
}
export interface DockNavProps extends Omit<ComponentPropsWithoutRef<"nav">, "children">, VariantProps<typeof dockNavVariants> {
  duration?: number;
  items: DockNavItem[];
}

export function DockNav({ align = "center", className, duration = DOCK_DURATION, items, ...props }: DockNavProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const active = hover ?? focus;
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : duration, ease: DOCK_EASE };
  return (
    <nav className={cn(dockNavVariants({ align, className }))} {...props}>
      <ul className={dockNavListVariants({ align })}>
        {items.map((item, index) => {
          const icon = item.icon ? <span className={dockNavIconVariants()}>{item.icon}</span> : item.iconSrc &&
            <Image alt={item.alt ?? item.label} className={dockNavIconVariants()} height={56} width={56} src={item.iconSrc} unoptimized />;
          const control = { className: dockNavLinkVariants(), "aria-label": item.label, onClick: item.onClick };
          return (
            <motion.li key={item.href ?? item.label} initial={false} className={dockNavItemVariants()}
              animate={{ width: getItemWidth(index, active) }} transition={transition}
              onPointerEnter={e => { if (e.pointerType === "mouse") setHover(index); }} onPointerLeave={() => setHover(null)}
              onFocus={() => setFocus(index)} onBlur={() => setFocus(null)}>
              {item.href ? <a href={item.href} {...control}>{icon}</a> : <button type="button" {...control}>{icon}</button>}
              <motion.div aria-hidden initial={false} className={dockNavTooltipVariants()} transition={transition}
                animate={{ opacity: active === index ? 1 : 0, y: active === index ? "-135%" : "-75%" }}>
                {item.label}
              </motion.div>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
export default DockNav;
