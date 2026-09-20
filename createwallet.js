const { ethers } = require("ethers");

const wallet = ethers.Wallet.createRandom();

console.log("==========================================");
console.log("🎉 ΝΕΟ ADMIN ΠΟΡΤΟΦΟΛΙ ΔΗΜΙΟΥΡΓΗΘΗΚΕ!");
console.log("==========================================");
console.log("📍 Public Address (Διεύθυνση):", wallet.address);
console.log("🔑 Private Key (Αντέγραψέ το):", wallet.privateKey);
console.log("==========================================");
console.log("1. Πάρε δωρεάν Sepolia ETH σε αυτή τη διεύθυνση.");
console.log("2. Βάλε το Private Key στα GitHub Secrets (ADMIN_PRIVATE_KEY).");
console.log("==========================================");
