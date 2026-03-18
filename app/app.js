let DB = []
let READY = false

const result = document.getElementById("result")
const searchInput = document.getElementById("search")

/* =========================
CONFIG PATH
========================= */

async function tryFetch(file) {
  const paths = [
    `../db/${file}`,   // ← ini penting untuk struktur kamu
    `db/${file}`,
    `./db/${file}`,
    `/db/${file}`
  ]

  for (let p of paths) {
    try {
      console.log("Coba:", p)

      let res = await fetch(p)

      if (res.ok) {
        console.log("✅ Berhasil:", p)
        return await res.json()
      }

    } catch {}
  }

  return null
}

/* =========================
LOAD DATABASE (FIX)
========================= */

async function loadDatabase() {
  result.innerHTML = "Memuat database..."

  let total = 0
  let i = 1
  let gagal = 0

  while (i <= 100) {
    console.log("Load file:", `promo_${i}.json`)

    const data = await tryFetch(`promo_${i}.json`)

    if (!data) {
      gagal++
      console.log("❌ Gagal:", i)
    } else {
      DB = DB.concat(data)
      total += data.length
      gagal = 0
      console.log("✅ Success:", data.length)
    }

    if (gagal >= 3) {
      console.log("STOP (file habis)")
      break
    }

    i++
  }

  console.log("TOTAL:", total)

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
SEARCH
========================= */

function searchData(keyword) {
  if (!READY) {
    result.innerHTML = "⏳ Database belum siap"
    return
  }

  keyword = keyword.toLowerCase().trim()

  const results = DB.filter(item =>
    (item.sku && item.sku.toString().toLowerCase().includes(keyword)) ||
    (item.article && item.article.toString().toLowerCase().includes(keyword)) ||
    (item.deskripsi && item.deskripsi.toLowerCase().includes(keyword)) ||
    (item.brand && item.brand.toLowerCase().includes(keyword))
  )

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