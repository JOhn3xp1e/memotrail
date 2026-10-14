import * as Popover from "@radix-ui/react-popover";
import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "./dialog";
import { cn } from "@/lib/utils";

function usePhoneLayout() {
  const [phone, setPhone] = useState(() => matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const query = matchMedia("(max-width: 767px)");
    const change = () => setPhone(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return phone;
}
export function MemoPicker({ open, onOpenChange, trigger, title, description, children, className, contentId, onOpenAutoFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void; trigger: ReactNode; title: string; description?: string; children: ReactNode; className?: string; contentId?: string; onOpenAutoFocus?: (event: Event) => void;
}) {
  const phone = usePhoneLayout();
  if (phone) return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent id={contentId} className={cn("memo-bottom-sheet", className)} onOpenAutoFocus={onOpenAutoFocus}>
      <span className="sheet-handle" aria-hidden="true" />
      <DialogTitle>{title}</DialogTitle><DialogDescription>{description ?? "Choose an option for your journal."}</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>;
  return <Popover.Root open={open} onOpenChange={onOpenChange}>
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    <Popover.Portal><Popover.Content id={contentId} sideOffset={8} align="start" collisionPadding={16} className={cn("memo-popover", className)} aria-label={title} onOpenAutoFocus={onOpenAutoFocus}>
      <p className="picker-heading">{title}</p>{children}
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
