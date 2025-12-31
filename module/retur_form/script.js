pagemodule = "Retur";
setDataType("retur");

// --- 1. INISIALISASI & UI SETUP ---

// Tampilkan nama gudang dari session
if (typeof user !== "undefined" && user.werehouse) {
  const warehouseDisplay = document.getElementById("returWarehouseName");
  if (warehouseDisplay) warehouseDisplay.value = user.werehouse;
}

// Jalankan Autocomplete
setupReturAutocomplete();

// --- 2. LOGIKA MODE (ADD vs EDIT) ---
if (window.detail_id) {
  // Mode Update
  const btnSave = document.getElementById("btnSaveRetur");
  const btnUpdate = document.getElementById("btnUpdateRetur");
  const title = document.getElementById("formTitle");

  if (btnSave) btnSave.classList.add("hidden");
  if (btnUpdate) btnUpdate.classList.remove("hidden");
  if (title) title.innerText = "UPDATE DATA RETUR";

  // Load Data Detail
  loadReturDetail(window.detail_id);
} else {
  // Mode Tambah
  const btnSave = document.getElementById("btnSaveRetur");
  const btnUpdate = document.getElementById("btnUpdateRetur");

  if (btnUpdate) btnUpdate.classList.add("hidden");
  if (btnSave) btnSave.classList.remove("hidden");

  // Default Tanggal
  const dateInput = document.getElementById("returDate");
  if (dateInput) dateInput.valueAsDate = new Date();
}

// --- 3. AUTOCOMPLETE (SEARCH PRODUCT) ---
function setupReturAutocomplete() {
  const input = document.getElementById("returProductSearch");
  const resultsContainer = document.getElementById("returSearchResults");
  let debounceTimeout;

  if (!input || !resultsContainer) return;

  // Cek Session Warehouse
  if (typeof user === "undefined" || !user.werehouse_id) {
    input.placeholder = "Error: Sesi Gudang Hilang";
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
      // Search Produk Scope Gudang User
      const searchUrl = `${baseUrl}/table/product_werehouse/${
        user.werehouse_id
      }/1?seach=${encodeURIComponent(keyword)}`;

      try {
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-gray-500">Mencari...</div>';
        resultsContainer.classList.remove("hidden");

        const response = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        const result = await response.json();
        const products = result.tableData || [];

        resultsContainer.innerHTML = "";
        if (products.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-sm text-gray-500">Tidak ditemukan di gudang ini.</div>';
        } else {
          products.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-purple-50 cursor-pointer border-b text-sm";
            div.innerHTML = `
                            <div class="font-bold text-gray-700">${
                              item.product
                            }</div>
                            <div class="text-xs text-gray-500">SKU: ${
                              item.productcode || "-"
                            } | Stok: ${item.stock || 0}</div>
                        `;

            div.addEventListener("click", () => {
              document.getElementById("returProductWerehouseId").value =
                item.product_werehouse_id;
              // document.getElementById('returProductId').value = item.product_id;
              document.getElementById("returProductSearch").value =
                item.product;

              document.getElementById("returQty").focus();
              resultsContainer.classList.add("hidden");
            });
            resultsContainer.appendChild(div);
          });
        }
      } catch (e) {
        console.error(e);
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-red-500">Gagal load.</div>';
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
function getReturPayload() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const getInt = (id) => {
    const val = getVal(id);
    return parseInt(val.replace(/\./g, ""), 10) || 0;
  };

  // Validasi Session
  if (typeof user === "undefined" || !user.werehouse_id) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Sesi Gudang tidak terbaca.",
    });
    return null;
  }

  const pwId = getVal("returProductWerehouseId");
  const qty = getInt("returQty");
  const date = getVal("returDate");
  const condition = getVal("returCondition");

  if (!date) {
    Swal.fire("Warning", "Tanggal wajib diisi.", "warning");
    return null;
  }
  if (!pwId) {
    Swal.fire("Warning", "Pilih produk dulu.", "warning");
    return null;
  }
  if (qty <= 0) {
    Swal.fire("Warning", "Qty retur harus > 0.", "warning");
    return null;
  }
  if (!condition) {
    Swal.fire("Warning", "Pilih kondisi fisik barang.", "warning");
    return null;
  }

  const payload = {
    owner_id: owner_id,
    werehouse_id: parseInt(user.werehouse_id),
    product_werehouse_id: parseInt(pwId),

    return_date: date,
    ref_number: getVal("returRef"),
    customer_name: getVal("returCustomer"),
    qty: qty,
    condition: condition, // 'good', 'bad', 'expired'
    note: getVal("returNotes"),
  };

  console.log("Payload Retur:", payload);
  return payload;
}

// --- 5. SUBMIT FUNCTION ---
async function submitRetur(method, id = "") {
  const payload = getReturPayload();
  if (!payload) return;

  const endpoint =
    method === "POST" ? "add/product_return" : `update/product_return/${id}`;
  const url = `${baseUrl}/${endpoint}`;

  try {
    const btnId = method === "POST" ? "btnSaveRetur" : "btnUpdateRetur";
    const btn = document.getElementById(btnId);
    let originalText = "Simpan";

    if (btn) {
      originalText = btn.innerText;
      btn.innerText = "Proses...";
      btn.disabled = true;
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
    }

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Data retur tersimpan.",
      }).then(() => {
        if (method === "POST") {
          location.reload();
        } else {
          loadModuleContent("retur"); // Kembali ke list (folder retur)
        }
      });
    } else {
      throw new Error(result.message || "Gagal menyimpan data.");
    }
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Gagal", text: error.message });
    const btn = document.getElementById(
      method === "POST" ? "btnSaveRetur" : "btnUpdateRetur"
    );
    if (btn) {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }
}

// --- 6. LOAD DETAIL (EDIT) ---
async function loadReturDetail(id) {
  try {
    const response = await fetch(`${baseUrl}/detail/product_return/${id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    const result = await response.json();
    const data = result.detail;

    if (!data) throw new Error("Data detail tidak ditemukan");

    const setVal = (elmId, val) => {
      const el = document.getElementById(elmId);
      if (el) el.value = val;
    };

    setVal("returDate", data.return_date);
    setVal("returRef", data.ref_number || "");
    setVal("returCustomer", data.customer_name || "");
    setVal("returQty", data.qty);
    setVal("returCondition", data.condition);
    setVal("returNotes", data.note || data.notes || "");

    setVal("returProductWerehouseId", data.product_werehouse_id);
    setVal(
      "returProductSearch",
      data.product_name || data.product || "Produk Terpilih"
    );
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Gagal memuat detail edit", "error");
  }
}
