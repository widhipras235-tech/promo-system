/* =========================
DEBUG MODE
========================= */
const DEBUG = true

/* =========================
STATE
========================= */
let mainIndex = {}
let cache = {}
let isReady = false

const MAX_RESULT = 30
const TOTAL_FILE = 100

/* =========================
ELEMENT
========================= */
const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

/* =========================
INIT
========================= */
function normalize(val) {
  const result = (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

  if (DEBUG && val) {
    console.log("🔤 NORMALIZE:", val, "=>", result)
  }

  return result
}

/* =========================
PRIORITY + HIGHLIGHT
========================= */
function getPriority(item, keyword) {
  const sku = normalize(item.sku)
  const article = normalize(item.article)
  const desc = normalize(item.deskripsi)

  if (sku === keyword) return 1
  if (article === keyword) return 2

  if (sku.startsWith(keyword)) return 3
  if (article.startsWith(keyword)) return 4

  if (sku.includes(keyword)) return 5
  if (article.includes(keyword)) return 6

  if (desc.includes(keyword)) return 10

  return 999
}

function highlight(text, keyword) {
  if (!text) return "-"
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${safe})`, "gi")
  return text.toString().replace(regex, `<mark>$1</mark>`)
}

/* =========================
LOAD INDEX
========================= */
async function loadIndex() {
  try {
    statusEl.innerText = "Loading index..."

    const res = await fetch("./db/index.json")
    if (!res.ok) throw new Error("Index gagal load")

    const rawIndex = await res.json()

    if (DEBUG) console.log("📦 Raw index length:", rawIndex.length)

    rawIndex.forEach(([key, fileIndex, pos]) => {
      if (!mainIndex[key]) mainIndex[key] = []
      mainIndex[key].push({ fileIndex, pos })
    })

    if (DEBUG) {
      console.log("🧠 Index keys:", Object.keys(mainIndex).length)
      console.log("🔍 Sample index:", Object.entries(mainIndex).slice(0, 5))
    }

    isReady = true
    statusEl.innerText = "Siap digunakan"
  } catch (err) {
    console.log("❌ Index gagal:", err)
    isReady = true
    statusEl.innerText = "Mode fallback aktif"
  }
}
loadIndex()

/* =========================
UTILS
========================= */
function formatRupiah(num) {
  if (!num || isNaN(num)) return num
  return "Rp " + Number(num).toLocaleString("id-ID")
}

function formatDiskon(val) {
  if (!val) return "-"
  if (!isNaN(val)) {
    let num = Number(val)
    return num <= 1 ? Math.round(num * 100) + "%" : num + "%"
  }
  return val
}

function getFileName(path) {
  return path ? path.split(/[\\/]/).pop() : "-"
}

function formatTanggal(val) {
  if (!val || val === 0 || val === "0") return "-"

  if (!isNaN(val)) {
    const excelDate = Number(val)
    if (excelDate < 1000) return "-"
    const date = new Date((excelDate - 25569) * 86400 * 1000)
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const d = new Date(val)
  if (isNaN(d)) return "-"

  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

/* =========================
LOAD FILE
========================= */
async function loadFile(fileIndex) {
  try {
    if (cache[fileIndex]) return cache[fileIndex]

    if (DEBUG) console.log("📂 LOAD FILE:", fileIndex)

    const res = await fetch(`./db/promo_${fileIndex}.json`)
    if (!res.ok) return []

    const data = await res.json()

    if (DEBUG) console.log("📄 FILE SIZE:", data.length)

    cache[fileIndex] = data
    return data
  } catch {
    return []
  }
}

/* =========================
EXACT RESULT
========================= */
async function getExactResults(indexList, keyword) {
  let results = []
  keyword = normalize(keyword)

  if (DEBUG) console.log("🎯 EXACT SEARCH:", keyword)

  for (let ref of indexList) {
    const data = await loadFile(ref.fileIndex)
    const item = data[ref.pos]

    if (!item) continue

    if (DEBUG) {
      console.log("➡️ CEK ITEM:", {
        sku: item.sku,
        article: item.article
      })
    }

    const sku = normalize(item.sku)
    const article = normalize(item.article)

    if (sku === keyword || article === keyword) {
      results.push({
        ...item,
        _priority: getPriority(item, keyword)
      })
    }

    if (results.length >= MAX_RESULT) break
  }

  return results.sort((a, b) => a._priority - b._priority)
}

/* =========================
FULL SCAN
========================= */
async function fullScanSearch(keyword) {
  let results = []
  keyword = normalize(keyword)

  if (DEBUG) console.log("🚨 FULL SCAN START")

  for (let i = 1; i <= TOTAL_FILE; i++) {
    const data = await loadFile(i)

    for (let item of data) {
      const sku = normalize(item.sku)
      const article = normalize(item.article)
      const desc = normalize(item.deskripsi)

      if (
        sku.includes(keyword) ||
        article.includes(keyword) ||
        desc.includes(keyword)
      ) {
        results.push({
          ...item,
          _priority: getPriority(item, keyword)
        })
      }

      if (results.length >= MAX_RESULT) break
    }
  }

  return results
    .sort((a, b) => a._priority - b._priority)
    .slice(0, MAX_RESULT)
}

/* =========================
SEARCH ENGINE
========================= */
async function searchData(keyword) {
  keyword = normalize(keyword)
  if (!keyword) return []

  if (DEBUG) console.log("🔎 SEARCH:", keyword)

  // EXACT
  if (mainIndex[keyword]) {
    if (DEBUG) console.log("✅ EXACT MATCH:", mainIndex[keyword].length)
    return await getExactResults(mainIndex[keyword], keyword)
  } else {
    if (DEBUG) console.log("❌ EXACT TIDAK ADA")
  }

  // PREFIX
  let results = []
  let prefix = keyword.slice(0, 3)

  if (DEBUG) console.log("🔡 PREFIX:", prefix)

  for (let key in mainIndex) {
    if (!key.startsWith(prefix)) continue

    if (key.startsWith(keyword)) {
      if (DEBUG) console.log("⚡ PREFIX MATCH:", key)

      const refs = mainIndex[key]

      for (let ref of refs) {
        const data = await loadFile(ref.fileIndex)
        const item = data[ref.pos]

        if (!item) continue

        results.push({
          ...item,
          _priority: getPriority(item, keyword)
        })

        if (results.length >= MAX_RESULT) break
      }
    }

    if (results.length >= MAX_RESULT) break
  }

  if (DEBUG) console.log("📊 PREFIX RESULT:", results.length)

  if (results.length > 0) {
    return results
      .sort((a, b) => a._priority - b._priority)
      .slice(0, MAX_RESULT)
  }

  if (DEBUG) console.log("🐢 MASUK FULL SCAN")

  return await fullScanSearch(keyword)
}

/* =========================
RENDER
========================= */
function render(data) {
  resultEl.innerHTML = ""

  if (DEBUG) console.log("🖥️ RENDER:", data.length)

  if (!data || data.length === 0) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  const keyword = normalize(searchInput.value)

  data.forEach(item => {
    const diskon = formatDiskon(item.diskon || item.raw?.diskon)

    const mulai = item.fromdate || item.raw?.fromdate || "-"
    const akhir = item.todate || item.raw?.todate || "-"

    const el = document.createElement("div")
    el.className = "card"

    el.innerHTML = `
      <div><b>${highlight(item.deskripsi, keyword)}</b></div>
      <div>Brand: ${item.brand || "-"}</div>
      <div>SKU: ${highlight(item.sku, keyword)}</div>
      <div>Article: ${highlight(item.article, keyword)}</div>

      <div>Harga Normal: ${formatRupiah(item.harga_normal)}</div>

      <div style="color:red;font-weight:bold">
        Harga Promo: ${
          !isNaN(item.harga_promo)
            ? formatRupiah(item.harga_promo)
            : item.harga_promo || "-"
        }
      </div>

      <div style="color:green;font-weight:bold">
        Diskon: ${diskon}
      </div>

      <div>
        Berlaku: ${formatTanggal(mulai)} - ${formatTanggal(akhir)}
      </div>

      <div><b>Acara:</b> ${item.acara || item.raw?.acara || "-"}</div>
      <div><b>Sumber:</b> ${getFileName(item.source)}</div>
    `

    resultEl.appendChild(el)
  })
}

/* =========================
EVENT
========================= */
let timer

searchInput.addEventListener("input", e => {
  clearTimeout(timer)

  const keyword = e.target.value

  if (!isReady) {
    statusEl.innerText = "Loading..."
    return
  }

  timer = setTimeout(async () => {
    if (!keyword.trim()) {
      resultEl.innerHTML = ""
      statusEl.innerText = "Ketik untuk mencari"
      return
    }

    statusEl.innerText = "Mencari..."

    const result = await searchData(keyword)

    render(result)

    statusEl.innerText = `Ditemukan ${result.length} data`
  }, 200)
})

/* =========================
AUTO UPDATE
========================= */
let lastUpdate = null

setInterval(async () => {
  try {
    const res = await fetch("./db/index.json?t=" + Date.now())
    const text = await res.text()

    if (lastUpdate && lastUpdate !== text) {
      console.log("🔄 Data berubah, reload...")
      location.reload()
    }

    lastUpdate = text
  } catch {
    console.log("❌ Gagal cek update")
  }
}, 300000)

/* =========================
MANUAL DEBUG TOOL
========================= */
window.debugSearch = async function (val) {
  const keyword = normalize(val)

  console.log("=== DEBUG MANUAL SEARCH ===")
  console.log("Input:", val)
  console.log("Normalized:", keyword)
  console.log("Index exist:", !!mainIndex[keyword])

  if (mainIndex[keyword]) {
    console.log("Index refs:", mainIndex[keyword].slice(0, 5))
  }

  const result = await searchData(val)
  console.log("Result:", result)

  return result
}