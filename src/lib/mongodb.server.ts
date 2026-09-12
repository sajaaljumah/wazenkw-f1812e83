/**
 * MongoDB Server Service for Wazen.
 *
 * Runs strictly on the server backend. Never imported into client bundles.
 * All requests to MongoDB Atlas are made server-to-server.
 * Connection string exists only in server environment variables (MONGODB_URI).
 * Never exposes the connection string, credentials, or internal exceptions.
 */
import { MongoClient, Db, Collection, IndexSpecification, Document } from "mongodb";
import type { FxSnapshot } from "@/lib/currency";

export type MongoDbError = {
  success: false;
  error: "NO_MONGODB_URI" | "CONNECTION_ERROR" | "OPERATION_ERROR";
  message: string;
};

/* ------------------------------------------------------------------ Document Schemas */

export type UserProfileDoc = {
  _id: string; // user_id
  user_id: string;
  email?: string | null | undefined;
  full_name?: string | null | undefined;
  role?: string | null | undefined;
  life_stage?: string | null | undefined;
  date_of_birth?: string | null | undefined;
  gender?: string | null | undefined;
  theme?: string | null | undefined;
  avatar_url?: string | null | undefined;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type TransactionDoc = {
  _id: string;
  id: string;
  user_id: string;
  kind: "income" | "expense" | "saving" | "refund";
  category: string;
  merchant?: string | null | undefined;
  amount: number; // in base currency (KWD)
  currency: string;
  occurred_on: string;
  note?: string | null | undefined;
  goal_id?: string | null | undefined;
  paid_by_parent?: boolean | undefined;
  deducted_from_child?: boolean | undefined;
  beneficiary_user_id?: string | null | undefined;
  payment_method?: string | null | undefined;
  linked_transaction_id?: string | null | undefined;
  family_id?: string | null | undefined;
  // Preserved Frankfurter exchange-rate snapshot
  original_amount?: number | null | undefined;
  original_currency?: string | null | undefined;
  converted_amount?: number | null | undefined;
  exchange_rate?: number | null | undefined;
  rate_date?: string | null | undefined;
  created_at: string;
  updated_at?: string | undefined;
};

export type RecurringItemDoc = {
  _id: string;
  id: string;
  user_id: string;
  kind: "income" | "expense" | "saving";
  name: string;
  merchant?: string | null | undefined;
  category: string;
  amount: number; // in base currency (KWD)
  currency: string;
  frequency: "weekly" | "monthly" | "yearly";
  day_of_month: number;
  start_date: string;
  ends_on?: string | null | undefined;
  note?: string | null | undefined;
  is_active: boolean;
  original_amount?: number | null | undefined;
  original_currency?: string | null | undefined;
  converted_amount?: number | null | undefined;
  exchange_rate?: number | null | undefined;
  rate_date?: string | null | undefined;
  created_at: string;
  updated_at?: string | undefined;
};

export type BudgetDoc = {
  _id: string;
  id: string;
  user_id: string;
  period_month: string; // YYYY-MM
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type SavingsGoalDoc = {
  _id: string;
  id: string;
  user_id: string;
  name: string;
  kind: "goal" | "emergency_fund";
  target_amount: number;
  target_date?: string | null | undefined;
  current_amount?: number | undefined;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type EmergencyFundDoc = {
  _id: string;
  id: string;
  user_id: string;
  target_amount: number;
  current_amount: number;
  months_covered: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type FamilyRelationshipDoc = {
  _id: string;
  id: string;
  family_id?: string | null | undefined;
  parent_user_id: string;
  child_user_id: string;
  relationship_type: "parent_child" | "guardian" | "dependent";
  status: "active" | "pending" | "paused";
  permissions: {
    can_view_transactions: boolean;
    can_manage_budget: boolean;
    can_fund_wallet: boolean;
    allow_unlimited_expenses: boolean;
  };
  created_at: string;
  updated_at: string;
};

export type LearningProgressDoc = {
  _id: string;
  id: string;
  user_id: string;
  activity_type: "lesson" | "game" | "quiz";
  activity_key: string;
  topic?: string | null | undefined;
  status: "in_progress" | "completed";
  score: number;
  best_score: number;
  max_score: number;
  attempts: number;
  difficulty?: string | null | undefined;
  last_activity_at: string;
  created_at: string;
};

export type QuizResultDoc = {
  _id: string;
  id: string;
  user_id: string;
  topic: string;
  quiz_key: string;
  score: number;
  max_score: number;
  difficulty?: string | null | undefined;
  answers: Array<{ question: string; selectedAnswer: number; isCorrect: boolean }>;
  completed_at: string;
};

export type ChallengeProgressDoc = {
  _id: string;
  id: string;
  user_id: string;
  challenge_key: string;
  topic?: string | null | undefined;
  target_days: number;
  days_completed: number;
  status: "active" | "completed" | "expired";
  started_on: string;
  last_checkin_on?: string | null | undefined;
  completed_on?: string | null | undefined;
};

export type BadgeDoc = {
  _id: string;
  id: string;
  user_id: string;
  badge_key: string;
  title: string;
  earned_at: string;
};

export type AssetDoc = {
  _id: string;
  id: string;
  user_id: string;
  kind: "stock" | "gold" | "silver" | "real_estate";
  name: string;
  symbol?: string | null | undefined;
  quantity: number;
  unit_cost: number;
  current_unit_value: number;
  currency: string;
  purity?: string | null | undefined;
  property_type?: string | null | undefined;
  monthly_rent?: number | undefined;
  purchase_date: string;
  notes?: string | null | undefined;
  created_at: string;
  updated_at: string;
};

export type SubscriptionDoc = {
  _id: string;
  id: string;
  user_id: string;
  plan_id: "free" | "individual" | "family";
  status: "active" | "canceled" | "past_due" | "trialing";
  billing_cycle: "monthly" | "yearly";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string | null | undefined;
  stripe_subscription_id?: string | null | undefined;
  stripe_checkout_session_id?: string | null | undefined;
  stripe_price_id?: string | null | undefined;
  family_id?: string | null | undefined;
  additional_child_count?: number | undefined;
  cancelled_at?: string | null | undefined;
  created_at: string;
  updated_at: string;
};

export type StripeEventDoc = {
  _id: string;
  id: string;
  type: string;
  processed_at: string;
  livemode: boolean;
};

export type WazenCollections = {
  profiles: UserProfileDoc;
  transactions: TransactionDoc;
  recurring_items: RecurringItemDoc;
  budgets: BudgetDoc;
  savings_goals: SavingsGoalDoc;
  emergency_funds: EmergencyFundDoc;
  family_relationships: FamilyRelationshipDoc;
  learning_progress: LearningProgressDoc;
  quizzes: QuizResultDoc;
  challenges: ChallengeProgressDoc;
  badges: BadgeDoc;
  assets: AssetDoc;
  subscriptions: SubscriptionDoc;
  stripe_events: StripeEventDoc;
};

export type CollectionName = keyof WazenCollections;

export const COLLECTIONS = {
  profiles: "profiles",
  transactions: "transactions",
  recurring_items: "recurring_items",
  budgets: "budgets",
  savings_goals: "savings_goals",
  emergency_funds: "emergency_funds",
  family_relationships: "family_relationships",
  learning_progress: "learning_progress",
  quizzes: "quizzes",
  challenges: "challenges",
  badges: "badges",
  assets: "assets",
  subscriptions: "subscriptions",
  stripe_events: "stripe_events",
} as const;

/* ------------------------------------------------------------------ Connection Pooling */

let cachedClient: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let cachedDb: Db | null = null;

/**
 * Sanitizes any error message to ensure no connection string, username,
 * or password could ever be leaked into client or logs.
 */
function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "Unknown database error.";
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/mongodb(\+srv)?:\/\/[^\s@]+@/gi, "mongodb://***:***@")
    .replace(/(password|pwd|user|auth)=[^&\s]+/gi, "$1=***");
}

/**
 * Checks whether MongoDB URI is configured in server environment.
 */
export function isMongoConfigured(): boolean {
  const uri = process.env.MONGODB_URI;
  return Boolean(uri && uri.trim().length > 0);
}

/**
 * Returns the active MongoClient, reusing the cached pool instance.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "") {
    throw new Error("MONGODB_URI is not configured in the server environment.");
  }

  if (cachedClient) {
    return cachedClient;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri.trim(), {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      appName: "Wazen-Finance-App",
    });

    clientPromise = client
      .connect()
      .then((connectedClient) => {
        cachedClient = connectedClient;
        return connectedClient;
      })
      .catch((err) => {
        clientPromise = null;
        cachedClient = null;
        throw new Error(`Failed to connect to MongoDB: ${sanitizeErrorMessage(err)}`);
      });
  }

  return clientPromise;
}

/**
 * Returns the default Wazen MongoDB database instance.
 */
export async function getMongoDb(dbName: string = "Wazen"): Promise<Db> {
  if (cachedDb && cachedDb.databaseName === dbName) return cachedDb;
  const client = await getMongoClient();
  cachedDb = client.db(dbName);
  return cachedDb;
}

export const getDatabase = getMongoDb;

/**
 * Returns a typed MongoDB collection.
 */
export async function getCollection<K extends CollectionName>(
  name: K,
  dbName: string = "Wazen",
): Promise<Collection<WazenCollections[K]>> {
  const db = await getMongoDb(dbName);
  return db.collection<WazenCollections[K]>(name);
}

/**
 * Pings the MongoDB database to verify connectivity.
 */
export async function pingDatabase(dbName: string = "Wazen"): Promise<{
  success: boolean;
  database?: string;
  error?: string;
}> {
  try {
    const db = await getMongoDb(dbName);
    const result = await db.command({ ping: 1 });
    return {
      success: result.ok === 1,
      database: dbName,
    };
  } catch (err) {
    return {
      success: false,
      error: sanitizeErrorMessage(err),
    };
  }
}

/**
 * Creates essential indexes across Wazen collections safely and idempotently.
 */
export async function ensureIndexes(dbName: string = "Wazen"): Promise<Record<string, string[]>> {
  const db = await getMongoDb(dbName);
  const created: Record<string, string[]> = {};

  const definitions: Array<{
    collection: CollectionName;
    indexes: Array<{ spec: IndexSpecification; name: string; unique?: boolean }>;
  }> = [
    {
      collection: "profiles",
      indexes: [
        { spec: { user_id: 1 }, name: "idx_profiles_user_id", unique: true },
        { spec: { email: 1 }, name: "idx_profiles_email" },
      ],
    },
    {
      collection: "transactions",
      indexes: [
        { spec: { user_id: 1, occurred_on: -1 }, name: "idx_tx_user_date" },
        { spec: { user_id: 1, kind: 1 }, name: "idx_tx_user_kind" },
        { spec: { family_id: 1 }, name: "idx_tx_family_id" },
        { spec: { linked_transaction_id: 1 }, name: "idx_tx_linked" },
      ],
    },
    {
      collection: "recurring_items",
      indexes: [{ spec: { user_id: 1, is_active: 1 }, name: "idx_recurring_user_active" }],
    },
    {
      collection: "budgets",
      indexes: [
        { spec: { user_id: 1, period_month: 1 }, name: "idx_budgets_user_period", unique: true },
      ],
    },
    {
      collection: "savings_goals",
      indexes: [{ spec: { user_id: 1, kind: 1 }, name: "idx_goals_user_kind" }],
    },
    {
      collection: "emergency_funds",
      indexes: [{ spec: { user_id: 1 }, name: "idx_efund_user", unique: true }],
    },
    {
      collection: "family_relationships",
      indexes: [
        { spec: { parent_user_id: 1, child_user_id: 1 }, name: "idx_fam_rel_parent_child" },
        { spec: { child_user_id: 1 }, name: "idx_fam_rel_child" },
      ],
    },
    {
      collection: "learning_progress",
      indexes: [
        { spec: { user_id: 1, activity_key: 1 }, name: "idx_learn_user_activity", unique: true },
        { spec: { user_id: 1, topic: 1 }, name: "idx_learn_user_topic" },
      ],
    },
    {
      collection: "quizzes",
      indexes: [{ spec: { user_id: 1, quiz_key: 1 }, name: "idx_quiz_user_key" }],
    },
    {
      collection: "challenges",
      indexes: [{ spec: { user_id: 1, challenge_key: 1 }, name: "idx_challenge_user_key" }],
    },
    {
      collection: "badges",
      indexes: [{ spec: { user_id: 1, badge_key: 1 }, name: "idx_badge_user_key", unique: true }],
    },
    {
      collection: "assets",
      indexes: [{ spec: { user_id: 1, kind: 1 }, name: "idx_assets_user_kind" }],
    },
    {
      collection: "subscriptions",
      indexes: [
        { spec: { user_id: 1, status: 1 }, name: "idx_sub_user_status" },
        { spec: { stripe_customer_id: 1 }, name: "idx_sub_stripe_customer" },
        { spec: { stripe_subscription_id: 1 }, name: "idx_sub_stripe_sub" },
      ],
    },
    {
      collection: "stripe_events",
      indexes: [{ spec: { id: 1 }, name: "idx_stripe_event_id", unique: true }],
    },
  ];

  for (const item of definitions) {
    const col = db.collection(item.collection);
    created[item.collection] = [];
    for (const idx of item.indexes) {
      const idxName = await col.createIndex(idx.spec, {
        name: idx.name,
        unique: idx.unique || false,
        background: true,
      });
      created[item.collection]?.push(idxName);
    }
  }

  return created;
}
