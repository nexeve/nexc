window.addEventListener('error', (e) => {
  fetch('http://localhost:9999', { method: 'POST', body: 'ERROR: ' + e.message + '\n' + e.error?.stack });
});
window.addEventListener('unhandledrejection', (e) => {
  fetch('http://localhost:9999', { method: 'POST', body: 'REJECTION: ' + e.reason });
});
