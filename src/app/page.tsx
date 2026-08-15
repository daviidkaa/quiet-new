"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Heart } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { House, Search, MessageCircle, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PullToRefresh from "react-simple-pull-to-refresh";
import PageTransition from "@/components/PageTransition";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [commentInputs, setCommentInputs] = useState<any>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [postImage, setPostImage] = useState("");
  const [search, setSearch] = useState("");
  const [showMobilePost, setShowMobilePost] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [followingUsers, setFollowingUsers] = useState<Record<number, boolean>>(
    {},
  );
  const [followingLoading, setFollowingLoading] = useState<number | null>(null);

  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    const refreshInBackground = () => {
      if (document.visibilityState !== "visible") return;
      void fetchPosts(token, true);
      void fetchNotifications(token);
    };

    // Keep the feed current without repeatedly showing its loading state.
    const interval = setInterval(refreshInBackground, 30_000);
    document.addEventListener("visibilitychange", refreshInBackground);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshInBackground);
    };
  }, [token]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);
  async function fetchMe(currentToken: string | null) {
    if (!currentToken) return;

    const res = await fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await res.json();

    setMe(data);
  }

  async function fetchNotifications(currentToken: string | null) {
    if (!currentToken) return;

    const res = await fetch("/api/notifications", {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await res.json();

    if (Array.isArray(data)) {
      setNotifications(data);
    }
  }

  async function markAllNotificationsRead() {
    if (!token) return;

    const res = await fetch("/api/notifications/read", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      toast.error("Unable to mark notifications as read");
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Notifications marked as read");
  }

  async function handleComment(postId: number) {
    if (!token || !me) return;

    const content = commentInputs[postId];

    if (!content?.trim()) return;

    const res = await fetch("/api/comment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postId,
        content,
      }),
    });

    const newComment = await res.json();

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        return {
          ...p,

          comments: [...p.comments, newComment],

          _count: {
            ...p._count,
            comments: p._count.comments + 1,
          },
        };
      }),
    );

    setCommentInputs((prev: any) => ({
      ...prev,
      [postId]: "",
    }));
  }

  async function handleLike(postId: number) {
    if (!token || !me) return;

    const res = await fetch("/api/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postId,
      }),
    });

    const data = await res.json();

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        return {
          ...p,

          likes: data.liked
            ? [...p.likes, { userId: me.id }]
            : p.likes.filter((l: any) => l.userId !== me.id),

          _count: {
            ...p._count,
            likes: data.liked ? p._count.likes + 1 : p._count.likes - 1,
          },
        };
      }),
    );
  }

  async function fetchPosts(currentToken: string | null, background = false) {
    if (!currentToken) return;

    if (!background) setPostsLoading(true);

    try {
      const res = await fetch("/api/posts", {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        cache: "no-store",
      });

      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data)) {
        setPosts((currentPosts) =>
          JSON.stringify(currentPosts) === JSON.stringify(data)
            ? currentPosts
            : data,
        );
      }
    } finally {
      if (!background) setPostsLoading(false);
    }
  }

  async function saveEdit() {
    if (!editingPost || !token) return;

    await fetch(`/api/posts/${editingPost.id}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        content: editContent,
      }),
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === editingPost.id
          ? {
              ...p,
              content: editContent,
            }
          : p,
      ),
    );

    toast.success("Post updated");

    setEditingPost(null);
  }

  async function deletePost(postId: number) {
    if (!token) return;
    const confirmed = confirm("Delete this post?");
    if (!confirmed) return;
    await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Post deleted");
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();

    if (Array.isArray(data)) {
      setUsers(data);
      setFollowingUsers(
        Object.fromEntries(
          data.map((user: any) => [user.id, Boolean(user.isFollowing)]),
        ),
      );
    }
  }

  const filteredUsers = search
    ? users.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()),
      )
    : users.slice(0, 5);
  async function createPost() {
    if (!token) return;

    await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        image: postImage,
      }),
    });

    setContent("");
    setPostImage("");
    fetchPosts(token);
  }

  async function followUser(userId: number) {
    if (!token || followingLoading === userId) return;

    setFollowingLoading(userId);

    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followingId: userId,
        }),
      });

      const data = await res.json();

      if (!res.ok || typeof data.following !== "boolean") {
        toast.error(data.error || "Unable to update follow");
        return;
      }

      setFollowingUsers((prev) => ({
        ...prev,
        [userId]: data.following,
      }));

      toast.success(data.following ? "User followed" : "User unfollowed");
    } catch {
      toast.error("Unable to update follow");
    } finally {
      setFollowingLoading(null);
    }
  }

  useEffect(() => {
    if (!loading && token) {
      fetchMe(token);
      fetchPosts(token);
      fetchUsers();
      fetchNotifications(token);
    }
  }, [loading, token]);
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[999] overflow-hidden">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
          }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-7xl tracking-[0.35em] font-light text-white">
            quiet
          </h1>

          <p className="text-zinc-500 text-xs md:text-sm mt-4 tracking-[0.4em]">
            PRIVATE COMMUNICATION
          </p>
        </motion.div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white px-4 md:px-8 py-6 overflow-x-hidden">
        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
          }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl tracking-[0.25em] font-light text-white">
              quiet
            </h1>

            <p className="text-zinc-500 text-sm mt-1 tracking-[0.2em] hidden md:block">
              PRIVATE COMMUNICATION
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/chat")}
              className="bg-white text-black px-5 py-2 rounded-2xl text-sm font-medium hover:opacity-90 transition cursor-pointer"
            >
              Messages
            </button>
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative text-zinc-400 hover:text-white transition cursor-pointer"
            >
              🔔
              {notifications.some((n) => !n.read) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {showNotifications && (
              <>
                {/* OVERLAY */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                {/* MODAL */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-14 w-[340px] max-w-[calc(100vw-2rem)] bg-zinc-950 border border-zinc-900 rounded-3xl p-3 shadow-2xl z-50"
                >
                  <div className="flex items-center justify-between gap-3 px-2 mb-3">
                    <div className="text-sm font-medium text-white">
                      Notifications
                    </div>
                    {notifications.some((n) => !n.read) && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-zinc-500 hover:text-white transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <div className="text-5xl mb-5"> 🔔 </div>
                        <div className="text-white text-lg">
                          You're all caught up
                        </div>
                        <div className="text-zinc-500 text-sm mt-2">
                          New activity will appear here
                        </div>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (n.type === "follow") {
                              router.push(`/profile/${n.actor.username}`);
                            }
                            setShowNotifications(false);
                          }}
                          className={`w-full text-left p-3 rounded-2xl transition ${
                            n.read
                              ? "hover:bg-zinc-900"
                              : "bg-zinc-900/60 hover:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-white">
                                {n.actor?.avatar ? (
                                  <img
                                    src={n.actor.avatar}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  n.actor?.username?.[0]?.toUpperCase()
                                )}
                              </div>
                              {!n.read && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-zinc-950" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-white leading-5">
                                <span className="font-medium">
                                  @{n.actor.username}
                                </span>{" "}
                                <span className="text-zinc-300">
                                  {n.type === "follow" && "followed you"}
                                  {n.type === "like" && "liked your post"}
                                  {n.type === "comment" &&
                                    "commented on your post"}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-600 mt-1">
                                {formatDistanceToNow(new Date(n.createdAt), {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  {me?.avatar ? (
                    <img
                      src={me.avatar}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    me?.username?.[0]?.toUpperCase()
                  )}
                </div>

                <div className="hidden sm:block">
                  <div className="text-sm text-white group-hover:text-zinc-300 transition">
                    @{me?.username}
                  </div>

                  <div className="text-xs text-zinc-500">
                    {me?.lastActive &&
                    Date.now() - new Date(me.lastActive).getTime() <
                      1000 * 60 * 5
                      ? "online now"
                      : "offline"}
                  </div>
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-16 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <button
                    onClick={() => router.push(`/profile/${me?.username}`)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-900 transition text-sm text-white cursor-pointer"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => router.push("/settings")}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-900 transition text-sm text-white cursor-pointer"
                  >
                    Settings
                  </button>

                  <div className="h-px bg-zinc-800" />

                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      document.cookie =
                        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                      window.location.href = "/login";
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-500/10 transition text-sm text-red-400 cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        {!token && <p className="text-gray-400">Please login first.</p>}
        {token && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.4,
            }}
            className="grid grid-cols-1 xl:grid-cols-[320px_1fr_320px] gap-6"
          >
            {/* LEFT */}
            {/* LEFT */}
            <div className="hidden md:block">
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5">
                <div className="mb-4">
                  <h2 className="text-xl font-medium text-white">Share</h2>

                  <p className="text-zinc-500 text-sm mt-1">
                    private thoughts with your network
                  </p>
                </div>

                <textarea
                  className="w-full bg-black/40 border border-zinc-900 rounded-2xl p-4 outline-none text-white resize-none min-h-[140px]"
                  placeholder="Write something private..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="mt-4">
                  <label className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl text-sm cursor-pointer hover:bg-zinc-800 transition inline-block">
                    Add Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        const res = await startUpload([file]);

                        if (res?.[0]?.ufsUrl) {
                          setPostImage(res[0].ufsUrl);
                        }
                      }}
                    />
                  </label>

                  {postImage && (
                    <img
                      src={postImage}
                      className="mt-4 rounded-2xl border border-zinc-900 max-h-[400px]"
                    />
                  )}
                </div>
                <motion.button
                  whileHover={{
                    scale: 1.01,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  transition={{
                    duration: 0.15,
                  }}
                  onClick={createPost}
                  className="mt-4 w-full bg-white text-black py-3 rounded-2xl font-medium hover:opacity-90 transition cursor-pointer"
                >
                  Publish
                </motion.button>
              </div>
            </div>
            {/* FEED */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-medium text-white">Feed</h2>

                  <p className="text-zinc-500 text-sm mt-1">
                    private updates from your network
                  </p>
                </div>
              </div>

              <PullToRefresh
                onRefresh={async () => {
                  if (token) {
                    await fetchPosts(token);
                    await fetchNotifications(token);
                  }
                }}
              >
                {" "}
                <div className="space-y-4">
                  {postsLoading
                    ? [...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-zinc-950 border border-zinc-900 rounded-3xl p- animate-pulse"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-900" />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="h-4 w-24 rounded bg-zinc-900" />
                                <div className="h-3 w-16 rounded bg-zinc-900" />
                              </div>

                              <div className="space-y-2">
                                <div className="h-4 rounded bg-zinc-900 w-full" />
                                <div className="h-4 rounded bg-zinc-900 w-[90%]" />
                                <div className="h-4 rounded bg-zinc-900 w-[70%]" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    : posts.map((p) => (
                        <motion.div
                          key={p.id}
                          whileHover={{
                            y: -2,
                          }}
                          transition={{
                            duration: 0.18,
                          }}
                          className="bg-zinc-950 border border-zinc-900 rounded-3xl p-4 md:p-5 hover:border-zinc-800 transition w-full overflow-hidden"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                              {p.user?.avatar ? (
                                <img
                                  src={p.user.avatar}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                p.user?.username?.[0]?.toUpperCase()
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <a
                                    href={`/profile/${p.user?.username}`}
                                    className="text-sm text-white hover:text-zinc-300 transition"
                                  >
                                    @{p.user?.username}
                                  </a>

                                  <div className="text-xs text-zinc-600">
                                    {formatDistanceToNow(
                                      new Date(p.createdAt),
                                      {
                                        addSuffix: true,
                                      },
                                    )}
                                  </div>
                                </div>

                                {p.userId === me?.id && (
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setOpenMenu(
                                          openMenu === p.id ? null : p.id,
                                        )
                                      }
                                      className="text-zinc-500 hover:text-white transition text-lg"
                                    >
                                      ⋯
                                    </button>

                                    {openMenu === p.id && (
                                      <div className="absolute right-0 top-8 w-44 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden z-50">
                                        <button
                                          onClick={() => {
                                            setEditingPost(p);
                                            setEditContent(p.content);
                                            setOpenMenu(null);
                                          }}
                                          className="w-full text-left px-4 py-3 hover:bg-zinc-900 transition text-sm text-white"
                                        >
                                          {" "}
                                          Edit Post{" "}
                                        </button>

                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              `${window.location.origin}/post/${p.id}`,
                                            );

                                            toast.success("Link copied");

                                            setOpenMenu(null);
                                          }}
                                          className="w-full text-left px-4 py-3 hover:bg-zinc-900 transition text-sm text-white"
                                        >
                                          Copy Link
                                        </button>

                                        <button
                                          onClick={() => {
                                            deletePost(p.id);
                                            setOpenMenu(null);
                                          }}
                                          className="w-full text-left px-4 py-3 hover:bg-red-500/10 transition text-sm text-red-400"
                                        >
                                          Delete Post
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="text-[15px] leading-7 text-zinc-100 break-words">
                                {p.content}
                              </div>

                              {p.image && (
                                <img
                                  src={p.image}
                                  onClick={() => setSelectedImage(p.image)}
                                  className="mt-5 rounded-2xl md:rounded-3xl border border-zinc-900 w-full h-auto max-h-[420px] object-cover cursor-zoom-in hover:opacity-95 transition"
                                />
                              )}

                              <div className="flex items-center gap-5 mt-5">
                                {/* LIKE */}
                                <div className="flex items-center gap-2 cursor-pointer">
                                  <motion.button
                                    whileTap={{ scale: 1.25 }}
                                    onClick={() => handleLike(p.id)}
                                    animate={
                                      p.likes.some(
                                        (l: any) => l.userId === me?.id,
                                      )
                                        ? { scale: [1, 1.3, 1] }
                                        : {}
                                    }
                                    className={`transition ${
                                      p.likes.some(
                                        (l: any) => l.userId === me?.id,
                                      )
                                        ? "text-red-500"
                                        : "text-zinc-500 hover:text-white"
                                    }`}
                                  >
                                    <Heart
                                      className="cursor-pointer"
                                      size={18}
                                      fill={
                                        p.likes.some(
                                          (l: any) => l.userId === me?.id,
                                        )
                                          ? "currentColor"
                                          : "none"
                                      }
                                    />
                                  </motion.button>

                                  <div className="text-sm text-zinc-500">
                                    {p._count.likes}
                                  </div>
                                </div>

                                {/* COMMENTS */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPost(p);
                                      setShowComments(true);
                                    }}
                                    className="text-zinc-500 hover:text-white transition cursor-pointer"
                                  >
                                    💬
                                  </button>

                                  <div className="text-sm text-zinc-500">
                                    {p._count.comments}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                </div>
              </PullToRefresh>
            </div>
            {/* USERS */}
            <div className="hidden xl:block">
              <div className="mb-5">
                <h2 className="text-xl font-medium text-white">Discover</h2>

                <p className="text-zinc-500 text-sm mt-1">
                  connect privately with people
                </p>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full mt-4 bg-black/40 border border-zinc-900 rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-3xl p-4 flex items-center justify-between hover:border-zinc-800 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          u.username[0].toUpperCase()
                        )}
                      </div>

                      <div>
                        <a
                          href={`/profile/${u.username}`}
                          className="text-sm text-white hover:text-zinc-300 transition"
                        >
                          @{u.username}
                        </a>

                        <div className="text-xs text-zinc-500 mt-0.5">
                          available on quiet
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{
                        scale: followingLoading === u.id ? 1 : 1.03,
                      }}
                      whileTap={{
                        scale: followingLoading === u.id ? 1 : 0.96,
                      }}
                      transition={{
                        duration: 0.15,
                      }}
                      onClick={() => followUser(u.id)}
                      disabled={followingLoading === u.id}
                      className={`px-5 py-2 rounded-2xl text-sm font-medium transition ${
                        followingUsers[u.id]
                          ? "bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800"
                          : "bg-white text-black hover:opacity-90"
                      } ${
                        followingLoading === u.id
                          ? "opacity-60 cursor-wait"
                          : "cursor-pointer"
                      }`}
                    >
                      {followingLoading === u.id
                        ? "..."
                        : followingUsers[u.id]
                          ? "Following"
                          : "Follow"}
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <button
          onClick={() => setShowMobilePost(true)}
          className="fixed bottom-28 right-4 z-50 md:hidden w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-2xl shadow-2xl"
        >
          +
        </button>
        {showMobilePost && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden flex items-end">
            <div className="w-full bg-zinc-950 border-t border-zinc-900 rounded-t-3xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="text-lg text-white font-medium">New Post</div>

                <button
                  onClick={() => setShowMobilePost(false)}
                  className="text-zinc-500"
                >
                  ✕
                </button>
              </div>

              <textarea
                className="w-full bg-black/40 border border-zinc-900 rounded-2xl p-4 outline-none text-white resize-none min-h-[140px]"
                placeholder="Write something..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <button
                onClick={() => {
                  createPost();
                  setShowMobilePost(false);
                }}
                className="mt-4 w-full bg-white text-black py-3 rounded-2xl font-medium"
              >
                Publish
              </button>
            </div>
          </div>
        )}
        {showComments && selectedPost && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
          >
            <motion.div
              initial={{
                y: 80,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: 80,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="w-full md:max-w-2xl h-[85vh] md:h-[80vh] bg-zinc-950 border border-zinc-900 rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-900">
                <div>
                  <div className="text-white font-medium">Comments</div>

                  <div className="text-xs text-zinc-500 mt-1">
                    @{selectedPost.user.username}
                  </div>
                </div>

                <button
                  onClick={() => setShowComments(false)}
                  className="text-zinc-500 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              {/* POST */}
              <div className="p-5 border-b border-zinc-900">
                <div className="text-sm text-zinc-100 leading-7">
                  {selectedPost.content}
                </div>

                {selectedPost.image && (
                  <img
                    src={selectedPost.image}
                    className="mt-4 rounded-2xl w-full max-h-[300px] object-cover"
                  />
                )}
              </div>
              {/* COMMENTS */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {selectedPost.comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-5xl mb-5">💬</div>

                    <div className="text-white text-lg">No comments yet</div>

                    <div className="text-zinc-500 text-sm mt-2">
                      Start the conversation
                    </div>
                  </div>
                ) : (
                  selectedPost.comments.map((c: any) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-xs shrink-0">
                        {c.user.avatar ? (
                          <img
                            src={c.user.avatar}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.user.username[0].toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="text-sm text-white mb-1">
                          @{c.user.username}
                        </div>

                        <div className="text-sm text-zinc-300 leading-6">
                          {c.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* INPUT */}
              <div className="p-5 border-t border-zinc-900">
                <div className="flex items-center gap-3">
                  <input
                    value={commentInputs[selectedPost.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev: any) => ({
                        ...prev,
                        [selectedPost.id]: e.target.value,
                      }))
                    }
                    placeholder="Add a comment..."
                    className="flex-1 bg-black/40 border border-zinc-900 rounded-2xl px-4 py-3 text-sm outline-none"
                  />

                  <button
                    onClick={async () => {
                      await handleComment(selectedPost.id);

                      fetchPosts(token);
                    }}
                    className="bg-white text-black px-5 py-3 rounded-2xl text-sm font-medium"
                  >
                    Post
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="mx-4 mb-4 bg-zinc-950/90 backdrop-blur-xl border border-zinc-900 rounded-3xl px-6 py-3 flex items-center justify-between">
            <button onClick={() => router.push("/")} className="text-white">
              <House size={22} />
            </button>

            <button className="text-zinc-500">
              <Search size={22} />
            </button>

            <button
              onClick={() => router.push("/chat")}
              className="text-zinc-500"
            >
              <MessageCircle size={22} />
            </button>

            <button
              onClick={() => router.push(`/profile/${me?.username}`)}
              className="text-zinc-500"
            >
              <User size={22} />
            </button>
          </div>
        </div>
        {editingPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{
                scale: 0.96,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-3xl p-6"
            >
              <div className="text-xl text-white mb-5">Edit Post</div>

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-black/40 border border-zinc-900 rounded-2xl p-4 outline-none text-white resize-none min-h-[160px]"
              />

              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={() => setEditingPost(null)}
                  className="px-5 py-3 rounded-2xl text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>

                <button
                  onClick={saveEdit}
                  className="bg-white text-black px-6 py-3 rounded-2xl font-medium"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage("")}
          >
            <motion.img
              initial={{
                scale: 0.92,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              src={selectedImage}
              className="max-w-full max-h-full rounded-3xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={() => setSelectedImage("")}
              className="absolute top-6 right-6 text-white text-3xl"
            >
              ✕
            </button>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
