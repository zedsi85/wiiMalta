import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Api } from "./api";
import { useAuth } from "./auth";

/** React Query hooks — caching tuned for festival networks (long gcTime = offline reads). */

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => (await Api.events()).events,
    staleTime: 60_000,
    gcTime: 24 * 3600_000,
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: () => Api.event(slug),
    staleTime: 60_000,
    gcTime: 24 * 3600_000,
    enabled: !!slug,
  });
}

export function useTickets() {
  const { email } = useAuth();
  return useQuery({
    queryKey: ["tickets", email],
    queryFn: async () => (await Api.tickets()).tickets,
    enabled: !!email,
    staleTime: 30_000,
    gcTime: 7 * 24 * 3600_000, // wallet stays readable offline for a week
  });
}

export function useSaved() {
  const { email } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["saved", email],
    queryFn: async () => (await Api.saved()).eventIds,
    enabled: !!email,
    staleTime: 60_000,
  });
  const toggle = useMutation({
    mutationFn: async ({ eventId, save }: { eventId: string; save: boolean }) => Api.setSaved(eventId, save),
    onMutate: async ({ eventId, save }) => {
      await qc.cancelQueries({ queryKey: ["saved", email] });
      qc.setQueryData<string[]>(["saved", email], (old = []) =>
        save ? [...old, eventId] : old.filter((id) => id !== eventId)
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved", email] }),
  });
  return { ...query, toggle };
}

export function useAmbassador() {
  const { email } = useAuth();
  return useQuery({
    queryKey: ["ambassador", email],
    queryFn: () => Api.ambassador(),
    enabled: !!email,
    staleTime: 60_000,
  });
}
