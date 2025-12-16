pagemodule = "Product";
setDataType("product_werehouse");

// --- INISIALISASI ---
if (window.detail_id) {
  document.getElementById("addButton").classList.add("hidden");
  document.getElementById("updateButton").classList.remove("hidden");
  document.getElementById("formTitle").innerText = "UPDATE PRODUK GUDANG";

  // Load data detail untuk Edit
  loadDetailWerehouse(window.detail_id);
} else {
  document.getElementById("updateButton").classList.add("hidden");
  document.getElementById("addButton").classList.remove("hidden");
  setupPriceInputEvents();

  // Load Dropdown Satuan (Unit)
  loadDropdown(
    "formUnit",
    `${baseUrl}/list/product_unit/${owner_id}`,
    "unit_id",
    "unit"
  );

  // Setup Pencarian Produk
  setupProductAutocomplete();
}

// --- FUNGSI LOAD DETAIL (EDIT MODE) ---
async function loadDetailWerehouse(id) {
  try {
    const response = await fetch(`${baseUrl}/detail/product_werehouse/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const result = await response.json();
    const data = result.detail;

    if (!data) throw new Error("Data detail tidak ditemukan");

    // 1. Isi Hidden ID
    document.getElementById("formProductId").value = data.product_id;

    // PENTING: Set Category ID ke hidden input agar nanti bisa dipakai jika user ganti material
    document.getElementById("formCategoryId").value = data.category_id;

    // 2. Isi Form Teks & Angka
    document.getElementById("formProduct").value = data.product || "";
    document.getElementById("formSKU").value = data.productcode || "";
    document.getElementById("formDescription").value = data.description || "";

    const formatNum = (num) => (num || 0).toLocaleString("id-ID");
    document.getElementById("formPrice").value = formatNum(data.sale_price);
    document.getElementById("formBerat").value = formatNum(data.weight);
    document.getElementById("formMinStock").value = formatNum(
      data.minimum_stock
    );
    document.getElementById("formMaxStock").value = formatNum(
      data.maximum_stock
    );

    // 3. Load Dropdown Unit (Load ulang untuk memastikan value terpilih)
    await loadDropdown(
      "formUnit",
      `${baseUrl}/list/product_unit/${owner_id}`,
      "unit_id",
      "unit"
    );
    document.getElementById("formUnit").value = data.unit_id;

    // 4. LOAD MATERIAL BERDASARKAN KATEGORI PRODUK
    // Ini otomatis memfilter material sesuai category_id dari data detail
    if (data.category_id) {
      await loadMaterialDropdown(data.category_id, data.material_id);
    }
  } catch (error) {
    console.error("Gagal load detail:", error);
    Swal.fire("Error", "Gagal memuat detail data", "error");
  }
}

// --- FUNGSI SAAT PRODUK DIPILIH DARI SEARCH (ADD MODE) ---
async function selectProduct(item) {
  console.log("Produk Terpilih:", item);

  // 1. Simpan Product ID & Category ID (Hidden)
  document.getElementById("formProductId").value = item.product_id;
  document.getElementById("formCategoryId").value = item.category_id; // <--- INI KUNCINYA

  // 2. Isi Field Visual (Readonly/Editable)
  document.getElementById("formProduct").value = item.product;
  document.getElementById("formSKU").value = item.productcode || item.barcode;

  document.getElementById("formPrice").value = (
    item.sale_price || 0
  ).toLocaleString("id-ID");
  document.getElementById("formBerat").value = (
    item.weight || 0
  ).toLocaleString("id-ID");

  // 3. Auto Select Unit jika ada datanya
  if (item.unit_id) {
    document.getElementById("formUnit").value = item.unit_id;
  }

  // 4. LOAD MATERIAL OTOMATIS
  // Langsung panggil list material berdasarkan category_id dari produk yg dipilih
  if (item.category_id) {
    await loadMaterialDropdown(item.category_id);
  } else {
    // Jaga-jaga jika produk master tidak punya kategori
    document.getElementById("formMaterial").innerHTML =
      '<option value="">Produk ini tidak memiliki kategori</option>';
  }
}

// --- FUNGSI LOAD MATERIAL (Dependency Dropdown) ---
async function loadMaterialDropdown(categoryId, selectedMaterialId = null) {
  const select = document.getElementById("formMaterial");

  if (!categoryId) return;

  try {
    select.innerHTML = `<option value="">Loading Material...</option>`;
    select.disabled = true;

    // Fetch Material sesuai Kategori
    const res = await fetch(
      `${baseUrl}/list/product_category_material/${categoryId}`,
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );
    const result = await res.json();
    const listData = result.listData || [];

    select.innerHTML = `<option value="">Pilih Material...</option>`;

    if (listData.length === 0) {
      select.innerHTML = `<option value="">Tidak ada material untuk kategori ini</option>`;
    } else {
      listData.forEach((mat) => {
        const option = document.createElement("option");
        option.value = mat.material_id;
        option.textContent = mat.material;

        // Auto select jika mode edit
        if (selectedMaterialId && mat.material_id == selectedMaterialId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }
    select.disabled = false;
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="">Gagal load material</option>`;
    select.disabled = false;
  }
}

// --- SISA KODE LAINNYA (Autocomplete, Submit, Helper Angka) TETAP SAMA ---
// (Pastikan fungsi setupProductAutocomplete, getDataPayload, submitData, dll tetap ada di bawah sini)

async function createData() {
  await submitData("POST");
}

// Dipanggil tombol "Update"
async function updateData() {
  // detail_id didapat dari global window.detail_id yang dipassing saat loadModuleContent
  await submitData("PUT", window.detail_id);
}

// --- FUNGSI AUTOCOMPLETE / PENCARIAN PRODUK ---
function setupProductAutocomplete() {
  const input = document.getElementById("formProduct");
  const resultsContainer = document.getElementById("productSearchResults");
  let debounceTimeout;

  input.addEventListener("input", function () {
    const keyword = this.value.trim();
    clearTimeout(debounceTimeout);

    if (keyword.length < 2) {
      resultsContainer.classList.add("hidden");
      return;
    }

    debounceTimeout = setTimeout(async () => {
      const searchUrl = `${baseUrl}/table/product_input/${owner_id}/1?seach=${encodeURIComponent(
        keyword
      )}`;

      try {
        resultsContainer.innerHTML =
          '<div class="p-2 text-gray-500 text-sm">Mencari...</div>';
        resultsContainer.classList.remove("hidden");

        const response = await fetch(searchUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });

        const result = await response.json();
        const products = (result.tableData || []).filter((item) =>
          item.product?.toLowerCase().includes(keyword.toLowerCase())
        );

        resultsContainer.innerHTML = "";

        if (products.length === 0) {
          resultsContainer.innerHTML =
            '<div class="p-2 text-gray-500 text-sm">Produk tidak ditemukan.</div>';
        } else {
          products.forEach((item) => {
            const div = document.createElement("div");
            div.className =
              "p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0";
            div.innerHTML = `
              <div class="font-bold text-sm text-gray-800">${item.product}</div>
              <div class="text-xs text-gray-500">SKU: ${item.productcode}</div>
            `;

            div.addEventListener("click", () => {
              selectProduct(item);
              resultsContainer.classList.add("hidden");
            });

            resultsContainer.appendChild(div);
          });
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 500);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add("hidden");
    }
  });
}

// --- GENERATE PAYLOAD ---
function getDataPayload() {
  const getVal = (id) => document.getElementById(id).value.trim();
  const getInt = (id) => parseInt(getVal(id).replace(/\./g, ""), 10) || 0;
  const getFloat = (id) =>
    parseFloat(getVal(id).replace(/\./g, "").replace(",", ".")) || 0;

  // Cek Session
  if (typeof werehouse_id === "undefined" || !werehouse_id) {
    Swal.fire({
      icon: "error",
      title: "Session Error",
      text: "Werehouse ID tidak ditemukan.",
    });
    return null;
  }

  // Validasi Input
  if (!getVal("formProductId")) {
    Swal.fire({
      icon: "warning",
      title: "Data Kosong",
      text: "Produk belum dipilih.",
    });
    return null;
  }
  if (!getVal("formMaterial")) {
    Swal.fire({
      icon: "warning",
      title: "Data Kosong",
      text: "Material belum dipilih.",
    });
    return null;
  }

  return {
    owner_id: owner_id,
    werehouse_id: werehouse_id,
    product_id: parseInt(getVal("formProductId")),
    material_id: parseInt(getVal("formMaterial")),
    unit_id: parseInt(getVal("formUnit")),

    productcode: getVal("formSKU"),
    product: getVal("formProduct"),
    description: getVal("formDescription"),

    sale_price: getInt("formPrice"),
    maximum_stock: getInt("formMaxStock"),
    minimum_stock: getInt("formMinStock"),
    weight: getFloat("formBerat"),
  };
}

async function submitData(method, id = "") {
  const payload = getDataPayload(); // Ambil data dari form
  if (!payload) return; // Stop jika validasi gagal

  // Tentukan URL berdasarkan Method
  // POST -> add/product_werehouse
  // PUT  -> update/product_werehouse/{id}
  let endpoint = "";
  if (method === "POST") {
    endpoint = "add/product_werehouse";
  } else {
    endpoint = `update/product_werehouse/${id}`;
  }

  const url = `${baseUrl}/${endpoint}`;
  const actionText = method === "POST" ? "ditambahkan" : "diperbarui";

  console.log(`Mengirim ${method} ke: ${url}`);
  console.log("Body:", payload);

  try {
    const response = await fetch(url, {
      method: method, // ⬅️ Pastikan ini 'POST' atau 'PUT' sesuai parameter
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      // Cek HTTP Status 200-299
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Data produk berhasil ${actionText}`,
      });
      loadModuleContent("product"); // Kembali ke list
    } else {
      throw new Error(result.message || `Gagal ${actionText} data`);
    }
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: error.message || `Terjadi kesalahan koneksi.`,
    });
  }
}

// --- HELPER FORMAT ANGKA ---
function setupPriceInputEvents() {
  ["formPrice", "formBerat", "formMinStock", "formMaxStock"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("input", () => formatCurrencyInput(input));
    }
  });
}

function formatCurrencyInput(input) {
  const raw = input.value.replace(/[^\d]/g, "");
  if (!raw) {
    input.value = "";
    return;
  }
  input.value = parseInt(raw, 10).toLocaleString("id-ID");
}

// Reuse fungsi loadDropdown Anda sebelumnya
async function loadDropdown(selectId, apiUrl, valueField, labelField) {
  const select = document.getElementById(selectId);
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
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
  } catch (error) {
    console.error(`Gagal memuat ${selectId}:`, error);
  }
}
