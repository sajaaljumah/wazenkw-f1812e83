/**
 * Wazen child financial-education content and progress rules.
 *
 * The catalogue (lessons, games, quiz bank, challenges, badges) lives here in
 * code; only a child's *progress* is stored in the database. This keeps a
 * single learning system — no duplicate quiz/game/challenge/badge sources.
 */
import type { WazenLanguage } from "@/components/wazen/WazenLocale";

export type Text = { en: string; ar: string };
export const say = (language: WazenLanguage, text: Text) => text[language];

export type LearnTopic =
  | "needs_wants"
  | "saving"
  | "spending"
  | "budget"
  | "goals"
  | "giving"
  | "zakat";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export const DIFFICULTY_LABEL: Record<Difficulty, Text> = {
  beginner: { en: "Beginner", ar: "مبتدئ" },
  intermediate: { en: "Intermediate", ar: "متوسط" },
  advanced: { en: "Advanced", ar: "متقدم" },
};

export const TOPIC_LABEL: Record<LearnTopic, Text> = {
  needs_wants: { en: "Needs & wants", ar: "الاحتياجات والرغبات" },
  saving: { en: "Saving", ar: "الادخار" },
  spending: { en: "Spending", ar: "الصرف" },
  budget: { en: "Budgeting", ar: "الميزانية" },
  goals: { en: "Goals", ar: "الأهداف" },
  giving: { en: "Giving", ar: "العطاء" },
  zakat: { en: "Zakat (learning)", ar: "الزكاة (تعليمي)" },
};

/* ------------------------------------------------------------------ rows */

export type ActivityType = "lesson" | "game" | "quiz";

export type LearningProgress = {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_key: string;
  topic: string | null;
  status: "in_progress" | "completed";
  score: number;
  best_score: number;
  max_score: number;
  attempts: number;
  difficulty: string | null;
  last_activity_at: string;
};

export type LearningProfile = {
  user_id: string;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_on: string | null;
};

export type LearningChallenge = {
  id: string;
  user_id: string;
  challenge_key: string;
  target_days: number;
  days_completed: number;
  status: "active" | "completed";
  started_on: string;
  last_checkin_on: string | null;
  completed_on: string | null;
};

/* --------------------------------------------------------------- lessons */

export type LessonStep = { title: Text; body: Text };

export type Lesson = {
  key: string;
  topic: LearnTopic;
  title: Text;
  summary: Text;
  minutes: number;
  xp: number;
  steps: LessonStep[];
  takeaway: Text;
};

