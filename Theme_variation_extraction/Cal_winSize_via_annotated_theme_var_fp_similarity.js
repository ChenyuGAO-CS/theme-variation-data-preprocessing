// Chenyu Gao, 25/9/2023

// This script is trying to obtain the best setting of window size according to annotated data.

// This script is to use the first 4-bar of a theme as a query, 
// and calculate the similarity between the query and its variations.

// For each query, the maximal similarity between the query and each variation will be recorded as 'sim_list'.
// The minimal similarity and the maximal similarity in the 'sim_list' will be furture used to 
// estimate the lower-bound and the upper-bound of the window size.


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
    "hierAnnotationReferencePath": path.join(
      __dirname, "..", "out", "tmp", "909_hier_gt.json"
    ),
    "compositionObjectDir": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/with_tempo_909_co_with_hier_annotations",
    "midiDirs": ["034.json", "035.json", "801.json", "802.json"],
    "type": "polyphonic"
  },
  "tavern": {
    "rootFullMIDI": "/Users/gaochenyu/Dataset/TAVERN-master/tavern_theme_var",
    "themeId": "K265_0",
    "varId": ["K265_1", "K265_2", "K265_3", "K265_4", "K265_5", "K265_6", "K265_7", "K265_8", "K265_9", "K265_10", "K265_11", "K265_12"],
    "type": "polyphonic"
  },
  // ...
}

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]

// Parameters
const param = {
  "downbeat": {
    "histType": "drumsFalseVelocityTrue",
    "drumsOnly": false,
    "rounding": true,
    "granularity": 4,
    "beatsInMeasure": 4,
    "velocityIndex": 4,
    "ontimeIndex": 0
  },
  "ontimeIndex": 0,
  "noteIndices": {
    "ontimeIndex": 0,
    "mnnIndex": 1,
    "durationIndex": 3,
    "channelIndex": 4,
    "velocityIndex": 5
  },
  "controlChanges": null,
  "scaleFactor": 0.5,
  "timeSigtopNo": 4,
  "timeSigBottomNo": 4
}
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
const maxSimilarity = 100

const hierAnnotations = require(mainPath["hierAnnotationReferencePath"])
let coDirs = fs.readdirSync(mainPath["compositionObjectDir"])
// console.log("coDirs.length", coDirs.length)

// // COMMENT lines 32-35 when processing the whole dataset.
// coDirs = coDirs.filter(function(midiDir){
//   return mainPath["midiDirs"].indexOf(midiDir) >= 0
// })

// name of songs whose time signature is 3/4.
const song_with_34 = ['034', '102', '107',
                      '152', '176', '203', '215',
                      '231', '254', '280', '307',
                      '369', '584', '592', '624',
                      '653', '654', '662', '744',
                      '746', '749', '756', '770',
                      '799', '869', '872', '887']
const song_with_24 = ['062', '746']

let totalLowerBound = 0
let totalUpperBound = 0
let totalCnt = 0


