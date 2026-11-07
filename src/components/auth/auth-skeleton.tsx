import { Skeleton } from "@/components/ui/skeleton";

/** Centered card skeleton shown while the auth form hydrates. */
export function AuthSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="mt-2 h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
