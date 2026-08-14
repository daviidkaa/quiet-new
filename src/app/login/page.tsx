"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      document.cookie = `token=${data.token}; path=/`;
      window.location.href = "/";
    } else {
      alert(data.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-5xl tracking-[0.4em] font-light">quiet</h1>
      <p className="text-xs tracking-[0.3em] text-gray-400 mt-2">
        FOCUSED ON PRIVACY
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        className="mt-10 w-[360px] max-w-[92vw] rounded-2xl border border-gray-800 bg-black/40 backdrop-blur-xl p-6"
      >
        {/* USERNAME */}
        <label className="text-xs text-gray-400 tracking-widest">
          USERNAME
        </label>
        <input
          className="w-full mt-2 mb-5 px-3 py-2 bg-black border border-gray-800 rounded-lg outline-none focus:border-gray-500 text-sm"
          placeholder="example123"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* PASSWORD */}
        <label className="text-xs text-gray-400 tracking-widest">
          PASSWORD
        </label>
        <input
          type="password"
          autoComplete="current-password"
          className="w-full mt-2 px-3 py-2 bg-black border border-gray-800 rounded-lg outline-none focus:border-gray-500 text-sm"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full mt-6 bg-white text-black py-2 rounded-lg font-medium hover:bg-gray-200 transition"
        >
          Enter
        </button>

        <div className="flex justify-between text-xs text-gray-500 mt-4">
          <a
            href="/forgot-password"
            className="hover:text-white cursor-pointer"
          >
            Forgot password
          </a>
          <a href="/register" className="hover:text-white cursor-pointer">
            Create account
          </a>
        </div>
      </form>

      <p className="text-xs text-gray-600 mt-10">© QUIET</p>
    </div>
  );
}
