let originalSVG = "";
let cropper = null;
let croppedImages = {};

/* -------- SVG KEY DETECT -------- */

function extractKeys(svg) {
  const m = svg.match(/{(.*?)}/g) || [];
  return [...new Set(m.map(x => x.replace(/[{}]/g,"")))];
}

function isImageField(k) {
  return /(photo|image|pic|logo)/i.test(k);
}

/* -------- BUILD FORM -------- */

function buildForm(keys) {
  const form = document.getElementById("dynamicForm");
  form.innerHTML = "";

  keys.forEach(k => {
    const label = document.createElement("label");
    label.textContent = k;

    const input = document.createElement("input");
    input.dataset.key = k;

    if (isImageField(k)) {
      input.type = "file";
      input.accept = "image/*";
      input.onchange = e => openCrop(e.target.files[0], k);
    } else {
      input.type = "text";
      input.placeholder = k;
    }

    form.appendChild(label);
    form.appendChild(input);
  });

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = "Generate";
  form.appendChild(btn);
}

/* -------- SVG UPLOAD -------- */

document.getElementById("svgUpload").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  originalSVG = await f.text();
  buildForm(extractKeys(originalSVG));
};

/* -------- CROP -------- */

function openCrop(file, key) {
  const img = document.getElementById("cropImage");
  img.src = URL.createObjectURL(file);

  document.getElementById("cropModal").style.display = "flex";

  if (cropper) cropper.destroy();

  cropper = new Cropper(img, {
    aspectRatio: 1,
    viewMode: 1
  });

  document.getElementById("cropConfirm").onclick = () => {
    const canvas = cropper.getCroppedCanvas({width:600,height:600});
    croppedImages[key] = canvas.toDataURL("image/png");
    closeCrop();
  };
}

function closeCrop() {
  document.getElementById("cropModal").style.display = "none";
  if (cropper) cropper.destroy();
}

/* -------- GENERATE SVG -------- */

document.getElementById("dynamicForm").onsubmit = e => {
  e.preventDefault();

  let svg = originalSVG;
  const inputs = e.target.querySelectorAll("input");

  inputs.forEach(input => {
    const key = input.dataset.key;
    let val = "";

    if (isImageField(key)) {
      val = croppedImages[key] || "";
    } else {
      val = input.value;
    }

    svg = svg.replace(new RegExp(`{${key}}`,"g"), val);
  });

  document.getElementById("preview").innerHTML = svg;

  const s = document.querySelector("#preview svg");
  if (s) {
    s.removeAttribute("height");
    s.style.height = "auto";
  }
};

/* -------- SVG → CANVAS -------- */

function svgToCanvas(cb){
  const svg = document.querySelector("#preview svg");
  if(!svg) return alert("Generate first");

  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");

  const w = clone.viewBox.baseVal.width || 500;
  const h = clone.viewBox.baseVal.height || 260;

  const data = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([data],{type:"image/svg+xml"});
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = ()=>{
    const canvas = document.createElement("canvas");
    canvas.width=w; canvas.height=h;
    canvas.getContext("2d").drawImage(img,0,0,w,h);
    URL.revokeObjectURL(url);
    cb(canvas,w,h);
  };
  img.src=url;
}

/* -------- PNG -------- */

downloadPNG.onclick = ()=>{
  svgToCanvas(canvas=>{
    const a=document.createElement("a");
    a.download="output.png";
    a.href=canvas.toDataURL();
    a.click();
  });
};

/* -------- PDF -------- */

downloadPDF.onclick = ()=>{
  svgToCanvas((canvas,w,h)=>{
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({
      orientation:w>h?"landscape":"portrait",
      unit:"px",
      format:[w,h]
    });
    pdf.addImage(canvas.toDataURL(),"PNG",0,0,w,h);
    pdf.save("output.pdf");
  });
};
