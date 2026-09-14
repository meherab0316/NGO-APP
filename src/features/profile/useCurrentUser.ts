import { useQuery } from "@tanstack/react-query";
import type { BlocksUser } from "@seliseblocks/client";
import { useAuth } from "../../app/providers/AuthProvider";
import { blocksClient } from "../../lib/blocks/client";

export function useCurrentUser() {
  const { status } = useAuth();
  return useQuery({
    enabled: status === "authenticated",
    queryFn: () => blocksClient.iam.me(),
    queryKey: ["iam", "me"]
  });
}

export function useMyRoles(): string[] {
  const me = useCurrentUser();
  const data = me.data as { data?: { roles?: string[] | Record<string, string[]> } } | undefined;
  const roles = data?.data?.roles;
  if (Array.isArray(roles)) return roles;
  if (roles && typeof roles === "object") return Object.values(roles).flat();
  return [];
}

export function useHasRole(role: string): boolean {
  return useMyRoles().includes(role);
}

export function userDisplayName(profile?: BlocksUser): string {
  if (!profile) return "";
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return name || profile.email || "";
}

export function userInitials(profile?: BlocksUser): string {
  if (!profile) return "?";
  const first = profile.firstName?.[0];
  const last = profile.lastName?.[0];
  if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();
  return (profile.email?.[0] ?? "?").toUpperCase();
}
