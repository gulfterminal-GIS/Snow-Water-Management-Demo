window.App = window.App || {};

App.icons = {
  _svg(body) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  },

  basin() {
    return this._svg('<path stroke-dasharray="3.2 2.2" d="M6 5.5h12l3.2 6.5L18 18.5H6L2.8 12 6 5.5z"/>');
  },
  watershed() {
    return this._svg('<path fill="currentColor" fill-opacity="0.18" d="M5 7.2l4.2-2.7 5.6 1.6 4.2-1.1v10.8l-4.8 2.7-5.2-1.8-4 1.1V7.2z"/>');
  },
  river() {
    return this._svg('<path d="M3 16.5c2.2-4.5 3.2 3.8 6.2 0 3-3.8 3.4 3.8 6.2 0 2.2-3 3.4 2.2 5.6 0"/><path d="M3 12c2.2-4.5 3.2 3.8 6.2 0 3-3.8 3.4 3.8 6.2 0 2.2-3 3.4 2.2 5.6 0"/>');
  },
  reservoir() {
    return this._svg('<path d="M5 11.2c1.4-4.4 3.8-6.7 7-6.7s5.6 2.3 7 6.7"/><ellipse cx="12" cy="14.2" rx="8" ry="4.4" fill="currentColor" fill-opacity="0.2"/>');
  },
  dam() {
    return this._svg('<path d="M4 19V9.2L12 5l8 4.2V19"/><path d="M4 13.5h16"/><path d="M8 19v-5.5M12 19v-5.5M16 19v-5.5"/>');
  },
  gauge() {
    return this._svg('<rect x="9" y="3" width="6" height="14.5" rx="1.2"/><path d="M9 7h6M9 10.5h6M9 14h4"/><path d="M12 17.5v2.2"/><circle cx="12" cy="20.4" r="1.4" fill="currentColor"/>');
  },
  sensor() {
    return this._svg('<circle cx="12" cy="7.2" r="3"/><path d="M12 10.2v6.2"/><path d="M8.2 16.5c1.1 1.6 2.4 2.3 3.8 2.3s2.7-.7 3.8-2.3"/><path d="M6.8 19.2c1.5 1.8 3.3 2.5 5.2 2.5s3.7-.7 5.2-2.5"/>');
  },
  note() {
    return this._svg('<path fill="currentColor" fill-opacity="0.18" d="M12 21s6.5-5.8 6.5-10.2a6.5 6.5 0 10-13 0C5.5 15.2 12 21 12 21z"/><circle cx="12" cy="10.6" r="2.2"/>');
  },
  terrain() {
    return this._svg('<path fill="currentColor" fill-opacity="0.18" d="M3 19l6.2-9.2 3.6 5.1 2.2-3.2L21 19H3z"/><path d="M13.2 12.2l2.4-3.4 5.4 10.2"/>');
  },
  diversion() {
    return this._svg('<path d="M4 12h7M13 12h7"/><circle cx="12" cy="12" r="2.2"/><path d="M8 9.2L4 12l4 2.8M16 9.2L20 12l-4 2.8"/>');
  },
  snow() {
    return this._svg('<path d="M12 3v18M5.6 6.6l12.8 10.8M5.6 17.4L18.4 6.6"/><path d="M12 3l2.1 2.1M12 3L9.9 5.1M12 21l2.1-2.1M12 21l-2.1-2.1M5.6 6.6l2.8.3M5.6 6.6l.4 2.7M18.4 17.4l-2.8-.3M18.4 17.4l-.4-2.7M5.6 17.4l2.8-.3M5.6 17.4l.4-2.7M18.4 6.6l-2.8.3M18.4 6.6l-.4 2.7"/>');
  },
  breakpoint() {
    return this._svg('<path d="M12 4v16"/><path d="M6 10l6-4 6 4M6 14l6 4 6-4"/>');
  }
};

App.icons.mount = function () {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (typeof App.icons[name] === 'function') el.innerHTML = App.icons[name]();
  });
};
