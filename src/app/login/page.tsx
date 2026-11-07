import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthSkeleton } from "@/components/auth/auth-skeleton";
import { LangToggle } from "@/components/lang-toggle";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      {/* Chrome-language switch mirrors the in-app header toggle */}
      <div className="fixed right-4 top-4 z-20">
        <LangToggle />
      </div>
      <AuthForm mode="login" />
    </Suspense>
  );
}
