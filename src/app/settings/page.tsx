"use client";

import { useEffect, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";

export default function SettingsPage() {
  const { startUpload } = useUploadThing("imageUploader");

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    const token = localStorage.getItem("token");

    if (!token) return;

    setSaving(true);

    await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        bio,
        avatar,
      }),
    });

    setSaving(false);

    toast.success("Settings saved!");
  }

  useEffect(() => {
    async function fetchMe() {
      const token = localStorage.getItem("token");

      if (!token) return;

      const res = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setUsername(data.username || "");
      setBio(data.bio || "");
      setAvatar(data.avatar || "");
    }

    fetchMe();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-4 md:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-4xl tracking-[0.2em] font-light">settings</h1>

          <p className="text-zinc-500 mt-2">manage your quiet account</p>
        </div>

        {/* CARD */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
          {/* AVATAR */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl">
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" />
              ) : (
                username?.[0]?.toUpperCase()
              )}
            </div>

            <div>
              <label className="bg-white text-black px-5 py-2 rounded-2xl text-sm font-medium cursor-pointer hover:opacity-90 transition inline-block">
                Change Avatar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    const res = await startUpload([file]);

                    if (res?.[0]?.ufsUrl) {
                      setAvatar(res[0].ufsUrl);
                    }
                  }}
                />
              </label>

              <p className="text-zinc-500 text-sm mt-3">JPG, PNG or WEBP</p>
            </div>
          </div>

          {/* FORM */}
          <div className="space-y-5">
            {/* USERNAME */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Username
              </label>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-zinc-900 rounded-2xl px-4 py-3 outline-none focus:border-zinc-700 transition"
                placeholder="@username"
              />
            </div>

            {/* BIO */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Bio</label>

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                className="w-full bg-black/40 border border-zinc-900 rounded-2xl px-4 py-3 outline-none resize-none min-h-[120px] focus:border-zinc-700 transition"
                placeholder="Tell people something about yourself..."
              />

              <div className="text-right text-xs text-zinc-500 mt-2">
                {bio.length}/160
              </div>
            </div>

            {/* BUTTON */}
            <button
              disabled={saving}
              onClick={saveSettings}
              className="bg-white text-black px-6 py-3 rounded-2xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* LIVE PREVIEW */}
        <div className="mt-8 bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
          <div className="text-sm text-zinc-500 mb-5">Live Preview</div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl">
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" />
              ) : (
                username?.[0]?.toUpperCase()
              )}
            </div>

            <div>
              <div className="text-white text-lg">
                @{username || "username"}
              </div>

              <div className="text-zinc-500 text-sm mt-1">
                {bio || "No bio yet"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
