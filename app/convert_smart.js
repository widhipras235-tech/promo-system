const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

/* =========================
CONFIG (SAMA)
========================= */
const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./db"
const HASH_FILE = path.join(OUTPUT_FOLDER, "file_hash.json")
const SPLIT_SIZE = 5000
const DEBUG = true

/* =========================
NORMALIZE (SAMA)
========================= */
function normalize(val) {
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/* =========================
GETVAL (SAMA PERSIS)
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
HASH
========================= */
function getHash(file) {
  return crypto
    .createHash("md5")
    .update(fs.readFileSync(file))
    .digest("hex")
}

/* =========================
SCAN FILE (FIX)
========================= */
function getFiles(dir, list = []) {
  const files = fs.readdirSync(dir)

  files.forEach(f => {
    const full = path.join(dir, f)
    const stat = fs.statSync(full)

    if (stat.isDirectory()) {
      getFiles(full, list)
    } else {
      if (f.startsWith("~$")) return

      const ext = path.extname(f).toLowerCase()
      if ([".xlsx", ".xls"].includes(ext)) {
        list.push(full)
      }
    }
  })

  return list
}

/* =========================
LOAD HASH
========================= */
let oldHash = {}
if (fs.existsSync(HASH_FILE)) {
  oldHash = JSON.parse(fs.readFileSync(HASH_FILE))
}

const files = getFiles(INPUT_FOLDER)

console.log("📂 Total file:", files.length)

/* =========================
CEK PERUBAHAN
========================= */
let newHash = {}
let changedFiles = []

files.forEach(f => {
  const name = path.basename(f)
  const hash = getHash(f)

  newHash[name] = hash

  if (oldHash[name] !== hash) {
    changedFiles.push(f)
  }
})

console.log("🔄 File berubah:", changedFiles.length)

if (changedFiles.length === 0) {
  console.log("✅ Tidak ada perubahan")
  process.exit()
}

/* =========================
LOAD DATA LAMA
========================= */
let DB = []
const dbFiles = fs.readdirSync(OUTPUT_FOLDER).filter(f => f.startsWith("promo_"))

dbFiles.forEach(f => {
  DB = DB.concat(JSON.parse(fs.readFileSync(path.join(OUTPUT_FOLDER, f))))
})

/* =========================
HAPUS DATA LAMA PER FILE
========================= */
const changedNames = changedFiles.map(f => path.basename(f))

DB = DB.filter(item => !changedNames.includes(item.source))

/* =========================
PROCESS FILE (SAMA PERSIS)
========================= */
let rawData = []

changedFiles.forEach((filePath, idx) => {
  try {
    console.log(`📄 Update: ${filePath}`)

    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // ⚠️ SAMA

    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    const withSource = json.map(row => ({
      ...row,
      __source: path.basename(filePath)
    }))

    rawData = rawData.concat(withSource)

  } catch (err) {
    console.log("❌ Error:", filePath, err.message)
  }
})

/* =========================
MAP DATA (SAMA PERSIS)
========================= */
const startIndex = DB.length

const newData = rawData.map((row, i) => ({
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
  _index: startIndex + i
}))

/* =========================
MERGE
========================= */
const finalData = DB.concat(newData)

/* =========================
SPLIT (RESET FILE)
========================= */
const oldSplit = fs.readdirSync(OUTPUT_FOLDER).filter(f => f.startsWith("promo_"))
oldSplit.forEach(f => fs.unlinkSync(path.join(OUTPUT_FOLDER, f)))

let fileCount = 0

for (let i = 0; i < finalData.length; i += SPLIT_SIZE) {
  fs.writeFileSync(
    path.join(OUTPUT_FOLDER, `promo_${fileCount + 1}.json`),
    JSON.stringify(finalData.slice(i, i + SPLIT_SIZE))
  )
  fileCount++
}

/* =========================
INDEX (SAMA)
========================= */
let skuIndex = {}
let articleIndex = {}

finalData.forEach((item, i) => {
  const sku = normalize(item.sku)
  const article = normalize(item.article)

  if (sku) {
    if (!skuIndex[sku]) skuIndex[sku] = []
    skuIndex[sku].push(i)
  }

  if (article) {
    if (!articleIndex[article]) articleIndex[article] = []
    articleIndex[article].push(i)
  }
})

fs.writeFileSync(path.join(OUTPUT_FOLDER, "sku_index.json"), JSON.stringify(skuIndex))
fs.writeFileSync(path.join(OUTPUT_FOLDER, "article_index.json"), JSON.stringify(articleIndex))

/* =========================
SAVE HASH
========================= */
fs.writeFileSync(HASH_FILE, JSON.stringify(newHash))

/* =========================
FINAL
========================= */
console.log("===================================")
console.log("✅ SMART UPDATE FIXED")
console.log("Total Data:", finalData.length)
console.log("File Update:", changedFiles.length)
console.log("===================================")