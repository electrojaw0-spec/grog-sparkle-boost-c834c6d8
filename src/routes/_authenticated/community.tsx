import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { PostImage } from "@/components/PostImage";
import { useMyProfile, fetchProfile, type Profile } from "@/lib/profile";
import { uploadPostImage, deletePostImage } from "@/lib/postImage";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS } from "@/lib/subjects";
import {
  Send,
  Loader2,
  Trash2,
  Heart,
  MessageCircle,
  ImagePlus,
  Camera,
  X,
  Users,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community Feed · Scholly.AI" },
      { name: "description", content: "Share posts, ask questions, and study with other scholars." },
    ],
  }),
});

interface Post {
  id: string;
  author_id: string;
  content: string | null;
  image_path: string | null;
  subject_id: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 20;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

function subjectOf(id: string | null) {
  if (!id) return null;
  return SUBJECTS.find((s) => s.id === id) ?? null;
}

function CommunityPage() {
  const { user, profile, loading: profileLoading } = useMyProfile();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  // Composer
  const [text, setText] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(async (before?: string) => {
    let q = supabase
      .from("posts")
      .select("id, author_id, content, image_path, subject_id, like_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Post[];
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadPage();
        if (cancelled) return;
        setPosts(rows);
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  // Fetch authors and my likes for visible posts
  useEffect(() => {
    if (!user || posts.length === 0) return;
    const missing = Array.from(new Set(posts.map((p) => p.author_id))).filter(
      (id) => !authors[id],
    );
    if (missing.length) {
      Promise.all(missing.map((id) => fetchProfile(id))).then((results) => {
        const next: Record<string, Profile> = {};
        results.forEach((p, i) => {
          if (p) next[missing[i]] = p;
        });
        if (Object.keys(next).length) setAuthors((prev) => ({ ...prev, ...next }));
      });
    }
    // Load my likes for visible posts
    const ids = posts.map((p) => p.id);
    supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", ids)
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setMyLikes(new Set(data.map((r) => r.post_id)));
      });
  }, [posts, user, authors]);

  // Realtime new posts
  useEffect(() => {
    const channel = supabase
      .channel("posts_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const p = payload.new as Post;
          setPosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const p = payload.old as { id: string };
          setPosts((prev) => prev.filter((x) => x.id !== p.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const p = payload.new as Post;
          setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || loadingMore || !hasMore) return;
      setLoadingMore(true);
      try {
        const last = posts[posts.length - 1];
        const rows = await loadPage(last?.created_at);
        setPosts((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load more");
      } finally {
        setLoadingMore(false);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadingMore, posts, loadPage]);

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const content = text.trim();
    if (!content && !pendingFile) return;
    setPosting(true);
    setError(null);
    try {
      let image_path: string | null = null;
      if (pendingFile) image_path = await uploadPostImage(pendingFile, user.id);
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        content: content ? content.slice(0, 2000) : null,
        image_path,
        subject_id: subject || null,
      });
      if (error) throw error;
      setText("");
      setPendingFile(null);
      setSubject("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post failed");
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (p: Post) => {
    if (!user || p.author_id !== user.id) return;
    if (!confirm("Delete this post?")) return;
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (p.image_path) await deletePostImage(p.image_path);
    await supabase.from("posts").delete().eq("id", p.id).eq("author_id", user.id);
  };

  const toggleLike = async (p: Post) => {
    if (!user) return;
    const liked = myLikes.has(p.id);
    // Optimistic
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, like_count: x.like_count + (liked ? -1 : 1) } : x,
      ),
    );
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: p.id, user_id: user.id });
    }
  };

