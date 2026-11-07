import { LoaderBar, Skeleton } from "@/components/ui/skeleton";

/** Route-level skeleton for the projects dashboard: banner, search, cards. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="dashboard-skeleton" aria-busy="true" aria-label="Loading projects">
      <LoaderBar />
      {/* gradient hero banner placeholder */}
      <div className="bg-gradient-banner rounded-2xl px-6 py-8">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-6 w-40 bg-white/20" />
          <Skeleton className="h-4 w-72 bg-white/15" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      {/* search bar */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="elev-card overflow-hidden rounded-xl border border-border bg-surface">
            <Skeleton className="h-14 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center justify-between pt-5">
                <div className="flex -space-x-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
