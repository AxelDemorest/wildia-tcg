"use client";

import { Fragment, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** The button that opens the dialog, given the function that opens it. */
  trigger: (open: () => void) => ReactNode;
  title: string;
  /** The dialog's sentence, under its title: also its accessible description. */
  text: ReactNode;
  /**
   * The dialog's form, given the function that closes it; an action that succeeds calls it in its
   * transition, so the dialog closes as the action's result appears.
   */
  children: (close: () => void) => ReactNode;
};

/**
 * A confirmation dialog of the espace administration and the button that opens it: a native modal
 * `<dialog>`, which Esc and the form's "Annuler" close and a click on the backdrop does not.
 */
export function AdminDialog({ trigger, title, text, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();
  const [open, setOpen] = useState(false);
  // Each opening starts a new form (key): no message is left from the last attempt.
  const [openCount, setOpenCount] = useState(0);

  // The native dialog follows `open`, before paint: a closing dialog is not shown for a frame over
  // the action's result. showModal() makes the rest of the page inert and focuses the dialog's
  // first focusable element.
  useLayoutEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  return (
    <>
      {trigger(() => {
        setOpenCount((count) => count + 1);
        setOpen(true);
      })}
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
            {title}
          </h2>
          <p id={textId}>{text}</p>
          <Fragment key={openCount}>{children(() => setOpen(false))}</Fragment>
        </div>
      </dialog>
    </>
  );
}
