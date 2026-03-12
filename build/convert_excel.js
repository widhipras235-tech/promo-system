const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")

const folders = [
"excel/divisi1",
"excel/divisi2",
"excel/divisi3",
"excel/divisi4"
]

let promo=[]
let skuIndex={}
let articleIndex={}

function addItem(item){

const index = promo.length

promo.push(item)
skuIndex[item.sku]=index

if(!articleIndex[item.article])
articleIndex[item.article]=[]

articleIndex[item.article].push(index)

}

folders.forEach(folder=>{

if(!fs.existsSync(folder)) return

fs.readdirSync(folder).forEach(file=>{

const wb = XLSX.readFile(path.join(folder,file))

wb.SheetNames.forEach(name=>{

const data = XLSX.utils.sheet_to_json(wb.Sheets[name])

data.forEach(row=>{

addItem({
sku:String(row.SKU),
article:String(row.ARTICLE),
promo:row.ACARA,
normal:row.NORMAL,
promo_price:row.PROMO,
divisi:folder.replace("excel/",""),
store:row.STORE,
start:row.START,
end:row.END
})

})

})

})

})

fs.writeFileSync("db/promo.json",JSON.stringify(promo))
fs.writeFileSync("db/sku_index.json",JSON.stringify(skuIndex))
fs.writeFileSync("db/article_index.json",JSON.stringify(articleIndex))