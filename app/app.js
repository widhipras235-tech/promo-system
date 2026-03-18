let allData = []
let currentData = []

/* =========================
LOAD ALL JSON
========================= */

async function loadData() {
  let index = 1

  while (true) {
    const url = `./db/promo_${index}.json`
    console.log("LOAD:", url)

    try {
      const res = await fetch(url)

      if (!res.ok) {
        console.log("STOP di:", url)
        break
      }

      const data = await res.json()
      console.log("DATA:", data.length)

      allData = allData.concat(data)

      index++
    } catch (err) {
      console.log("ERROR:", err)
      break
    }
  }

  console.log("✅ TOTAL:", allData.length)

  // 🔥 tampilkan langsung
  render(allData)
}

loadData()

/* =========================
UTILS
========================= */

function formatRupiah(num) {
  if (!num || isNaN(num)) return num
  return "Rp " + Number(num).toLocaleString("id-ID")
}

function formatDiskon(val) {
  if (!val) return null

  if (!isNaN(val)) {
    let num = Number(val)

    if (num <= 1) {
      return Math.round(num * 100) + "%"
    } else {
      return num + "%"
    }
  }

  return val
}

function formatTanggal(val) {
  if (!val) return "-"
  return val
}

function getFileName(path) {
  if (!path) return "-"
  return path.split(/[\\/]/).pop()
}

/* =========================
SEARCH
========================= */

function searchData(keyword) {
  keyword = keyword.toLowerCase()

  return allData.filter(item => {
    return (
      (item.sku && item.sku.toLowerCase().includes(keyword)) ||
      (item.article && item.article.toLowerCase().includes(keyword)) ||
      (item.search && item.search.includes(keyword))
    )
  })
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
    const hargaNormal = formatRupiah(item.harga_normal)
    const hargaPromo = formatRupiah(item.harga_promo)
    const diskon = formatDiskon(item.diskon || item.raw?.diskon)

    const isDiskon = diskon && diskon !== null

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
            ? `<span style="text-decoration:line-through;color:gray">${hargaNormal}</span>`
            : hargaNormal
        }
      </div>

      <div style="color:red;font-weight:bold;font-size:18px">
        Harga Promo: ${!isNaN(item.harga_promo) ? hargaPromo : (item.harga_promo || "-")}
      </div>

      <div style="color:green;font-weight:bold">
        Diskon: ${diskon || "-"}
      </div>

      <div>
        Berlaku: ${formatTanggal(item.mulai)} - ${formatTanggal(item.akhir)}
      </div>

      <div><b>Acara:</b> ${item.acara || item.raw?.acara || "-"}</div>

      <div><b>Sumber:</b> ${getFileName(item.source)}</div>
    `

    container.appendChild(el)
  })
}

/* =========================
EVENT
========================= */

document.getElementById("search").addEventListener("input", e => {
  const keyword = e.target.value

  if (!keyword) {
    render([])
    return
  }

  const result = searchData(keyword)
  render(result)
})