/**
 * ALUMNI BIO-DATA FORM: Google Apps Script backend
 *
 * SETUP (do this once, then after every edit)
 * 1. Open https://script.google.com > New project. Delete the default code and paste this whole file.
 *    (Or open your Google Sheet > Extensions > Apps Script to bind the script to the sheet.)
 * 2. Optional: set SPREADSHEET_ID below to your Sheet's ID (the long string in its URL between /d/ and /edit).
 *    Leave it blank if the script is bound to the sheet (step 1, second option).
 * 3. Set TEST_EMAIL below to an address you can check, and UNIVERSITY_NAME to match src/config.js.
 * 4. Deploy > New deployment > type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *      (NOT "Anyone with a Google account": that redirects to a sign-in page and silently loses submissions.)
 * 5. Click Deploy, approve the permissions, and copy the Web app URL (it ends in /exec).
 * 6. Paste that URL into src/config.js as SCRIPT_URL, then restart `npm run dev` or rebuild.
 * 7. AFTER EVERY EDIT TO THIS FILE: Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 *    The /exec URL stays the same. Without a new version, the website keeps running the OLD code.
 * 8. Test: choose testSubmission in the function dropdown and click Run. Then check the "Responses"
 *    sheet and the TEST_EMAIL inbox. Logs are under View > Logs (or Executions).
 */

const SPREADSHEET_ID = ""; // e.g. "1AbC...xyz". Blank = use the active (bound) spreadsheet.
const SHEET_NAME = "Responses";
const TEST_EMAIL = "you@example.com"; // used only by testSubmission()
const UNIVERSITY_NAME = "St. Andrews College of Education, Oyo"; // keep in sync with src/config.js

// Column order in the sheet and in the email. "timestamp" is added by the server if missing.
const FIELDS = [
  ["timestamp", "Submitted at"],
  ["fullName", "Full name (surname first)"],
  ["nickname", "Nickname"],
  ["gender", "Gender"],
  ["birthday", "Birthday"],
  ["matricNo", "Matriculation / student number"],
  ["faculty", "Faculty"],
  ["department", "Department"],
  ["course", "Course of study"],
  ["entryYear", "Year of entry"],
  ["gradYear", "Year of graduation"],
  ["societyRole", "Student union or society role"],
  ["email", "Email address"],
  ["phone", "Phone / WhatsApp"],
  ["city", "Current city / state"],
  ["country", "Country"],
  ["employer", "Current employer / occupation"],
  ["jobTitle", "Job title"],
  ["qualification", "Highest qualification"],
  ["willingToMentor", "Willing to mentor / support projects"],
  ["consent", "Consent"],
];

const REQUIRED_FIELDS = ["fullName", "matricNo", "entryYear", "gradYear", "email", "phone", "city", "country"];
const MAX_LENGTH = 300;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NG_PHONE = /^(\+234|0)[789]\d{9}$/;

/* ---------- web app entry points ---------- */

function doGet() {
  return json_({ ok: true, message: "Alumni bio-data endpoint is running." });
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  return json_(processSubmission_(params));
}

/* ---------- core logic ---------- */

function processSubmission_(p) {
  const problems = validate_(p);
  if (problems.length) {
    return { ok: false, error: problems.join(" ") };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    console.error("Could not get script lock: " + err);
    return { ok: false, error: "The server is busy. Please try again in a moment." };
  }

  try {
    const sheet = getSheet_();
    const row = FIELDS.map(([key]) => {
      if (key === "timestamp") return cell_(p.timestamp || new Date().toISOString());
      return cell_(p[key]);
    });
    const target = sheet.getLastRow() + 1;
    const range = sheet.getRange(target, 1, 1, row.length);
    // Plain-text format: stops phone numbers losing their leading 0 and stops "=..." being read as a formula.
    range.setNumberFormat("@");
    range.setValues([row]);
  } catch (err) {
    console.error("Could not save row: " + err);
    return { ok: false, error: "We could not save your response. Please try again." };
  } finally {
    lock.releaseLock();
  }

  // The row is saved at this point. A mail failure must not undo or hide that.
  let emailed = false;
  try {
    sendConfirmation_(p.email, p);
    emailed = true;
  } catch (err) {
    console.error("Confirmation email failed: " + err);
  }

  return { ok: true, emailed: emailed };
}

