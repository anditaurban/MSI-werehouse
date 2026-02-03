document.getElementById("logout").addEventListener("click", function () {
  Swal.fire({
    title: "Yakin ingin logout?",
    text: "Anda harus login kembali untuk mengakses aplikasi.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e3342f",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Ya, Logout",
    cancelButtonText: "Batal",
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.clear();
      localStorage.clear();
      Swal.fire({
        icon: "success",
        title: "Berhasil logout!",
        showConfirmButton: false,
        timer: 1200,
      }).then(() => {
        window.location.href = "login.html";
      });
    }
  });
});

if (owner_id || user_id || level || username) {
  // const welcomeMessageSpan = document.getElementById('nameUser');
  // welcomeMessageSpan.textContent = `Hi, ${nama} 👋`;
}

expandSidebar();
loadBadge();

function collapseSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  document
    .querySelectorAll("#sidebar .menu-text")
    .forEach((el) => el.classList.add("hidden"));
  sidebar.classList.add("w-16");
  sidebar.classList.remove("w-64");
  mainContent.classList.add("md:ml-16");
  mainContent.classList.remove("md:ml-64");
}

function expandSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  document
    .querySelectorAll("#sidebar .menu-text")
    .forEach((el) => el.classList.remove("hidden"));
  sidebar.classList.remove("w-16");
  sidebar.classList.add("w-64");
  mainContent.classList.remove("md:ml-16");
  mainContent.classList.add("md:ml-64");
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("bg-gray-900");

  document
    .querySelectorAll(
      "header, main, aside, footer, #mainCard, #userDisplay, #dynamicModule",
    )
    .forEach((el) => {
      el?.classList.toggle("bg-white");
      el?.classList.toggle("bg-gray-800");
      el?.classList.toggle("text-gray-900");
      el?.classList.toggle("text-white");
    });

  const mode = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", mode);
}

const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("mainContent");
const desktopToggle = document.getElementById("desktopToggle");
desktopToggle?.addEventListener("click", () => {
  if (window.innerWidth < 768) {
    sidebar.classList.toggle("hidden");
  } else {
    sidebar.classList.contains("w-16") ? expandSidebar() : collapseSidebar();
  }
});

document
  .getElementById("toggleTheme")
  ?.addEventListener("click", toggleDarkMode);
document
  .getElementById("mobileToggleTheme")
  ?.addEventListener("click", toggleDarkMode);

const dropdowns = [
  { toggle: "userDropdownToggle", menu: "userDropdown" },
  { toggle: "notificationToggle", menu: "notificationDropdown" },
  { toggle: "apiIndicatorToggle", menu: "apiIndicatorDropdown" },
];

// Pasang event click toggle
dropdowns.forEach(({ toggle, menu }) => {
  const btn = document.getElementById(toggle);
  const dropdown = document.getElementById(menu);

  btn?.addEventListener("click", () => {
    dropdown?.classList.toggle("hidden");
  });
});

// Klik di luar → tutup semua dropdown
document.addEventListener("click", (e) => {
  dropdowns.forEach(({ toggle, menu }) => {
    const btn = document.getElementById(toggle);
    const dropdown = document.getElementById(menu);

    if (!btn?.contains(e.target) && !dropdown?.contains(e.target)) {
      dropdown?.classList.add("hidden");
    }
  });
});

// Mobile menu dropdown
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const mobileMenuDropdown = document.getElementById("mobileMenuDropdown");

mobileMenuToggle?.addEventListener("click", () => {
  mobileMenuDropdown?.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (
    !mobileMenuToggle?.contains(e.target) &&
    !mobileMenuDropdown?.contains(e.target)
  ) {
    mobileMenuDropdown?.classList.add("hidden");
  }
});

