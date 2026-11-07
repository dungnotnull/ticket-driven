"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** Not-found page hiding project existence from non-members (isolation). */
export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="bg-gradient-mesh flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="bg-gradient-primary elev-card flex h-12 w-12 items-center justify-center rounded-2xl text-white">
        <Ticket size={22} />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">
        {t("err.notFoundTitle")}
      </h1>
      <p className="max-w-sm text-[13px] text-muted">
        {t("err.notFoundSub")}
      </p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-surface px-4 py-2 text-[13px] font-medium text-primary shadow-sm ring-1 ring-inset ring-border transition-colors hover:text-indigo-700"
      >
        {t("err.backToProjects")}
      </Link>
    </div>
  );
}
