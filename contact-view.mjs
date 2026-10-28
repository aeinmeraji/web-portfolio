// Contact details and service choices have one source of truth for the generated page.
import { renderNavigationLinks } from './navigation-view.mjs';
export const contact = {
  email: 'aeinmeraji2007@gmail.com',
  socialLinks: [
    { label: 'Instagram', href: 'https://www.instagram.com/aeinmeraji/', icon: 'instagram' },
    { label: 'Telegram', href: 'https://t.me/aeinmeraji', icon: 'telegram' },
  ],
  services: ['Web Design', 'Front-End Development', 'UI/UX Strategy', 'Other / Let’s discuss'],
};

const iconPaths = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor"/>',
  telegram: '<path d="m3 11 18-7-4 16-6-5-4 3 1-6 10-6-8 8z"/>',
};
const socialLink = ({ label, href, icon }) => `<a class="contact-social" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label} (opens in a new tab)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[icon]}</svg><span>${label}</span><span aria-hidden="true">↗</span></a>`;

export function renderHeroSocialRail() {
  return `<nav class="hero-social-rail" aria-label="Social profiles">${contact.socialLinks.map(({label, href, icon}) => `<a class="hero-social-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label} (opens in a new tab)" title="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[icon]}</svg></a>`).join('')}</nav>`;
}

export function renderContact() {
  return `<section id="contact" tabindex="-1" class="contact-section" aria-labelledby="contact-heading" data-name="04 / Contact">
    <div class="contact-intro">
      <p class="section-eyebrow"><span aria-hidden="true"></span> CONTACT</p>
      <h2 id="contact-heading">Let’s Work<br>Together</h2>
      <p class="contact-description">Have a project in mind or just want to say hi?<br>I’d love to hear from you. Let’s create something great together.</p>
      <a class="contact-email" href="mailto:${contact.email}">${contact.email} <span aria-hidden="true">↗</span></a>
      <p class="contact-location">Mashhad, Iran <span><i aria-hidden="true"></i> Available for remote work</span></p>
      <div class="contact-connect"><p>Find me online</p><div class="contact-socials">${contact.socialLinks.map(socialLink).join('')}<button type="button" class="contact-social contact-phone" data-phone-trigger aria-haspopup="dialog" aria-controls="phone-panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3-1 4C10 22 2 14 3 4z"/></svg><span data-i18n="phone.title">Call me</span></button></div></div>
      <div class="contact-art" aria-hidden="true"><img src="./assets/contact-sage.svg" alt="" data-name="Contact Shape 1"><img src="./assets/contact-teal.svg" alt="" data-name="Contact Shape 2"></div>
    </div>
    <form id="contact-form" class="contact-form" action="https://formsubmit.co/${contact.email}" data-ajax-action="https://formsubmit.co/ajax/${contact.email}" method="post" aria-label="Project enquiry" aria-describedby="contact-privacy">
      <input type="hidden" name="_subject" value="New project enquiry — Aein Meraji portfolio">
      <input type="hidden" name="_template" value="table">
      <div class="contact-honeypot" aria-hidden="true"><label for="contact-website">Leave this field empty</label><input id="contact-website" type="text" name="_honey" tabindex="-1" autocomplete="off"></div>
      <div class="contact-fields">
        <div class="contact-field"><label for="contact-name">Name <span aria-hidden="true">*</span></label><input id="contact-name" name="name" type="text" autocomplete="name" placeholder="Your name" required maxlength="100" dir="auto"></div>
        <div class="contact-field"><label for="contact-email">Email <span aria-hidden="true">*</span></label><input id="contact-email" name="email" type="email" autocomplete="email" placeholder="your@email.com" required maxlength="254" inputmode="email"></div>
        <div class="contact-field contact-field-wide"><label for="contact-service">Project type <span aria-hidden="true">*</span></label><select id="contact-service" name="project_type" required><option value="" disabled selected>Select a service</option>${contact.services.map(service => `<option value="${service}">${service}</option>`).join('')}</select></div>
        <div class="contact-field contact-field-wide"><label for="contact-message">Message <span aria-hidden="true">*</span></label><textarea id="contact-message" name="message" rows="5" placeholder="Tell me about your project…" required minlength="10" maxlength="5000" dir="auto" data-lenis-prevent></textarea></div>
      </div>
      <button class="contact-submit" type="submit"><span data-submit-label>Send Message</span><span aria-hidden="true">→</span></button>
      <p id="contact-status" class="contact-status" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"></p>
      <p id="contact-privacy" class="contact-privacy">Your details are used to reply to your enquiry. This form sends via FormSubmit. Prefer email? <a href="mailto:${contact.email}">Write to me directly</a>.</p>
      <noscript><p class="contact-privacy">Submitting will open FormSubmit to complete your request.</p></noscript>
    </form>
  </section>`;
}

export function renderFooter() {
  return `<footer class="site-footer" aria-label="Site footer"><a class="footer-brand" href="#home" aria-label="Aein Meraji — back to home"><img src="./assets/bb77b.png" alt="" width="58" height="29"><span><strong>Aein Meraji</strong><small>Web Developer</small></span></a><nav aria-label="Footer navigation">${renderNavigationLinks()}</nav><p>© ${new Date().getFullYear()} Aein Meraji<br>All rights reserved.</p></footer>`;
}
