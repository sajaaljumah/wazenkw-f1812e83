import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import {
  AddIcon,
  AiIcon,
  AlertIcon,
  ExpandIcon,
  ICON_STROKE,
  RetryIcon,
  SendIcon,
} from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useSession } from "@/hooks/use-wazen-auth";
import { ADULT_CHAT_LIMITS, type AdultChatTurn } from "@/lib/adult-chat";
import { sendAdultFinanceChatFn, type AdultChatResult } from "@/lib/adult-chat.functions";
import { cn } from "@/lib/utils";

type Text = { en: string; ar: string };

const COPY = {
  title: { en: "Wazen AI", ar: "Wazen AI" },
  subtitle: {
    en: "Your personal finance assistant, using your own Wazen data.",
    ar: "مساعدك المالي الشخصي، يعتمد على بياناتك في وازن.",
  },
  welcome: {
    en: "Hi {name}. I've looked at your income, spending, budget, goals and commitments in Wazen. Ask me anything about your money.",
    ar: "أهلاً {name}. اطّلعت على دخلك ومصروفاتك وميزانيتك وأهدافك والتزاماتك في وازن. اسألني أي شيء عن أموالك.",
  },
  starters: {
    en: [
      "Why did my expenses increase this month?",
      "How can I save more money?",
      "Am I staying within my monthly budget?",
      "How can I reach my savings goal faster?",
      "Analyze my spending habits.",
      "What should I improve in my financial plan?",
    ],
    ar: [
      "ليش زادت مصروفاتي هذا الشهر؟",
      "كيف أقدر أدّخر أكثر؟",
      "هل أنا ملتزم بميزانيتي الشهرية؟",
      "كيف أوصل لهدف الادخار أسرع؟",
      "حلّل عاداتي في الصرف.",
      "شنو لازم أحسّن في خطتي المالية؟",
    ],
  },
  placeholder: { en: "Ask about your finances…", ar: "اسأل عن أموالك…" },
  send: { en: "Send", ar: "إرسال" },
  newChat: { en: "New chat", ar: "محادثة جديدة" },
  expand: { en: "Expand", ar: "توسيع" },
  collapse: { en: "Collapse", ar: "تصغير" },
  thinking: { en: "Analyzing your data", ar: "جارٍ تحليل بياناتك" },
  retry: { en: "Try again", ar: "حاول مرة أخرى" },
  note: {
    en: "Suggestions are educational. Wazen AI never moves money or changes your records.",
    ar: "الاقتراحات تعليمية. Wazen AI لا ينقل أموالاً ولا يغيّر سجلاتك أبداً.",
  },
  errors: {
    NOT_CONFIGURED: {
      en: "Wazen AI isn't available right now. Please try again later.",
      ar: "Wazen AI غير متاح حالياً. حاول مرة أخرى لاحقاً.",
    },
    BUSY: {
      en: "Wazen AI is busy right now. Wait a moment and try again.",
      ar: "Wazen AI مشغول حالياً. انتظر لحظة ثم حاول مرة أخرى.",
    },
    UNAVAILABLE: {
      en: "Couldn't get an answer this time. Please try again.",
      ar: "تعذّر الحصول على إجابة هذه المرة. حاول مرة أخرى.",
    },
    NOT_ALLOWED: {
      en: "Wazen AI is available for adult accounts only.",
      ar: "Wazen AI متاح للحسابات البالغة فقط.",
    },
  },
} satisfies Record<string, unknown>;

type ErrorCode = Extract<AdultChatResult, { ok: false }>["code"];
const storageKey = (userId: string) => `wazen.adultChat.v1.${userId}`;

