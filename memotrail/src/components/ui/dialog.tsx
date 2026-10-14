import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({
  children,
  className,
  busy = false,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onInteractOutside,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { busy?: boolean }) {
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        className={cn("dialog-content", className)}
        {...props}
        aria-busy={busy || undefined}
        onOpenAutoFocus={(event) => {
          previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && previousFocus.current?.isConnected) {
            event.preventDefault(); previousFocus.current.focus({ preventScroll: true });
          }
        }}
        onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); onEscapeKeyDown?.(event); }}
        onInteractOutside={(event) => { if (busy) event.preventDefault(); onInteractOutside?.(event); }}
      >
        {children}
        <DialogPrimitive.Close
          className="dialog-close"
          aria-label="Close dialog"
          disabled={busy}
        >
          <X size={19} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogTitle(
  props: ComponentProps<typeof DialogPrimitive.Title>,
) {
  return <DialogPrimitive.Title className="dialog-title" {...props} />;
}
export function DialogDescription(
  props: ComponentProps<typeof DialogPrimitive.Description>,
) {
  return (
    <DialogPrimitive.Description className="dialog-description" {...props} />
  );
}
