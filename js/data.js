/*
  Syete Dos Cafe menu.
  - Food/drink prices come from the printed menu.
  - Coffee has separate Hot and Iced prices, so each size becomes its own item.
*/
const menuSeed = [
  { category: "Meals", items: [
    ["Shanghai (Fish)", 99], ["Shanghai (Pork)", 99], ["Hungarian", 99], ["Chicken BBQ", 109],
    ["Tocino", 109], ["Fish Fillet", 109], ["Tapa", 114], ["Chicken Ala King", 124], ["Bacon", 129]
  ]},
  { category: "Pasta", items: [
    ["Bolognese", 109], ["Carbonara", 119], ["Tuna", 119]
  ]},
  { category: "Snacks", items: [
    ["Fries", 44], ["Nachos", 44], ["Chicken Poppers", 69], ["Loaded Fries", 89],
    ["Loaded Nachos", 89], ["Fish N' Chips", 109]
  ]},
  { category: "Food Add-Ons", items: [
    ["Rice", 15], ["Egg", 15], ["Cheese Sauce", 25], ["Garlic Bread (2 pcs)", 18], ["Bottled Water", 15]
  ]},
  // [name, hot price, iced price]; null = not offered
  { category: "Coffee", sizes: true, items: [
    ["Americano", 69, 69], ["Latte", 89, 89], ["Spanish Latte", 89, 99], ["Sea Salt Latte", null, 99],
    ["Salted Caramel", 89, 99], ["Hazelnut", null, 99], ["Vanilla", 89, 99], ["Vanilla Brulee", null, 124],
    ["Mocha", 89, 109], ["White Choco", 89, 109], ["Caramel Macchiato", null, 124],
    ["Dirty Matcha", null, 149], ["Biscoff", null, 149]
  ]},
  { category: "Frappe", suffix: " Frappe", items: [
    ["Cookies and Cream", 89], ["Taro", 89], ["Mango", 89], ["Strawberry", 89], ["Dark Choco", 89],
    ["Java Chip", 89], ["Matcha", 99], ["Caramel", 109]
  ]},
  { category: "Non Coffee", suffix: " (Non-Coffee)", items: [
    ["Ube", 89], ["Oreo", 89], ["Strawberry", 89], ["Strawberry Choco", 89], ["Nutella", 89],
    ["Oreo Matcha", 119], ["Matcha", 124], ["Biscoff", 134]
  ]},
  { category: "Fruity Soda", suffix: " Fruity Soda", items: [
    ["Strawberry", 49], ["Blueberry", 49], ["Lychee", 49], ["Watermelon", 49],
    ["Green Apple", 49], ["Blue Lemonade", 49]
  ]},
  { category: "Drink Add-Ons", items: [
    ["Espresso Shot", 25], ["Milk", 15], ["Whipped Cream", 15], ["Biscoff Crumbs", 15],
    ["Oreo Crumbs", 15], ["Nata", 15]
  ]}
];

const defaultProducts = (() => {
  const products = [];
  const add = (name, category, price) => products.push({
    name,
    category_name: category,
    price,
    supplier: "In-house"
  });
  menuSeed.forEach(group => {
    group.items.forEach(item => {
      if (group.sizes) {
        if (item[1] != null) add(`${item[0]} (Hot)`, group.category, item[1]);
        if (item[2] != null) add(`${item[0]} (Iced)`, group.category, item[2]);
      } else {
        add(`${item[0]}${group.suffix || ""}`, group.category, item[1]);
      }
    });
  });
  return products;
})();

const LOCAL_DB_NAME = "SyeteDosCafeDB";

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB_NAME);
    request.onupgradeneeded = event => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains("products")) {
        database.createObjectStore("products", { keyPath: "product_id", autoIncrement: true });
      }
    };
    request.onerror = () => reject(request.error || new Error("Could not open the local menu."));
    request.onsuccess = () => {
      const database = request.result;
      const readTransaction = database.transaction("products", "readonly");
      const read = readTransaction.objectStore("products").count();
      read.onsuccess = () => {
        if (read.result > 0) {
          resolve(database);
          return;
        }
        const seedTransaction = database.transaction("products", "readwrite");
        defaultProducts.forEach(product => seedTransaction.objectStore("products").add(product));
        seedTransaction.oncomplete = () => resolve(database);
        seedTransaction.onerror = () => {
          database.close();
          reject(seedTransaction.error || new Error("Could not initialize the local menu."));
        };
      };
      read.onerror = () => {
        database.close();
        reject(read.error || new Error("Could not read the local menu."));
      };
    };
  });
}

async function getLocalProducts() {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("products", "readonly");
    const request = transaction.objectStore("products").getAll();
    request.onsuccess = () => resolve(request.result.map(mapProduct));
    request.onerror = () => reject(request.error || new Error("Could not read the local menu."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Could not read the local menu."));
    };
  });
}

