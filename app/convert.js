const xlsx = require("xlsx")
const fs = require("fs")
const path = require("path")

const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./app/db"

if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER, { recursive: true })
}

/* =========================
HELPER
========================= */
function normalize(val){
  return (val||"").toString().toLowerCase().replace(/[^a-z0-9]/g,"")
}

function get(row, keys){
  for(let k of keys){
    if(row[k] !== undefined) return row[k]
  }
  return null
}

/* =========================
PROCESS
========================= */
let index = []
let fileIndex = 1

const files = fs.readdirSync(INPUT_FOLDER).filter(f=>f.endsWith(".xlsx"))

files.forEach(file=>{
  const wb = xlsx.readFile(path.join(INPUT_FOLDER,file))

  wb.SheetNames.forEach(sheet=>{
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet])

    let output = []

    rows.forEach((row,i)=>{

      const sku = get(row,["SKU","Sku","sku"])
      const article = get(row,["ARTICLE","Article"])

      const item = {
        sku: sku || "",
        article: article || "",
        deskripsi: get(row,["DESKRIPSI","Deskripsi"]) || "",
        brand: get(row,["BRAND","Brand"]) || "",
        harga_normal: get(row,["HARGA NORMAL"]) || null,
        harga_promo: get(row,["HARGA PROMO"]) || null,
        diskon: get(row,["DISKON"]) || null,
        fromdate: get(row,["FROM DATE"]) || null,
        todate: get(row,["TO DATE"]) || null,
        acara: get(row,["ACARA"]) || "",
        source: file
      }

      output.push(item)

      const key = normalize(sku)
      if(key){
        index.push([key,fileIndex,i])
      }
    })

    fs.writeFileSync(
      `${OUTPUT_FOLDER}/promo_${fileIndex}.json`,
      JSON.stringify(output)
    )

    console.log("✔ File:", fileIndex, file)

    fileIndex++
  })
})

/* =========================
SAVE INDEX
========================= */
fs.writeFileSync(
  `${OUTPUT_FOLDER}/index.json`,
  JSON.stringify(index)
)

console.log("🔥 SELESAI TOTAL")