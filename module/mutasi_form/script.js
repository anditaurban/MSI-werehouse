pagemodule = "Mutation";
setDataType("mutation");

// --- 1. SETUP & INISIALISASI ---

// --- 2. CEK MODE (EDIT / ADD) ---
if (window.detail_id) {
  // Mode Edit
  document.getElementById("btnSaveMutation").classList.add("hidden");
  document.getElementById("btnUpdateMutation").classList.remove("hidden");

  let currentWarehouseId = null;
  if (typeof user !== "undefined" && user.werehouse_id) {
    currentWarehouseId = user.werehouse_id;
  }

  // Load Dropdown Gudang TUJUAN
  loadDropdown(
    "mutDestWarehouse", // ID Element Select
    `${baseUrl}/list/werehouse/${owner_id}`, // URL API
    "werehouse_id", // Value Field
    "werehouse", // Label Field
    currentWarehouseId // <--- PARAMETER KE-5 (Exclude ID User saat ini)
  );
  loadMutationDetail(window.detail_id);
} else {
  // Mode Add
  document.getElementById("btnUpdateMutation").classList.add("hidden");
  document.getElementById("btnSaveMutation").classList.remove("hidden");

  // --- PERBAIKAN DI SINI ---
  // Kita pastikan user.werehouse_id dikirim sebagai parameter ke-5 (excludeId)
  let currentWarehouseId = null;
  if (typeof user !== "undefined" && user.werehouse_id) {
    currentWarehouseId = user.werehouse_id;
  }

  // Load Dropdown Gudang TUJUAN
  loadDropdown(
    "mutDestWarehouse", // ID Element Select
    `${baseUrl}/list/werehouse/${owner_id}`, // URL API
    "werehouse_id", // Value Field
    "werehouse", // Label Field
    currentWarehouseId // <--- PARAMETER KE-5 (Exclude ID User saat ini)
  );

  // Setup Autocomplete
  setupMutationAutocomplete();

  // Tampilkan nama gudang asal (Visual)
  if (typeof user !== "undefined" && user.werehouse) {
    const label = document.getElementById("sourceWarehouseLabel");
    if (label) label.innerText = `Gudang Asal: ${user.werehouse}`;
  }
  const dateInput = document.getElementById("mutDate");
  if (dateInput) dateInput.valueAsDate = new Date();
}