  if (profileLoading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-2xl pb-24">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-primary grid place-items-center glow">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Community</h1>
              <p className="text-xs text-muted-foreground">
                Posting as <span className="text-gold font-semibold">{profile?.display_name ?? "…"}</span>
              </p>
            </div>
          </div>
          {profile && (
            <UserAvatar
              avatarId={profile.avatar_id}
              name={profile.display_name}
              size={40}
              ring
              onClick={() => navigate({ to: "/profile" })}
            />
          )}
        </div>

        {/* Composer */}
        <form onSubmit={submitPost} className="glass rounded-3xl p-4 md:p-5 mb-5 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a question, note, or study tip…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none bg-secondary rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
          />

          {pendingFile && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img
                src={URL.createObjectURL(pendingFile)}
                alt="Preview"
                className="w-full max-h-72 object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 grid place-items-center text-white"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={posting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
            >
              <ImagePlus className="h-4 w-4" /> Photo
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={posting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
            >
              <Camera className="h-4 w-4" /> Camera
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 text-xs">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-transparent focus:outline-none text-xs"
              >
                <option value="">No subject</option>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={posting || (!text.trim() && !pendingFile)}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-gold-foreground glow-gold disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/40 p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-lg font-semibold">Be the first to post</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Share a study question or a helpful note to kick off the community.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                mine={p.author_id === user?.id}
                author={p.author_id === user?.id ? profile : authors[p.author_id]}
                liked={myLikes.has(p.id)}
                onLike={() => toggleLike(p)}
                onDelete={() => deletePost(p)}
              />
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="py-6 grid place-items-center">
                {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">You're all caught up 🎉</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PostCard({
  post,
  mine,
  author,
  liked,
  onLike,
  onDelete,
}: {
  post: Post;
  mine: boolean;
  author: Profile | null | undefined;
  liked: boolean;
  onLike: () => void;
  onDelete: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const subj = subjectOf(post.subject_id);
  return (
    <article className="glass rounded-3xl p-4 md:p-5">
      <header className="flex items-start gap-3 mb-3">
        <UserAvatar avatarId={author?.avatar_id ?? 1} name={author?.display_name} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{author?.display_name ?? "Scholar"}</span>
            {mine && <span className="text-[10px] text-gold font-semibold">YOU</span>}
            <span className="text-xs text-muted-foreground">· {timeAgo(post.created_at)}</span>
          </div>
          {(author?.school || author?.course) && (
            <p className="text-[11px] text-muted-foreground truncate">
              {[author?.course, author?.school].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {subj && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold border"
            style={{ borderColor: subj.hue, color: subj.hue }}
          >
            {subj.emoji} {subj.short}
          </span>
        )}
        {mine && (
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {post.content && (
        <p className="text-sm whitespace-pre-wrap break-words mb-3 leading-relaxed">{post.content}</p>
      )}
      {post.image_path && (
        <div className="mb-3">
          <PostImage path={post.image_path} />
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-border/60">
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            liked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          {post.like_count}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comment_count}
        </button>
      </div>

      {showComments && <Comments postId={post.id} />}
    </article>
  );
}

function Comments({ postId }: { postId: string }) {
  const { user, profile } = useMyProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id, post_id, author_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      setComments((data ?? []) as Comment[]);
      setLoading(false);
    })();
    const ch = supabase
      .channel(`post_comments_${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        (payload) => {
          const c = payload.new as Comment;
          setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        (payload) => {
          const c = payload.old as { id: string };
          setComments((prev) => prev.filter((x) => x.id !== c.id));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [postId]);

  useEffect(() => {
    const missing = Array.from(new Set(comments.map((c) => c.author_id))).filter((id) => !authors[id]);
    if (!missing.length) return;
    Promise.all(missing.map((id) => fetchProfile(id))).then((res) => {
      const next: Record<string, Profile> = {};
      res.forEach((p, i) => {
        if (p) next[missing[i]] = p;
      });
      if (Object.keys(next).length) setAuthors((prev) => ({ ...prev, ...next }));
    });
  }, [comments, authors]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: user.id, content: content.slice(0, 1000) });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const del = async (c: Comment) => {
    if (!user || c.author_id !== user.id) return;
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    await supabase.from("post_comments").delete().eq("id", c.id).eq("author_id", user.id);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
      {loading ? (
        <div className="grid place-items-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No comments yet — be the first.</p>
      ) : (
        comments.map((c) => {
          const a = c.author_id === user?.id ? profile : authors[c.author_id];
          const mine = c.author_id === user?.id;
          return (
            <div key={c.id} className="flex gap-2">
              <UserAvatar avatarId={a?.avatar_id ?? 1} name={a?.display_name} size={28} />
              <div className="flex-1 min-w-0">
                <div className="bg-secondary rounded-2xl px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-xs">{a?.display_name ?? "Scholar"}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                    {mine && (
                      <button
                        onClick={() => del(c)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words leading-snug">{c.content}</p>
                </div>
              </div>
            </div>
          );
        })
      )}

      <form onSubmit={send} className="flex items-center gap-2 pt-2">
        <UserAvatar avatarId={profile?.avatar_id ?? 1} name={profile?.display_name} size={28} />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          maxLength={1000}
          className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="h-9 w-9 rounded-full bg-gradient-gold grid place-items-center text-gold-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

// Suppress unused warning for Link import in this simplified single-page feed.
void Link;
