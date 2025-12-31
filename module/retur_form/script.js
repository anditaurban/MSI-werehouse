pagemodule = "Retur";
setDataType("retur");

// --- 1. INISIALISASI ---

// Jalankan Setup Autocomplete untuk Pelanggan & Produk
setupPelangganAutocomplete();
setupProductAutocomplete();

// --- 2. CEK MODE ---
if (window.detail_id) {
  // MODE EDIT
  const btnSave = document.getElementById("btnSaveRetur");
  const btnUpdate = document.getElementById("btnUpdateRetur");
  const title = document.getElementById("formTitle");

  if (btnSave) btnSave.classList.add("hidden");
  if (btnUpdate) btnUpdate.classList.remove("hidden");
  if (title) title.innerText = "UPDATE DATA RETUR";

  loadReturDetail(window.detail_id);
} else {
  // MODE TAMBAH
  const btnSave = document.getElementById("btnSaveRetur");
  const btnUpdate = document.getElementById("btnUpdateRetur");
  if (btnUpdate) btnUpdate.classList.add("hidden");
  if (btnSave) btnSave.classList.remove("hidden");

  const dateInput = document.getElementById("returDate");
  if (dateInput) dateInput.valueAsDate = new Date();
}

// =========================================================
// FITUR 1: AUTOCOMPLETE PELANGGAN (MITRA) - REVISED
// Endpoint: {{baseUrl}}/table/client/{{owner_id}}/1?search=
// =========================================================
function setupPelangganAutocomplete() {
  const input = document.getElementById("returPelangganSearch");
  const resultsContainer = document.getElementById("returPelangganResults");
  let debounceTimeout;

  if (!input || !resultsContainer) return;

  input.addEventListener("input", function () {
    const keyword = this.value.trim();
    clearTimeout(debounceTimeout);

    if (keyword.length < 1) {
      resultsContainer.classList.add("hidden");
      return;
    }

    debounceTimeout = setTimeout(async () => {
      // DEBUG: Cek URL di Console
      const searchUrl = `${baseUrl}/table/client/4427/1?search=${encodeURIComponent(
        keyword
      )}`;
      console.log("🔍 Fetching URL:", searchUrl);

      try {
        resultsContainer.classList.remove("hidden");
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-gray-500">Mencari mitra...</div>';

        const response = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });

        const result = await response.json();
        console.log("📩 API Response:", result); // Lihat isi result di Console

        // Akses array data (sesuai JSON Anda: result.tableData)
        const listData = result.tableData || [];

        resultsContainer.innerHTML = "";

        if (listData.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-sm text-gray-500">Mitra tidak ditemukan.</div>';
        } else {
          listData.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-purple-50 cursor-pointer border-b text-sm";

            // --- PERBAIKAN MAPPING KEY SESUAI JSON POSTMAN ---
            // "nama": "MUHAMMAD AKBAR" -> item.nama
            // "no_membership": "CUS-01752" -> item.no_membership
            // "alamat": "Kecamatan Ciampea" -> item.alamat

            const displayName = item.nama || item.client_name || "Tanpa Nama";
            const displayCode = item.no_membership || "-";
            const displayAddr = item.alamat || "";

            div.innerHTML = `
                            <div class="font-bold text-gray-800">${displayName}</div>
                            <div class="text-xs text-gray-500">${displayCode} | ${displayAddr}</div>
                        `;

            div.addEventListener("click", () => {
              // --- PERBAIKAN SET VALUE ---
              // "pelanggan_id": 1752 -> item.pelanggan_id

              document.getElementById("returPelangganId").value =
                item.pelanggan_id;
              document.getElementById("returPelangganSearch").value =
                displayName;

              resultsContainer.classList.add("hidden");
              console.log("✅ Pelanggan Selected:", item);
            });

            resultsContainer.appendChild(div);
          });
        }
      } catch (e) {
        console.error("❌ Error Fetching Client:", e);
        resultsContainer.innerHTML =
          '<div class="p-2 text-red-500 text-xs">Gagal memuat data. Cek Console.</div>';
      }
    }, 500);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add("hidden");
    }
  });
}