// --- 3. AUTOCOMPLETE (SEARCH PRODUCT DI GUDANG USER) ---
function setupMutationAutocomplete() {
  const input = document.getElementById("mutProductSearch");
  const resultsContainer = document.getElementById("mutSearchResults");
  let debounceTimeout;

  if (!input || !resultsContainer) return;

  // VALIDASI SESSION USER
  if (typeof user === "undefined" || !user.werehouse_id) {
    console.error("Session User / Warehouse ID tidak ditemukan");
    input.placeholder = "Error: Refresh Halaman";
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
      // ⬇️ UPDATE: Pakai user.werehouse_id
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
              "p-2 hover:bg-yellow-50 cursor-pointer border-b text-sm";
            div.innerHTML = `
                            <strong>${item.product}</strong><br>
                            <span class="text-xs text-gray-500">SKU: ${
                              item.productcode || "-"
                            } | Stok: <b>${item.stock || 0}</b></span>
                        `;

            div.addEventListener("click", () => {
              // Set Values
              document.getElementById("mutProductWerehouseId").value =
                item.product_werehouse_id;
              document.getElementById("mutProductId").value = item.product_id;
              document.getElementById("mutProductSearch").value = item.product;

              // Info Stok
              const stockDisplay = document.getElementById("mutCurrentStock");
              if (stockDisplay) stockDisplay.innerText = item.stock || 0;

              document.getElementById("mutQty").focus();
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
function getMutationPayload() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const getInt = (id) => {
    const val = getVal(id);
    return parseInt(val.replace(/\./g, ""), 10) || 0;
  };

  // VALIDASI SESSION USER
  if (typeof user === "undefined" || !user.werehouse_id) {
    Swal.fire({
      icon: "error",
      title: "Error Session",
      text: "ID Gudang User tidak terbaca. Silakan login ulang.",
    });
    return null;
  }

  const pwId = getVal("mutProductWerehouseId");
  const destId = getVal("mutDestWarehouse");
  const qty = getInt("mutQty");
  const date = getVal("mutDate");

  if (!pwId) {
    Swal.fire("Warning", "Pilih produk asal dulu.", "warning");
    return null;
  }
  if (!destId) {
    Swal.fire("Warning", "Pilih gudang tujuan.", "warning");
    return null;
  }
  if (qty <= 0) {
    Swal.fire("Warning", "Jumlah pindah harus > 0.", "warning");
    return null;
  }
  if (!date) {
    Swal.fire("Warning", "Tanggal wajib diisi.", "warning");
    return null;
  }

  // Cek agar tidak mutasi ke gudang yang sama
  // ⬇️ UPDATE: Pakai user.werehouse_id
  if (parseInt(destId) === parseInt(user.werehouse_id)) {
    Swal.fire(
      "Warning",
      "Gudang tujuan tidak boleh sama dengan gudang asal.",
      "warning"
    );
    return null;
  }

  const payload = {
    owner_id: owner_id,
    werehouse_id: parseInt(user.werehouse_id), // ⬇️ UPDATE: Sumber dari object user
    werehouse_destination_id: parseInt(destId),
    product_werehouse_id: parseInt(pwId),
    mutation_date: date,
    qty: qty,
    notes: getVal("mutNotes"),
  };

  console.log("Payload Mutation:", payload);
  return payload;
}

// --- 5. SUBMIT ---
async function submitMutation(method, id = "") {
  const payload = getMutationPayload();
  if (!payload) return;

  const endpoint =
    method === "POST"
      ? "add/product_mutation"
      : `update/product_mutation/${id}`;
  const url = `${baseUrl}/${endpoint}`;

  try {
    const btnId = method === "POST" ? "btnSaveMutation" : "btnUpdateMutation";
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
        text: "Data Mutasi berhasil disimpan.",
      }).then(() => {
        // --- REVISI: SEMUA KE LIST INBOUND ---
        // Baik POST maupun PUT akan kembali ke halaman list
        loadModuleContent("mutasi");
      });
    } else {
      throw new Error(result.message || "Gagal menyimpan data.");
    }
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Gagal", text: error.message });
    const btn = document.getElementById(
      method === "POST" ? "btnSaveMutation" : "btnUpdateMutation"
    );
    if (btn) btn.disabled = false;
    btn.innerText = originalText;
  }
}

// --- 6. LOAD DETAIL (EDIT) ---
async function loadMutationDetail(id) {
  try {
    const response = await fetch(`${baseUrl}/detail/product_mutation/${id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    await loadDropdown();
    const result = await response.json();
    const data = result.detail;

    if (!data) throw new Error("Data detail tidak ditemukan");

    const setVal = (elmId, val) => {
      const el = document.getElementById(elmId);
      if (el) el.value = val;
    };

    setVal("mutDate", data.mutation_date);
    setVal("mutDestWarehouse", data.werehouse_destination_id);
    setVal("mutQty", data.qty);
    setVal("mutNotes", data.notes || "");

    setVal("mutProductWerehouseId", data.product_werehouse_id);
    setVal("mutProductId", data.product_id);
    setVal(
      "mutProductSearch",
      data.product_name || data.product || "Produk Terpilih"
    );

    const stockDisplay = document.getElementById("mutCurrentStock");
    if (stockDisplay && data.current_stock)
      stockDisplay.innerText = data.current_stock;
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Gagal memuat detail edit", "error");
  }
}

// --- 7. HELPER DROPDOWN ---
async function loadDropdown(
  selectId,
  apiUrl,
  valueField,
  labelField,
  excludeId = null
) {
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
        // LOGIKA EXCLUDE:
        // Jika ID item sama dengan excludeId (gudang asal), jangan ditampilkan
        if (excludeId && item[valueField] == excludeId) {
          return; // Skip iterasi ini
        }

        const option = document.createElement("option");
        option.value = item[valueField];
        option.textContent = item[labelField];
        select.appendChild(option);
      });
    }

    // Cek jika kosong setelah di-filter
    if (select.options.length <= 1) {
      const opt = document.createElement("option");
      opt.text = "Tidak ada gudang tujuan lain";
      opt.disabled = true;
      select.appendChild(opt);
    }
  } catch (e) {
    console.error(e);
    select.innerHTML = `<option value="">Gagal Load</option>`;
  }
}
