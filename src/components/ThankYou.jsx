import { useEffect, useRef } from "react";

export default function ThankYou({ firstName, email, onReset }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 motion-safe:animate-pop"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-10 text-emerald-600"
        >
          <path d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold text-slate-900 outline-none">
        Thank you, {firstName}!
      </h1>
      <p className="mt-2 break-words text-slate-600">
        A copy has been sent to <span className="font-medium text-slate-800">{email}</span>
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-8 w-full rounded-xl bg-brand-700 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-brand-800 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
      >
        Submit another response
      </button>
    </section>
  );
}
