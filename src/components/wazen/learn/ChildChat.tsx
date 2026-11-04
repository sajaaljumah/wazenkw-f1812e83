import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { BuddyMascotIllustration } from "@/components/wazen/dashboard/child/illustrations";
import { AddIcon, AlertIcon, ExpandIcon, ICON_STROKE, RetryIcon, SendIcon } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useSession } from "@/hooks/use-wazen-auth";
import { CHILD_CHAT_LIMITS, type ChildChatTurn } from "@/lib/child-chat";
import { sendChildLearningChatFn, type ChildChatResult } from "@/lib/child-chat.functions";
import type { Text } from "@/lib/learning";
import { cn } from "@/lib/utils";

const COPY = {
  title: { en: "Wazen Buddy", ar: "رفيق وازن" },
  subtitle: {
    en: "Ask me anything about money — I'll explain it simply.",
    ar: "اسألني أي شيء عن المال وبشرح لك ببساطة.",
  },
  newChat: { en: "New chat", ar: "محادثة جديدة" },
  expand: { en: "Open chat", ar: "افتح المحادثة" },
  collapse: { en: "Close chat", ar: "أغلق المحادثة" },
  welcome: {
    en: "Hi {name}! I'm Wazen Buddy. I can help you save, plan and learn about money. What would you like to know today?",
    ar: "هلا {name}! أنا رفيق وازن. أقدر أساعدك تدّخر وتخطط وتتعلم عن المال. شنو تحب تعرف اليوم؟",
  },
  starters: {
    en: [
      "How can I save my money?",
      "What's the difference between needs and wants?",
      "Help me reach my savings goal!",
      "Teach me something new about money.",
    ],
    ar: [
      "كيف أقدر أدّخر فلوسي؟",
      "شنو الفرق بين الاحتياجات والرغبات؟",
      "ساعدني أوصل لهدف الادخار!",
      "علّمني شي جديد عن المال.",
    ],
  },
  placeholder: { en: "Type your question…", ar: "اكتب سؤالك…" },
  send: { en: "Send", ar: "إرسال" },
  typing: { en: "Wazen Buddy is thinking", ar: "رفيق وازن يفكر" },
  retry: { en: "Try again", ar: "حاول مرة ثانية" },
  you: { en: "You", ar: "أنت" },
  safety: {
    en: "Never share passwords, card numbers or your address. Ask a parent for big money decisions.",
    ar: "لا تشارك كلمة السر أو رقم البطاقة أو عنوانك أبداً. اسأل أحد والديك عن القرارات المالية الكبيرة.",
  },
  errors: {
    NOT_CONFIGURED: {
      en: "Wazen Buddy is resting right now and can't chat yet. Please try again later.",
      ar: "رفيق وازن يرتاح الحين وما يقدر يسولف. جرّب مرة ثانية بعدين.",
    },
    BUSY: {
      en: "Lots of friends are chatting right now. Wait a moment and try again.",
      ar: "في أصدقاء واجد يسولفون الحين. انتظر شوي وحاول مرة ثانية.",
    },
    UNAVAILABLE: {
      en: "Oops, I couldn't answer this time. Let's try again.",
      ar: "أووه، ما قدرت أجاوب هالمرة. خلنا نحاول مرة ثانية.",
    },
    PREMIUM_REQUIRED: {
      en: "Wazen Buddy is part of your family's Premium plan.",
      ar: "رفيق وازن جزء من الخطة المميزة لعائلتك.",
    },
    NOT_CHILD: {
      en: "Wazen Buddy is only for children's learning accounts.",
      ar: "رفيق وازن مخصص لحسابات تعلّم الأطفال فقط.",
    },
  },
} satisfies Record<string, unknown>;

type ErrorCode = Extract<ChildChatResult, { ok: false }>["code"];
const storageKey = (userId: string) => `wazen.childChat.v1.${userId}`;

