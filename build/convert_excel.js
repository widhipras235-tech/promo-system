const fs = require("fs")
const path = require("path")
const XLSX = require("xlsx")

const BASE="excel"
const SPLIT_SIZE=1000

const DIVISI=[
"divisi1",
"divisi2",
"divisi3",
"divisi4"
]

let promo=[]
let skuIndex={}
let articleIndex={}


/* =========================
NORMALIZE TEXT
========================= */

function norm(v){
if(!v) return ""
return String(v).trim()
}


/* =========================
BERSIHKAN HARGA
========================= */

function cleanPrice(v){

if(!v) return ""

let num=String(v)
.replace(/[^\d]/g,"")

return num ? Number(num) : ""

}


/* =========================
FIND COLUMN FLEXIBLE
========================= */

function find(row,keys){

for(let k in row){

const name=k
.toUpperCase()
.replace(/\s/g,"")

for(let key of keys){

if(name.includes(key))
return row[k]

}

}

return ""

}


/* =========================
FORMAT TANGGAL EXCEL
========================= */

function excelDate(v){

if(!v) return ""

if(typeof v==="number"){

const d=XLSX.SSF.parse_date_code(v)

if(!d) return ""

return `${d.d}-${d.m}-${d.y}`

}

if(v instanceof Date){

return `${v.getDate()}-${v.getMonth()+1}-${v.getFullYear()}`

}

return String(v)

}


/* =========================
READ EXCEL
========================= */

DIVISI.forEach(div=>{

const folder=path.join(BASE,div)

if(!fs.existsSync(folder)) return

const files=fs.readdirSync(folder)

files.forEach(file=>{

if(!file.endsWith(".xlsx")) return

const filePath=path.join(folder,file)

console.log("READ:",filePath)

const wb=XLSX.readFile(filePath,{cellDates:true})

wb.SheetNames.forEach(sheetName=>{

const rows=XLSX.utils.sheet_to_json(
wb.Sheets[sheetName],
{raw:false,defval:""}
)

rows.forEach(r=>{

const hargaNormal=find(r,[
"NORMAL",
"HARGANORMAL",
"PRICE"
])

const hargaPromo=find(r,[
"PROMO",
"SHARP",
"SPECIAL",
"SP"
])

const item={

deskripsi:norm(find(r,[
"DESC",
"DESKRIPSI",
"DESCRIPTION"
])),

brand:norm(find(r,[
"BRAND"
])),

sku:norm(find(r,[
"SKU",
"BARCODE"
])),

article:norm(find(r,[
"ARTICLE",
"ARTIKEL"
])),

harga_normal:cleanPrice(hargaNormal),

harga_promo:norm(hargaPromo),

diskon:norm(find(r,[
"DISC",
"DISKON",
"DISCOUNT"
])),

berlaku:
excelDate(find(r,["FROM","START"]))+
" - "+
excelDate(find(r,["TO","END"])),

acara:norm(find(r,[
"EVENT",
"ACARA"
])),

division:div,

file:file,

sheet:sheetName

}

if(!item.sku && !item.deskripsi) return

promo.push(item)

const i=promo.length-1


/* INDEX SKU */

if(item.sku){

if(!skuIndex[item.sku])
skuIndex[item.sku]=[]

skuIndex[item.sku].push(i)

}


/* INDEX ARTICLE */

if(item.article){

if(!articleIndex[item.article])
articleIndex[item.article]=[]

articleIndex[item.article].push(i)

}

})

})

})

})


/* =========================
SAVE DATABASE
========================= */

if(!fs.existsSync("db"))
fs.mkdirSync("db")


/* MASTER DATABASE */

fs.writeFileSync(
"db/promo.json",
JSON.stringify(promo,null,2)
)


/* =========================
AUTO SPLIT JSON
========================= */

let part=1

for(let i=0;i<promo.length;i+=SPLIT_SIZE){

let chunk=promo.slice(i,i+SPLIT_SIZE)

fs.writeFileSync(
`db/promo_${part}.json`,
JSON.stringify(chunk)
)

console.log("CREATE promo_"+part+".json")

part++

}


/* =========================
SAVE INDEX
========================= */

fs.writeFileSync(
"db/sku_index.json",
JSON.stringify(skuIndex)
)

fs.writeFileSync(
"db/article_index.json",
JSON.stringify(articleIndex)
)

console.log("DATABASE SELESAI")
console.log("TOTAL PROMO:",promo.length)
console.log("TOTAL SPLIT:",part-1)