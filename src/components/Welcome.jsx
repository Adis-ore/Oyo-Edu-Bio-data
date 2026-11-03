import { useEffect } from "react";
import { UNIVERSITY_NAME } from "../config.js";
import CapIcon from "./CapIcon.jsx";

const SHOW_MS = 5000;

export default function Welcome({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center" aria-label="Welcome">
      <div className="mb-8 flex size-20 items-center justify-center rounded-3xl bg-brand-800 text-white shadow-xl motion-safe:animate-rise">
        <CapIcon className="size-10" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-brand-800 motion-safe:animate-rise sm:text-5xl">
        Welcome
      </h1>
      <p className="mt-3 max-w-xs text-lg text-slate-600 motion-safe:animate-rise [animation-delay:300ms]">
        to the {UNIVERSITY_NAME} Alumni Network
      </p>

      <div className="mt-10 w-full max-w-xs" aria-hidden="true">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-0 rounded-full bg-brand-600 motion-safe:animate-progress motion-reduce:w-full" />
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-6 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:underline focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
      >
        Skip
      </button>
    </section>
  );
}
