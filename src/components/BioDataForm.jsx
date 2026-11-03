import { useEffect, useRef, useState } from "react";
import { SCRIPT_URL, UNIVERSITY_NAME, START_YEAR, END_YEAR } from "../config.js";
import CapIcon from "./CapIcon.jsx";

/* ============================================================
   EDITABLE LISTS: change faculties, departments and other options here.
   "Other" is included so people whose option is missing can still submit.
   ============================================================ */
const FACULTIES = [
  "Faculty of Arts",
  "Faculty of Basic Medical Sciences",
  "Faculty of Education",
  "Faculty of Engineering",
  "Faculty of Law",
  "Faculty of Management Sciences",
  "Faculty of Science",
  "Faculty of Social Sciences",
  "Other",
];

const DEPARTMENTS = [
  "Accounting",
  "Biochemistry",
  "Business Administration",
  "Chemistry",
  "Civil Engineering",
  "Computer Science",
  "Economics",
  "Electrical Engineering",
  "English",
  "Mass Communication",
  "Mathematics",
  "Mechanical Engineering",
  "Microbiology",
  "Political Science",
  "Psychology",
  "Sociology",
  "Other",
];

const COUNTRIES = [
  "Nigeria",
  "Benin Republic",
  "Cameroon",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Canada",
  "Other",
];

const GENDERS = ["Male", "Female"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1));

// Newest first, built from START_YEAR and END_YEAR in config.js.
const YEAR_OPTIONS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => String(END_YEAR - i));

const QUALIFICATION_OPTIONS = ["SSCE", "OND", "NCE", "HND", "B.Sc/B.A", "M.Sc/MBA", "PhD", "Other"];

// Order used to focus the first invalid field (matches top-to-bottom layout).
const FIELD_ORDER = [
  "fullName",
  "matricNo",
  "entryYear",
  "gradYear",
  "email",
  "phone",
  "city",
  "country",
  "countryOther",
  "consent",
];

// Labels used in the review modal, in display order.
const REVIEW_ROWS = [
  ["fullName", "Full name"],
  ["nickname", "Nickname"],
  ["gender", "Gender"],
  ["birthday", "Birthday"],
  ["matricNo", "Matriculation / student no."],
  ["faculty", "Faculty"],
  ["department", "Department"],
  ["course", "Course of study"],
  ["entryYear", "Year of entry"],
  ["gradYear", "Year of graduation"],
  ["societyRole", "Student union / society role"],
  ["email", "Email"],
  ["phone", "Phone / WhatsApp"],
  ["city", "Current city / state"],
  ["country", "Country"],
  ["employer", "Current employer / occupation"],
  ["jobTitle", "Job title"],
  ["qualification", "Highest qualification"],
  ["willingToMentor", "Willing to mentor / support projects"],
  ["consent", "Consent given"],
];

const DRAFT_KEY = "alumni-biodata-draft-v1";
const REQUIRED_MSG = "This field is required.";
const NG_PHONE = /^(\+234|0)[789]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SCRIPT_READY = !SCRIPT_URL.includes("PASTE_") && SCRIPT_URL.startsWith("https://");

const EMPTY_VALUES = {
  fullName: "",
  nickname: "",
  gender: "",
  birthDay: "",
  birthMonth: "",
  matricNo: "",
  faculty: "",
  department: "",
  course: "",
  entryYear: "",
  gradYear: "",
  societyRole: "",
  email: "",
  phone: "",
  city: "",
  country: "Nigeria",
  countryOther: "",
  employer: "",
  jobTitle: "",
  qualification: "",
  willingToMentor: "",
  consent: false,
};

/* ---------- draft storage (localStorage, never trusted blindly) ---------- */

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_VALUES;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_VALUES;
    const next = { ...EMPTY_VALUES };
    for (const key of Object.keys(EMPTY_VALUES)) {
      // Keep only known keys with the right type; ignore anything else.
      if (typeof parsed[key] === typeof EMPTY_VALUES[key]) next[key] = parsed[key];
    }
    return next;
  } catch {
    return EMPTY_VALUES;
  }
}

function saveDraft(values) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage full or blocked: the form still works, the draft just won't survive a refresh.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing else to do.
  }
}

/* ---------- validation and record building ---------- */

