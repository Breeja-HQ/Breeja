"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ChainConfig } from "@/lib/chains";

interface Props {
  label: string;
  options: readonly ChainConfig[];
  value: string;
  onChange: (slug: ChainConfig["slug"]) => void;
  /** Show the source-only / full-mesh note under each option. */
  showMeshHint?: boolean;
}

function meshHint(chain: ChainConfig): string {
  if (!chain.isDestination) return "Source only";
  if (!chain.supportsEip3009) return "Not gasless as a source";
  return "Send and receive";
}

export default function ChainSelect({ label, options, value, onChange, showMeshHint = false }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const labelId = useId();

  const selectedIndex = options.findIndex((c) => c.slug === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Outside click closes without stealing focus back, matching native select
  // behaviour where clicking elsewhere just dismisses the popover.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // Move DOM focus into the listbox so arrow keys are handled by the list and
  // screen readers announce the active option via aria-activedescendant.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openList = useCallback(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [selectedIndex]);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) onChange(option.slug);
      close(true);
    },
    [options, onChange, close],
  );

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <span id={labelId} className="block text-base font-semibold text-body mb-2.5">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${listId}-trigger`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={`motion-lift flex w-full items-center justify-between gap-2 rounded-xl border bg-surface px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          open ? "border-accent" : "border-border hover:border-accent"
        }`}
      >
        <span id={`${listId}-trigger`} className="truncate text-lg font-semibold text-ink">
          {selected ? selected.name : "Select a chain"}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-body transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${listId}-opt-${activeIndex}`}
          onKeyDown={onListKeyDown}
          className="breeja-enter absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-surface p-1.5 shadow-lg outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.slug === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.slug}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-3 transition-colors duration-150 ${
                  isActive ? "bg-badge-bg" : "bg-surface"
                }`}
              >
                <span className="flex flex-col">
                  <span className={`text-lg font-semibold ${isSelected ? "text-accent" : "text-ink"}`}>
                    {option.name}
                  </span>
                  {showMeshHint && <span className="text-sm text-body">{meshHint(option)}</span>}
                </span>
                {isSelected && <Check className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
