import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.166.0/build/three.module.min.js"
import * as BufferGeometryUtils from "https://cdn.jsdelivr.net/npm/three@0.166.0/examples/jsm/utils/BufferGeometryUtils.js"
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.166.0/examples/jsm/loaders/OBJLoader.js"
import { OBJExporter } from "https://cdn.jsdelivr.net/npm/three@0.166.0/examples/jsm/exporters/OBJExporter.js"
import { UVUnwrapper } from "https://cdn.jsdelivr.net/npm/xatlas-three@0.2.0/public/build/index.min.js"
import { UVsDebug } from "https://cdn.jsdelivr.net/npm/three@0.166.0/examples/jsm/utils/UVsDebug.js"



const inputFile = document.querySelector("#input-file")
const textureView = document.querySelector("#texture-view")
const importButton = document.querySelector("#import-button")
const exportButton = document.querySelector("#export-button")
const loadProgress = document.querySelector("#load-progress")
const fileName = document.querySelector("#file-name")



function onStartMap() {
   loadProgress.hidden = false
   textureView.innerHTML = " "
   textureView.appendChild(loadProgress)
   exportButton.disabled = true
}

function onFinalMap() {
   exportButton.disabled = false
}




const scene = new THREE.Scene()
const objLoader = new OBJLoader()
const objExporter = new OBJExporter()
const zip = new JSZip()




function openFile() {
   inputFile.click()

   inputFile.addEventListener("change", function() {
      if (inputFile.files[0].name.includes(".obj")) {

         exportButton.disabled = true
         fileName.innerText = inputFile.files[0].name

         const reader = new FileReader()
         reader.addEventListener("load", function(event) {
            const obj = event.target.result
            onOpenObj(obj)
         })

         reader.readAsText(inputFile.files[0])
      }
   })

}

importButton.addEventListener("click", openFile)
/*
 */


function onOpenObj(data) {
   scene.children = []
   const model = objLoader.parse(data)
   scene.add(model)

   convertGeometries()
   mapUV().then(() => {
      //draw texture in canvas on final map
      drawUVTexture()
   })
}



function convertGeometries() {
   const model = scene.children[0]

   model.children.forEach((mesh) => {
      mesh.geometry = BufferGeometryUtils.mergeVertices(mesh.geometry)
   })

}


async function mapUV() {
   const model = scene.children[0]
   const unwrapper = new UVUnwrapper({ BufferAttribute: THREE.BufferAttribute });

   await unwrapper.loadLibrary(
      (mode, progress) => { console.log(mode, progress); },
      'https://cdn.jsdelivr.net/npm/xatlasjs@0.1.0/dist/xatlas.wasm',
      'https://cdn.jsdelivr.net/npm/xatlasjs@0.1.0/dist/xatlas.js',
   ); // Make sure to wait for the library to load before unwrapping.

   let geoms = []
   model.children.forEach((geom) => {
      geoms.push(geom.geometry)

   })

   onStartMap()
   await unwrapper.packAtlas(geoms, "uv");
   onFinalMap()
}


function drawUVTexture() {
   const model = scene.children[0]
   let geoms = []
   model.children.forEach((geom) => {
      geoms.push(geom.geometry)
   })
   const debugElement = UVsDebug(BufferGeometryUtils.mergeGeometries(geoms))
   debugElement.style.width = "100%"
   debugElement.style.height = "100%"
   debugElement.style.borderRadius = "4px"
   
   textureView.innerHTML = " "
   textureView.appendChild(debugElement)

}



function textureFile() {
   const canvas = textureView.children[0]
   const url = canvas.toDataURL("image/png")
   const base64Image = url.split(",")[1]
   const binaryImage = atob(base64Image)
   const arrayBuffer = new Uint8Array(binaryImage.length)

   for (let i = 0; i < arrayBuffer.length; i += 1) {
      arrayBuffer[i] = binaryImage.charCodeAt(i)
   }

   return arrayBuffer
}

/*
zip.file("canvasImage.png", imageCanvas(), {binary:true})
*/

function objFile() {
   const obj = objExporter.parse(scene)
   return obj
}



function exportFiles() {
   zip.file("UVTexture.png", textureFile(), { binary: true })
   zip.file(inputFile.files[0].name, objFile())

   zip.generateAsync({ type: "blob" }).then((data) => {
      saveAs(data, "mapUV.zip")
   })
}


exportButton.addEventListener("click", exportFiles)