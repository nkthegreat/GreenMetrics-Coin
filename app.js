// ==========================================
// 1. BLOCKCHAIN SETTINGS (GREENMETRICS COIN)
// ==========================================
// ΒΑΛΕ ΕΔΩ ΤΟ ΝΕΟ CONTRACT ADDRESS ΑΠΟ ΤΟ deploy.js
const CONTRACT_ADDRESS = "0x095bA7DfB795769FfbEf9B3c7DC2A53688627e73"; 
const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const CONTRACT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

let appWallet = null;

// ==========================================
// 2. ΣΥΣΤΗΜΑ LOGIN / ΔΗΜΙΟΥΡΓΙΑ ΠΟΡΤΟΦΟΛΙΟΥ
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const savedKey = localStorage.getItem("gmc_user_private_key");
  if (savedKey) {
    autoLogin(savedKey);
  }
});

function createNewWallet() {
  try {
    const newWallet = ethers.Wallet.createRandom();
    
    const msg = `Το νέο σου πορτοφόλι δημιουργήθηκε!\n\nΔιεύθυνση: ${newWallet.address}\n\n⚠️ ΠΡΟΣΟΧΗ: Αντίγραψε και αποθήκευσε το παρακάτω Private Key με ασφάλεια:\n\n${newWallet.privateKey}`;
    
    alert(msg);
    autoLogin(newWallet.privateKey);
  } catch (err) {
    console.error("Wallet Creation Error:", err);
    alert("Σφάλμα κατά τη δημιουργία πορτοφολιού. Ελέγξτε την κονσόλα.");
  }
}

function loginWithKey() {
  const inputEl = document.getElementById("privateKeyInput");
  const key = inputEl ? inputEl.value.trim() : "";
  
  if (!key) {
    alert("Παρακαλώ εισάγετε ένα Private Key.");
    return;
  }
  
  autoLogin(key);
}

function autoLogin(privateKey) {
  try {
    appWallet = new ethers.Wallet(privateKey);
    localStorage.setItem("gmc_user_private_key", privateKey);
    
    const loginScreen = document.getElementById("loginScreen");
    const mainApp = document.getElementById("mainApp");
    
    if (loginScreen) loginScreen.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("hidden");
    
    initAppUI();
  } catch (err) {
    alert("Μη έγκυρο Private Key. Ελέγξτε το και δοκιμάστε ξανά.");
    console.error("Login Error:", err);
  }
}

function logout() {
  if(confirm("Είσαι σίγουρος ότι θέλεις να αποσυνδεθείς; Βεβαιώσου ότι έχεις κρατήσει το Private Key σου!")) {
    localStorage.removeItem("gmc_user_private_key");
    appWallet = null;
    location.reload();
  }
}

// ==========================================
// 3. UI INIT, DISPLAY ADDRESSES & QR CODE
// ==========================================
function initAppUI() {
  if (!appWallet) return;

  const citizenAddrEl = document.getElementById("citizenAddress");
  if (citizenAddrEl) citizenAddrEl.innerText = appWallet.address;

  const merchantAddrEl = document.getElementById("merchantAddress");
  if (merchantAddrEl) merchantAddrEl.innerText = appWallet.address;

  const qrContainer = document.getElementById("merchantQrcode");
  if (qrContainer && typeof QRCode !== "undefined") {
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: appWallet.address,
      width: 180,
      height: 180,
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  refreshBalance();
}

// ==========================================
// 4. ΑΝΑΓΝΩΣΗ ΥΠΟΛΟΙΠΟΥ (GMC BALANCE)
// ==========================================
async function refreshBalance() {
  const balElCitizen = document.getElementById("citizenBalance");
  const balElMerchant = document.getElementById("merchantBalance");
  
  if (balElCitizen) balElCitizen.innerText = "Φόρτωση...";
  if (balElMerchant) balElMerchant.innerText = "Φόρτωση...";

  if (!appWallet) return;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const balance = await contract.balanceOf(appWallet.address);
    const formatted = ethers.formatEther(balance);
    const displayBal = `${parseFloat(formatted).toFixed(2)} GMC`;

    if (balElCitizen) balElCitizen.innerText = displayBal;
    if (balElMerchant) balElMerchant.innerText = displayBal;
  } catch (err) {
    console.error("RPC Error:", err);
    if (balElCitizen) balElCitizen.innerText = "Σφάλμα RPC";
    if (balElMerchant) balElMerchant.innerText = "Σφάλμα RPC";
  }
}

// ==========================================
// 5. QR CODE SCANNER & ΑΜΕΣΗ ΠΛΗΡΩΜΗ
// ==========================================
let html5QrScanner = null;

