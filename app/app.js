let idx
let store = {}

const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

/* =========================
LOAD DATA
========================= */
async function init() {
  statusEl.innerText = "Loading data..."

  const res = await fetch("./db/search_data.json")
  const data = await res.json()

  // simpan data
  data.forEach(d => {
    store[d.id] = d
  })

  // build index
  idx = lunr(function () {
    this.ref("id")

    this.field("sku")
    this.field("article")
    this.field("name")
    this.field("brand")

    data.forEach(doc => this.add(doc))
  })

  statusEl.innerText = "Siap digunakan"
}

init()

/* =========================
FORMAT
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

/* =========================
SEARCH
========================= */
function searchData(q) {
  if (!q) return []

  try {
    return idx.search(q + "*")
  } catch {
    return []
  }
}

/* =========================
RENDER
========================= */
function render(results) {
  resultEl.innerHTML = ""

  if (!results.length) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  results.slice(0, 30).forEach(r => {
    const item = store[r.ref]

    const diskon = formatDiskon(item.diskon)
    const isDiskon = diskon !== "-"

    const el = document.createElement("div")
    el.className = "card"

    el.innerHTML = `
      <div><b>${item.name || "-"}</b></div>
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
        Berlaku: ${item.mulai || "-"} - ${item.akhir || "-"}
      </div>

      <div><b>Acara:</b> ${item.acara || "-"}</div>

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

  const q = e.target.value.trim().toLowerCase()

  timer = setTimeout(() => {
    statusEl.innerText = "Mencari..."

    const res = searchData(q)
    render(res)

    statusEl.innerText = `Ditemukan ${res.length} data`
  }, 300)
})