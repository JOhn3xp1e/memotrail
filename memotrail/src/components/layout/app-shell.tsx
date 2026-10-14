import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useOutlet,
} from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  FolderHeart,
  Heart,
  House,
  LockKeyhole,
  Moon,
  Mail,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/stores/preferences";
import { usePwa } from "@/hooks/use-pwa";
import { useResolvedTheme } from "@/hooks/use-theme";
import { BackupReminder } from "@/components/storage-backup";

const destinations = [
  { to: "/", label: "Home", icon: House },
  { to: "/timeline", label: "Timeline", icon: BookOpen },
  { to: "/add", label: "Add Memory", icon: Plus },
  { to: "/collections", label: "Collections", icon: FolderHeart },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  const [search, setSearch] = useState("");
  const { name, setTheme, sampleMode, setSampleMode } = usePreferences();
  const dark = useResolvedTheme();
  const { online, offlineReady } = usePwa();
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: "instant" });
      mainRef.current?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
    const title =
      destinations.find((item) => item.to === location.pathname)?.label ??
      (location.pathname.startsWith("/capsules") ? "Time Capsule" : "Page not found");
    document.title = `${title} · MemoTrail`;
  }, [location.pathname]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    navigate(
      `/timeline${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`,
    );
    setSearch("");
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="MemoTrail navigation">
        <Link to="/" className="brand-link" aria-label="MemoTrail home">
          <Brand />
        </Link>
        <div className="sidebar-nav-label">YOUR LITTLE WORLD</div>
        <nav aria-label="Main navigation" className="desktop-nav">
          {[...destinations, { to: "/capsules", label: "Time Capsule", icon: Mail }]
            .filter((item) => item.to !== "/add")
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                to={to}
                end={to === "/"}
                key={to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} strokeWidth={1.65} />
                <span>{label}</span>
                <span className="nav-active-dot" />
              </NavLink>
            ))}
        </nav>
        <Button className="sidebar-add" asChild>
          <Link to="/add">
            <Plus size={18} />
            Add a memory
          </Link>
        </Button>
        <div className="sidebar-note">
          <span className="note-star" aria-hidden="true">
            ✳
          </span>
          <p>
            Life moves fast.
            <br />
            <em>Keep the good bits.</em>
          </p>
          <span className="handwritten">a little reminder for you</span>
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <LockKeyhole size={14} />
            <span>Just yours. Always.</span>
          </div>
          <Link to="/settings" className="profile-link">
            <span className="avatar">
              {name.trim().charAt(0).toUpperCase() || "M"}
            </span>
            <span>
              <strong>{name || "Your personal space"}</strong>
              <small>
                {offlineReady
                  ? "Ready to wander offline"
                  : "Made for your memories"}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <Link to="/" className="mobile-brand" aria-label="MemoTrail home">
            <Brand />
          </Link>
          <div className="topbar-date">
            <span className="tiny-sun" aria-hidden="true">
              <Sun size={16} />
            </span>
            {dateLabel}
          </div>
          <div className="topbar-actions">
            <form className="global-search" onSubmit={onSearch} role="search">
              <Search size={17} />
              <input
                aria-label="Search memories"
                placeholder="Find a little moment…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span aria-hidden="true">↵</span>
            </form>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                dark
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={() => setTheme(dark ? "light" : "dark")}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <Link
              to="/settings"
              className="topbar-avatar avatar"
              aria-label="Personalize your space"
            >
              {name.trim().charAt(0).toUpperCase() || "M"}
            </Link>
          </div>
        </header>
        <main
          id="main-content"
          className="main-content"
          ref={mainRef}
          tabIndex={-1}
        >
          {!online && (
            <div className="offline-banner" role="status">
              <LockKeyhole size={15} />
              You’re offline. Make yourself at home.
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense
                fallback={
                  <div className="page-loading" role="status">
                    Opening a little chapter…
                  </div>
                }
              >
                <BackupReminder />
                {outlet}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="app-footer">
          <span>
            Made of moments. Made for you.
            <Heart size={12} />
          </span>
          <button onClick={() => setSampleMode(!sampleMode)}>
            <Sparkles size={13} />
            {sampleMode
              ? "Exploring a sample scrapbook"
              : "Explore the sample scrapbook"}
          </button>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {destinations.map(({ to, label, icon: Icon }) => (
          <NavLink
            to={to}
            key={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              `bottom-nav-item ${to === "/add" ? "bottom-add" : ""} ${isActive ? "active" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && to !== "/add" && (
                  <motion.span
                    layoutId="mobile-active"
                    className="mobile-active"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="bottom-icon">
                  <Icon size={to === "/add" ? 25 : 20} strokeWidth={1.7} />
                </span>
                <span>{to === "/add" ? "Add" : label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
