const fs = require("fs")
const path = require("path")

const DB_DIR = path.resolve("app/db")

let skuIndex = {}
let articleIndex = {}
let nameIndex = {}

let globalIndex = 0

/* =========================
NORMALIZE
========================= */
function normalize(val) {
  if (!val) return null
  return String(val).toLowerCase().trim()
}

/* =========================
TOKENIZER SUPER KUAT
========================= */
function tokenize(text) {
  if (!text) return []

  return text
    .toLowerCase()
    // pisahin huruf & angka
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    // hapus simbol
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean) // ambil semua (tidak dibatasi)
}

/* =========================
AMBIL FILE
========================= */
const files = fs.readdirSync(DB_DIR)
  .filter(f => f.startsWith("promo_") && f.endsWith(".json"))

console.log("📂 Total file:", files.length)

/* =========================
PROSES
========================= */
files.forEach(file => {
  const filePath = path.join(DB_DIR, file)
  const data = JSON.parse(fs.readFileSync(filePath))

  console.log(`📄 ${file} (${data.length})`)

  data.forEach(item => {

    // 🔥 HANDLE SEMUA VARIASI FIELD
    const sku = normalize(
      item.sku || item.SKU || item.kode || item.code
    )

    const article = normalize(
      item.article || item.Article || item.artikel
    )

    const name = normalize(
      item.deskripsi ||
      item.description ||
      item.desc ||
      item.nama ||
      item.produk
    )

    // SKU INDEX
    if (sku) {
      if (!skuIndex[sku]) skuIndex[sku] = []
      skuIndex[sku].push(globalIndex)
    }

    // ARTICLE INDEX
    if (article) {
      if (!articleIndex[article]) articleIndex[article] = []
      articleIndex[article].push(globalIndex)
    }

    // 🔥 NAME INDEX FULL TOKEN
    if (name) {
      const words = tokenize(name)

      words.forEach(word => {
        if (!nameIndex[word]) nameIndex[word] = []
        nameIndex[word].push(globalIndex)
      })
    }

    globalIndex++
  })
})

/* =========================
SAVE
========================= */
fs.writeFileSync(path.join(DB_DIR, "sku_index.json"), JSON.stringify(skuIndex))
fs.writeFileSync(path.join(DB_DIR, "article_index.json"), JSON.stringify(articleIndex))
fs.writeFileSync(path.join(DB_DIR, "name_index.json"), JSON.stringify(nameIndex))

console.log("✅ SELESAI TOTAL")
console.log("Total data:", globalIndex)
console.log("SKU:", Object.keys(skuIndex).length)
console.log("ARTICLE:", Object.keys(articleIndex).length)
console.log("NAME:", Object.keys(nameIndex).length)