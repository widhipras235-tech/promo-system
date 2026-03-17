import fs from "fs"
import path from "path"
import xlsx from "xlsx"

const INPUT_DIR = "./excel"
const OUTPUT_DIR = "./db"

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR)
}

let allData = []

/* =========================
SCAN SEMUA FILE (RECURSIVE)
========================= */
function getAllExcelFiles(dir) {
  let results = []

  const list = fs.readdirSync(dir)

  list.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllExcelFiles(filePath))
    } else {
      if (file.endsWith(".xlsx")) {
        results.push(filePath)
      }
    }
  })

  return results
}

/* =========================
NORMALIZE HEADER
========================= */
function normalizeKey(key) {
  return String(key).toLowerCase().replace(/\s+/g, "")
}

/* =========================
CARI HEADER
========================= */
function findHeaderRow(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].join(" ").toLowerCase()

    if (
      row.includes("sku") ||
      row.includes("article") ||
      row.includes("deskripsi")
    ) {
      return i
    }
  }

  return 0
}

/* =========================
PROSES FILE
========================= */
const excelFiles = getAllExcelFiles(INPUT_DIR)

console.log("FILES FOUND:", excelFiles)

excelFiles.forEach(filePath => {
  console.log("📄 Processing:", filePath)

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

        if (!json.length) return

        const cleaned = json.map(row => {
          let newRow = {}

          Object.keys(row).forEach(key => {
            const nk = normalizeKey(key)

            if (nk.includes("sku")) newRow.sku = row[key]
            else if (nk.includes("article")) newRow.article = row[key]
            else if (nk.includes("desc")) newRow.deskripsi = row[key]
            else if (nk.includes("brand")) newRow.brand = row[key]
            else if (nk.includes("normal")) newRow.harga_normal = row[key]
            else if (nk.includes("promo")) newRow.harga_promo = row[key]
            else if (nk.includes("mulai")) newRow.mulai = row[key]
            else if (nk.includes("akhir")) newRow.akhir = row[key]
            else newRow[nk] = row[key]
          })

          return {
            ...newRow,
            sheet: sheetName,
            source: filePath
          }
        })

        allData = allData.concat(cleaned)

      } catch (err) {
        console.log("❌ Sheet error:", sheetName, err.message)
      }
    })

  } catch (err) {
    console.log("❌ File error:", filePath, err.message)
  }
})

console.log("TOTAL DATA:", allData.length)

/* =========================
SIMPAN JSON
========================= */
fs.writeFileSync(
  path.join(OUTPUT_DIR, "promo.json"),
  JSON.stringify(allData, null, 2)
)

console.log("✅ Convert selesai")