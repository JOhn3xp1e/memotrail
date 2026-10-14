import { useEffect } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useToasts, type MemoToast } from "@/stores/toasts";
function ToastMessage({ toast }: { toast: MemoToast }) {
  const dismiss = useToasts((state) => state.dismiss);
  useEffect(() => { const timer = setTimeout(() => dismiss(toast.id), toast.kind === "error" ? 10_000 : 6000); return () => clearTimeout(timer); }, [toast, dismiss]);
  const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "info" ? Info : TriangleAlert;
  return <div className={`memo-toast toast-${toast.kind}`} role={toast.kind === "error" || toast.kind === "warning" ? "alert" : "status"}><Icon size={19} aria-hidden="true" /><p>{toast.message}</p><button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={16} /></button></div>;
}
export function MemoToastViewport() {
  const items = useToasts((state) => state.items);
  return <section className="memo-toasts" aria-label="Notifications">{items.map((toast) => <ToastMessage toast={toast} key={toast.id} />)}</section>;
}
