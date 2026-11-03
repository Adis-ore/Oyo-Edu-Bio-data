import { useCallback, useState } from "react";
import { UNIVERSITY_NAME } from "./config.js";
import Welcome from "./components/Welcome.jsx";
import BioDataForm from "./components/BioDataForm.jsx";
import ThankYou from "./components/ThankYou.jsx";

const WELCOME_KEY = "alumni-welcome-seen";

function hasSeenWelcome() {
  try {
    return sessionStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

function markWelcomeSeen() {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    // Storage unavailable (e.g. private mode): the welcome may show again, which is harmless.
  }
}

// Names are entered surname first, so the first given name is the second word.
function firstNameOf(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[1] ?? parts[0] ?? "there";
}

export default function App() {
  const [step, setStep] = useState(() => (hasSeenWelcome() ? "form" : "welcome"));
  const [submitted, setSubmitted] = useState({ firstName: "", email: "" });

  const finishWelcome = useCallback(() => {
    markWelcomeSeen();
    setStep("form");
  }, []);

  const handleSuccess = useCallback(({ fullName, email }) => {
    setSubmitted({ firstName: firstNameOf(fullName), email });
    setStep("thanks");
  }, []);

  const resetForm = useCallback(() => setStep("form"), []);

  return (
    <div className="flex min-h-dvh flex-col font-sans">
      <main className="flex flex-1 flex-col px-4 py-8 sm:py-12">
        {step === "welcome" && <Welcome onDone={finishWelcome} />}
        {step === "form" && <BioDataForm onSuccess={handleSuccess} />}
        {step === "thanks" && (
          <ThankYou firstName={submitted.firstName} email={submitted.email} onReset={resetForm} />
        )}
      </main>
      <footer className="px-4 pb-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {UNIVERSITY_NAME} Alumni Association
      </footer>
    </div>
  );
}
