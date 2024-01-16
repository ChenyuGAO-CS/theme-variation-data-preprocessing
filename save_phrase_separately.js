// Chenyu Gao 30/5/2023

// Before running this script, the 'mix_three_tracks.js' script is needed to be run first.
// Takes MIDI as input, and save each song by phrases.
// The name of output MIDIs will be like: 001_A_1.mid, 001_A_2.mid.
// As Mac OS is not happy to distinguish lower case letter and upper case letter in file name,
// I will use 'bb' to replace 'b' when a phrase is named with lower case letter.

// Requires
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
const mu = require("maia-util")
const mm = require("maia-markov")
const mh = require("maia-hash")
const { Midi } = require('@tonejs/midi')

// Individual user paths.
const mainPaths = {
  "chenyu": {
    "hierAnnotationReferencePath": path.join(
    __dirname, "..", "out", "tmp", "909_hier_gt.json"
    ),
    "compositionObjectDir": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/with_tempo_909_co_with_hier_annotations",
    "midiDirs": ["034.json", "035.json", "801.json", "802.json"],
    "outputDir": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/phrases_processed_909_for_trans_training",
    "trackName": "Piano"
  },
}

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
const maxSimilarity = 70

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]
const trackName = mainPath["trackName"]

const hierAnnotations = require(mainPath["hierAnnotationReferencePath"])
let coDirs = fs.readdirSync(mainPath["compositionObjectDir"])
// console.log("coDirs.length", coDirs.length)

// COMMENT lines 32-35 when processing the whole dataset.
coDirs = coDirs.filter(function(midiDir){
  return mainPath["midiDirs"].indexOf(midiDir) >= 0
})

// name of songs whose time signature is 3/4.
const song_with_34 = ['034', '062', '102', '107',
                      '152', '176', '203', '215',
                      '231', '254', '280', '307',
                      '369', '584', '592', '624',
                      '653', '654', '662', '744',
                      '746', '749', '756', '770',
                      '799', '869', '872', '887']

coDirs.slice(0,3)
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
      // Iteration over the phraseLable.
      // Save filtered patterns in an array and write file after the loop.
      let pattern_to_be_saved = []
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
          let tmp_pattern = slicePoints(points, tmp_start_ontime, tmp_end_ontime)[0]
          // console.log("*****tmp_pattern:", tmp_pattern.slice(0,3))
          // Align each phrases to star from ontime = 0.
          // const beg_time = tmp_pattern[0][0]
          tmp_pattern = tmp_pattern.map(function(pt){
            return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
          })

          // Calculate similarity between the current pattern and the P_0
          let sim_score = 100
          let flag_for_pattern_save = 0
          if(tmp_phrase_count === 0){
            theme_pattern = tmp_pattern
          }
          if(tmp_phrase_count > 0){
            console.log("===Cal similarity:")
            pattern_to_be_saved.forEach(function(pn){
              sim_score = FingerprintingSimilarityScore(tmp_pattern, pn)
              console.log("sim score:", sim_score)
              if(sim_score >= maxSimilarity){
                flag_for_pattern_save = 1
              }
            })
          }
          if(flag_for_pattern_save ===0 || tmp_phrase_count === 0){
            pattern_to_be_saved.push(tmp_pattern)
            tmp_phrase_count ++
          }
          
        } 
      }
      // Write files after the for loop
      if(pattern_to_be_saved.length>1){
        pattern_to_be_saved.forEach(function(tmp_pattern, cnt_pattern){
          // Push pattern into the tmpOccurrencesSet.
        let tmp_MIDI_name
        if(isLowerCase(k_phrase)){
          tmp_MIDI_name = tmpSongNumber + '_' + k_phrase+k_phrase + '_' + cnt_pattern.toString() + '.mid'
        }
        else{
          tmp_MIDI_name = tmpSongNumber + '_' + k_phrase + '_' + cnt_pattern.toString() + '.mid'
        }
        // console.log("tmp_MIDI_name", tmp_MIDI_name)

        // Save as MIDI in one track with track name.
        let ontimeCorrection = 0
        const minOntime = mu.min_argmin(
          points.map(function(p){ return p[param.ontimeIndex] })
        )[0]
        if (minOntime < 0){
          ontimeCorrection = 4*param.timeSigtopNo/param.timeSigBottomNo
        }

        const midiOut = new Midi()
        let ntracks = 1
        for (let i_track = 0; i_track < ntracks; i_track++){
          const track = midiOut.addTrack()
          track.name = trackName
          track["channel"] = i_track
          tmp_pattern.forEach(function(p){
            track.addNote({
              midi: p[param.noteIndices.mnnIndex],
              time: param.scaleFactor*(p[param.noteIndices.ontimeIndex]+ + ontimeCorrection),
              duration: param.scaleFactor*p[param.noteIndices.durationIndex],
              velocity: p[param.noteIndices.velocityIndex]
            })
          })
        }
        midiOut.header.tempos = [
          { bpm: co.tempi[0].bpm, ticks: 0, time: 0 }
        ]
        console.log("midiOut.header.tempos", midiOut.header.tempos)
        
        fs.writeFileSync(
          path.join(mainPath["outputDir"], tmp_MIDI_name),
          new Buffer.from(midiOut.toArray())
        )
        })
      }
    }
  })
})

