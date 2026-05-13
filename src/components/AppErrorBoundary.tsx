import { Component, ErrorInfo, ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "Unknown application error",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught render error:", error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalData = () => {
    try {
      localStorage.removeItem("bookquest-progress");
      localStorage.removeItem("bookquest-settings");
    } catch (error) {
      console.error("Failed to clear local app state:", error);
    }

    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            App recovery mode
          </p>
          <h1 className="mt-3 text-3xl font-bold">Something went wrong while loading.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The error was logged in the console so the exact crash can be diagnosed without leaving a blank screen.
          </p>
          <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            {this.state.errorMessage}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={this.handleReload}
              className="rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Reload app
            </button>
            <button
              onClick={this.handleResetLocalData}
              className="rounded-2xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Reset saved app data
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