function validate(v) {
  const errors = {};
  const phoneDigits = v.phone.trim().replace(/[\s\-()]/g, "");

  if (!v.fullName.trim()) errors.fullName = REQUIRED_MSG;
  if (!v.matricNo.trim()) errors.matricNo = REQUIRED_MSG;

  if (!v.entryYear) errors.entryYear = REQUIRED_MSG;
  if (!v.gradYear) errors.gradYear = REQUIRED_MSG;
  if (v.entryYear && v.gradYear && Number(v.gradYear) < Number(v.entryYear)) {
    errors.gradYear = "Graduation year cannot be before the year of entry.";
  }

  if (!v.email.trim()) errors.email = REQUIRED_MSG;
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email address, e.g. name@example.com.";

  if (!v.phone.trim()) errors.phone = REQUIRED_MSG;
  else if (!NG_PHONE.test(phoneDigits)) {
    errors.phone = "Enter a Nigerian number, e.g. 0803 123 4567 or +234 803 123 4567.";
  }

  if (!v.city.trim()) errors.city = REQUIRED_MSG;
  if (!v.country) errors.country = REQUIRED_MSG;
  if (v.country === "Other" && !v.countryOther.trim()) errors.countryOther = REQUIRED_MSG;

  if (!v.consent) errors.consent = "You need to agree to the consent statement before submitting.";

  return errors;
}

// The single source of truth for what is shown in the review modal AND sent to the server.
function buildRecord(v) {
  const birthday = v.birthDay && v.birthMonth ? `${v.birthDay} ${v.birthMonth}` : "";
  return {
    fullName: v.fullName.trim(),
    nickname: v.nickname.trim(),
    gender: v.gender,
    birthday,
    email: v.email.trim(),
    phone: v.phone.trim(),
    city: v.city.trim(),
    country: v.country === "Other" ? v.countryOther.trim() : v.country,
    entryYear: v.entryYear,
    gradYear: v.gradYear,
    matricNo: v.matricNo.trim(),
    faculty: v.faculty,
    department: v.department,
    course: v.course.trim(),
    societyRole: v.societyRole.trim(),
    employer: v.employer.trim(),
    jobTitle: v.jobTitle.trim(),
    qualification: v.qualification,
    willingToMentor: v.willingToMentor,
    consent: v.consent ? "Yes" : "No",
  };
}

function withoutKeys(errors, keys) {
  if (!keys.some((k) => k in errors)) return errors;
  const next = { ...errors };
  for (const k of keys) delete next[k];
  return next;
}

/* ---------- small presentational pieces ---------- */

function inputClass(hasError) {
  const state = hasError
    ? "border-red-500 focus:border-red-500 focus:ring-red-100"
    : "border-slate-300 focus:border-brand-600 focus:ring-brand-100";
  return `w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:outline-none focus:ring-4 ${state}`;
}

function describedBy(name, helper, error) {
  if (error) return `${name}-error`;
  if (helper) return `${name}-help`;
  return undefined;
}