function getSupabaseClient() {
  if (window.cafeSupabaseConfigError) throw new Error(window.cafeSupabaseConfigError);
  if (!window.cafeSupabase) throw new Error("Supabase is unavailable. Check the setup and reload.");
  return window.cafeSupabase;
}

async function getCurrentProfile() {
  if (window.cafeLocalMode) {
    return { user_id: "local", username: "lemsther", full_name: "Lemsther Rivera", role: "owner", active: true };
  }
  const client = getSupabaseClient();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError || !userResult.user) throw new Error("Your session has expired. Sign in again.");
  const { data, error } = await client.from("profiles")
    .select("user_id, username, full_name, role, active")
    .eq("user_id", userResult.user.id)
    .single();
  if (error) throw new Error(`Could not load your account profile: ${error.message}`);
  if (!data.active) throw new Error("This account is disabled. Contact the cafe owner.");
  return data;
}

function subscribeToCafeChanges() {
  if (window.cafeLocalMode) return null;
  const client = getSupabaseClient();
  return client.channel("cafe-data-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
      window.dispatchEvent(new CustomEvent("sale:updated"));
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
      window.dispatchEvent(new CustomEvent("menu:updated"));
    })
    .subscribe(status => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`Supabase live updates are unavailable (${status}). Reload data to see changes.`);
      }
    });
}

function mapProduct(product) {
  return {
    product_id: Number(product.product_id),
    legacy_id: product.legacy_id,
    name: product.name,
    category_name: product.category_name || "General",
    price: Number(product.price),
    supplier: product.supplier || ""
  };
}

async function getProducts() {
  if (window.cafeLocalMode) return getLocalProducts();
  const client = getSupabaseClient();
  const profile = await getCurrentProfile();
  let { data, error } = await client.from("products").select("*").order("name");
  if (error) throw new Error(`Could not load the shared menu: ${error.message}`);
  if (data.length === 0) {
    if (profile.role !== "owner") {
      throw new Error("The owner must open Menu once to initialize the shared menu.");
    }
    const { error: seedError } = await client.from("products")
      .upsert(defaultProducts, { onConflict: "name", ignoreDuplicates: true });
    if (seedError) throw new Error(`Could not initialize the menu: ${seedError.message}`);
    ({ data, error } = await client.from("products").select("*").order("name"));
    if (error) throw new Error(`Could not reload the shared menu: ${error.message}`);
  }
  return data.map(mapProduct);
}

async function saveProduct(product) {
  if (window.cafeLocalMode) {
    const database = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("products", "readwrite");
      const store = transaction.objectStore("products");
      const request = product.product_id ? store.put(product) : store.add(product);
      request.onerror = () => reject(request.error || new Error("Could not save menu item."));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Could not save menu item."));
      };
    });
  }
  const client = getSupabaseClient();
  await getCurrentProfile();
  const values = {
    name: product.name,
    category_name: product.category_name || "General",
    price: Number(product.price),
    supplier: product.supplier || ""
  };
  const query = product.product_id
    ? client.from("products").update(values).eq("product_id", product.product_id)
    : client.from("products").insert(values);
  const { error } = await query;
  if (error) throw new Error(`Could not save menu item: ${error.message}`);
}

async function deleteProduct(productId) {
  if (window.cafeLocalMode) {
    const database = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("products", "readwrite");
      transaction.objectStore("products").delete(productId);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Could not delete menu item."));
      };
    });
  }
  const client = getSupabaseClient();
  await getCurrentProfile();
  const { error } = await client.from("products").delete().eq("product_id", productId);
  if (error) throw new Error(`Could not delete menu item: ${error.message}`);
}

