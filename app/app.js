let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

async function loadDatabase(){

try{

const res=await fetch("db/promo.json")

DB=await res.json()

}catch(e){

result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase



searchInput.addEventListener("input",e=>{

let q=e.target.value.toLowerCase()

if(q.length<2){

result.innerHTML=""
return

}

search(q)

})



function search(q){

let data=DB.filter(item=>{

return(

String(item.sku).toLowerCase().includes(q) ||

String(item.artikel).toLowerCase().includes(q) ||

String(item.deskripsi).toLowerCase().includes(q) ||

String(item.brand).toLowerCase().includes(q)

)

})

render(data.slice(0,30))

}



function rupiah(n){

n=Number(String(n).replace(/[^\d]/g,""))

return "Rp "+new Intl.NumberFormat("id-ID").format(n)

}



function getPromoStatus(range){

if(!range) return ""

let parts=range.split("-")

if(parts.length<2) return ""

let start=new Date(parts[0].trim())
let end=new Date(parts[1].trim())

let today=new Date()

if(today<start) return "BELUM AKTIF"
if(today>end) return "BERAKHIR"

return "AKTIF"

}



function promoEngine(item){

let normal=item.harga_normal
let promo=item.harga_promo
let diskon=item.diskon||""

let text=(promo+" "+item.acara+" "+diskon).toUpperCase()

let normalNum=Number(String(normal).replace(/[^\d]/g,""))
let promoNum=Number(String(promo).replace(/[^\d]/g,""))

let result={
normal:rupiah(normalNum),
promo:"",
diskon:diskon,
coret:false
}



let percent=text.match(/(\d+)\s*%/)

if(percent){

let p=parseInt(percent[1])

let promoCalc=Math.round(normalNum*(100-p)/100)

result.normal=rupiah(normalNum)
result.promo=rupiah(promoCalc)
result.diskon=p+"%"
result.coret=true

return result

}



if(text.includes("SHARP")){

result.normal="@"+rupiah(normalNum)
result.promo=rupiah(normalNum)
result.diskon="SHARP PRICE"

return result

}



let sp=text.match(/SP\s*(\d+)\s*K/)

if(sp){

let price=parseInt(sp[1])*1000

result.normal=rupiah(normalNum)
result.promo=rupiah(price)

result.diskon="SPECIAL PRICE"

result.coret=true

return result

}



let bxgy=text.match(/B(\d+)G(\d+)/)

if(bxgy){

result.normal=rupiah(normalNum)
result.promo="B"+bxgy[1]+"G"+bxgy[2]
result.diskon="BXGY"

return result

}



if(promoNum){

result.promo=rupiah(promoNum)

}

return result

}



function render(data){

if(data.length===0){

result.innerHTML="Promo tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let p=promoEngine(item)

let status=getPromoStatus(item.berlaku)

let statusClass="aktif"

if(status==="BELUM AKTIF") statusClass="belum"
if(status==="BERAKHIR") statusClass="berakhir"

let normalDisplay=p.coret

? `<span class="price-normal">${p.normal}</span>`
: `<span>${p.normal}</span>`

let promoDisplay=p.promo

? `<div class="promo">${p.promo}</div>`
: ""

html+=`

<div class="card">

<div class="card-header">

<div class="title">
${item.deskripsi}
</div>

<div class="status ${statusClass}">
${status}
</div>

</div>

<div class="price-area">

${normalDisplay}

${promoDisplay}

</div>

<div class="diskon">
Diskon ${p.diskon}
</div>

<div class="meta">

<div>
Berlaku: ${item.berlaku}
</div>

<div>
Promo: ${item.acara}
</div>

<div>
📄 ${item.file}
</div>

<div>
📑 ${item.sheet}
</div>

</div>

</div>

`

})

result.innerHTML=html

}