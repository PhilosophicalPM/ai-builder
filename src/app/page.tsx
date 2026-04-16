"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";

// Fix incomplete markdown during streaming by cleaning trailing partial markers
function cleanStreamingMarkdown(text: string): string {
  // Remove trailing incomplete bold markers
  let cleaned = text.replace(/\*\*([^*]*)$/, (match, inner) => {
    // Check if this is an unclosed bold — if there's an even number of ** before, this one is unclosed
    const boldCount = (text.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      return inner; // Strip the opening ** since it's unclosed
    }
    return match;
  });
  // Remove single trailing asterisk
  if (cleaned.endsWith("*") && !cleaned.endsWith("**")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  time?: string;
}

const SUGGESTED_PROMPTS = [
  {
    label: "What I've Built with AI",
    question: "Tell me about the cool AI projects you have worked on.",
  },
  {
    label: "My AI Stack",
    question: "What tools and technologies do you use in your AI work?",
  },
  {
    label: "How I Built This Bot",
    question: "How did you build this bot?",
  },
  {
    label: "Workflows I'd Rebuild at Razorpay",
    question: "Which Razorpay workflow would you rebuild with AI and how?",
  },
  {
    label: "Why This Team",
    question: "Why do you want to join Harshil's AI Hackers team at Razorpay?",
  },
];

const LINKS = {
  linkedin: "https://www.linkedin.com/in/huzefa4/",
  substack: "https://thinkersnook.substack.com/",
  twitter: "https://x.com/_Qrious",
  resume: "/resume.pdf",
};

const CONTACT = {
  email: "huzzeffa@gmail.com",
  phone: "+91-8754311198",
};

const CANNED_ANSWERS: Record<string, string> = {
  "Tell me about the cool AI projects you have worked on.": `**Three AI projects I've shipped or am shipping — all in production, all solving real problems, not demos.**

1. **Bot evaluating another bot (Scapia):**
We run an LLM customer support bot that handles XX thousand queries per month, solves 70% of them with a 42% CSAT. We built an eval bot on top of it — a second LLM that reads both the primary bot's responses and the phone conversations where the bot failed, identifies the gaps, and updates the knowledge base automatically. A self-sustaining improvement loop. The bot gets better every week without a PM in the loop.

2. **Automated lead management + itinerary generation (in progress):**
A platform that instruments WhatsApp first contact with leads, suggests follow-ups via LLM, generates itineraries by pulling from our catalogue, and pushes them through CRM for distribution. The travel lead funnel rebuilt with AI inside every step — from first message to closed booking.

3. **This bot (AI Builder):**
Built with Claude Code, running on Gemma 4 (Apache 2.0, released two weeks ago) with Gemini as fallback, on Next.js + Vercel. 73K-token knowledge base, streaming interface, full chat history. The post said "send me what you've built with AI" — this bot is that submission.`,

  "What tools and technologies do you use in your AI work?": `**Here's the stack I use day to day, picked for what holds up in production.**

1. **Prod inference — Gemma 4 first, Gemini carries production:**
Gemma 4 26B MoE (Apache 2.0, 256K context, 3.8B active params, released two weeks ago) attempted first via OpenRouter's free tier. When OpenRouter's shared upstream pool is saturated, the chain falls through to Gemini flash-latest on Google AI Studio, which handles the full context comfortably. Gemma moves to primary with OpenRouter credits or Vertex AI billing. Two providers, one fetch-based dispatcher, zero SDK lock-in.

2. **Agents and dev — Claude Code + Claude Projects:**
Claude Code is my daily driver — full-stack development, data analysis, rapid prototyping, competitive research. Claude Projects loaded with PRD structure for PRD automation and customer support context for the Scapia bot.

3. **Infrastructure — Next.js + Vercel + Resend:**
Direct API calls, no LangChain or LlamaIndex. YAGNI. Rate limiting in-memory, streaming via Server-Sent Events, Resend for transactional alerts.

4. **Evals — custom harness:**
The Scapia eval bot uses a custom evaluation harness I built, not a framework. Read the phone conversations and bot responses, score them, identify gap patterns, feed them back into KB updates.

5. **Observability — DIY:**
Vercel logs + Resend webhooks + interaction tracking emails. I know when someone is reading this bot in real time.`,

  "How did you build this bot?": `**The bot you're using is the answer to "send me what you've built with AI". Here's the architecture in two minutes.**

1. **Knowledge base (~73K tokens):**
Personal notes (Obsidian), Substack articles, Investment Thesis, Theory of Curiosity, tweets, resume — all processed by a script into a single text file, then injected into the system prompt on every LLM call. No RAG, no vector DB. Simpler than it sounds and it works.

2. **System prompt — curated answers + format enforcement + guardrails:**
Not a free-for-all wrapper. The prompt carries the persona, the response format (crux + bullets with bold headings), hard-coded curated answers for high-signal questions, and safety guardrails against prompt injection, abuse, and off-topic drift.

3. **Canned and free-form split:**
Five pre-written answers for the pills — deterministic, reviewed, streamed character-by-character for feel. Everything else hits the LLM API. The pitch is never left to chance, but the conversation stays open-ended.

4. **Model fallback chain — Gemma 4 → Gemini:**
Chain: Gemma 4 26B MoE (OpenRouter free tier) → Gemini flash-latest → 2.5 Flash → pro-latest → 2.5 Flash Lite. If any model hits a rate limit, 503, or 404 for deprecated IDs, the next one picks up automatically.

5. **Rate limits and tracking:**
30 requests per hour per IP, 50 messages per session. Every interaction emails me via Resend. I know when you are reading this.`,

  "Which Razorpay workflow would you rebuild with AI and how?": `**Pick one workflow, rebuild it end-to-end with agents plus a self-sustaining eval loop, ship in a week, then replay the pattern across the org. I would target Merchant support.**

1. **The workflow — merchant support Tier 1:**
Highest-volume, most pattern-rich, most labour-intensive surface Razorpay has. Every query today runs through humans plus stale knowledge base entries.

2. **The AI redesign:**
Primary agent triages the incoming query, routes it to the right KB, resolves 70–80% at first touch. Eval bot analyses both the primary agent's responses and the phone/chat conversations where it failed, identifies gaps, and auto-updates the KB — closing the loop without human intervention. Low-confidence queries escalate to humans with full context pre-loaded. Stack: Claude API + direct DB access to merchant state + Razorpay's existing KB as the retrieval source.

3. **Success metrics:**
Deflection rate (70% by month 1, 80% by month 3). No drop in CSAT. Escalation quality — humans handle genuinely hard queries, not bot failures. KB update velocity — gap identified to fix in under 24 hours with no PM in the loop. Support cost per merchant.

4. **Week 1 shipping plan:**
Day 1–2 pull ticket logs and current KB, build the classifier. Day 3–4 ship primary agent to a shadow queue (no customer impact). Day 5 ship eval bot, identify gap patterns. Day 6–7 flip 10% of real traffic, iterate daily on KB updates.

5. **Why this is the right first target:**
It is the shape I know best (Scapia eval bot), highest volume at Razorpay, and the pattern is reusable. Once it works on support, I replay it on dispute resolution, KYC review, merchant activation, risk triage. Ship once, earn replay rights across the org.`,

  "Why do you want to join Harshil's AI Hackers team at Razorpay?": `**Opus 4.6 turned AI into real leverage for first-principle thinkers. Attention-economy businesses die, trust-monetised ones survive, and the implementation bandwidth that used to cap PMs with ideas is gone. I'm already shipping that way.**

1. **Disruption is systemic:**
Agents have no habits, no attention, no susceptibility to cross-sell. Discovery, search, ranking, recommendation — the GMV engines of the aggregator era — become much less effective. Winners are trust-monetised: payments, logistics, reputation. As raw model capability is commoditising fast, the durable edge shifts to systems thinking: composing AI with data, feedback loops, and business constraints into workflows that actually close.

2. **Already executing:**
Scapia eval bot (70% deflection, self-sustaining KB loop). Automated lead management + itinerary generation in progress. This AI Builder bot. Multiple personal full-stack builds in parallel using Claude Code as my default tool of creation.

3. **DS background gives me the judgment layer:**
4.5 years in data science (MuSigma, Flipkart supply chain ML, William O'Neil quant analysis) — I understand evaluation, data quality, and model limitations. That's the difference between shipping AI that works in production and shipping demos that break on real data.

4. **Razorpay is structurally right:**
Payments monetise trust, not attention so they should survive the disruption. Rails are public utility (NPCI), so the leverage lives in rebuilding workflows on top. And the team's no-hierarchy, ship-directly setup matches how I actually want to work — building without being slowed by designations or reporting layers.

TLDR — builders win, trust should survive, and I'm shipping on this thesis today.`,
};

function getTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    trackInteraction(`copied_${field}`, text, "canned");
    setTimeout(() => setCopiedField(null), 2000);
  }

  function trackInteraction(question: string, answer: string, type: "canned" | "api") {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer: answer.slice(0, 500), type }),
    }).catch(() => {});
  }

  async function streamCannedAnswer(answer: string) {
    const assistantTime = getTime();

    // Phase 1: Show thinking state (empty content triggers the skeleton UI)
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", time: assistantTime },
    ]);
    await new Promise((r) => setTimeout(r, 1500));

    // Phase 2: Stream at consistent speed
    const chunkSize = 3;
    const delay = 12;
    let accumulated = "";
    let i = 0;

    while (i < answer.length) {
      const chunk = answer.slice(i, i + chunkSize);
      accumulated += chunk;
      i += chunkSize;

      const current = accumulated;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: current,
          time: assistantTime,
        };
        return updated;
      });

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const trimmed = text.trim();
    const userMessage: Message = {
      role: "user",
      content: trimmed,
      time: getTime(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Check for canned answer
    const cannedAnswer = CANNED_ANSWERS[trimmed];
    if (cannedAnswer) {
      await streamCannedAnswer(cannedAnswer);
      trackInteraction(trimmed, cannedAnswer, "canned");
      setIsLoading(false);
      return;
    }

    // Otherwise use API
    const newMessages = [...messages, userMessage];
    const assistantTime = getTime();

    // Show thinking state immediately
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", time: assistantTime },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();

      // Collect full response first, then stream it character by character
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          const data = raw.replace(/\{\{NEWLINE\}\}/g, "\n");
          fullResponse += data;
        }
      }

      // Now stream it character by character like canned answers
      const chunkSize = 3;
      const delay = 12;
      let streamed = "";

      for (let i = 0; i < fullResponse.length; i += chunkSize) {
        streamed += fullResponse.slice(i, i + chunkSize);
        const current = streamed;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: current,
            time: assistantTime,
          };
          return updated;
        });
        await new Promise((r) => setTimeout(r, delay));
      }

      trackInteraction(trimmed, fullResponse, "api");
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Oh, my tokens have been exhausted. Please come back after some time.",
          time: getTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const usedQuestions = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const remainingPrompts = SUGGESTED_PROMPTS.filter(
    (p) => !usedQuestions.includes(p.question)
  );

  return (
    <div className="bg-[#131313] text-[#e5e2e1] antialiased min-h-screen">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#adc6ff]/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#b1c6f9]/5 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-6 py-4 glass-header border-b border-[#424754]/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#353534] flex items-center justify-center border border-white/10">
            <span className="text-slate-100 font-semibold text-sm">H</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight">
            AI Builder
          </h1>
        </div>
        <div className="flex items-center gap-6">
          {hasMessages && (
            <button
              onClick={() => {
                setMessages([]);
              }}
              className="hidden md:block text-[#c2c6d6] cursor-pointer hover:text-white transition-opacity duration-300 text-sm"
            >
              New Chat
            </button>
          )}
          <button
            onClick={() => {
              setShowConnect(true);
              trackInteraction("connect_button_clicked", "", "canned");
            }}
            className="bg-[#3b82f6] text-white px-5 py-1.5 rounded-lg font-bold tracking-tight text-sm hover:opacity-80 transition-opacity duration-300 active:scale-95 cursor-pointer"
          >
            Connect
          </button>
        </div>
      </header>

      {/* Connect Modal */}
      {showConnect && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#131313]/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConnect(false);
          }}
        >
          <div className="relative w-full max-w-sm bg-[#1c1b1b] border border-[#424754]/30 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight uppercase">
                Connect
              </h2>
              <button
                onClick={() => setShowConnect(false)}
                className="text-[#c2c6d6] hover:text-[#e5e2e1] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Email */}
              <div className="group flex items-center justify-between p-3 rounded-xl bg-[#0e0e0e] border border-[#424754]/20 hover:border-[#adc6ff]/50 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#adc6ff] text-[20px]">
                    mail
                  </span>
                  <span className="text-sm font-medium text-[#e5e2e1]">
                    {CONTACT.email}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(CONTACT.email, "email")}
                  className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors cursor-pointer"
                  title="Copy email"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedField === "email" ? "check" : "content_copy"}
                  </span>
                </button>
              </div>
              {copiedField === "email" && (
                <div className="text-[11px] text-[#adc6ff]/70 text-center font-medium tracking-wide uppercase">
                  Email copied to clipboard
                </div>
              )}

              {/* Phone */}
              <div className="group flex items-center justify-between p-3 rounded-xl bg-[#0e0e0e] border border-[#424754]/20 hover:border-[#adc6ff]/50 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#adc6ff] text-[20px]">
                    call
                  </span>
                  <span className="text-sm font-medium text-[#e5e2e1]">
                    {CONTACT.phone}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(CONTACT.phone, "phone")}
                  className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors cursor-pointer"
                  title="Copy phone"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedField === "phone" ? "check" : "content_copy"}
                  </span>
                </button>
              </div>
              {copiedField === "phone" && (
                <div className="text-[11px] text-[#adc6ff]/70 text-center font-medium tracking-wide uppercase">
                  Phone copied to clipboard
                </div>
              )}
            </div>

            {/* Social links in modal */}
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="flex gap-8 items-center justify-center">
                <a
                  href={LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-[#3b82f6] transition-colors duration-300 uppercase tracking-[0.2em] text-[10px] font-medium"
                >
                  LinkedIn
                </a>
                <a
                  href={LINKS.substack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-[#3b82f6] transition-colors duration-300 uppercase tracking-[0.2em] text-[10px] font-medium"
                >
                  Substack
                </a>
                <a
                  href={LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-[#3b82f6] transition-colors duration-300 uppercase tracking-[0.2em] text-[10px] font-medium"
                >
                  X
                </a>
                <a
                  href={LINKS.resume}
                  download="Huzefa_Resume.pdf"
                  className="text-gray-500 hover:text-[#3b82f6] transition-colors duration-300 uppercase tracking-[0.2em] text-[10px] font-medium"
                >
                  Resume
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-h-screen pt-24 pb-96 max-w-3xl mx-auto px-4 md:px-6">
        <div className="space-y-10">
          {/* Welcome Message */}
          <div className="flex flex-col items-start max-w-2xl animate-fade-in">
            <div className="bg-[#1c1b1b] p-8 rounded-xl">
              <p className="text-[#e5e2e1] text-xl md:text-2xl font-light leading-relaxed">
                Hey, I&apos;m an AI trained on 10 years of Huzefa&apos;s
                thinking. Resumes show what someone has done. I show how they
                think. Ask me anything.
              </p>
            </div>
          </div>

          {/* Landing: Inquiry Modules */}
          {!hasMessages && (
            <div className="w-full animate-fade-in">
              <p className="text-[#c2c6d6] text-[10px] font-bold tracking-[0.2em] uppercase mb-6 ml-1">
                Deep Inquiry Modules
              </p>
              <div className="flex flex-wrap gap-3">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.question)}
                    className="px-6 py-3 rounded-full bg-[#353534] text-[#e5e2e1] text-sm font-medium hover:bg-[#adc6ff] hover:text-[#001a42] transition-all duration-300 border border-transparent hover:border-[#adc6ff]/20 cursor-pointer active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {hasMessages && (
            <div className="space-y-10">
              {messages.map((msg, i) => (
                <div key={i} className="animate-fade-in">
                  {msg.role === "user" ? (
                    <div className="flex flex-col items-end space-y-2">
                      <div className="user-gradient text-[#00285d] px-6 py-4 rounded-xl max-w-[85%] shadow-lg">
                        <p className="font-medium leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                      {msg.time && (
                        <span className="text-xs text-[#8c909f] px-2">
                          {msg.time}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start space-y-2">
                      {/* Thinking state */}
                      {isLoading &&
                        i === messages.length - 1 &&
                        !msg.content && (
                          <>
                            <div className="flex items-center gap-3 text-[#adc6ff]">
                              <div className="w-5 h-5 rounded-full bg-[#353534] flex items-center justify-center border border-white/10">
                                <span className="text-[#e5e2e1] font-bold text-[8px]">
                                  H
                                </span>
                              </div>
                              <span className="text-sm font-medium lowercase opacity-70">
                                thinking...
                              </span>
                            </div>
                            <div className="thought-pulse text-[#e5e2e1] p-5 rounded-xl w-full min-h-[120px] flex flex-col gap-3 border border-[#424754]/5">
                              <div className="flex gap-1.5 items-end h-4">
                                <div className="rounded-full bg-[#adc6ff] w-2 h-2 animate-bounce [animation-duration:1s]" />
                                <div className="rounded-full bg-[#adc6ff] w-2 h-2 animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                                <div className="rounded-full bg-[#adc6ff] w-2 h-2 animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                              </div>
                              <div className="space-y-3">
                                <div className="h-4 bg-[#2a2a2a] rounded-full w-3/4 thinking-pulse" />
                                <div
                                  className="h-4 bg-[#2a2a2a] rounded-full w-1/2 thinking-pulse"
                                  style={{ animationDelay: "0.1s" }}
                                />
                              </div>
                            </div>
                          </>
                        )}

                      {/* Streamed content */}
                      {msg.content && (
                        <div className="bg-[#1c1b1b] text-[#e5e2e1] p-5 rounded-xl max-w-[95%] border border-[#424754]/5">
                          <div className="markdown-content text-base leading-relaxed">
                            <ReactMarkdown
                              components={{
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#adc6ff] underline hover:text-white transition-colors"
                                  >
                                    {children}
                                  </a>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-white">
                                    {children}
                                  </strong>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-5 my-2 space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-5 my-2 space-y-1">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="text-[#e5e2e1]">
                                    {children}
                                  </li>
                                ),
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">
                                    {children}
                                  </p>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="font-semibold text-white mt-3 mb-1">
                                    {children}
                                  </h3>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="font-bold text-white mt-4 mb-2 text-lg">
                                    {children}
                                  </h2>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-[#4d8eff] pl-3 my-2 text-[#c2c6d6]">
                                    {children}
                                  </blockquote>
                                ),
                              }}
                            >
                              {isLoading && i === messages.length - 1
                                ? cleanStreamingMarkdown(msg.content)
                                : msg.content}
                            </ReactMarkdown>
                            {isLoading && i === messages.length - 1 && (
                              <span className="inline-block w-1.5 h-4 bg-[#8c909f] ml-0.5 animate-pulse rounded-sm" />
                            )}
                          </div>
                        </div>
                      )}

                      {msg.time && msg.content && (
                        <span className="text-xs text-[#8c909f] px-2">
                          {msg.time}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Fixed Bottom Section */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-[#131313]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 pb-0 space-y-3 pt-4">
          {/* Suggested Questions — scrollable in chat mode */}
          {hasMessages && !isLoading && remainingPrompts.length > 0 && (
            <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2">
              {remainingPrompts.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.question)}
                  className="whitespace-nowrap px-5 py-2.5 rounded-full bg-[#353534] text-[#c2c6d6] text-sm font-medium hover:bg-[#adc6ff] hover:text-[#001a42] transition-all duration-300 border border-[#424754]/15 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="relative group">
            <div className="bg-[#2a2a2a] rounded-xl p-4 flex items-end gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.4)] ring-1 ring-[#424754]/20 focus-within:ring-[#adc6ff]/40 transition-all duration-500">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-[#e5e2e1] placeholder:text-[#8c909f] p-0 py-2 resize-none text-lg"
                placeholder="Deepen the inquiry..."
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="rounded-lg bg-[#3b82f6] text-white hover:opacity-80 transition-all duration-300 flex items-center justify-center shadow-lg p-1.5 shrink-0 disabled:opacity-30 disabled:hover:opacity-30 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">
                  arrow_upward
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer — inside the same fixed block */}
        <div className="w-full py-3 flex flex-col items-center gap-3 border-t border-white/5">
        <div className="flex justify-center items-center gap-10 text-[#c2c6d6]/50">
          <a
            href={LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackInteraction("clicked_linkedin", "", "canned")}
            className="hover:text-[#adc6ff] transition-all duration-300 flex flex-col items-center gap-1 group"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            <span className="text-[9px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              LinkedIn
            </span>
          </a>
          <a
            href={LINKS.substack}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackInteraction("clicked_substack", "", "canned")}
            className="hover:text-[#adc6ff] transition-all duration-300 flex flex-col items-center gap-1 group"
          >
            <span className="material-symbols-outlined text-[20px]">
              article
            </span>
            <span className="text-[9px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Substack
            </span>
          </a>
          <a
            href={LINKS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackInteraction("clicked_twitter", "", "canned")}
            className="hover:text-[#adc6ff] transition-all duration-300 flex flex-col items-center gap-1 group"
          >
            <svg className="w-4 h-4 fill-current mb-0.5" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-[9px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              X
            </span>
          </a>
          <a
            href={LINKS.resume}
            download="Huzefa_Resume.pdf"
            onClick={() => trackInteraction("downloaded_resume", "", "canned")}
            className="hover:text-[#adc6ff] transition-all duration-300 flex flex-col items-center gap-1 group"
          >
            <span className="material-symbols-outlined text-[20px]">
              description
            </span>
            <span className="text-[9px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Resume
            </span>
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}
