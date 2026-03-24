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
const DEBUG_LIMIT = 5

/* =========================
NORMALIZE
========================= */
function normalizeKey(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function normalize(val) {
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/* =========================
AI FIELD MAPPING
========================= */
const FIELD_PATTERNS = {
  sku: ["sku", "kodebarang", "kode", "itemcode"],
  article: ["article", "art", "artikel"],
  deskripsi: ["description", "deskripsi", "nama", "namabarang", "productname"],
  brand: ["brand", "merk"],
  harga_normal: ["harganormal", "normalprice", "price", "regprice"],
  harga_promo: ["hargapromo", "promoprice", "saleprice"],
  diskon: ["diskon", "discount"],
  fromdate: ["fromdate", "startdate", "tglmulai"],
  todate: ["todate", "enddate", "tglakhir"],
  acara: ["acara", "promo", "event"],
  division: ["division", "divisi"],
}

/* =========================
AI GET VALUE
========================= */
function getValAI(row, fieldName) {
  const map = {}

  for (let k in row) {
    map[normalizeKey(k)] = row[k]
  }

  const patterns = FIELD_PATTERNS[fieldName]
  if (!patterns) return ""

  for (let p of patterns) {
    const key = normalizeKey(p)

    for (let k in map) {
      if (k.includes(key)) {
        return map[k]
      }
    }
  }

  return ""
}

/* =========================
SCAN FILE (SUPER DEBUG)
========================= */
function getAllExcelFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      getAllExcelFiles(fullPath, fileList)
    } else {
      const ext = path.extname(file).toLowerCase()

      if (DEBUG) console.log("🔍 Scan:", file)

      if (file.startsWith("~$")) {
        if (DEBUG) console.log("⏭ Skip temp:", file)
        return
      }

      if ([".xlsx", ".xls", ".xlsm", ".csv"].includes(ext)) {
        fileList.push(fullPath)
      } else {
        if (DEBUG) console.log("⏭ Bukan excel:", file)
      }
    }
  })

  return fileList
}

/* =========================
VALIDASI FOLDER
========================= */
if (!fs.existsSync(INPUT_FOLDER)) {
  console.log("❌ Folder excel tidak ditemukan:", INPUT_FOLDER)
  process.exit()
}

const files = getAllExcelFiles(INPUT_FOLDER)

console.log("\n📊 TOTAL FILE TERDETEKSI:", files.length)

if (files.length === 0) {
  console.log("❌ Tidak ada file Excel ditemukan")
  process.exit()
}

let rawData = []
let sheetKosong = 0

/* =========================
LOAD FILE + DEBUG
========================= */
files.forEach((filePath, idx) => {
  try {
    console.log(`\n📄 [${idx + 1}] ${filePath}`)

    if (!fs.existsSync(filePath)) {
      console.log("❌ File tidak ditemukan")
      return
    }

    const workbook = XLSX.readFile(filePath)

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.log("⚠️ Tidak ada sheet")
      return
    }

    workbook.SheetNames.forEach(sheetName => {
      try {
        const sheet = workbook.Sheets[sheetName]

        if (!sheet) {
          console.log(`⚠️ Sheet rusak: ${sheetName}`)
          return
        }

        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

        if (json.length === 0) {
          sheetKosong++
          if (DEBUG) console.log(`⚠️ Sheet kosong: ${sheetName}`)
          return
        }

        console.log(`   ↳ Sheet: ${sheetName} (${json.length} data)`)

        if (DEBUG) {
          console.log("   ↳ Kolom:", Object.keys(json[0]))
          console.log("   ↳ Sample:", json[0])
        }

        const withSource = json.map(row => ({
          ...row,
          __source: path.basename(filePath),
          __sheet: sheetName
        }))

        rawData = rawData.concat(withSource)

      } catch (errSheet) {
        console.log(`❌ Error sheet: ${sheetName}`, errSheet.message)
      }
    })

  } catch (err) {
    console.log("❌ Gagal baca file:", filePath)
    console.log("   ↳ Error:", err.message)
  }
})

console.log("\n🔥 TOTAL DATA:", rawData.length)
console.log("⚠️ Sheet kosong:", sheetKosong)

/* =========================
MAPPING + VALIDASI
========================= */
let missingSku = 0
let missingArticle = 0
let missingDesc = 0
let debugShown = 0

const data = rawData.map((row, i) => {
  const item = {
    sku: getValAI(row, "sku"),
    article: getValAI(row, "article"),
    deskripsi: getValAI(row, "deskripsi"),
    brand: getValAI(row, "brand"),
    harga_normal: getValAI(row, "harga_normal"),
    harga_promo: getValAI(row, "harga_promo"),
    diskon: getValAI(row, "diskon"),
    fromdate: getValAI(row, "fromdate"),
    todate: getValAI(row, "todate"),
    acara: getValAI(row, "acara"),
    division: getValAI(row, "division"),
    source: row.__source,
    sheet: row.__sheet,
    _index: i
  }

  if (!item.sku) missingSku++
  if (!item.article) missingArticle++

  if (!item.deskripsi) {
    missingDesc++

    if (DEBUG && debugShown < DEBUG_LIMIT) {
      console.log("\n⚠️ DESKRIPSI KOSONG:")
      console.log("Raw:", row)
      console.log("Mapped:", item)
      debugShown++
    }
  }

  if (DEBUG && i < 5) {
    console.log("\n🧠 AI MAPPING PREVIEW:")
    console.log("Mapped:", item)
  }

  return item
})

console.log("\n📊 VALIDASI:")
console.log("SKU kosong:", missingSku)
console.log("Article kosong:", missingArticle)
console.log("Deskripsi kosong:", missingDesc)

/* =========================
SPLIT JSON
========================= */
if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER)
}

let fileCount = 0

for (let i = 0; i < data.length; i += SPLIT_SIZE) {
  const chunk = data.slice(i, i + SPLIT_SIZE)

  fs.writeFileSync(
    path.join(OUTPUT_FOLDER, `promo_${fileCount + 1}.json`),
    JSON.stringify(chunk)
  )

  fileCount++
}

console.log("\n📦 Split selesai:", fileCount)

/* =========================
INDEX
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
console.log("\n===================================")
console.log("✅ CONVERT SELESAI")
console.log("Total Data:", data.length)
console.log("Total File Excel:", files.length)
console.log("Sheet Kosong:", sheetKosong)
console.log("File JSON:", fileCount)
console.log("SKU Kosong:", missingSku)
console.log("Article Kosong:", missingArticle)
console.log("Deskripsi Kosong:", missingDesc)
console.log("===================================")