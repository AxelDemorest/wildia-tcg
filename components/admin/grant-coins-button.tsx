"use client";

import { startTransition, useActionState, useId, useState, type ReactNode } from "react";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { AdminCoinPlusIcon } from "@/components/admin/admin-icons";
import { useAdminNotify } from "@/components/admin/admin-notifications";
import { SettingError } from "@/components/admin/setting-error";
import type { AppLocale } from "@/i18n/routing";
import { formatCount } from "@/lib/admin/format-count";
import {
  GRANT_AMOUNT,
  GRANTED_AMOUNT_PLACEHOLDER,
  type GrantCoinsErrors,
  type GrantCoinsResult,
} from "@/lib/admin/grant-coins";
import { grantCoins } from "@/server/actions/admin-coins";

/** The texts of the row's button, of its dialog and of its notification, written by the server. */
export type GrantCoinsLabels = {
  /** The row button's tooltip: the button shows an icon only. */
  tooltip: string;
  /** Its accessible name: "Ajouter des pièces à {nom}". */
  openAccessibleName: string;
  title: string;
  /** The dialog's sentence, naming the account. */
  text: ReactNode;
  amount: string;
  /** Written after the amount field: "pièces". */
  unit: string;
  reason: string;
  /** Under the amount field when the server refuses it. */
  amountOutOfRange: string;
  /** Under the reason field when the server refuses it. */
  reasonTooLong: string;
  /** In the dialog, when the account was deleted since the registry showed it. */
  unknownAccount: string;
  /** In the dialog, for any other failure. */
  failed: string;
  cancel: string;
  confirm: string;
  /**
   * The notification once the coins are added, naming the account, with the amount left as the
   * literal `GRANTED_AMOUNT_PLACEHOLDER`: only the browser knows the amount.
   */
  granted: string;
};

type Props = {
  /** The account the coins go to. */
  userId: string;
  locale: AppLocale;
  labels: GrantCoinsLabels;
};

type FormProps = Omit<Props, "locale"> & {
  onGranted: (amount: string) => void;
  close: () => void;
};

type Failure = Extract<GrantCoinsResult, { ok: false }>;

/**
 * Where the dialog shows a failed grant: a refused value under its field; an account deleted
 * meanwhile, or any other failure, above the buttons.
 */
function failureMessages(
  failure: Failure | null,
  labels: GrantCoinsLabels,
): { fields: GrantCoinsErrors; dialog: string | null } {
  switch (failure?.error) {
    case undefined:
      return { fields: {}, dialog: null };
    case "invalid_values":
      return { fields: failure.fields, dialog: null };
    case "unknown_account":
      return { fields: {}, dialog: labels.unknownAccount };
    default:
      return { fields: {}, dialog: labels.failed };
  }
}

/**
 * The dialog's amount and reason fields and its buttons. The browser checks nothing
 * (`noValidate`): the server does, for this form and for a plain POST alike. A failure keeps the
 * dialog open with its message; the fields are controlled so they keep what was typed when React
 * resets the form after the action. "Ajouter" is disabled while the action runs: a double click
 * sends it once.
 */
function GrantCoinsForm({ userId, labels, onGranted, close }: FormProps) {
  const [result, formAction, pending] = useActionState(
    async (previous: GrantCoinsResult | null, formData: FormData) => {
      const next = await grantCoins(previous, formData);
      // In the action's transition: the dialog closes as the notification appears.
      if (next.ok) startTransition(() => onGranted(String(formData.get("amount"))));
      return next;
    },
    null,
  );
  const id = useId();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { fields, dialog: dialogError } = failureMessages(
    result?.ok === false ? result : null,
    labels,
  );
  const amountError = fields.amount ? labels.amountOutOfRange : null;
  const reasonError = fields.reason ? labels.reasonTooLong : null;
  const amountId = `${id}-amount`;
  const amountErrorId = `${amountId}-error`;
  const reasonId = `${id}-reason`;
  const reasonErrorId = `${reasonId}-error`;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={amountId} className="font-semibold text-admin-ink">
          {labels.amount}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={amountId}
            type="number"
            name="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            min={GRANT_AMOUNT.min}
            max={GRANT_AMOUNT.max}
            step={1}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? amountErrorId : undefined}
            className={`h-10 w-[160px] rounded-[8px] border bg-white px-3 text-admin-ink tabular-nums ${
              amountError ? "border-admin-danger" : "border-admin-line-strong"
            }`}
          />
          <span className="text-admin-muted">{labels.unit}</span>
        </div>
        {amountError && <SettingError id={amountErrorId}>{amountError}</SettingError>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className="font-semibold text-admin-ink">
          {labels.reason}
        </label>
        <input
          id={reasonId}
          type="text"
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={reasonError ? true : undefined}
          aria-describedby={reasonError ? reasonErrorId : undefined}
          className={`h-10 w-full rounded-[8px] border bg-white px-3 text-admin-ink ${
            reasonError ? "border-admin-danger" : "border-admin-line-strong"
          }`}
        />
        {reasonError && <SettingError id={reasonErrorId}>{reasonError}</SettingError>}
      </div>
      {dialogError && <SettingError>{dialogError}</SettingError>}
      <div className="mt-2 flex justify-end gap-2">
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
          className="h-10 cursor-pointer rounded-[8px] bg-brand px-4 font-semibold text-white disabled:cursor-default"
        >
          {labels.confirm}
        </button>
      </div>
    </form>
  );
}

/**
 * The "Ajouter des pièces" button of a row of the registre des comptes inscrits, icon only with a
 * tooltip, and its dialog, which opens with the focus on the amount field. Once the coins are added
 * the notification names the amount and the account; the page is rendered again by the action, so
 * the row's balance shows the grant.
 */
export function GrantCoinsButton({ userId, locale, labels }: Props) {
  const notify = useAdminNotify();

  return (
    <AdminDialog
      trigger={(open) => (
        <button
          type="button"
          title={labels.tooltip}
          aria-label={labels.openAccessibleName}
          onClick={open}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-admin-line-strong bg-white text-admin-ink"
        >
          <AdminCoinPlusIcon />
        </button>
      )}
      title={labels.title}
      text={labels.text}
    >
      {(close) => (
        <GrantCoinsForm
          userId={userId}
          labels={labels}
          onGranted={(amount) => {
            close();
            notify(
              labels.granted.replace(
                GRANTED_AMOUNT_PLACEHOLDER,
                formatCount(Number(amount), locale),
              ),
            );
          }}
          close={close}
        />
      )}
    </AdminDialog>
  );
}
