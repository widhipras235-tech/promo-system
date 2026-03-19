let idx
let cache = {}

const MAX_RESULT = 30

const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

/* =========================
INIT
========================= */
async function init() {
  statusEl.innerText = "Loading..."

  const res = await fetch("./db/search_index.json")
  const idxData = await res.json()

  idx = lunr.Index.load(idxData)

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
LOAD STORE (LAZY)
========================= */
async function loadStore(fileIndex) {
  if (cache[fileIndex]) return cache[fileIndex]

  const res = await fetch(`./db/store_${fileIndex}.json`)
  const data = await res.json()

  cache[fileIndex] = data
  return data
}

/* =========================
SEARCH
========================= */
async function searchData(q) {
  if (!q) return []

  let results = []
  let res

  try {
    res = idx.search(q + "*")
  } catch {
    return []
  }

  res = res.slice(0, MAX_RESULT)

  let fileMap = {}

  res.forEach(r => {
    const id = Number(r.ref)
    const fileIndex = Math.floor(id / 5000) + 1

    if (!fileMap[fileIndex]) fileMap[fileIndex] = []
    fileMap[fileIndex].push(id)
  })

  for (let fileIndex in fileMap) {
    const data = await loadStore(fileIndex)

    for (let id of fileMap[fileIndex]) {
      const localIndex = id % 5000
      if (data[localIndex]) {
        results.push(data[localIndex])
      }
    }
  }

  return results
}

/* =========================
RENDER
========================= */
function render(data) {
  resultEl.innerHTML = ""

  if (!data.length) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  data.forEach(item => {
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

  const q = e.target.value.trim().toLowerCase()

  timer = setTimeout(async () => {
    if (!q) {
      resultEl.innerHTML = ""
      statusEl.innerText = "Ketik untuk mencari"
      return
    }

    statusEl.innerText = "Mencari..."

    const data = await searchData(q)
    render(data)

    statusEl.innerText = `Ditemukan ${data.length} data`
  }, 250)
})