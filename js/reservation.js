// Submissions stay disabled until the owner configures a form service.
document.querySelector('#email-form')?.addEventListener('submit', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
