import type { ReactNode } from "react";
import { AdminAlertCircleIcon } from "@/components/admin/admin-icons";

type Props = { id?: string; children: ReactNode };

/**
 * A refused value or a failed save or restore on the Paramètres page, announced as it appears:
 * alert-circle icon, danger colour (admin mockup).
 */
export function SettingError({ id, children }: Props) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-[13px]/[18px] text-admin-danger"
    >
      <AdminAlertCircleIcon className="size-4" />
      {children}
    </p>
  );
}
