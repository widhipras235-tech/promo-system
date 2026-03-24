const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

/* =========================
CONFIG
========================= */
const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./db"
const HASH_FILE = path.join(OUTPUT_FOLDER, "file_hash.json")
const SPLIT_SIZE = 5000
const DEBUG = true

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
AI FIELD MAPPING (SAMA PERSIS)
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

function getValAI(row, fieldName) {
  const map = {}
  for (let k in row) map[normalizeKey(k)] = row[k]

  const patterns = FIELD_PATTERNS[fieldName] || []

  for (let p of patterns) {
    const key = normalizeKey(p)
    for (let k in map) {
      if (k.includes(key)) return map[k]
    }
  }
  return ""
}

/* =========================
HASH FUNCTION
========================= */
function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath)
  return crypto.createHash("md5").update(buffer).digest("hex")
}

/* =========================
LOAD HASH LAMA
========================= */
let oldHash = {}
if (fs.existsSync(HASH_FILE)) {
  oldHash = JSON.parse(fs.readFileSync(HASH_FILE))
}

/* =========================
SCAN FILE
========================= */
function getAllExcelFiles(dir, list = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)

    if (stat.isDirectory()) {
      getAllExcelFiles(full, list)
    } else {
      if (file.startsWith("~$")) return

      const ext = path.extname(file).toLowerCase()
      if ([".xlsx",".xls",".xlsm",".csv"].includes(ext)) {
        list.push(full)
      }
    }
  })

  return list
}

const excelFiles = getAllExcelFiles(INPUT_FOLDER)

/* =========================
DETECT FILE BERUBAH
========================= */
let newHash = {}
let changedFiles = []

excelFiles.forEach(file => {
  const name = path.basename(file)
  const hash = getFileHash(file)

  newHash[name] = hash

  if (oldHash[name] !== hash) {
    changedFiles.push(file)
  }
})

console.log("📂 Total file:", excelFiles.length)
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

dbFiles.forEach(file => {
  DB = DB.concat(JSON.parse(fs.readFileSync(path.join(OUTPUT_FOLDER, file))))
})

/* =========================
HAPUS DATA FILE YANG DIUPDATE
========================= */
const changedNames = changedFiles.map(f => path.basename(f))

DB = DB.filter(item => !changedNames.includes(item.source))

/* =========================
PROCESS FILE BARU / UPDATE
========================= */
let newData = []

changedFiles.forEach(filePath => {
  console.log("📄 Update:", filePath)

  const workbook = XLSX.readFile(filePath)

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    json.forEach((row, i) => {
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
        source: path.basename(filePath),
        sheet: sheetName
      }

      newData.push(item)
    })
  })
})

/* =========================
MERGE
========================= */
const finalData = DB.concat(newData)

/* =========================
SPLIT (SAMA PERSIS)
========================= */
let fileCount = 0

for (let i = 0; i < finalData.length; i += SPLIT_SIZE) {
  const chunk = finalData.slice(i, i + SPLIT_SIZE)

  fs.writeFileSync(
    path.join(OUTPUT_FOLDER, `promo_${fileCount + 1}.json`),
    JSON.stringify(chunk)
  )

  fileCount++
}

/* =========================
INDEX (SAMA PERSIS)
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

fs.writeFileSync(
  path.join(OUTPUT_FOLDER, "sku_index.json"),
  JSON.stringify(skuIndex)
)

fs.writeFileSync(
  path.join(OUTPUT_FOLDER, "article_index.json"),
  JSON.stringify(articleIndex)
)

/* =========================
SAVE HASH
========================= */
fs.writeFileSync(HASH_FILE, JSON.stringify(newHash))

/* =========================
FINAL REPORT
========================= */
console.log("===================================")
console.log("✅ SMART UPDATE SELESAI")
console.log("Total Data:", finalData.length)
console.log("File Update:", changedFiles.length)
console.log("===================================")