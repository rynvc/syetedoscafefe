(() => {
  const tableBody = document.getElementById("catalogTableBody");
  const search = document.getElementById("catalogSearch");
  const category = document.getElementById("catalogCategory");
  const resultCount = document.getElementById("catalogResultCount");
  const productCount = document.getElementById("catalogProductCount");

  function filterRows() {
    if (!tableBody) return;
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value.toLowerCase();
    const rows = [...tableBody.rows];
    let visible = 0;

    rows.forEach(row => {
      const cells = [...row.cells].map(cell => cell.textContent.toLowerCase());
      const matches = cells.join(" ").includes(query) &&
        (!selectedCategory || cells[1] === selectedCategory);
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    resultCount.textContent = `${visible} result${visible === 1 ? "" : "s"}`;
    productCount.textContent = `${rows.length} items total`;
  }

  search.addEventListener("input", filterRows);
  category.addEventListener("change", filterRows);
  new MutationObserver(filterRows).observe(tableBody, { childList: true });
  filterRows();

  const form = document.getElementById("addProductForm");
  const modalElement = document.getElementById("addProductModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  const modalTitle = document.getElementById("addProductTitle");

  tableBody.addEventListener("click", async event => {
    const button = event.target.closest("[data-product-action]");
    if (!button) return;
    const productId = Number(button.closest("[data-product-id]").dataset.productId);

    if (button.dataset.productAction === "delete") {
      if (!window.confirm("Delete this item from the menu?")) return;
      try {
        await deleteProduct(productId);
        await loadMenuData();
      } catch (error) {
        console.error("Could not delete product:", error);
        window.alert("The product could not be deleted. Please try again.");
      }
      return;
    }

    const product = (await getProducts()).find(item => item.product_id === productId);
    if (!product) return;
    form.dataset.productId = String(productId);
    for (const [name, value] of Object.entries(product)) {
      if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value ?? "";
    }
    modalTitle.textContent = "Edit Product";
    modal.show();
  });

  modalElement.addEventListener("hidden.bs.modal", () => {
    form.reset();
    delete form.dataset.productId;
    modalTitle.textContent = "Add Menu Item";
  });

  document.getElementById("addProductForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const product = {
      name: fields.get("name").trim(),
      category_name: fields.get("category_name").trim(),
      price: Number(fields.get("price")),
      supplier: fields.get("supplier").trim()
    };

    try {
      if (form.dataset.productId) product.product_id = Number(form.dataset.productId);
      await saveProduct(product);
      modal.hide();
      await loadMenuData();
    } catch (error) {
      console.error("Could not save menu item:", error);
      window.alert("The product could not be saved. Please try again.");
    }
  });
})();
