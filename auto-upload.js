const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

/* =========================
CONFIG
========================= */
const TARGET_FOLDER = "./app/db"
const BATCH_TOTAL = 10
const MAX_RETRY = 3
const DEBUG = true

/* =========================
UTIL
========================= */
function run(cmd, safe = false) {
  try {
    if (DEBUG) console.log("💻 CMD:", cmd)
    execSync(cmd, { stdio: "inherit" })
    return true
  } catch (err) {
    console.log("❌ ERROR:", cmd)
    if (!safe) console.log(err.message)
    return false
  }
}

function hasStagedChanges() {
  try {
    execSync("git diff --cached --quiet")
    return false // tidak ada perubahan
  } catch {
    return true // ada perubahan
  }
}

/* =========================
GET FILES
========================= */
function getAllFiles(dir) {
  let results = []

  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)

    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(full))
    } else {
      results.push(full)
    }
  })

  return results
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
SYNC AWAL (PENTING)
========================= */
console.log("\n🔄 Sync awal dengan remote...")
run("git pull origin main --rebase", true)

/* =========================
SPLIT BATCH
========================= */
const batchSize = Math.ceil(allFiles.length / BATCH_TOTAL)

console.log("📊 Batch size:", batchSize)
console.log("🚀 Total batch:", BATCH_TOTAL)

/* =========================
UPLOAD LOGIC (SMART)
========================= */
function pushWithRetry(batchNumber, retry = 0) {
  console.log(`🚀 Push batch ${batchNumber} | Attempt ${retry + 1}`)

  const success = run("git push", true)

  if (success) {
    console.log(`✅ Push batch ${batchNumber} berhasil`)
    return true
  }

  if (retry >= MAX_RETRY) {
    console.log(`💥 Gagal setelah ${MAX_RETRY}x retry`)
    process.exit()
  }

  console.log("🧹 Stash perubahan sementara...")
  run("git stash", true)

  console.log("🔄 Mencoba git pull --rebase...")
  run("git pull origin main --rebase")

  console.log("📦 Kembalikan perubahan...")
  run("git stash pop", true)

  console.log("🔁 Retry push...")
  return pushWithRetry(batchNumber, retry + 1)
}

/* =========================
MAIN LOOP
========================= */
let uploaded = 0

for (let i = 0; i < allFiles.length; i += batchSize) {
  const batch = allFiles.slice(i, i + batchSize)
  const batchNumber = Math.floor(i / batchSize) + 1

  console.log("\n===================================")
  console.log(`📦 BATCH ${batchNumber}`)
  console.log("===================================")

  batch.forEach(file => {
    if (DEBUG) console.log("➕ Add:", file)
    run(`git add "${file}"`)
  })

  if (hasStagedChanges()) {
    const msg = `upload batch ${batchNumber} (${batch.length} files)`
    run(`git commit -m "${msg}"`)
  } else {
    console.log("⚠️ Tidak ada perubahan, skip commit")
    continue
  }

  pushWithRetry(batchNumber)

  uploaded += batch.length
  console.log(`📊 Progress: ${uploaded}/${allFiles.length}`)
}

console.log("\n===================================")
console.log("🎉 SEMUA UPLOAD SELESAI TANPA DRAMA")
console.log("===================================")