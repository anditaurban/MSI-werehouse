pagemodule = "Inbound";
setDataType("inbound");

// --- 2. LOGIKA MODE (EDIT vs TAMBAH) ---
if (window.detail_id) {
  // --- MODE UPDATE ---
  document.getElementById("btnSaveInbound").classList.add("hidden");
  document.getElementById("btnUpdateInbound").classList.remove("hidden");

  // Ganti Judul jika ada element judul
  // document.getElementById("formTitle").innerText = "UPDATE STOK MASUK";

  // Panggil fungsi load detail khusus Inbound
  loadInboundDetail(window.detail_id);
} else {
  // --- MODE TAMBAH ---
  document.getElementById("btnUpdateInbound").classList.add("hidden");
  document.getElementById("btnSaveInbound").classList.remove("hidden");

  loadDropdown(
    "inboundWarehouse",
    `${baseUrl}/list/werehouse/${owner_id}`,
    "werehouse_id",
    "werehouse"
  );

  // Setup Autocomplete Produk (Wajib ada)
  setupInboundAutocomplete();

  // Setup Format Angka & Aging Calculator (Wajib ada)
  setupInboundEvents();

  // Set Default Tanggal Hari Ini
  const dateInput = document.getElementById("inboundDate");
  if (dateInput) dateInput.valueAsDate = new Date();
}

// --- 1. SETUP AUTOCOMPLETE (SEARCH PRODUCT WEREHOUSE) ---
function setupInboundAutocomplete() {
  const input = document.getElementById("inboundProductSearch");
  const resultsContainer = document.getElementById("inboundSearchResults");
  let debounceTimeout;

  if (!input || !resultsContainer) return;

  input.addEventListener("input", function () {
    const keyword = this.value.trim();
    clearTimeout(debounceTimeout);

    if (keyword.length < 2) {
      resultsContainer.classList.add("hidden");
      return;
    }

    debounceTimeout = setTimeout(async () => {
      // Endpoint sesuai request: table/product_werehouse
      const searchUrl = `${baseUrl}/table/product_werehouse/${owner_id}/1?seach=${encodeURIComponent(
        keyword
      )}`;

      try {
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-gray-500">Mencari...</div>';
        resultsContainer.classList.remove("hidden");

        const response = await fetch(searchUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });

        const result = await response.json();
        const products = result.tableData || []; // Asumsi key response adalah tableData

        resultsContainer.innerHTML = "";

        if (products.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-sm text-gray-500">Produk tidak ditemukan di gudang.</div>';
        } else {
          products.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-blue-50 cursor-pointer border-b text-sm";
            // Menampilkan Nama Produk & SKU
            div.innerHTML = `
                            <div class="font-bold text-gray-800">${
                              item.product
                            }</div>
                            <div class="text-xs text-gray-500">SKU: ${
                              item.productcode || "-"
                            } | Stok Saat Ini: ${item.stock || 0}</div>
                        `;

            div.addEventListener("click", () => {
              selectInboundProduct(item);
              resultsContainer.classList.add("hidden");
            });

            resultsContainer.appendChild(div);
          });
        }
      } catch (error) {
        console.error("Search error:", error);
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-red-500">Gagal memuat data.</div>';
      }
    }, 500);
  });

  // Tutup hasil pencarian jika klik di luar
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
  document.getElementById("inboundProductWerehouseId").value =
    item.product_werehouse_id;
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

  // Validasi Field Wajib
  const pwId = getVal("inboundProductWerehouseId");
  const warehouseId = getVal("inboundWarehouse");
  const qty = getInt("inboundQty");
  const date = getVal("inboundDate");

  if (!warehouseId) {
    Swal.fire({
      icon: "warning",
      title: "Gudang Kosong",
      text: "Silakan pilih warehouse tujuan.",
    });
    return null;
  }
  if (!pwId) {
    Swal.fire({
      icon: "warning",
      title: "Produk Kosong",
      text: "Silakan cari dan pilih produk dari list.",
    });
    return null;
  }
  if (qty <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Qty Invalid",
      text: "Jumlah masuk harus lebih dari 0.",
    });
    return null;
  }
  if (!date) {
    Swal.fire({
      icon: "warning",
      title: "Tanggal Kosong",
      text: "Tanggal inbound wajib diisi.",
    });
    return null;
  }

  // Sesuaikan Key dengan Request JSON Anda
  const payload = {
    owner_id: owner_id,
    werehouse_id: parseInt(warehouseId),
    product_werehouse_id: parseInt(pwId),
    inbound_date: date,
    expired_date: getVal("inboundExpired") || null, // Boleh null jika tidak ada expired
    purchase_price: getInt("inboundPrice"),
    qty: qty,
    inv_number: getVal("inboundInv"),
    note: getVal("inboundNotes"),
  };

  console.log("Payload Inbound:", payload);
  return payload;
}

// --- FUNGSI SUBMIT (ADD / UPDATE) ---
async function submitInbound(method, id = "") {
  const payload = getInboundPayload();
  if (!payload) return; // Stop jika validasi gagal

  // Tentukan URL dan Endpoint
  // POST -> /add/product_inbound
  // PUT  -> /update/product_inbound/{id}
  const endpoint =
    method === "POST" ? "add/product_inbound" : `update/product_inbound/${id}`;
  const url = `${baseUrl}/${endpoint}`;

  const actionText = method === "POST" ? "disimpan" : "diperbarui";

  try {
    // Tampilkan loading state pada tombol (opsional)
    const btnId = method === "POST" ? "btnSaveInbound" : "btnUpdateInbound";
    const btn = document.getElementById(btnId);
    if (btn) btn.innerHTML = "Proses...";

    const response = await fetch(url, {
      method: method, // POST atau PUT
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // Kembalikan teks tombol
    if (btn)
      btn.innerHTML = method === "POST" ? "Simpan Stok Masuk" : "Update Data";

    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Data Inbound berhasil ${actionText}`,
      }).then(() => {
        // Redirect atau Refresh
        // loadModuleContent('inbound_list'); // Jika ada halaman list inbound
        // Atau reset form jika mode tambah
        if (method === "POST") location.reload();
      });
    } else {
      throw new Error(result.message || `Gagal ${actionText} data inbound.`);
    }
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: error.message || "Terjadi kesalahan koneksi.",
    });

    // Kembalikan teks tombol jika error
    const btnId = method === "POST" ? "btnSaveInbound" : "btnUpdateInbound";
    const btn = document.getElementById(btnId);
    if (btn)
      btn.innerHTML = method === "POST" ? "Simpan Stok Masuk" : "Update Data";
  }
}

// --- HELPER LOAD DROPDOWN (Reuse) ---
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
        option.textContent = item[labelField];
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error(e);
  }
}
