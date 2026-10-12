import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}
const PwaContext = createContext<PwaState>({
  offlineReady: false,
  online: true,
  installed: false,
  canInstall: false,
  install: async () => {},
  error: false,
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
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
      void navigator.serviceWorker.ready.then(() => {
        if (mounted) setCachedReady(true);
      }).catch(() => { if (mounted) setError(true); });
    }
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => {
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

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
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
      }}
    >
      {children}
      {needRefresh && (
        <div className="update-notice" role="status">
          <RefreshCw size={20} />
          <div>
            <strong>A fresh chapter is ready</strong>
            <p>Updating reloads the app and clears unsaved previews.</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              void updateServiceWorker(true).catch(() => setError(true));
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
