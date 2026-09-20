/**
 * Chart.js initializers for Admin Analytics and Utilisation reports
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Revenue by Venue Chart
  const revenueCtx = document.getElementById('revenueByVenueChart');
  if (revenueCtx && window.revenueData) {
    new Chart(revenueCtx, {
      type: 'bar',
      data: {
        labels: window.revenueData.map((d) => d.venueName),
        datasets: [
          {
            label: 'Total Revenue (₹)',
            data: window.revenueData.map((d) => d.totalRevenue),
            backgroundColor: 'rgba(79, 70, 229, 0.8)',
            borderColor: '#4f46e5',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Revenue: ₹${context.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `₹${value.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }

  // 2. Venue Utilisation % Chart
  const utilisationCtx = document.getElementById('venueUtilisationChart');
  if (utilisationCtx && window.utilisationData) {
    new Chart(utilisationCtx, {
      type: 'bar',
      data: {
        labels: window.utilisationData.map((d) => d.venueName),
        datasets: [
          {
            label: 'Utilisation Rate (%)',
            data: window.utilisationData.map((d) => d.utilisationPercent),
            backgroundColor: window.utilisationData.map((d) => {
              if (d.utilisationPercent >= 70) return 'rgba(16, 185, 129, 0.85)';
              if (d.utilisationPercent >= 35) return 'rgba(14, 165, 233, 0.85)';
              return 'rgba(245, 158, 11, 0.85)';
            }),
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Utilisation: ${context.raw}%`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      }
    });
  }
});
