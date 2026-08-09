import { createFileRoute, redirect, Link } from "@tanstack/react-router";

const LEGACY_REDIRECTS: Record<string, string> = {
  index: "/",
  home: "/",
  auth: "/",
  login: "/",
  "sign-in": "/",
  signin: "/",
  dms: "/community",
  chat: "/community",
  leaderboard: "/community",
  ranks: "/community",
};

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found — Scholly.AI" },
      { name: "description", content: "This Scholly.AI page doesn't exist. Head back to the home page for the AI tutor, subjects and versus battles." },
      { property: "og:title", content: "Page not found — Scholly.AI" },
      { property: "og:description", content: "This Scholly.AI page doesn't exist. Head back to the home page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ params }) => {
    const raw = (params as { _splat?: string })._splat ?? "";
    const first = raw.split("/")[0]?.toLowerCase() ?? "";
    const target = LEGACY_REDIRECTS[first];
    if (target) throw redirect({ to: target });
  },
  component: CatchAll,
});

function CatchAll() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
