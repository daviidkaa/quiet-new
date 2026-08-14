"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicKey, setPublicKey] = useState("");

  async function generateKeys() {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },

      true,

      ["encrypt", "decrypt"],
    );

    // EXPORT PUBLIC
    const exportedPublic = await crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey,
    );

    // EXPORT PRIVATE
    const exportedPrivate = await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey,
    );

    // TO BASE64
    const publicBase64 = btoa(
      String.fromCharCode(...new Uint8Array(exportedPublic)),
    );

    const privateBase64 = btoa(
      String.fromCharCode(...new Uint8Array(exportedPrivate)),
    );

    // SAVE PRIVATE KEY
    localStorage.setItem("privateKey", privateBase64);
    localStorage.setItem("publicKey", publicBase64);

    setPublicKey(publicBase64);

    return publicBase64;
  }

  async function handleRegister() {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail) {
      alert("Enter a valid email");
      return;
    }
    const generatedPublicKey = await generateKeys();
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        username,
        email,
        inviteCode,
        password,
        publicKey: generatedPublicKey,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      alert("Account created");

      window.location.href = "/login";
    } else {
      alert(data.error || "Register failed");
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
      {/* LOGO */}
      <h1 className="text-5xl tracking-[0.4em] font-light">quiet</h1>

      <p className="text-xs tracking-[0.3em] text-gray-400 mt-2">
        FOCUSED ON PRIVACY
      </p>

      {/* CARD */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRegister();
        }}
        className="mt-10 w-full max-w-[380px] rounded-2xl border border-gray-800 bg-black/40 backdrop-blur-xl p-6"
      >
        {/* USERNAME */}
        <label className="text-xs text-gray-400 tracking-widest">
          USERNAME
        </label>

        <input
          autoComplete="username"
          className="w-full mt-2 mb-5 px-3 py-2 bg-black border border-gray-800 rounded-lg outline-none focus:border-gray-500 text-sm"
          placeholder="choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* EMAIL */}
        <label className="text-xs text-gray-400 tracking-widest">EMAIL</label>

        <input
          type="email"
          autoComplete="email"
          className="w-full mt-2 mb-5 px-3 py-2 bg-black border border-gray-800 rounded-lg outline-none focus:border-gray-500 text-sm"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* INVITE */}
        <label className="text-xs text-gray-400 tracking-widest">
          INVITE CODE
        </label>

        <input
          className="w-full mt-2 mb-5 px-3 py-2 bg-black border border-gray-800 rounded-lg outline-none focus:border-gray-500 text-sm"
          placeholder="enter invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />

        {/* PASSWORD */}
        <label className="text-xs text-gray-400 tracking-widest">
          PASSWORD
        </label>

        <div className="relative mt-2">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg outline-none focus:border-gray-500 text-sm pr-14"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white transition"
          >
            {showPassword ? "HIDE" : "SHOW"}
          </button>
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-white text-black py-2 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create account"}
        </button>

        {/* FOOTER */}
        <div className="flex justify-center text-xs text-gray-500 mt-4">
          <a href="/login" className="hover:text-white transition">
            Already have an account?
          </a>
        </div>
      </form>

      {/* BOTTOM */}
      <p className="text-xs text-gray-600 mt-10">© QUIET</p>
    </div>
  );
}