export function ChildChat({ firstName }: { firstName: string }) {
  const { language } = useWazenLocale();
  const t = (text: Text) => text[language];
  const { user } = useSession();
  const userId = user?.id ?? null;
  const sendChat = useServerFn(sendChildLearningChatFn);

  const [messages, setMessages] = useState<ChildChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const inFlight = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the conversation for this browser session only (per account).
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = window.sessionStorage.getItem(storageKey(userId));
      if (raw) setMessages(JSON.parse(raw) as ChildChatTurn[]);
    } catch {
      /* ignore broken session data */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      setExpanded(window.sessionStorage.getItem(`${storageKey(userId)}.open`) === "1");
    } catch {
      /* storage may be unavailable */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      window.sessionStorage.setItem(`${storageKey(userId)}.open`, expanded ? "1" : "0");
    } catch {
      /* storage may be unavailable */
    }
  }, [expanded, userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      window.sessionStorage.setItem(storageKey(userId), JSON.stringify(messages));
    } catch {
      /* storage may be unavailable */
    }
  }, [messages, userId]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }, [messages, pending, error, expanded]);

  async function ask(history: ChildChatTurn[]) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await sendChat({ data: { language, messages: history } });
      if (result.ok) {
        setMessages([...history, { role: "assistant", content: result.reply }]);
      } else {
        setError(result.code);
      }
    } catch {
      setError("UNAVAILABLE");
    } finally {
      inFlight.current = false;
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function submit(text: string) {
    const content = text.trim().slice(0, CHILD_CHAT_LIMITS.maxMessageChars);
    if (!content || inFlight.current) return;
    const history: ChildChatTurn[] = [...messages, { role: "user", content }];
    setMessages(history);
    setDraft("");
    void ask(history);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit(draft);
    }
  }

  function retry() {
    if (messages.length && messages[messages.length - 1]?.role === "user") void ask(messages);
  }

  function newChat() {
    if (inFlight.current) return;
    setMessages([]);
    setError(null);
    setDraft("");
    inputRef.current?.focus();
  }

  const empty = messages.length === 0;

  return (
    <section
      aria-labelledby="child-chat-title"
      className="kid-panel flex flex-col overflow-hidden bg-kid-tint"
    >
      <header className={cn("flex items-center gap-2 p-4 sm:p-5", expanded && "border-b border-kid-soft")}>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="child-chat-body"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-start outline-hidden focus-visible:ring-2 focus-visible:ring-kid-champagne/50"
        >
          <span className="size-12 shrink-0 kid-float sm:size-14">
            <BuddyMascotIllustration />
          </span>
          <span className="min-w-0 flex-1">
            <span id="child-chat-title" className="block truncate text-lg sm:text-xl">
              {t(COPY.title)}
            </span>
            <span className="block text-xs text-muted-foreground sm:text-sm">{t(COPY.subtitle)}</span>
          </span>
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-kid-soft bg-card text-kid-deep">
            <ExpandIcon
              className={cn("size-3.5 transition-transform duration-300", expanded && "rotate-180")}
              strokeWidth={ICON_STROKE}
            />
            <span className="sr-only">{expanded ? t(COPY.collapse) : t(COPY.expand)}</span>
          </span>
        </button>
        {expanded ? (
          <button
            type="button"
            onClick={newChat}
            disabled={pending || empty}
            className="kid-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-kid-soft bg-card px-3 text-xs text-kid-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AddIcon className="size-3.5" strokeWidth={ICON_STROKE} />
            <span className="hidden min-[380px]:inline">{t(COPY.newChat)}</span>
            <span className="sr-only min-[380px]:hidden">{t(COPY.newChat)}</span>
          </button>
        ) : null}
      </header>

      {expanded ? (
      <div id="child-chat-body" className="wazen-enter">

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={pending}
        className="flex max-h-[min(28rem,65vh)] min-h-[14rem] flex-col gap-3 overflow-y-auto p-4 sm:p-5"
      >
        <BuddyBubble>{t(COPY.welcome).replace("{name}", firstName)}</BuddyBubble>

        {messages.map((message, index) =>
          message.role === "assistant" ? (
            <BuddyBubble key={index} markdown>
              {message.content}
            </BuddyBubble>
          ) : (
            <div key={index} className="flex justify-end">
              <p
                className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-ee-md bg-kid-deep px-4 py-2.5 text-sm text-kid-ivory"
                aria-label={t(COPY.you)}
              >
                {message.content}
              </p>
            </div>
          ),
        )}

        {pending ? (
          <div className="flex items-end gap-2" role="status" aria-label={t(COPY.typing)}>
            <span className="size-8 shrink-0">
              <BuddyMascotIllustration />
            </span>
            <span className="inline-flex items-center gap-1 rounded-2xl rounded-es-md border border-kid-soft bg-card px-4 py-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-2 rounded-full bg-kid-champagne motion-safe:animate-bounce"
                  style={{ animationDelay: `${dot * 140}ms` }}
                />
              ))}
            </span>
          </div>
        ) : null}

        {error ? (
          <div
            className="kid-pop flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
            role="alert"
          >
            <p className="flex items-start gap-2">
              <AlertIcon
                className="mt-0.5 size-4 shrink-0 text-kid-deep"
                strokeWidth={ICON_STROKE}
              />
              {t(COPY.errors[error])}
            </p>
            {error !== "NOT_CHILD" && error !== "PREMIUM_REQUIRED" ? (
              <button
                type="button"
                onClick={retry}
                className="kid-press inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-kid-deep px-4 text-xs text-kid-ivory"
              >
                <RetryIcon className="size-4" strokeWidth={ICON_STROKE} />
                {t(COPY.retry)}
              </button>
            ) : null}
          </div>
        ) : null}

        {empty && !pending ? (
          <ul className="mt-1 grid gap-2 min-[520px]:grid-cols-2">
            {COPY.starters[language].map((starter) => (
              <li key={starter}>
                <button
                  type="button"
                  onClick={() => submit(starter)}
                  className="kid-press w-full rounded-2xl border border-kid-soft bg-card px-4 py-3 text-start text-sm text-kid-deep"
                >
                  {starter}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-kid-soft bg-card p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <label htmlFor="child-chat-input" className="sr-only">
            {t(COPY.placeholder)}
          </label>
          <textarea
            id="child-chat-input"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t(COPY.placeholder)}
            maxLength={CHILD_CHAT_LIMITS.maxMessageChars}
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-kid-soft bg-kid-tint px-4 py-2.5 text-sm outline-hidden placeholder:text-muted-foreground focus-visible:border-kid-champagne focus-visible:ring-2 focus-visible:ring-kid-champagne/40"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label={t(COPY.send)}
            className="kid-press inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-kid-deep text-kid-ivory disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon className="size-5 rtl:rotate-180" strokeWidth={ICON_STROKE} />
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-muted-foreground">{t(COPY.safety)}</p>
      </form>
      </div>
      ) : null}
    </section>
  );
}

function BuddyBubble({ children, markdown = false }: { children: string; markdown?: boolean }) {
  return (
    <div className="flex items-end gap-2">
      <span className="size-8 shrink-0">
        <BuddyMascotIllustration />
      </span>
      <div
        className={cn(
          "max-w-[85%] break-words rounded-2xl rounded-es-md border border-kid-soft bg-card px-4 py-2.5 text-sm leading-relaxed",
          "[&_li]:ms-4 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:text-kid-deep [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:space-y-1 [&_ul]:mt-1 [&_ol]:mt-1",
        )}
      >
        {markdown ? <ReactMarkdown>{children}</ReactMarkdown> : <p>{children}</p>}
      </div>
    </div>
  );
}
