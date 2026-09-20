/**
 * VenueHub — Global Client Scripts v2.0
 * Toast auto-dismiss, scroll animations, stat counters
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Toast Auto-dismiss ──────────────────────────────
  const toasts = document.querySelectorAll('.toast-alert');
  toasts.forEach((toast, index) => {
    // Stagger entrance
    toast.style.animationDelay = `${index * 0.1}s`;

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.add('toast-exiting');
      setTimeout(() => toast.remove(), 300);
    }, 5000 + index * 500);
  });

  // ── Scroll Reveal Animations ────────────────────────
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.card-custom, .stat-card, .glass-surface').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(15px)';
    el.style.transition = 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)';
    observer.observe(el);
  });

  // ── Bootstrap Tooltips ──────────────────────────────
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));

  // ── Active Nav Highlight ────────────────────────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    if (item.getAttribute('href') === currentPath) {
      item.classList.add('active');
    }
  });
});
