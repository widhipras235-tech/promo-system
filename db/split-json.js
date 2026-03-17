const fs = require("fs")

const MAX_SIZE = 5000   // jumlah item per file
const source = JSON.parse(fs.readFileSync("promo.json","utf8"))

let index = 1

for(let i=0;i<source.length;i+=MAX_SIZE){

const chunk = source.slice(i,i+MAX_SIZE)

fs.writeFileSync(
`promo_${index}.json`,
JSON.stringify(chunk)
)

console.log("Created promo_"+index+".json")

index++

}