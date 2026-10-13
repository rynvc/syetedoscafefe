(() => {
  const currency = value => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dayKey = date => {
    const localDate = new Date(date);
    return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
  };

  async function renderDashboard() {
    const sales = await getSales();
    const today = new Date();
    const todayKey = dayKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dayKey(yesterday);
    const salesToday = sales.filter(sale => dayKey(sale.createdAt) === todayKey);
    const salesYesterday = sales.filter(sale => dayKey(sale.createdAt) === yesterdayKey);
    const revenue = salesToday.reduce((total, sale) => total + Math.round(getSaleRevenue(sale) * 100), 0) / 100;
    const yesterdayRevenue = salesYesterday.reduce((total, sale) => total + Math.round(getSaleRevenue(sale) * 100), 0) / 100;
    document.getElementById("todaySales").textContent = currency(revenue);
    document.getElementById("yesterdaySales").textContent = currency(yesterdayRevenue);
    document.getElementById("todaySalesCount").textContent = salesToday.length.toLocaleString();

    const labels = [];
    const revenueByDay = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = dayKey(date);
      const dailySales = sales.filter(sale => dayKey(sale.createdAt) === key);
      labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      revenueByDay.push(dailySales.reduce((sum, sale) => sum + Math.round(getSaleRevenue(sale) * 100), 0) / 100);
    }

    const canvas = document.getElementById("salesChart");
    if (!canvas || !window.Chart) return;
    window.Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Revenue", data: revenueByDay, borderColor: "#4a3426", backgroundColor: "rgba(74,52,38,.10)", fill: true, tension: .35, pointRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 9, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: "#efe6da" }, ticks: { font: { size: 11 }, callback: value => `₱${value}` } }
        }
      }
    });
  }

  (() => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const title = document.getElementById("greetingTitle");
    const date = document.getElementById("greetingDate");
    if (title) title.textContent = `${greeting}!`;
    if (date) date.textContent = `${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} — Here's your cafe overview.`;
  })();

  renderDashboard().catch(error => {
    console.error("Could not load dashboard:", error);
    const sales = document.getElementById("todaySales");
    if (sales) sales.textContent = "Unavailable";
  });
  window.addEventListener("sale:updated", () => renderDashboard().catch(console.error));
})();
