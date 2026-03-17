const fs = require("fs")
const path = require("path")
const xlsx = require("xlsx")

const INPUT_DIR = path.resolve("excel")
const OUTPUT_DIR = path.resolve("db")

// jumlah maksimal data per file
const MAX_PER_FILE = 5000

if (!fs.existsSync(INPUT_DIR)) {
  console.log("❌ Folder excel tidak ditemukan")
  process.exit(0)
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR)
}

let allData = []

function getAllExcelFiles(dir) {
  let results = []

  const list = fs.readdirSync(dir)

  list.forEach(file => {
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
      row.includes("deskripsi")
    ) {
      return i
    }
  }

  return 0
}

// =========================
// PROSES FILE
// =========================
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

// =========================
// HAPUS FILE LAMA
// =========================
fs.readdirSync(OUTPUT_DIR).forEach(file => {
  if (file.startsWith("promo_")) {
    fs.unlinkSync(path.join(OUTPUT_DIR, file))
  }
})

// =========================
// SPLIT & SIMPAN
// =========================
let fileIndex = 1

for (let i = 0; i < allData.length; i += MAX_PER_FILE) {
  const chunk = allData.slice(i, i + MAX_PER_FILE)

  const fileName = `promo_${fileIndex}.json`
  const filePath = path.join(OUTPUT_DIR, fileName)

  fs.writeFileSync(filePath, JSON.stringify(chunk, null, 2))

  console.log(`✅ Saved: ${fileName} (${chunk.length} data)`)

  fileIndex++
}

console.log("🎉 Convert & split selesai")