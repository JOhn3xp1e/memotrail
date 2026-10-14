import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, useEffect } from "react";
import { MotionConfig } from "motion/react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { PwaProvider } from "@/hooks/use-pwa";
import { useTheme } from "@/hooks/use-theme";
import { usePreferences } from "@/stores/preferences";
import { useStoragePersistence } from "@/stores/storage-persistence";
import { HomePage } from "@/pages/home";
import { NotFoundPage } from "@/pages/not-found";
import { MemoToastViewport } from "@/components/ui/memo-toast";
import { FirstLaunchGate } from "@/components/first-launch-gate";
const IntroductionPage = lazy(() => import("@/pages/introduction").then((m) => ({ default: m.IntroductionPage })));
const RewindPage = lazy(() => import("@/pages/rewind").then((m) => ({ default: m.RewindPage })));
const CapsulesPage = lazy(() => import("@/pages/capsules").then((m) => ({ default: m.CapsulesPage })));
const CapsuleCreatePage = lazy(() => import("@/pages/capsule-create").then((m) => ({ default: m.CapsuleCreatePage })));
const CapsuleDetailsPage = lazy(() => import("@/pages/capsule-details").then((m) => ({ default: m.CapsuleDetailsPage })));
const MemoryJarPage = lazy(() => import("@/pages/memory-jar").then((module) => ({ default: module.MemoryJarPage })));
const TimelinePage = lazy(() =>
  import("@/pages/timeline").then((module) => ({
    default: module.TimelinePage,
  })),
);
const MemoryDetailsPage = lazy(() => import("@/pages/memory-details").then((module) => ({ default: module.MemoryDetailsPage })));
const AddMemoryPage = lazy(() =>
  import("@/pages/add-memory").then((module) => ({
    default: module.AddMemoryPage,
  })),
);
const CollectionsPage = lazy(() =>
  import("@/pages/collections").then((module) => ({
    default: module.CollectionsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((module) => ({
    default: module.SettingsPage,
  })),
);
export default function App() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      document.documentElement.style.setProperty("--memo-viewport-height", `${viewport.height}px`);
      document.documentElement.style.setProperty("--memo-viewport-top", `${viewport.offsetTop}px`);
    };
    update(); viewport.addEventListener("resize", update); viewport.addEventListener("scroll", update);
    return () => { viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update); document.documentElement.style.removeProperty("--memo-viewport-height"); document.documentElement.style.removeProperty("--memo-viewport-top"); };
  }, []);
  useTheme();
  const requestPersistentStorage = useStoragePersistence(
    (state) => state.request,
  );
  useEffect(() => {
    void requestPersistentStorage();
  }, [requestPersistentStorage]);
  const reduceMotion = usePreferences((state) => state.reduceMotion);
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
        <div data-reduce-motion={reduceMotion || undefined}>
          <PwaProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<FirstLaunchGate />}>
                  <Route path="introduction" element={<IntroductionPage />} />
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="rewind" element={<RewindPage />} />
                  <Route path="capsules" element={<CapsulesPage />} />
                  <Route path="capsules/new" element={<CapsuleCreatePage />} />
                  <Route path="capsules/:id" element={<CapsuleDetailsPage />} />
                  <Route path="jar" element={<MemoryJarPage />} />
                  <Route path="timeline" element={<TimelinePage />} />
                  <Route path="memories/:id" element={<MemoryDetailsPage />} />
                  <Route path="add" element={<AddMemoryPage />} />
                  <Route path="collections" element={<CollectionsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                </Route>
              </Routes>
              <MemoToastViewport />
            </BrowserRouter>
          </PwaProvider>
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}
