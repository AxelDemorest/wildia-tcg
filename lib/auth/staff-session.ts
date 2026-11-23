import type { SessionUser } from "@/lib/auth/session-user";

/** A rôle d’équipe, as stored in team_members.role. */
export type TeamRole = "super_admin" | "moderator" | "viewer";

/** A signed-in membre équipe: their session and their rôle d’équipe, no Supabase type. */
export type StaffSession = SessionUser & { role: TeamRole };