// =========================================================
// FITUR 2: AUTOCOMPLETE PRODUK
// Endpoint: {{baseUrl}}/table/product_werehouse/{{werehouseid}}/1?seach=
// =========================================================
function setupProductAutocomplete() {
  const input = document.getElementById("returProductSearch");
  const resultsContainer = document.getElementById("returProductResults");
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
      // Note: Parameter endpoint pakai 'seach' (typo dari backend)
      const searchUrl = `${baseUrl}/table/product_werehouse/${
        user.werehouse_id
      }/1?seach=${encodeURIComponent(keyword)}`;
      try {
        resultsContainer.classList.remove("hidden");
        resultsContainer.innerHTML =
          '<div class="p-2 text-sm text-gray-500">Mencari produk...</div>';

        const response = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        const result = await response.json();
        const products = result.tableData || [];

        resultsContainer.innerHTML = "";
        if (products.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-sm text-gray-500">Tidak ditemukan.</div>';
        } else {
          products.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-purple-50 cursor-pointer border-b text-sm";
            div.innerHTML = `
                            <strong>${item.product}</strong><br>
                            <span class="text-xs text-gray-500">SKU: ${
                              item.productcode || "-"
                            } | Stok: ${item.stock || 0}</span>
                        `;
            div.addEventListener("click", () => {
              // Set ID ke Hidden Input
              document.getElementById("returProductWerehouseId").value =
                item.product_werehouse_id;
              // Set Nama ke Search Box
              document.getElementById("returProductSearch").value =
                item.product;

              // Info Stok
              const stockInfo = document.getElementById("returCurrentStock");
              if (stockInfo) stockInfo.innerText = item.stock || 0;

              document.getElementById("returQty").focus();
              resultsContainer.classList.add("hidden");
            });
            resultsContainer.appendChild(div);
          });
        }
      } catch (e) {
        resultsContainer.innerHTML =
          '<div class="p-2 text-red-500">Error load data.</div>';
      }
    }, 500);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target))
      resultsContainer.classList.add("hidden");
  });
}

// --- 4. GENERATE PAYLOAD (DENGAN WEREHOUSE_ID) ---
function getReturPayload() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };

  const getInt = (id) => {
    const val = getVal(id).replace(/\./g, "");
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  };

  // 1. Validasi Session (PENTING)
  if (typeof user === "undefined" || !user.werehouse_id) {
    Swal.fire({
      icon: "error",
      title: "Session Error",
      text: "ID Gudang (user.werehouse_id) tidak terbaca. Silakan refresh halaman.",
    });
    return null;
  }

  const pwId = getVal("returProductWerehouseId");
  const pelangganId = getVal("returPelangganId");
  const date = getVal("returDate");
  const qty = getInt("returQty");
  let notes = getVal("returNotes");

  // 2. Validasi Input Form
  if (!date) {
    Swal.fire("Warning", "Tanggal wajib diisi.", "warning");
    return null;
  }
  if (!pelangganId) {
    Swal.fire("Warning", "Pilih Mitra/Pelanggan dari list.", "warning");
    return null;
  }
  if (!pwId) {
    Swal.fire("Warning", "Pilih Produk dari list.", "warning");
    return null;
  }
  if (qty <= 0) {
    Swal.fire("Warning", "Qty retur harus lebih dari 0.", "warning");
    return null;
  }

  if (notes === "") notes = "-";

  // 3. Construct JSON (Request Body)
  const payload = {
    owner_id: parseInt(owner_id),
    werehouse_id: parseInt(user.werehouse_id), // <-- SUDAH DITAMBAHKAN
    pelanggan_id: parseInt(pelangganId),
    product_werehouse_id: parseInt(pwId),
    return_date: date,
    qty: qty,
    notes: notes,
  };

  console.log("📦 Payload Retur (Fixed):", JSON.stringify(payload));
  return payload;
}

