// "Copy email" button with a text-selection fallback when the clipboard API is refused.
export function initCopy() {
  const btn = document.getElementById('copy');
  const mail = document.getElementById('mail');
  if (!btn || !mail) return;

  const reset = () => setTimeout(() => (btn.textContent = 'Copy email'), 1800);
  const done = () => { btn.textContent = 'Copied'; reset(); };
  const fallback = () => {
    const range = document.createRange();
    range.selectNodeContents(mail);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    btn.textContent = 'Press copy';
    reset();
  };

  btn.addEventListener('click', () => {
    try {
      navigator.clipboard.writeText(mail.textContent).then(done, fallback);
    } catch {
      fallback();
    }
  });
}
