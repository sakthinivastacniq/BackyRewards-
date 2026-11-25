// SafeRewards v2 pilot policy. Synthetic inputs only; no client data.
const policy=Object.freeze({monthlyCap:4610,weeklyHours:12,weeklyShifts:3,baselineHours:20,baselineShifts:5,ratePer1000:5});
const finite=(v)=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const improvement=(a,b)=>finite(a)&&a>0&&finite(b)?100*(a-b)/a:null;
const tier=p=>p===null?0:p>=30-1e-9?125:p>=20-1e-9?80:p>=10-1e-9?40:0;
function score({days=[],baseline={},current={},comparable=false,validated=false,quest=null,streakMilestone=0,streakHistory=[],teamQualified=false,level=0,monthEarned=0}={}){
 if(!Array.isArray(days)||!Number.isInteger(level)||level<0||level>4||!finite(monthEarned))throw Error("Invalid input");
 const ids=new Set(); let wear=0,full=0,hours=0,shifts=0;
 for(const d of days){
 if(!d.id||ids.has(d.id))throw Error("Missing or duplicate shift ID");ids.add(d.id);
 if(d.validated!==true||!finite(d.wearHours)||!finite(d.eligibleHours)||d.eligibleHours<=0||d.wearHours>d.eligibleHours||d.eligibleHours>24)continue;
 hours+=d.wearHours;wear+=Math.min(80,Math.floor(d.wearHours*10));
 if(d.wearHours>=.8*d.eligibleHours){full+=20;shifts++;}
 }
 const r=improvement(baseline.rate,current.rate),e=improvement(baseline.exposure,current.exposure),s=improvement(baseline.stress,current.stress);
 const eligible=validated===true&&comparable===true&&baseline.validated===true&&finite(baseline.hours)&&baseline.hours>=20&&finite(baseline.shifts)&&baseline.shifts>=5&&hours>=12&&shifts>=3&&finite(baseline.exposure)&&baseline.exposure<=100&&finite(current.exposure)&&current.exposure<=100;
 const guard=eligible&&r!==null&&e!==null&&r>=-1e-9&&e>=-1e-9;
 const q=quest&&quest.validated===true?improvement(quest.baselineRate,quest.currentRate):null;
 const lines={wear,fullShift:full,frequency:guard?tier(r):0,exposure:guard?tier(e):0,quest:guard&&q!==null&&q>=15-1e-9?50:0,stress:guard&&s!==null&&s>=15-1e-9?40:0,streak:validated===true&&([5,10,20].includes(streakMilestone))&&((streakMilestone===5&&shifts>=5)||(Array.isArray(streakHistory)&&streakHistory.length===streakMilestone&&streakHistory.every((d,i)=>d&&d.validated===true&&d.qualifying===true&&Number.isInteger(d.sequence)&& (i===0||d.sequence===streakHistory[i-1].sequence+1))&&new Set(streakHistory.map(d=>d.id)).size===streakMilestone&&streakHistory.every(d=>typeof d.id==="string"&&d.id.length>0)&&shifts>=1))?({5:50,10:150,20:400}[streakMilestone]||0):0,team:validated===true&&teamQualified===true?100:0};
 const raw=Object.values(lines).reduce((a,b)=>a+b,0),multiplier=[1,1.05,1.1,1.15,1.2][level];
 return {lines,raw,multiplier,award:Math.max(0,Math.min(Math.floor(policy.monthlyCap-monthEarned),Math.floor(raw*multiplier+1e-9))),frequencyImprovement:r,exposureImprovement:e,eligible,guard};
}
if(typeof module!=="undefined")module.exports={policy,score,improvement,tier};
