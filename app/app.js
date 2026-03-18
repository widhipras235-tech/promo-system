let DB = []
let SKU_INDEX = {}
let ARTICLE_INDEX = {}
let READY = false

const result = document.getElementById("result")
const searchInput = document.getElementById("search")

/* =========================
LOAD JSON HELPER
========================= */

async function loadJSON(path) {
  try {
    const res = await fetch(path)
    if (res.ok) return await res.json()
  } catch {}
  return null
}

/* =========================
LOAD DATABASE + INDEX
========================= */

async function loadDatabase() {
  result.innerHTML = "Memuat database..."

  let total = 0
  let i = 1
  let gagal = 0

  // 🔹 Load semua promo_*.json
  while (i <= 100) {
    let data = await loadJSON(`db/promo_${i}.json`) ||
               await loadJSON(`./db/promo_${i}.json`) ||
               await loadJSON(`../db/promo_${i}.json`)

    if (!data) {
      gagal++
    } else {
      DB = DB.concat(data)
      total += data.length
      gagal = 0
      console.log(`✅ promo_${i} loaded (${data.length})`)
    }

    if (gagal >= 3) break
    i++
  }

  // 🔹 Load index
  SKU_INDEX =
    await loadJSON("db/sku_index.json") ||
    await loadJSON("./db/sku_index.json") ||
    await loadJSON("../db/sku_index.json") || {}

  ARTICLE_INDEX =
    await loadJSON("db/article_index.json") ||
    await loadJSON("./db/article_index.json") ||
    await loadJSON("../db/article_index.json") || {}

  console.log("INDEX SKU:", Object.keys(SKU_INDEX).length)
  console.log("INDEX ARTICLE:", Object.keys(ARTICLE_INDEX).length)

  if (total === 0) {
    result.innerHTML = "❌ Database tidak terbaca"
  } else {
    result.innerHTML = `✅ Database siap (${total} data)`
  }

  READY = true
}

/* =========================
FORMAT
========================= */

function formatRupiah(val) {
  if (!val) return "-"
  let num = Number(val.toString().replace(/[^\d]/g, ""))
  if (isNaN(num)) return val
  return "Rp " + num.toLocaleString("id-ID")
}

function hitungDiskon(normal, promo) {
  let n = Number(normal)
  let p = Number(promo)
  if (!n || !p) return "-"
  return Math.round(((n - p) / n) * 100) + "%"
}

/* =========================
RENDER
========================= */

function render(data) {
  if (!data.length) {
    result.innerHTML = "❌ Data tidak ditemukan"
    return
  }

  let html = ""

  data.forEach(item => {
    html += `
    <div class="card">
      <b>${item.deskripsi || "-"}</b><br>
      Brand: ${item.brand || "-"}<br>
      SKU: ${item.sku || "-"}<br>
      Article: ${item.article || "-"}<br>

      <hr>

      Harga Normal: ${formatRupiah(item.harga_normal)}<br>
      Harga Promo: <b style="color:red">${formatRupiah(item.harga_promo)}</b><br>
      Diskon: <b>${hitungDiskon(item.harga_normal, item.harga_promo)}</b><br>

      <hr>

      Berlaku: ${item.mulai || "-"} s/d ${item.akhir || "-"}<br>

      <small>${item.source} | ${item.sheet}</small>
    </div>
    `
  })

  result.innerHTML = html
}

/* =========================
SEARCH SUPER CEPAT (INDEX)
========================= */

function searchData(keyword) {
  if (!READY) {
    result.innerHTML = "⏳ Database belum siap"
    return
  }

  keyword = keyword.toLowerCase().trim()

  if (!keyword) {
    result.innerHTML = "Masukkan kata kunci"
    return
  }

  let results = []

  // 🔥 PRIORITAS 1: SKU
  if (SKU_INDEX[keyword]) {
    results = SKU_INDEX[keyword].map(i => DB[i])
    console.log("⚡ SKU HIT")
  }

  // 🔥 PRIORITAS 2: ARTICLE
  else if (ARTICLE_INDEX[keyword]) {
    results = ARTICLE_INDEX[keyword].map(i => DB[i])
    console.log("⚡ ARTICLE HIT")
  }

  // 🔥 FALLBACK: SEARCH BIASA
  else {
    console.log("🐢 fallback search")

    results = DB.filter(item =>
      (item.sku && item.sku.toLowerCase().includes(keyword)) ||
      (item.article && item.article.toLowerCase().includes(keyword)) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(keyword)) ||
      (item.brand && item.brand.toLowerCase().includes(keyword))
    )
  }

  render(results.slice(0, 200))
}

/* =========================
EVENT
========================= */

searchInput.addEventListener("keyup", function (e) {
  if (e.key === "Enter") {
    searchData(this.value)
  }
})

/* =========================
INIT
========================= */

loadDatabase()