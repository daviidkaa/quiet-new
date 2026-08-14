"use client";
import { motion } from "framer-motion";
import { use, useEffect, useState } from "react";

export default function ProfilePage({
  params,
}: {
  params: Promise<{
    username: string;
  }>;
}) {
  const resolvedParams = use(params);

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
        {/* Profile Header */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 md:p-10 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-8">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-4xl">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>

            <div className="text-center md:text-left">
              <div className="text-3xl md:text-4xl font-semibold text-center md:text-left">
                @{user.username}
              </div>

              <div className="text-zinc-500 mt-2">
                {user.bio || "No bio yet"}
              </div>
              <div className="text-xs text-zinc-600 mt-3">
                {user?.lastActive &&
                Date.now() - new Date(user.lastActive).getTime() < 1000 * 60 * 5
                  ? "online now"
                  : "offline"}
              </div>
              {me?.id !== user.id && (
                <button
                  onClick={handleFollow}
                  className={`mt-5 px-5 py-2 rounded-2xl text-sm font-medium transition ${
                    isFollowing
                      ? "bg-zinc-800 text-white hover:bg-zinc-700"
                      : "bg-white text-black hover:opacity-90"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}

              <div className="flex items-center gap-10 mt-6">
                <div>
                  <div className="text-white text-lg font-medium">
                    {user._count.posts}
                  </div>

                  <div className="text-zinc-500 text-xs mt-1">posts</div>
                </div>

                <div>
                  <div className="text-white text-lg font-medium">
                    {user._count.followers}
                  </div>

                  <div className="text-zinc-500 text-xs mt-1">followers</div>
                </div>

                <div>
                  <div className="text-white text-lg font-medium">
                    {user._count.following}
                  </div>

                  <div className="text-zinc-500 text-xs mt-1">following</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-zinc-500 text-sm mb-4 mt-10">Posts</div>
        {/* POSTS */}
        {posts.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-10 text-center">
            <div className="text-5xl mb-5">🖤</div>

            <div className="text-white text-lg">No posts yet</div>

            <div className="text-zinc-500 text-sm mt-2">
              Share your first quiet moment
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <div
                key={p.id}
                className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition"
              >
                {p.content && (
                  <div className="text-zinc-100 leading-7">{p.content}</div>
                )}

                {p.image && (
                  <div className="mt-5 flex justify-center">
                    <img
                      src={p.image}
                      className="rounded-2xl border border-zinc-900 w-full md:max-w-3xl max-h-[600px] object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
