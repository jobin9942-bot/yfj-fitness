"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");

    // Gemini response placeholder
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Gemini response ✨" },
      ]);
    }, 800);
  };

  return (
    <div className="h-screen flex bg-zinc-950 text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 p-4">
        <h1 className="text-xl font-bold mb-4">Gemini Pro</h1>
        <Button className="w-full">+ New Chat</Button>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-xl px-4 py-3 rounded-xl ${
                msg.role === "user"
                  ? "ml-auto bg-blue-600"
                  : "mr-auto bg-zinc-800"
              }`}
            >
              {msg.text}
            </motion.div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Gemini..."
          />
          <Button onClick={sendMessage}>
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
