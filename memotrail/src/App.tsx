import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy } from "react";
import { MotionConfig } from "motion/react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { PwaProvider } from "@/hooks/use-pwa";
import { useTheme } from "@/hooks/use-theme";
import { usePreferences } from "@/stores/preferences";
import { HomePage } from "@/pages/home";
import { NotFoundPage } from "@/pages/not-found";
const TimelinePage = lazy(() =>
  import("@/pages/timeline").then((module) => ({
    default: module.TimelinePage,
  })),
);
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
  useTheme();
  const reduceMotion = usePreferences((state) => state.reduceMotion);
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
        <div data-reduce-motion={reduceMotion || undefined}>
          <PwaProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="timeline" element={<TimelinePage />} />
                  <Route path="add" element={<AddMemoryPage />} />
                  <Route path="collections" element={<CollectionsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </PwaProvider>
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}
