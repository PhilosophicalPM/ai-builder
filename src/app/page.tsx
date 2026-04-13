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
    label: "Why This Role",
    question: "Why are you interested in this role?",
  },
  {
    label: "Experience Summary",
    question:
      "Summarise your work experience which is relevant for this role. Provide enough details to allow us to understand and match your experience with the role's requirements.",
  },
  {
    label: "High Agency Scenario",
    question:
      "Share a scenario when you demonstrated high agency. Provide enough details to allow us to understand and empathise with the situation.",
  },
  {
    label: "Pre-Seed Investment 24/25",
    question:
      "If you could invest in any Indian startup's pre-seed/seed round that happened in 2024/2025, which one and what's your investment thesis?",
  },
  {
    label: "AI Work Examples",
    question:
      "Where all in your work role do you use AI? Provide actual examples with details.",
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
  "Why are you interested in this role?": `**I am interested in this role because I have the exposure, experience, skills and the inherent interest required for the role.**

1. **Exposure & Experience:** 5 industries (Travel, Fintech, Edtech, Ecommerce, Quant Investing), 4 levels of scale (0-1 at weTrade, Series B at Scapia, profitable scale at Allen, hyper-scale at Flipkart), 3 roles (PM, Data Scientist, Quant Analyst)

2. **Genuine Curiosity:** I thrive on evaluating new problems, devoid of incentives. My cross-domain exposure has given me an eye for structural patterns that make or break businesses — useful for sourcing, evaluating, and executing deals. I have written about this — my [Theory of Curiosity](https://open.substack.com/pub/thinkersnook/p/dont-try-to-be-happy-just-have-fun). I also publish market analyses on my [Substack](https://thinkersnook.substack.com/) — including a deep dive on [JioHotstar's growth strategy](https://thinkersnook.substack.com/p/whats-next-for-jiohotstar).

3. **Skills:** PM has helped me practice strategy, stakeholder alignment through sharp documentation, deep user research (100s of conversations across India), and building systems and processes that run without supervision. William O'Neil helped me develop skills in portfolio construction, risk management, understanding macros, and identifying which financial metrics actually matter for a company.

4. **Fork in the road:** PM is moving from generalist to specialist. The opportunity to experience breadth is becoming limited in PM. VC is where that breadth compounds.`,

  "Summarise your work experience which is relevant for this role. Provide enough details to allow us to understand and match your experience with the role's requirements.": `**1. I understand investing:**
At William O'Neil, I practiced portfolio construction, risk management, understanding macros, and evaluating companies through financial metrics — forming conviction on assets with real money. Not VC, but the muscle of evaluating opportunities and building conviction under uncertainty is the same.

**2. I can source, align, and run operations with rigour:**
At Allen, I conducted user research across multiple cities — forming views on real problems, then distilling messy conversations into sharp internal narratives that drove leadership decisions. The PRDs, the tradeoff analysis, the one-pagers — I have been writing these for years. At Scapia, I launched a new travel category end-to-end — market research, partner onboarding, product coordination, GTM — context-switching across partners, vendors, engineering, marketing, and ops with no playbook. Across all roles, I build systems and processes that run without supervision.

**3. I understand the 0-1 journey at the stage Mars Shot invests in:**
At weTrade, I was the founding PM — 0-1 consumer app, 300K users, Rs 420M monthly volume in 6 months. Built the pricing platform that became the structural moat. At Scapia, launched a new category achieving $Xmn GMV in first two months. I know what it looks like when there are no users and no distribution.

**4. I understand AI — both the data science and the shipping:**
Data science background (MuSigma). Built supply chain optimisation at Flipkart (route, manpower, and vehicle optimisation). Shipped LLM customer support bot at Scapia (>75% deflection). Built this Neural Map with Claude Code. I can evaluate AI startups from production experience, not pitch decks.`,

  "Share a scenario when you demonstrated high agency. Provide enough details to allow us to understand and empathise with the situation.": `**Three examples of agency — one where I changed my own trajectory, one where I changed an institution's behaviour, and one you are experiencing right now.**

**1. Career switch — DS to PM:**
Spent 4.5 years in analytics (MuSigma, William O'Neil, Flipkart as senior analyst). Career was going well. But I realised understanding users, businesses, and P&L interested me more than crunching numbers. The cost: 4.5 years of experience counting for nothing. Switching functions within Flipkart required convincing hiring managers that an analytics person can think about strategy and execution. I made the switch because the pull was genuine — curiosity about how things are built, not just measured.

**2. Launching Homework at Allen:**
Allen told students in orientation: use your mobile phone, you will fail. We were building a digital learning product in that culture. Homework needed teachers to assign it during class — teachers who believed phones were the enemy. But without teachers there is no Homework. So we camped at Bangalore centre for 7 days, helping teachers understand how the product works, sourced devices, and even solved for basics like router availability at the centre. Homework launched, hit 100K MAU within 6 months, and became the foundation for Allen's personalisation strategy.

**3. This bot:**
For a role that hires for judgment, curiosity, and the ability to form conviction — understanding how someone thinks is more important than what they have shipped. A resume cannot show that. So I took the initiative of building this AI trained on 10 years of my thinking, and put it in front of you to build your trust and belief in my thinking process.`,

  "If you could invest in any Indian startup's pre-seed/seed round that happened in 2024/2025, which one and what's your investment thesis?": `**Rumik.ai** — I would have invested in their seed round in April 2025.

**Going B2C is a signal of ambition:**
Most Indian voice AI companies took the enterprise customer support route (Bolna, Ringg, Sarvam) — constrained conversations, predictable intents, clear ROI pitch. Rumik chose B2C companion — unconstrained conversation, long memory context, emotional state detection, code-switching across languages. Exponentially more difficult, but a potentially huge opportunity — 500 million people who need connection.

**Why this is a crazy (great) idea:**
"Why would Indian users pay Rs 199/month to talk to an AI?" — that scepticism is the signal. Crazy ideas are the great ones. Building your own voice model for Hinglish code-switching — when training data barely exists and TTS was unreliable — filters out 90% of AI startups who would rather wrap OpenAI than do the hard engineering.

**Why the TG spans India:**
Tier 1 uses it for companionship in lonely metro life — where despite having money and access, urban isolation is real and therapy is expensive. Tier 2+ uses it to have conversations they cannot have with people around them — where mental health carries stigma, vulnerability is seen as weakness, and affordable alternatives do not exist. Same core human need, different reasons across segments. Therapy costs Rs 1,500-3,000/session. Ira costs Rs 199/month in the language you think in.

**Why the business holds:**
Digital, not physical — marginal cost is inference, which keeps dropping. The companion remembers you, learns your emotional patterns, understands your context. The more you use it, the more valuable it becomes to you. Switching to another companion means starting from zero — losing the relationship history. That is the moat.

**Competitors:**
Character.AI and Replika are English, Western, culturally tone-deaf for India. Nobody else is building emotionally intelligent AI in Hinglish. The cultural nuance is a deep engineering challenge that generic models will not crack.

**Risks:**
Retention — companion apps can spike and crash. Platform risk if Google ships a multilingual companion. Counter-bet: emotional nuance in Hinglish is deep enough that a generic model will not crack it.`,

  "Where all in your work role do you use AI? Provide actual examples with details.": `**I use AI across my entire workflow — not as a chatbot for quick answers, but as a core part of how I build, analyse, and ship products.**

**1. AI customer support bot at Scapia:**
Created a Claude project loaded with customer support context and call transcripts. Built a query classifier that routes queries to the right knowledge base — enabling >75% deflection.

**2. PRD creation via Claude Projects:**
Claude has my PRD structure and context (user research, business constraints). I brainstorm with it to generate PRDs with relevant use cases — detailed enough for engineering to pick up directly. PRD cycle compressed from days to hours.

**3. Automated weekly analysis:**
Working on a cron job that analyses bot performance and call transcripts weekly, generates a gap report, and auto-distributes it to relevant stakeholders. Also highlights what improved from last week — surfacing whether action was taken or not. Fully automated.

**4. This bot:**
Built this Neural Map using Claude Code — Next.js app, API integration, content processing, streaming interface. Trained on 10 years of my notes, Substack articles, investment thesis, and frameworks.

**5. Claude Code as daily tool:**
Full-stack development, data analysis, competitive research, rapid prototyping. I write production code with AI as a pair programmer — not drafting emails.`,
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
