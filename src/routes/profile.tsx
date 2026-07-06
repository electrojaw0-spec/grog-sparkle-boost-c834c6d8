import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileSetup } from "@/components/ProfileSetup";
import { useProfile } from "@/lib/profile";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile · Scholly.AI" },
      { name: "description", content: "Edit your Scholly.AI display name and avatar." },
    ],
  }),
});

function ProfilePage() {
  const { profile, loading, save } = useProfile();
  const navigate = useNavigate();

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <ProfileSetup
      initial={profile ?? undefined}
      title={profile ? "Edit your profile" : "Create your profile"}
      subtitle="Your display name and avatar appear in Community and private chats."
      ctaLabel={profile ? "Save changes" : "Create profile"}
      onSave={async (data) => {
        await save(data);
        navigate({ to: "/community" });
      }}
    />
  );
}
