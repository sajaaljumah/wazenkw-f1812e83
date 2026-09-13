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
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Building2,
  Pencil,
  Trash2,
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
  Coins,
  Plus,
  Receipt,
  Scale,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Target,
  User,
  Users,
  Wallet,
  FileText,
  Upload,
  Camera,
  TriangleAlert,
  RefreshCw,
  BookOpen,
  Gamepad2,
  ListChecks,
  Sparkles,
  Flame,
  ChevronDown,
  MoreHorizontal,
  Bot,
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
export const SavingsIcon = Coins;
export const GoalsIcon = Target;
export const EmergencyFundIcon = ShieldCheck;
export const ScheduledIcon = CalendarDays;
export const ReceiptIcon = Receipt;
export const BankIcon = Landmark;
export const ZakatIcon = Scale;

// Insight
export const AnalyticsIcon = ChartLine;
export const CategoryChartIcon = ChartPie;
export const TrendChartIcon = ChartColumn;
export const InvestmentsIcon = ChartCandlestick;
export const PortfolioIcon = Briefcase;
export const StocksIcon = ChartCandlestick;
export const MetalsIcon = Coins;
export const PropertyIcon = Building2;
export const GainIcon = ArrowUpRight;
export const LossIcon = ArrowDownRight;

// Engagement & plans
export const ChallengesIcon = Flag;
// Learning
export const LearnIcon = BookOpen;
export const GameIcon = Gamepad2;
export const QuizIcon = ListChecks;
export const RecommendIcon = Sparkles;
export const StreakIcon = Flame;
export const RewardsIcon = Award;
export const PremiumIcon = BadgeCheck;
export const FreePlanIcon = Circle;
export const FamilyIcon = Users;
export const StudentIcon = GraduationCap;
export const LockedIcon = Lock;
export const AiIcon = Bot;

// Utility
export const CheckIcon = Check;
export const AddIcon = Plus;
export const ForwardIcon = ArrowRight;
export const SpinnerIcon = Loader2;
export const EditIcon = Pencil;
export const DeleteIcon = Trash2;
export const DocumentIcon = FileText;
export const UploadIcon = Upload;
export const CameraIcon = Camera;
export const AlertIcon = TriangleAlert;
export const RetryIcon = RefreshCw;
export const ExpandIcon = ChevronDown;
export const MoreIcon = MoreHorizontal;
