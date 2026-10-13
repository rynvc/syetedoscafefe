// POS Cart and Checkout Execution
let cart = [];
let paymentMethod = "Cash";
let quickProducts = [];

function addToCart(product) {
    const existing = cart.find(item => item.product_id === product.product_id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    renderCart();
}

function cartTotal() {
    return cart.reduce((sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity, 0) / 100;
}

function renderCart() {
    const cartTable = document.getElementById("cartTableBody");
    if (!cartTable) return;
    const total = cartTotal();
    cartTable.innerHTML = cart.map(item => {
        const subtotal = Math.round(Number(item.price) * 100) * item.quantity / 100;
        return `
            <tr>
                <td>
                    <span class="cart-product-name">${escapeHTML(item.name)}</span>
                    <small class="cart-unit-price">₱${Number(item.price).toFixed(2)} each</small>
                </td>
                <td class="fw-semibold">₱${subtotal.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-outline-danger cart-remove" type="button" data-cart-action="remove" data-product-id="${item.product_id}">Remove</button></td>
            </tr>
        `;
    }).join("");
    document.getElementById("cartTotal").innerText = `₱${total.toFixed(2)}`;
    const cartEmpty = document.getElementById("cartEmpty");
    if (cartEmpty) cartEmpty.hidden = cart.length > 0;
    updatePaymentSummary();
}

function updatePaymentSummary() {
    const total = cartTotal();
    const tenderInput = document.getElementById("amountTendered");
    const tendered = Number(tenderInput?.value || 0);
    const change = document.getElementById("changeDue");
    const balanceLabel = document.getElementById("paymentBalanceLabel");
    const cashTenderGroup = document.getElementById("cashTenderGroup");

    if (balanceLabel) {
        balanceLabel.textContent = paymentMethod !== "Cash"
            ? "GCash amount"
            : tendered >= total && total > 0
                ? "Change"
                : "Remaining";
    }
    if (change) {
        const amount = paymentMethod !== "Cash"
            ? total
            : tendered >= total
                ? Math.max(tendered - total, 0)
                : Math.max(total - tendered, 0);
        change.textContent = `₱${amount.toFixed(2)}`;
    }
    if (cashTenderGroup) {
        cashTenderGroup.hidden = paymentMethod !== "Cash";
    }
    const gcashPanel = document.getElementById("gcashPaymentPanel");
    if (gcashPanel) {
        gcashPanel.hidden = paymentMethod !== "GCash";
    }
}

const cartTableBody = document.getElementById("cartTableBody");
if (cartTableBody) {
    cartTableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-cart-action]");
        if (!button) return;

        const itemIndex = cart.findIndex(item => item.product_id === Number(button.dataset.productId));
        if (itemIndex < 0) return;

        if (button.dataset.cartAction === "remove") {
            cart.splice(itemIndex, 1);
        }
        renderCart();
    });
}

function renderQuickAdd(products) {
    const quickAdd = document.getElementById("quickAddProducts");
    if (!quickAdd) return;
    quickAdd.innerHTML = products.map((product) => `
        <button class="quick-product" type="button" data-product-id="${product.product_id}">
            <strong>${escapeHTML(product.name)}</strong>
            <span>${escapeHTML(product.category || product.category_name || "General")}</span>
            <span class="quick-product-bottom"><b>₱${Number(product.price).toFixed(2)}</b></span>
        </button>
    `).join("");
    quickAdd.querySelectorAll("[data-product-id]").forEach(button => {
        button.addEventListener("click", () => {
            const product = quickProducts.find(item => item.product_id === Number(button.dataset.productId));
            if (product) addToCart(product);
        });
    });
    const emptyMessage = document.getElementById("noProductsFound");
    if (emptyMessage) emptyMessage.hidden = products.length > 0;
}

const menuSearch = document.getElementById("menuSearch");
if (menuSearch) {
    getProducts().then(products => {
        quickProducts = products;
        renderQuickAdd(quickProducts);
    }).catch(error => {
        console.error("Could not load POS products:", error);
        const emptyMessage = document.getElementById("noProductsFound");
        if (emptyMessage) {
            emptyMessage.textContent = error.message;
            emptyMessage.hidden = false;
        }
    });
    menuSearch.addEventListener("input", () => {
        const query = menuSearch.value.trim().toLowerCase();
        renderQuickAdd(quickProducts.filter(product =>
            `${product.name} ${product.category || product.category_name || ""}`.toLowerCase().includes(query)
        ));
    });
    window.addEventListener("menu:updated", () => {
        getProducts().then(products => {
            quickProducts = products;
            const query = menuSearch.value.trim().toLowerCase();
            renderQuickAdd(quickProducts.filter(product =>
                `${product.name} ${product.category_name || ""}`.toLowerCase().includes(query)
            ));
        }).catch(error => console.error("Could not refresh POS menu:", error));
    });
}


