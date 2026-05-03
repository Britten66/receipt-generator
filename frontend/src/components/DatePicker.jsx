import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { Calendar as CalendarIcon, X as XIcon } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import "react-day-picker/style.css";
import "./DatePicker.css";

// A Radix Popover + react-day-picker wrapper. Drop-in for native <input type="date">.
// Props:
//   value     — "YYYY-MM-DD" string or empty
//   onChange  — receives "YYYY-MM-DD" or "" when cleared
//   placeholder — text shown when empty
//   className  — applied to the trigger button (so you can keep the .field look)
//   clearable  — show an X to clear the value
//   disabled
export default function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className = "",
  clearable = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const date = value && isValid(parseISO(value)) ? parseISO(value) : undefined;

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`datepicker-trigger ${className}`}
          aria-label={placeholder}
        >
          <CalendarIcon size={14} strokeWidth={1.75} className="datepicker-icon" />
          <span className={`datepicker-value${date ? "" : " datepicker-placeholder"}`}>
            {date ? format(date, "MMM d, yyyy") : placeholder}
          </span>
          {clearable && date && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              className="datepicker-clear"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange(""); } }}
            >
              <XIcon size={12} strokeWidth={2} />
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="datepicker-popover"
          sideOffset={6}
          align="start"
          collisionPadding={12}
        >
          <DayPicker
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) onChange(format(d, "yyyy-MM-dd"));
              else onChange("");
              setOpen(false);
            }}
            weekStartsOn={1}
            showOutsideDays
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
