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
TOKENIZER (PENTING!)
========================= */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .filter(w => w.length > 2) // buang kata pendek
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

    const sku = normalize(item.sku)
    const article = normalize(item.article)
    const name = normalize(item.deskripsi)

    // SKU
    if (sku) {
      if (!skuIndex[sku]) skuIndex[sku] = []
      skuIndex[sku].push(globalIndex)
    }

    // ARTICLE
    if (article) {
      if (!articleIndex[article]) articleIndex[article] = []
      articleIndex[article].push(globalIndex)
    }

    // 🔥 NAME INDEX (TOKEN)
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

console.log("✅ SELESAI")
console.log("Total data:", globalIndex)
console.log("SKU:", Object.keys(skuIndex).length)
console.log("ARTICLE:", Object.keys(articleIndex).length)
console.log("NAME:", Object.keys(nameIndex).length)