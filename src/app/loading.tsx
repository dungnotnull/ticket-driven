import { HamsterLoader } from "@/components/ui/hamster-loader";

/** Root-level first-paint loading state: the hamster wheel. */
export default function RootLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-gradient-mesh"
      aria-busy="true"
      aria-label="Loading"
    >
      <HamsterLoader />
    </div>
  );
}