export const LESSONS: Lesson[] = [
  {
    key: "needs-wants",
    topic: "needs_wants",
    title: { en: "My needs and my wants", ar: "احتياجاتي ورغباتي" },
    summary: {
      en: "Learn the difference between what you need and what you simply want.",
      ar: "تعرّف على الفرق بين ما تحتاجه وما ترغب به فقط.",
    },
    minutes: 3,
    xp: 40,
    steps: [
      {
        title: { en: "A need keeps you well", ar: "الاحتياج يحفظ صحتك" },
        body: {
          en: "Food, water, school clothes and medicine are needs. Life becomes hard without them.",
          ar: "الطعام والماء وملابس المدرسة والدواء احتياجات. الحياة تصعب بدونها.",
        },
      },
      {
        title: { en: "A want is extra joy", ar: "الرغبة متعة إضافية" },
        body: {
          en: "A new game, sweets or a toy are wants. They are fun, but you can wait for them.",
          ar: "لعبة جديدة أو حلوى أو دمية رغبات. ممتعة، لكن يمكنك الانتظار.",
        },
      },
      {
        title: { en: "Needs come first", ar: "الاحتياجات أولاً" },
        body: {
          en: "Cover your needs first, then choose one want you really care about.",
          ar: "غطِّ احتياجاتك أولاً، ثم اختر رغبة واحدة تهمك فعلاً.",
        },
      },
    ],
    takeaway: {
      en: "Before buying, ask: do I need this, or do I want this?",
      ar: "قبل الشراء اسأل: هل أحتاج هذا أم أرغب به؟",
    },
  },
  {
    key: "how-to-save",
    topic: "saving",
    title: { en: "How do I save?", ar: "كيف أوفر؟" },
    summary: {
      en: "Small amounts, kept safely and often, become a big amount.",
      ar: "المبالغ الصغيرة المحفوظة بانتظام تصبح مبلغاً كبيراً.",
    },
    minutes: 3,
    xp: 40,
    steps: [
      {
        title: { en: "Save first, not last", ar: "ادخر أولاً لا أخيراً" },
        body: {
          en: "When you receive money, put a small part aside before you spend anything.",
          ar: "عندما تحصل على مال، ضع جزءاً صغيراً جانباً قبل أن تصرف شيئاً.",
        },
      },
      {
        title: { en: "Keep it in one place", ar: "احفظه في مكان واحد" },
        body: {
          en: "Money spread everywhere disappears. One safe place makes it grow visibly.",
          ar: "المال المتفرق يضيع. مكان واحد آمن يجعله ينمو أمام عينيك.",
        },
      },
      {
        title: { en: "Be steady", ar: "كن منتظماً" },
        body: {
          en: "Saving a little every week beats saving a lot once and then stopping.",
          ar: "ادخار القليل كل أسبوع أفضل من ادخار الكثير مرة واحدة ثم التوقف.",
        },
      },
    ],
    takeaway: {
      en: "Steady small saving is the strongest money habit.",
      ar: "الادخار القليل المنتظم أقوى عادة مالية.",
    },
  },
  {
    key: "smart-spending",
    topic: "spending",
    title: { en: "How do I spend smartly?", ar: "كيف أصرف بذكاء؟" },
    summary: {
      en: "Compare, wait a little, then decide with a calm mind.",
      ar: "قارن، وانتظر قليلاً، ثم قرّر بعقل هادئ.",
    },
    minutes: 3,
    xp: 40,
    steps: [
      {
        title: { en: "Compare prices", ar: "قارن الأسعار" },
        body: {
          en: "The same thing can cost different amounts in different shops.",
          ar: "الشيء نفسه قد يكون بأسعار مختلفة في متاجر مختلفة.",
        },
      },
      {
        title: { en: "Wait one day", ar: "انتظر يوماً واحداً" },
        body: {
          en: "If you still want it tomorrow, it matters. Many wishes fade overnight.",
          ar: "إذا بقيت ترغب به غداً فهو مهم. كثير من الرغبات تختفي بين ليلة وصباح.",
        },
      },
      {
        title: { en: "Count what is left", ar: "احسب ما تبقّى" },
        body: {
          en: "Before paying, think about what you still need this week.",
          ar: "قبل الدفع، فكّر بما تحتاجه هذا الأسبوع.",
        },
      },
    ],
    takeaway: {
      en: "A smart buyer thinks first and pays second.",
      ar: "المشتري الذكي يفكر أولاً ويدفع ثانياً.",
    },
  },
  {
    key: "what-is-budget",
    topic: "budget",
    title: { en: "What is a budget?", ar: "ما هي الميزانية؟" },
    summary: {
      en: "A budget is a simple plan for your money before you use it.",
      ar: "الميزانية خطة بسيطة لمالك قبل أن تستخدمه.",
    },
    minutes: 4,
    xp: 50,
    steps: [
      {
        title: { en: "Start with what you have", ar: "ابدأ بما لديك" },
        body: {
          en: "Write down the money you received this month.",
          ar: "اكتب المال الذي حصلت عليه هذا الشهر.",
        },
      },
      {
        title: { en: "Give every part a job", ar: "أعطِ كل جزء مهمة" },
        body: {
          en: "Some for needs, some for saving, some for giving, a little for fun.",
          ar: "جزء للاحتياجات، وجزء للادخار، وجزء للعطاء، وقليل للمتعة.",
        },
      },
      {
        title: { en: "Check at the end", ar: "راجع في النهاية" },
        body: {
          en: "Compare your plan with what really happened, then improve next month.",
          ar: "قارن خطتك بما حدث فعلاً، ثم حسّنها الشهر القادم.",
        },
      },
    ],
    takeaway: {
      en: "A budget is you deciding, instead of money deciding for you.",
      ar: "الميزانية أن تقرر أنت، بدلاً من أن يقرر المال عنك.",
    },
  },
  {
    key: "set-a-goal",
    topic: "goals",
    title: { en: "How do I set my goal?", ar: "كيف أحدد هدفي؟" },
    summary: {
      en: "A clear goal with a date turns saving into a game you can win.",
      ar: "الهدف الواضح بتاريخ محدد يحوّل الادخار إلى لعبة تفوز بها.",
    },
    minutes: 3,
    xp: 40,
    steps: [
      {
        title: { en: "Name it", ar: "سمِّ هدفك" },
        body: {
          en: "\"A bicycle\" is a goal. \"Something nice\" is not.",
          ar: "«دراجة» هدف. «شيء جميل» ليس هدفاً.",
        },
      },
      {
        title: { en: "Know the price", ar: "اعرف السعر" },
        body: {
          en: "Find the real price so you know how much to save.",
          ar: "اعرف السعر الحقيقي لتعرف كم تحتاج أن تدخر.",
        },
      },
      {
        title: { en: "Split it into weeks", ar: "قسّمه على الأسابيع" },
        body: {
          en: "Divide the price by the weeks you have. That is your weekly amount.",
          ar: "اقسم السعر على عدد الأسابيع المتاحة. هذا مبلغك الأسبوعي.",
        },
      },
    ],
    takeaway: {
      en: "Named goal + real price + weekly amount = you get there.",
      ar: "هدف واضح + سعر حقيقي + مبلغ أسبوعي = تصل.",
    },
  },
  {
    key: "why-we-give",
    topic: "giving",
    title: { en: "Why do we give to others?", ar: "لماذا نعطي الآخرين؟" },
    summary: {
      en: "Giving is a habit of the heart, and it can be small.",
      ar: "العطاء عادة من القلب، ويمكن أن يكون بسيطاً.",
    },
    minutes: 3,
    xp: 40,
    steps: [
      {
        title: { en: "Giving helps people", ar: "العطاء يساعد الناس" },
        body: {
          en: "A small amount from many people solves big problems.",
          ar: "مبلغ صغير من كثير من الناس يحل مشاكل كبيرة.",
        },
      },
      {
        title: { en: "Giving is voluntary", ar: "العطاء تطوعي" },
        body: {
          en: "Sadaqah is a gift you choose to give whenever you wish.",
          ar: "الصدقة عطاء تختاره متى شئت.",
        },
      },
      {
        title: { en: "Plan a little for it", ar: "خطّط له قليلاً" },
        body: {
          en: "Keeping a small part for giving makes it a habit, not a surprise.",
          ar: "تخصيص جزء صغير للعطاء يجعله عادة لا مفاجأة.",
        },
      },
    ],
    takeaway: {
      en: "Kindness costs little and matters a lot.",
      ar: "الإحسان يكلف قليلاً ويعني كثيراً.",
    },
  },
  {
    key: "what-is-zakat",
    topic: "zakat",
    title: { en: "What is Zakat? (learning only)", ar: "ما هي الزكاة؟ (تعليمي فقط)" },
    summary: {
      en: "An educational introduction. This lesson does not calculate any Zakat for you.",
      ar: "مقدمة تعليمية. هذا الدرس لا يحسب أي زكاة عليك.",
    },
    minutes: 4,
    xp: 50,
    steps: [
      {
        title: { en: "Zakat is a pillar", ar: "الزكاة من أركان الإسلام" },
        body: {
          en: "It is a known right of the poor in the wealth of adults who own enough wealth for a full year.",
          ar: "هي حق معلوم للفقراء في مال الكبار الذين يملكون نصاباً لمدة سنة كاملة.",
        },
      },
      {
        title: { en: "It has conditions", ar: "لها شروط" },
        body: {
          en: "There is a minimum amount (Nisab) and a full lunar year (Hawl) before Zakat is due.",
          ar: "هناك حد أدنى (النصاب) وسنة هجرية كاملة (الحول) قبل أن تجب الزكاة.",
        },
      },
      {
        title: { en: "Different from Sadaqah", ar: "تختلف عن الصدقة" },
        body: {
          en: "Sadaqah is voluntary and any amount. Zakat is an obligation with rules.",
          ar: "الصدقة تطوعية وبأي مبلغ. الزكاة فريضة لها أحكام.",
        },
      },
      {
        title: { en: "Learning now, not paying now", ar: "تعلّم الآن لا دفع الآن" },
        body: {
          en: "You are learning the idea. Wazen only calculates Zakat for accounts the rules apply to.",
          ar: "أنت تتعلم الفكرة. وازن يحسب الزكاة فقط للحسابات التي تنطبق عليها الأحكام.",
        },
      },
    ],
    takeaway: {
      en: "Zakat is an obligation of adult wealth; this page is education only.",
      ar: "الزكاة فريضة في مال الكبار؛ وهذه الصفحة للتعليم فقط.",
    },
  },
];

