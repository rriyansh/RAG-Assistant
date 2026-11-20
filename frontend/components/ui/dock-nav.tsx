"use client";

import { cva } from "class-variance-authority";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const dockList = cva("flex", {
  variants: { align: { start: "justify-start", center: "justify-center", end: "justify-end" } },
  defaultVariants: { align: "start" },
});

export interface DockNavItem {
  label: string;
  alt?: string;
  href?: string;
  icon?: ReactNode;
  iconSrc?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function DockNav({ items, label, className, align, duration = 0.5 }: {
  items: DockNavItem[];
  label: string;
  className?: string;
  align?: "start" | "center" | "end";
  duration?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const active = hover ?? focus;
  return (
    <nav aria-label={label} className={cn("connector-dock", className)}>
      <ul className={dockList({ align })}>
        {items.map((item, index) => {
          const distance = active === null ? Infinity : Math.abs(active - index);
          const contents = <>
            <motion.div initial={false} animate={{ scale: reduced || distance !== 0 ? 1 : 1.15 }}
              transition={{ duration, ease: [0.16, 1, 0.3, 1] }}>
              {item.icon ?? (item.iconSrc && <Image src={item.iconSrc} width={44} height={44} alt={item.alt ?? ""} />)}
            </motion.div>
            <span>{item.label}</span>
          </>;
          return (
            <li key={item.label} data-distance={distance}
              onPointerEnter={event => { if (event.pointerType === "mouse") setHover(index); }}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setFocus(index)} onBlur={() => setFocus(null)}>
              {item.href ? <a href={item.href}>{contents}</a> : (
                <button type="button" aria-pressed={item.selected} onClick={item.onSelect}>{contents}</button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default DockNav;
