let skuIndex = {}
let articleIndex = {}
let cache = {}
let isReady = false

const MAX_RESULT = 30

/* =========================
SAFE ELEMENT
========================= */
const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

/* =========================
LOAD INDEX (WAJIB BERHASIL)
========================= */

async function loadIndex() {
  try {
    statusEl.innerText = "Loading index..."

    const skuRes = await fetch("../db/sku_index.json")
    if (!skuRes.ok) throw "SKU index not found"
    skuIndex = await skuRes.json()

    const articleRes = await fetch("../db/article_index.json")
    if (!articleRes.ok) throw "Article index not found"
    articleIndex = await articleRes.json()

    console.log("✅ Index OK")
    console.log("SKU:", Object.keys(skuIndex).length)

    isReady = true
    statusEl.innerText = "Siap digunakan"
  } catch (err) {
    console.log("❌ ERROR:", err)
    statusEl.innerText = "Gagal load index (cek path / nama file)"
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
LOAD FILE (SAFE + CACHE)
========================= */

async function loadFile(fileIndex) {
  try {
    if (cache[fileIndex]) return cache[fileIndex]

    const res = await fetch(`./db/promo_${fileIndex}.json`)
    if (!res.ok) throw "file not found"

    const data = await res.json()
    cache[fileIndex] = data

    return data
  } catch (err) {
    console.log("❌ gagal load file:", fileIndex)
    return []
  }
}

/* =========================
SEARCH (ANTI ERROR)
========================= */

async function searchData(keyword) {
  keyword = keyword.toLowerCase()

  let results = []
  let indexes = new Set()

  try {
    // EXACT MATCH
    if (skuIndex[keyword]) {
      skuIndex[keyword].forEach(i => {
        if (indexes.size < MAX_RESULT) indexes.add(i)
      })
    }

    if (articleIndex[keyword]) {
      articleIndex[keyword].forEach(i => {
        if (indexes.size < MAX_RESULT) indexes.add(i)
      })
    }

    // PARTIAL
    if (indexes.size < MAX_RESULT) {
      for (let key in skuIndex) {
        if (key.includes(keyword)) {
          for (let i of skuIndex[key]) {
            indexes.add(i)
            if (indexes.size >= MAX_RESULT) break
          }
        }
        if (indexes.size >= MAX_RESULT) break
      }
    }

    // FALLBACK
    if (indexes.size === 0) {
      const data = await loadFile(1)

      return data
        .filter(item =>
          (item.deskripsi || "").toLowerCase().includes(keyword)
        )
        .slice(0, MAX_RESULT)
    }

    // LOAD FILE
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

        if (data[localIndex]) {
          results.push(data[localIndex])
        }

        if (results.length >= MAX_RESULT) {
          return results
        }
      }
    }

    return results
  } catch (err) {
    console.log("❌ ERROR SEARCH:", err)
    return []
  }
}

/* =========================
RENDER (ANTI BLANK)
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
            ? `<span style="text-decoration:line-through">${formatRupiah(item.harga_normal)}</span>`
            : formatRupiah(item.harga_normal)
        }
      </div>

      <div style="color:red;font-weight:bold">
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
EVENT (ANTI ERROR)
========================= */

let timer

searchInput.addEventListener("input", e => {
  clearTimeout(timer)

  const keyword = e.target.value.trim()

  if (!isReady) {
    statusEl.innerText = "Data belum siap..."
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