async function startCitizenScanner() {
  const amountInput = document.getElementById("transferAmount");
  const amount = amountInput ? amountInput.value.trim() : "";

  if (!amount || parseFloat(amount) <= 0) {
    alert("Παρακαλώ εισάγετε πρώτα το ποσό GMC προς πληρωμή!");
    if (amountInput) amountInput.focus();
    return;
  }

  const readerEl = document.getElementById("reader");
  const btnScan = document.getElementById("btnScanQR");

  if (html5QrScanner && html5QrScanner.isScanning) {
    await html5QrScanner.stop();
    if (readerEl) readerEl.classList.add("hidden");
    if (btnScan) btnScan.innerText = "📷 Σκανάρισμα QR & Άμεση Πληρωμή";
    return;
  }

  if (readerEl) readerEl.classList.remove("hidden");
  if (btnScan) btnScan.innerText = "❌ Ακύρωση Κάμερας";

  html5QrScanner = new Html5Qrcode("reader");

  try {
    await html5QrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decodedText) => {
        let cleanAddress = decodedText.trim();
        if (cleanAddress.includes(":")) cleanAddress = cleanAddress.split(":")[1];
        if (cleanAddress.includes("@")) cleanAddress = cleanAddress.split("@")[0];

        if (cleanAddress.startsWith("0x") && cleanAddress.length === 42) {
          await html5QrScanner.stop();
          if (readerEl) readerEl.classList.add("hidden");
          if (btnScan) btnScan.innerText = "📷 Σκανάρισμα QR & Άμεση Πληρωμή";

          await executeTransfer(cleanAddress, amount);
        }
      },
      () => {}
    );
  } catch (err) {
    console.error("Camera error:", err);
    alert("Δεν δόθηκε πρόσβαση στην κάμερα. Ελέγξτε τα δικαιώματα του browser.");
    if (readerEl) readerEl.classList.add("hidden");
    if (btnScan) btnScan.innerText = "📷 Σκανάρισμα QR & Άμεση Πληρωμή";
  }
}

// ==========================================
// 5.1. ΧΕΙΡΟΚΙΝΗΤΗ ΠΛΗΡΩΜΗ ΜΕ ΕΠΙΚΟΛΛΗΣΗ ΔΙΕΥΘΥΝΣΗΣ (Manual Pay)
// ==========================================
async function payManual() {
  const recipientInput = document.getElementById("manualRecipient");
  const amountInput = document.getElementById("transferAmount");
  
  const recipient = recipientInput ? recipientInput.value.trim() : "";
  const amount = amountInput ? amountInput.value.trim() : "";

  // Έλεγχος εγκυρότητας διεύθυνσης Ethereum
  if (!recipient || !recipient.startsWith("0x") || recipient.length !== 42) {
    alert("Παρακαλώ εισάγετε μια έγκυρη διεύθυνση πορτοφολιού (0x...).");
    return;
  }

  // Έλεγχος ποσού
  if (!amount || parseFloat(amount) <= 0) {
    alert("Παρακαλώ εισάγετε ένα έγκυρο ποσό GMC προς πληρωμή!");
    return;
  }

  await executeTransfer(recipient, amount);
}

// ==========================================
// 6. ON-CHAIN ΜΕΤΑΦΟΡΑ GMC
// ==========================================
async function executeTransfer(recipient, amount) {
  const btnScan = document.getElementById("btnScanQR");
  const statusEl = document.getElementById("txStatus");

  if (btnScan) btnScan.disabled = true;
  if (statusEl) {
    statusEl.classList.remove("hidden");
    statusEl.innerText = `⏳ Αποστολή ${amount} GMC...`;
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = appWallet.connect(provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const amountWei = ethers.parseEther(amount.toString());
    const tx = await contract.transfer(recipient, amountWei);

    if (statusEl) statusEl.innerText = `🚀 Η συναλλαγή στάλθηκε! Αναμονή επιβεβαίωσης...`;
    await tx.wait();

    alert(`🎉 Επιτυχής πληρωμή ${amount} GMC!`);
    const transferAmountInput = document.getElementById("transferAmount");
    const manualRecipientInput = document.getElementById("manualRecipient");
    
    if (transferAmountInput) transferAmountInput.value = "";
    if (manualRecipientInput) manualRecipientInput.value = "";
    
    refreshBalance();
  } catch (err) {
    console.error("Transfer Error:", err);
    alert(`Σφάλμα μεταφοράς: ${err.reason || err.message}\n(Μήπως δεν έχετε ETH για τα Gas fees;)`);
  } finally {
    if (btnScan) btnScan.disabled = false;
    if (statusEl) statusEl.classList.add("hidden");
  }
}

// ==========================================
// 7. TABS NAVIGATION
// ==========================================
function showTab(tabName) {
  ['citizen', 'merchant'].forEach((t) => {
    const tab = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
    if (tab) tab.classList.add("hidden");
    if (btn) {
      btn.classList.replace("text-green-700", "text-gray-500");
      btn.classList.remove("border-b-2", "border-green-700");
    }
  });

  const activeTab = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  const activeBtn = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Btn`);

  if (activeTab) activeTab.classList.remove("hidden");
  if (activeBtn) {
    activeBtn.classList.replace("text-gray-500", "text-green-700");
    activeBtn.classList.add("border-b-2", "border-green-700");
  }
}
