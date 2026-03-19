const fs = require("fs")
const path = require("path")

const DB_DIR = path.resolve("app/db")

let skuIndex = {}
let articleIndex = {}
let nameIndex = {}

let globalIndex = 0

let debugNoSKU = 0
let debugNoArticle = 0

/* =========================
NORMALIZE
========================= */
function normalize(val) {
  if (!val) return null
  return String(val).toLowerCase().trim()
}

/* =========================
CLEAN KEY
========================= */
function cleanKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/* =========================
FIND VALUE SUPER FLEXIBLE
========================= */
function findValue(obj, keywords) {
  for (let key in obj) {
    const clean = cleanKey(key)

    for (let word of keywords) {
      if (clean.includes(word)) {
        return obj[key]
      }
    }
  }
  return null
}

/* =========================
TOKENIZER SUPER KUAT
========================= */
function tokenize(text) {
  if (!text) return []

  return text
    .toLowerCase()
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

/* =========================
GET FILE
========================= */
const files = fs.readdirSync(DB_DIR)
  .filter(f => f.startsWith("promo_") && f.endsWith(".json"))

console.log("📂 Total file:", files.length)

/* =========================
PROCESS
========================= */
files.forEach(file => {
  const filePath = path.join(DB_DIR, file)
  const data = JSON.parse(fs.readFileSync(filePath))

  console.log(`📄 ${file} (${data.length})`)

  data.forEach(item => {

    const sku = normalize(
      findValue(item, ["sku", "barcode", "kode"])
    )

    const article = normalize(
      findValue(item, ["article", "artikel", "code"])
    )

    const name = normalize(
      findValue(item, ["desc", "nama", "produk", "description"])
    )

    // DEBUG
    if (!sku) {
      debugNoSKU++
      if (debugNoSKU < 5) console.log("❌ SKU missing:", item)
    }

    if (!article) {
      debugNoArticle++
      if (debugNoArticle < 5) console.log("❌ ARTICLE missing:", item)
    }

    // INDEX SKU
    if (sku) {
      if (!skuIndex[sku]) skuIndex[sku] = []
      skuIndex[sku].push(globalIndex)
    }

    // INDEX ARTICLE
    if (article) {
      if (!articleIndex[article]) articleIndex[article] = []
      articleIndex[article].push(globalIndex)
    }

    // INDEX NAME
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

/* =========================
REPORT
========================= */
console.log("\n🎯 RESULT:")
console.log("Total data:", globalIndex)
console.log("SKU:", Object.keys(skuIndex).length)
console.log("ARTICLE:", Object.keys(articleIndex).length)
console.log("NAME:", Object.keys(nameIndex).length)

console.log("\n🚨 DEBUG:")
console.log("Tanpa SKU:", debugNoSKU)
console.log("Tanpa ARTICLE:", debugNoArticle)