function isLowerCase(ch){
  return ch >= 'a' && ch <= 'z'
}

// Get start bar of a PO.
function getStartBar(start_idx, length_array){
  let barCount = 1
  for(let i = 0; i < start_idx; i ++){
    barCount = barCount + length_array[i]
  }
  return barCount
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

// Calculate ontime difference between the first note in melody track and that in Dai's annotations "melody.txt".
// Return: ontime of the first note in melody - ontime of the first note in annotation.
function calculateOntimeDiff(co, annothationPath){
  let alignedTarPoints = co
  const alignedMelody = fs.readFileSync(
    annothationPath
  ).toString()
  console.log("Aligned Melody:", alignedMelody.split("\n")[0].slice(0, 3))

  let ontimeDiff = 0

  // Get ontime of the first melody note.
  let first_melody_ontime = 0
  for(let i = 0; i < alignedTarPoints.length; i ++){
    if(alignedTarPoints[i].staffNo === 0){
      first_melody_ontime = alignedTarPoints[i].ontime
      break
    }
  }

  const firstPointAlignedMelody = alignedMelody.split("\n")[0].split(" ")
  if(firstPointAlignedMelody[0] === '0'){
    // Get ontimeToShift.
    // The unite of ontime in Dai's annotation is 16th node.
    // As unite of ontime is crotchet, I divide '4' here.
    let ontimeToShift = parseInt(firstPointAlignedMelody[1])/4 

    // Ontime of the first note in melody - ontime of the first note in annotation.
    ontimeDiff = first_melody_ontime - ontimeToShift
  }
  return ontimeDiff
}

// Check beats per bar.
function checkBeatsPerBar(pattern, lengthArrag, pointsSet, timeToShift){
  let beatsPerBar = 4
  const totalBarCount = getBarCount(pattern, 0, lengthArrag)
  const maxOntimeInAnnotation = totalBarCount*4 + timeToShift
  // console.log("maxOntimeInAnnotation", maxOntimeInAnnotation)

  const maxOntimeInMelody = pointsSet[pointsSet.length-1][0]
  // console.log("maxOntimeInMelody", maxOntimeInMelody)
  if(maxOntimeInMelody + 10*beatsPerBar < maxOntimeInAnnotation){
    beatsPerBar = 3
  }
  return beatsPerBar
}

// Returning similarity score of a query and a lookup piece.
function FingerprintingSimilarityScore(query, lookup){
  let h = new mh.HasherNoConcat()
  const queryBegTime = Math.round(100000*(query[0][0]))/100000
  let alignedQuery = query.map(function(pt){
    return [Math.round(100000*(pt[0] - queryBegTime))/100000, pt[1]]
  })

  const buffre_lookup = alignedQuery[alignedQuery.length-1][0] + 1 // 100
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