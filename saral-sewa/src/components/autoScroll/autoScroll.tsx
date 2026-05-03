"use client";

import React from "react";
import styles from "./autoScroll.module.css";

type Props = {
  items: React.ReactNode[]; // items to render horizontally
  duration?: number; // seconds for one full loop (lower = faster)
  gap?: number; // px gap between items
};

export default function AutoScrollCSS({
  items,
  duration = 30,
  gap = 24,
}: Props) {
  // duplicate items so the loop never shows a gap at the end
  const all = [...items];

  return (
    <div className={styles.marqueeWrapper}>
      <div
        className={styles.marquee}
        style={{ animationDuration: `${duration}s`, gap: `${gap}px` }}
      >
        {all.map((child, i) => (
          <div key={i} className={styles.item}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
