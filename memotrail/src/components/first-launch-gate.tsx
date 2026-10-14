import { Suspense, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { useIntroduction } from "@/stores/onboarding";

export function JournalStartup() {
  return <main className="journal-startup" aria-label="Opening MemoTrail"><Brand /><p role="status">Opening your little home…</p></main>;
}
export function FirstLaunchGate() {
  const { status, error, initialize } = useIntroduction();
  const location = useLocation();
  useEffect(() => { void initialize(); }, [initialize]);
  if (status === "loading") return <JournalStartup />;
  if (status === "error") return <main className="journal-startup startup-error"><Brand /><h1>Your stories are still yours.</h1><p role="alert">{error}</p><Button onClick={() => void initialize()}>Try again</Button></main>;
  if (status === "required" && location.pathname !== "/introduction") return <Navigate to="/introduction" replace />;
  return <Suspense fallback={<JournalStartup />}><Outlet /></Suspense>;
}
