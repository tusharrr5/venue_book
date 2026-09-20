/**
 * Chart.js initializers for Admin Analytics and Utilisation reports
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if we are in the admin dark theme
  const isDark = window.isDarkTheme === true;
  
  // Set default colors based on theme
  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.85)' : 'rgba(79, 70, 229, 0.8)',
            borderColor: isDark ? 'rgba(99, 102, 241, 1)' : '#4f46e5',
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
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => `Revenue: ₹${context.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              callback: (value) => `₹${value.toLocaleString('en-IN')}`
            }
          },
          x: {
            grid: { display: false },
            border: { display: false }
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
            borderColor: 'rgba(255,255,255,0.1)',
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
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => `Utilisation: ${context.raw}%`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              callback: (value) => `${value}%`
            }
          },
          y: {
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
  }
});
