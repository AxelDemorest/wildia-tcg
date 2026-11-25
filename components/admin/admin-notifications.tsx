"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AdminCheckIcon } from "@/components/admin/admin-icons";

/** How long a notification stays on screen. */
const DISPLAY_MS = 5000;

type Notification = { id: number; message: string };

const NotifyContext = createContext<((message: string) => void) | null>(null);

/** Shows a notification of the espace administration: the one on screen, if any, is replaced. */
export function useAdminNotify(): (message: string) => void {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error("useAdminNotify needs an AdminNotifications ancestor");
  return notify;
}

/**
 * The espace administration's notifications: one at a time, bottom right of the screen (the full
 * width on a phone), gone after five seconds. The live region stays in the page, empty when
 * nothing is shown, so screen readers announce a message as it appears.
 */
export function AdminNotifications({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const count = useRef(0);

  const notify = useCallback((message: string) => {
    count.current += 1;
    setNotification({ id: count.current, message });
  }, []);

  // A new notification starts its own five seconds.
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <NotifyContext value={notify}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex justify-end sm:left-auto"
      >
        {notification && (
          <p
            key={notification.id}
            className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-[10px] border border-admin-line bg-white px-4 py-3 text-[13px]/[18px] font-medium text-admin-ink shadow-[0_8px_24px_-8px_rgb(17_23_20/0.25)]"
          >
            <AdminCheckIcon className="mt-px size-4 shrink-0 text-brand-strong" />
            {notification.message}
          </p>
        )}
      </div>
    </NotifyContext>
  );
}
