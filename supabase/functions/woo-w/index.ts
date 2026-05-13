const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(r)=>{
if(r.method==="OPTIONS")return new Response("ok",{headers:h});
try{
const u=Deno.env.get("WC_STORE_URL"),k=Deno.env.get("WC_CONSUMER_KEY"),s=Deno.env.get("WC_CONSUMER_SECRET");
if(!u||!k||!s)return new Response(JSON.stringify({error:"Missing secrets",u:!!u,k:!!k,s:!!s}),{status:500,headers:{...h,"Content-Type":"application/json"}});
const b=await r.json().catch(()=>({type:"orders"}));
const res=await fetch(`${u}/wp-json/wc/v3/${b.type||"orders"}?per_page=10&consumer_key=${k}&consumer_secret=${s}`);
const d=await res.json();
return new Response(JSON.stringify({success:true,count:d.length}),{headers:{...h,"Content-Type":"application/json"}});
}catch(e){
return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...h,"Content-Type":"application/json"}});
}
});