function Field({ name, label, required, helper, error, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : helper ? (
        <p id={`${name}-help`} className="mt-1.5 text-xs text-slate-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function TextInput({ name, value, onChange, error, helper, inputRef, ...rest }) {
  return (
    <input
      id={name}
      name={name}
      ref={inputRef}
      value={value}
      onChange={onChange}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy(name, helper, error)}
      className={inputClass(!!error)}
      {...rest}
    />
  );
}

function SelectInput({ name, value, onChange, error, helper, inputRef, options, blank = "Select…", ...rest }) {
  return (
    <select
      id={name}
      name={name}
      ref={inputRef}
      value={value}
      onChange={onChange}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy(name, helper, error)}
      className={inputClass(!!error)}
      {...rest}
    >
      {blank && <option value="">{blank}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-4 text-base font-semibold text-brand-700">{title}</h2>
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Spinner() {
  return (
    <svg className="size-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

/* ---------- main component ---------- */

export default function BioDataForm({ onSuccess }) {
  const [values, setValues] = useState(loadDraft);
  const [errors, setErrors] = useState({});
  const [reviewRecord, setReviewRecord] = useState(null); // snapshot shown in the modal
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState("");

  const fieldRefs = useRef({});
  const dialogRef = useRef(null);

  const setRef = (name) => (el) => {
    fieldRefs.current[name] = el;
  };

  // Persist the draft on every change.
  useEffect(() => {
    saveDraft(values);
  }, [values]);

  // Modal: move focus into it, close on Escape, and stop the page behind from scrolling.
  useEffect(() => {
    if (!reviewRecord) return undefined;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape" && !submitting) setReviewRecord(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [reviewRecord, submitting]);

  const update = (name) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => withoutKeys(prev, name === "country" ? ["country", "countryOther"] : [name]));
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!SCRIPT_READY) return;

    const found = validate(values);
    setErrors(found);

    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setSendError("");
    setReviewRecord(buildRecord(values));
  }

  async function handleConfirm() {
    if (!reviewRecord || submitting) return;
    setSubmitting(true);
    setSendError("");
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams({ ...reviewRecord, timestamp: new Date().toISOString() }),
      });
      clearDraft();
      onSuccess({ fullName: reviewRecord.fullName, email: reviewRecord.email });
    } catch {
      setSendError("We couldn't reach the server. Check your connection and try again. Your answers have been kept.");
      setSubmitting(false);
    }
  }

  const v = values;
  const e = errors;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-lg">
          <CapIcon className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {UNIVERSITY_NAME} Alumni Network
        </h1>
        <p className="mt-1 font-medium text-brand-700">Alumni Bio-Data Form</p>
        <p className="mt-1 text-sm text-slate-500">Takes about 2 minutes.</p>
      </header>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8"
      >
        {!SCRIPT_READY && (
          <div role="alert" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            This form isn't connected to its response sheet yet. Please try again later or contact the Alumni
            Association.
          </div>
        )}

        {/* 1. Personal */}
        <FormSection title="1. Personal">
          <Field name="fullName" label="Full name (surname first)" required error={e.fullName} className="sm:col-span-2">
            <TextInput
              name="fullName"
              value={v.fullName}
              onChange={update("fullName")}
              error={e.fullName}
              inputRef={setRef("fullName")}
              type="text"
              autoComplete="name"
              required
              aria-required="true"
              placeholder="e.g. Okafor Chinedu Emeka"
            />
          </Field>

          <Field name="nickname" label="Nickname">
            <TextInput name="nickname" value={v.nickname} onChange={update("nickname")} type="text" />
          </Field>

          <Field name="gender" label="Gender">
            <SelectInput name="gender" value={v.gender} onChange={update("gender")} options={GENDERS} />
          </Field>

          <div className="sm:col-span-1">
            <span id="birthday-label" className="mb-1.5 block text-sm font-medium text-slate-700">
              Birthday
            </span>
            <div role="group" aria-labelledby="birthday-label" className="grid grid-cols-2 gap-3">
              <select
                name="birthDay"
                aria-label="Birthday: day"
                value={v.birthDay}
                onChange={update("birthDay")}
                className={inputClass(false)}
              >
                <option value="">Day</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                name="birthMonth"
                aria-label="Birthday: month"
                value={v.birthMonth}
                onChange={update("birthMonth")}
                className={inputClass(false)}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Day and month only.</p>
          </div>
        </FormSection>

        {/* 2. University */}
        <FormSection title="2. University">
          <Field name="matricNo" label="Matriculation / student number" required error={e.matricNo} className="sm:col-span-2">
            <TextInput
              name="matricNo"
              value={v.matricNo}
              onChange={update("matricNo")}
              error={e.matricNo}
              inputRef={setRef("matricNo")}
              type="text"
              required
              aria-required="true"
            />
          </Field>

          <Field name="faculty" label="Faculty" className="sm:col-span-2">
            <SelectInput name="faculty" value={v.faculty} onChange={update("faculty")} options={FACULTIES} />
          </Field>

          <Field name="department" label="Department" className="sm:col-span-2">
            <SelectInput name="department" value={v.department} onChange={update("department")} options={DEPARTMENTS} />
          </Field>

          <Field name="course" label="Course of study" className="sm:col-span-2">
            <TextInput name="course" value={v.course} onChange={update("course")} type="text" />
          </Field>

          <Field name="entryYear" label="Year of entry" required error={e.entryYear}>
            <SelectInput
              name="entryYear"
              value={v.entryYear}
              onChange={update("entryYear")}
              error={e.entryYear}
              inputRef={setRef("entryYear")}
              options={YEAR_OPTIONS}
              required
              aria-required="true"
            />
          </Field>

          <Field name="gradYear" label="Year of graduation" required error={e.gradYear}>
            <SelectInput
              name="gradYear"
              value={v.gradYear}
              onChange={update("gradYear")}
              error={e.gradYear}
              inputRef={setRef("gradYear")}
              options={YEAR_OPTIONS}
              required
              aria-required="true"
            />
          </Field>

          <Field name="societyRole" label="Student union or society role" helper="Optional. e.g. Class Rep, PRO, Chapter Secretary." className="sm:col-span-2">
            <TextInput name="societyRole" value={v.societyRole} onChange={update("societyRole")} type="text" helper="Optional." />
          </Field>
        </FormSection>

        {/* 3. Contact */}
        <FormSection title="3. Contact">
          <Field
            name="email"
            label="Email address"
            required
            helper="A copy of your submission will be sent here"
            error={e.email}
            className="sm:col-span-2"
          >
            <TextInput
              name="email"
              value={v.email}
              onChange={update("email")}
              error={e.email}
              helper="A copy of your submission will be sent here"
              inputRef={setRef("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-required="true"
              placeholder="name@example.com"
            />
          </Field>

          <Field
            name="phone"
            label="Phone / WhatsApp"
            required
            helper="Nigerian number. e.g. 0803 123 4567 or +234 803 123 4567"
            error={e.phone}
          >
            <TextInput
              name="phone"
              value={v.phone}
              onChange={update("phone")}
              error={e.phone}
              helper="Nigerian number. e.g. 0803 123 4567 or +234 803 123 4567"
              inputRef={setRef("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-required="true"
              placeholder="0803 123 4567"
            />
          </Field>

          <Field name="city" label="Current city / state" required error={e.city}>
            <TextInput
              name="city"
              value={v.city}
              onChange={update("city")}
              error={e.city}
              inputRef={setRef("city")}
              type="text"
              autoComplete="address-level2"
              required
              aria-required="true"
            />
          </Field>

          <Field name="country" label="Country" required error={e.country}>
            <SelectInput
              name="country"
              value={v.country}
              onChange={update("country")}
              error={e.country}
              inputRef={setRef("country")}
              options={COUNTRIES}
              blank={null}
              required
              aria-required="true"
            />
          </Field>

          {v.country === "Other" && (
            <Field name="countryOther" label="Type your country" required error={e.countryOther} className="sm:col-span-2">
              <TextInput
                name="countryOther"
                value={v.countryOther}
                onChange={update("countryOther")}
                error={e.countryOther}
                inputRef={setRef("countryOther")}
                type="text"
                autoComplete="country-name"
                required
                aria-required="true"
              />
            </Field>
          )}
        </FormSection>

        {/* 4. Now */}
        <FormSection title="4. Now">
          <Field name="employer" label="Current employer / occupation" className="sm:col-span-2">
            <TextInput name="employer" value={v.employer} onChange={update("employer")} type="text" />
          </Field>

          <Field name="jobTitle" label="Job title" helper="Optional.">
            <TextInput name="jobTitle" value={v.jobTitle} onChange={update("jobTitle")} type="text" helper="Optional." />
          </Field>

          <Field name="qualification" label="Highest qualification">
            <SelectInput name="qualification" value={v.qualification} onChange={update("qualification")} options={QUALIFICATION_OPTIONS} />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-slate-700">
              Willing to mentor students or support university projects?
            </legend>
            <div className="flex flex-wrap gap-3">
              {["Yes", "No"].map((opt) => (
                <label
                  key={opt}
                  className={`flex min-w-28 cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-base transition focus-within:ring-4 focus-within:ring-brand-100 ${
                    v.willingToMentor === opt
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="willingToMentor"
                    value={opt}
                    checked={v.willingToMentor === opt}
                    onChange={update("willingToMentor")}
                    ref={opt === "Yes" ? setRef("willingToMentor") : undefined}
                    className="size-4 accent-brand-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        </FormSection>

        {/* 5. Consent and submit */}
        <FormSection title="5. Consent">
          <div className="sm:col-span-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition focus-within:ring-4 focus-within:ring-brand-100 ${
                e.consent ? "bg-red-50 ring-red-300" : "bg-slate-50 ring-slate-200"
              }`}
            >
              <input
                id="consent"
                name="consent"
                type="checkbox"
                ref={setRef("consent")}
                checked={v.consent}
                onChange={update("consent")}
                required
                aria-required="true"
                aria-invalid={e.consent ? "true" : undefined}
                aria-describedby={e.consent ? "consent-error" : undefined}
                className="mt-0.5 size-5 shrink-0 accent-brand-600"
              />
              <span className="text-sm leading-relaxed text-slate-700">
                I agree that my details can be stored and used by the {UNIVERSITY_NAME} Alumni Association.
                <span className="ml-0.5 text-red-600" aria-hidden="true">
                  *
                </span>
              </span>
            </label>
            {e.consent && (
              <p id="consent-error" className="mt-1.5 text-sm text-red-600">
                {e.consent}
              </p>
            )}
          </div>
        </FormSection>

        <div className="mt-8 border-t border-slate-200 pt-6">
          {!v.consent && (
            <p className="mb-3 text-center text-sm text-slate-500">Tick the consent box above to enable submission.</p>
          )}
          <button
            type="submit"
            disabled={!v.consent || !SCRIPT_READY}
            className="w-full rounded-xl bg-brand-700 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-brand-800 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale disabled:blur-[1px] disabled:shadow-none"
          >
            Review &amp; submit
          </button>
        </div>
      </form>

      {reviewRecord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-6">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            tabIndex={-1}
            className="flex max-h-[90dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex-none border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 id="review-title" className="text-lg font-bold text-slate-900">
                Review your details
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">Check everything below before sending.</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {sendError && (
                <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                  {sendError}
                </div>
              )}
              <dl className="divide-y divide-slate-100">
                {REVIEW_ROWS.map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2.5">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="break-words text-sm font-medium text-slate-900">{reviewRecord[key] || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid flex-none grid-cols-1 gap-3 border-t border-slate-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-6">
              <button
                type="button"
                onClick={() => setReviewRecord(null)}
                disabled={submitting}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:bg-brand-800 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Spinner />
                    Submitting…
                  </>
                ) : (
                  "Confirm & submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
