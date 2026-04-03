/* =========================
STATE
========================= */
let INDEX = []
let cache = {}
let isReady = false

const MAX_RESULT = 30

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
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/* =========================
LOAD INDEX
========================= */
async function loadIndex() {
  try {
    statusEl.innerText = "Loading index..."

    const res = await fetch("./db/index.json")
    INDEX = await res.json()

    isReady = true
    statusEl.innerText = "Siap digunakan"
  } catch (err) {
    console.log("❌ gagal load index", err)
  }
}
loadIndex()

/* =========================
BINARY SEARCH
========================= */
function binarySearchAll(arr, target) {
  let left = 0
  let right = arr.length - 1
  let results = []

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const val = arr[mid][0]

    if (val === target) {
      // ambil semua yang sama
      let i = mid
      while (i >= 0 && arr[i][0] === target) {
        results.push(arr[i])
        i--
      }
      i = mid + 1
      while (i < arr.length && arr[i][0] === target) {
        results.push(arr[i])
        i++
      }
      break
    }

    if (val < target) left = mid + 1
    else right = mid - 1
  }

  return results
}

/* =========================
LOAD FILE
========================= */
async function loadFile(fileIndex) {
  if (cache[fileIndex]) return cache[fileIndex]

  const res = await fetch(`./db/promo_${fileIndex}.json`)
  const data = await res.json()

  cache[fileIndex] = data
  return data
}

/* =========================
SEARCH
========================= */
async function searchData(keyword) {
  keyword = normalize(keyword)
  if (!keyword) return []

  const matches = binarySearchAll(INDEX, keyword)

  let results = []

  for (let m of matches) {
    const [, fileIndex, pos] = m

    const data = await loadFile(fileIndex)
    const item = data[pos]

    if (item) results.push(item)

    if (results.length >= MAX_RESULT) break
  }

  return results
}

/* =========================
UTILS (TETAP)
========================= */
function formatRupiah(num) {
  if (!num || isNaN(num)) return num
  return "Rp " + Number(num).toLocaleString("id-ID")
}

function highlight(text, keyword) {
  if (!text) return "-"
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${safe})`, "gi")
  return text.toString().replace(regex, `<mark>$1</mark>`)
}

/* =========================
RENDER (TETAP)
========================= */
function render(data) {
  resultEl.innerHTML = ""

  if (!data.length) {
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"
    return
  }

  data.forEach(item => {
    const el = document.createElement("div")
    el.className = "card"

    el.innerHTML = `
      <div><b>${highlight(item.deskripsi, searchInput.value)}</b></div>
      <div>SKU: ${highlight(item.sku, searchInput.value)}</div>
      <div>Article: ${highlight(item.article, searchInput.value)}</div>
      <div>Harga Promo: ${formatRupiah(item.harga_promo)}</div>
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

  if (!isReady) return

  timer = setTimeout(async () => {
    if (!keyword.trim()) {
      resultEl.innerHTML = ""
      return
    }

    statusEl.innerText = "Mencari..."

    const result = await searchData(keyword)

    render(result)

    statusEl.innerText = `Ditemukan ${result.length} data`
  }, 200)
})