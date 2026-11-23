import { AdminLogOutIcon } from "@/components/admin/admin-icons";
import { idleSidebarEntry, topBarIconButton } from "@/components/admin/admin-nav-styles";
import { signOut } from "@/server/actions/auth";

type Props = {
  locale: string;
  label: string;
  /** A sidebar entry, or the phone top bar's icon button named by `label`. */
  variant: "sidebar" | "icon";
};

/** Se déconnecter: the site's own signOut, the same form in the sidebar and the phone top bar. */
export function AdminSignOut({ locale, label, variant }: Props) {
  return (
    <form action={signOut.bind(null, locale)}>
      {variant === "sidebar" ? (
        <button type="submit" className={`${idleSidebarEntry} w-full cursor-pointer text-left`}>
          <AdminLogOutIcon />
          {label}
        </button>
      ) : (
        <button type="submit" aria-label={label} className={`${topBarIconButton} cursor-pointer`}>
          <AdminLogOutIcon className="size-5" />
        </button>
      )}
    </form>
  );
}
