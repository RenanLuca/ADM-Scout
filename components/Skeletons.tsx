import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto da página de um time (cabeçalho, abas e grade de cards). */
export function TeamPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Carregando time">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto genérico para telas de lista. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Carregando">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto do quadro de campeões do Nossos Picks. */
export function BoardSkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="Carregando quadro">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-80 shrink-0 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
