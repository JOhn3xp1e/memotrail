import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Download,
  Heart,
  Image,
  Laptop,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  WifiOff,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brand } from "@/components/brand";
import { usePreferences, type Theme } from "@/stores/preferences";
import { usePwa } from "@/hooks/use-pwa";
import { useStoragePersistence } from "@/stores/storage-persistence";
import { StorageBackup } from "@/components/storage-backup";

const themes = [
  {
    id: "light",
    title: "A little light",
    description: "Warm & airy",
    icon: Sun,
  },
  { id: "dark", title: "After hours", description: "Soft & quiet", icon: Moon },
  {
    id: "system",
    title: "Go with the flow",
    description: "Match your device",
    icon: Laptop,
  },
] satisfies {
  id: Theme;
  title: string;
  description: string;
  icon: typeof Sun;
}[];

export function SettingsPage() {
  const location = useLocation();
  const {
    name,
    theme,
    sampleMode,
    reduceMotion,
    setName,
    setTheme,
    setSampleMode,
    setReduceMotion,
  } = usePreferences();
  const [nameDraft, setNameDraft] = useState({ source: name, value: name });
  const nameInput = nameDraft.source === name ? nameDraft.value : name;
  const [saved, setSaved] = useState(false);
  const [info, setInfo] = useState<"privacy" | "install" | "credits" | null>(
    null,
  );
  const pwa = usePwa();
  const persistence = useStoragePersistence();
  function saveName(event: FormEvent) {
    event.preventDefault();
    setName(nameInput.trim());
    setSaved(true);
  }

  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="A space that feels like you."
        description="A few thoughtful touches for your own little corner of the world."
      />
      <div className="settings-grid">
        <div className="settings-main">
          <StorageBackup />
          <section className="settings-card introduction-setting"><div><h2>How to Use MemoTrail</h2><p className="fine-print">Real examples, friendly guides, and a little tour of your journal.</p></div><Button asChild variant="outline"><Link to="/help">Open Help &amp; Guides</Link></Button></section>
          <section className="settings-card introduction-setting"><div><h2>A little beginning</h2><p className="fine-print">Revisit the introduction whenever you like. Your journal stays just as it is.</p></div><Button asChild variant="outline"><Link to="/introduction" state={{ returnTo: location.pathname + location.search }}>View Introduction Again</Link></Button></section>
          <section className="settings-card">
            <div className="settings-section-heading">
              <span className="settings-icon rose">
                <Heart size={19} />
              </span>
              <div>
                <h2>A personal touch</h2>
                <p>It’s nice to be welcomed by name.</p>
              </div>
            </div>
            <form onSubmit={saveName} className="name-form">
              <div className="field">
                <label htmlFor="preferred-name">What should we call you?</label>
                <input
                  id="preferred-name"
                  placeholder="Your first name or a favorite nickname"
                  maxLength={40}
                  value={nameInput}
                  onChange={(event) => {
                    setNameDraft({ source: name, value: event.target.value });
                    setSaved(false);
                  }}
                />
              </div>
              <Button type="submit" variant="secondary">
                {saved ? <Check size={15} /> : null}
                {saved ? "Saved" : "Save name"}
              </Button>
            </form>
            <span className="fine-print" aria-live="polite">
              {saved
                ? "Your welcome message is now a little more you."
                : "Only stored on this device. No account needed."}
            </span>
          </section>
          <section className="settings-card">
            <div className="settings-section-heading">
              <span className="settings-icon lavender">
                <Sun size={19} />
              </span>
              <div>
                <h2>Set the mood</h2>
                <p>A softer space, day or night.</p>
              </div>
            </div>
            <div
              className="theme-options"
              role="group"
              aria-label="Color theme"
            >
              {themes.map(({ id, title, description, icon: Icon }) => (
                <button
                  className={`theme-option ${theme === id ? "selected" : ""}`}
                  key={id}
                  aria-pressed={theme === id}
                  onClick={() => setTheme(id)}
                >
                  <span className={`theme-preview theme-preview-${id}`}>
                    <span className="mini-sidebar" />
                    <span className="mini-layout">
                      <span />
                      <span />
                      <span />
                    </span>
                    <Icon size={19} />
                  </span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                  {theme === id && (
                    <span className="theme-check">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="setting-row">
              <div>
                <label htmlFor="reduce-motion">A little less motion</label>
                <p>
                  Keep transitions still and gentle. Device preferences are
                  always respected.
                </p>
              </div>
              <Switch
                id="reduce-motion"
                checked={reduceMotion}
                onCheckedChange={setReduceMotion}
              />
            </div>
          </section>
          <section className="settings-card">
            <div className="settings-section-heading">
              <span className="settings-icon peach">
                <Sparkles size={19} />
              </span>
              <div>
                <h2>A little inspiration</h2>
                <p>Take a peek at what your scrapbook could become.</p>
              </div>
            </div>
            <div className="setting-row no-border">
              <div>
                <label htmlFor="sample-mode">Show the sample scrapbook</label>
                <p>
                  Explore sample memories, photos, and collections. These are
                  separate from your journal and never saved to it.
                </p>
              </div>
              <Switch
                id="sample-mode"
                checked={sampleMode}
                onCheckedChange={setSampleMode}
              />
            </div>
            <button className="text-link" onClick={() => setInfo("credits")}>
              <Image size={14} />
              About the sample photography
              <ArrowUpRight size={14} />
            </button>
          </section>
        </div>
        <aside className="settings-aside" aria-label="Privacy and installation">
          <section className="privacy-card">
            <div className="privacy-emblem">
              <ShieldCheck size={30} strokeWidth={1.25} />
            </div>
            <span className="eyebrow">YOUR STORIES ARE YOURS</span>
            <h2>
              A little sanctuary.
              <br />
              <em>Just for you.</em>
            </h2>
            <p>
              No accounts. No uploads.
              <br />
              No one else reading your story.
            </p>
            <div className="privacy-feature">
              <LockKeyhole size={16} />
              On your device, in your hands
            </div>
            <div className="privacy-feature">
              <WifiOff size={16} />
              Room for life, even offline
            </div>
            <p className="fine-print" role={persistence.status === "error" ? "alert" : "status"}>
              {persistence.status === "granted"
                ? "The browser is protecting your local journal from automatic storage cleanup."
                : persistence.status === "not-granted"
                  ? "The browser may clear local data when storage is low."
                  : persistence.status === "unsupported"
                    ? "This browser does not offer persistent storage protection."
                    : persistence.status === "error"
                      ? persistence.error
                      : "Requesting protected local storage…"}
            </p>
            {(persistence.status === "not-granted" ||
              persistence.status === "error") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void persistence.request()}
              >
                Ask browser to protect data
              </Button>
            )}
            <button className="text-link" onClick={() => setInfo("privacy")}>
              Our promise to you
              <ArrowUpRight size={14} />
            </button>
          </section>
          <section className="install-card">
            <Smartphone size={24} strokeWidth={1.4} />
            <h2>Take your stories along</h2>
            <p>Give MemoTrail a little spot on your home screen.</p>
            <span className="install-status">
              <span className={pwa.error ? "status-warning" : ""} />
              {pwa.error
                ? "Offline setup needs another try"
                : pwa.offlineReady
                  ? "Ready for offline adventures"
                  : pwa.installed
                    ? "Installed on this device"
                    : "Your companion, wherever you go"}
            </span>
            {pwa.installed ? (
              <span className="installed-label">
                <Check size={16} />
                Already at home on this device
              </span>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (pwa.installStage === "prompting" || pwa.installStage === "requested")
                    pwa.showInstallProgress();
                  else if (pwa.canInstall)
                    void pwa.install();
                  else setInfo("install");
                }}
              >
                <Download size={16} />
                {pwa.installStage === "prompting" || pwa.installStage === "requested" ? "View installation progress" : pwa.canInstall ? "Install MemoTrail" : "How to install"}
              </Button>
            )}
            {(pwa.installStage === "failed" || pwa.installStage === "stalled") && (
              <p role="alert" className="fine-print">
                The browser hasn’t confirmed installation. Check your apps or try your browser’s install menu.
              </p>
            )}
          </section>
        </aside>
      </div>
      <div className="settings-signoff">
        <Brand />
        <p>A home for the things that matter.</p>
        <span>Offline-first journal · Made with a little love</span>
      </div>
      <Dialog
        open={info !== null}
        onOpenChange={(open) => {
          if (!open) setInfo(null);
        }}
      >
        <DialogContent>
          {info === "privacy" ? (
            <>
              <span className="dialog-emblem">
                <LockKeyhole size={23} />
              </span>
              <DialogTitle>Private by nature.</DialogTitle>
              <DialogDescription>
                Your memories deserve a home that’s yours.
              </DialogDescription>
              <div className="info-prose">
                <p>
                  MemoTrail has no account, cloud database, advertising, or
                  analytics. Selected photos stay on your device and are never
                  uploaded.
                </p>
                <p>
                  Your memories, collections, and photos are stored in a local
                  IndexedDB database on this device. Browser storage may still
                  be cleared by you or by the browser; persistent storage is
                  requested when supported.
                </p>
                <p>
                  The app caches its own files, fonts, and sample photos for
                  offline use. Clearing your browser’s site data removes local
                  your memories, photos, time capsules, preferences, and cached files.
                  Uninstalling the PWA may remove local data depending on your platform.
                  Keep a backup outside this browser. No local or cloud AI is used.
                </p>
              </div>
            </>
          ) : info === "install" ? (
            <>
              <span className="dialog-emblem">
                <Smartphone size={24} />
              </span>
              <DialogTitle>A home on your home screen.</DialogTitle>
              <DialogDescription>
                Open the app online once and let it finish loading before
                heading offline.
              </DialogDescription>
              <div className="info-prose">
                <p>
                  <strong>On iPhone or iPad</strong>
                  <br />
                  In Safari, tap Share, then “Add to Home Screen.”
                </p>
                <p>
                  <strong>On Android</strong>
                  <br />
                  In Chrome, open the browser menu and choose “Install app” or
                  “Add to Home screen.”
                </p>
                <p>
                  <strong>On your computer</strong>
                  <br />
                  In Chrome or Edge, use the install icon in the address bar or
                  “Install” in the browser menu, when available.
                </p>
                <p className="fine-print">
                  Installation and offline caching are available in the
                  production build over HTTPS or localhost.
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="dialog-emblem">
                <Image size={23} />
              </span>
              <DialogTitle>A little borrowed beauty.</DialogTitle>
              <DialogDescription>
                Sample photography helps bring the scrapbook preview to life.
              </DialogDescription>
              <div className="info-prose">
                <p>
                  These illustrative photographs come from Unsplash. The names,
                  stories, dates, and albums are fictional samples, not your
                  personal memories.
                </p>
                <p>
                  Photos are bundled with the app for offline access. They never
                  become records in your memory journal. Turn the sample
                  scrapbook off at any time to start with a quiet, empty space.
                </p>
                <a
                  className="text-link"
                  href="/photo-credits.txt"
                  target="_blank"
                  rel="noreferrer"
                >
                  View photograph sources
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
