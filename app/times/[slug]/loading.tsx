import { TeamPageSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <TeamPageSkeleton />
    </main>
  );
}
