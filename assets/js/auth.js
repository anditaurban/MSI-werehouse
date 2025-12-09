// === Konstanta API dan Token ===
const app_id = 17;
const token = "DpacnJf3uEQeM7HN";
const otpUrl = "https://devngomset.katib.cloud/login_pic";
const loginUrl = "https://devngomset.katib.cloud/otp/login_pic";
const profileUrl = "https://prod.katib.cloud/profile";
const companyUrl = "https://prod.katib.cloud/company";
const expiredTime = new Date().getTime() + 7 * 24 * 60 * 60 * 1000; // 7 hari

// === Elemen DOM ===
const phoneInput = document.getElementById("phone");
const sendOtpButton = document.getElementById("send-otp");
const messageOTP = document.getElementById("messageOTP");
const loadingOTP = document.getElementById("loadingOTP");
const otpLabel = document.querySelector('label[for="otp"]');
const otpInputContainer = document.getElementById("otp").parentNode;

// === Variabel Global ===
let popupTimeout;
let currentPopup;
let currentUser = null;

// === Validasi Input Nomor Telepon ===
phoneInput?.addEventListener("input", function () {
  const inputValue = this.value.trim();
  const isValid = /^\d+$/.test(inputValue);

  if (inputValue === "") {
    sendOtpButton.disabled = true;
    sendOtpButton.classList.replace("btn-info", "btn-secondary");
    messageOTP.textContent = "";
  } else if (!isValid) {
    sendOtpButton.disabled = true;
    sendOtpButton.classList.replace("btn-info", "btn-secondary");
    messageOTP.textContent = "Mohon masukkan hanya angka untuk nomor Whatsapp.";
    messageOTP.style.color = "red";
  } else {
    sendOtpButton.disabled = false;
    sendOtpButton.classList.replace("btn-secondary", "btn-info");
    messageOTP.textContent = "";
  }

  clearOTPInput();
});

// === Kirim OTP ===
sendOtpButton?.addEventListener("click", async function () {
  const phoneNumber = phoneInput?.value.trim();
  if (!phoneNumber) {
    messageOTP.textContent = "Nomor Whatsapp tidak boleh kosong";
    messageOTP.style.color = "red";
    return;
  }

  showLoading();
  sendOtpButton.disabled = true;

  try {
    const response = await fetch(`${otpUrl}/${phoneNumber}`, {
      method: "GET",
    });
    const result = await response.json();

    if (!response.ok) {
      messageOTP.textContent = "Nomor Whatsapp tidak terdaftar!";
      messageOTP.style.color = "red";
    } else if (result?.data) {
      currentUser = { phone: phoneNumber };
      messageOTP.textContent = "OTP telah dikirim ke WhatsApp anda!";
      messageOTP.style.color = "green";
      showOTPInput();
      phoneInput.readOnly = true;
    } else {
      messageOTP.textContent = "Gagal mengirim OTP. Silahkan coba lagi.";
      messageOTP.style.color = "red";
    }
  } catch (error) {
    console.error("Error fetching OTP:", error);
    messageOTP.textContent = "Gagal mengirim OTP. Silahkan coba lagi.";
    messageOTP.style.color = "red";
  } finally {
    hideLoading();
    sendOtpButton.disabled = false;
  }
});

// === Buat Input OTP Dinamis ===
function createOTPInputs() {
  const existing = document.getElementById("otp-inputs");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "otp-inputs";
  container.style.cssText =
    "display: flex; justify-content: space-between; margin: 10px 0 20px";

  for (let i = 0; i < 6; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.className = "otp-input";
    input.style.cssText =
      "width: 40px; height: 40px; font-size: 24px; text-align: center; margin: 0 5px";
    input.dataset.index = i;

    input.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "");
      if (this.value && this.nextElementSibling) {
        this.nextElementSibling.focus();
      } else {
        validateFullOTP();
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !this.value && this.previousElementSibling) {
        this.previousElementSibling.focus();
      }
    });

    input.addEventListener("paste", function (e) {
      const data = e.clipboardData.getData("Text");
      if (data.length === 6) {
        for (let j = 0; j < 6; j++) {
          if (container.children[j]) {
            container.children[j].value = data[j];
          }
        }
        validateFullOTP();
      }
      e.preventDefault();
    });

    container.appendChild(input);
  }

  otpInputContainer.appendChild(container);
}