document.querySelectorAll("[data-payment]").forEach(button => {
    button.addEventListener("click", () => {
        paymentMethod = button.dataset.payment;
        const gcashConfirmation = document.getElementById("gcashPaymentReceived");
        if (gcashConfirmation) gcashConfirmation.checked = false;
        document.querySelectorAll("[data-payment]").forEach(option => {
            option.classList.toggle("active", option === button);
            option.classList.toggle("btn-primary", option === button);
            option.classList.toggle("btn-outline-primary", option !== button);
        });
        if (completeSaleButton) {
            completeSaleButton.textContent = paymentMethod === "GCash"
                ? "Confirm GCash Payment & Print Receipt"
                : "Record Payment & Print Receipt";
        }
        const message = document.getElementById("saleMessage");
        if (message) message.textContent = "";
        updatePaymentSummary();
    });
});

const amountTenderedInput = document.getElementById("amountTendered");
if (amountTenderedInput) {
    amountTenderedInput.addEventListener("input", updatePaymentSummary);
}

const completeSaleButton = document.getElementById("completeSale");
if (completeSaleButton) {
    completeSaleButton.addEventListener("click", async () => {
        const total = cartTotal();
        const amountTendered = paymentMethod === "Cash"
            ? Number(document.getElementById("amountTendered").value || 0)
            : total;
        const message = document.getElementById("saleMessage");
        const receiptArea = document.getElementById("receiptPrintArea");
        const gcashConfirmation = document.getElementById("gcashPaymentReceived");
        const showMessage = text => {
            if (message) message.textContent = text;
        };

        if (!cart.length) {
            showMessage("Add a product before completing the sale.");
            return;
        }
        if (completeSaleButton.disabled) return;
        if (!Number.isFinite(amountTendered) || amountTendered < 0) {
            showMessage("Enter a valid payment amount.");
            return;
        }
        if (paymentMethod === "Cash" && amountTendered < total) {
            showMessage("Amount tendered must cover the total.");
            return;
        }
        if (paymentMethod === "GCash" && !gcashConfirmation?.checked) {
            showMessage("Verify the payment was received in GCash before recording the sale or printing a receipt.");
            return;
        }

        completeSaleButton.disabled = true;
        showMessage("Recording payment...");
        const saleItems = cart.map(item => ({
            product_id: item.product_id,
            name: item.name,
            category: item.category || item.category_name || "General",
            quantity: item.quantity,
            price: item.price
        }));
        const sale = {
            id: Date.now(),
            items: saleItems,
            total,
            paymentMethod,
            amountTendered,
            change: paymentMethod === "Cash" ? amountTendered - total : 0,
            paymentConfirmed: paymentMethod === "GCash" ? true : amountTendered >= total,
            createdAt: new Date().toISOString()
        };

        try {
            const savedSale = await createSale(sale);

            cart = [];
            renderCart();
            document.getElementById("amountTendered").value = "";
            if (gcashConfirmation) gcashConfirmation.checked = false;
            renderReceipt(savedSale, receiptArea);
            showMessage("Payment recorded. Choose your connected printer in the print dialog.");
            window.dispatchEvent(new CustomEvent("sale:updated"));
            window.print();
        } catch (error) {
            console.error("Could not complete sale:", error);
            showMessage(error.message || "Sale could not be saved. Please try again.");
        } finally {
            completeSaleButton.disabled = false;
        }
    });
}

function renderReceipt(sale, receiptArea) {
    if (!receiptArea) {
        throw new Error("Receipt area is unavailable. Please reload the POS and try again.");
    }
    const formatMoney = value => `₱${Number(value).toFixed(2)}`;
    const itemRows = sale.items.map(item => `
        <tr>
            <td>${escapeHTML(item.name)}<small>${item.quantity} × ${formatMoney(item.price)}</small></td>
            <td>${formatMoney(item.quantity * item.price)}</td>
        </tr>
    `).join("");

    receiptArea.innerHTML = `
        <div class="receipt">
            <header class="receipt-header">
                <h1>Syete Dos Cafe</h1>
                <p>Sales Receipt</p>
            </header>
            <div class="receipt-meta">
                <p><span>Receipt #</span><strong>${sale.id}</strong></p>
                <p><span>Date</span><strong>${escapeHTML(new Date(sale.createdAt).toLocaleString())}</strong></p>
            </div>
            <table class="receipt-items">
                <thead><tr><th>Item</th><th>Amount</th></tr></thead>
                <tbody>${itemRows}</tbody>
            </table>
            <div class="receipt-totals">
                <p><span>Total</span><strong>${formatMoney(sale.total)}</strong></p>
                <p><span>Payment</span><strong>${escapeHTML(sale.paymentMethod)}</strong></p>
                <p><span>${sale.paymentMethod === "Cash" ? "Paid" : "GCash paid"}</span><strong>${formatMoney(sale.amountTendered)}</strong></p>
                ${sale.paymentMethod === "Cash" ? `<p><span>Change</span><strong>${formatMoney(sale.change)}</strong></p>` : ""}
            </div>
            <footer class="receipt-footer">Thank you for your order!</footer>
        </div>
    `;
}