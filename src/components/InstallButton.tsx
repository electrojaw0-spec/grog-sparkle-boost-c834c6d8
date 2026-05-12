import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallButton({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari only
      window.navigator.standalone === true;
    setInstalled(standalone);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setShowIos(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-base font-semibold hover:bg-secondary transition-colors ${className}`}
      >
        <Download className="h-4 w-4" /> Install app
      </button>

      {showIos && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4"
          onClick={() => setShowIos(false)}
        >
          <div
            className="max-w-sm w-full rounded-2xl bg-gradient-card border border-border p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIos(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl font-bold mb-3">Install Scholly</h3>
            {isIos ? (
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  Tap the <Share className="inline h-4 w-4 text-gold" /> Share button in Safari.
                </li>
                <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> — Scholly will appear like a real app.</li>
              </ol>
            ) : (
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Open the browser menu (⋮ in Chrome).</li>
                <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>Confirm — Scholly will open like a regular app.</li>
              </ol>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Works offline-friendly · No app store · Free
            </p>
          </div>
        </div>
      )}
    </>
  );
}