// === Validasi OTP Lengkap ===
async function validateFullOTP() {
  // Menggabungkan value dari input OTP
  const otp = [...document.querySelectorAll(".otp-input")]
    .map((i) => i.value)
    .join("");

  // Validasi format OTP (6 digit angka)
  if (otp.length === 6 && /^\d+$/.test(otp)) {
    showLoading();
    try {
      // 1. Request Login / Verifikasi OTP
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, otp }),
      });

      const result = await response.json();
      console.log("API Response:", result);
      hideLoading();

      // 2. Cek apakah status success
      if (response.ok && result.status === "success") {
        // --- SIMPAN DATA KE LOCAL STORAGE ---

        // A. Simpan Raw Response sebagai "user" (Session utama)
        // Catatan: Pastikan 'expiredTime' adalah variabel yang valid di kode Anda
        localStorage.setItem("user", JSON.stringify(result));

        // B. Mapping untuk "user_detail"
        // Kita ambil data user dari response login tanpa perlu fetch ulang
        const userDetailData = {
          user_id: result.user_id,
          name: result.name,
          role_id: result.type_id,
          role_name: result.type,
          // Tambahkan field lain jika perlu
        };
        localStorage.setItem("user_detail", JSON.stringify(userDetailData));

        // C. Mapping untuk "company"
        // Kita ambil data company & warehouse dari response login
        const companyData = {
          owner_id: result.owner_id,
          company_name: result.company,
          company_address: result.company_address,
          company_phone: result.company_phone,
          logo_url: result.logo_url,
          werehouse_id: result.werehouse_id,
          werehouse_name: result.werehouse,
          werehouse_address: result.werehouse_address,
          // Tambahkan field lain jika perlu
        };
        localStorage.setItem("company", JSON.stringify(companyData));

        // 3. Redirect
        window.location.href = "index.html";
      } else {
        // Handle jika OTP salah atau status bukan success
        // showPopup(result.message || 'OTP tidak valid.', false);
        console.warn(result.message);
        clearOTPInput();
      }
    } catch (error) {
      console.error("Error validating OTP:", error);
      // showPopup('Terjadi kesalahan koneksi.', false);
      hideLoading();
    }
  } else {
    // showPopup('OTP harus berupa 6 digit angka.', false);
    console.warn("Format OTP salah");
  }
}

// === Utilitas ===
function lockInputs(lock) {
  phoneInput.readOnly = lock;
  document.querySelectorAll(".otp-input").forEach((i) => (i.readOnly = lock));
  sendOtpButton.disabled = lock;
}

function clearOTPInput() {
  document.querySelectorAll(".otp-input").forEach((input) => {
    input.value = "";
    input.readOnly = false;
  });
  phoneInput.readOnly = false;
  sendOtpButton.disabled = false;
}

function showOTPInput() {
  if (otpLabel) otpLabel.style.display = "block";
  createOTPInputs();
  document.querySelector(".otp-input")?.focus();
}

function showPopup(message, isSuccess = true) {
  hidePopup();
  const popup = document.createElement("div");
  popup.className = isSuccess ? "popup-card success" : "popup-card error";
  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add("show"), 10);
  currentPopup = popup;
  popupTimeout = setTimeout(hidePopup, 3000);
}

function hidePopup() {
  if (currentPopup) {
    clearTimeout(popupTimeout);
    currentPopup.classList.remove("show");
    setTimeout(() => currentPopup?.remove(), 300);
    currentPopup = null;
  }
}

function showLoading() {
  if (loadingOTP) {
    loadingOTP.style.display = "block";
  }
}

function hideLoading() {
  if (loadingOTP) {
    loadingOTP.style.display = "none";
  }
}
