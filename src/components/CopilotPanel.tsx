"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/client";
import { ui } from "@/lib/theme";
import type { CopilotMessage, CopilotResponse, StadiumState } from "@/lib/types";

interface CopilotPanelProps {
  state: StadiumState;
  onUpdate: (state: StadiumState) => void;
  injectedReply?: CopilotResponse | null;
}

const QUICK_PROMPTS = [
  "What's the status of Gate 3?",
  "Search SOP for severe weather",
  "Draft a 15-word push: North Lot fans use Gate 5 not Gate 4, free water incentive",
  "Nearest secure exit for sector 4?",
];

export function CopilotPanel({
  state,
  onUpdate,
  injectedReply,
}: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      content:
        "Command Copilot online. Ask about gates, zones, SOPs, or say “execute shelter” after a weather webhook.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTools, setLastTools] = useState<CopilotResponse["toolCalls"]>([]);
  const lastInjectionRef = useRef<string | null>(null);

  async function send(userText: string) {
    const trimmed = userText.trim();
    if (!trimmed) return;

    const nextMessages: CopilotMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await apiPost<CopilotResponse>("/api/copilot/chat", {
        messages: nextMessages,
      });
      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.reply },
      ]);
      setLastTools(response.toolCalls);
      onUpdate(response.state);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Copilot error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const reply = injectedReply?.reply;
    if (!reply || lastInjectionRef.current === reply) return;
    lastInjectionRef.current = reply;
    queueMicrotask(() => {
      setMessages((prev) => {
        if (prev.some((m) => m.content === reply)) return prev;
        return [...prev, { role: "assistant", content: reply }];
      });
      if (injectedReply) {
        setLastTools(injectedReply.toolCalls);
        onUpdate(injectedReply.state);
      }
    });
  }, [injectedReply, onUpdate]);

  async function simulateWeatherWebhook() {
    setLoading(true);
    try {
      const result = await apiPost<{
        message: string;
        state: StadiumState;
      }>("/api/webhooks/weather", { distanceMiles: 2.5 });
      onUpdate(result.state);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚡ Weather webhook: ${result.message}`,
        },
      ]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Webhook failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[420px] flex-col">
      <p className={`mb-3 text-xs ${ui.muted}`}>
        GPT-4o copilot with function calling — queries gates, RAG SOPs, drafts
        comms, executes shelter &amp; routing.
      </p>

      <div className={`flex-1 space-y-2 overflow-y-auto rounded-lg border p-3 ${ui.cardInner}`}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm ${
              m.role === "user"
                ? "ml-4 rounded-lg bg-sky-100 px-3 py-2 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"
                : "mr-4 rounded-lg bg-slate-100 px-3 py-2 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <p className="text-xs text-slate-500">Copilot thinking…</p>
        )}
      </div>

      {lastTools.length > 0 && (
        <div className="mt-2 max-h-20 overflow-y-auto rounded border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-950/20 dark:text-emerald-200/90">
          <p className="font-medium">Functions executed</p>
          {lastTools.map((t, i) => (
            <p key={i}>
              {t.name} → {t.result.slice(0, 80)}…
            </p>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => send(p)}
            className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700"
          >
            {p.slice(0, 42)}…
          </button>
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the copilot…"
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${ui.input}`}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <button
        type="button"
        onClick={simulateWeatherWebhook}
        disabled={loading}
        className={`mt-2 w-full rounded-lg border py-1.5 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-400/55 dark:text-amber-200/90 dark:hover:bg-amber-950/30`}
      >
        Simulate lightning webhook (2.5 mi) → shelter protocol
      </button>

      {state.fanNotifications[0] && (
        <p className="mt-2 text-xs text-slate-500">
          Latest push: “{state.fanNotifications[0].message}”
        </p>
      )}
    </div>
  );
}
