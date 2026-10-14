import { useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
export function MemoConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = "Cancel", busy = false, onConfirm, children }: {
  open: boolean; onOpenChange: (value: boolean) => void; title: string; description: string; confirmLabel: string; cancelLabel?: string; busy?: boolean; onConfirm: () => void; children?: ReactNode;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent role="alertdialog" busy={busy} onOpenAutoFocus={(event) => { event.preventDefault(); cancel.current?.focus(); }}>
      <DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription>
      {children}
      <div className="dialog-actions"><Button ref={cancel} variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>{cancelLabel}</Button><Button disabled={busy} onClick={onConfirm}>{confirmLabel}</Button></div>
    </DialogContent>
  </Dialog>;
}