async function loadBadge() {
  const userData = localStorage.getItem("user");
  const userObj = userData ? JSON.parse(userData) : null;
  const warehouse_id = userObj?.warehouse_id;
  const owner_id = userObj?.owner_id; // Pastikan owner_id juga diambil

  if (!warehouse_id) return;

  const badgeConfigs = [
    { id: "salesQtyBadge", endpoint: `counting/sales_pending/${owner_id}` },
    {
      id: "receiptQtyBadge",
      endpoint: `counting/sales_receipt_unvalid/${owner_id}`,
    },
    {
      id: "packageQtyBadge",
      endpoint: `counting/warehouse_package_unpack/${warehouse_id}`,
    },
    {
      id: "shipmentQtyBadge",
      endpoint: `counting/warehouse_package_unshipped/${warehouse_id}`,
    },
  ];

  for (const config of badgeConfigs) {
    try {
      const response = await fetch(`${baseUrl}/${config.endpoint}`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      const data = await response.json();
      // Paksa menjadi angka untuk memastikan validasi > 0 benar
      const total = Number(data?.countData?.total || 0);

      const badge = document.getElementById(config.id);
      if (badge) {
        if (total > 0) {
          badge.textContent = total;
          badge.style.setProperty("display", "inline-block", "important");
        } else {
          // Jika 0 atau null, sembunyikan total
          badge.style.setProperty("display", "none", "important");
        }
      }
    } catch (error) {
      console.error(`Error pada ${config.id}:`, error);
      // Sembunyikan badge jika terjadi error koneksi agar tidak muncul angka 0 palsu
      document.getElementById(config.id).style.display = "none";
    }
  }
}

console.log(userRole);
// Panggil fungsi saat halaman dimuat

const allMenus = {
  dashboard: { icon: "📊", label: "Dashboard" },
  sales: { icon: "🧾", label: "Faktur", badge: true },
  receipt: { icon: "💵", label: "Penerimaan", badge: true },
  package: { icon: "📦", label: "Pengepakan", badge: true },
  shipment: { icon: "🚚", label: "Pengiriman", badge: true },
  product: { icon: "📋", label: "Produk" },
  opname: { icon: "🗳️", label: "Opname" },
  inbound: { icon: "📥", label: "Produk Masuk" },
  outbound: { icon: "📤", label: "Produk Keluar" },
  mutasi: { icon: "🔄", label: "Mutasi" },
  retur: { icon: "🔂", label: "Retur" },
  warehouse: { icon: "🏭", label: "Gudang" },
  contact: { icon: "👤", label: "Pelanggan" },
  report: { icon: "📈", label: "Laporan" },
  employee: { icon: "🧑‍💼", label: "Karyawan" },
  user: { icon: "👥", label: "Pengguna" },
  setting: { icon: "⚙️", label: "Pengaturan" },
};

// const roleMenus = {
//   superadmin: Object.keys(allMenus),
//   sales: [
//     "sales",
//     "receipt",
//     "package",
//     "shipment",
//     "contact",
//     "opname",
//     "inbound",
//     "outbound",
//   ],
//   finance: ["sales", "receipt", "product", "warehouse", "contact"],
//   shipping: ["package", "shipment"],
//   packing: ["package", "shipment"],
// };

const createMenuItem = (key, menu) => {
  const badgeSpan = menu.badge
    ? `<span id="${key}QtyBadge" class="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">0</span>`
    : "";
  return `
    <a href="#" onclick="loadModuleContent('${key}')" class="flex items-center gap-2 py-2 px-2 hover:bg-blue-200 rounded-lg">
      <span>${menu.icon}</span> 
      <span class="menu-text">${menu.label}</span>
      ${badgeSpan}
    </a>`;
};

function renderSidebar() {
  const menuContainer = document.getElementById("sidebarMenu");
  menuContainer.innerHTML = "";

  menuContainer.innerHTML = `
      <!-- DASHBOARD (DISABLED) -->
      
        ${createMenuItem("package", allMenus.package)}
        ${createMenuItem("shipment", allMenus.shipment)}
        ${createMenuItem("product", allMenus.product)}
        ${createMenuItem("outbound", allMenus.outbound)}
      

      
    `;
  // Role selain superadmin
  allowed.forEach((key) => {
    if (allMenus[key]) {
      menuContainer.innerHTML += createMenuItem(key, allMenus[key]);
    }
  });
}
function renderHeader() {
  const breadcrumb = document.getElementById("breadcrumb");
  const pageTitle = document.getElementById("pageTitle");

  // 1. AMBIL NAMA MODULE & BERSIHKAN
  // Kita pastikan ambil variable global, ubah ke huruf kecil, dan hapus spasi di ujung
  let rawModule = typeof pagemodule !== "undefined" ? pagemodule : "dashboard";
  let currentModule = rawModule.toLowerCase().trim();

  // DEBUG (Cek console jika masih error)
  console.log(
    "DEBUG BREADCRUMB: Module dideteksi sebagai -> [" + currentModule + "]",
  );

  // 2. DAFTAR PEMETAAN (PARENT MAPPING)
  // Kunci (kiri) harus sama persis dengan hasil console log di atas
  const menuMap = {
    // --- SALES ---
    quotation: "Sales",
    invoice: "Sales",
    receipt: "Sales",

    // --- FINANCE (Sesuai Screenshot Anda) ---
    // Versi pakai SPASI (Sesuai Console Log Anda)
    "internal expenses": "Finance",
    "cash flow": "Finance",
    "project finance dashboard": "Finance",
    "account payable": "Finance",
    "account receivable": "Finance",

    // Versi pakai UNDERSCORE (Jaga-jaga)
    internal_expenses: "Finance",
    report_finance: "Finance",
    account_payable: "Finance",
    account_receiveable: "Finance",
    expenses: "Finance",

    // --- ADMIN ---
    user: "Admin",
    users: "Admin",
    client: "Admin",
    clients: "Admin",
    employee: "Admin",
    employees: "Admin",
    vendor: "Admin",
    vendors: "Admin",
    setting: "Admin",
    settings: "Admin",
  };

  // Cek Parent
  const parentName = menuMap[currentModule];

  // Template Icon Panah
  const arrowIcon = `
    <svg class="w-4 h-4 mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  `;

  // Helper format teks (Huruf besar di awal kata)
  const formatName = (str) => {
    if (!str) return "";
    return str.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  let html = "";

  // 3. LOGIKA RENDER UTAMA
  if (parentName) {
    // JIKA PUNYA PARENT (Contoh: Finance > Internal Expenses)
    html += `<span class="text-gray-500 hover:text-gray-700 cursor-default">${parentName}</span>`;
    html += arrowIcon;
    html += `<span class=" text-gray-500">${formatName(currentModule)}</span>`;
  } else {
    // JIKA TIDAK PUNYA PARENT (Contoh: Dashboard)
    html += `<span class="text-gray-500">${formatName(currentModule)}</span>`;
  }

  // 4. SUB-PAGE (Jika ada level 3)
  if (typeof subpagemodule !== "undefined" && subpagemodule) {
    html += arrowIcon;
    html += `<span class="text-gray-500">${formatName(subpagemodule)}</span>`;
  }

  // UPDATE DOM
  if (breadcrumb) breadcrumb.innerHTML = html;

  if (pageTitle) {
    // Judul halaman diambil dari subpage (jika ada) atau module utama
    const titleText =
      typeof subpagemodule !== "undefined" && subpagemodule
        ? subpagemodule
        : rawModule;
    pageTitle.textContent = titleText.replace(/_/g, " ").toUpperCase();
  }
}

renderSidebar();

checkApiStatus();
setInterval(loadBadge, 1000);
setInterval(checkApiStatus, 10000);
