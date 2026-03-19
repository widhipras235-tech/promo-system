const fs = require("fs")
const path = require("path")

const DB_DIR = path.resolve("app/db")

let allData = []
let id = 0

function normalize(val) {
  return val ? String(val).toLowerCase().trim() : ""
}

function findValue(obj, keywords) {
  for (let key in obj) {
    const clean = key.toLowerCase().replace(/[^a-z0-9]/g, "")
    for (let word of keywords) {
      if (clean.includes(word)) {
        return obj[key]
      }
    }
  }
  return ""
}

const files = fs.readdirSync(DB_DIR)
  .filter(f => f.startsWith("promo_"))

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(DB_DIR, file)))

  data.forEach(item => {
    const doc = {
      id: id++,
      sku: normalize(findValue(item, ["sku"])),
      article: normalize(findValue(item, ["article"])),
      name: normalize(findValue(item, ["desc", "nama", "produk"])),
      brand: normalize(findValue(item, ["brand"])),
      harga_normal: item.harga_normal || "",
      harga_promo: item.harga_promo || "",
      diskon: item.diskon || "",
      mulai: item.mulai || "",
      akhir: item.akhir || "",
      acara: item.acara || "",
      source: item.source || ""
    }

    allData.push(doc)
  })
})

fs.writeFileSync(
  path.join(DB_DIR, "search_data.json"),
  JSON.stringify(allData)
)

console.log("✅ search_data.json siap:", allData.length)