function validate_(p) {
  const problems = [];

  if (p.consent !== "Yes") {
    problems.push("Consent is required.");
  }

  REQUIRED_FIELDS.forEach((key) => {
    if (!String(p[key] || "").trim()) {
      problems.push(labelOf_(key) + " is required.");
    }
  });

  FIELDS.forEach(([key]) => {
    if (String(p[key] || "").length > MAX_LENGTH) {
      problems.push(labelOf_(key) + " is too long.");
    }
  });

  const email = String(p.email || "").trim();
  if (email && !EMAIL_RE.test(email)) {
    problems.push("Email address is not valid.");
  }

  const phone = String(p.phone || "").replace(/[\s\-()]/g, "");
  if (phone && !NG_PHONE.test(phone)) {
    problems.push("Phone number is not a valid Nigerian number.");
  }

  return problems;
}

function labelOf_(key) {
  const found = FIELDS.find(([k]) => k === key);
  return found ? found[1] : key;
}

// Cell values are plain strings. Convert nulls and undefined to blanks.
function cell_(value) {
  return value === undefined || value === null ? "" : String(value);
}

/* ---------- spreadsheet ---------- */

function getSpreadsheet_() {
  const ss = SPREADSHEET_ID && SPREADSHEET_ID.trim()
    ? SpreadsheetApp.openById(SPREADSHEET_ID.trim())
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      "No spreadsheet found. Set SPREADSHEET_ID at the top of Code.gs to your Google Sheet's ID, " +
        "or open the script from the sheet (Extensions > Apps Script).",
    );
  }
  return ss;
}

function getSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    const headers = FIELDS.map(([, label]) => label);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ---------- confirmation email ---------- */

function sendConfirmation_(to, p) {
  const recipient = String(to || "").trim();
  if (!EMAIL_RE.test(recipient)) {
    throw new Error("No valid recipient address.");
  }

  const answers = FIELDS.filter(([key]) => key !== "timestamp").map(([key, label]) => [
    label,
    String(p[key] || "").trim() || "—",
  ]);

  const subject = "Your " + UNIVERSITY_NAME + " Alumni bio-data submission";
  const greeting = "Thank you for updating your alumni bio-data. Here is a copy of what you submitted.";

  const rows = answers
    .map(
      ([label, value]) =>
        '<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#475569;vertical-align:top;width:40%;">' +
        escapeHtml_(label) +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;vertical-align:top;">' +
        escapeHtml_(value) +
        "</td></tr>",
    )
    .join("");

  const htmlBody =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">' +
    '<h2 style="color:#0f2e5c;margin:0 0 8px;">' +
    escapeHtml_(UNIVERSITY_NAME) +
    " Alumni Network</h2>" +
    '<p style="margin:0 0 16px;">' +
    escapeHtml_(greeting) +
    "</p>" +
    '<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">' +
    rows +
    "</table>" +
    '<p style="color:#64748b;font-size:12px;margin-top:16px;">This is an automated message. Please do not reply to it.</p>' +
    "</div>";

  const textBody =
    UNIVERSITY_NAME +
    " Alumni Network\n\n" +
    greeting +
    "\n\n" +
    answers.map(([label, value]) => label + ": " + value).join("\n") +
    "\n\nThis is an automated message. Please do not reply to it.";

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody,
    name: UNIVERSITY_NAME + " Alumni Association",
  });
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- manual test (run from the editor) ---------- */

function testSubmission() {
  if (!TEST_EMAIL || TEST_EMAIL.indexOf("@") === -1 || TEST_EMAIL === "you@example.com") {
    throw new Error("Set TEST_EMAIL at the top of Code.gs to an address you can check.");
  }

  const sample = {
    timestamp: new Date().toISOString(),
    fullName: "Test Surname Firstname",
    nickname: "Test",
    gender: "Female",
    birthday: "14 March",
    matricNo: "TEST/2020/0001",
    faculty: "Faculty of Education",
    department: "English",
    course: "English Education",
    entryYear: "2016",
    gradYear: "2020",
    societyRole: "Class Rep",
    email: TEST_EMAIL,
    phone: "0803 123 4567",
    city: "Ibadan, Oyo State",
    country: "Nigeria",
    employer: "Test School",
    jobTitle: "Teacher",
    qualification: "B.Sc/B.A",
    willingToMentor: "Yes",
    consent: "Yes",
  };

  const result = processSubmission_(sample);
  Logger.log(JSON.stringify(result));
  return result;
}
