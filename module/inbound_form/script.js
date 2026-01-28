pagemodule = "Inbound";
setDataType("inbound");

// --- 2. LOGIKA MODE (EDIT vs TAMBAH) ---
if (window.detail_id) {
  // --- MODE UPDATE ---
  const btnSave = document.getElementById("btnSaveInbound");
  const btnUpdate = document.getElementById("btnUpdateInbound");

  if (btnSave) btnSave.classList.add("hidden");
  if (btnUpdate) btnUpdate.classList.remove("hidden");

  // 2. Panggil Fungsi Load Detail (PANGGIL TERPISAH, JANGAN DI-CHAIN)
  loadInboundDetail(window.detail_id);
} else {
  // --- MODE TAMBAH ---
  document.getElementById("btnUpdateInbound").classList.add("hidden");
  document.getElementById("btnSaveInbound").classList.remove("hidden");

  // Setup Autocomplete Produk (Wajib ada)
  setupInboundAutocomplete();

  // Setup Format Angka & Aging Calculator (Wajib ada)
  setupInboundEvents();

  // Set Default Tanggal Hari Ini
  const dateInput = document.getElementById("inboundDate");
  if (dateInput) dateInput.valueAsDate = new Date();
}

// --- 1. SETUP AUTOCOMPLETE (SEARCH PRODUCT warehouse) ---
function setupInboundAutocomplete() {
  const input = document.getElementById("inboundProductSearch");
  const resultsContainer = document.getElementById("inboundSearchResults");
  let debounceTimeout;

  if (!input || !resultsContainer) return;

  // Cek Session Warehouse Dulu
  if (typeof warehouse_id === "undefined" || !warehouse_id) {
    console.error("warehouse ID session tidak ditemukan.");
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
      // URL SEARCH BARU (Menggunakan warehouse_id session)
      // Pattern: {{baseUrl}}/table/product_warehouse/{{warehouseid}}/1?seach=
      const searchUrl = `${baseUrl}/table/product_warehouse/${warehouse_id}/1?seach=${encodeURIComponent(
        keyword,
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
          item.product?.toLowerCase().includes(keyword.toLowerCase()),
        );

        resultsContainer.innerHTML = "";
        if (products.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-sm text-gray-500">Tidak ditemukan di gudang ini.</div>';
        } else {
          products.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-blue-50 cursor-pointer border-b text-sm";
            // Menampilkan Nama Produk & Stok saat ini
            div.innerHTML = `
                            <strong>${item.product}</strong><br>
                            <span class="text-xs text-gray-500">SKU: ${
                              item.productcode || "-"
                            }</span>
                        `;

            div.addEventListener("click", () => {
              // Set Values saat diklik
              document.getElementById("inboundProductwarehouseId").value =
                item.product_warehouse_id;
              document.getElementById("inboundProductId").value =
                item.product_id;

              document.getElementById("inboundProductSearch").value =
                item.product;
              // Set harga beli default dari COGS jika ada
              document.getElementById("inboundPrice").value = (
                item.cogs || 0
              ).toLocaleString("id-ID");

              // Auto focus ke Qty
              document.getElementById("inboundQty").focus();

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

// --- 2. SELECT PRODUCT LOGIC ---
function selectInboundProduct(item) {
  console.log("Inbound Product Selected:", item);

  // Set Hidden IDs
  document.getElementById("inboundProductwarehouseId").value =
    item.product_warehouse_id;
  document.getElementById("inboundProductId").value = item.product_id;

  // Set Tampilan Input
  document.getElementById("inboundProductSearch").value = item.product;

  // Auto-fill Harga Beli (Purchase Price) jika ada di data (biasanya cogs)
  const price = item.cogs || 0;
  document.getElementById("inboundPrice").value = price.toLocaleString("id-ID");

  // Fokus ke input Qty agar user langsung isi
  document.getElementById("inboundQty").focus();
}

// --- 3. EVENT LISTENERS LAINNYA ---
function setupInboundEvents() {
  // Format Currency untuk Harga
  const priceInput = document.getElementById("inboundPrice");
  if (priceInput) {
    priceInput.addEventListener("input", function () {
      const raw = this.value.replace(/[^\d]/g, "");
      this.value = raw ? parseInt(raw, 10).toLocaleString("id-ID") : "";
    });
  }

  // Hitung Aging Otomatis saat Tanggal Expired berubah
  const expInput = document.getElementById("inboundExpired");
  if (expInput) {
    expInput.addEventListener("change", calculateAging);
  }

  // Hitung juga jika tanggal transaksi berubah (jarang terjadi tapi logis)
  const dateInput = document.getElementById("inboundDate");
  if (dateInput) {
    dateInput.addEventListener("change", calculateAging);
  }
}

function calculateAging() {
  const expVal = document.getElementById("inboundExpired").value;
  const dateVal =
    document.getElementById("inboundDate").value ||
    new Date().toISOString().split("T")[0];
  const agingInput = document.getElementById("inboundAging");

  if (!expVal) {
    agingInput.value = "";
    return;
  }

  const expDate = new Date(expVal);
  const trxDate = new Date(dateVal);

  // Hitung selisih waktu
  const diffTime = expDate - trxDate;
  // Konversi ke hari (1000ms * 60s * 60m * 24h)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    agingInput.value = `Sudah Expired (${Math.abs(diffDays)} hari lalu)`;
    agingInput.classList.add("text-red-600", "font-bold");
  } else {
    agingInput.value = `${diffDays} Hari`;
    agingInput.classList.remove("text-red-600", "font-bold");
  }
}

function getInboundPayload() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const getInt = (id) => {
    const val = getVal(id);
    return parseInt(val.replace(/\./g, ""), 10) || 0;
  };

  // Cek Session
  if (typeof warehouse_id === "undefined" || !warehouse_id) {
    Swal.fire({
      icon: "error",
      title: "Session Error",
      text: "warehouse ID tidak ditemukan dalam sesi login.",
    });
    return null;
  }

  // Validasi Field
  const pwId = getVal("inboundProductwarehouseId");
  const qty = getInt("inboundQty");
  const date = getVal("inboundDate");

  if (!pwId) {
    Swal.fire({
      icon: "warning",
      title: "Produk Kosong",
      text: "Silakan cari dan pilih produk.",
    });
    return null;
  }
  if (qty <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Qty Invalid",
      text: "Jumlah masuk harus > 0.",
    });
    return null;
  }
  if (!date) {
    Swal.fire({
      icon: "warning",
      title: "Tanggal Kosong",
      text: "Tanggal wajib diisi.",
    });
    return null;
  }

  // Construct JSON
  const payload = {
    owner_id: user.owner_id,
    warehouse_id: user.warehouse_id, // Menggunakan Session Variable
    product_warehouse_id: parseInt(pwId),
    // product_id: parseInt(getVal('inboundProductId')), // Opsional, tergantung endpoint butuh atau tidak

    inbound_date: date,
    expired_date: getVal("inboundExpired") || null,
    purchase_price: getInt("inboundPrice"),
    qty: qty,
    inv_number: getVal("inboundInv"),
    notes: getVal("inboundNotes"),
  };

  console.log("Payload:", payload);
  return payload;
}

// --- FUNGSI SUBMIT (ADD / UPDATE) ---
async function submitInbound(method, id = "") {
  const payload = getInboundPayload();
  if (!payload) return;

  const endpoint =
    method === "POST" ? "add/product_inbound" : `update/product_inbound/${id}`;
  const url = `${baseUrl}/${endpoint}`;

  try {
    const btnId = method === "POST" ? "btnSaveInbound" : "btnUpdateInbound";
    const btn = document.getElementById(btnId);

    // Simpan text asli tombol
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

    // Kembalikan tombol
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
    }

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Data inbound berhasil disimpan.",
      }).then(() => {
        // --- REVISI: SEMUA KE LIST INBOUND ---
        // Baik POST maupun PUT akan kembali ke halaman list
        loadModuleContent("inbound");
      });
    } else {
      throw new Error(result.message || "Gagal menyimpan data.");
    }
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Gagal", text: error.message });

    const btn = document.getElementById(
      method === "POST" ? "btnSaveInbound" : "btnUpdateInbound",
    );
    if (btn) {
      btn.disabled = false;
      btn.innerText = method === "POST" ? "Simpan Stok Masuk" : "Update Data";
    }
  }
}

// --- 6. LOAD DETAIL (EDIT) ---
async function loadInboundDetail(id) {
  try {
    const response = await fetch(`${baseUrl}/detail/product_inbound/${id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    await setupInboundAutocomplete();

    // Setup Format Angka & Aging Calculator (Wajib ada)
    await setupInboundEvents();
    const result = await response.json();
    const data = result.detail;

    if (!data) throw new Error("Data detail tidak ditemukan");

    // Helper untuk set value element by ID
    const setVal = (elmId, val) => {
      const el = document.getElementById(elmId);
      if (el) el.value = val;
    };

    // --- MAPPING DATA (Sesuai JSON) ---

    // 1. Data Transaksi
    setVal("inboundDate", data.inbound_date);
    setVal("inboundInv", data.inv_number || "");
    setVal("inboundNotes", data.notes || ""); // Key JSON adalah 'notes' (jamak)
    setVal("inboundExpired", data.expired_date || "");

    // 2. Angka & Harga
    setVal("inboundQty", data.qty);
    setVal("inboundPrice", (data.purchase_price || 0).toLocaleString("id-ID"));

    // 3. Mapping Produk
    setVal("inboundProductwarehouseId", data.product_warehouse_id);

    // Nama produk untuk ditampilkan di kolom search
    setVal("inboundProductSearch", data.product || "");

    calculateAging();
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Gagal memuat detail edit", "error");
  }
}
