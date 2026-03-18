let DB = []
let READY = false

const result = document.getElementById("result")
const searchInput = document.getElementById("search")

/* =========================
LOAD DATABASE (AUTO MULTI FILE)
========================= */

async function loadDatabase() {
  result.innerHTML = "Memuat database..."

  try {
    let i = 1
    let total = 0

    while (true) {
      try {
        const res = await fetch(`db/promo_${i}.json`)

        if (!res.ok) break

        const data = await res.json()

        DB = DB.concat(data)
        total += data.length

        console.log(`Loaded promo_${i}.json (${data.length})`)

        i++
      } catch {
        break
      }
    }

    READY = true

    result.innerHTML = `Database siap (${total} data)`
    console.log("TOTAL DB:", total)

  } catch (err) {
    result.innerHTML = "❌ Gagal load database"
    console.error(err)
  }
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

  let disc = ((n - p) / n) * 100
  return Math.round(disc) + "%"
}

/* =========================
RENDER DATA
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

      Divisi: ${item.divisi || "-"}<br>
      Berlaku: ${item.mulai || "-"} s/d ${item.akhir || "-"}<br>

      <hr>

      <small>
      Source: ${item.source}<br>
      Sheet: ${item.sheet}
      </small>
    </div>
    `
  })

  result.innerHTML = html
}

/* =========================
SEARCH ENGINE (FAST)
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

  const results = DB.filter(item => {
    return (
      (item.sku && item.sku.toString().toLowerCase().includes(keyword)) ||
      (item.article && item.article.toString().toLowerCase().includes(keyword)) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(keyword)) ||
      (item.brand && item.brand.toLowerCase().includes(keyword))
    )
  })

  render(results.slice(0, 200)) // limit biar tidak berat
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
