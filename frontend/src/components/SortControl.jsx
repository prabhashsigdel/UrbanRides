import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { SORTS } from "../lib/sort";
import "./SortControl.css";

/** Sort menu used above vehicle grids. A styled listbox: click, or use the arrow keys, Enter and Escape. */
export default function SortControl({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();
  const selectedIndex = Math.max(0, SORTS.findIndex((s) => s.value === value));

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [isOpen]);

  const open = () => {
    setActiveIndex(selectedIndex);
    setIsOpen(true);
  };

  const choose = (index) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    if (SORTS[index].value !== value) onChange(SORTS[index].value);
  };

  const handleKeyDown = (event) => {
    const last = SORTS.length - 1;
    const moves = {
      ArrowDown: () => (isOpen ? setActiveIndex((i) => Math.min(i + 1, last)) : open()),
      ArrowUp: () => (isOpen ? setActiveIndex((i) => Math.max(i - 1, 0)) : open()),
      Home: () => isOpen && setActiveIndex(0),
      End: () => isOpen && setActiveIndex(last),
      Enter: () => (isOpen ? choose(activeIndex) : open()),
      " ": () => (isOpen ? choose(activeIndex) : open()),
      Escape: () => setIsOpen(false),
      Tab: () => setIsOpen(false),
    };
    const move = moves[event.key];
    if (!move) return;
    if (event.key !== "Tab") event.preventDefault();
    move();
  };

  return (
    <div className="sort-control" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="sort-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
      >
        <ArrowUpDown size={16} aria-hidden="true" />
        <span className="visually-hidden">Sort by: </span>
        {SORTS[selectedIndex].label}
        <ChevronDown size={16} aria-hidden="true" className="sort-chevron" />
      </button>

      <ul id={listId} className="sort-menu" role="listbox" aria-label="Sort vehicles" data-open={isOpen}>
        {SORTS.map((option, index) => (
          <li
            key={option.value || "recommended"}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === selectedIndex}
            data-active={isOpen && index === activeIndex}
            onPointerEnter={() => setActiveIndex(index)}
            onClick={() => choose(index)}
          >
            {option.label}
            <Check size={16} aria-hidden="true" className="sort-check" />
          </li>
        ))}
      </ul>
    </div>
  );
}
