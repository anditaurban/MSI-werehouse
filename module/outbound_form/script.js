pagemodule = "Outbound";
setDataType("outbound");

// --- 1. SETUP & INISIALISASI ---

// --- 2. CEK MODE (EDIT / ADD) ---
if (window.detail_id) {
  // Mode Edit
  document.getElementById("btnSaveOutbound").classList.add("hidden");
  document.getElementById("btnUpdateOutbound").classList.remove("hidden");

  loadDropdown(
    "outCategory",
    `${baseUrl}/list/product_category_outbound/${owner_id}`,
    "category_id",
    "category"
  );
  loadOutboundDetail(window.detail_id);
} else {
  // Mode Add
  document.getElementById("btnUpdateOutbound").classList.add("hidden");
  document.getElementById("btnSaveOutbound").classList.remove("hidden");

  // Load Dropdown Kategori Outbound
  loadDropdown(
    "outCategory",
    `${baseUrl}/list/product_category_outbound/${owner_id}`,
    "category_id",
    "category"
  );

  // Setup Autocomplete Search
  setupOutboundAutocomplete();

  // Default Tanggal Hari Ini
  const dateInput = document.getElementById("outDate");
  if (dateInput) dateInput.valueAsDate = new Date();
}

// --- 3. FUNGSI AUTOCOMPLETE (SEARCH PRODUCT GUDANG) ---
function setupOutboundAutocomplete() {
  const input = document.getElementById("outProductSearch");
  const resultsContainer = document.getElementById("outSearchResults");
  let debounceTimeout;

  if (!input || !resultsContainer) return;

  // Cek Session Warehouse
  if (typeof werehouse_id === "undefined" || !werehouse_id) {
    input.placeholder = "Error: Sesi Gudang Tidak Ditemukan";
    input.disabled = true;
    return;
  }

  input.addEventListener("input", function () {
    const keyword = this.value.trim();
    clearTimeout(debounceTimeout);

    if (keyword.length < 2) {
      resultsContainer.classList.add("hidden");
      return;
    }

    debounceTimeout = setTimeout(async () => {
      // Endpoint Search (Scoped by Warehouse ID)
      const searchUrl = `${baseUrl}/table/product_werehouse/${werehouse_id}/1?seach=${encodeURIComponent(
        keyword
      )}`;

      try {
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-gray-500">Mencari...</div>';
        resultsContainer.classList.remove("hidden");

        const response = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        const result = await response.json();
        const products = (result.tableData || []).filter((item) =>
          item.product?.toLowerCase().includes(keyword.toLowerCase())
        );

        resultsContainer.innerHTML = "";
        if (products.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-sm text-gray-500">Tidak ditemukan di stok gudang.</div>';
        } else {
          products.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-red-50 cursor-pointer border-b text-sm";
            div.innerHTML = `
                            <strong>${item.product}</strong><br>
                            <span class="text-xs text-gray-500">SKU: ${
                              item.productcode || "-"
                            }</b></span>
                        `;

            div.addEventListener("click", () => {
              // Set Values
              document.getElementById("outProductWerehouseId").value =
                item.product_werehouse_id;
              document.getElementById("outProductId").value = item.product_id;
              document.getElementById("outProductSearch").value = item.product;

              // Info tambahan (Opsional)
              const stockDisplay = document.getElementById("outCurrentStock");
              if (stockDisplay) stockDisplay.value = item.stock || 0;

              // Focus ke Qty
              document.getElementById("outQty").focus();
              resultsContainer.classList.add("hidden");
            });
            resultsContainer.appendChild(div);
          });
        }
      } catch (e) {
        console.error(e);
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-red-500">Gagal memuat.</div>';
      }
    }, 500);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add("hidden");
    }
  });
}

