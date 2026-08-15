"use client";
import { motion } from "framer-motion";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage({
  params,
}: {
  params: Promise<{
    username: string;
  }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  async function handleFollow() {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch("/api/follow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        followingId: user.id,
      }),
    });

    const data = await res.json();

    setIsFollowing(data.following);

    setUser({
      ...user,
      _count: {
        ...user._count,
        followers: data.following
          ? user._count.followers + 1
          : user._count.followers - 1,
      },
    });
  }

  function formatPostDate(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: new Date(date).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem("token");

      let meData = null;

      if (token) {
        const meRes = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        meData = await meRes.json();

        setMe(meData);
      }

      const res = await fetch(`/api/profile/${resolvedParams.username}`);

      const data = await res.json();

      setUser(data.user);
      setPosts(data.posts);

      if (meData && data.user.followers) {
        const alreadyFollowing = data.user.followers.some(
          (f: any) => f.followerId === meData.id,
        );

        setIsFollowing(alreadyFollowing);
      }
    }

    fetchProfile();
  }, [resolvedParams.username]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const isOwnProfile = me?.id === user.id;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.25,
      }}
      className="min-h-screen bg-black text-white px-4 md:px-8 py-8"
    >
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-2 text-zinc-400 hover:text-white transition"
          aria-label="Go back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Back</span>
        </button>

        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 mb-7">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0 flex items-center justify-center text-4xl">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.username}'s avatar`}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight">
                  @{user.username}
                </div>

                {isOwnProfile ? (
                  <button
                    onClick={() => router.push("/settings")}
                    className="self-center md:self-auto px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 transition"
                  >
                    Edit profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`self-center md:self-auto px-5 py-2 rounded-xl text-sm font-medium transition ${
                      isFollowing
                        ? "bg-zinc-800 text-white hover:bg-zinc-700"
                        : "bg-white text-black hover:bg-zinc-200"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              <div className="text-zinc-400 mt-2 max-w-xl">
                {user.bio || "No bio yet"}
              </div>

              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-zinc-600 mt-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    user?.lastActive &&
                    Date.now() - new Date(user.lastActive).getTime() < 1000 * 60 * 5
                      ? "bg-emerald-400"
                      : "bg-zinc-700"
                  }`}
                />
                <span>
                  {user?.lastActive &&
                  Date.now() - new Date(user.lastActive).getTime() < 1000 * 60 * 5
                    ? "online now"
                    : "offline"}
                </span>
              </div>

              <div className="grid grid-cols-3 max-w-md mt-7 border-y border-zinc-900 py-4">
                <div className="text-center md:text-left">
                  <div className="text-white text-lg font-semibold">{user._count.posts}</div>
                  <div className="text-zinc-500 text-xs mt-1">posts</div>
                </div>
                <div className="text-center md:text-left border-x border-zinc-900 px-4">
                  <div className="text-white text-lg font-semibold">{user._count.followers}</div>
                  <div className="text-zinc-500 text-xs mt-1">followers</div>
                </div>
                <div className="text-center md:text-left pl-4">
                  <div className="text-white text-lg font-semibold">{user._count.following}</div>
                  <div className="text-zinc-500 text-xs mt-1">following</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mb-4 mt-8">
          <div>
            <div className="text-white font-medium">Posts</div>
            <div className="text-zinc-600 text-xs mt-1">
              {user._count.posts} {user._count.posts === 1 ? "post" : "posts"}
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-10 text-center">
            <div className="text-5xl mb-5">🖤</div>
            <div className="text-white text-lg">No posts yet</div>
            <div className="text-zinc-500 text-sm mt-2">
              Share your first quiet moment
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((p) => (
              <motion.article
                key={p.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.18 }}
                className="group overflow-hidden bg-zinc-950 border border-zinc-900 rounded-3xl hover:border-zinc-800 transition-colors"
              >
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    <span className="text-xs text-zinc-500">
                      {p.createdAt ? formatPostDate(p.createdAt) : ""}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-700">
                    quiet moment
                  </span>
                </div>

                {p.content && (
                  <div className="px-6 pb-5">
                    <p className="text-[15px] text-zinc-100 leading-7 whitespace-pre-wrap">
                      {p.content}
                    </p>
                  </div>
                )}

                {p.image && (
                  <div className={`${p.content ? "px-5 pb-5" : "px-5 pb-5 pt-1"}`}>
                    <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-black">
                      <img
                        src={p.image}
                        alt="Post"
                        className="block w-full max-h-[560px] object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                      />
                    </div>
                  </div>
                )}

                <div className="h-px bg-zinc-900/80 mx-6" />
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-700">@{user.username}</span>
                  <span className="text-xs text-zinc-700">#{p.id}</span>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