/* ----------------------------------------------------------------- games */

export type GameKey =
  | "needs-or-wants"
  | "build-your-budget"
  | "save-for-goal"
  | "smart-shopper"
  | "money-mission";

export type GameMeta = {
  key: GameKey;
  topic: LearnTopic;
  title: Text;
  summary: Text;
  how: Text;
  rounds: number;
};

export const GAMES: GameMeta[] = [
  {
    key: "needs-or-wants",
    topic: "needs_wants",
    title: { en: "Needs or wants?", ar: "الاحتياجات أم الرغبات؟" },
    summary: { en: "Sort things quickly into needs and wants.", ar: "صنّف الأشياء بسرعة إلى احتياجات ورغبات." },
    how: {
      en: "You will see one thing at a time. Tap Need or Want. Harder levels add trickier items.",
      ar: "سيظهر لك شيء واحد كل مرة. اختر احتياج أو رغبة. المستويات الأصعب تضيف أشياء أذكى.",
    },
    rounds: 8,
  },
  {
    key: "build-your-budget",
    topic: "budget",
    title: { en: "Build your budget", ar: "ابنِ ميزانيتك" },
    summary: { en: "Share your coins between saving, needs, giving and fun.", ar: "وزّع نقودك بين الادخار والاحتياجات والعطاء والمتعة." },
    how: {
      en: "You have coins to place. Cover the needs, save something, give something, and do not go over.",
      ar: "لديك نقود لتوزّعها. غطِّ الاحتياجات، وادخر شيئاً، وأعطِ شيئاً، ولا تتجاوز المبلغ.",
    },
    rounds: 3,
  },
  {
    key: "save-for-goal",
    topic: "goals",
    title: { en: "Save for your goal", ar: "ادخر لهدفك" },
    summary: { en: "Make weekly choices and reach your goal in time.", ar: "اتخذ قرارات أسبوعية وحقّق هدفك في الوقت." },
    how: {
      en: "Every week you choose what to do with your money. Reach the goal before the weeks end.",
      ar: "كل أسبوع تختار ما تفعله بمالك. اصل إلى الهدف قبل انتهاء الأسابيع.",
    },
    rounds: 6,
  },
  {
    key: "smart-shopper",
    topic: "spending",
    title: { en: "Smart shopper", ar: "المتسوق الذكي" },
    summary: { en: "Pick the better value in each pair.", ar: "اختر الخيار الأفضل قيمة في كل مقارنة." },
    how: {
      en: "Two offers appear. Choose the one that gives more value for the money.",
      ar: "يظهر عرضان. اختر العرض الذي يعطي قيمة أكبر للمال.",
    },
    rounds: 6,
  },
  {
    key: "money-mission",
    topic: "saving",
    title: { en: "Money mission", ar: "مهمة المال" },
    summary: { en: "Quick money decisions, one after another.", ar: "قرارات مالية سريعة، واحداً بعد الآخر." },
    how: {
      en: "Answer fast money questions in a row. Each right answer moves the mission forward.",
      ar: "أجب على أسئلة مالية سريعة بالتتابع. كل إجابة صحيحة تُقدّم المهمة.",
    },
    rounds: 7,
  },
];

export const gameMeta = (key: GameKey) => GAMES.find((game) => game.key === key)!;

/** Needs-or-wants items, grouped by how tricky they are. */
export const NEEDS_WANTS_ITEMS: { label: Text; need: boolean; level: Difficulty }[] = [
  { label: { en: "Drinking water", ar: "ماء الشرب" }, need: true, level: "beginner" },
  { label: { en: "School bag", ar: "حقيبة المدرسة" }, need: true, level: "beginner" },
  { label: { en: "Video game", ar: "لعبة إلكترونية" }, need: false, level: "beginner" },
  { label: { en: "Candy", ar: "حلوى" }, need: false, level: "beginner" },
  { label: { en: "Medicine", ar: "دواء" }, need: true, level: "beginner" },
  { label: { en: "Toy car", ar: "سيارة لعبة" }, need: false, level: "beginner" },
  { label: { en: "Winter jacket", ar: "معطف الشتاء" }, need: true, level: "beginner" },
  { label: { en: "Stickers", ar: "ملصقات" }, need: false, level: "beginner" },
  { label: { en: "School shoes", ar: "حذاء المدرسة" }, need: true, level: "intermediate" },
  { label: { en: "A second pair of party shoes", ar: "حذاء مناسبات ثانٍ" }, need: false, level: "intermediate" },
  { label: { en: "Notebook for class", ar: "دفتر للحصة" }, need: true, level: "intermediate" },
  { label: { en: "Fancy pen set", ar: "طقم أقلام فخم" }, need: false, level: "intermediate" },
  { label: { en: "Healthy lunch", ar: "غداء صحي" }, need: true, level: "intermediate" },
  { label: { en: "Restaurant dessert", ar: "تحلية من المطعم" }, need: false, level: "intermediate" },
  { label: { en: "Bus fare to school", ar: "أجرة الباص للمدرسة" }, need: true, level: "advanced" },
  { label: { en: "Taxi because I woke up late", ar: "تاكسي لأنني تأخرت" }, need: false, level: "advanced" },
  { label: { en: "Eyeglasses I was prescribed", ar: "نظارة طبية موصوفة لي" }, need: true, level: "advanced" },
  { label: { en: "Sunglasses like my friend's", ar: "نظارة شمسية مثل صديقي" }, need: false, level: "advanced" },
  { label: { en: "Refill for my water bottle", ar: "تعبئة قارورة الماء" }, need: true, level: "advanced" },
  { label: { en: "New bottle because the colour is nicer", ar: "قارورة جديدة لأن لونها أجمل" }, need: false, level: "advanced" },
];

