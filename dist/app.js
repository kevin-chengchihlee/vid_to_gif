import { GIFEncoder, quantize, applyPalette } from 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm';

const $=s=>document.querySelector(s), fileInput=$('#fileInput'), dropzone=$('#dropzone'), editor=$('#editor'), video=$('#video');
const start=$('#startTime'), end=$('#endTime'), startR=$('#startRange'), endR=$('#endRange');
let file, objectUrl, outputUrl, width=480;

const fmtBytes=n=>n<1e6?`${(n/1e3).toFixed(0)} KB`:`${(n/1e6).toFixed(1)} MB`;
const fmtTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const seek=t=>new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=Math.min(t,video.duration-.001)});

function update(){
  if(!video.duration)return;
  let a=Math.max(0,Math.min(+start.value,video.duration)), b=Math.max(a+.1,Math.min(+end.value,video.duration));
  start.value=a.toFixed(1);end.value=b.toFixed(1);startR.value=a;endR.value=b;
  const length=b-a, fps=+$('#fps').value, ratio=video.videoHeight/video.videoWidth;
  $('#clipLength').value=`${length.toFixed(1)} sec clip`;
  const rough=width*(width*ratio)*length*fps*.08;
  $('#estimate').textContent=`≈ ${fmtBytes(rough)}`;
}

function load(f){
  if(!f||!f.type.startsWith('video/'))return alert('Please choose a video file.');
  if(f.size>250e6)return alert('Please choose a video under 250 MB.');
  file=f;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(f);video.src=objectUrl;
  video.onloadedmetadata=()=>{const d=video.duration;end.value=Math.min(d,10).toFixed(1);startR.max=endR.max=d;endR.value=Math.min(d,10);$('#fileName').textContent=f.name;$('#fileMeta').textContent=`${fmtBytes(f.size)} · ${fmtTime(d)} · ${video.videoWidth}×${video.videoHeight}`;dropzone.hidden=true;editor.hidden=false;$('#result').hidden=true;update()};
}
function reset(){video.pause();video.removeAttribute('src');video.load();if(objectUrl)URL.revokeObjectURL(objectUrl);file=null;editor.hidden=true;$('#result').hidden=true;dropzone.hidden=false;fileInput.value=''}

fileInput.onchange=e=>load(e.target.files[0]);dropzone.ondragover=e=>{e.preventDefault();dropzone.classList.add('drag')};dropzone.ondragleave=()=>dropzone.classList.remove('drag');dropzone.ondrop=e=>{e.preventDefault();dropzone.classList.remove('drag');load(e.dataTransfer.files[0])};dropzone.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')fileInput.click()};
$('#replaceBtn').onclick=()=>fileInput.click();$('#resetBtn').onclick=reset;$('#againBtn').onclick=reset;
[start,end].forEach(x=>x.oninput=update);startR.oninput=()=>{start.value=startR.value;update()};endR.oninput=()=>{end.value=endR.value;update()};$('#fps').onchange=update;
document.querySelectorAll('.resolution button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.resolution button').forEach(x=>x.classList.remove('active'));b.classList.add('active');width=+b.dataset.width;update()});

$('#convertBtn').onclick=async()=>{
  const btn=$('#convertBtn'), progress=$('#progress'), bar=$('#progressBar'), text=$('#progressText');btn.disabled=true;progress.hidden=false;
  try{
    const a=+start.value,b=+end.value,fps=+$('#fps').value,total=Math.ceil((b-a)*fps),height=Math.max(2,Math.round(width*video.videoHeight/video.videoWidth/2)*2);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});const gif=GIFEncoder();
    for(let i=0;i<total;i++){
      await seek(Math.min(a+i/fps,b-.001));ctx.drawImage(video,0,0,width,height);const data=ctx.getImageData(0,0,width,height).data;const palette=quantize(data,128,{format:'rgba4444',oneBitAlpha:false});const index=applyPalette(data,palette,'rgba4444');gif.writeFrame(index,width,height,{palette,delay:1000/fps,repeat:i===0?0:undefined});
      const pct=Math.round((i+1)/total*100);bar.style.width=pct+'%';text.textContent=`Building GIF · ${pct}%`;
      await new Promise(r=>setTimeout(r,0));
    }
    gif.finish();const blob=new Blob([gif.bytesView()],{type:'image/gif'});if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl=URL.createObjectURL(blob);$('#gifPreview').src=outputUrl;$('#downloadBtn').href=outputUrl;$('#downloadBtn').download=file.name.replace(/\.[^.]+$/,'')+'.gif';$('#resultMeta').textContent=`${width}×${height} · ${(b-a).toFixed(1)} seconds · ${fmtBytes(blob.size)}`;editor.hidden=true;$('#result').hidden=false;$('#result').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){console.error(err);alert('That video could not be converted. Try a shorter clip or a smaller resolution.');}
  finally{btn.disabled=false;progress.hidden=true;bar.style.width='0'}
};
