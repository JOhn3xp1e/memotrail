import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackupOperation } from "@/stores/backup-operation";
import { MemoConfirmDialog } from "@/components/ui/memo-confirm-dialog";
import { notify } from "@/stores/toasts";
import { InstallProgress, type InstallStage } from "@/components/install-progress";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
interface PwaState {
  offlineReady: boolean;
  online: boolean;
  installed: boolean;
  canInstall: boolean;
  install: () => Promise<void>;
  error: boolean;
  installStage: InstallStage;
  showInstallProgress: () => void;
}
const PwaContext = createContext<PwaState>({
  offlineReady: false,
  online: true,
  installed: false,
  canInstall: false,
  install: async () => {},
  error: false,
  installStage: "idle",
  showInstallProgress: () => {},
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const backupBusy = useBackupOperation((state) => state.busy);
  useEffect(() => {
    if (!backupBusy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [backupBusy]);
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installStage, setInstallStage] = useState<InstallStage>("idle");
  const [installProgressOpen, setInstallProgressOpen] = useState(false);
  const installInFlight = useRef(false);
  const installReported = useRef(false);
  const [installed, setInstalled] = useState(
    matchMedia("(display-mode: standalone)").matches,
  );
  const [error, setError] = useState(false);
  const [cachedReady, setCachedReady] = useState(false);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => setError(true) });

  useEffect(() => {
    let mounted = true;
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then(async () => {
        const shell = await caches.match(new URL(`${import.meta.env.BASE_URL}index.html`, location.origin), { ignoreSearch: true });
        if (mounted) {
          setCachedReady(!!shell);
          if (!shell) setError(true);
        }
      }).catch(() => { if (mounted) setError(true); });
    }
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => {
      installReported.current = true;
      setInstallStage("accepted");
      setInstallProgressOpen(true);
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      mounted = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (installStage !== "prompting" && installStage !== "requested") return;
    // The browser owns installation. Stop the indefinite animation if it
    // never reports an outcome; never invent a download percentage.
    const timer = window.setTimeout(() => setInstallStage("stalled"), 45_000);
    return () => window.clearTimeout(timer);
  }, [installStage]);

  async function install() {
    if (!installEvent || installInFlight.current) return;
    installInFlight.current = true;
    installReported.current = false;
    setInstallStage("prompting");
    setInstallProgressOpen(true);
    // Install events are single-use, including dismissed or failed prompts.
    setInstallEvent(null);
    try {
      // Call directly in the click handler to retain browser user activation.
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (!installReported.current) setInstallStage(choice.outcome === "accepted" ? "requested" : "dismissed");
    } catch {
      if (!installReported.current) setInstallStage("failed");
    } finally {
      installInFlight.current = false;
    }
  }

  return (
    <PwaContext.Provider
      value={{
        offlineReady: offlineReady || cachedReady,
        online,
        installed,
        canInstall: !!installEvent,
        install,
        error,
        installStage,
        showInstallProgress: () => setInstallProgressOpen(true),
      }}
    >
      {children}
      <InstallProgress open={installProgressOpen} onOpenChange={setInstallProgressOpen} stage={installStage} offlineReady={offlineReady || cachedReady} />
      <MemoConfirmDialog open={confirmUpdate} onOpenChange={setConfirmUpdate} title="Ready for a fresh chapter?" description="Save your edits before updating. MemoTrail will reload; your saved journal stays on this device." cancelLabel="Keep working" confirmLabel="Update and reload" busy={backupBusy} onConfirm={() => {
        if (!useBackupOperation.getState().busy) { setConfirmUpdate(false); void updateServiceWorker(true).catch(() => { setError(true); notify("The update could not finish. Your saved journal is still on this device.", "error"); }); }
      }} />
      {needRefresh && (
        <div className="update-notice" role="status">
          <RefreshCw size={20} />
          <div>
            <strong>A fresh chapter is ready</strong>
            <p>Save your edits before updating. Updating reloads the app; your saved journal stays on this device.</p>
          </div>
          <Button
            size="sm"
            disabled={backupBusy}
            onClick={() => {
              if (!useBackupOperation.getState().busy) setConfirmUpdate(true);
            }}
          >
            <Download size={15} />
            Update
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss update"
          >
            <X size={17} />
          </Button>
        </div>
      )}
    </PwaContext.Provider>
  );
}
export function usePwa() {
  return useContext(PwaContext);
}
