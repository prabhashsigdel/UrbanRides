import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * "⋯" button with a small action menu, for rows that have more actions than fit inline.
 * items: [{ label, icon, onSelect, tone }] — tone "danger" colours destructive actions.
 */
export default function RowMenu({ label, items, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  // Arrow keys move between items, like a native menu.
  const handleMenuKey = (event) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement);
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
  };

  useEffect(() => {
    if (isOpen) rootRef.current?.querySelector(".row-menu-list button")?.focus();
  }, [isOpen]);

  return (
    <div className="row-menu" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        <MoreHorizontal size={18} />
      </button>
      <div className="row-menu-list" role="menu" data-open={isOpen} onKeyDown={handleMenuKey}>
        {items.map(({ label: itemLabel, icon: Icon, onSelect, tone }) => (
          <button
            key={itemLabel}
            type="button"
            role="menuitem"
            data-tone={tone}
            tabIndex={isOpen ? 0 : -1}
            onClick={() => {
              setIsOpen(false);
              onSelect();
            }}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {itemLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
