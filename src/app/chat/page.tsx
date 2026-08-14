"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const router = useRouter();

  const [socket, setSocket] = useState<any>(null);
  const [unreadCounts, setUnreadCounts] = useState<any>({});
  const [imageUrl, setImageUrl] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [myDevices, setMyDevices] = useState<any[]>([]);
  const [pendingDevices, setPendingDevices] = useState<any[]>([]);
  const [typingUser, setTypingUser] = useState("");
  const myUserIdRef = useRef<number | null>(null);
  const selectedUserRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  // auth + socket setup
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));

    setMyUserId(payload.userId);
    void initializeEncryption(token);

    // create authenticated socket
    const newSocket = io("http://localhost:3001", {
      auth: {
        token,
      },
    });

    setSocket(newSocket);
    newSocket.on("connect", () => {
      //onsole.log("SOCKET CONNECTED");
    });
    newSocket.on("messages_seen", () => {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          seen: true,
        })),
      );
    });
    newSocket.on("connect_error", (err) => {
      //console.log("SOCKET ERROR:", err.message);
    });

    // join personal room
    newSocket.emit("join", payload.userId);

    // load initial data
    fetchConversations(token);
    fetchUsers(token);

    // online users
    newSocket.on("online_users", (users) => {
      //console.log("RECEIVED ONLINE USERS:", users);
      setOnlineUsers(users);
    });

    newSocket.on("typing", (username) => {
      setTypingUser(username);

      setTimeout(() => {
        setTypingUser("");
      }, 2000);
    });
    // incoming messages
    newSocket.on("receive_message", (msg) => {
      if (selectedUserRef.current?.id !== msg.senderId) {
        setUnreadCounts((prev: any) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }

      fetchConversations(token);
      if (selectedUserRef.current?.id === msg.senderId) {
        // Socket events contain ciphertext. Fetch the persisted message so this
        // device receives its own key envelope, then decrypt it before render.
        void loadConversation(msg.senderId);
      }
    });

    return () => {
      newSocket.off("receive_message");
      newSocket.off("online_users");
      newSocket.off("messages_seen");
      newSocket.disconnect();
    };
  }, []);

  const deviceStorage = (userId: number) => ({
    deviceId: `deviceId:${userId}`,
    publicKey: `devicePublicKey:${userId}`,
    privateKey: `devicePrivateKey:${userId}`,
  });

  async function createAndStoreKeyPair(userId: number) {
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

    const [publicKey, privateKey] = await Promise.all([
      crypto.subtle.exportKey("spki", keyPair.publicKey),
      crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    ]);
    const toBase64 = (value: ArrayBuffer) =>
      btoa(String.fromCharCode(...new Uint8Array(value)));
    const publicKeyBase64 = toBase64(publicKey);

    const storage = deviceStorage(userId);
    const id = crypto.randomUUID();
    localStorage.setItem(storage.deviceId, id);
    localStorage.setItem(storage.publicKey, publicKeyBase64);
    localStorage.setItem(storage.privateKey, toBase64(privateKey));
    return { id, publicKey: publicKeyBase64 };
  }

  async function initializeEncryption(token: string) {
    try {
      const response = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to load encryption state");

      const account = await response.json();
      const storage = deviceStorage(account.id);
      let id = localStorage.getItem(storage.deviceId);
      let publicKey = localStorage.getItem(storage.publicKey);
      const privateKey = localStorage.getItem(storage.privateKey);
      if (!id || !publicKey || !privateKey) {
        const generated = await createAndStoreKeyPair(account.id);
        id = generated.id;
        publicKey = generated.publicKey;
      }

      const activation = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId: id, publicKey, name: navigator.userAgent.slice(0, 80) }),
      });

      if (!activation.ok) {
        throw new Error("Unable to register device");
      }

      const device = await activation.json();
      setDeviceId(id);
      if (!device.approved) {
        setEncryptionError("This new device is waiting for approval from one of your existing devices.");
      } else {
        setEncryptionError(null);
      }
      await refreshDevices(token);
      await Promise.all([fetchConversations(token), fetchUsers(token)]);
    } catch (error) {
      console.error("Failed to initialize encryption", error);
      setEncryptionError("Unable to activate end-to-end encryption.");
    }
  }

  async function refreshDevices(token: string) {
    const response = await fetch("/api/devices", { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const devices = await response.json();
    setMyDevices(devices.filter((device: any) => device.approved));
    setPendingDevices(devices.filter((device: any) => !device.approved));
  }

  async function approveDevice(pendingDeviceId: string) {
    const token = localStorage.getItem("token");
    if (!token || !deviceId) return;
    const response = await fetch(`/api/devices/${pendingDeviceId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approverDeviceId: deviceId }),
    });
    if (response.ok) await refreshDevices(token);
  }

  // fetch conversations
  async function fetchConversations(token: string) {
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to load conversations", res.status);
        return;
      }

      const data: unknown = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations", error);
    }
  }

  // fetch users
  async function fetchUsers(token: string) {
    const res = await fetch("/api/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (Array.isArray(data)) {
      setUsers(data);
    }
  }

  // load conversation history
  async function loadConversation(userId: number) {
    const token = localStorage.getItem("token");

    if (!token) return;

    const res = await fetch(`/api/messages/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(deviceIdRef.current ? { "X-Device-ID": deviceIdRef.current } : {}),
      },
    });

    const data = await res.json();

    if (Array.isArray(data)) {
      const decryptedMessages = await Promise.all(
        data.map(async (m: any) => {
          try {
            const content = await decryptMessage(
              m.encryptedContent,
              m.keyEnvelopes?.[0]?.encryptedKey ?? null,
              m.iv,
            );
            return { ...m, content, mine: m.senderId === myUserIdRef.current };
          } catch {
            return {
              ...m,
              content: "[Unable to decrypt]",
              mine: m.senderId === myUserIdRef.current,
            };
          }
        }),
      );
      setMessages(decryptedMessages);
      await fetch("/api/messages/seen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
        }),
      });
      socket?.emit("seen_messages", {
        receiverId: userId,
        userId: myUserIdRef.current,
      });
    }
  }

  async function encryptMessage(
    message: string,
    recipientDevices: Array<{ id: string; publicKey: string }>,
  ) {
    const importPublicKey = async (publicKeyBase64: string) => {
      const binaryDer = Uint8Array.from(atob(publicKeyBase64), (c) =>
        c.charCodeAt(0),
      );
      return crypto.subtle.importKey(
        "spki",
        binaryDer.buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"],
      );
    };

    // GENERATE AES KEY
    const aesKey = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },

      true,

      ["encrypt", "decrypt"],
    );

    // RANDOM IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // ENCRYPT MESSAGE
    const encoded = new TextEncoder().encode(message);

    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },

      aesKey,

      encoded,
    );

    // EXPORT AES KEY
    const exportedAesKey = await crypto.subtle.exportKey("raw", aesKey);

    const wrapAesKey = async (publicKey: CryptoKey) => {
      const wrapped = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        exportedAesKey,
      );
      return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
    };

    return {
      encryptedContent: btoa(
        String.fromCharCode(...new Uint8Array(encryptedContent)),
      ),

      keyEnvelopes: await Promise.all(
        recipientDevices.map(async (device) => ({
          deviceId: device.id,
          encryptedKey: await wrapAesKey(await importPublicKey(device.publicKey)),
        })),
      ),

      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  async function decryptMessage(
    encryptedContent: string,
    encryptedKey: string | null,
    iv: string | null,
  ) {
    if (!encryptedContent || !encryptedKey || !iv) {
      throw new Error("Missing encrypted message fields");
    }
    // GET PRIVATE KEY
    const privateBase64 = myUserIdRef.current
      ? localStorage.getItem(deviceStorage(myUserIdRef.current).privateKey)
      : null;

    if (!privateBase64) {
      return "[NO PRIVATE KEY]";
    }

    // IMPORT PRIVATE KEY
    const privateBinary = Uint8Array.from(atob(privateBase64), (c) =>
      c.charCodeAt(0),
    );

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",

      privateBinary.buffer,

      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },

      true,

      ["decrypt"],
    );

    // DECRYPT AES KEY
    const encryptedKeyBinary = Uint8Array.from(atob(encryptedKey), (c) =>
      c.charCodeAt(0),
    );

    const aesKeyRaw = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },

      privateKey,

      encryptedKeyBinary,
    );

    // IMPORT AES KEY
    const aesKey = await crypto.subtle.importKey(
      "raw",

      aesKeyRaw,

      {
        name: "AES-GCM",
      },

      true,

      ["decrypt"],
    );

    // DECODE IV
    const ivBinary = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

    // DECODE MESSAGE
    const encryptedBinary = Uint8Array.from(atob(encryptedContent), (c) =>
      c.charCodeAt(0),
    );

    // DECRYPT MESSAGE
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBinary,
      },

      aesKey,

      encryptedBinary,
    );

    return new TextDecoder().decode(decrypted);
  }
  // send message
  async function sendMessage() {
    const token = localStorage.getItem("token");

    if (!token || !selectedUser || !message.trim() || myUserId === null) return;

    if (!deviceId || !myDevices.some((device) => device.id === deviceId)) {
      setEncryptionError(
        "This device is waiting for approval from an existing device.",
      );
      return;
    }

    const latestSelectedUser = users.find((user) => user.id === selectedUser.id);
    const recipientDevices = latestSelectedUser?.devices ?? selectedUser.devices ?? [];

    if (!recipientDevices.length) {
      setEncryptionError(
        `@${selectedUser.username} has no approved encrypted devices.`,
      );
      return;
    }

    let encrypted: Awaited<ReturnType<typeof encryptMessage>>;
    try {
      encrypted = await encryptMessage(
        message,
        [...myDevices, ...recipientDevices],
      );
    } catch (error) {
      console.error("Failed to encrypt message", error);
      setEncryptionError(
        "Unable to encrypt on this device. Refresh this chat and try again.",
      );
      return;
    }

    const msg = {
      receiverId: selectedUser.id,

      encryptedContent: encrypted.encryptedContent,

      keyEnvelopes: encrypted.keyEnvelopes,

      iv: encrypted.iv,

      imageUrl,
    };

    // save message
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(msg),
    });

    if (!res.ok) {
      const failure = await res.json().catch(() => null);
      setEncryptionError(failure?.error ?? "Unable to save encrypted message.");
      console.error("Failed to save encrypted message", res.status, failure);
      return;
    }

    // realtime send
    socket?.emit("send_message", msg);

    // optimistic update
    setMessages((prev) => [
      ...prev,
      { ...msg, content: message, senderId: myUserId, mine: true },
    ]);

    setMessage("");
    setImageUrl("");
    fetchConversations(token);
  }

  //console.log("ONLINE USERS:", onlineUsers);

  return (
    <div className="flex bg-black text-white h-screen overflow-hidden relative">
      {/* Sidebar */}
      <div
        className={`
    ${selectedUser ? "hidden md:flex" : "flex"}
    w-full md:w-auto
  `}
      >
        <ChatSidebar
          onlineUsers={onlineUsers}
          unreadCounts={unreadCounts}
          conversations={conversations}
          users={users}
          selectedUser={selectedUser}
          onSelectUser={(user: any) => {
            setSelectedUser(user);
            setUnreadCounts((prev: any) => ({
              ...prev,
              [user.id]: 0,
            }));
            loadConversation(user.id);
          }}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`
    ${selectedUser ? "flex" : "hidden md:flex"}
    flex-1
  `}
      >
        <ChatWindow
          socket={socket}
          selectedUser={selectedUser}
          messages={messages}
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          typingUser={typingUser}
          encryptionError={encryptionError}
          pendingDevices={pendingDevices}
          approveDevice={approveDevice}
          onBack={() => setSelectedUser(null)}
        />
      </div>
    </div>
  );
}