export function AiAssistantChat({ firstName }: { firstName: string }) {
  const { language } = useWazenLocale();
  const t = (text: Text) => text[language];
  const { user } = useSession();
  const userId = user?.id ?? null;
  const sendChat = useServerFn(sendAdultFinanceChatFn);

  const [messages, setMessages] = useState<AdultChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const inFlight = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation lives for this browser session only, per account.
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = window.sessionStorage.getItem(storageKey(userId));
      if (raw) setMessages(JSON.parse(raw) as AdultChatTurn[]);
    } catch {
      /* ignore broken session data */
    }
  }, [userId]);

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

  async function ask(history: AdultChatTurn[]) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await sendChat({ data: { language, messages: history } });
      if (result.ok) setMessages([...history, { role: "assistant", content: result.reply }]);
      else setError(result.code);
    } catch {
      setError("UNAVAILABLE");
    } finally {
      inFlight.current = false;
      setPending(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function submit(text: string) {
    const content = text.trim().slice(0, ADULT_CHAT_LIMITS.maxMessageChars);
    if (!content || inFlight.current) return;
    const history: AdultChatTurn[] = [...messages, { role: "user", content }];
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
    if (messages[messages.length - 1]?.role === "user") void ask(messages);
  }

  function newChat() {
    if (inFlight.current) return;
    setMessages([]);
    setError(null);
    setDraft("");
    inputRef.current?.focus({ preventScroll: true });
  }

  const empty = messages.length === 0;

  return (
    <section aria-labelledby="wazen-ai-title" className="wazen-card min-w-0 overflow-hidden p-0">
      <header className="flex items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
        <span className="gloss-red flex size-11 shrink-0 items-center justify-center rounded-2xl text-primary-foreground">
          <AiIcon className="size-5" strokeWidth={ICON_STROKE} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="wazen-ai-title" className="truncate text-lg sm:text-xl">
            {t(COPY.title)}
          </h2>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{t(COPY.subtitle)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={newChat}
            disabled={pending || empty}
            title={t(COPY.newChat)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AddIcon className="size-4" strokeWidth={ICON_STROKE} />
            <span className="hidden sm:inline">{t(COPY.newChat)}</span>
            <span className="sr-only sm:hidden">{t(COPY.newChat)}</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="wazen-ai-log"
            title={expanded ? t(COPY.collapse) : t(COPY.expand)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
          >
            <ExpandIcon
              className={cn("size-4 transition-transform duration-300", expanded && "rotate-180")}
              strokeWidth={ICON_STROKE}
            />
            <span className="sr-only">{expanded ? t(COPY.collapse) : t(COPY.expand)}</span>
          </button>
        </div>
      </header>

      <div
        id="wazen-ai-log"
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={pending}
        className={cn(
          "flex flex-col gap-3 overflow-y-auto px-4 py-4 transition-[max-height] duration-300 ease-out sm:px-6",
          expanded ? "max-h-[70vh]" : "max-h-[22rem]",
        )}
      >
        <AssistantBubble>{t(COPY.welcome).replace("{name}", firstName)}</AssistantBubble>

        {messages.map((message, index) =>
          message.role === "assistant" ? (
            <AssistantBubble key={index} markdown>
              {message.content}
            </AssistantBubble>
          ) : (
            <div key={index} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-ee-md bg-foreground px-4 py-2.5 text-sm text-background">
                {message.content}
              </p>
            </div>
          ),
        )}

        {pending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <span className="inline-flex items-center gap-1 rounded-2xl rounded-es-md border border-border bg-secondary/60 px-4 py-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 rounded-full bg-primary motion-safe:animate-bounce"
                  style={{ animationDelay: `${dot * 140}ms` }}
                />
              ))}
            </span>
            {t(COPY.thinking)}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-secondary/50 p-4 text-sm"
          >
            <p className="flex items-start gap-2">
              <AlertIcon
                className="mt-0.5 size-4 shrink-0 text-primary"
                strokeWidth={ICON_STROKE}
              />
              {t(COPY.errors[error])}
            </p>
            {error !== "NOT_ALLOWED" ? (
              <button
                type="button"
                onClick={retry}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-xs text-background transition-opacity hover:opacity-90"
              >
                <RetryIcon className="size-4" strokeWidth={ICON_STROKE} />
                {t(COPY.retry)}
              </button>
            ) : null}
          </div>
        ) : null}

        {empty && !pending ? (
          <ul className="mt-1 flex flex-wrap gap-2">
            {COPY.starters[language].map((starter) => (
              <li key={starter}>
                <button
                  type="button"
                  onClick={() => submit(starter)}
                  className="rounded-full border border-border bg-card px-3.5 py-2 text-start text-xs transition-colors hover:border-primary/40 hover:bg-secondary sm:text-sm"
                >
                  {starter}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border/70 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-end gap-2">
          <label htmlFor="wazen-ai-input" className="sr-only">
            {t(COPY.placeholder)}
          </label>
          <textarea
            id="wazen-ai-input"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t(COPY.placeholder)}
            maxLength={ADULT_CHAT_LIMITS.maxMessageChars}
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label={t(COPY.send)}
            className="gloss-red inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon className="size-5 rtl:rotate-180" strokeWidth={ICON_STROKE} />
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-muted-foreground">{t(COPY.note)}</p>
      </form>
    </section>
  );
}

function AssistantBubble({ children, markdown = false }: { children: string; markdown?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AiIcon className="size-3.5" strokeWidth={ICON_STROKE} />
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[88%] break-words rounded-2xl rounded-ss-md border border-border/70 bg-secondary/40 px-4 py-2.5 text-sm leading-relaxed",
          "[&_li]:ms-4 [&_ol]:mt-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p+p]:mt-2 [&_p+ul]:mt-2 [&_strong]:text-foreground [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:space-y-1",
        )}
      >
        {markdown ? <ReactMarkdown>{children}</ReactMarkdown> : <p>{children}</p>}
      </div>
    </div>
  );
}
