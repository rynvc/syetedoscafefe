(() => {
  const chartCanvas = document.getElementById("analyticsChart");
  const ranges = { today: 1, week: 7, month: 0 };
  let sales = [];
  let chart;
  let activeRange = "week";

  function dayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function rangeData(key) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), key === "month" ? 1 : now.getDate() - ranges[key] + 1);
    const rangeSales = sales.filter(sale => {
      const date = new Date(sale.createdAt);
      return !Number.isNaN(date.getTime()) && date >= start && date <= now;
    });
    const labels = [];
    const revenue = [];
    const orders = [];
    const itemsSold = [];

    for (const date = new Date(start); date <= now; date.setDate(date.getDate() + 1)) {
      const keyForDate = dayKey(date);
      const dailySales = rangeSales.filter(sale => dayKey(new Date(sale.createdAt)) === keyForDate);
      labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      revenue.push(dailySales.reduce((sum, sale) => sum + Math.round(getSaleRevenue(sale) * 100), 0) / 100);
      orders.push(dailySales.length);
      itemsSold.push(dailySales.reduce((sum, sale) =>
        sum + (Array.isArray(sale.items) ? sale.items.reduce((quantity, item) => quantity + Math.max(0, Number(item.quantity) || 0), 0) : 0), 0));
    }

    return { labels, revenue, orders, itemsSold, sales: rangeSales };
  }

  function renderRange(key = activeRange) {
    activeRange = key;
    const data = rangeData(key);
    const revenueCents = data.revenue.reduce((sum, amount) => sum + Math.round(amount * 100), 0);
    const orderCount = data.sales.length;
    const itemCount = data.itemsSold.reduce((sum, quantity) => sum + quantity, 0);
    const money = value => `₱${(value / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    document.getElementById("analyticsRevenue").textContent = money(revenueCents);
    document.getElementById("analyticsOrders").textContent = orderCount.toLocaleString();
    document.getElementById("analyticsItemsSold").textContent = itemCount.toLocaleString();
    document.getElementById("analyticsAverageOrder").textContent = money(orderCount ? Math.round(revenueCents / orderCount) : 0);
    document.getElementById("analyticsRevenueNote").textContent =
      `${orderCount} completed sale${orderCount === 1 ? "" : "s"} in this period`;

    const categoryRevenue = new Map();
    const productRevenue = new Map();
    data.sales.forEach(sale => (sale.items || []).forEach(item => {
      const quantity = Number(item.quantity);
      const price = Number(item.price);
      if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) return;

      const itemRevenueCents = Math.round(price * 100) * quantity;
      const category = item.category || "Other";
      categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + itemRevenueCents);
      productRevenue.set(item.name, (productRevenue.get(item.name) || 0) + itemRevenueCents);
    }));
    document.getElementById("categorySalesList").innerHTML = categoryRevenue.size
      ? [...categoryRevenue.entries()].sort((left, right) => right[1] - left[1]).map(([name, amount]) =>
        `<div><span>${escapeHTML(name)}</span><strong>${money(amount)} <small>${revenueCents ? Math.round(amount / revenueCents * 100) : 0}%</small></strong></div>`
      ).join("")
      : '<p class="text-muted small mb-0">No sales in this period.</p>';

    const topProducts = [...productRevenue.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5);
    const highestRevenue = topProducts[0]?.[1] || 0;
    document.getElementById("topProductList").innerHTML = topProducts.length
      ? topProducts.map(([name, amount]) =>
        `<li><span>${escapeHTML(name)}</span><strong>${money(amount)}</strong><div><i style="width:${highestRevenue ? amount / highestRevenue * 100 : 0}%"></i></div></li>`
      ).join("")
      : '<li class="text-muted">No sales in this period.</li>';

    if (chart) {
      chart.data.labels = data.labels;
      chart.data.datasets[0].data = data.revenue;
      chart.update();
    }
  }

  async function refreshSales() {
    try {
      sales = await getSales();
      renderRange();
    } catch (error) {
      console.error("Could not load sales analytics:", error);
      document.getElementById("analyticsRevenueNote").textContent = error.message;
    }
  }

  if (chartCanvas && window.Chart) {
    window.Chart.getChart(chartCanvas)?.destroy();
    chart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Revenue", data: [], borderColor: "#4a3426", backgroundColor: "rgba(74,52,38,.10)", fill: true, tension: .35, pointRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "#efe6da" }, ticks: { callback: value => `₱${value.toLocaleString()}` } }
        }
      }
    });
  }

  document.querySelectorAll("[data-range]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-range]").forEach(option => {
        option.classList.toggle("active", option === button);
        option.classList.toggle("btn-primary", option === button);
        option.classList.toggle("btn-outline-primary", option !== button);
      });
      renderRange(button.dataset.range);
    });
  });

  document.getElementById("exportAnalytics").addEventListener("click", () => {
    const data = rangeData(activeRange);
    const rows = [["Date", "Revenue", "Completed Sales", "Items Sold"]];
    data.labels.forEach((label, index) =>
      rows.push([label, data.revenue[index].toFixed(2), data.orders[index], data.itemsSold[index]]));
    const file = new Blob([rows.map(row => row.join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "sales-revenue-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  window.addEventListener("sale:updated", refreshSales);
  refreshSales();
})();
