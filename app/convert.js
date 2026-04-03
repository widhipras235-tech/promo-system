const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")

const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./db"
const SPLIT_SIZE = 5000

function normalize(val) {
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function getAllExcelFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      getAllExcelFiles(fullPath, fileList)
    } else {
      if (!file.startsWith("~$") && /\.(xlsx|xls|csv)$/i.test(file)) {
        fileList.push(fullPath)
      }
    }
  })

  return fileList
}

const files = getAllExcelFiles(INPUT_FOLDER)

let rawData = []

files.forEach(file => {
  const wb = XLSX.readFile(file)

  wb.SheetNames.forEach(sheet => {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: "" })

    const withMeta = data.map(row => ({
      ...row,
      source: path.basename(file),
      sheet: sheet
    }))

    rawData = rawData.concat(withMeta)
  })
})

console.log("Total data:", rawData.length)

if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER)
}

/* =========================
SPLIT + INDEX
========================= */
let index = []
let fileIndex = 1

for (let i = 0; i < rawData.length; i += SPLIT_SIZE) {
  const chunk = rawData.slice(i, i + SPLIT_SIZE)
  const fileName = `promo_${fileIndex}.json`

  fs.writeFileSync(
    path.join(OUTPUT_FOLDER, fileName),
    JSON.stringify(chunk)
  )

  chunk.forEach((row, pos) => {
    const sku = normalize(row.sku || row.SKU || "")
    const article = normalize(row.article || "")

    if (sku) index.push([sku, fileIndex, pos])
    if (article) index.push([article, fileIndex, pos])
  })

  console.log("Created:", fileName)
  fileIndex++
}

/* =========================
SORT INDEX
========================= */
index.sort((a, b) => a[0].localeCompare(b[0]))

fs.writeFileSync(
  path.join(OUTPUT_FOLDER, "index.json"),
  JSON.stringify(index)
)

console.log("✅ SELESAI")