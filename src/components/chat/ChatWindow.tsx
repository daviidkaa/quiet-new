"use client";

import { useUploadThing } from "@/lib/uploadthing";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatWindow({
  socket,
  selectedUser,
  messages,
  message,
  setMessage,
  sendMessage,
  imageUrl,
  setImageUrl,
  typingUser,
  encryptionError,
  pendingDevices,
  approveDevice,
  onBack,
}: any) {
  const { startUpload } = useUploadThing("imageUploader");

  const [fullscreenImage, setFullscreenImage] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToLatestRef = useRef(true);

  useEffect(() => {
    // Opening a conversation should always reveal its newest message.
    shouldScrollToLatestRef.current = true;
  }, [selectedUser?.id]);

  // AUTO SCROLL
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (shouldScrollToLatestRef.current || distanceFromBottom < 200) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
      shouldScrollToLatestRef.current = false;
    }
  }, [messages]);

  // EMPTY STATE
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black text-zinc-600">
        <div>Select a conversation</div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black h-screen">
      {/* HEADER */}
      <div className="h-20 border-b border-zinc-800 flex items-center px-4 md:px-6 gap-4">
        {/* MOBILE BACK */}
        <button
          onClick={onBack}
          className="md:hidden text-zinc-400 hover:text-white transition text-xl"
        >
          ←
        </button>

        <div>
          <div className="text-white text-sm md:text-base truncate">
            @{selectedUser.username}
          </div>

          <div className="text-xs text-zinc-500 mt-1">private conversation</div>
        </div>

        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
      </div>

      {encryptionError && (
        <div className="border-b border-amber-900/60 bg-amber-950/30 px-4 py-2 text-xs text-amber-200">
          {encryptionError}
        </div>
      )}

      {pendingDevices?.length > 0 && (
        <div className="border-b border-sky-900/60 bg-sky-950/30 px-4 py-2 text-xs text-sky-100">
          <div className="mb-2">Approve a new device to enable encrypted messaging there.</div>
          {pendingDevices.map((device: any) => (
            <button
              key={device.id}
              onClick={() => approveDevice(device.id)}
              className="rounded bg-sky-100 px-2 py-1 text-sky-950 hover:bg-white"
            >
              Approve {device.name}
            </button>
          ))}
        </div>
      )}

      {/* MESSAGES */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 md:p-6"
      >
        <div className="space-y-1">
          {messages.map((m: any, i: number) => {
            const prevMessage = messages[i - 1];

            const grouped = prevMessage && prevMessage.mine === m.mine;

            return (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: 10,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.18,
                }}
                className={`flex flex-col ${
                  m.mine ? "items-end" : "items-start"
                } ${grouped ? "mt-1" : "mt-4"}`}
              >
                {/* BUBBLE */}
                <div
                  className={`max-w-[85%] md:max-w-[70%] p-4 ${
                    m.mine ? "bg-white text-black" : "bg-zinc-900 text-white"
                  } ${
                    grouped
                      ? m.mine
                        ? "rounded-2xl rounded-br-md"
                        : "rounded-2xl rounded-bl-md"
                      : "rounded-2xl"
                  }`}
                >
                  <div className="space-y-2">
                    {/* IMAGE */}
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        onClick={() => setFullscreenImage(m.imageUrl)}
                        className="rounded-2xl max-w-[220px] md:max-w-[320px] cursor-pointer hover:opacity-90 transition"
                      />
                    )}

                    {/* TEXT */}
                    {m.content && (
                      <div className="break-words">{m.content}</div>
                    )}
                  </div>
                </div>

                {/* SEEN */}
                {m.mine &&
                  (!messages[i + 1] || messages[i + 1].mine !== m.mine) && (
                    <div className="text-[10px] text-zinc-500 mt-1 px-1">
                      {" "}
                      {m.seen ? "Seen" : "Delivered"}{" "}
                    </div>
                  )}
              </motion.div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* TYPING */}
      {typingUser && (
        <div className="px-6 py-2 text-xs text-zinc-500">
          {typingUser} is typing...
        </div>
      )}

      {/* IMAGE VIEWER */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage("")}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.img
              initial={{
                scale: 0.95,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              src={fullscreenImage}
              className="max-w-full max-h-full rounded-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* INPUT */}
      <div className="p-3 md:p-5 border-t border-zinc-800">
        {/* IMAGE PREVIEW */}
        {imageUrl && (
          <div className="mb-3">
            <img
              src={imageUrl}
              className="w-40 rounded-2xl border border-zinc-800"
            />
          </div>
        )}

        <div className="flex gap-2 md:gap-3 items-center">
          {/* UPLOAD */}
          <label className="cursor-pointer text-zinc-400 hover:text-white transition text-sm shrink-0">
            +
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                const res = await startUpload([file]);

                if (res?.[0]?.ufsUrl) {
                  setImageUrl(res[0].ufsUrl);
                }
              }}
            />
          </label>

          {/* INPUT */}
          <input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);

              socket?.emit("typing", {
                receiverId: selectedUser.id,
                username: "admin",
              });
            }}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-zinc-600 transition"
          />

          {/* SEND */}
          <button
            onClick={sendMessage}
            className="bg-white text-black px-6 h-12 rounded-2xl font-medium hover:opacity-90 transition shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
