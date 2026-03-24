const fs = require("fs")
const path = require("path")

const DB_DIR = path.resolve("app/db")
const OUTPUT = path.resolve("app/db/data.json")

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

let result = []

const files = fs.readdirSync(DB_DIR).filter(f => f.startsWith("promo_"))

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(DB_DIR, file)))

  data.forEach(item => {
    result.push({
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
    })
  })
})

fs.writeFileSync(OUTPUT, JSON.stringify(result))

console.log("✅ data.json siap:", result.length)