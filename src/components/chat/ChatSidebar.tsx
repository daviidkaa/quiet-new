"use client";
import { useState } from "react";
export default function ChatSidebar({
  conversations,
  users,
  selectedUser,
  onSelectUser,
  onlineUsers,
  unreadCounts,
}: any) {
  //console.log(users);
  const [showNewChats, setShowNewChats] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div className="w-full md:w-[340px] border-r border-zinc-800 h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800">
        <h1 className="text-2xl tracking-[0.25em] font-light text-white">
          quiet
        </h1>

        <p className="text-xs text-zinc-500 mt-1">FOCUSED ON PRIVACY</p>
      </div>

      {/* Search */}
      <div className="p-4">
        <input
          placeholder="Search conversations..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-zinc-600"
        />
      </div>

      {/* Conversations */}
      <div className="overflow-y-auto px-3 space-y-2 flex-1 min-h-0">
        {conversations.map((conv: any) => (
          <button
            key={conv.user.id}
            onClick={() => onSelectUser(conv.user)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition ${
              selectedUser?.id === conv.user.id
                ? "bg-zinc-900"
                : "hover:bg-zinc-900/50"
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white">
                {conv.user.username[0].toUpperCase()}
              </div>

              {/* Real online status */}
              {onlineUsers.includes(Number(conv.user.id)) && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
              )}
            </div>

            {/* Text */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white truncate">
                @{conv.user.username}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[10px] text-zinc-500">
                  {new Date(conv.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {unreadCounts[conv.user.id] > 0 && (
                  <div className="min-w-5 h-5 px-1 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-medium">
                    {unreadCounts[conv.user.id]}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-zinc-500 truncate mt-1">
              {conv.lastMessage}
            </div>
          </button>
        ))}
      </div>

      {/* New Chats */}
      <div className="border-t border-zinc-800 p-3 bg-black">
        <button
          onClick={() => setShowNewChats(!showNewChats)}
          className="w-full flex items-center justify-between text-xs text-zinc-500 uppercase tracking-widest mb-3 hover:text-white transition"
        >
          <span>Start New Chat</span>

          <span className="text-lg">{showNewChats ? "−" : "+"}</span>
        </button>
        {showNewChats && (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {users.map((user: any) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-900/50 transition"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white">
                  {user.username[0].toUpperCase()}
                </div>

                <div className="text-sm text-white">@{user.username}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
