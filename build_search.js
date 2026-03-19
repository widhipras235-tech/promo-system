const fs = require("fs")
const path = require("path")
const lunr = require("lunr")

const DB_DIR = path.resolve("app/db")
const MAX_PER_FILE = 5000

let documents = []

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

const files = fs.readdirSync(DB_DIR).filter(f => f.startsWith("promo_"))

let id = 0

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(DB_DIR, file)))

  data.forEach(item => {
    documents.push({
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
    })
  })
})

console.log("📊 Total data:", documents.length)


// =========================
// BUILD LUNR INDEX
// =========================
const idx = lunr(function () {
  this.ref("id")

  this.field("sku")
  this.field("article")
  this.field("name")
  this.field("brand")

  documents.forEach(doc => this.add(doc))
})

// =========================
// SAVE INDEX
// =========================
fs.writeFileSync(
  path.join(DB_DIR, "search_index.json"),
  JSON.stringify(idx)
)


// =========================
// SPLIT STORE (WAJIB)
// =========================
let fileIndex = 1

for (let i = 0; i < documents.length; i += MAX_PER_FILE) {
  const chunk = documents.slice(i, i + MAX_PER_FILE)

  fs.writeFileSync(
    path.join(DB_DIR, `store_${fileIndex}.json`),
    JSON.stringify(chunk)
  )

  console.log(`✅ store_${fileIndex}.json (${chunk.length})`)
  fileIndex++
}

console.log("🎉 SELESAI (ULTRA FAST READY)")