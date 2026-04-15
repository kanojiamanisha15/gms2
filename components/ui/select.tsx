"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);

  const controlledValue = value !== undefined ? value : internalValue;
  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: controlledValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
        triggerRef,
      }}
    >
      <div data-slot="select" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectGroup({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="select-group" {...props}>
      {children}
    </div>
  );
}

function SelectValue({
  placeholder,
  children,
  labels,
  ...props
}: {
  placeholder?: string;
  children?: React.ReactNode;
  /** Map of value -> display label. When set, trigger shows the label for the selected value. */
  labels?: Record<string, string>;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  const display =
    children !== undefined
      ? children
      : context.value && labels
        ? labels[context.value] ?? context.value
        : context.value || placeholder;

  return <span data-slot="select-value" {...props}>{display}</span>;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  showClear = false,
  onClear,
  clearAriaLabel = "Clear selection",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "default";
  showClear?: boolean;
  onClear?: () => void;
  clearAriaLabel?: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");
  const disabled = Boolean(props.disabled);
  const hasValue = Boolean(context.value && String(context.value).trim().length > 0);
  const canClear = showClear && hasValue && !disabled;

  return (
    <button
      ref={context.triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      data-slot="select-trigger"
      data-size={size}
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      <span className="flex items-center gap-1">
        {canClear ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={clearAriaLabel}
            className="rounded-sm p-0.5 opacity-70 hover:opacity-100"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onClear) {
                onClear();
              } else {
                context.onValueChange?.("");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                if (onClear) {
                  onClear();
                } else {
                  context.onValueChange?.("");
                }
              }
            }}
          >
            <X className="size-3.5" />
          </span>
        ) : null}
        <ChevronDownIcon className="size-4 opacity-50" />
      </span>
    </button>
  );
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  side = "bottom",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  position?: "item-aligned" | "popper";
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within Select");

  const [positionState, setPositionState] = React.useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!context.open || !context.triggerRef.current || !contentRef.current)
      return;

    const triggerRect = context.triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;
    const triggerWidth = triggerRect.width;

    if (side === "top") {
      top = triggerRect.top - contentRect.height - 4;
      left = triggerRect.left;
      if (align === "end") {
        left = triggerRect.right - contentRect.width;
      } else if (align === "center") {
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      }
    } else if (side === "bottom") {
      top = triggerRect.bottom + 4;
      left = triggerRect.left;
      if (align === "end") {
        left = triggerRect.right - contentRect.width;
      } else if (align === "center") {
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      }
    } else if (side === "left") {
      left = triggerRect.left - contentRect.width - 4;
      top = triggerRect.top;
      if (align === "end") {
        top = triggerRect.bottom - contentRect.height;
      } else if (align === "center") {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
      }
    } else if (side === "right") {
      left = triggerRect.right + 4;
      top = triggerRect.top;
      if (align === "end") {
        top = triggerRect.bottom - contentRect.height;
      } else if (align === "center") {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
      }
    }

    // Adjust if overflow
    if (left + contentRect.width > window.innerWidth) {
      left = window.innerWidth - contentRect.width - 8;
    }
    if (left < 0) {
      left = 8;
    }
    if (top + contentRect.height > window.innerHeight) {
      top = window.innerHeight - contentRect.height - 8;
    }
    if (top < 0) {
      top = 8;
    }

    setPositionState({ top, left, width: triggerWidth });
  }, [context.open, align, side]);

  React.useEffect(() => {
    if (!context.open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        context.triggerRef.current &&
        !context.triggerRef.current.contains(e.target as Node)
      ) {
        context.setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context.open]);

  if (!context.open) return null;

  const content = (
    <div
      ref={contentRef}
      data-slot="select-content"
      style={{
        position: "fixed",
        top: `${positionState.top}px`,
        left: `${positionState.left}px`,
        width: positionState.width > 0 ? `${positionState.width}px` : undefined,
        zIndex: 50,
      }}
      className={cn(
        "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 min-w-32 overflow-x-hidden overflow-y-auto rounded-md border shadow-md p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
}

function SelectScrollUpButton({
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  return null; // Simplified - scroll buttons not needed for basic usage
}

function SelectScrollDownButton({
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  return null; // Simplified - scroll buttons not needed for basic usage
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function SelectItem({ className, value, children, ...props }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  const isSelected = context.value === value;

  return (
    <div
      data-slot="select-item"
      data-state={isSelected ? "checked" : ""}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={() => context.onValueChange?.(value)}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        {isSelected && <CheckIcon className="size-4" />}
      </span>
      {children}
    </div>
  );
}

const SelectPortal = ({ children }: { children: React.ReactNode }) => children;
const SelectViewport = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={cn("p-1", className)}>{children}</div>;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectPortal,
  SelectViewport,
};
