/**
 * Client-side dynamic cost and duration calculator for booking form
 */

document.addEventListener('DOMContentLoaded', () => {
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const durationDisplay = document.getElementById('durationDisplay');
  const amountDisplay = document.getElementById('amountDisplay');
  const hourlyRateInput = document.getElementById('hourlyRate');

  if (!startTimeInput || !endTimeInput || !hourlyRateInput) return;

  const hourlyRate = parseFloat(hourlyRateInput.value) || 0;

  function timeToMins(tStr) {
    if (!tStr) return 0;
    const parts = tStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function updateEstimate() {
    const sMins = timeToMins(startTimeInput.value);
    const eMins = timeToMins(endTimeInput.value);

    if (eMins > sMins && sMins > 0) {
      const diffMins = eMins - sMins;
      const hours = (diffMins / 60).toFixed(1);
      const totalAmount = Math.round((diffMins / 60) * hourlyRate);

      if (durationDisplay) durationDisplay.textContent = `${hours} hrs`;
      if (amountDisplay) amountDisplay.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    } else {
      if (durationDisplay) durationDisplay.textContent = '0 hrs';
      if (amountDisplay) amountDisplay.textContent = '₹0';
    }
  }

  startTimeInput.addEventListener('change', updateEstimate);
  endTimeInput.addEventListener('change', updateEstimate);
  updateEstimate();
});
