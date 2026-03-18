const fs = require("fs")
const path = require("path")
const xlsx = require("xlsx")

const INPUT_DIR = path.resolve("excel")
const OUTPUT_DIR = path.resolve("db")

const MAX_PER_FILE = 5000

if (!fs.existsSync(INPUT_DIR)) {
  console.log("❌ Folder excel tidak ditemukan")
  process.exit(0)
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR)
}

let allData = []

/* =========================
GET ALL EXCEL FILES
========================= */

function getAllExcelFiles(dir) {
  let results = []

  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      results = results.concat(getAllExcelFiles(filePath))
    } else if (file.endsWith(".xlsx")) {
      results.push(filePath)
    }
  })

  return results
}

/* =========================
UTILS
========================= */

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/\s+/g, "")
}

function findHeaderRow(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].join(" ").toLowerCase()

    if (
      row.includes("sku") ||
      row.includes("article") ||
      row.includes("desc") ||
      row.includes("description") ||
      row.includes("produk") ||
      row.includes("nama")
    ) {
      return i
    }
  }

  console.log("⚠️ Header tidak ketemu → pakai baris 0")
  return 0
}

/* =========================
PROSES FILE
========================= */

const excelFiles = getAllExcelFiles(INPUT_DIR)

console.log("📂 TOTAL FILE:", excelFiles.length)

excelFiles.forEach(filePath => {
  console.log("\n📄 FILE:", filePath)

  try {
    const workbook = xlsx.readFile(filePath)

    workbook.SheetNames.forEach(sheetName => {
      try {
        const sheet = workbook.Sheets[sheetName]
        const headerRow = findHeaderRow(sheet)

        const json = xlsx.utils.sheet_to_json(sheet, {
          range: headerRow,
          defval: ""
        })

        if (!json.length) {
          console.log(`⚠️ Kosong: ${sheetName}`)
          return
        }

        const cleaned = json
          .map(row => {
            let newRow = {}
            let rawRow = {}

            Object.keys(row).forEach(key => {
              const nk = normalizeKey(key)
              const value = row[key]

              // 🔹 SIMPAN SEMUA DATA ASLI
              rawRow[nk] = value

              // 🔹 FIELD PENTING (untuk search cepat)
              if (nk.includes("sku")) newRow.sku = String(value).trim()
              else if (nk.includes("article")) newRow.article = String(value).trim()
              else if (nk.includes("desc")) newRow.deskripsi = value
              else if (nk.includes("brand")) newRow.brand = value
              else if (nk.includes("normal")) newRow.harga_normal = value
              else if (nk.includes("promo")) newRow.harga_promo = value
              else if (nk.includes("mulai") || nk.includes("start")) newRow.mulai = value
              else if (nk.includes("akhir") || nk.includes("end")) newRow.akhir = value
              else if (nk.includes("divisi") || nk.includes("dept")) newRow.divisi = value
            })

            // 🔥 FULL TEXT SEARCH
            const searchText = Object.values(rawRow)
              .join(" ")
              .toLowerCase()

            return {
              ...newRow,
              raw: rawRow,       // semua data excel
              search: searchText,
              sheet: sheetName,
              source: path.basename(filePath)
            }
          })
          .filter(item =>
            item.sku ||
            item.article ||
            item.deskripsi ||
            Object.keys(item.raw).length > 0
          )

        console.log(`✔ Sheet: ${sheetName} → ${cleaned.length} data`)

        allData = allData.concat(cleaned)

      } catch (err) {
        console.log(`❌ Sheet error: ${sheetName}`, err.message)
      }
    })

  } catch (err) {
    console.log(`❌ File error: ${filePath}`, err.message)
  }
})

console.log("\n📊 TOTAL DATA:", allData.length)

/* =========================
HAPUS FILE LAMA
========================= */

fs.readdirSync(OUTPUT_DIR).forEach(file => {
  if (file.startsWith("promo_") || file.includes("_index")) {
    fs.unlinkSync(path.join(OUTPUT_DIR, file))
  }
})

/* =========================
SPLIT JSON
========================= */

let fileIndex = 1

for (let i = 0; i < allData.length; i += MAX_PER_FILE) {
  const chunk = allData.slice(i, i + MAX_PER_FILE)

  const fileName = `promo_${fileIndex}.json`
  const filePath = path.join(OUTPUT_DIR, fileName)

  fs.writeFileSync(filePath, JSON.stringify(chunk))

  console.log(`✅ Saved: ${fileName} (${chunk.length})`)

  fileIndex++
}

/* =========================
BUILD INDEX
========================= */

let skuIndex = {}
let articleIndex = {}

allData.forEach((item, i) => {
  if (item.sku) {
    const key = item.sku.toLowerCase()
    if (!skuIndex[key]) skuIndex[key] = []
    skuIndex[key].push(i)
  }

  if (item.article) {
    const key = item.article.toLowerCase()
    if (!articleIndex[key]) articleIndex[key] = []
    articleIndex[key].push(i)
  }
})

fs.writeFileSync(
  path.join(OUTPUT_DIR, "sku_index.json"),
  JSON.stringify(skuIndex)
)

fs.writeFileSync(
  path.join(OUTPUT_DIR, "article_index.json"),
  JSON.stringify(articleIndex)
)

console.log("✅ Index SKU & Article dibuat")

console.log("\n🎉 SELESAI TOTAL (DATA + INDEX SIAP)")