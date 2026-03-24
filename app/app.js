const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")

/* =========================
CONFIG
========================= */
const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./db"
const SPLIT_SIZE = 5000
const DEBUG = true

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
SCAN FILE RECURSIVE
========================= */
function getAllExcelFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      getAllExcelFiles(fullPath, fileList)
    } else if (file.endsWith(".xlsx") || file.endsWith(".xls")) {
      fileList.push(fullPath)
    }
  })

  return fileList
}

/* =========================
SAFE GET (HANDLE KOLOM BEDA)
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
LOAD SEMUA FILE
========================= */
if (!fs.existsSync(INPUT_FOLDER)) {
  console.log("❌ Folder excel tidak ditemukan:", INPUT_FOLDER)
  process.exit()
}

const files = getAllExcelFiles(INPUT_FOLDER)

if (files.length === 0) {
  console.log("❌ Tidak ada file Excel ditemukan")
  process.exit()
}

console.log("📂 Total file ditemukan:", files.length)

let rawData = []

files.forEach((filePath, idx) => {
  try {
    console.log(`📄 [${idx + 1}] Baca: ${filePath}`)

    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]

    if (DEBUG) {
      console.log("   ↳ Sheet:", sheetName)
    }

    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    console.log(`   ↳ Data: ${json.length}`)

    if (DEBUG && json.length > 0) {
      console.log("   ↳ Kolom:", Object.keys(json[0]))
    }

    const withSource = json.map(row => ({
      ...row,
      __source: path.basename(filePath)
    }))

    rawData = rawData.concat(withSource)

  } catch (err) {
    console.log("❌ Gagal baca file:", filePath)
    console.log("   ↳ Error:", err.message)
  }
})

console.log("🔥 TOTAL DATA GABUNGAN:", rawData.length)

/* =========================
MAP DATA + VALIDASI
========================= */
let missingSku = 0
let missingArticle = 0
let missingDesc = 0

const data = rawData.map((row, i) => {
  const item = {
    sku: getVal(row, ["SKU", "sku", "Kode", "KODE"]),
    article: getVal(row, ["ARTICLE", "article", "ART"]),
    deskripsi: getVal(row, ["DESKRIPSI", "deskripsi", "NAMA", "NAMA BARANG"]),
    brand: getVal(row, ["BRAND", "brand"]),
    harga_normal: getVal(row, ["HARGA_NORMAL", "harga_normal"]),
    harga_promo: getVal(row, ["HARGA_PROMO", "harga_promo"]),
    diskon: getVal(row, ["DISKON", "diskon"]),
    fromdate: getVal(row, ["FROMDATE", "fromdate"]),
    todate: getVal(row, ["TODATE", "todate"]),
    acara: getVal(row, ["ACARA", "acara"]),
    source: row.__source || "unknown",
    _index: i
  }

  // DEBUG VALIDASI
  if (!item.sku) {
    missingSku++
    if (DEBUG && missingSku <= 5) {
      console.log(`⚠️ SKU kosong row ${i}`, row)
    }
  }

  if (!item.article) missingArticle++
  if (!item.deskripsi) missingDesc++

  return item
})

console.log("⚠️ SKU kosong:", missingSku)
console.log("⚠️ Article kosong:", missingArticle)
console.log("⚠️ Deskripsi kosong:", missingDesc)

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
BUILD INDEX
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
VALIDASI INDEX
========================= */
if (DEBUG) {
  const sampleKey = Object.keys(skuIndex)[0]
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
console.log("Total File Excel:", files.length)
console.log("File JSON:", fileCount)
console.log("SKU Kosong:", missingSku)
console.log("Article Kosong:", missingArticle)
console.log("===================================")