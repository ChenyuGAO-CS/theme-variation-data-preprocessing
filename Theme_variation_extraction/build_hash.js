// Chenyu Gao, 24/8/2023

// Building a hash table from the full POP909 dataset.


// Requires
const argv = require('minimist')(process.argv.slice(2))
const mh = require("maia-hash")
const fs = require("fs")
const path = require("path")
const mu = require("maia-util")
const mf = require('maia-features')

// Individual user paths.
const mainPaths = {
  "chenyu": {
    "compositionObjectDir": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/with_tempo_909_co_with_hier_annotations",
    "tmpCoDirs": ["034.json", "035.json", "801.json", "802.json"],
    "outputDir": path.join(__dirname, "..", "out", "hash_tables", "909_hash_tables"),
    "outputFileName": "melody_lookup.json" 
  }
}

const param = {
  "ontimeBuffer": 50,
  "tMin": 0.5,
  "tMax": 2,
  "pMin": 1,
  "pMax": 6
}

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]

function build(hasher, dir){
  // Explicit approach
  let filenames = fs.readdirSync(mainPath["compositionObjectDir"])
  .filter(function(fnam){
    return path.extname(fnam) === ".json"
  })
  
  // // COMMENT lines 79-83 when processing the whole dataset.
  // filenames = filenames.filter(function(filename){
  //   return mainPath["tmpCoDirs"].indexOf(filename) >= 0
  // })

  console.log("filenames.length", filenames.length)
  const fnamMaxOns = {}
  filenames
  .forEach(function(fnam){
    console.log("-- Hashing ", fnam)
    const coPath = path.join(mainPath["compositionObjectDir"], fnam)
    const co = require(coPath)
    const points = mu.comp_obj2note_point_set(co)
    console.log("points: ", points.slice(0,5))
    // const points = require(path.join(dir, fnam))
    const maxOn = mu.max_argmax(points.map(function(p){return p[0]}))[0]
    // .slice(0, 50)
    // console.log("points.length:", points.length)
    // console.log("maxOn: ", maxOn)
    // build hash lookup table and save ontime of each hash as JSON files.
    const nh = h.create_hash_entries(
      points, path.basename(fnam, ".json"), "triples", "increment and file with fnams and tripleIdx",
      param.tMin, param.tMax, param.pMin, param.pMax,
      path.join(mainPath["outputDir"], "fp")
    )
    console.log("nh:", nh)
    fnamWithoutSuffix = fnam.substring(0, fnam.lastIndexOf("."))
    fnamMaxOns[fnamWithoutSuffix] = maxOn
    // cumuTimes.push(cumuTime + points[0][0])
    // cumuTime += Math.ceil(points.slice(-1)[0][0] + param.ontimeBuffer)
  })
  // cumuTimes.push(cumuTime)

  // Close all logs.
  // Object.keys(hasher.map).forEach(function(k){
  //   hasher.map[k].log.end()
  // })

  return {
    fnamMaxOns
  }
}


let h = new mh.HasherNoConcat()
const fnamMaxOn = build(h, mainPath["compositionObjectDir"])
console.log("fnam and MaxOn:", fnamMaxOn["fnamMaxOns"])
// Write it to file.
//    involve file names, and the begining time of each pieces. 
//    Measure: "bar" for GMD, "second" for Alex's other experiments.
fs.writeFileSync(
  path.join(mainPath["outputDir"], "fnamTimes.json"),
  JSON.stringify(fnamMaxOn, null, 2)
)
console.log("Object.keys(h.map).length:", Object.keys(h.map).length)
// Turn it into an array and sort it by increment.
const harr = Object.keys(h.map).map(function(k){
  return [k, h.map[k]]
})
.sort(function(a, b){
  return b[1] - a[1]
})
console.log("harr.slice(0, 100):", harr.slice(0, 100))
// Write it to file.
//    "increment": the count of a kind of hash.
//    "log": the number of files opened currently.
fs.writeFileSync(
  path.join(mainPath["outputDir"], mainPath["outputFileName"]),
  JSON.stringify(h.map)//, null, 2)
)