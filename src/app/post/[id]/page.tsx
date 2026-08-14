"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Heart, ArrowLeft } from "lucide-react";

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      const res = await fetch(`/api/posts/${params.id}`);

      const data = await res.json();

      setPost(data);

      setLoading(false);
    }

    fetchPost();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Post not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* BACK */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-6"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* POST */}
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
            duration: 0.3,
          }}
          className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5"
        >
          {/* USER */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              {post.user?.avatar ? (
                <img
                  src={post.user.avatar}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.user?.username?.[0]?.toUpperCase()
              )}
            </div>

            <div>
              <div className="text-white">@{post.user?.username}</div>

              <div className="text-xs text-zinc-500 mt-1">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="text-[15px] leading-7 text-zinc-100 break-words">
            {post.content}
          </div>

          {/* IMAGE */}
          {post.image && (
            <img
              src={post.image}
              className="mt-5 rounded-3xl border border-zinc-900 w-full max-h-[500px] object-cover"
            />
          )}

          {/* STATS */}
          <div className="flex items-center gap-6 mt-6 text-zinc-500 text-sm">
            <div className="flex items-center gap-2">
              <Heart size={17} />
              {post._count.likes}
            </div>

            <div>💬 {post._count.comments}</div>
          </div>
        </motion.div>

        {/* COMMENTS */}
        <div className="mt-6 space-y-4">
          {post.comments.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-10 text-center">
              <div className="text-5xl mb-5">💬</div>

              <div className="text-white text-lg">No comments yet</div>

              <div className="text-zinc-500 text-sm mt-2">
                Start the conversation
              </div>
            </div>
          ) : (
            post.comments.map((c: any) => (
              <div
                key={c.id}
                className="bg-zinc-950 border border-zinc-900 rounded-3xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-sm shrink-0">
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
