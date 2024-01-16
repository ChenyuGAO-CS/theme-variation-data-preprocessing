// Chenyu Gao, 25/9/2023

// This script is to use the first 4-bar of a theme as a query, 
// and visualise the trand of the similarity plot between the query and variations.

// This script is trying to obtain the best setting of window size accoring to annotated data.
// Using first 4 measures of a theme and variation piece, and plot similarity against time in the piece.

// Requires
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
const plotlib = require('nodeplotlib')
const mu = require("maia-util")
const mh = require("maia-hash")
const { Midi } = require('@tonejs/midi')

// Individual user paths.
const mainPaths = {
  "pop909": {
    "rootFullMIDI": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/phrases_processed_909_for_trans_training",
    // "themeId": "802_C_0",
    // "varId": ["802_C_1", "802_C_2", "802_C_3", "802_C_4", "802_C_5"],
    // "themeId": "034_C_0",
    // "varId": ["034_C_1", "034_C_2", "034_C_3", "034_C_4", "034_C_5"],
    "themeId": "035_B_0",
    "varId": ["035_B_1", "035_B_2", "035_B_3", "035_B_4"],
    "type": "polyphonic"
  },
  "k265": {
    "rootFullMIDI": "/Users/gaochenyu/Dataset/TAVERN-master/tavern_theme_var/K265",
    "themeId": "K265_0",
    "varId": ["K265_1", "K265_2", "K265_3", "K265_4", "K265_5", "K265_6", "K265_7", "K265_8", "K265_9", "K265_10", "K265_11", "K265_12"],
    "type": "polyphonic"
  },
  "k025": {
    "rootFullMIDI": "/Users/gaochenyu/Dataset/TAVERN-master/tavern_theme_var/K025",
    "themeId": "K025_0",
    "varId": ["K025_1", "K025_2", "K025_3", "K025_4", "K025_5", "K025_6", "K025_7"],
    "type": "polyphonic"
  },
  "wo063": {
    "rootFullMIDI": "/Users/gaochenyu/Dataset/TAVERN-master/tavern_theme_var/Wo063",
    "themeId": "Wo063_0",
    "varId": ["Wo063_1", "Wo063_2", "Wo063_3", "Wo063_4", "Wo063_5", "Wo063_6", "Wo063_7", "Wo063_8", "Wo063_9"],
    "type": "polyphonic"
  },
  // ...
}

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]

// Parameters for runing symbolic fingerprinting.
const fingerprinting_param = {
  "tMin": 0.5,
  "tMax": 2,
  "pMin": 1,
  "pMax": 6,
  "binSize": 1,
  "minSimilarity": 70,
  "minUniqueHash": 5
}

// // Add '0' to at the beginning of a number to expend the string with length 'm'.
// function PrefixInteger(num, m) {
//   return (Array(m).join(0) + num).slice(-m);
// }


// Loading melody.
// const melodyFileName = mainPath["visSongId"] + ".json"
// const loadedFile = require(path.join(mainPath["rootFullMIDI"], melodyFileName))
let melodyPoints = []
let startTimePerVar = []
const pieceNameList = mainPath["varId"]
for(let i = 0; i < pieceNameList.length; i ++){
  const melodyFileName = path.join(mainPath["rootFullMIDI"], pieceNameList[i] + ".mid")
  console.log("melodyFileName", melodyFileName)
  const loadedPoints = convertMIDItoPoints(melodyFileName)
  if (i === 0){
    for(let pIdx = 0; pIdx < loadedPoints.length; pIdx ++){
      melodyPoints.push([loadedPoints[pIdx][0], loadedPoints[pIdx][1]])
      startTimePerVar.push(0)
    }
  }
  else{
    let begTimeBuffer = Math.ceil(melodyPoints[melodyPoints.length - 1][0]) + 1
    startTimePerVar.push(begTimeBuffer)
    for(let pIdx = 0; pIdx < loadedPoints.length; pIdx ++){
      melodyPoints.push([loadedPoints[pIdx][0] + begTimeBuffer, loadedPoints[pIdx][1]])
    }
  }
}

console.log(melodyPoints.slice(0, 10))

const xMelody = melodyPoints.map(function(p){
  return p[0]
})
const yMelody = melodyPoints.map(function(p){
  return p[1]
})
const trace1 = {
  "x": xMelody, 
  "y": yMelody, 
  "mode": "markers", 
  "name": "Variations of: " + mainPath["themeId"],
  "type": "scatter"
}

// Loading a phrase as query.
const queryFileName = path.join(mainPath["rootFullMIDI"], mainPath["themeId"] + ".mid")
const pointsQuery = convertMIDItoPoints(queryFileName)


// Slice first 4 bars.
const pointsFourBarsQuery = slicePoints(pointsQuery, 0, 16)[0]
const melodyEndTime = Math.ceil(melodyPoints[melodyPoints.length - 1][0]) + 4

// let json_out = {}
// json_out["query"] = pointsFourBarsQuery
// json_out["lookup"] = []

// Plot the query at the end of the figure
// console.log("queryPoints", pointsFourBarsQuery.slice(0,10))
const xMTP = pointsFourBarsQuery.map(function(p){
  return p[0] + melodyEndTime
})
const yMTP = pointsFourBarsQuery.map(function(p){
  return p[1]
})
const trace2 = {
  "x": xMTP, 
  "y": yMTP, 
  "mode": "markers", 
  "name": "Query (Theme)",
  "type": "scatter"
}

