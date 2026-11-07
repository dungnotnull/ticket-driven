/** Root-level first-paint loading state. */
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Loading">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-surface ring-1 ring-inset ring-border" />
    </div>
  );
}
