pagemodule = "Product";
setDataType("product_werehouse");

// --- INISIALISASI ---
// 1. Setup format angka real-time

if (window.detail_id) {
  document.getElementById("addButton").classList.add("hidden");
  document.getElementById("updateButton").classList.remove("hidden");
  document.getElementById("formTitle").innerText = "UPDATE PRODUK GUDANG";
  loadDropdown(
    "formUnit",
    `${baseUrl}/list/product_unit/${owner_id}`,
    "unit_id",
    "unit"
  );

  // Panggil fungsi load detail khusus product_werehouse
  loadDetailWerehouse(window.detail_id);
} else {
  document.getElementById("updateButton").classList.add("hidden");
  document.getElementById("addButton").classList.remove("hidden");
  setupPriceInputEvents();

  // 2. Load Dropdown Satuan (Unit) langsung
  loadDropdown(
    "formUnit",
    `${baseUrl}/list/product_unit/${owner_id}`,
    "unit_id",
    "unit"
  );

  // 3. Setup Pencarian Produk
  setupProductAutocomplete();
}

async function loadDetailWerehouse(id) {
  try {
    // 1. Fetch data detail
    const response = await fetch(`${baseUrl}/detail/product_werehouse/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const result = await response.json();
    console.log("Data Detail:", result);

    // Asumsi response structure: { detail: { ...data } }
    const data = result.detail;

    if (!data) {
      throw new Error("Data detail tidak ditemukan");
    }

    // 2. Isi Form ID (Penting untuk Update)
    document.getElementById("formProductId").value = data.product_id;
    document.getElementById("formCategoryId").value = data.category_id;
    // (Optional) simpan id werehouse item jika perlu referensi lain, tapi biasanya update pakai ID di URL

    // 3. Isi Data Text & Angka
    document.getElementById("formProduct").value = data.product || "";
    document.getElementById("formSKU").value = data.productcode || "";
    document.getElementById("formDescription").value = data.description || "";

    document.getElementById("formPrice").value = (
      data.sale_price || 0
    ).toLocaleString("id-ID");
    document.getElementById("formBerat").value = (
      data.weight || 0
    ).toLocaleString("id-ID");
    document.getElementById("formMinStock").value = (
      data.minimum_stock || 0
    ).toLocaleString("id-ID");
    document.getElementById("formMaxStock").value = (
      data.maximum_stock || 0
    ).toLocaleString("id-ID");

    // 4. Set Dropdown Unit
    // Pastikan dropdown sudah terload, atau set value.
    const unitSelect = document.getElementById("formUnit");
    unitSelect.value = data.unit_id;

    // 5. Load & Set Dropdown Material
    // Kita harus load dropdown dulu berdasarkan category_id, baru set value material_id
    if (data.category_id) {
      await loadMaterialDropdown(data.category_id, data.material_id);
    }
  } catch (error) {
    console.error("Gagal load detail:", error);
    Swal.fire("Error", "Gagal memuat detail data", "error");
  }
}

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
        const products = result.tableData || [];

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

// --- FUNGSI SAAT PRODUK DIPILIH (AUTO-FILL & EDITABLE) ---
async function selectProduct(item) {
  console.log("Produk Terpilih:", item);

  // Isi form (Pre-fill), user TETAP BISA EDIT manual setelah ini
  document.getElementById("formProductId").value = item.product_id;
  document.getElementById("formCategoryId").value = item.category_id;

  document.getElementById("formProduct").value = item.product;
  document.getElementById("formSKU").value = item.productcode || item.barcode;

  document.getElementById("formPrice").value = (
    item.sale_price || 0
  ).toLocaleString("id-ID");
  document.getElementById("formBerat").value = (
    item.weight || 0
  ).toLocaleString("id-ID");

  // Set Unit Select (mencocokkan ID yang sudah diload sebelumnya)
  document.getElementById("formUnit").value = item.unit_id;

  // Load Material otomatis berdasarkan category_id produk
  if (item.category_id) {
    await loadMaterialDropdown(item.category_id);
  }
}

// --- FUNGSI LOAD MATERIAL ---
async function loadMaterialDropdown(categoryId, selectedMaterialId = null) {
  const select = document.getElementById("formMaterial");
  try {
    // Reset dulu
    select.innerHTML = `<option value="">Loading...</option>`;

    const res = await fetch(
      `${baseUrl}/list/product_category_material/${categoryId}`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      }
    );
    const result = await res.json();
    const listData = result.listData || [];

    select.innerHTML = `<option value="">Pilih Material...</option>`;

    listData.forEach((mat) => {
      const option = document.createElement("option");
      option.value = mat.material_id;
      option.textContent = mat.material;

      // Logika auto-select
      if (selectedMaterialId && mat.material_id == selectedMaterialId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="">Gagal load material</option>`;
  }
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
