import { useEffect, useState } from "react";
import { Download, Share, X, ExternalLink } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "scholly-install-dismissed";
const PUBLISHED_URL = "https://grog-sparkle-boost.lovable.app";

export function InstallButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [autoPopup, setAutoPopup] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari only
      window.navigator.standalone === true;
    setInstalled(standalone);

    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setAutoPopup(false);
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // Always pop up shortly after load (unless installed or dismissed)
    if (!standalone && !dismissed) {
      const t = setTimeout(() => setAutoPopup(true), 1200);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setAutoPopup(false);
    setShowIos(false);
  };

  const triggerInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setAutoPopup(false);
      return;
    }
    setShowIos(true);
  };

  if (installed) return null;

  return (
    <>
      <button
        onClick={triggerInstall}
        className={`inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-base font-semibold hover:bg-secondary transition-colors ${className}`}
      >
        <Download className="h-4 w-4" /> Install app
      </button>

      {(autoPopup || showIos) && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4 animate-in fade-in"
          onClick={dismiss}
        >
          <div
            className="max-w-sm w-full rounded-2xl bg-gradient-card border border-border p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-gold grid place-items-center text-gold-foreground">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold leading-tight">Install Scholly</h3>
                <p className="text-xs text-muted-foreground">Get the app on your home screen</p>
              </div>
            </div>

            {(() => {
              const inIframe = (() => {
                try { return window.self !== window.top; } catch { return true; }
              })();
              if (inIframe) {
                return (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You're viewing Scholly inside the editor preview, where browsers block app
                      installation. Open the live site to install it on your phone.
                    </p>
                    <div className="mt-5 flex gap-2">
                      <a
                        href={PUBLISHED_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground glow-gold"
                      >
                        <ExternalLink className="h-4 w-4" /> Open live app
                      </a>
                      <button
                        onClick={dismiss}
                        className="flex-1 inline-flex items-center justify-center rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
                      >
                        Not now
                      </button>
                    </div>
                  </>
                );
              }
              return (
                <>
                  {isIos || !deferred ? (
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside mt-2">
                      {isIos ? (
                        <>
                          <li>Tap the <Share className="inline h-4 w-4 text-gold" /> Share button in Safari.</li>
                          <li>Choose <strong>Add to Home Screen</strong>.</li>
                          <li>Tap <strong>Add</strong> — Scholly opens like a real app.</li>
                        </>
                      ) : (
                        <>
                          <li>Open the browser menu (⋮).</li>
                          <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                          <li>Confirm to finish.</li>
                        </>
                      )}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Tap install below to add Scholly to your home screen — no app store, no sign-up.
                    </p>
                  )}
                  <div className="mt-5 flex gap-2">
                    {deferred && !isIos && (
                      <button
                        onClick={triggerInstall}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground glow-gold"
                      >
                        <Download className="h-4 w-4" /> Install
                      </button>
                    )}
                    <button
                      onClick={dismiss}
                      className="flex-1 inline-flex items-center justify-center rounded-full glass px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
                    >
                      Not now
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
