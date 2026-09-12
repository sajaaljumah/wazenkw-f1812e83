import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FamilyIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { parentAddChildFn } from "@/lib/user.functions";
import { calculateAge } from "@/lib/wazen";

interface AddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddChildDialog({ open, onOpenChange }: AddChildDialogProps) {
  const { isArabic, t } = useWazenLocale();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
    gender: "female" as "female" | "male",
    relationship: "father" as "father" | "mother" | "guardian",
  });

  const age = form.dob ? calculateAge(form.dob) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error(isArabic ? "يرجى إدخال اسم الطفل" : "Please enter child's name");
      return;
    }
    if (!form.dob) {
      toast.error(isArabic ? "يرجى اختيار تاريخ ميلاد الطفل" : "Please enter birth date");
      return;
    }
    if (age === null || age >= 18 || age < 3) {
      toast.error(
        isArabic
          ? "يجب أن يكون عمر الطفل بين 3 و 17 عاماً"
          : "Child age must be between 3 and 17 years",
      );
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      toast.error(isArabic ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email");
      return;
    }
    if (!form.password || form.password.length < 8) {
      toast.error(
        isArabic
          ? "كلمة المرور يجب ألا تقل عن 8 أحرف"
          : "Password must be at least 8 characters",
      );
      return;
    }

    setBusy(true);
    try {
      await parentAddChildFn({
        data: {
          child_full_name: form.name.trim(),
          child_email: form.email.trim().toLowerCase(),
          child_password: form.password,
          child_dob: form.dob,
          child_gender: form.gender,
          relationship_type: form.relationship,
        },
      });

      setBusy(false);
      toast.success(
        isArabic
          ? `تمت إضافة ${form.name} بنجاح وربط حسابه بالعائلة!`
          : `${form.name} added successfully and linked to your family!`,
      );
      onOpenChange(false);
      setForm({
        name: "",
        email: "",
        password: "",
        dob: "",
        gender: "female",
        relationship: "father",
      });
      await queryClient.invalidateQueries({ queryKey: ["family-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    } catch (err: unknown) {
      setBusy(false);
      let message = isArabic ? "تعذر إضافة الطفل" : "Failed to add child";
      if (err instanceof Error) message = err.message;
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FamilyIcon className="size-5" strokeWidth={ICON_STROKE} />
            </div>
            <div>
              <DialogTitle>
                {isArabic ? "إضافة طفل / ابن إلى العائلة" : "Add Child to Family"}
              </DialogTitle>
              <DialogDescription>
                {isArabic
                  ? "أنشئ حساباً لابنك أو ابنتك لمتابعة مصروفاتهم وبناء عاداتهم المالية تحت إشرافك."
                  : "Create an account for your child to monitor expenses and nurture financial habits."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="block">
              <span className="wazen-label">{isArabic ? "اسم الطفل" : "Child Name"}</span>
              <input
                className="wazen-field mt-1.5"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={isArabic ? "مثال: ريم، فيصل" : "e.g. Reem, Faisal"}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block">
                <span className="wazen-label">{isArabic ? "تاريخ الميلاد" : "Date of Birth"}</span>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  className="wazen-field mt-1.5"
                  value={form.dob}
                  onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                />
                {age !== null ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {age} {isArabic ? "سنوات" : "years old"}
                  </span>
                ) : null}
              </label>
            </div>

            <div>
              <span className="wazen-label">{isArabic ? "الجنس" : "Gender"}</span>
              <div className="mt-1.5 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.gender === "female" ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, gender: "female" }))}
                  className="flex-1 text-xs"
                >
                  {isArabic ? "أنثى" : "Female"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.gender === "male" ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, gender: "male" }))}
                  className="flex-1 text-xs"
                >
                  {isArabic ? "ذكر" : "Male"}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <span className="wazen-label">{isArabic ? "صلتك بالطفل" : "Your Relationship"}</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {[
                { val: "father", label: isArabic ? "الأب (Father)" : "Father" },
                { val: "mother", label: isArabic ? "الأم (Mother)" : "Mother" },
                { val: "guardian", label: isArabic ? "ولي أمر" : "Guardian" },
              ].map((rel) => (
                <Button
                  key={rel.val}
                  type="button"
                  size="sm"
                  variant={form.relationship === rel.val ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, relationship: rel.val as any }))}
                  className="text-xs h-8"
                >
                  {rel.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block">
                <span className="wazen-label">{isArabic ? "بريد الطفل" : "Child Email"}</span>
                <input
                  type="email"
                  className="wazen-field mt-1.5"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="child@example.com"
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="wazen-label">{isArabic ? "كلمة المرور للطفل" : "Child Password"}</span>
                <input
                  type="password"
                  className="wazen-field mt-1.5"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <SpinnerIcon className="size-4 animate-spin me-2" /> : null}
              {isArabic ? "إضافة الطفل وتفعيل الحساب" : "Add Child & Activate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