async function getSales() {
  if (window.cafeLocalMode) {
    try {
      const sales = JSON.parse(localStorage.getItem("cafe_sales") || "[]");
      if (!Array.isArray(sales)) throw new Error("Local sales data is not a list.");
      return sales;
    } catch (error) {
      throw new Error(`Could not read local sales: ${error.message}`);
    }
  }
  const client = getSupabaseClient();
  await getCurrentProfile();
  const { data, error } = await client.from("sales")
    .select("*, sale_items(*)").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load shared sales: ${error.message}`);
  return data.map(sale => ({
    id: sale.legacy_id || sale.sale_id,
    createdAt: sale.created_at,
    total: Number(sale.total),
    paymentMethod: sale.payment_method,
    amountTendered: Number(sale.amount_tendered),
    change: Number(sale.change_due),
    paymentConfirmed: sale.payment_confirmed,
    items: (sale.sale_items || []).map(item => ({
      product_id: item.product_id,
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity),
      price: Number(item.price)
    }))
  }));
}

async function createSale(sale) {
  if (window.cafeLocalMode) {
    const sales = await getSales();
    sale.id = Date.now();
    sale.createdAt = new Date().toISOString();
    sales.push(sale);
    localStorage.setItem("cafe_sales", JSON.stringify(sales));
    return sale;
  }
  const client = getSupabaseClient();
  await getCurrentProfile();
  const { data, error } = await client.rpc("record_sale", {
    p_items: sale.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity
    })),
    p_payment_method: sale.paymentMethod,
    p_amount_tendered: sale.amountTendered,
    p_payment_confirmed: sale.paymentConfirmed
  });
  if (error) throw new Error(`Could not record sale: ${error.message}`);
  return data;
}

async function importLegacyData(payload, onProgress = () => {}) {
  if (window.cafeLocalMode) throw new Error("Historical data import is available on the deployed Supabase app.");
  const client = getSupabaseClient();
  const profile = await getCurrentProfile();
  if (profile.role !== "owner") throw new Error("Only the owner can import historical data.");
  if (!Array.isArray(payload.products) || !Array.isArray(payload.sales)) {
    throw new Error("The selected file is not a valid cafe data export.");
  }

  let importedProducts = 0;
  for (const oldProduct of payload.products) {
    const values = {
      name: String(oldProduct.name || "").trim(),
      category_name: String(oldProduct.category_name || oldProduct.category || "General"),
      price: Number(oldProduct.price),
      supplier: String(oldProduct.supplier || ""),
      legacy_id: Number.isInteger(Number(oldProduct.product_id)) ? Number(oldProduct.product_id) : null
    };
    if (!values.name || !Number.isFinite(values.price) || values.price < 0) continue;
    const { data: existing, error: lookupError } = await client.from("products")
      .select("product_id").eq("name", values.name).maybeSingle();
    if (lookupError) throw new Error(`Could not check menu item ${values.name}: ${lookupError.message}`);
    const query = existing
      ? client.from("products").update(values).eq("product_id", existing.product_id)
      : client.from("products").insert(values);
    const { error } = await query;
    if (error) throw new Error(`Could not import menu item ${values.name}: ${error.message}`);
    importedProducts += 1;
    onProgress(`Imported ${importedProducts} of ${payload.products.length} menu items.`);
  }

  let importedSales = 0;
  for (const sale of payload.sales) {
    if (!sale || sale.id == null) continue;
    const { error } = await client.rpc("import_legacy_sale", { p_sale: sale });
    if (error) throw new Error(`Could not import sale ${sale.id}: ${error.message}`);
    importedSales += 1;
    onProgress(`Imported ${importedSales} of ${payload.sales.length} sales.`);
  }
  return { importedProducts, importedSales };
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function getSaleRevenue(sale) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  let revenueCents = 0;
  let validItemCount = 0;

  items.forEach(item => {
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) return;

    validItemCount += 1;
    revenueCents += Math.round(price * 100) * quantity;
  });

  if (items.length && validItemCount === items.length) return revenueCents / 100;
  const savedTotal = Number(sale.total);
  return Number.isFinite(savedTotal) ? Math.round(savedTotal * 100) / 100 : 0;
}

async function loadMenuData() {
  const profile = await getCurrentProfile();
  const products = await getProducts();
  const catalogBody = document.getElementById("catalogTableBody");
  if (catalogBody) {
    const owner = profile.role === "owner";
    const actionsHeading = document.querySelector(".catalog-table-wrap thead th:last-child");
    const addMenuButton = document.querySelector('[data-bs-target="#addProductModal"]');
    if (actionsHeading) actionsHeading.hidden = !owner;
    if (addMenuButton) addMenuButton.hidden = !owner;
    catalogBody.innerHTML = products.map(product => `
        <tr data-product-id="${product.product_id}">
          <td>${escapeHTML(product.name)}</td>
          <td><span class="category-pill">${escapeHTML(product.category_name || "General")}</span></td>
          <td>₱${Number(product.price || 0).toFixed(2)}</td>
          ${owner ? '<td><div class="catalog-actions"><button class="btn btn-sm btn-outline-primary" type="button" data-product-action="edit">Edit</button><button class="btn btn-sm btn-outline-danger" type="button" data-product-action="delete">Delete</button></div></td>' : ""}
        </tr>`).join("");
  }

  window.addEventListener("menu:updated", () => {
    if (document.getElementById("catalogTableBody")) {
      loadMenuData().catch(error => console.error("Could not refresh shared menu:", error));
    }
  });

  return products;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("catalogTableBody")) {
    loadMenuData().catch(error => {
      console.error("Could not load menu:", error);
      const catalogBody = document.getElementById("catalogTableBody");
      catalogBody.innerHTML = `<tr><td colspan="4" class="text-danger">${escapeHTML(error.message)}</td></tr>`;
    });
  }
});
