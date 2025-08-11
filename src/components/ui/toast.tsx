"use client";

import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import * as React from "react";

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
  action?: { label: string; onClick: () => void };
};

type ToastContextType = {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const MAX_TOASTS = 4;

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const toastObj: Toast = {
        id,
        variant: "default",
        duration: 3500,
        ...t,
      };
      setToasts((prev) => {
        const next = [...prev, toastObj];
        return next.slice(-MAX_TOASTS);
      });
      const duration = toastObj.duration ?? 3500;
      const timer = setTimeout(() => dismiss(id), duration);
      // Cleanup if unmounted
      return () => clearTimeout(timer);
    },
    [dismiss]
  );

  // Optional: close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toasts.length > 0) {
        dismiss(toasts[toasts.length - 1]!.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function variantStyles(variant?: ToastVariant) {
  switch (variant) {
    case "destructive":
      return {
        container: "bg-red-900/90 border-red-800/60 text-red-50",
        icon: <XCircle className="h-5 w-5 text-red-200/80" />,
      };
    case "success":
      return {
        container: "bg-emerald-700/90 border-emerald-500/50 text-white",
        icon: <CheckCircle className="h-5 w-5 text-emerald-100" />,
      };
    case "warning":
      return {
        container: "bg-amber-700/90 border-amber-500/50 text-white",
        icon: <AlertTriangle className="h-5 w-5 text-amber-100" />,
      };
    case "info":
      return {
        container: "bg-sky-800/90 border-sky-600/50 text-white",
        icon: <Info className="h-5 w-5 text-sky-100" />,
      };
    default:
      return {
        container: "bg-slate-800/95 border-slate-600/60 text-slate-100",
        icon: <Info className="h-5 w-5 text-slate-200" />,
      };
  }
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed top-20 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => {
        const { container, icon } = variantStyles(t.variant);
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={
              "pointer-events-auto relative min-w-[280px] max-w-[360px] rounded-md border px-4 py-3 shadow-xl " +
              container +
              " animate-in fade-in-50 slide-in-from-top-2 duration-300"
            }
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1">
                {t.title && (
                  <div className="font-semibold leading-tight mb-0.5">
                    {t.title}
                  </div>
                )}
                {t.description && (
                  <div className="text-sm/5 opacity-90">{t.description}</div>
                )}
                {!t.title && !t.description && <div>Notification</div>}
                {typeof t.duration === "number" && t.duration > 1000 && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-white/60"
                      style={{
                        width: "100%",
                        animation: `toast-progress ${t.duration}ms linear forwards`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="ml-2 -mt-1">
                <button
                  aria-label="Dismiss notification"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
                  onClick={() => dismiss(t.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {t.action && (
              <div className="mt-2 flex justify-end">
                <button
                  className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10 transition"
                  onClick={t.action.onClick}
                >
                  {t.action.label}
                </button>
              </div>
            )}
          </div>
        );
      })}
      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
