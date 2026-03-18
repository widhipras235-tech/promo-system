let skuIndex = {}
let articleIndex = {}
let cache = {}
let isReady = false

/* =========================
LOAD INDEX (WAJIB)
========================= */

async function loadIndex() {
  try {
    const skuRes = await fetch("./db/sku_index.json")
    skuIndex = await skuRes.json()

    const articleRes = await fetch("./db/article_index.json")
    articleIndex = await articleRes.json()

    console.log("✅ Index loaded")
    console.log("SKU:", Object.keys(skuIndex).length)
    console.log("ARTICLE:", Object.keys(articleIndex).length)

    isReady = true
    document.getElementById("status").innerText = "✅ Siap digunakan"

  } catch (err) {
    console.log("❌ Gagal load index", err)
    document.getElementById("status").innerText = "❌ Gagal load data"
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
LOAD FILE (SMART CACHE)
========================= */

async function loadFile(fileIndex) {
  if (cache[fileIndex]) return cache[fileIndex]

  const res = await fetch(`./db/promo_${fileIndex}.json`)
  const data = await res.json()

  cache[fileIndex] = data
  return data
}

/* =========================
SEARCH ENGINE (OPTIMIZED)
========================= */

async function searchData(keyword) {
  keyword = keyword.toLowerCase()

  let indexes = new Set()

  // 🔥 SKU (partial match)
  Object.keys(skuIndex).forEach(key => {
    if (key.includes(keyword)) {
      skuIndex[key].forEach(i => indexes.add(i))
    }
  })

  // 🔥 ARTICLE (partial match)
  Object.keys(articleIndex).forEach(key => {
    if (key.includes(keyword)) {
      articleIndex[key].forEach(i => indexes.add(i))
    }
  })

  if (indexes.size === 0) return []

  let fileMap = {}

  indexes.forEach(i => {
    const fileIndex = Math.floor(i / 5000) + 1

    if (!fileMap[fileIndex]) fileMap[fileIndex] = []
    fileMap[fileIndex].push(i)
  })

  let results = []

  for (let fileIndex in fileMap) {
    const data = await loadFile(fileIndex)

    fileMap[fileIndex].forEach(i => {
      const localIndex = i % 5000
      if (data[localIndex]) results.push(data[localIndex])
    })
  }

  return results
}

/* =========================
RENDER UI
========================= */

function render(data) {
  const container = document.getElementById("result")
  container.innerHTML = ""

  if (!data.length) {
    container.innerHTML = "<p>Data tidak ditemukan</p>"
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

    container.appendChild(el)
  })
}

/* =========================
EVENT SEARCH
========================= */

document.getElementById("search").addEventListener("input", async e => {
  const keyword = e.target.value.trim()

  if (!isReady) {
    console.log("⏳ Index belum siap")
    return
  }

  if (!keyword) {
    document.getElementById("result").innerHTML = ""
    return
  }

  const result = await searchData(keyword)
  render(result)
})