coDirs
.forEach(function(coDir, jDir){
  console.log("coDir:", coDir)
  
  const coPath = path.join(mainPath["compositionObjectDir"], coDir)
  const co = require(coPath)
  const points = mu.comp_obj2note_point_set(co)
  console.log("points: ", points.slice(0,5))

  let tmpSongNumber = coDir.split(".")[0]
  // tmpSongNumber = tmpSongNumber.split("_")[3]
  console.log("tmpSongNumber", tmpSongNumber)

  const hierAnnotation = hierAnnotations[tmpSongNumber]
  const lengthArrag = hierAnnotation.bars
  const phraseLable = hierAnnotation.pLabel
  console.log("phraseLable", phraseLable)
  
  let beatsPerBar = 4
  if(song_with_34.includes(tmpSongNumber)){
    beatsPerBar = 3
  }
  else if(song_with_24.includes(tmpSongNumber)){
    beatsPerBar = 2
  }
  // console.log("song_with_34", song_with_34)
  console.log("beatsPerBar", beatsPerBar)

  // Save repetitive phrases separately.

  // Count each phrase first, since we will only save repetitive phrases.
  let rep_phrase = {}
  for (let i = 0; i < phraseLable.length; i ++){
    if(phraseLable[i] in rep_phrase){
      rep_phrase[phraseLable[i]]++
    }
    else{
      rep_phrase[phraseLable[i]] = 1
    }
  }
  console.log("rep_phrases:", rep_phrase)
  // Iteration over the 'rep_phrase' Obj.
  Object.keys(rep_phrase).forEach(function(k_phrase){
    if(rep_phrase[k_phrase] > 1 && k_phrase != 'X' && k_phrase != 'x'){
      console.log("k_phrase", k_phrase)
      const tmp_phrase_name = k_phrase
      let tmp_phrase_count = 0
      let theme_pattern
      let similarityList = []
      let var_patterns = []
      // Iteration over the phraseLable.
      // Save filtered patterns in an array and write file after the loop.
      for(let i = 0; i < phraseLable.length; i ++){
        if(phraseLable[i] === tmp_phrase_name){
          // Calculate start ontime.
          const startBar = getStartBar(i, lengthArrag)
          // console.log("startBar", startBar)
          // console.log("ontimeDiff", ontimeDiff)
          const tmp_start_ontime = (startBar - 1)*beatsPerBar
          // console.log("tmp_start_ontime", tmp_start_ontime)
          // Calculate end ontime.
          const tmp_end_ontime = tmp_start_ontime + lengthArrag[i]*beatsPerBar
          // console.log("tmp_end_ontime", tmp_end_ontime)
          let tmp_pattern
          if(tmp_end_ontime < points[points.length - 1][0]){
            tmp_pattern = slicePoints(points, tmp_start_ontime, tmp_end_ontime)[0]
            // console.log("*****tmp_pattern:", tmp_pattern.slice(0,3))
            // Align each phrases to star from ontime = 0.
            // const beg_time = tmp_pattern[0][0]
            tmp_pattern = tmp_pattern.map(function(pt){
              return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
            })
            if(tmp_phrase_count === 0){
              theme_pattern = tmp_pattern
            }
            if(tmp_phrase_count > 0){
              var_patterns.push(tmp_pattern)
            }
            tmp_phrase_count ++
          }
        } 
      }
      if(var_patterns.length > 0){
        for(let varIdx = 0; varIdx < var_patterns.length; varIdx++){
          let currentMaxSim = 0
          // Slice 4 bars from the theme pattern
          let pointsFourBarsQuery = slicePoints(theme_pattern, 0, 4*beatsPerBar)[0]
          const lengthQuery = pointsFourBarsQuery[pointsFourBarsQuery.length - 1][0]
          // Calculate similarity by running a slice window.
          const tmp_pattern = var_patterns[varIdx]
          // console.log("tmp_pattern,", tmp_pattern[tmp_pattern.length-1])
          // console.log("tmp_pattern[tmp_pattern.length-1][0]", tmp_pattern[tmp_pattern.length-1][0])
          for(let tmpOntime = 0; tmpOntime < tmp_pattern[tmp_pattern.length-1][0]; tmpOntime += 1){
            let tmpLookup = slicePoints(tmp_pattern, tmpOntime, tmpOntime + lengthQuery + 1)[0]
            // console.log("******tmpOntime", tmpOntime)
            let simScore = FingerprintingSimilarityScore(pointsFourBarsQuery, tmpLookup)
            if(simScore > currentMaxSim && simScore <= maxSimilarity){
              currentMaxSim = simScore
            }
          }
          similarityList.push(currentMaxSim)
        }
        // update totalLowerBound, totalUpperBound, and totalCnt
        console.log("similarityList", similarityList)
        console.log("Math.max(similarityList)", Math.max(...similarityList))
        totalCnt ++
        totalUpperBound += Math.max(...similarityList)
        totalLowerBound += Math.min(...similarityList)
      }

    }
  })
})

console.log("Upper bound:", totalUpperBound/totalCnt)
console.log("Lower bound:", totalLowerBound/totalCnt)




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
  return trgPoints
}