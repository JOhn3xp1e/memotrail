import { useId, useState } from "react";
import { Clock } from "lucide-react";
import { MemoPicker } from "./memo-picker";
import { MemoSelect } from "./memo-select";
import { Button } from "./button";
export function MemoTimeInput({ id, label, value, onValueChange }: { id?: string; label: string; value: string; onValueChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("00"); const [minutes, setMinutes] = useState("00");
  const pickerId = useId();
  function show(next: boolean) { if (next) { const [hour = "00", minute = "00"] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(":") : []; setHours(hour); setMinutes(minute); } setOpen(next); }
  return <div className="memo-date-input"><input type="text" id={id} aria-label={label} placeholder="HH:mm" inputMode="text" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" value={value} onChange={(event) => onValueChange(event.target.value)} />
    <MemoPicker title={label} description="Use 24-hour time in your device's local time zone." contentId={pickerId} open={open} onOpenChange={show} trigger={<button type="button" className="date-trigger" aria-label={`Choose time: ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? pickerId : undefined}><Clock size={18} /></button>}>
      <div className="calendar-jump"><MemoSelect label="Hour" value={hours} onValueChange={setHours} options={Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, "0"), label: String(i).padStart(2, "0") }))} /><MemoSelect label="Minute" value={minutes} onValueChange={setMinutes} options={Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, "0"), label: String(i).padStart(2, "0") }))} /></div>
      <div className="dialog-actions"><Button variant="ghost" onClick={() => { onValueChange(""); setOpen(false); }}>Use midnight</Button><Button onClick={() => { onValueChange(`${hours}:${minutes}`); setOpen(false); }}>Use this time</Button></div>
    </MemoPicker>
  </div>;
}
