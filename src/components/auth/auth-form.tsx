"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, LoaderCircle, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dictionary";
import { apiFetch } from "@/lib/fetcher";

interface AuthFormProps {
  mode: "login" | "register";
}

const HIGHLIGHTS: DictKey[] = ["auth.highlight1", "auth.highlight2", "auth.highlight3"];

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { t } = useLang();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // Trim (but never mutate passwords) so stray whitespace can't break login.
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    try {
      await apiFetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        json: isRegister ? { name: cleanName, email: cleanEmail, password } : { email: cleanEmail, password },
      });
      toast.success(isRegister ? t("auth.toastRegistered") : t("auth.toastWelcomed"));
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.errorGeneric");
      setError(message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Form side - clean white with an airy gradient wash */}
      <div className="bg-gradient-mesh flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center gap-2.5">
            <span className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-white elev-card">
              <Ticket size={20} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">DymTicket</span>
          </div>

          <h1 className="text-[22px] font-semibold tracking-tight">
            {isRegister ? t("auth.registerPageTitle") : t("auth.welcomeTitle")}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {isRegister
              ? t("auth.registerPageSub")
              : t("auth.loginPageSub")}
          </p>

          <form
            onSubmit={onSubmit}
            className="elev-card mt-6 rounded-2xl border border-border bg-surface p-5"
            data-testid="auth-form"
          >
            {isRegister && (
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.namePh")}
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </div>
            )}

            <div className="mb-4 flex flex-col gap-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.dev"
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-5 flex flex-col gap-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? t("auth.passwordPh") : "••••••••"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={isRegister ? 8 : undefined}
              />
            </div>

            {error && (
              <p
                className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-10 w-full rounded-xl text-[14px]"
              disabled={busy}
              data-testid="auth-submit"
            >
              {busy && <LoaderCircle size={15} className="animate-spin" />}
              {isRegister ? t("auth.submitRegister") : t("auth.submitLogin")}
            </Button>

            <p className="mt-4 text-center text-[13px] text-muted">
              {isRegister ? t("auth.alreadyHave") : t("auth.newToDym")}
              <Link
                href={isRegister ? "/login" : "/register"}
                className="font-medium text-primary hover:underline"
              >
                {isRegister ? t("auth.login") : t("auth.createAccountLink")}
              </Link>
            </p>
          </form>

          <p className="mt-5 text-center text-[11.5px] text-muted">
            {t("auth.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>

      {/* Visual side - Unsplash photo with an on-brand gradient wash (md+) */}
      <div className="relative hidden lg:block" aria-hidden="true">
        <Image
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="bg-gradient-banner absolute inset-0 opacity-[0.82] mix-blend-multiply" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1e1b4b]/80 via-[#1e1b4b]/30 to-transparent p-10 pb-12">
          <p className="text-[15px] font-medium leading-6 text-white/95">
            {t("auth.quote")}
          </p>
          <p className="mt-2 text-[12.5px] text-white/70">
            {t("auth.quoteAttrib")}
          </p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight} className="flex items-center gap-2.5 text-[13px] text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <Check size={12} />
                </span>
                {t(highlight)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
