import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { MemoPicker } from "./memo-picker";
import { MemoSelect } from "./memo-select";
import { Button } from "./button";
import { localDate } from "@/lib/utils";
import { validDate } from "@/lib/date-input";
export function MemoDateInput({ id, label, value, onValueChange, min, max, required = false }: {
  id?: string; label: string; value: string; onValueChange: (value: string) => void; min?: string; max?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ source: value, text: value });
  const displayValue = draft.source === value ? draft.text : value;
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const pickerId = useId();
  const pendingFocus = useRef(false);
  const start = validDate(value) ? value : localDate();
  const [focusDate, setFocusDate] = useState(start);
  const [month, setMonth] = useState(start.slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const count = new Date(year, monthNumber, 0).getDate();
  const offset = new Date(year, monthNumber - 1, 1).getDay();
  const allowed = (date: string) => (!min || date >= min) && (!max || date <= max);
  useEffect(() => {
    const invalid = displayValue && (!validDate(displayValue) || (min && displayValue < min) || (max && displayValue > max));
    input.current?.setCustomValidity(invalid ? "Choose a valid date within the allowed range (YYYY-MM-DD)." : "");
  }, [displayValue, min, max]);
  useLayoutEffect(() => {
    if (open && pendingFocus.current) {
      grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus(); pendingFocus.current = false;
    }
  }, [open, focusDate, month]);
  function show(next: boolean) {
    if (next) {
      let date = validDate(value) ? value : localDate();
      if (min && date < min) date = min;
      if (max && date > max) date = max;
      setFocusDate(date); setMonth(date.slice(0, 7));
    }
    setOpen(next);
  }
  function changeMonth(delta: number) {
    const date = new Date(year, monthNumber - 1 + delta, 1, 12);
    setMonth(localDate(date).slice(0, 7)); setFocusDate(localDate(date));
  }
  function keydown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const next = new Date(`${date}T12:00:00`);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "PageUp" || event.key === "PageDown") {
        const day = next.getDate(); next.setDate(1); next.setMonth(next.getMonth() + (event.key === "PageUp" ? -1 : 1));
        next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      } else next.setDate(next.getDate() + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -next.getDay(), End: 6 - next.getDay() }[event.key] ?? 0));
      const target = localDate(next);
      if (allowed(target)) { pendingFocus.current = true; setFocusDate(target); setMonth(target.slice(0, 7)); }
    }
  }
  const [currentYear] = useState(() => new Date().getFullYear());
  const firstYear = Math.min(Number(min?.slice(0, 4) ?? currentYear - 110), year);
  const lastYear = Math.max(Number(max?.slice(0, 4) ?? currentYear + 110), year);
  return <div className="memo-date-input">
    <input ref={input} id={id} type="text" aria-label={label} value={displayValue} placeholder="YYYY-MM-DD" inputMode="text" maxLength={10} pattern="\d{4}-\d{2}-\d{2}" required={required} onChange={(event) => { setDraft({ source: value, text: event.target.value }); onValueChange(event.target.value); }} />
    <MemoPicker open={open} onOpenChange={show} title={label} description="Choose a date, or type YYYY-MM-DD in the field." contentId={pickerId} className="calendar-picker" onOpenAutoFocus={(event) => {
      event.preventDefault(); grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
    }} trigger={<button type="button" className="date-trigger" aria-label={`Choose date: ${label}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? pickerId : undefined}><CalendarDays size={18} aria-hidden="true" /></button>}>
      <div className="calendar-navigation">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></Button>
        <p aria-live="polite">{new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></Button>
      </div>
      <div className="calendar-jump"><MemoSelect label="Calendar month" value={String(monthNumber)} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" }) }))} onValueChange={(value) => { const date = `${year}-${value.padStart(2, "0")}-01`; setMonth(date.slice(0, 7)); setFocusDate(date); }} /><MemoSelect label="Calendar year" value={String(year)} options={Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({ value: String(firstYear + i), label: String(firstYear + i) }))} onValueChange={(value) => { const date = `${value}-${String(monthNumber).padStart(2, "0")}-01`; setMonth(date.slice(0, 7)); setFocusDate(date); }} /></div>
      <div ref={grid} className="calendar-grid" role="grid" aria-label="Calendar">
        <div role="row">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span role="columnheader" key={day}>{day}</span>)}</div>
        {Array.from({ length: Math.ceil((offset + count) / 7) }, (_, week) => <div role="row" key={week}>{Array.from({ length: 7 }, (_, column) => {
          const day = week * 7 + column - offset + 1;
          if (day < 1 || day > count) return <span role="gridcell" key={column} />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          return <span role="gridcell" aria-selected={date === value} key={column}><button type="button" data-date={date} tabIndex={date === focusDate ? 0 : -1} disabled={!allowed(date)} aria-label={new Date(`${date}T12:00:00`).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })} aria-current={date === localDate() ? "date" : undefined} onFocus={() => setFocusDate(date)} onKeyDown={(event) => keydown(event, date)} onClick={() => { onValueChange(date); setOpen(false); }}>{day}</button></span>;
        })}</div>)}
      </div>
      <div className="dialog-actions"><Button variant="ghost" onClick={() => { onValueChange(""); setOpen(false); }}>Clear date</Button><Button variant="secondary" disabled={!allowed(localDate())} onClick={() => { onValueChange(localDate()); setOpen(false); }}>Today</Button></div>
    </MemoPicker>
  </div>;
}
