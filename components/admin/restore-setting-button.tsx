"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { AdminRotateCcwIcon } from "@/components/admin/admin-icons";
import { SettingError } from "@/components/admin/setting-error";
import type { RestoreError, RestoreResult } from "@/lib/admin/restore-setting";
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
  /**
   * What the dialog says for each way the row's restore can be refused: its Avant out of bounds,
   * or a booster rule. Any other failure says `labels.failed`.
   */
  refusals: Partial<Record<RestoreError, string>>;
};

type ConfirmationProps = Pick<Props, "changeId" | "labels" | "refusals"> & {
  close: () => void;
};

/**
 * The dialog's message and buttons. The browser sends the row's id only: the server reads the
 * setting and the value to put back. A failure keeps the dialog open with its message.
 */
function RestoreConfirmation({ changeId, labels, refusals, close }: ConfirmationProps) {
  const [result, formAction, pending] = useActionState(
    async (previous: RestoreResult | null, formData: FormData) => {
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
      {error && <SettingError>{refusals[error] ?? labels.failed}</SettingError>}
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
 * The "Restaurer" button of a row of the historique des paramètres and its confirmation dialog,
 * which opens with the focus on its first button, Annuler.
 */
export function RestoreSettingButton({ changeId, text, labels, refusals }: Props) {
  return (
    <AdminDialog
      trigger={(open) => (
        <button
          type="button"
          aria-label={labels.restoreAccessibleName}
          onClick={open}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-admin-line-strong bg-white px-3 font-medium text-admin-ink"
        >
          <AdminRotateCcwIcon className="size-3.5" />
          {labels.restoreText}
        </button>
      )}
      title={labels.title}
      text={text}
    >
      {(close) => (
        <RestoreConfirmation
          changeId={changeId}
          labels={labels}
          refusals={refusals}
          close={close}
        />
      )}
    </AdminDialog>
  );
}
