const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

/* =========================
CONFIG
========================= */
const TARGET_FOLDER = "./db"
const BATCH_TOTAL = 10
const DEBUG = true

/* =========================
GET FILES
========================= */
function getAllFiles(dir) {
  let results = []

  const list = fs.readdirSync(dir)

  list.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath))
    } else {
      results.push(fullPath)
    }
  })

  return results
}

/* =========================
EXEC COMMAND (SAFE)
========================= */
function run(cmd) {
  try {
    if (DEBUG) console.log("💻 CMD:", cmd)
    execSync(cmd, { stdio: "inherit" })
  } catch (err) {
    console.log("❌ ERROR CMD:", cmd)
    console.log(err.message)
    process.exit()
  }
}

/* =========================
VALIDASI
========================= */
if (!fs.existsSync(TARGET_FOLDER)) {
  console.log("❌ Folder tidak ditemukan:", TARGET_FOLDER)
  process.exit()
}

const allFiles = getAllFiles(TARGET_FOLDER)

if (allFiles.length === 0) {
  console.log("❌ Tidak ada file untuk upload")
  process.exit()
}

console.log("📦 Total file:", allFiles.length)

/* =========================
SPLIT BATCH
========================= */
const batchSize = Math.ceil(allFiles.length / BATCH_TOTAL)

console.log("📊 Batch size:", batchSize)
console.log("🚀 Total batch:", BATCH_TOTAL)

/* =========================
UPLOAD PER BATCH
========================= */
let uploaded = 0

for (let i = 0; i < allFiles.length; i += batchSize) {
  const batch = allFiles.slice(i, i + batchSize)
  const batchNumber = Math.floor(i / batchSize) + 1

  console.log("\n===================================")
  console.log(`🚀 UPLOAD BATCH ${batchNumber}`)
  console.log("===================================")

  batch.forEach(file => {
    if (DEBUG) console.log("➕ Add:", file)
    run(`git add "${file}"`)
  })

  const message = `upload batch ${batchNumber} (${batch.length} files)`
  
  run(`git commit -m "${message}"`)
  run(`git push`)

  uploaded += batch.length

  console.log(`✅ Batch ${batchNumber} selesai`)
  console.log(`📊 Progress: ${uploaded}/${allFiles.length}`)
}

console.log("\n===================================")
console.log("🎉 SEMUA UPLOAD SELESAI")
console.log("===================================")