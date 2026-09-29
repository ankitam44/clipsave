// ---------------------------------------------------------------------------
// Wire this up to your Google Form before launch:
// 1. Create a Google Form with one short-answer question ("Email").
// 2. Open it, click the three-dot menu > "Get pre-filled link", fill in the
//    Email question with anything, and click "Get link". The URL it gives you
//    contains "entry.123456789=..." — that number is GOOGLE_FORM_EMAIL_ENTRY.
// 3. Take the form's normal edit/view URL and swap the trailing "/viewform"
//    for "/formResponse" — that's GOOGLE_FORM_ACTION_URL.
// Until both are set, submissions are accepted locally (success state shows)
// but nothing is recorded anywhere — a console warning says so.
// ---------------------------------------------------------------------------
const GOOGLE_FORM_ACTION_URL = 'REPLACE_WITH_YOUR_GOOGLE_FORM_FORMRESPONSE_URL';
const GOOGLE_FORM_EMAIL_ENTRY = 'REPLACE_WITH_YOUR_EMAIL_ENTRY_ID';

function looksLikeEmail(value) {
  const at = value.indexOf('@');
  const dot = value.indexOf('.', at + 1);
  return at > 0 && dot > at + 1 && dot < value.length - 1;
}

function isConfigured() {
  return (
    !GOOGLE_FORM_ACTION_URL.startsWith('REPLACE_WITH') &&
    !GOOGLE_FORM_EMAIL_ENTRY.startsWith('REPLACE_WITH')
  );
}

async function submitToGoogleForm(email) {
  if (!isConfigured()) {
    console.warn(
      '[Swipefile waitlist] Google Form not configured yet — see the comment at the top of script.js. Showing success locally without recording the email.'
    );
    return;
  }
  const body = new URLSearchParams();
  body.set(GOOGLE_FORM_EMAIL_ENTRY, email);
  // Google Forms' formResponse endpoint doesn't send CORS headers, so the
  // response is opaque under no-cors — a resolved fetch is the only signal
  // we get, and it's what every Google Form JS-submission approach relies on.
  await fetch(GOOGLE_FORM_ACTION_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

function initWaitlistForm(form) {
  const input = form.querySelector('input[type="email"]');
  const errorEl = form.querySelector('[data-form-error]');
  const successEl = form.parentElement.querySelector('[data-waitlist-success]');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value.trim();

    if (!looksLikeEmail(value)) {
      errorEl.textContent = "That doesn't look like an email.";
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;

    submitBtn.disabled = true;
    try {
      await submitToGoogleForm(value);
      form.hidden = true;
      successEl.hidden = false;
    } catch (err) {
      console.error('[Swipefile waitlist] submission failed', err);
      errorEl.textContent = 'Something went wrong. Try again in a moment.';
      errorEl.hidden = false;
      submitBtn.disabled = false;
    }
  });
}

document.querySelectorAll('[data-waitlist-form]').forEach(initWaitlistForm);
