import Link from "next/link";
import { Suspense } from "react";
import { TeamView } from "@/components/TeamView";

async function TeamContent({ params }: { params: PageProps<"/times/[slug]">["params"] }) {
  const { slug } = await params;
  return <TeamView slug={slug} />;
}

export default function TeamPage(props: PageProps<"/times/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Todos os times
      </Link>
      <Suspense fallback={null}>
        <TeamContent params={props.params} />
      </Suspense>
    </main>
  );
}
