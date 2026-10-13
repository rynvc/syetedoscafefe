document.getElementById("importLegacyData").addEventListener("click", async event => {
  const input = document.getElementById("legacyBackup");
  const status = document.getElementById("importStatus");
  const button = event.currentTarget;
  const file = input.files[0];
  if (!file) {
    status.className = "small mt-3 mb-0 text-danger";
    status.textContent = "Choose a backup file first.";
    return;
  }

  button.disabled = true;
  status.className = "small mt-3 mb-0 text-muted";
  status.textContent = "Importing menu and sales. Keep this page open...";
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format !== "syete-dos-cafe-local-export-v1") {
      throw new Error("This backup format is not recognized.");
    }
    const result = await importLegacyData(payload, message => {
      status.textContent = message;
    });
    status.className = "small mt-3 mb-0 text-success";
    status.textContent = `Import complete: ${result.importedProducts} menu items and ${result.importedSales} sales processed.`;
  } catch (error) {
    console.error("Could not import cafe data:", error);
    status.className = "small mt-3 mb-0 text-danger";
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
