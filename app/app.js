let DB = []
let READY = false

const result = document.getElementById("result")
const searchInput = document.getElementById("search")

/* =========================
LOAD DATABASE (SUPER STABIL)
========================= */

async function loadDatabase() {
  result.innerHTML = "Memuat database..."

  let total = 0
  let i = 1
  let gagal = 0

  while (i <= 100) { // batas aman max 100 file
    let loaded = false

    const paths = [
      `db/promo_${i}.json`,
      `./db/promo_${i}.json`
    ]

    for (let p of paths) {
      try {
        console.log("Coba load:", p)

        const res = await fetch(p)

        if (!res.ok) continue

        const data = await res.json()

        if (Array.isArray(data) && data.length > 0) {
          DB = DB.concat(data)
          total += data.length

          console.log(`✅ Loaded ${p} (${data.length})`)
          loaded = true
          break
        }

      } catch (err) {
        console.log("Error:", p, err.message)
      }
    }

    if (!loaded) {
      gagal++
      console.log(`❌ File ke-${i} tidak ditemukan`)
    } else {
      gagal = 0
    }

    // kalau gagal 3x berturut-turut → stop
    if (gagal >= 3) {
      console.log("STOP loading (file habis)")
      break
    }

    i++
  }

  console.log("TOTAL DATA:", total)

  if (total === 0) {
    result.innerHTML = `
      ❌ Database tidak terbaca<br><br>
      ⚠️ Cek:
      <br>- Folder db benar
      <br>- Jalankan via server (bukan file://)
      <br>- File JSON ada isinya
    `
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

  let d = ((n - p) / n) * 100
  return Math.round(d) + "%"
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
SEARCH (OPTIMIZED)
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
