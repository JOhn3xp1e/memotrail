import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { MemoPicker } from "./memo-picker";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type MemoOption = { value: string; label: string; disabled?: boolean };
export function MemoSelect({ id, label, value, options, onValueChange, onCreate, disabled = false, className }: {
  id?: string; label: string; value: string; options: MemoOption[]; onValueChange: (value: string) => void; onCreate?: () => void; disabled?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", at: 0 });
  const selected = options.find((option) => option.value === value);
  function focus(index: number) {
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>("[role=option]:not(:disabled)");
    if (buttons?.length) buttons[(index + buttons.length) % buttons.length]?.focus();
  }
  function keydown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("[role=option]:not(:disabled)") ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      focus(event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : index + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      search.current = { text: now - search.current.at < 700 ? search.current.text + event.key : event.key, at: now };
      const text = search.current.text.toLocaleLowerCase();
      const match = buttons.find((button) => button.textContent?.trim().toLocaleLowerCase().startsWith(text));
      match?.focus();
    }
  }
  return <MemoPicker open={open} onOpenChange={setOpen} title={label} contentId={`${listId}-popup`} onOpenAutoFocus={(event) => {
    event.preventDefault(); search.current = { text: "", at: 0 };
    const current = list.current?.querySelector<HTMLButtonElement>("[aria-selected=true]:not(:disabled)");
    if (current) current.focus(); else focus(0);
  }} trigger={<button id={id} type="button" className={cn("memo-select-trigger", className)} role="combobox" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${listId}-popup` : undefined} disabled={disabled} onKeyDown={(event) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); setOpen(true); }
  }}><span>{selected?.label ?? "Choose an option"}</span><ChevronDown size={17} aria-hidden="true" /></button>}>
    <div ref={list} id={listId} role="listbox" aria-label={label} className="memo-option-list" onKeyDown={keydown}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} tabIndex={option.value === value ? 0 : -1} key={option.value} className="memo-option" data-value={option.value} onClick={() => { onValueChange(option.value); setOpen(false); }}>
        <span>{option.label}</span><span className="memo-option-indicator" aria-hidden="true">{option.value === value && <Check size={15} />}</span>
      </button>)}
    </div>
    {onCreate && <Button variant="secondary" className="picker-create" onClick={() => { setOpen(false); requestAnimationFrame(() => onCreate()); }}><Plus size={16} />Create a collection</Button>}
  </MemoPicker>;
}
