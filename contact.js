import { t } from './i18n.js';

// A native modal keeps focus inside the phone panel and restores it on close.
const phonePanel = document.createElement('dialog');
phonePanel.className = 'phone-panel';
phonePanel.setAttribute('aria-labelledby', 'phone-panel-title');
document.body.append(phonePanel);
const contactTriggers = document.querySelectorAll('[data-node-id="1:30"], [data-phone-trigger]');
for (const trigger of contactTriggers) {
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'phone-panel');
}
phonePanel.id = 'phone-panel';
const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>';
const callIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3-1 4C10 22 2 14 3 4z"/></svg>';
let copyAttempt = 0;
for (const contactTrigger of contactTriggers) contactTrigger.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  if (phonePanel.open) return;
  phonePanel.innerHTML = `<button type="button" class="phone-close" aria-label="${t('phone.close')}" autofocus><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2 id="phone-panel-title">${t('phone.title')}</h2><div class="phone-panel-bar"><a class="phone-number" href="tel:+989158806772" dir="ltr">09158806772</a><button type="button" class="phone-copy">${copyIcon}<span>${t('phone.copy')}</span></button><a class="phone-call" href="tel:+989158806772">${callIcon}<span>${t('phone.call')}</span></a></div><p class="phone-copy-status" role="status" aria-live="polite"></p>`;
  phonePanel.querySelector('.phone-close').addEventListener('click', () => phonePanel.close());
  phonePanel.querySelector('.phone-copy').addEventListener('click', async () => {
    const attempt = ++copyAttempt;
    const status = phonePanel.querySelector('.phone-copy-status');
    try {
      await navigator.clipboard.writeText('09158806772');
      if (attempt === copyAttempt && phonePanel.open) status.textContent = t('phone.copied');
    } catch {
      if (attempt !== copyAttempt || !phonePanel.open) return;
      status.textContent = t('phone.failed');
      const range = document.createRange();
      range.selectNodeContents(phonePanel.querySelector('.phone-number'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
  phonePanel.showModal();
}, {capture: true});
phonePanel.addEventListener('close', () => { copyAttempt++; });
phonePanel.addEventListener('click', event => {
  const rect = phonePanel.getBoundingClientRect();
  if (event.target === phonePanel && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) phonePanel.close();
});
phonePanel.addEventListener('wheel', event => event.preventDefault(), {passive: false});

const form = document.getElementById('contact-form');
const status = document.getElementById('contact-status');
const submitButton = form.querySelector('[type="submit"]');
const submitLabel = form.querySelector('[data-submit-label]');
let submitting = false;

function announce(key, state) {
  if (key) status.dataset.i18n = key;
  else delete status.dataset.i18n;
  status.textContent = key ? t(key) : '';
  status.dataset.state = state;
}

function updateSubmitLabel(key) {
  submitLabel.dataset.i18n = key;
  submitLabel.textContent = t(key);
}

// Trim before browser validation so whitespace-only enquiries cannot be submitted.
function validateFields() {
  for (const field of form.querySelectorAll('[required]')) {
    if (field.tagName !== 'SELECT') field.value = field.value.trim();
    field.setCustomValidity('');
    let error = '';
    if (!field.value) error = 'form.required';
    else if (field.validity.typeMismatch) error = 'form.invalidEmail';
    else if (field.name === 'message' && field.value.length < 10) error = 'form.short';
    else if (field.maxLength > 0 && field.value.length > field.maxLength) error = 'form.long';
    if (error) field.setCustomValidity(t(error));
  }
  return form.reportValidity();
}

// Retain native validation and normal POST submission when JavaScript is unavailable.
form.noValidate = true;
form.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  if (status.dataset.state === 'success') announce('', 'idle');
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !validateFields()) return;
  if (form.elements.namedItem('_honey').value) return;

  submitting = true;
  submitButton.disabled = true;
  updateSubmitLabel('form.sending');
  form.setAttribute('aria-busy', 'true');
  announce('form.pending', 'pending');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(form.dataset.ajaxAction, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || ![true, 'true'].includes(result.success)) throw new Error('Submission rejected');

    // An unactivated inbox must never be presented as a delivered message.
    if (/activat|confirm.*email|verify.*email/i.test(result.message || '')) {
      announce('form.activation', 'error');
    } else {
      form.reset();
      announce('form.success', 'success');
    }
  } catch (error) {
    announce(error.name === 'AbortError'
      ? 'form.timeout'
      : 'form.error', 'error');
  } finally {
    clearTimeout(timeout);
    submitting = false;
    submitButton.disabled = false;
    updateSubmitLabel('form.send');
    form.removeAttribute('aria-busy');
    status.focus({ preventScroll: true });
  }
});
