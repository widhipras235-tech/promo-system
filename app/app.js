/* =========================
STATE
========================= */
let skuIndex = {}
let articleIndex = {}
let cache = {}
let isReady = false

const MAX_RESULT = 30
const TOTAL_FILE = 80 // 🔥 sesuaikan jumlah file kamu

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
  } catch (err) {
    console.log("❌ Load file error:", fileIndex)
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
      results.push(item)
    }

    if (results.length >= MAX_RESULT) break
  }

  // 🔥 fallback kalau mapping error
  if (results.length === 0) {
    const fileIndex = Math.floor(indexList[0] / 5000) + 1
    const data = await loadFile(fileIndex)

    return data.filter(item =>
      normalize(item.sku) === keyword
    ).slice(0, MAX_RESULT)
  }

  return results
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
        results.push(item)
      }

      if (results.length >= MAX_RESULT) return results
    }
  }

  return results
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
        results.push(item)
      }

      if (results.length >= MAX_RESULT) return results
    }
  }

  return results
}

/* =========================
SEARCH ENGINE
========================= */
async function searchData(keyword) {
  keyword = normalize(keyword)
  if (!keyword) return []

  // EXACT SKU
  if (skuIndex[keyword]) {
    return await getExactResults(skuIndex[keyword], keyword)
  }

  // EXACT ARTICLE
  if (articleIndex[keyword]) {
    return await getExactResults(articleIndex[keyword], keyword)
  }

  // PREFIX SEARCH
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

  // 🔥 fallback terakhir
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
    const isDiskon = diskon !== "-"

    const mulai =
      item.fromdate ||
      item.raw?.fromdate ||
      "-"

    const akhir =
      item.todate ||
      item.raw?.todate ||
      "-"

    const el = document.createElement("div")
    el.className = "card"

    el.innerHTML = `
      <div><b>${item.deskripsi || "-"}</b></div>
      <div>Brand: ${item.brand || "-"}</div>
      <div>SKU: ${item.sku || "-"}</div>
      <div>Article: ${item.article || "-"}</div>

      <div>
        Harga Normal:
        ${
          isDiskon
            ? `<span style="text-decoration:line-through;color:gray">${formatRupiah(item.harga_normal)}</span>`
            : formatRupiah(item.harga_normal)
        }
      </div>

      <div style="color:red;font-weight:bold;font-size:18px">
        Harga Promo: ${
          !isNaN(item.harga_promo)
            ? formatRupiah(item.harga_promo)
            : (item.harga_promo || "-")
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