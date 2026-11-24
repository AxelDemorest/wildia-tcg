"use client";

import { useActionState, useId, useState } from "react";
import { AdminCheckIcon } from "@/components/admin/admin-icons";
import { SettingError } from "@/components/admin/setting-error";
import {
  isSettingValueError,
  type EditableSetting,
  type SettingValueError,
} from "@/lib/admin/setting-values";
import { saveSetting } from "@/server/actions/admin-settings";

type Props = {
  setting: EditableSetting;
  /** The setting's current value, read by the server. */
  value: number;
  title: string;
  label: string;
  /** Under the field, also its accessible description. */
  help: string;
  /** Written after the field, e.g. "×"; none when omitted. */
  unit?: string;
  min: number;
  max: number;
  step: number;
  /** `failed`: any failure of the save itself, shown in the card. */
  labels: { save: string; saved: string; failed: string };
  /** The message under the field for each refused value. */
  valueErrors: Record<SettingValueError, string>;
};

/**
 * A card of the Paramètres page: one setting and its "Enregistrer" button. The browser checks
 * nothing (`noValidate`): the server does, for this form and for a plain POST alike. The field is
 * controlled so it keeps what was typed when React resets the form after the action.
 */
export function SettingCard({
  setting,
  value,
  title,
  label,
  help,
  unit,
  min,
  max,
  step,
  labels,
  valueErrors,
}: Props) {
  const [result, formAction, pending] = useActionState(saveSetting, null);
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState(String(value));
  // The result speaks of the value saved: it is hidden once the field holds another one.
  const [resultShown, setResultShown] = useState(false);
  // The server value and the result last rendered, compared during render rather than reset by a
  // remount: focus stays on the field or the button.
  const [rendered, setRendered] = useState({ value, result });
  if (rendered.value !== value || rendered.result !== result) {
    setRendered({ value, result });
    // After a save or a change made elsewhere (a restore), the field shows the server value again.
    if (rendered.value !== value) setDraft(String(value));
    // A save brings its result with the new value; a new value alone hides the last result.
    setResultShown(rendered.result !== result);
  }

  const error = resultShown && result?.ok === false ? result.error : null;
  // A refused value is the field's error; any other failure is the card's.
  const valueError = error && isSettingValueError(error) ? valueErrors[error] : null;

  const input = (
    <input
      id={inputId}
      type="number"
      name="value"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        setResultShown(false);
      }}
      min={min}
      max={max}
      step={step}
      aria-invalid={valueError ? true : undefined}
      aria-describedby={valueError ? `${errorId} ${helpId}` : helpId}
      className={`h-10 w-[140px] rounded-[8px] border bg-white px-3 text-admin-ink tabular-nums ${
        valueError ? "border-admin-danger" : "border-admin-line-strong"
      }`}
    />
  );

  return (
    <section className="flex flex-[1_1_360px] flex-col gap-4 rounded-xl border border-admin-line bg-white p-6">
      <h2 className="text-lg/6 font-semibold text-admin-ink">{title}</h2>
      <form action={formAction} noValidate className="flex flex-1 flex-col gap-4">
        <input type="hidden" name="setting" value={setting} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-semibold text-admin-ink">
            {label}
          </label>
          {unit ? (
            <div className="flex items-center gap-2">
              {input}
              <span className="text-admin-muted">{unit}</span>
            </div>
          ) : (
            input
          )}
          {valueError && <SettingError id={errorId}>{valueError}</SettingError>}
          <p id={helpId} className="text-[13px]/[18px] text-admin-muted">
            {help}
          </p>
        </div>
        {error && !valueError && <SettingError>{labels.failed}</SettingError>}
        <div className="mt-auto flex items-center justify-end gap-3">
          {/* Always in the page, so screen readers announce "Enregistré" when it appears. */}
          <p
            role="status"
            className="flex items-center gap-1.5 text-[13px]/[18px] font-medium text-brand-strong"
          >
            {resultShown && result?.ok && (
              <>
                <AdminCheckIcon className="size-4" />
                {labels.saved}
              </>
            )}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="h-10 cursor-pointer rounded-[8px] bg-brand px-4 font-semibold text-white disabled:cursor-default"
          >
            {labels.save}
          </button>
        </div>
      </form>
    </section>
  );
}
