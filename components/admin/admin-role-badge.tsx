import type { TeamRole } from "@/lib/auth/staff-session";

// Text only: the colour is not the only carrier of the role.
const roleStyles: Record<TeamRole, string> = {
  super_admin: "bg-admin-brand-soft text-brand-strong",
  moderator: "bg-admin-moderator-soft text-admin-moderator",
  viewer: "bg-admin-neutral-soft text-admin-text",
};

type Props = { role: TeamRole; label: string };

/** A rôle d’équipe as a pill, in the colours of the admin mockup. */
export function AdminRoleBadge({ role, label }: Props) {
  return (
    <span
      className={`inline-flex h-6 items-center self-start rounded-full px-2.5 text-xs font-semibold ${roleStyles[role]}`}
    >
      {label}
    </span>
  );
}