// Prepare similarity plot as 'trace3'.
let xSimPlot = []
let ySimPlot = []
const maxOntime = melodyPoints[melodyPoints.length-1][0]
const lengthQuery = pointsFourBarsQuery[pointsFourBarsQuery.length-1][0]-pointsFourBarsQuery[0][0]
for(let tmpOntime = 0; tmpOntime < maxOntime; tmpOntime += 1){
  let tmpLookup = slicePoints(melodyPoints, tmpOntime, tmpOntime + lengthQuery + 1)[0]
  // console.log("******tmpOntime", tmpOntime)
  let simScore = FingerprintingSimilarityScore(pointsFourBarsQuery, tmpLookup)
  // json_out["lookup"].push({"sim": simScore, "lookup": tmpLookup})
  xSimPlot.push(tmpOntime)
  ySimPlot.push(simScore)
}

// console.log(xSimPlot)

const trace3 = {
  "x": xSimPlot, 
  "y": ySimPlot,  
  "name": "Similarity Score",
  "type": "scatter"
}

const xStartTime = startTimePerVar.map(function(p){
  return p
})
const yStartTime = melodyPoints.map(function(p){
  return 0
})
const trace4 = {
  "x": xStartTime, 
  "y": yStartTime, 
  "mode": "markers", 
  "name": "Start time of each variation",
  "type": "scatter"
}

// // Write JSON for symbolic hashing.
// fs.writeFileSync(
//   path.join(__dirname, "..", "out", 'json_similarity_test.json'),
//   JSON.stringify(json_out, null, 2)
// )

plotlib.plot([trace1, trace2, trace3, trace4])


/**
 * A filter to return a set of points whose ontime in [beg_time, end_time].
 * @param {Array} point_set - A pointset [[ontime1, pitch1], [ontime2, pitch2], ...]
 * @param {number} beg_time - The beginning time of the selected piece.
 * @param {number} end_time - The end time of the selected piece.
 */
function slicePoints(point_set, beg_time, end_time){
  let selectedPointSet = []
  let slicedStartIdx = 0
  let slicedEndIdx = point_set.length - 1
  for(let i = 0; i < point_set.length; i++){
    if(point_set[i][0] > end_time){
      slicedEndIdx = i - 1
      break
    }
    else if((point_set[i][0] > beg_time) && (point_set[i][0] <= end_time)){
      selectedPointSet.push(point_set[i])
    }
  }
  slicedStartIdx = slicedEndIdx - selectedPointSet.length + 1
  // console.log("[selectedPointSet", selectedPointSet, "],[slicedStartIdx", slicedStartIdx, "],[slicedEndIdx",slicedEndIdx, "]")
  return [selectedPointSet, slicedStartIdx, slicedEndIdx]
}

/**
 * Get total bar count of a PO according to the annotation string (e.g., "BAAb").
 * Inputs:
 * @param {String} str - A PO (e.g., "BAAb"). 
 * @param {number} start_idx - The index of the first chart of the PO in the whole string.
 * @param {Array} hier_gt.bars - The bar count array for the whole piece.
 */
function getBarCount(str, start_idx, length_array){
  let barCount = 0
  let tmp_idx = start_idx
  for(let i = 0; i < str.length; i ++){
    barCount = barCount + length_array[tmp_idx]
    tmp_idx = tmp_idx + 1
  }
  return barCount
}

// Get start bar of a PO.
function getStartBar(start_idx, length_array){
  let barCount = 1
  for(let i = 0; i < start_idx; i ++){
    barCount = barCount + length_array[i]
  }
  return barCount
}

// Returning similarity score of a query and a lookup piece.
function FingerprintingSimilarityScore(query, lookup){
  let h = new mh.HasherNoConcat()
  const queryBegTime = Math.round(100000*(query[0][0]))/100000
  let alignedQuery = query.map(function(pt){
    return [Math.round(100000*(pt[0] - queryBegTime))/100000, pt[1]]
  })

  const buffre_lookup = 100
  const lookupBegTime = Math.round(100000*(lookup[0][0]))/100000
  let alignedLookup = lookup.map(function(pt){
    return [Math.round(100000*(pt[0] - lookupBegTime + buffre_lookup))/100000, pt[1]]
  })
  const lookup_max_ontime = Math.ceil(alignedLookup[alignedLookup.length -  1][0])

  const queLookupMatches = h.match_query_lookup_piece(
    alignedLookup,
    "lookup",
    alignedQuery,
    "triples",
    fingerprinting_param.tMin,
    fingerprinting_param.tMax,
    fingerprinting_param.pMin,
    fingerprinting_param.pMax,
    lookup_max_ontime,
    fingerprinting_param.binSize
  )
  // console.log("queLookupMatches", queLookupMatches)
  let interSim = 0
  if (queLookupMatches.countBins.length > 0){
    interSim = Math.round(10000 * (queLookupMatches.countBins[0].setSize / queLookupMatches.uninosHashes)) / 100
  }
  

  return interSim
}

// Read MIDI and convert it to points [ontime, pitch, duration, channel, velocity].
function convertMIDItoPoints(midiPath){
  // Read MIDI file
  const midiData = fs.readFileSync(
    midiPath
  )
  const midi = new Midi(midiData)
  // Restore all notes into an array "trgPoints".
  let trgPoints = []
  midi.tracks.forEach(function(track, idx){
    // console.log("track.instrument.family:", track.instrument.family)
    // console.log("track.instrument.name:", track.instrument.name)
    track.notes.forEach(function(n){
      let pt = [
        n.ticks/midi.header.ppq,
        n.midi,
        // n.durationTicks/midi.header.ppq,
        // track.channel,
        // Math.round(1000*n.velocity)/1000
      ]
      trgPoints.push(pt)
    })
  })
  const beg_time = trgPoints[0][0]
  for(let i = 0 ; i < trgPoints.length; i ++){
    trgPoints[i][0] -= beg_time
  }
  return trgPoints
}