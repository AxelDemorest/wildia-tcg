"use client";

import {
  startTransition,
  useActionState,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AdminRotateCcwIcon } from "@/components/admin/admin-icons";
import { SettingError } from "@/components/admin/setting-error";
import type { SettingWriteResult } from "@/lib/admin/save-setting";
import { isSettingValueError, type SettingValueError } from "@/lib/admin/setting-values";
import { restoreSetting } from "@/server/actions/admin-settings";

/** The texts of the row's button and of its dialog, written by the server. */
type Labels = {
  /** The row button's visible text. */
  restoreText: string;
  /** Its accessible name: "Restaurer {paramètre} à {avant}". */
  restoreAccessibleName: string;
  title: string;
  cancel: string;
  confirm: string;
  /** Any failure of the restore itself. */
  failed: string;
};

type Props = {
  changeId: number;
  /** The dialog's sentence, with the current value and the restored one in bold. */
  text: ReactNode;
  labels: Labels;
  /** What the dialog says when the row's Avant is refused, for the row's setting. */
  valueErrors: Record<SettingValueError, string>;
};

type ConfirmationProps = Pick<Props, "changeId" | "labels" | "valueErrors"> & {
  close: () => void;
};

/**
 * The dialog's message and buttons. The browser sends the row's id only: the server reads the
 * setting and the value to put back. A failure keeps the dialog open with its message.
 */
function RestoreConfirmation({ changeId, labels, valueErrors, close }: ConfirmationProps) {
  const [result, formAction, pending] = useActionState(
    async (previous: SettingWriteResult | null, formData: FormData) => {
      const next = await restoreSetting(previous, formData);
      // In the action's transition: the dialog closes as the refreshed page appears.
      if (next.ok) startTransition(close);
      return next;
    },
    null,
  );
  const error = result?.ok === false ? result.error : null;

  return (
    <>
      {error && (
        <SettingError>
          {isSettingValueError(error) ? valueErrors[error] : labels.failed}
        </SettingError>
      )}
      <form action={formAction} className="mt-2 flex justify-end gap-2">
        <input type="hidden" name="changeId" value={changeId} />
        <button
          type="button"
          onClick={close}
          className="h-10 cursor-pointer rounded-[8px] border border-admin-line-strong bg-white px-4 font-medium text-admin-ink"
        >
          {labels.cancel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-brand px-4 font-semibold text-white disabled:cursor-default"
        >
          <AdminRotateCcwIcon className="size-4" />
          {labels.confirm}
        </button>
      </form>
    </>
  );
}

/**
 * The "Restaurer" button of a row of the historique des paramètres and its confirmation dialog: a
 * native modal `<dialog>`, which Esc and "Annuler" close and a click on the backdrop does not.
 */
export function RestoreSettingButton({ changeId, text, labels, valueErrors }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();
  const [open, setOpen] = useState(false);
  // Each opening starts a new confirmation (key): no message is left from the last attempt.
  const [openCount, setOpenCount] = useState(0);

  // The native dialog follows `open`, before paint: a closing dialog is not shown for a frame over
  // the refreshed page. showModal() makes the rest of the page inert and focuses the
  // dialog's first button: Annuler.
  useLayoutEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={labels.restoreAccessibleName}
        onClick={() => {
          setOpenCount((count) => count + 1);
          setOpen(true);
        }}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-admin-line-strong bg-white px-3 font-medium text-admin-ink"
      >
        <AdminRotateCcwIcon className="size-3.5" />
        {labels.restoreText}
      </button>
      {/* In a table cell: alignment and wrapping are set back for the dialog's text. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={textId}
        onClose={() => setOpen(false)}
        className="m-auto w-[480px] max-w-[calc(100%-48px)] rounded-xl bg-white p-6 text-left whitespace-normal text-admin-text shadow-[0_24px_48px_-16px_rgb(17_23_20/0.35)] backdrop:bg-[rgb(17_23_20/0.45)]"
      >
        <div className="flex flex-col gap-3">
          <h2 id={titleId} className="text-lg/6 font-semibold text-admin-ink">
            {labels.title}
          </h2>
          <p id={textId}>{text}</p>
          <RestoreConfirmation
            key={openCount}
            changeId={changeId}
            labels={labels}
            valueErrors={valueErrors}
            close={() => setOpen(false)}
          />
        </div>
      </dialog>
    </>
  );
}