// --- 5. SUBMIT FUNCTION (DEBUG MODE) ---
async function submitRetur(method, id = "") {
  const payload = getReturPayload();
  if (!payload) return;

  const endpoint =
    method === "POST" ? "add/product_return" : `update/product_return/${id}`;

  // Definisi tombol & text default
  const btnId = method === "POST" ? "btnSaveRetur" : "btnUpdateRetur";
  const btn = document.getElementById(btnId);
  let originalText = "Simpan";

  // Set Loading
  if (btn) {
    originalText = btn.innerText;
    btn.innerText = "Proses...";
    btn.disabled = true;
  }

  try {
    console.log(`🚀 Mengirim ${method} ke: ${baseUrl}/${endpoint}`);

    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`, // Pastikan Token Valid
      },
      body: JSON.stringify(payload),
    });

    // Coba baca response text dulu (untuk jaga-jaga jika bukan JSON)
    const responseText = await response.text();
    let result = {};

    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Server return non-JSON:", responseText);
      throw new Error("Respon server tidak valid (Bukan JSON).");
    }

    console.log("📩 Server Response:", result);

    // Reset Tombol
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
    }

    // --- LOGIKA SUKSES ---
    // Server Anda mengembalikan 200 OK dengan body: { "data": { "message": "...", "return_id": 1 } }
    // Tapi kadang error 500 pun mengirim JSON structure serupa. Kita cek return_id.

    if (response.ok || (result.data && result.data.return_id)) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: result.data?.message || "Data retur berhasil disimpan.",
      }).then(() => {
        loadModuleContent("retur");
      });
    } else {
      // Jika error message dari server ada
      throw new Error(
        result.message ||
          result.data?.message ||
          "Terjadi kesalahan pada server (500)."
      );
    }
  } catch (e) {
    console.error("❌ Submit Error:", e);

    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: e.message,
    });

    // Kembalikan tombol jika error
    if (btn) {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }
}
// --- 6. LOAD DETAIL (EDIT) - FIX MAPPING ---
async function loadReturDetail(id) {
  try {
    const res = await fetch(`${baseUrl}/detail/product_return/${id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    const result = await res.json();
    const data = result.detail;

    console.log("📩 Detail Response:", data); // Cek isi data di Console

    if (!data) throw new Error("Data tidak ditemukan");

    // Helper Set Value
    const setVal = (elmId, val) => {
      const el = document.getElementById(elmId);
      if (el) el.value = val;
    };

    // 1. Mapping Data Transaksi
    setVal("returDate", data.return_date);
    setVal("returQty", data.qty);

    // FIX: Ambil dari 'notes' (jamak), jika kosong string kosong
    setVal("returNotes", data.notes || data.note || "");

    // 2. Mapping Produk
    setVal("returProductWerehouseId", data.product_werehouse_id);
    setVal("returProductSearch", data.product || ""); // Key 'product'

    // 3. Mapping Pelanggan (MITRA)
    // Masalah: JSON Anda TIDAK punya field ini.
    // Solusi: Kode ini mencoba baca berbagai kemungkinan key.
    // Jika Backend belum nambah, field ini akan tetap kosong.

    const plgId = data.pelanggan_id || data.client_id || "";
    const plgName =
      data.pelanggan_name || data.customer_name || data.client_name || "";

    setVal("returPelangganId", plgId);
    setVal("returPelangganSearch", plgName);

    if (!plgId) {
      console.warn("⚠️ Data Pelanggan tidak ditemukan di response API.");
    }
  } catch (e) {
    console.error("Load Detail Error:", e);
    Swal.fire("Error", "Gagal memuat detail data.", "error");
  }
}
