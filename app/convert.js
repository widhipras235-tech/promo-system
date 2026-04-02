const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

/* =========================
CONFIG
========================= */
const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./db"
const SPLIT_SIZE = 5000
const DEBUG = true
const DEBUG_LIMIT = 5
const RETRY_PUSH = 3

/* =========================
HELPER GIT
========================= */
function gitPush(filePath, message) {
  for (let i = 1; i <= RETRY_PUSH; i++) {
    try {
      console.log(`🚀 Push attempt ${i}: ${path.basename(filePath)}`)

      execSync(`git add "${filePath}"`)
      execSync(`git commit -m "${message}"`)
      execSync(`git push origin main`, { stdio: "inherit" })

      console.log("✅ Push sukses:", path.basename(filePath))
      return true

    } catch (err) {
      console.log(`❌ Push gagal (attempt ${i})`)
      console.log("Error:", err.message)

      if (i === RETRY_PUSH) {
        console.log("🔥 Gagal total push:", path.basename(filePath))
        return false
      }

      console.log("⏳ Retry 3 detik...")
      execSync("sleep 3")
    }
  }
}

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
FIELD MAPPING
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
SCAN FILE
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

      if (file.startsWith("~$")) return

      if ([".xlsx", ".xls", ".xlsm", ".csv"].includes(ext)) {
        fileList.push(fullPath)
      }
    }
  })

  return fileList
}

/* =========================
VALIDASI
========================= */
if (!fs.existsSync(INPUT_FOLDER)) {
  console.log("❌ Folder excel tidak ditemukan")
  process.exit()
}

const files = getAllExcelFiles(INPUT_FOLDER)
console.log("📊 Total file:", files.length)

if (files.length === 0) {
  console.log("❌ Tidak ada file Excel")
  process.exit()
}

/* =========================
LOAD DATA
========================= */
let rawData = []

files.forEach((filePath, idx) => {
  try {
    console.log(`📄 [${idx + 1}] ${filePath}`)

    const workbook = XLSX.readFile(filePath)

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })

      if (json.length === 0) return

      const withSource = json.map(row => ({
        ...row,
        __source: path.basename(filePath),
        __sheet: sheetName
      }))

      rawData = rawData.concat(withSource)
    })

  } catch (err) {
    console.log("❌ Error baca file:", filePath, err.message)
  }
})

console.log("🔥 Total data:", rawData.length)

/* =========================
MAPPING
========================= */
const data = rawData.map((row, i) => ({
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
}))

/* =========================
SPLIT + AUTO PUSH
========================= */
if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER)
}

let fileCount = 0

for (let i = 0; i < data.length; i += SPLIT_SIZE) {
  const chunk = data.slice(i, i + SPLIT_SIZE)
  const fileName = `promo_${fileCount + 1}.json`
  const filePath = path.join(OUTPUT_FOLDER, fileName)

  try {
    fs.writeFileSync(filePath, JSON.stringify(chunk))
    console.log("📦 Created:", fileName)

    gitPush(filePath, `add ${fileName}`)

  } catch (err) {
    console.log("❌ Error write/push:", fileName, err.message)
  }

  fileCount++
}

/* =========================
INDEX + PUSH
========================= */
let skuIndex = {}
let articleIndex = {}

data.forEach((item, i) => {
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

const skuPath = path.join(OUTPUT_FOLDER, "sku_index.json")
const articlePath = path.join(OUTPUT_FOLDER, "article_index.json")

fs.writeFileSync(skuPath, JSON.stringify(skuIndex))
fs.writeFileSync(articlePath, JSON.stringify(articleIndex))

gitPush(skuPath, "add sku index")
gitPush(articlePath, "add article index")

console.log("===================================")
console.log("✅ SELESAI")
console.log("Total data:", data.length)
console.log("File JSON:", fileCount)
console.log("===================================")