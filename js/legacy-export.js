function readLegacyDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SyeteDosCafeDB");
    request.onerror = () => reject(request.error || new Error("Could not read the local menu database."));
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("products")) {
        database.close();
        resolve([]);
        return;
      }
      const transaction = database.transaction("products", "readonly");
      const read = transaction.objectStore("products").getAll();
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error || new Error("Could not read local menu items."));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Could not finish reading local menu items."));
      };
    };
  });
}

document.getElementById("exportLegacyData").addEventListener("click", async () => {
  const status = document.getElementById("exportStatus");
  const button = document.getElementById("exportLegacyData");
  button.disabled = true;
  status.className = "small mt-3 mb-0 text-muted";
  status.textContent = "Reading this browser’s local data...";

  try {
    const products = await readLegacyDatabase();
    const sales = JSON.parse(localStorage.getItem("cafe_sales") || "[]");
    if (!Array.isArray(sales)) throw new Error("Local sales data is not a valid list.");
    if (!products.length && !sales.length) {
      throw new Error("No local menu or sales were found in this browser.");
    }
    const backup = {
      format: "syete-dos-cafe-local-export-v1",
      exportedAt: new Date().toISOString(),
      products,
      sales
    };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    }));
    link.download = `syete-dos-cafe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    status.classList.add("text-success");
    status.textContent = `Backup downloaded: ${products.length} menu items and ${sales.length} sales.`;
  } catch (error) {
    console.error("Could not export local cafe data:", error);
    status.classList.add("text-danger");
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
