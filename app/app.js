let skuIndex = {}
let articleIndex = {}
let cache = {}
let isReady = false

const MAX_RESULT = 30

/* =========================
LOAD INDEX
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
    document.getElementById("status").innerText = "Ketik SKU / nama produk"
  } catch (err) {
    console.log("❌ Gagal load index", err)
    document.getElementById("status").innerText = "Gagal load data"
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
LOAD FILE (CACHE)
========================= */

async function loadFile(fileIndex) {
  if (cache[fileIndex]) return cache[fileIndex]

  const res = await fetch(`./db/promo_${fileIndex}.json`)
  const data = await res.json()

  cache[fileIndex] = data
  return data
}

/* =========================
SEARCH SUPER CEPAT
========================= */

async function searchData(keyword) {
  keyword = keyword.toLowerCase()

  let results = []
  let indexes = new Set()

  // 🔥 1. EXACT MATCH (SUPER CEPAT)
  if (skuIndex[keyword]) {
    for (let i of skuIndex[keyword]) {
      indexes.add(i)
      if (indexes.size >= MAX_RESULT) break
    }
  }

  if (articleIndex[keyword]) {
    for (let i of articleIndex[keyword]) {
      indexes.add(i)
      if (indexes.size >= MAX_RESULT) break
    }
  }

  // 🔥 2. PARTIAL MATCH (DIBATASI)
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

  if (indexes.size < MAX_RESULT) {
    for (let key in articleIndex) {
      if (key.includes(keyword)) {
        for (let i of articleIndex[key]) {
          indexes.add(i)
          if (indexes.size >= MAX_RESULT) break
        }
      }
      if (indexes.size >= MAX_RESULT) break
    }
  }

  // 🔥 3. FALLBACK (AMBIL 1 FILE SAJA)
  if (indexes.size === 0) {
    const data = await loadFile(1)

    return data
      .filter(item =>
        (item.search && item.search.includes(keyword)) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(keyword))
      )
      .slice(0, MAX_RESULT)
  }

  // 🔥 4. MAP FILE
  let fileMap = {}

  indexes.forEach(i => {
    const fileIndex = Math.floor(i / 5000) + 1

    if (!fileMap[fileIndex]) fileMap[fileIndex] = []
    fileMap[fileIndex].push(i)
  })

  // 🔥 5. LOAD DATA SESUAI KEBUTUHAN
  for (let fileIndex in fileMap) {
    const data = await loadFile(fileIndex)

    for (let i of fileMap[fileIndex]) {
      const localIndex = i % 5000

      if (data[localIndex]) {
        results.push(data[localIndex])
      }

      // 🔥 STOP kalau sudah 30
      if (results.length >= MAX_RESULT) {
        return results
      }
    }
  }

  return results
}

/* =========================
RENDER
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
EVENT (DEBOUNCE)
========================= */

let timer

document.getElementById("search").addEventListener("input", e => {
  clearTimeout(timer)

  const keyword = e.target.value.trim()

  if (!isReady) return

  timer = setTimeout(async () => {
    if (!keyword) {
      document.getElementById("result").innerHTML = ""
      return
    }

    document.getElementById("status").innerText = "Mencari..."

    const result = await searchData(keyword)

    render(result)

    document.getElementById("status").innerText = `Ditemukan ${result.length} data`
  }, 300)
})