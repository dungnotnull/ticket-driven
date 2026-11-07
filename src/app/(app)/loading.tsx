import { Skeleton } from "@/components/ui/skeleton";

/** Shell-level loading state for the signed-in area. */
export default function AppGroupLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