/** Smart-shopper comparisons: which offer gives more value? */
export const SHOPPER_PAIRS: {
  question: Text;
  options: [Text, Text];
  better: 0 | 1;
  why: Text;
  level: Difficulty;
}[] = [
  {
    question: { en: "Same juice, two shops", ar: "نفس العصير، متجران" },
    options: [
      { en: "1 bottle for 0.500 KWD", ar: "قارورة بـ 0.500 د.ك" },
      { en: "2 bottles for 0.700 KWD", ar: "قارورتان بـ 0.700 د.ك" },
    ],
    better: 1,
    why: { en: "Two bottles cost 0.350 each — cheaper per bottle.", ar: "القارورتان بـ 0.350 لكل واحدة — أرخص للقارورة." },
    level: "beginner",
  },
  {
    question: { en: "The notebook you need", ar: "الدفتر الذي تحتاجه" },
    options: [
      { en: "Plain notebook for 0.400 KWD", ar: "دفتر عادي بـ 0.400 د.ك" },
      { en: "Same notebook with a cartoon cover for 1.200 KWD", ar: "نفس الدفتر بغلاف مرسوم بـ 1.200 د.ك" },
    ],
    better: 0,
    why: { en: "Both write the same. The cover costs three times more.", ar: "الاثنان يكتبان بنفس الجودة. الغلاف يكلف ثلاثة أضعاف." },
    level: "beginner",
  },
  {
    question: { en: "A snack every school day", ar: "وجبة خفيفة كل يوم دراسي" },
    options: [
      { en: "Buy one daily for 0.250 KWD", ar: "شراء واحدة يومياً بـ 0.250 د.ك" },
      { en: "A family pack of 10 for 1.500 KWD", ar: "عبوة عائلية من 10 بـ 1.500 د.ك" },
    ],
    better: 1,
    why: { en: "The pack is 0.150 each instead of 0.250.", ar: "العبوة 0.150 للواحدة بدل 0.250." },
    level: "intermediate",
  },
  {
    question: { en: "A game you already own", ar: "لعبة تملكها بالفعل" },
    options: [
      { en: "Buy a newer copy for 8 KWD", ar: "شراء نسخة أحدث بـ 8 د.ك" },
      { en: "Keep yours and save the 8 KWD", ar: "احتفظ بلعبتك وادخر الـ 8 د.ك" },
    ],
    better: 1,
    why: { en: "Paying twice for the same fun is not value.", ar: "الدفع مرتين لنفس المتعة ليس قيمة." },
    level: "intermediate",
  },
  {
    question: { en: "Big offer, short use", ar: "عرض كبير، استخدام قصير" },
    options: [
      { en: "10 pens for 1 KWD, you need 2", ar: "10 أقلام بـ 1 د.ك وتحتاج قلمين" },
      { en: "2 pens for 0.300 KWD", ar: "قلمان بـ 0.300 د.ك" },
    ],
    better: 1,
    why: { en: "A discount on things you will not use is still spending.", ar: "الخصم على ما لن تستخدمه يبقى صرفاً." },
    level: "advanced",
  },
  {
    question: { en: "Waiting has a price", ar: "الانتظار له سعر" },
    options: [
      { en: "Buy the shoes today for 12 KWD", ar: "شراء الحذاء اليوم بـ 12 د.ك" },
      { en: "The same shoes next week in the sale for 8 KWD", ar: "نفس الحذاء الأسبوع القادم بالتخفيض بـ 8 د.ك" },
    ],
    better: 1,
    why: { en: "If you can wait, waiting saved 4 KWD.", ar: "إذا كان بإمكانك الانتظار، فقد وفّر 4 د.ك." },
    level: "advanced",
  },
];

/** Budget game rounds: coins to place across four jobs. */
export const BUDGET_ROUNDS: {
  money: number;
  needs: number;
  minSave: number;
  minGive: number;
  story: Text;
}[] = [
  { money: 10, needs: 4, minSave: 2, minGive: 1, story: { en: "You received 10 KWD this month.", ar: "حصلت على 10 د.ك هذا الشهر." } },
  { money: 8, needs: 3, minSave: 2, minGive: 1, story: { en: "This month you have 8 KWD only.", ar: "هذا الشهر لديك 8 د.ك فقط." } },
  { money: 14, needs: 6, minSave: 4, minGive: 1, story: { en: "A gift made it 14 KWD — plan carefully.", ar: "هدية جعلت المبلغ 14 د.ك — خطّط بعناية." } },
];

/** Weekly decisions in the goal game. */
export const GOAL_CHOICES: { label: Text; save: number; hint: Text }[] = [
  { label: { en: "Save most of my allowance", ar: "أدخر معظم مصروفي" }, save: 3, hint: { en: "Fast progress", ar: "تقدّم سريع" } },
  { label: { en: "Save half, spend half", ar: "أدخر النصف وأصرف النصف" }, save: 2, hint: { en: "Balanced", ar: "متوازن" } },
  { label: { en: "Buy snacks, save a little", ar: "أشتري وجبات وأدخر قليلاً" }, save: 1, hint: { en: "Slow progress", ar: "تقدّم بطيء" } },
  { label: { en: "Spend everything this week", ar: "أصرف كل شيء هذا الأسبوع" }, save: 0, hint: { en: "No progress", ar: "بلا تقدّم" } },
];

/* ------------------------------------------------------------------ quiz */

export type QuizQuestion = {
  key: string;
  topic: LearnTopic;
  difficulty: Difficulty;
  prompt: Text;
  options: Text[];
  answer: number;
  explain: Text;
};

