"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function InviteAdminPage() {
  const [invites, setInvites] = useState<any[]>([]);

  const [reusable, setReusable] = useState(false);

  const [authorized, setAuthorized] = useState<boolean | null>(null);

  async function fetchInvites() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/admin/invites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (Array.isArray(data)) {
      setInvites(data);
    }
  }

  async function createInvite() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/admin/invites", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        reusable,
      }),
    });

    const data = await res.json();

    setInvites((prev) => [data, ...prev]);

    toast.success("Invite created");
  }

  async function deleteInvite(id: number) {
    const token = localStorage.getItem("token");

    await fetch(`/api/admin/invites?id=${id}`, {
      method: "DELETE",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setInvites((prev) => prev.filter((i) => i.id !== id));

    toast.success("Invite deleted");
  }

  useEffect(() => {
    async function checkAccess() {
      const token = localStorage.getItem("token");

      if (!token) {
        setAuthorized(false);
        return;
      }

      const res = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = await res.json();

      if (user.role !== "developer") {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      fetchInvites();
    }

    checkAccess();
  }, []);

  // LOADING
  if (authorized === null) {
    return <div className="min-h-screen bg-black" />;
  }

  // FAKE 404
  if (authorized === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-7xl font-light">404</div>

          <div className="text-zinc-500 mt-3">page not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl tracking-[0.2em] font-light">invites</h1>

            <p className="text-zinc-500 mt-2">manage private access</p>
          </div>

          <button
            onClick={createInvite}
            className="bg-white text-black px-5 py-3 rounded-2xl font-medium"
          >
            Create Invite
          </button>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-3 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={reusable}
              onChange={(e) => setReusable(e.target.checked)}
            />
            Reusable invite
          </label>
        </div>

        <div className="space-y-4">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 flex items-center justify-between"
            >
              <div>
                <div className="text-xl text-white tracking-widest">
                  {invite.code}
                </div>

                <div className="text-sm text-zinc-500 mt-2">
                  {invite.reusable
                    ? "Reusable"
                    : invite.used
                      ? "Used"
                      : "Unused"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invite.code);

                    toast.success("Copied");
                  }}
                  className="px-4 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition"
                >
                  Copy
                </button>

                <button
                  onClick={() => deleteInvite(invite.id)}
                  className="px-4 py-2 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
