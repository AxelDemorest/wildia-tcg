"use client";

import Form from "next/form";
import { useState } from "react";
import { AdminEyeOffIcon, AdminSearchIcon } from "@/components/admin/admin-icons";

type Props = {
  /** The registry's path: the form replaces its whole query with the search. */
  action: string;
  /** The URL's search, shown in the field. */
  term: string;
  /** The URL's page: changing it, like the search, shows the URL's search in the field again. */
  page: number;
  label: string;
  submitLabel: string;
  /** Said next to the search when the rôle d’équipe sees masked e-mails, else null. */
  hint: string | null;
};

/**
 * The registry's search: a GET form, so the search lives in the URL (`?q=`). On a phone the submit
 * button is a 44 px icon; its label stays for screen readers. The hint sits beside the form from
 * 1024 px, under it below.
 */
export function AccountsSearch({ action, term, page, label, submitLabel, hint }: Props) {
  const [value, setValue] = useState(term);
  // Next keeps this component when only the query changes. When the URL's search or page changes
  // (a search sent, a page change, Back), the field shows the URL's search again, not text typed
  // and left unsent. Reset during render, not by a remount: focus stays on the field or the button.
  const [shown, setShown] = useState({ term, page });
  if (shown.term !== term || shown.page !== page) {
    setShown({ term, page });
    setValue(term);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-3">
      <Form
        action={action}
        role="search"
        className="flex w-full max-w-[560px] items-center gap-2 lg:flex-[1_1_420px]"
      >
        <label htmlFor="accounts-search" className="sr-only">
          {label}
        </label>
        <div className="relative min-w-0 flex-1">
          <AdminSearchIcon className="pointer-events-none absolute top-3.5 left-3 size-4 text-admin-muted lg:top-3" />
          <input
            id="accounts-search"
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={label}
            className="h-11 w-full rounded-[8px] border border-admin-line-strong bg-white pr-3 pl-9 text-admin-ink lg:h-10"
          />
        </div>
        <button
          type="submit"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-brand font-semibold text-white lg:h-10 lg:w-auto lg:px-4"
        >
          <AdminSearchIcon className="size-[18px] lg:hidden" />
          <span className="max-lg:sr-only">{submitLabel}</span>
        </button>
      </Form>
      {hint && (
        <p className="flex items-center gap-1.5 text-[13px]/[18px] text-admin-muted">
          <AdminEyeOffIcon className="size-4" />
          {hint}
        </p>
      )}
    </div>
  );
}
