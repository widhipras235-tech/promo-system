const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")

/* =========================
CONFIG
========================= */
const FILE_EXCEL = "./excel/data.xlsx"
const OUTPUT_FOLDER = "./db"
const SPLIT_SIZE = 5000

const DEBUG = true // 🔥 aktifkan debug

/* =========================
NORMALIZE (WAJIB SAMA APP.JS)
========================= */
function normalize(val) {
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/* =========================
SAFE GET (ANTI BEDA KOLOM)
========================= */
function getVal(row, keys) {
  for (let key of keys) {
    if (row[key] !== undefined && row[key] !== "") {
      return row[key]
    }
  }
  return ""
}

/* =========================
READ EXCEL
========================= */
if (!fs.existsSync(FILE_EXCEL)) {
  console.log("❌ File Excel tidak ditemukan:", FILE_EXCEL)
  process.exit()
}

const workbook = XLSX.readFile(FILE_EXCEL)

if (DEBUG) {
  console.log("📄 Sheet ditemukan:", workbook.SheetNames)
}

const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" })

console.log("Total data:", rawData.length)

/* =========================
CEK STRUKTUR KOLOM
========================= */
if (DEBUG && rawData.length > 0) {
  console.log("🧠 Sample kolom:", Object.keys(rawData[0]))
}

/* =========================
MAP DATA + VALIDASI
========================= */
let errorCount = 0
let missingSku = 0
let missingArticle = 0

const data = rawData.map((row, i) => {
  const item = {
    sku: getVal(row, ["SKU", "sku", "Kode", "KODE"]),
    article: getVal(row, ["ARTICLE", "article", "ART"]),
    deskripsi: getVal(row, ["DESKRIPSI", "deskripsi", "NAMA"]),
    brand: getVal(row, ["BRAND", "brand"]),
    harga_normal: getVal(row, ["HARGA_NORMAL", "harga_normal"]),
    harga_promo: getVal(row, ["HARGA_PROMO", "harga_promo"]),
    diskon: getVal(row, ["DISKON", "diskon"]),
    fromdate: getVal(row, ["FROMDATE", "fromdate"]),
    todate: getVal(row, ["TODATE", "todate"]),
    acara: getVal(row, ["ACARA", "acara"]),
    source: path.basename(FILE_EXCEL),
    _index: i
  }

  // 🔥 DEBUG VALIDASI
  if (!item.sku) {
    missingSku++
    if (DEBUG && missingSku <= 5) {
      console.log(`⚠️ SKU kosong di row ${i}`, row)
    }
  }

  if (!item.article) {
    missingArticle++
  }

  if (!item.deskripsi) {
    errorCount++
  }

  return item
})

console.log("⚠️ SKU kosong:", missingSku)
console.log("⚠️ Article kosong:", missingArticle)
console.log("⚠️ Deskripsi kosong:", errorCount)

/* =========================
SPLIT FILE
========================= */
if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER)
}

let fileCount = 0

for (let i = 0; i < data.length; i += SPLIT_SIZE) {
  const chunk = data.slice(i, i + SPLIT_SIZE)

  const fileName = `promo_${fileCount + 1}.json`

  fs.writeFileSync(
    path.join(OUTPUT_FOLDER, fileName),
    JSON.stringify(chunk)
  )

  fileCount++
}

console.log("📦 Split selesai:", fileCount, "file")

/* =========================
BUILD INDEX + VALIDASI
========================= */
let skuIndex = {}
let articleIndex = {}

let duplicateSku = 0

data.forEach((item, i) => {
  const sku = normalize(item.sku)
  const article = normalize(item.article)

  if (sku) {
    if (!skuIndex[sku]) skuIndex[sku] = []
    else duplicateSku++

    skuIndex[sku].push(i)
  }

  if (article) {
    if (!articleIndex[article]) articleIndex[article] = []
    articleIndex[article].push(i)
  }
})

console.log("🔁 SKU duplicate:", duplicateSku)

/* =========================
CEK INDEX ERROR
========================= */
if (DEBUG) {
  let sampleKey = Object.keys(skuIndex)[0]
  console.log("🔍 Sample SKU index:", sampleKey, "=>", skuIndex[sampleKey])
}

/* =========================
SAVE INDEX
========================= */
fs.writeFileSync(
  path.join(OUTPUT_FOLDER, "sku_index.json"),
  JSON.stringify(skuIndex)
)

fs.writeFileSync(
  path.join(OUTPUT_FOLDER, "article_index.json"),
  JSON.stringify(articleIndex)
)

console.log("📑 Index selesai dibuat")

/* =========================
FINAL REPORT
========================= */
console.log("===================================")
console.log("✅ CONVERT SELESAI")
console.log("Total Data:", data.length)
console.log("File JSON:", fileCount)
console.log("SKU Kosong:", missingSku)
console.log("Article Kosong:", missingArticle)
console.log("===================================")