let skuIndex = {}
let articleIndex = {}
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
LOAD INDEX
========================= */
async function loadIndex() {
  try {
    statusEl.innerText = "Loading index..."

    const skuRes = await fetch("./db/sku_index.json")
    const articleRes = await fetch("./db/article_index.json")

    if (skuRes.ok) {
      skuIndex = await skuRes.json()
    }

    if (articleRes.ok) {
      articleIndex = await articleRes.json()
    }

    console.log("✅ Index Loaded")
    console.log("SKU:", Object.keys(skuIndex).length)
    console.log("ARTICLE:", Object.keys(articleIndex).length)

    isReady = true
    statusEl.innerText = "Siap digunakan"
  } catch (err) {
    console.log("❌ Index gagal:", err)

    // tetap lanjut walau index gagal
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

/* =========================
LOAD FILE
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
SEARCH SUPER CEPAT + FALLBACK
========================= */
async function searchData(keyword) {
  keyword = keyword.toLowerCase().trim()

  let results = []
  let indexes = new Set()

  /* =========================
  1. EXACT MATCH (PRIORITAS UTAMA)
  ========================= */
  if (skuIndex[keyword]) {
    skuIndex[keyword].forEach(i => indexes.add(i))
  }

  if (articleIndex[keyword]) {
    articleIndex[keyword].forEach(i => indexes.add(i))
  }

  // 🔥 kalau exact ketemu → langsung ambil & return
  if (indexes.size > 0) {
    return await collectResults(indexes, keyword, true)
  }

  /* =========================
  2. PARTIAL MATCH (LEBIH KETAT)
  ========================= */
  for (let key in skuIndex) {
    if (key.startsWith(keyword)) { // 🔥 lebih akurat dari includes
      skuIndex[key].forEach(i => {
        if (indexes.size < MAX_RESULT) indexes.add(i)
      })
    }
    if (indexes.size >= MAX_RESULT) break
  }

  /* =========================
  3. FALLBACK (SCAN DATA)
  ========================= */
  if (indexes.size === 0) {
    const data = await loadFile(1)

    return data
      .filter(item =>
        item.sku?.toLowerCase() === keyword || // 🔥 exact SKU
        item.article?.toLowerCase().includes(keyword) ||
        item.deskripsi?.toLowerCase().includes(keyword)
      )
      .slice(0, MAX_RESULT)
  }

  return await collectResults(indexes, keyword, false)
}

async function collectResults(indexes, keyword, isExact) {
  let results = []
  let fileMap = {}

  indexes.forEach(i => {
    const fileIndex = Math.floor(i / 5000) + 1
    if (!fileMap[fileIndex]) fileMap[fileIndex] = []
    fileMap[fileIndex].push(i)
  })

  for (let fileIndex in fileMap) {
    const data = await loadFile(fileIndex)

    for (let i of fileMap[fileIndex]) {
      const localIndex = i % 5000
      const item = data[localIndex]

      if (!item) continue

      // 🔥 VALIDASI ULANG (PENTING)
      if (isExact) {
        if (
          item.sku?.toLowerCase() === keyword ||
          item.article?.toLowerCase() === keyword
        ) {
          results.push(item)
        }
      } else {
        if (
          item.sku?.toLowerCase().startsWith(keyword) ||
          item.article?.toLowerCase().includes(keyword) ||
          item.deskripsi?.toLowerCase().includes(keyword)
        ) {
          results.push(item)
        }
      }

      if (results.length >= MAX_RESULT) return results
    }
  }

  return results
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
        Berlaku: ${item.mulai || "-"} - ${item.akhir || "-"}
      </div>

      <div><b>Acara:</b> ${item.acara || item.raw?.acara || "-"}</div>

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

  const keyword = e.target.value.trim()

  if (!isReady) {
    statusEl.innerText = "Loading..."
    return
  }

  timer = setTimeout(async () => {
    if (!keyword) {
      resultEl.innerHTML = ""
      statusEl.innerText = "Ketik untuk mencari"
      return
    }

    statusEl.innerText = "Mencari..."

    const result = await searchData(keyword)

    render(result)

    statusEl.innerText = `Ditemukan ${result.length} data`
  }, 300)
})