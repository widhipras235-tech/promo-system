/* =========================
STATE
========================= */
let skuIndex = {}
let articleIndex = {}
let cache = {}
let isReady = false

const MAX_RESULT = 30
const TOTAL_FILE = 10 // sesuaikan

/* =========================
ELEMENT
========================= */
const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

/* =========================
UTILS
========================= */
function normalize(val) {
  return (val || "").toString().toLowerCase().trim()
}

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
HIGHLIGHT
========================= */
function highlight(text, keyword) {
  if (!text) return "-"
  const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${safeKeyword})`, "gi")
  return text.toString().replace(regex, `<mark>$1</mark>`)
}

/* =========================
SCORING (SMART RANKING)
========================= */
function getScore(item, keyword) {
  const sku = normalize(item.sku)
  const article = normalize(item.article)
  const desc = normalize(item.deskripsi)

  // 🔥 PRIORITAS SKU ANGKA
  if (/^\d+$/.test(keyword)) {
    if (sku === keyword) return 120
  }

  if (sku === keyword) return 100
  if (article === keyword) return 95

  if (sku.startsWith(keyword)) return 90
  if (article.startsWith(keyword)) return 85

  if (sku.includes(keyword)) return 70
  if (article.includes(keyword)) return 60

  if (desc.includes(keyword)) return 40

  return 0
}

/* =========================
LOAD INDEX
========================= */
async function loadIndex() {
  try {
    statusEl.innerText = "Loading..."

    const [skuRes, articleRes] = await Promise.all([
      fetch("./db/sku_index.json"),
      fetch("./db/article_index.json")
    ])

    if (skuRes.ok) skuIndex = await skuRes.json()
    if (articleRes.ok) articleIndex = await articleRes.json()

    isReady = true
    statusEl.innerText = "Siap digunakan"
  } catch {
    isReady = true
    statusEl.innerText = "Fallback mode"
  }
}
loadIndex()

/* =========================
LOAD FILE
========================= */
async function loadFile(fileIndex) {
  if (cache[fileIndex]) return cache[fileIndex]

  try {
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
EXACT SEARCH
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
        _score: getScore(item, keyword)
      })
    }
  }

  return results.sort((a, b) => b._score - a._score).slice(0, MAX_RESULT)
}

/* =========================
INDEX SEARCH
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
          _score: getScore(item, keyword)
        })
      }
    }
  }

  return results.sort((a, b) => b._score - a._score).slice(0, MAX_RESULT)
}

/* =========================
FULL SCAN
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
          _score: getScore(item, keyword)
        })
      }
    }
  }

  return results.sort((a, b) => b._score - a._score).slice(0, MAX_RESULT)
}

/* =========================
SEARCH
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
      skuIndex[key].forEach(i => indexes.add(i))
    }
  }

  if (indexes.size > 0) {
    return await getResultsFromIndexes(indexes, keyword)
  }

  return await fullScanSearch(keyword)
}

/* =========================
RENDER
========================= */
function render(data, keyword) {
  resultEl.innerHTML = ""

  if (!data.length) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  data.forEach(item => {
    const diskon = formatDiskon(item.diskon || item.raw?.diskon)
    const mulai = item.fromdate || item.raw?.fromdate
    const akhir = item.todate || item.raw?.todate

    const el = document.createElement("div")
    el.className = "card"

    el.innerHTML = `
      <div><b>${highlight(item.deskripsi, keyword)}</b></div>
      <div>Brand: ${highlight(item.brand, keyword)}</div>
      <div>SKU: ${highlight(item.sku, keyword)}</div>
      <div>Article: ${highlight(item.article, keyword)}</div>

      <div>
        Harga Normal:
        ${formatRupiah(item.harga_normal)}
      </div>

      <div style="color:red;font-weight:bold;font-size:18px">
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

      <div><b>Acara:</b> ${highlight(item.acara || item.raw?.acara, keyword)}</div>
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

    render(result, keyword)

    statusEl.innerText = `Ditemukan ${result.length} data`
  }, 200)
})