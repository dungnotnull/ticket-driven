import { Skeleton } from "@/components/ui/skeleton";

/** Board-agnostic project loading skeleton: 4 columns of card placeholders. */
export default function ProjectLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col gap-5 p-4 sm:p-5" data-testid="board-skeleton">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-flow-col auto-cols-[300px] gap-4 overflow-hidden pb-6">
        {Array.from({ length: 4 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="flex min-h-72 flex-col gap-2 rounded-lg border border-border bg-surface p-2"
          >
            <div className="flex items-center gap-2 border-b border-border px-1 py-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-6 rounded-full" />
            </div>
            {Array.from({ length: columnIndex === 0 ? 3 : 2 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="rounded-md border border-border bg-surface-2 px-3 py-2.5"
              >
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
