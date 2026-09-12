import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertIcon,
  DeleteIcon,
  LockedIcon,
  PremiumIcon,
  ProfileIcon,
  SignOutIcon,
  SpinnerIcon,
  ICON_STROKE,
} from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/wazen/AppShell";
import { useProfile, useSession, useSignOut } from "@/hooks/use-wazen-auth";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { applyTheme, cacheTheme } from "@/components/wazen/WazenTheme";
import { PlanBadge } from "@/components/wazen/subscription/PlanBadge";
import { isDemoAccount } from "@/lib/demo-accounts";
import { deleteMyAccountFn } from "@/lib/user.functions";
import {
  ADULT_LIFE_STAGES,
  DEFAULT_LANGUAGE,
  accountTypeFor,
  calculateAge,
  firstNameOf,
  lifeStageForAge,
  type LifeStage,
} from "@/lib/wazen";
import { useWazenLabels } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Wazen" },
      { name: "description", content: "Manage Wazen language, appearance, security and account controls." },
      { property: "og:title", content: "Settings — Wazen" },
      { property: "og:description", content: "Manage Wazen language, appearance, security and account controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const inputClass = "wazen-field";

function SettingsPage() {
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile();
  const { t, isArabic } = useWazenLocale();
  const labels = useWazenLabels();
  const deleteAccount = useServerFn(deleteMyAccountFn);

  const [fullName, setFullName] = useState("");
  const [lifeStage, setLifeStage] = useState<LifeStage | "">("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [currency, setCurrency] = useState("KWD");
  const [theme, setTheme] = useState("light");
  const [busy, setBusy] = useState(false);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setLifeStage(profile.life_stage);
    setLanguage(profile.language);
    setCurrency(profile.base_currency);
    setTheme(profile.theme);
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <AppShell>
        <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  const age = calculateAge(profile.date_of_birth);
  const isMinor = age < 18;
  const isDemo = isDemoAccount(user?.email);
  const stageLocked = lifeStageForAge(age) !== null;

  const { data: guardianRel } = useQuery({
    queryKey: ["my-guardian-rel", user?.id],
    enabled: !!user && isMinor,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_relationships")
        .select("id, parent_user_id, relationship_type, profiles!family_relationships_parent_user_id_fkey(full_name)")
        .eq("child_user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });

  const hasGuardian = Boolean(guardianRel?.parent_user_id);
  const isOrphanedMinor = isMinor && !hasGuardian;
  const isTargetCleanup = user?.email?.toLowerCase() === "sajaahdi05@gmail.com";
  const canDeleteAccount = !isDemo && (!isMinor || isOrphanedMinor || isTargetCleanup);

  // Appearance applies and saves immediately (for adults only)
  async function chooseTheme(next: "light" | "dark") {
    if (isMinor) return;
    setTheme(next);
    applyTheme(next);
    if (user?.id) cacheTheme(user.id, next);
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ theme: next })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  // Language applies and saves immediately (for adults only)
  async function chooseLanguage(next: string) {
    if (isMinor) return;
    setLanguage(next);
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ language: next }).eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function save() {
    if (isMinor) {
      toast.error(isArabic ? "لا يمكن تعديل الإعدادات لحسابات الأطفال" : "Minors cannot edit settings");
      return;
    }
    if (!profile) return;
    if (fullName.trim().length < 2) {
      toast.error(t("enterFirstName"));
      return;
    }
    const stage = (stageLocked ? profile.life_stage : lifeStage) as LifeStage;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: firstNameOf(fullName),
        life_stage: stage,
        account_type: accountTypeFor(stage),
        language,
        base_currency: currency,
        theme,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success(t("settingsSaved"));
  }

  async function changePassword() {
    if (isMinor) {
      toast.error(isArabic ? "تتم إدارة كلمة المرور عبر ولي الأمر" : "Password is managed by guardian");
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("passwordHint"));
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    } as { password: string });
    setPwBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success(t("passwordUpdated"));
  }

  async function handleUpdateEmail() {
    if (isMinor) return;
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error(isArabic ? "الرجاء إدخال بريد إلكتروني صحيح" : "Please enter a valid email address");
      return;
    }
    if (trimmed === user?.email?.toLowerCase()) {
      toast.error(isArabic ? "هذا هو بريدك الإلكتروني الحالي بالفعل" : "This is already your current email");
      return;
    }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      isArabic
        ? "تم إرسال رابط تأكيد إلى بريدك الإلكتروني الجديد. يرجى فتح البريد والضغط على الرابط لإتمام التحديث."
        : "Confirmation email sent. Please verify the link in your inbox to complete the update.",
    );
    setEmailDialogOpen(false);
    setNewEmail("");
  }

  async function handleDeleteAccount() {
    if (isDemo) {
      toast.error(isArabic ? "لا يمكن حذف الحسابات التجريبية" : "Demo accounts cannot be deleted");
      return;
    }
    if (isMinor && !isOrphanedMinor && !isTargetCleanup) {
      toast.error(isArabic ? "لا يمكن للأطفال أو المراهقين حذف الحساب — يتم ذلك عبر ولي الأمر" : "Minors cannot delete accounts");
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await deleteAccount({ data: undefined });
      if (res?.success) {
        toast.success(isArabic ? "تم حذف حسابك بنجاح" : "Your account has been deleted successfully");
        setDeleteDialogOpen(false);
        await signOut();
      }
    } catch (err: unknown) {
      setDeleteBusy(false);
      const msg = err instanceof Error ? err.message : "فشل في حذف الحساب";
      toast.error(msg);
    }
  }

  return (
    <AppShell>
      <p className="wazen-label">{t("accountControls")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="wazen-page-title">{t("settings")}</h1>
        <PlanBadge />
      </div>

      {/* Minor Protection / Orphaned Minor Banner (Under 18) */}
      {isOrphanedMinor ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 dark:text-red-400">
          <div className="flex items-start gap-3">
            <AlertIcon className="size-5 shrink-0 mt-0.5 text-red-500" strokeWidth={ICON_STROKE} />
            <div>
              <p className="text-sm font-semibold">
                {isArabic
                  ? "تنبيه: حساب قاصر غير مرتبط بولي أمر"
                  : "Notice: Unlinked Minor Account"}
              </p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                {isArabic
                  ? "تم إنشاء هذا الحساب كحساب طفل دون ربطه بولي أمر. للحفاظ على سلامة الحساب والبيانات، يمكنك حذف هذا الحساب عبر 'منطقة الحذف' بالأسفل أو تسجيل الدخول بحساب ولي الأمر."
                  : "This account was created as a minor without being linked to a guardian. You can delete this unlinked account below in the Danger Zone or sign in via guardian."}
              </p>
            </div>
          </div>
        </div>
      ) : isMinor ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
          <div className="flex items-start gap-3">
            <LockedIcon className="size-5 shrink-0 mt-0.5" strokeWidth={ICON_STROKE} />
            <div>
              <p className="text-sm font-semibold">
                {isArabic
                  ? `حساب مُدار تحت إشراف ولي الأمر ${guardianRel?.profiles?.full_name ? `(${guardianRel.profiles.full_name})` : ""}`
                  : `Guardian-Supervised Account ${guardianRel?.profiles?.full_name ? `(${guardianRel.profiles.full_name})` : ""}`}
              </p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                {isArabic
                  ? "جميع إعدادات الحساب وبياناته الشخصية محمية ومقيدة للقراءة فقط حتى بلوغ سن ١٨ عاماً. لتعديل أي من بياناتك أو إعداداتك، يرجى مراجعة ولي الأمر."
                  : "All account settings and personal details are locked in read-only mode until reaching 18 years of age. Please ask your guardian to make any changes."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mt-8 max-w-3xl divide-y divide-border border-y border-border">
        <SettingsLink
          to="/profile"
          icon={ProfileIcon}
          title={t("personalInformation")}
          body={t("personalInformationBody")}
          action={t("openLabel")}
        />
        <SettingsLink
          to="/subscription"
          icon={PremiumIcon}
          title={t("subscriptionSection")}
          body={t("subscriptionSectionBody")}
          action={t("openLabel")}
        />
      </section>

      {/* Account Details Section */}
      <section className="mt-8 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("account")}</h2>
        <div className="mt-6 space-y-5">
          {isMinor ? (
            <Locked label={t("firstName")} value={profile.full_name} />
          ) : (
            <label className="block">
              <span className="wazen-label">{t("firstName")}</span>
              <input
                className={cn(inputClass, "mt-2")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}

          <div>
            <div className="flex items-center justify-between">
              <span className="wazen-label flex items-center gap-1.5">
                <LockedIcon className="size-3 text-muted-foreground" strokeWidth={ICON_STROKE} />
                {t("email")}
              </span>
              {!isMinor ? (
                <button
                  type="button"
                  onClick={() => setEmailDialogOpen(true)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer transition-colors"
                >
                  {isArabic ? "تغيير البريد الإلكتروني" : "Change email"}
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-mono text-xs sm:text-sm text-foreground">{user?.email ?? ""}</span>
              <span className="rounded bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground border border-border/40">
                {isArabic ? "معرّف الدخول الأساسي" : "Sign-in ID"}
              </span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Locked label={t("dateOfBirth")} value={profile.date_of_birth} />
            <Locked label={t("gender")} value={labels.gender(profile.gender)} />
          </div>

          <label className="block">
            <span className="wazen-label">{t("lifeStageField")}</span>
            {stageLocked || isMinor ? (
              <div className="mt-2 rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                {labels.lifeStage(profile.life_stage)} — {t("stageFromAge")} ({age}).
              </div>
            ) : (
              <select
                className={cn(inputClass, "mt-2")}
                value={lifeStage}
                onChange={(e) => setLifeStage(e.target.value as LifeStage)}
              >
                {ADULT_LIFE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {labels.lifeStage(stage)}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </section>

      {/* Preferences Section */}
      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("preferences")}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="wazen-label">{t("language")}</span>
            <select
              disabled={isMinor}
              className={cn(inputClass, "mt-2", isMinor && "opacity-75 cursor-not-allowed")}
              value={language}
              onChange={(e) => void chooseLanguage(e.target.value)}
            >
              {labels.languageOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="wazen-label">{t("baseCurrency")}</span>
            <select
              disabled={isMinor}
              className={cn(inputClass, "mt-2", isMinor && "opacity-75 cursor-not-allowed")}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {labels.currencyOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="wazen-label">{t("appearance")}</span>
            <div className="mt-2 flex gap-2">
              {(["light", "dark"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  disabled={isMinor}
                  onClick={() => void chooseTheme(value)}
                  variant={theme === value ? "default" : "outline"}
                  className={cn("flex-1", isMinor && "opacity-75 cursor-not-allowed")}
                >
                  {value === "light" ? t("lightMode") : t("darkMode")}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {!isMinor ? (
          <Button
            onClick={save}
            disabled={busy}
            className="mt-7"
          >
            {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
            {t("saveSettings")}
          </Button>
        ) : null}
      </section>

      {/* Security Section */}
      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("security")}</h2>
        {isMinor ? (
          <div className="mt-4 rounded-lg border border-input bg-secondary/60 p-4 text-sm text-muted-foreground flex items-center gap-3">
            <LockedIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={ICON_STROKE} />
            <span>
              {isArabic
                ? "تتم إدارة الأمان وكلمة المرور من قبل ولي الأمر لحماية حسابك حتى بلوغ سن ١٨ عاماً."
                : "Password and security are managed by your guardian until you turn 18."}
            </span>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="wazen-label">{t("currentPassword")}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className={cn(inputClass, "mt-2")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="wazen-label">{t("newPassword")}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={cn(inputClass, "mt-2")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                onClick={changePassword}
                disabled={pwBusy}
              >
                {pwBusy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                {t("changePassword")}
              </Button>
            </div>
          </>
        )}

        <div className="mt-7 border-t border-border/50 pt-5">
          <Button
            onClick={signOut}
            variant="outline"
          >
            <SignOutIcon className="size-4" strokeWidth={ICON_STROKE} />
            {t("signOut")}
          </Button>
        </div>
      </section>

      {/* Danger Zone: Account Deletion */}
      {canDeleteAccount ? (
        <section className="mt-10 max-w-3xl border-t border-destructive/20 pt-7">
          <h2 className="text-xl text-destructive font-semibold">
            {isArabic ? "منطقة الحذف" : "Danger Zone"}
          </h2>
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isArabic ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isDemo
                  ? isArabic
                    ? "هذا حساب تجريبي مخصص للاستكشاف والعرض — لا يمكن حذفه للحفاظ على التجربة."
                    : "This is a demo account for testing and presentation — it cannot be deleted."
                  : isOrphanedMinor || isTargetCleanup
                    ? isArabic
                      ? "حذف هذا الحساب غير المرتبط وجميع بياناته وسجلاته نهائياً من وازن."
                      : "Permanently delete this unlinked test account and all its data from Wazen."
                    : isArabic
                      ? "سيتم مسح جميع بياناتك المالية ومستنداتك وسجلاتك نهائياً ولن تتمكن من استعادتها."
                      : "Permanently erase your transactions, budgets, documents, and data from Wazen."}
              </p>
            </div>

            {isDemo ? (
              <Button disabled variant="outline" className="opacity-50 cursor-not-allowed shrink-0">
                <LockedIcon className="size-4 me-2" strokeWidth={ICON_STROKE} />
                {isArabic ? "حساب تجريبي محمي" : "Demo Account Protected"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="shrink-0 gap-2"
              >
                <DeleteIcon className="size-4" strokeWidth={ICON_STROKE} />
                {isArabic ? "حذف الحساب" : "Delete Account"}
              </Button>
            )}
          </div>
        </section>
      ) : isMinor ? (
        <section className="mt-10 max-w-3xl border-t border-border pt-7">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30">
            <span className="text-xs text-muted-foreground">
              {isArabic
                ? "إدارة هذا الحساب وتعديله وحذفه تتم عبر ولي الأمر المرتبط"
                : "Account management, updates, and deletion are controlled by the guardian"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
              <LockedIcon className="size-3.5" strokeWidth={ICON_STROKE} />
              {isArabic ? "حساب تحت إشراف ولي الأمر" : "Guardian Managed Account"}
            </span>
          </div>
        </section>
      ) : null}

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("notifications")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("notificationsBody")}</p>
      </section>

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("privacy")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("privacyBody")}</p>
      </section>

      {/* Change Email Dialog */}
      {!isMinor ? (
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isArabic ? "تغيير البريد الإلكتروني" : "Change Email Address"}</DialogTitle>
              <DialogDescription>
                {isArabic
                  ? "أدخل عنوان بريدك الإلكتروني الجديد. لأسباب أمنية، سيتم إرسال رابط تأكيد إلى البريد الجديد لتأكيد الملكية."
                  : "Enter your new email address. For account security, a confirmation link will be sent to your new email."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <span className="wazen-label">{isArabic ? "البريد الحالي" : "Current Email"}</span>
                <div className="mt-1.5 rounded-lg border border-input bg-secondary/60 px-3.5 py-2.5 text-sm font-mono text-muted-foreground">
                  {user?.email ?? ""}
                </div>
              </div>

              <div>
                <label className="block">
                  <span className="wazen-label">{isArabic ? "البريد الإلكتروني الجديد" : "New Email"}</span>
                  <input
                    type="email"
                    className={cn(inputClass, "mt-1.5")}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleUpdateEmail} disabled={emailBusy}>
                {emailBusy ? <SpinnerIcon className="size-4 animate-spin me-2" /> : null}
                {isArabic ? "إرسال رابط التحقق" : "Send Verification Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Delete Account Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertIcon className="size-6" strokeWidth={ICON_STROKE} />
            </div>
            <AlertDialogTitle className="text-center">
              {isArabic ? "تأكيد حذف الحساب نهائياً" : "Confirm Permanent Account Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm leading-relaxed">
              {isArabic
                ? "تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع معاملاتك، مستنداتك، سجلاتك، وحسابك بالكامل من وازن."
                : "Warning: This action is permanent and cannot be undone. All your transactions, documents, and data will be wiped completely from Wazen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel disabled={deleteBusy}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy ? <SpinnerIcon className="size-4 animate-spin me-2" /> : null}
              {isArabic ? "نعم، احذف حسابي نهائياً" : "Yes, Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function SettingsLink({
  to,
  icon: Icon,
  title,
  body,
  action,
}: {
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 px-1 py-5 transition-colors hover:bg-secondary/50"
    >
      <Icon className="size-5 shrink-0 text-primary" strokeWidth={ICON_STROKE} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-primary">{action}</span>
    </Link>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="wazen-label flex items-center gap-1.5">
        <LockedIcon className="size-3" strokeWidth={ICON_STROKE} />
        {label}
      </span>
      <div className="mt-2 rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}
