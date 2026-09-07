"use client";

import { useEffect, useState } from "react";
import type { DocSection } from "./sections";

interface DocsSidebarProps {
  sections: DocSection[];
}

export function DocsSidebar({ sections }: DocsSidebarProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
      <span className="block font-mono text-xs font-semibold uppercase tracking-wide text-body mb-3">
        On this page
      </span>
      <ul className="flex flex-col gap-1">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-badge-bg text-accent"
                    : "text-body hover:text-ink"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
