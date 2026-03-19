const fs = require("fs")
const path = require("path")

const DB_DIR = path.resolve("app/db") // sesuaikan lokasi kamu
const MAX_PER_FILE = 5000

let skuIndex = {}
let articleIndex = {}

let globalIndex = 0

/* =========================
GET ALL JSON FILE
========================= */

const files = fs.readdirSync(DB_DIR)
  .filter(f => f.startsWith("promo_") && f.endsWith(".json"))

console.log("📂 Total file:", files.length)

/* =========================
PROCESS FILE
========================= */

files.forEach(file => {
  const filePath = path.join(DB_DIR, file)
  const data = JSON.parse(fs.readFileSync(filePath))

  console.log(`📄 Processing ${file} (${data.length})`)

  data.forEach((item, i) => {

    // SKU
    if (item.sku) {
      const key = String(item.sku).toLowerCase()

      if (!skuIndex[key]) skuIndex[key] = []
      skuIndex[key].push(globalIndex)
    }

    // ARTICLE
    if (item.article) {
      const key = String(item.article).toLowerCase()

      if (!articleIndex[key]) articleIndex[key] = []
      articleIndex[key].push(globalIndex)
    }

    globalIndex++
  })
})

/* =========================
SAVE FILE
========================= */

fs.writeFileSync(
  path.join(DB_DIR, "sku_index.json"),
  JSON.stringify(skuIndex)
)

fs.writeFileSync(
  path.join(DB_DIR, "article_index.json"),
  JSON.stringify(articleIndex)
)

console.log("✅ SELESAI!")
console.log("Total index:", globalIndex)