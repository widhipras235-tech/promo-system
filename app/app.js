/* =========================
STATE
========================= */
let skuIndex = {}
let articleIndex = {}
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
  return (val || "").toString().toLowerCase().trim()
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

    const [skuRes, articleRes] = await Promise.all([
      fetch("./db/sku_index.json"),
      fetch("./db/article_index.json")
    ])

    if (skuRes.ok) skuIndex = await skuRes.json()
    if (articleRes.ok) articleIndex = await articleRes.json()

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
LOAD FILE (CACHE)
========================= */
async function loadFile(fileIndex) {
  try {
    if (cache[fileIndex]) return cache[fileIndex]

    const res = await fetch(`./db/promo_${fileIndex}.json`)
    if (!res.ok) return []

    const data = await res.json()
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

  for (let i of indexList) {
    const fileIndex = Math.floor(i / 5000) + 1
    const data = await loadFile(fileIndex)

    const item = data[i % 5000]
    if (!item) continue

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
RESULT DARI INDEX
========================= */
async function getResultsFromIndexes(indexes, keyword) {
  let results = []
  keyword = normalize(keyword)

  let fileMap = {}

  indexes.forEach(i => {
    const fileIndex = Math.floor(i / 5000) + 1
    if (!fileMap[fileIndex]) fileMap[fileIndex] = []
    fileMap[fileIndex].push(i)
  })

  for (let fileIndex in fileMap) {
    const data = await loadFile(fileIndex)

    for (let i of fileMap[fileIndex]) {
      const item = data[i % 5000]
      if (!item) continue

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
FULL SCAN (ANTI MISS)
========================= */
async function fullScanSearch(keyword) {
  let results = []
  keyword = normalize(keyword)

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

  if (skuIndex[keyword]) {
    return await getExactResults(skuIndex[keyword], keyword)
  }

  if (articleIndex[keyword]) {
    return await getExactResults(articleIndex[keyword], keyword)
  }

  let indexes = new Set()
  let prefix = keyword.slice(0, 3)

  for (let key in skuIndex) {
    if (!key.startsWith(prefix)) continue

    if (key.startsWith(keyword)) {
      skuIndex[key].forEach(i => {
        if (indexes.size < MAX_RESULT) indexes.add(i)
      })
    }

    if (indexes.size >= MAX_RESULT) break
  }

  if (indexes.size > 0) {
    return await getResultsFromIndexes(indexes, keyword)
  }

  return await fullScanSearch(keyword)
}

/* =========================
RENDER
========================= */
function render(data) {
  resultEl.innerHTML = ""

  if (!data || data.length === 0) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  data.forEach(item => {
    const diskon = formatDiskon(item.diskon || item.raw?.diskon)

    const mulai = item.fromdate || item.raw?.fromdate || "-"
    const akhir = item.todate || item.raw?.todate || "-"

    const el = document.createElement("div")
    el.className = "card"

    el.innerHTML = `
      <div><b>${highlight(item.deskripsi, searchInput.value)}</b></div>
      <div>Brand: ${item.brand || "-"}</div>
      <div>SKU: ${highlight(item.sku, searchInput.value)}</div>
      <div>Article: ${highlight(item.article, searchInput.value)}</div>

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