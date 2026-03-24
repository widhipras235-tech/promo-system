/* =========================
STATE
========================= */
let cache = {}
let isReady = true

const MAX_RESULT = 30
const TOTAL_FILE = 10 // sesuaikan jumlah file kamu

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
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // hapus simbol biar akurat
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

function formatTanggal(val) {
  if (!val || val === 0) return "-"

  if (!isNaN(val)) {
    const d = new Date((val - 25569) * 86400 * 1000)
    if (isNaN(d)) return "-"
    return d.toLocaleDateString("id-ID", {
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

function highlight(text, keyword) {
  if (!text) return "-"
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${safe})`, "gi")
  return text.toString().replace(regex, `<mark>$1</mark>`)
}

/* =========================
PRIORITY (SKU & ARTICLE ONLY)
========================= */
function getPriority(item, keyword) {
  const sku = normalize(item.sku)
  const article = normalize(item.article)

  if (sku === keyword) return 1
  if (article === keyword) return 2

  if (sku.startsWith(keyword)) return 3
  if (article.startsWith(keyword)) return 4

  if (sku.includes(keyword)) return 5
  if (article.includes(keyword)) return 6

  return 999
}

/* =========================
LOAD FILE
========================= */
async function loadFile(i) {
  if (cache[i]) return cache[i]

  try {
    const res = await fetch(`./db/promo_${i}.json`)
    if (!res.ok) return []

    const data = await res.json()
    cache[i] = data
    return data
  } catch {
    return []
  }
}

/* =========================
STRICT SEARCH (SKU & ARTICLE ONLY)
========================= */
async function searchSkuArticleOnly(keyword) {
  let results = []
  keyword = normalize(keyword)

  for (let i = 1; i <= TOTAL_FILE; i++) {
    const data = await loadFile(i)

    for (let item of data) {
      const sku = normalize(item.sku)
      const article = normalize(item.article)

      if (
        sku.includes(keyword) ||
        article.includes(keyword)
      ) {
        results.push({
          ...item,
          _priority: getPriority(item, keyword)
        })

        // 🔥 stop lebih cepat
        if (results.length >= MAX_RESULT) break
      }
    }

    if (results.length >= MAX_RESULT) break
  }

  return results.sort((a, b) => {
    if (a._priority !== b._priority) {
      return a._priority - b._priority
    }
    return (a.sku?.length || 0) - (b.sku?.length || 0)
  })
}

/* =========================
SEARCH MAIN
========================= */
async function searchData(keyword) {
  if (!keyword.trim()) return []

  // 🔥 STRICT MODE: hanya SKU & ARTICLE
  return await searchSkuArticleOnly(keyword)
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
      <div><b>Sumber:</b> ${item.source || "-"}</div>
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
  }, 150)
})