"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeams } from "@/lib/api";

export function TeamList() {
  const [search, setSearch] = useState("");
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const term = search.trim().toLowerCase();
  const teams = data?.filter((t) => t.name.toLowerCase().includes(term)) ?? [];

  return (
    <div className="space-y-6">
      <Input
        type="search"
        placeholder="Buscar time…"
        aria-label="Buscar time"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 max-w-md"
      />

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-rose-400">
            {error.message}
          </p>
          <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>
            {isFetching ? "Tentando…" : "Tentar de novo"}
          </Button>
        </div>
      )}

      {data && teams.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum time encontrado.</p>
      )}

      {teams.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.slug}>
              <Link href={`/times/${team.slug}`} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <TeamLogo slug={team.slug} name={team.name} size={48} />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{team.name}</CardTitle>
                        {team.presidents && (
                          <CardDescription className="truncate">
                            Presidentes: {team.presidents}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
