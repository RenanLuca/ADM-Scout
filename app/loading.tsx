import { PageSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <PageSkeleton />
    </main>
  );
}
