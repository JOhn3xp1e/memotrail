import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "MemoTrail could not render this screen.",
      error,
      info.componentStack,
    );
  }
  render() {
    if (this.state.failed)
      return (
        <main className="not-found">
          <h1>A little pause in the story.</h1>
          <p>
            Something didn’t load as expected. Reloading may help; it will clear
            any unsaved preview.
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload MemoTrail
          </Button>
        </main>
      );
    return this.props.children;
  }
}
