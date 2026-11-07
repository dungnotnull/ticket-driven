import { LoaderBar, Skeleton } from "@/components/ui/skeleton";

export default function KnowledgeLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading knowledge graph">
      <LoaderBar />
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-xl border border-border bg-surface p-2">
          <Skeleton className="h-[448px] rounded-lg" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-36" />
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}