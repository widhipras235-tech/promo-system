let data = []

const MAX_RESULT = 30

const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

/* =========================
LOAD DATA
========================= */
async function init() {
  statusEl.innerText = "Loading..."

  const res = await fetch("./db/data.json")
  data = await res.json()

  statusEl.innerText = "Siap ⚡"
}

init()

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

/* =========================
SEARCH SUPER CEPAT
========================= */
function searchData(q) {
  q = q.toLowerCase()

  let result = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    if (
      item.sku.includes(q) ||
      item.article.includes(q) ||
      item.name.includes(q) ||
      item.brand.includes(q)
    ) {
      result.push(item)
    }

    if (result.length >= MAX_RESULT) break
  }

  return result
}

/* =========================
RENDER
========================= */
function render(list) {
  resultEl.innerHTML = ""

  if (!list.length) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  list.forEach(item => {
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
EVENT (DEBOUNCE)
========================= */
let timer

searchInput.addEventListener("input", e => {
  clearTimeout(timer)

  const q = e.target.value.trim()

  timer = setTimeout(() => {
    if (!q) {
      resultEl.innerHTML = ""
      statusEl.innerText = "Ketik untuk mencari"
      return
    }

    statusEl.innerText = "Mencari..."

    const result = searchData(q)
    render(result)

    statusEl.innerText = `Ditemukan ${result.length} data`
  }, 200)
})