export const QUIZ_BANK: QuizQuestion[] = [
  {
    key: "q-nw-1",
    topic: "needs_wants",
    difficulty: "beginner",
    prompt: { en: "Which one is a need?", ar: "أي واحد منها احتياج؟" },
    options: [
      { en: "Drinking water", ar: "ماء الشرب" },
      { en: "A new toy", ar: "دمية جديدة" },
      { en: "Chocolate", ar: "شوكولاتة" },
    ],
    answer: 0,
    explain: { en: "Water keeps you healthy — that is a need.", ar: "الماء يحفظ صحتك — هذا احتياج." },
  },
  {
    key: "q-nw-2",
    topic: "needs_wants",
    difficulty: "intermediate",
    prompt: { en: "You have school shoes that fit. New party shoes are…", ar: "لديك حذاء مدرسة مناسب. حذاء المناسبات الجديد هو…" },
    options: [
      { en: "A want", ar: "رغبة" },
      { en: "A need", ar: "احتياج" },
      { en: "Free money", ar: "مال مجاني" },
    ],
    answer: 0,
    explain: { en: "Your feet are already covered, so the extra pair is a want.", ar: "قدماك مغطّاتان بالفعل، فالحذاء الإضافي رغبة." },
  },
  {
    key: "q-nw-3",
    topic: "needs_wants",
    difficulty: "advanced",
    prompt: { en: "Bus fare to school and a taxi because you slept late — which is the need?", ar: "أجرة الباص للمدرسة وتاكسي لأنك تأخرت — أيّهما الاحتياج؟" },
    options: [
      { en: "The bus fare", ar: "أجرة الباص" },
      { en: "The taxi", ar: "التاكسي" },
      { en: "Both the same", ar: "الاثنان سواء" },
    ],
    answer: 0,
    explain: { en: "The bus gets you there normally; the taxi paid for a mistake.", ar: "الباص وسيلتك المعتادة؛ التاكسي دفعتَه بسبب خطأ." },
  },
  {
    key: "q-sv-1",
    topic: "saving",
    difficulty: "beginner",
    prompt: { en: "When is the best time to save?", ar: "ما أفضل وقت للادخار؟" },
    options: [
      { en: "Right when I get money", ar: "عند حصولي على المال" },
      { en: "After I spend everything", ar: "بعد أن أصرف كل شيء" },
      { en: "Never", ar: "أبداً" },
    ],
    answer: 0,
    explain: { en: "Save first, then spend what is left.", ar: "ادخر أولاً، ثم اصرف ما تبقّى." },
  },
  {
    key: "q-sv-2",
    topic: "saving",
    difficulty: "intermediate",
    prompt: { en: "You save 1 KWD every week. How much after 6 weeks?", ar: "تدخر 1 د.ك كل أسبوع. كم يصبح المبلغ بعد 6 أسابيع؟" },
    options: [
      { en: "6 KWD", ar: "6 د.ك" },
      { en: "3 KWD", ar: "3 د.ك" },
      { en: "12 KWD", ar: "12 د.ك" },
    ],
    answer: 0,
    explain: { en: "1 × 6 = 6 KWD.", ar: "1 × 6 = 6 د.ك." },
  },
  {
    key: "q-sv-3",
    topic: "saving",
    difficulty: "advanced",
    prompt: { en: "Which habit builds savings fastest?", ar: "أي عادة تبني الادخار أسرع؟" },
    options: [
      { en: "A small amount every week without stopping", ar: "مبلغ صغير كل أسبوع دون توقف" },
      { en: "A big amount once a year", ar: "مبلغ كبير مرة في السنة" },
      { en: "Saving only what is left at the end", ar: "ادخار ما يتبقى في النهاية فقط" },
    ],
    answer: 0,
    explain: { en: "Regular saving beats rare big attempts.", ar: "الانتظام يتغلب على المحاولات الكبيرة النادرة." },
  },
  {
    key: "q-sp-1",
    topic: "spending",
    difficulty: "beginner",
    prompt: { en: "Before buying something, what should you do first?", ar: "قبل شراء شيء، ماذا تفعل أولاً؟" },
    options: [
      { en: "Think if I really need it", ar: "أفكر إن كنت أحتاجه فعلاً" },
      { en: "Buy it quickly", ar: "أشتريه بسرعة" },
      { en: "Ask for more money", ar: "أطلب مالاً أكثر" },
    ],
    answer: 0,
    explain: { en: "Thinking first prevents regret.", ar: "التفكير أولاً يمنع الندم." },
  },
  {
    key: "q-sp-2",
    topic: "spending",
    difficulty: "intermediate",
    prompt: { en: "The same pencil case is 1 KWD in one shop and 2 KWD in another. What do you do?", ar: "نفس المقلمة بـ 1 د.ك في متجر وبـ 2 د.ك في آخر. ماذا تفعل؟" },
    options: [
      { en: "Buy the 1 KWD one", ar: "أشتري التي بـ 1 د.ك" },
      { en: "Buy the 2 KWD one", ar: "أشتري التي بـ 2 د.ك" },
      { en: "Buy both", ar: "أشتري الاثنتين" },
    ],
    answer: 0,
    explain: { en: "Same item, lower price — you keep 1 KWD.", ar: "نفس الشيء بسعر أقل — تحتفظ بـ 1 د.ك." },
  },
  {
    key: "q-bd-1",
    topic: "budget",
    difficulty: "beginner",
    prompt: { en: "What is a budget?", ar: "ما هي الميزانية؟" },
    options: [
      { en: "A plan for my money", ar: "خطة لمالي" },
      { en: "A kind of shop", ar: "نوع من المتاجر" },
      { en: "A game only", ar: "لعبة فقط" },
    ],
    answer: 0,
    explain: { en: "A budget plans money before you use it.", ar: "الميزانية تخطّط للمال قبل استخدامه." },
  },
  {
    key: "q-bd-2",
    topic: "budget",
    difficulty: "advanced",
    prompt: { en: "You have 10 KWD: needs 4, saving 3, giving 1. How much is left for fun?", ar: "لديك 10 د.ك: احتياجات 4، ادخار 3، عطاء 1. كم يتبقى للمتعة؟" },
    options: [
      { en: "2 KWD", ar: "2 د.ك" },
      { en: "4 KWD", ar: "4 د.ك" },
      { en: "0 KWD", ar: "0 د.ك" },
    ],
    answer: 0,
    explain: { en: "10 − 4 − 3 − 1 = 2 KWD.", ar: "10 − 4 − 3 − 1 = 2 د.ك." },
  },
  {
    key: "q-gl-1",
    topic: "goals",
    difficulty: "beginner",
    prompt: { en: "Which is a clear goal?", ar: "أي واحد هدف واضح؟" },
    options: [
      { en: "A bicycle for 30 KWD by summer", ar: "دراجة بـ 30 د.ك قبل الصيف" },
      { en: "Something nice", ar: "شيء جميل" },
      { en: "More money", ar: "مال أكثر" },
    ],
    answer: 0,
    explain: { en: "A clear goal has a name, a price and a date.", ar: "الهدف الواضح له اسم وسعر وتاريخ." },
  },
  {
    key: "q-gl-2",
    topic: "goals",
    difficulty: "intermediate",
    prompt: { en: "Your goal costs 20 KWD and you have 10 weeks. How much per week?", ar: "هدفك بـ 20 د.ك ولديك 10 أسابيع. كم في الأسبوع؟" },
    options: [
      { en: "2 KWD", ar: "2 د.ك" },
      { en: "5 KWD", ar: "5 د.ك" },
      { en: "1 KWD", ar: "1 د.ك" },
    ],
    answer: 0,
    explain: { en: "20 ÷ 10 = 2 KWD each week.", ar: "20 ÷ 10 = 2 د.ك كل أسبوع." },
  },
  {
    key: "q-hb-1",
    topic: "saving",
    difficulty: "intermediate",
    prompt: { en: "Your friends are all buying something you do not need. You…", ar: "أصدقاؤك يشترون شيئاً لا تحتاجه. أنت…" },
    options: [
      { en: "Keep my money for my goal", ar: "أحتفظ بمالي لهدفي" },
      { en: "Buy it so I look the same", ar: "أشتريه لأبدو مثلهم" },
      { en: "Borrow money to buy it", ar: "أستلف مالاً لأشتريه" },
    ],
    answer: 0,
    explain: { en: "Your goal matters more than matching others.", ar: "هدفك أهم من مجاراة الآخرين." },
  },
  {
    key: "q-gv-1",
    topic: "giving",
    difficulty: "beginner",
    prompt: { en: "Sadaqah (giving) is…", ar: "الصدقة هي…" },
    options: [
      { en: "Voluntary, any amount", ar: "تطوعية، بأي مبلغ" },
      { en: "Only for adults", ar: "للكبار فقط" },
      { en: "Only very large amounts", ar: "للمبالغ الكبيرة فقط" },
    ],
    answer: 0,
    explain: { en: "Any small amount, given willingly, counts.", ar: "أي مبلغ صغير يُعطى برضا له قيمة." },
  },
  {
    key: "q-zk-1",
    topic: "zakat",
    difficulty: "intermediate",
    prompt: { en: "How is Zakat different from Sadaqah?", ar: "كيف تختلف الزكاة عن الصدقة؟" },
    options: [
      { en: "Zakat is an obligation with rules; Sadaqah is voluntary", ar: "الزكاة فريضة لها أحكام؛ والصدقة تطوعية" },
      { en: "They are exactly the same", ar: "هما نفس الشيء تماماً" },
      { en: "Sadaqah must be paid once a year", ar: "الصدقة تُدفع مرة في السنة" },
    ],
    answer: 0,
    explain: { en: "Zakat has a minimum amount and a full year; Sadaqah is a free gift.", ar: "للزكاة نصاب وحول كامل؛ والصدقة عطاء حر." },
  },
];

