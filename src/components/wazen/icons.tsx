/**
 * Wazen icon system.
 *
 * One cohesive family of clean, minimal outline icons (Lucide) with a single
 * stroke weight and a small set of sizes, so every screen shares the same
 * visual language. Import icons from here — never directly from lucide-react
 * in Wazen feature code.
 */
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpFromLine,
  Award,
  BadgeCheck,
  Banknote,
  Bell,
  CalendarDays,
  ChartLine,
  ChartPie,
  ChartColumn,
  ChartCandlestick,
  Check,
  Circle,
  CircleHelp,
  Flag,
  GraduationCap,
  HandCoins,
  House,
  Landmark,
  Languages,
  Loader2,
  Lock,
  LogOut,
  PiggyBank,
  Plus,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Target,
  User,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Shared stroke weight for every icon in the product. */
export const ICON_STROKE = 1.5;

/** Small, elegant sizing scale. */
export const ICON_SIZE = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
} as const;

export type WazenIcon = LucideIcon;

// Navigation & app chrome
export const DashboardIcon = House;
export const TransactionsIcon = ArrowLeftRight;
export const ProfileIcon = User;
export const SettingsIcon = Settings;
export const HelpIcon = CircleHelp;
export const NotificationsIcon = Bell;
export const SignOutIcon = LogOut;
export const LanguageIcon = Languages;

// Money movement
export const IncomeIcon = ArrowDownToLine;
export const ExpensesIcon = ArrowUpFromLine;
export const RefundIcon = RotateCcw;
export const SpendIcon = ShoppingBag;
export const GiveIcon = HandCoins;
export const AllowanceIcon = Banknote;

// Planning
export const BudgetIcon = Wallet;
export const SavingsIcon = PiggyBank;
export const GoalsIcon = Target;
export const EmergencyFundIcon = ShieldCheck;
export const ScheduledIcon = CalendarDays;
export const ReceiptIcon = Receipt;
export const BankIcon = Landmark;

// Insight
export const AnalyticsIcon = ChartLine;
export const CategoryChartIcon = ChartPie;
export const TrendChartIcon = ChartColumn;
export const InvestmentsIcon = ChartCandlestick;

// Engagement & plans
export const ChallengesIcon = Flag;
export const RewardsIcon = Award;
export const PremiumIcon = BadgeCheck;
export const FreePlanIcon = Circle;
export const FamilyIcon = Users;
export const StudentIcon = GraduationCap;
export const LockedIcon = Lock;

// Utility
export const CheckIcon = Check;
export const AddIcon = Plus;
export const ForwardIcon = ArrowRight;
export const SpinnerIcon = Loader2;
