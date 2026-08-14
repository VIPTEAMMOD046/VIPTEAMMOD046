javascript:(function(){
const e={apiKey:"AIzaSyCQXFVVGKoESiXvRSNvcdOCHk3JJRauweo",projectId:"bypass-menu",databaseURL:"https://bypass-menu-default-rtdb.firebaseio.com"};

async function loadFirebase(){
    window.firebase||(await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"),
    await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"),
    await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js")),
    firebase.apps.length||firebase.initializeApp(e)
}

async function checkLicense(){
    let expiry=null;
    try{
        await loadFirebase();
        const snapshot=await firebase.database().ref("licenses/bypass-menu").once("value");
        const data=snapshot.val();
        if(data&&data.expiration){expiry=new Date(data.expiration)}
    }catch(err){console.log("Firebase check failed")}
    if(!expiry){expiry=new Date(2027,0,1)}
    const now=new Date();
    return{valid:now<=expiry,daysRemaining:Math.ceil((expiry-now)/864e5)}
}

async function getScripts(){
    try{
        const snapshot=await firebase.database().ref("script_urls").once("value");
        return snapshot.val()||{};
    }catch(err){return {}}
}

async function getValidKeys(siteKey){
    try{
        const globalSnapshot=await firebase.database().ref("global_otp_keys").once("value");
        const globalKeys=globalSnapshot.val()||{};
        const validGlobalKeys=Object.keys(globalKeys).filter(k=>globalKeys[k].valid===true);
        
        const siteSnapshot=await firebase.database().ref("site_otp_keys").child(siteKey).once("value");
        const siteKeys=siteSnapshot.val()||{};
        const validSiteKeys=Object.keys(siteKeys).filter(k=>siteKeys[k].valid===true);
        
        return[...validGlobalKeys,...validSiteKeys];
    }catch(err){
        return[];
    }
}

function loadScript(src){
    return new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src=src;
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
    });
}

function promptForKey(menu,validKeys){
    return new Promise((resolve)=>{
        const overlay=document.createElement("div");
        overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;";
        
        const dialog=document.createElement("div");
        dialog.style.cssText="background:#0a0e17;border:2px solid #6366f1;border-radius:16px;padding:25px;width:320px;text-align:center;color:#fff;box-shadow:0 0 30px rgba(99,102,241,0.4);";
        dialog.innerHTML=`
            <div style="font-size:35px;margin-bottom:10px">🔑</div>
            <div style="font-size:14px;font-weight:700;color:#a78bfa;margin-bottom:5px">${menu.name}</div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:15px">Enter Access Key to Continue</div>
            <input type="password" id="keyInput" placeholder="Enter key..." style="width:100%;padding:10px;border-radius:8px;border:1px solid #6366f1;background:rgba(99,102,241,0.1);color:#fff;font-size:13px;text-align:center;margin-bottom:12px;outline:none;">
            <div style="display:flex;gap:6px;">
                <button id="keySubmit" style="flex:1;padding:10px;border-radius:8px;border:1px solid #6366f1;background:#6366f1;color:#fff;cursor:pointer;font-weight:700;font-size:11px;">UNLOCK</button>
                <button id="keyCancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #ef4444;background:rgba(239,68,68,0.1);color:#f87171;cursor:pointer;font-weight:700;font-size:11px;">CANCEL</button>
            </div>
            <div id="keyError" style="font-size:10px;color:#ef4444;margin-top:8px;display:none;">❌ Invalid key!</div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const input=document.getElementById("keyInput");
        input.focus();
        
        function checkKey(){
            const enteredKey=input.value.trim().toUpperCase();
            if(validKeys.includes(enteredKey)){
                overlay.remove();
                resolve(true);
            }else{
                document.getElementById("keyError").style.display="block";
                input.value="";
                input.focus();
            }
        }
        
        document.getElementById("keySubmit").addEventListener("click",checkKey);
        document.getElementById("keyCancel").addEventListener("click",function(){
            overlay.remove();
            resolve(false);
        });
        input.addEventListener("keypress",function(e){
            if(e.key==="Enter")checkKey();
        });
    });
}

function isScriptExpired(script){
    if(!script.expiration)return false;
    const expDate=new Date(script.expiration);
    const now=new Date();
    return now>expDate;
}

async function main(){
    const license=await checkLicense();
    if(!license.valid){
        alert("License Expired! Contact admin to renew.");
        return;
    }
    
    console.log("✅ Global license valid. Days remaining:",license.daysRemaining);
    const scripts=await getScripts();
    const currentUrl=window.location.hostname;
    console.log("Current site:",currentUrl);
    
    for(const key in scripts){
        const script=scripts[key];
        if(script.site&&currentUrl.includes(script.site)){
            // Check if this specific script is expired
            if(isScriptExpired(script)){
                alert("❌ This service has expired!\n\nService: "+script.name+"\n\nContact admin to renew.");
                return;
            }
            
            console.log("✅ Script active:",script.name);
            
            // Check if site has keys
            const validKeys=await getValidKeys(key);
            if(validKeys.length>0){
                const valid=await promptForKey(script,validKeys);
                if(!valid){
                    console.log("❌ Access cancelled");
                    return;
                }
            }
            
            console.log("Loading:",script.name);
            const s=document.createElement("script");
            s.src=script.url+"?v="+Date.now();
            s.onload=()=>console.log("✅ Loaded:",script.name);
            s.onerror=()=>alert("Failed to load "+script.name);
            document.head.appendChild(s);
            return;
        }
    }
    
    alert("This site is not supported.\n\nCheck admin panel for configured sites.");
}

main().catch(err=>{
    console.error(err);
    alert("Error: "+err.message);
});
})();