/** Quick-fire questions for the money-mission game (reuses the quiz bank). */
export const missionQuestions = (level: Difficulty): QuizQuestion[] => {
  const order: Difficulty[] = level === "beginner" ? ["beginner", "intermediate"] : level === "intermediate" ? ["intermediate", "beginner", "advanced"] : ["advanced", "intermediate"];
  const picked = order.flatMap((d) => QUIZ_BANK.filter((q) => q.difficulty === d));
  return picked.slice(0, 7);
};

/* ------------------------------------------------------------ challenges */

export type ChallengeMeta = {
  key: string;
  title: Text;
  description: Text;
  targetDays: number;
  reward: Text;
  xp: number;
};

export const CHALLENGES: ChallengeMeta[] = [
  {
    key: "save-7-days",
    title: { en: "Save for 7 days", ar: "تحدي الادخار لمدة 7 أيام" },
    description: { en: "Put something aside every day for a week.", ar: "ضع شيئاً جانباً كل يوم لمدة أسبوع." },
    targetDays: 7,
    reward: { en: "Saving Star badge", ar: "شارة نجم الادخار" },
    xp: 70,
  },
  {
    key: "no-extra-buying",
    title: { en: "No unnecessary buying", ar: "تحدي عدم الشراء غير الضروري" },
    description: { en: "For 5 days, buy needs only.", ar: "لمدة 5 أيام، اشترِ الاحتياجات فقط." },
    targetDays: 5,
    reward: { en: "Smart Shopper badge", ar: "شارة المتسوق الذكي" },
    xp: 60,
  },
  {
    key: "steady-saver",
    title: { en: "Keep saving", ar: "تحدي الادخار المستمر" },
    description: { en: "Check in for 14 days of steady saving.", ar: "سجّل حضورك 14 يوماً من الادخار المستمر." },
    targetDays: 14,
    reward: { en: "Saving Hero badge", ar: "شارة بطل الادخار" },
    xp: 120,
  },
];

export const challengeMeta = (key: string) => CHALLENGES.find((item) => item.key === key);

/* ---------------------------------------------------------------- levels */

export const LEVELS: { min: number; label: Text }[] = [
  { min: 0, label: { en: "Level 1 — Explorer", ar: "المستوى 1 — مستكشف" } },
  { min: 150, label: { en: "Level 2 — Saver", ar: "المستوى 2 — مدخر" } },
  { min: 350, label: { en: "Level 3 — Planner", ar: "المستوى 3 — مخطط" } },
  { min: 650, label: { en: "Level 4 — Money Star", ar: "المستوى 4 — نجم المال" } },
  { min: 1000, label: { en: "Level 5 — Money Hero", ar: "المستوى 5 — بطل المال" } },
];

