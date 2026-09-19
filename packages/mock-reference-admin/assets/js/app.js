/* BlueGofer — minimal vanilla JS (no framework, no backend) */
(function () {
  'use strict';

  // --- Sidebar toggle (mobile) ---
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.overlay');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
  document.querySelectorAll('[data-close-sidebar]').forEach(el => {
    el.addEventListener('click', () => sidebar && sidebar.classList.remove('open'));
  });
  if (overlay) overlay.addEventListener('click', () => sidebar && sidebar.classList.remove('open'));

  // --- Toast on data-toast ---
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  let toastT;
  function showToast(msg) {
    toast.textContent = msg || 'Done';
    toast.style.display = 'block';
    clearTimeout(toastT);
    toastT = setTimeout(() => { toast.style.display = 'none'; }, 2200);
  }
  document.querySelectorAll('[data-toast]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      showToast(el.getAttribute('data-toast'));
    });
  });

  // --- Tabs (data-tab-group) ---
  document.querySelectorAll('[data-tab-group]').forEach(group => {
    const tabs = group.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  });

  // --- Modal open/close ---
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-modal');
      const m = document.getElementById(id);
      if (m) m.classList.add('open');
    });
  });
  document.querySelectorAll('[data-close-modal], .modal-bg').forEach(el => {
    el.addEventListener('click', e => {
      // close only when the background itself is the click target, or explicit close clicked
      if (el.hasAttribute('data-close-modal') || e.target === el) {
        const m = el.closest('.modal-bg');
        if (m) m.classList.remove('open');
      }
    });
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => e.stopPropagation());
  });

  // --- Payment method pick (used in admin POS) ---
  document.querySelectorAll('.pay-method').forEach(pm => {
    pm.addEventListener('click', () => {
      document.querySelectorAll('.pay-method').forEach(p => p.classList.remove('on'));
      pm.classList.add('on');
    });
  });

  // --- Quantity stepper (used in admin POS) ---
  document.querySelectorAll('.qty').forEach(q => {
    const input = q.querySelector('input');
    q.querySelector('.q-minus').addEventListener('click', () => {
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
    });
    q.querySelector('.q-plus').addEventListener('click', () => {
      input.value = (parseInt(input.value, 10) || 1) + 1;
    });
  });

  console.log('%cBlueGofer Admin Mockup%c · TDD v2.0 + Appendix A · SkyBlue theme', 'color:#0284c7;font-weight:700;font-size:14px', 'color:#475569');
})();