// --- 4. GENERATE PAYLOAD ---
function getOutboundPayload() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const getInt = (id) => {
    const val = getVal(id);
    return parseInt(val.replace(/\./g, ""), 10) || 0;
  };

  // Validasi Session
  if (typeof werehouse_id === "undefined" || !werehouse_id) {
    Swal.fire({
      icon: "error",
      title: "Sesi Error",
      text: "Werehouse ID tidak terbaca. Refresh halaman.",
    });
    return null;
  }

  const pwId = getVal("outProductWerehouseId");
  const catId = getVal("outCategory");
  const qty = getInt("outQty");
  const date = getVal("outDate");

  if (!pwId) {
    Swal.fire("Warning", "Pilih produk dulu.", "warning");
    return null;
  }
  if (!catId) {
    Swal.fire("Warning", "Pilih kategori pengeluaran.", "warning");
    return null;
  }
  if (qty <= 0) {
    Swal.fire("Warning", "Qty harus lebih dari 0.", "warning");
    return null;
  }
  if (!date) {
    Swal.fire("Warning", "Tanggal wajib diisi.", "warning");
    return null;
  }

  // Payload Structure
  const payload = {
    owner_id: owner_id,
    werehouse_id: werehouse_id, // Dari Session
    product_werehouse_id: parseInt(pwId),
    category_id: parseInt(catId),
    outbound_date: date,
    qty: qty,
    notes: getVal("outNotes"),
  };

  console.log("Payload Outbound:", payload);
  return payload;
}

// --- 5. SUBMIT FUNCTION ---
async function submitOutbound(method, id = "") {
  const payload = getOutboundPayload();
  if (!payload) return;

  const endpoint =
    method === "POST"
      ? "add/product_outbound"
      : `update/product_outbound/${id}`;
  const url = `${baseUrl}/${endpoint}`;

  try {
    const btnId = method === "POST" ? "btnSaveOutbound" : "btnUpdateOutbound";
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText;
    btn.innerText = "Proses...";
    btn.disabled = true;

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    btn.innerText = originalText;
    btn.disabled = false;

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Data Outbound berhasil disimpan.",
      }).then(() => {
        // --- REVISI: SEMUA KE LIST INBOUND ---
        // Baik POST maupun PUT akan kembali ke halaman list
        loadModuleContent("outbound");
      });
    } else {
      throw new Error(result.message || "Gagal menyimpan data.");
    }
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Gagal", text: error.message });
    const btn = document.getElementById(
      method === "POST" ? "btnSaveOutbound" : "btnUpdateOutbound"
    );
    if (btn) btn.disabled = false;
    btn.innerText = originalText;
  }
}

// --- 6. LOAD DETAIL (EDIT MODE) ---
async function loadOutboundDetail(id) {
  try {
    // Asumsi endpoint detail sama polanya
    const response = await fetch(`${baseUrl}/detail/product_outbound/${id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    await loadDropdown();
    const result = await response.json();
    const data = result.detail;

    if (!data) throw new Error("Data detail tidak ditemukan");

    // Helper Set Value
    const setVal = (elmId, val) => {
      const el = document.getElementById(elmId);
      if (el) el.value = val;
    };

    setVal("outDate", data.outbound_date);
    setVal("outCategory", data.category_id);
    setVal("outQty", data.qty);
    setVal("outNotes", data.notes || "");

    // Mapping Product
    setVal("outProductWerehouseId", data.product_werehouse_id);
    setVal("outProductId", data.product_id);
    setVal(
      "outProductSearch",
      data.product_name || data.product || "Produk Terpilih"
    );

    // Load Stok info jika ada di data detail
    const stockDisplay = document.getElementById("outCurrentStock");
    if (stockDisplay && data.current_stock)
      stockDisplay.value = data.current_stock;
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Gagal memuat detail edit", "error");
  }
}

// --- 7. HELPER: LOAD DROPDOWN (Reuse) ---
async function loadDropdown(selectId, apiUrl, valueField, labelField) {
  const select = document.getElementById(selectId);
  if (!select) return;
  try {
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    const result = await response.json();
    const listData = result.listData;

    select.innerHTML = `<option value="">Pilih...</option>`;
    if (Array.isArray(listData)) {
      listData.forEach((item) => {
        const option = document.createElement("option");
        option.value = item[valueField];
        option.textContent = item[labelField]; // "category"
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error(e);
    select.innerHTML = `<option value="">Gagal Load</option>`;
  }
}