export function levelFor(xp: number) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (xp >= level.min) index = i;
  });
  const next = LEVELS[index + 1];
  const current = LEVELS[index]!;
  const span = next ? next.min - current.min : 1;
  const into = next ? xp - current.min : span;
  return {
    index,
    label: current.label,
    nextAt: next?.min ?? null,
    percentToNext: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

/* ---------------------------------------------------------------- badges */

export type BadgeContext = {
  progress: LearningProgress[];
  challenges: LearningChallenge[];
  totalSaved: number;
  goalPercent: number;
  hasGoal: boolean;
};

export type BadgeMeta = {
  key: string;
  label: Text;
  hint: Text;
  earned: (context: BadgeContext) => boolean;
};

const completed = (context: BadgeContext, type: ActivityType, key?: string) =>
  context.progress.filter(
    (row) => row.activity_type === type && row.status === "completed" && (!key || row.activity_key === key),
  );

export const BADGES: BadgeMeta[] = [
  {
    key: "first-saver",
    label: { en: "First saver", ar: "أول مدخر" },
    hint: { en: "Save money for the first time", ar: "ادخر مالاً لأول مرة" },
    earned: (c) => c.totalSaved > 0,
  },
  {
    key: "little-saver",
    label: { en: "Little saver", ar: "مدخر صغير" },
    hint: { en: "Finish the saving lesson", ar: "أكمل درس الادخار" },
    earned: (c) => completed(c, "lesson", "how-to-save").length > 0,
  },
  {
    key: "saving-star",
    label: { en: "Saving star", ar: "نجم الادخار" },
    hint: { en: "Reach half of your goal", ar: "اوصل إلى نصف هدفك" },
    earned: (c) => c.goalPercent >= 50,
  },
  {
    key: "saving-hero",
    label: { en: "Saving hero", ar: "بطل الادخار" },
    hint: { en: "Finish a saving challenge", ar: "أكمل تحدي ادخار" },
    earned: (c) => c.challenges.some((row) => row.status === "completed"),
  },
  {
    key: "smart-shopper",
    label: { en: "Smart shopper", ar: "المتسوق الذكي" },
    hint: { en: "Win the smart shopper game", ar: "افز بلعبة المتسوق الذكي" },
    earned: (c) => completed(c, "game", "smart-shopper").length > 0,
  },
  {
    key: "budget-builder",
    label: { en: "Budget builder", ar: "صانع الميزانية" },
    hint: { en: "Win the build-your-budget game", ar: "افز بلعبة ابنِ ميزانيتك" },
    earned: (c) => completed(c, "game", "build-your-budget").length > 0,
  },
  {
    key: "goal-owner",
    label: { en: "Goal owner", ar: "صاحب الهدف" },
    hint: { en: "Have a savings goal of your own", ar: "اجعل لك هدف ادخار" },
    earned: (c) => c.hasGoal,
  },
];

/* ------------------------------------------------------- recommendations */

export type Recommendation = {
  kind: "lesson" | "game" | "quiz" | "challenge" | "badge";
  key: string;
  title: Text;
  reason: Text;
};

/**
 * One next step, chosen from stored progress — never random.
 * Order: unfinished lesson → unplayed game → weak-topic quiz → nearly-earned
 * badge → open challenge.
 */
export function recommendNext(context: BadgeContext): Recommendation {
  const doneLesson = new Set(completed(context, "lesson").map((row) => row.activity_key));
  const nextLesson = LESSONS.find((lesson) => !doneLesson.has(lesson.key));
  if (nextLesson) {
    return {
      kind: "lesson",
      key: nextLesson.key,
      title: nextLesson.title,
      reason: { en: "Continue where you stopped", ar: "أكمل من حيث توقفت" },
    };
  }

  const playedGames = new Set(context.progress.filter((row) => row.activity_type === "game").map((row) => row.activity_key));
  const nextGame = GAMES.find((game) => !playedGames.has(game.key));
  if (nextGame) {
    return {
      kind: "game",
      key: nextGame.key,
      title: nextGame.title,
      reason: { en: "A new game is waiting for you", ar: "لعبة جديدة تنتظرك" },
    };
  }

  const weakGame = context.progress
    .filter((row) => row.activity_type === "game" && row.max_score > 0 && row.best_score / row.max_score < 0.7)
    .sort((a, b) => a.best_score / a.max_score - b.best_score / b.max_score)[0];
  if (weakGame) {
    const meta = GAMES.find((game) => game.key === weakGame.activity_key);
    if (meta) {
      return {
        kind: "game",
        key: meta.key,
        title: meta.title,
        reason: { en: "Try this one again for a higher score", ar: "أعد المحاولة لدرجة أعلى" },
      };
    }
  }

  const nearBadge = BADGES.find((badge) => !badge.earned(context) && badge.key === "saving-star");
  if (nearBadge && context.goalPercent >= 35) {
    return {
      kind: "badge",
      key: nearBadge.key,
      title: nearBadge.label,
      reason: { en: "You are close to earning it", ar: "أنت قريب من الحصول عليها" },
    };
  }

  const quizRow = context.progress.find((row) => row.activity_type === "quiz");
  const level = nextQuizDifficulty(context.progress);
  if (!quizRow || (quizRow.max_score > 0 && quizRow.best_score / quizRow.max_score < 0.8)) {
    return {
      kind: "quiz",
      key: `quiz-${level}`,
      title: { en: "Test your knowledge", ar: "اختبر معلوماتك" },
      reason: DIFFICULTY_LABEL[level],
    };
  }

  const openChallenge = CHALLENGES.find(
    (meta) => !context.challenges.some((row) => row.challenge_key === meta.key),
  );
  if (openChallenge) {
    return {
      kind: "challenge",
      key: openChallenge.key,
      title: openChallenge.title,
      reason: { en: "Start a new challenge", ar: "ابدأ تحدياً جديداً" },
    };
  }

  return {
    kind: "quiz",
    key: `quiz-${level}`,
    title: { en: "Test your knowledge", ar: "اختبر معلوماتك" },
    reason: DIFFICULTY_LABEL[level],
  };
}

/** Quiz difficulty grows with real results, so no two quizzes feel identical. */
export function nextQuizDifficulty(progress: LearningProgress[]): Difficulty {
  const quizzes = progress.filter((row) => row.activity_type === "quiz" && row.max_score > 0);
  if (quizzes.length === 0) return "beginner";
  const best = quizzes.reduce(
    (top, row) => Math.max(top, row.best_score / row.max_score),
    0,
  );
  const advanced = quizzes.some((row) => row.difficulty === "advanced" && row.best_score / row.max_score >= 0.8);
  if (advanced) return "advanced";
  const intermediate = quizzes.some((row) => row.difficulty === "intermediate" && row.best_score / row.max_score >= 0.8);
  if (intermediate) return "advanced";
  if (best >= 0.7) return "intermediate";
  return "beginner";
}

/** Topics the child answered weakest, so quizzes lean on what needs practice. */
export function weakTopics(progress: LearningProgress[]): LearnTopic[] {
  const scored = progress
    .filter((row) => row.max_score > 0 && row.topic)
    .map((row) => ({ topic: row.topic as LearnTopic, ratio: row.best_score / row.max_score }))
    .sort((a, b) => a.ratio - b.ratio)
    .filter((row) => row.ratio < 0.8)
    .map((row) => row.topic);
  return Array.from(new Set(scored));
}

/** Build a personalised 6-question quiz from age, difficulty and weak topics. */
export function buildQuiz(options: {
  difficulty: Difficulty;
  weak: LearnTopic[];
  age: number | null;
}): QuizQuestion[] {
  const { difficulty, weak, age } = options;
  const allowZakat = (age ?? 10) >= 9;
  const pool = QUIZ_BANK.filter((question) => allowZakat || question.topic !== "zakat");
  const order: Difficulty[] =
    difficulty === "beginner"
      ? ["beginner", "intermediate", "advanced"]
      : difficulty === "intermediate"
        ? ["intermediate", "beginner", "advanced"]
        : ["advanced", "intermediate", "beginner"];

  const ranked = [...pool].sort((a, b) => {
    const level = order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
    if (level !== 0) return level;
    const weakA = weak.includes(a.topic) ? 0 : 1;
    const weakB = weak.includes(b.topic) ? 0 : 1;
    return weakA - weakB;
  });

  const chosen: QuizQuestion[] = [];
  const topics = new Set<LearnTopic>();
  ranked.forEach((question) => {
    if (chosen.length >= 6) return;
    if (topics.has(question.topic) && chosen.length < 4) return;
    topics.add(question.topic);
    chosen.push(question);
  });
  return chosen.slice(0, 6);
}

/* ------------------------------------------------------------- page copy */

export const LEARN_COPY = {
  en: {
    learn: "Learn",
    pageTitle: "Learn with Wazen",
    pageIntro: "Short lessons, real games and small challenges that build good money habits.",
    recommended: "Recommended for you",
    start: "Start",
    progressTitle: "My learning progress",
    overall: "Overall progress",
    lessonsDone: "Lessons completed",
    level: "Current level",
    streak: "Day streak",
    badgesEarned: "Badges earned",
    nextUp: "Next activity",
    xpToNext: "to the next level",
    lessons: "My lessons",
    games: "My games",
    quiz: "Test your knowledge",
    challenges: "My challenges",
    achievements: "My achievements",
    minutes: "min",
    completedTag: "Completed",
    reviewAgain: "Review again",
    play: "Play",
    playAgain: "Play again",
    howToPlay: "How to play",
    score: "Score",
    bestScore: "Best",
    correct: "Correct!",
    wrong: "Not this time",
    finish: "Finish",
    next: "Next",
    done: "Done",
    close: "Close",
    winTitle: "Great work!",
    tryAgainTitle: "Good try!",
    winBody: "You finished this round.",
    tryAgainBody: "Play again to raise your score.",
    quizIntro: "Six questions chosen for you from what you have practised.",
    startQuiz: "Start quiz",
    yourResult: "Your result",
    question: "Question",
    difficulty: "Level",
    checkIn: "Check in today",
    checkedInToday: "Checked in today",
    startChallenge: "Start challenge",
    daysDone: "days done",
    daysLeft: "days left",
    reward: "Reward",
    challengeComplete: "Challenge completed",
    active: "Active",
    earned: "Earned",
    locked: "Keep going",
    lockedNote: "Locked badges are simply your next goals.",
    saving: "Saving…",
    zakatNote: "This is a lesson about Zakat. It does not calculate Zakat for you.",
    stepOf: "of",
    takeaway: "Remember",
    lessonDone: "Lesson completed",
    markComplete: "I finished this lesson",
    budgetNeeds: "Needs",
    budgetSave: "Saving",
    budgetGive: "Giving",
    budgetFun: "Fun",
    coinsLeft: "Coins left",
    submitPlan: "Check my plan",
    need: "Need",
    want: "Want",
    week: "Week",
    savedSoFar: "Saved so far",
    goalTarget: "Goal",
    goalReached: "You reached your goal!",
    goalMissed: "The weeks ended before the goal.",
  },
  ar: {
    learn: "تعلّم",
    pageTitle: "تعلّم مع وازن",
    pageIntro: "دروس قصيرة وألعاب حقيقية وتحديات صغيرة تبني عادات مالية جيدة.",
    recommended: "مقترح لك",
    start: "ابدأ",
    progressTitle: "تقدمي في التعلم",
    overall: "التقدم العام",
    lessonsDone: "الدروس المكتملة",
    level: "المستوى الحالي",
    streak: "أيام متتابعة",
    badgesEarned: "الشارات المكتسبة",
    nextUp: "النشاط القادم",
    xpToNext: "للمستوى التالي",
    lessons: "دروسي",
    games: "ألعابي",
    quiz: "اختبر معلوماتك",
    challenges: "تحدياتي",
    achievements: "إنجازاتي",
    minutes: "دقيقة",
    completedTag: "مكتمل",
    reviewAgain: "راجع مرة أخرى",
    play: "العب",
    playAgain: "العب مرة أخرى",
    howToPlay: "طريقة اللعب",
    score: "النقاط",
    bestScore: "الأفضل",
    correct: "إجابة صحيحة!",
    wrong: "ليست هذه المرة",
    finish: "إنهاء",
    next: "التالي",
    done: "تم",
    close: "إغلاق",
    winTitle: "عمل رائع!",
    tryAgainTitle: "محاولة جيدة!",
    winBody: "أكملت هذه الجولة.",
    tryAgainBody: "العب مرة أخرى لترفع نقاطك.",
    quizIntro: "ست أسئلة مختارة لك بناءً على ما تدرّبت عليه.",
    startQuiz: "ابدأ الاختبار",
    yourResult: "نتيجتك",
    question: "سؤال",
    difficulty: "المستوى",
    checkIn: "سجّل اليوم",
    checkedInToday: "تم التسجيل اليوم",
    startChallenge: "ابدأ التحدي",
    daysDone: "أيام منجزة",
    daysLeft: "أيام متبقية",
    reward: "المكافأة",
    challengeComplete: "تم إكمال التحدي",
    active: "جارٍ",
    earned: "مكتسبة",
    locked: "واصل",
    lockedNote: "الشارات المقفلة هي أهدافك القادمة فقط.",
    saving: "جارٍ الحفظ…",
    zakatNote: "هذا درس عن الزكاة، ولا يحسب عليك زكاة.",
    stepOf: "من",
    takeaway: "تذكّر",
    lessonDone: "تم إكمال الدرس",
    markComplete: "أكملت هذا الدرس",
    budgetNeeds: "الاحتياجات",
    budgetSave: "الادخار",
    budgetGive: "العطاء",
    budgetFun: "المتعة",
    coinsLeft: "المتبقي",
    submitPlan: "تحقّق من خطتي",
    need: "احتياج",
    want: "رغبة",
    week: "الأسبوع",
    savedSoFar: "المدخر حتى الآن",
    goalTarget: "الهدف",
    goalReached: "وصلت إلى هدفك!",
    goalMissed: "انتهت الأسابيع قبل الوصول للهدف.",
  },
} as const;

export type LearnCopyKey = keyof typeof LEARN_COPY.en;
