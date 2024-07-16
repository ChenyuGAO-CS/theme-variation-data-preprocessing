// Chenyu Gao 29/9/2023

// This script integrate the `save_phrase_separately.js`, and `fp_retrieve_variations_accross_wholePOP909.js`.

// The first occurrence of each repetitive pattern will be regarded as the theme.
// Human annotations with similarity < maxSimilarity will be reserved as variations.
// When retrieving other variations, we will reserve the pieces with fp score in the similarity window.

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
    "outputDir": path.join(
      __dirname, "..", "out/theme_var_retrived_whole_dataset_samples"
    ),
    "fpDir": path.join(__dirname, "..", "out", "hash_tables", "909_hash_tables"),
    "trackName": "Piano",
    "testing_list": path.join(__dirname, "random_idList_for_testing.json")
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

// Parameters for the window size.
const maxSimilarity = 70.95
const minSimilarity = 53.03

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

// // Filter filenames for testing accoring to the testing list.
// let songList = require(mainPath["testing_list"])
// songList = songList.slice(0, 90)
// coDirs = coDirs
// .filter(function(subDir){
//   let tmpSongNumber = subDir.split(".")[0]
//   if(inArray(tmpSongNumber, songList)){
//     return subDir
//   }
// })
// console.log("coDirs.length", coDirs.length)

// Filter filenames for training accoring to the testing list.
let songList = require(mainPath["testing_list"])
songList = songList.slice(0, 90)
coDirs = coDirs
.filter(function(subDir){
  let tmpSongNumber = subDir.split(".")[0]
  if(!inArray(tmpSongNumber, songList)){
    return subDir
  }
})
console.log("coDirs.length", coDirs.length)

// name of songs whose time signature is 3/4.
// It seems that 746 is 2/4.
const song_with_34 = ['034', '102', '107',
                      '152', '176', '203', '215',
                      '231', '254', '280', '307',
                      '369', '584', '592', '624',
                      '653', '654', '662', '744',
                      '749', '756', '770',
                      '799', '869', '872', '887']
const song_with_24 = ['062', '746']

// Count the number of theme-variation pairs saved.
let pair_cnt = 0
let cnt_from_diff_song = 0
let list_with_var_diff_song = []

coDirs.slice(2,3)
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
      // console.log("k_phrase", k_phrase)
      const tmp_phrase_name = k_phrase
      let tmp_phrase_count = 0
      let theme_pattern

      // Save extracted patterns in an array and write file after the loop.
      let pattern_to_be_saved = []

      // Extract the theme pattern, which is the first occurrence of a phrase.
      // Iteration over the phraseLable.
      const theme_bpm = co.tempi[0].bpm
      // TODO: Insert code to extract variations from the annotations,
      //       and save variations whose similarity < maxSimilarity in pattern_to_be_saved.
      pattern_to_be_saved = selectedAnnotatedVar(points, phraseLable, lengthArrag, tmp_phrase_name, theme_bpm, beatsPerBar)
      theme_pattern = pattern_to_be_saved[0]["tmp_pattern"]
      // tmp_phrase_count = pattern_to_be_saved.length()
      // console.log(pattern_to_be_saved.length)
      // console.log("theme_pattern", theme_pattern.slice(0,10))
      // console.log("pattern_to_be_saved", pattern_to_be_saved[0]["tmp_pattern"].slice(0,10))

      // Run fingerprinting to extract all similar patterns.
      retrievedOcc = ExtractAllOccurWholeDataset(theme_pattern, maxSimilarity, minSimilarity, tmpSongNumber)
      // console.log("retrievedOcc", retrievedOcc)

      const currentSongNum = tmpSongNumber.toString()

      // Iteration over the all retrieve occurrences.
      // If the retrieved pattern is in another song, 
      //       load points form this song, and then do points slice.
      for(let i = 0; i < retrievedOcc.length; i++){
        let flag_for_pattern_save = 0
        const tmp_start_ontime = retrievedOcc[i].edge
        const tmp_end_ontime = tmp_start_ontime + theme_pattern[theme_pattern.length - 1][0]

        // Check if the retrieved pattern is from the same song:
        let tmp_pattern
        let tmp_bpm
        if(retrievedOcc[i].winningPiece === currentSongNum){
          tmp_pattern = slicePoints(points, tmp_start_ontime, tmp_end_ontime)[0]
          tmp_pattern = tmp_pattern.map(function(pt){
            return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
          })
          tmp_bpm = co.tempi[0].bpm
        }
        else{
          const nameWinpiece = retrievedOcc[i].winningPiece 
          // Load points according to 'retrievedOcc[i].winningPiece'
          const coWinpiecePath = path.join(mainPath["compositionObjectDir"], nameWinpiece + '.json')
          const coWinpiece = require(coWinpiecePath)
          const pointsWinpiece = mu.comp_obj2note_point_set(coWinpiece)
          // console.log("######nameWinpiece", nameWinpiece)
          // console.log("######pointsWinpiece", pointsWinpiece.slice(0,5))
          tmp_bpm = coWinpiece.tempi[0].bpm
          tmp_pattern = slicePoints(pointsWinpiece, tmp_start_ontime, tmp_end_ontime)[0]
          tmp_pattern = tmp_pattern.map(function(pt){
            return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
          })
          // Only calculate convertSimScore when the excerpt is extracted from another song.
          // console.log("********retrievedOcc[i].winningPiece:", retrievedOcc[i].winningPiece)
          let sim_score_convert = FingerprintingSimilarityScore(tmp_pattern, theme_pattern)
          // console.log("Converted sim score:", sim_score_convert)
          if(sim_score_convert < minSimilarity){
            flag_for_pattern_save = 1
          }
        }
        // Run similarity calculation again to ensure the similarity between variations <= maxSimScore.
        // if (i === 0){
        //   pattern_to_be_saved.push({"tmp_pattern":tmp_pattern, "tmp_bpm":tmp_bpm})
        //   tmp_phrase_count ++
        // }
        // else{
        pattern_to_be_saved.forEach(function(pn){
          let sim_score = FingerprintingSimilarityScore(tmp_pattern, pn["tmp_pattern"])
          // console.log("sim score:", sim_score)
          if(sim_score > maxSimilarity){
            flag_for_pattern_save = 1
          }
        })
        if(flag_for_pattern_save ===0){
          if(retrievedOcc[i].winningPiece != currentSongNum){
            cnt_from_diff_song ++
            list_with_var_diff_song.push({"retrieved_from": retrievedOcc[i].winningPiece, "saved_name": currentSongNum + "_" + tmp_phrase_name + "_" + (pattern_to_be_saved.length)})
          }
          pattern_to_be_saved.push({"tmp_pattern":tmp_pattern, "tmp_bpm":tmp_bpm})
          tmp_phrase_count ++
        }
        // }
      }
      
      // Write files after the for loop
      pair_cnt += (pattern_to_be_saved.length - 1)
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
        const tmp_out_points = tmp_pattern.tmp_pattern
        const tmp_out_bpm = tmp_pattern.tmp_bpm
        for (let i_track = 0; i_track < ntracks; i_track++){
          const track = midiOut.addTrack()
          track.name = trackName
          track["channel"] = i_track
          tmp_out_points.forEach(function(p){
            track.addNote({
              midi: p[param.noteIndices.mnnIndex],
              time: param.scaleFactor*(p[param.noteIndices.ontimeIndex] + ontimeCorrection),
              duration: param.scaleFactor*p[param.noteIndices.durationIndex],
              velocity: p[param.noteIndices.velocityIndex]
            })
          })
        }
        midiOut.header.tempos = [
          { bpm: tmp_out_bpm, ticks: 0, time: 0 }
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
console.log("[Number of pattern pairs saved]:", pair_cnt)
console.log("[Number of pairs from different song]:", cnt_from_diff_song)
console.log("list_with_var_diff_song", list_with_var_diff_song)

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
  // console.log("Aligned Melody:", alignedMelody.split("\n")[0].slice(0, 3))

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

// Returning the 'edge' with the maxmal similarity.
function FingerprintingMatchingEdge(query, lookup){
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
  console.log("alignedLookup", lookup[0][0] - lookupBegTime)
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
  // let interSim = 0
  // if (queLookupMatches.countBins.length > 0){
  //   interSim = Math.round(10000 * (queLookupMatches.countBins[0].setSize / queLookupMatches.uninosHashes)) / 100
  // }
  

  // console.log("queLookupMatches.countBins[0].edge", queLookupMatches.countBins[0].edge)
  let calculated_edge = queLookupMatches.countBins[0].edge - (buffre_lookup - lookupBegTime) - lookupBegTime + queryBegTime
  calculated_edge = Math.floor(calculated_edge/1)
  return calculated_edge
}

// Retrieve (in)exact occurrence of a pattern across the whole dataset.
function ExtractAllOccurWholeDataset(MTP, maxSimRatio, minSimRatio, fname){
  // console.log("Calculate the number of exact/inexact occurrences of: ", fname)
  let h = new mh.HasherNoConcat()
  // fnamMaxOns should be the maximal ontime over the whole dataset
  const fnamMaxOntime = require(path.join(mainPath["fpDir"], "fnamTimes.json"))
  const fnamMaxOns = fnamMaxOntime.fnamMaxOns
  const MTPBegTime = Math.round(100000*(MTP[0][0]))/100000
  const lengthMTP = MTP.length
  let alignedMTP = MTP.map(function(pt){
    return [Math.round(100000*(pt[0] - MTPBegTime))/100000, pt[1]]
  })
  const matches = h.match_hash_entries(
    alignedMTP,
    "tripleIdx",
    fingerprinting_param.tMin,
    fingerprinting_param.tMax,
    fingerprinting_param.pMin,
    fingerprinting_param.pMax,
    fnamMaxOns,
    fingerprinting_param.binSize,
    path.join(mainPath["fpDir"], "fp"),
  )
  let intraOcc = []

  // console.log("Unique hash count of query: ", matches.uninosHashes)
  if (matches.uninosHashes >= fingerprinting_param.minUniqueHash) {
    const topResults = matches.countBins
    const fnamWithoutSuffix = fname.toString()
    // Show top 1 winning pieces.
    let sel_edge = {}
  

    // Init sel_edge dictionary as {'value.winningPiece': []}
    for (const value of topResults) {
      if(!(value.winningPiece in sel_edge)){
        sel_edge[value.winningPiece] = []
      }
    }
    // console.log("******sel_edge", sel_edge)

    for (const value of topResults) {
      let flag_sel_edge = 0
      const tmp_matched_piece_name = value.winningPiece
      let sim = Math.round(10000 * (value.setSize / matches.uninosHashes)) / 100
      if (sim <= maxSimRatio && sim >= minSimRatio){
        // console.log("SimScore", sim)
        // console.log(value.winningPiece)
        // Extract this phrase.
        for(let edge_idx = 0; edge_idx < sel_edge[tmp_matched_piece_name].length; edge_idx ++){
          let interval_MTP = MTP[lengthMTP-1][0] - MTPBegTime
          if(Math.abs(value.edge - sel_edge[tmp_matched_piece_name][edge_idx]) < interval_MTP*2/3){
            flag_sel_edge = 1
          }
        }
        // Suitable for variation extraction from the same song.
        if(value.winningPiece === fnamWithoutSuffix){
          if(flag_sel_edge === 0 &&
            checkOntimeSelfOverlap(MTP, [value.edge - MTPBegTime, 0]) === 0){
              intraOcc.push({
                "winningPiece": value.winningPiece,
                "simScore": sim,
                "edge": value.edge,
                // "queLookupTriplets": value.queLookupTriplets
              })
              sel_edge[tmp_matched_piece_name].push(value.edge)
          }
        } 
        // Code for variation extration from the different song.
        else{
          if(flag_sel_edge === 0){
            intraOcc.push({
              "winningPiece": value.winningPiece,
              "simScore": sim,
              "edge": value.edge,
              // "queLookupTriplets": value.queLookupTriplets
            })
            sel_edge[tmp_matched_piece_name].push(value.edge)
          }
        }
      }

    }
    // console.log("sel_edge", sel_edge)
    // console.log("Similar pattern occurrences: ", intraOcc)
  }
  return intraOcc
}

// Check if an MTP has self overlap:
// if the MTP has self overlap, return 1;
// else, return 0.
function checkOntimeSelfOverlap (integerPoints, vec){
  let flag = 0
  let maxIdx = integerPoints.length - 1
  // console.log("Self overlap:", integerPoints)
  if(vec[0] >= 0){
    if(integerPoints[0][0] + vec[0] <= integerPoints[maxIdx][0]){
      flag = 1
    }
  }
  else{
    if(integerPoints[maxIdx][0] + vec[0] >= integerPoints[0][0]){
      flag = 1
    }
  }
  return flag
}

function inArray(search,array){
  for(var i in array){
      if(array[i]==search){
          return true;
      }
  }
  return false;
}

// Human annotations with similarity < maxSimilarity will be reserved as variations.
function selectedAnnotatedVar(points, phraseLable, lengthArrag, tmp_phrase_name, current_tempo, beatsPerBar){
  let pattern_to_be_saved = []
  let theme_pattern
  let tmp_phrase_count = 0

  for(let i = 0; i < phraseLable.length; i ++){
    let flag_for_pattern_save = 0
    if(phraseLable[i] === tmp_phrase_name){
      // Calculate start ontime.
      const startBar = getStartBar(i, lengthArrag)
      // console.log("****startBar", startBar)
      // console.log("****ontimeDiff", ontimeDiff)
      const tmp_start_ontime = (startBar - 1)*beatsPerBar
      // console.log("tmp_start_ontime", tmp_start_ontime)
      // Calculate end ontime.
      const tmp_end_ontime = tmp_start_ontime + lengthArrag[i]*beatsPerBar
      // console.log("tmp_end_ontime", tmp_end_ontime)
      let tmp_pattern 
      if(tmp_end_ontime < points[points.length - 1][0]){
        tmp_pattern= slicePoints(points, tmp_start_ontime, tmp_end_ontime)[0]
        // console.log("*****tmp_pattern:", tmp_pattern.slice(0,3))
        // Align each phrases to star from ontime = 0.
        // const beg_time = tmp_pattern[0][0]
        tmp_pattern = tmp_pattern.map(function(pt){
          return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
        })

        // Calculate similarity between the current pattern and the P_0
        let sim_score = 100

        if(tmp_phrase_count === 0){
          theme_pattern = tmp_pattern
          // console.log("selectedAnnotatedVar_theme_pattern", theme_pattern.slice(0,10))
        }
        if(tmp_phrase_count > 0){
          // console.log("===Cal similarity:")
          pattern_to_be_saved.forEach(function(pn){
            sim_score = FingerprintingSimilarityScore(tmp_pattern, pn["tmp_pattern"])
            // console.log("sim score:", sim_score)
            if(sim_score > maxSimilarity){
              flag_for_pattern_save = 1
            }
          })
        }
        if(flag_for_pattern_save === 0 || tmp_phrase_count === 0){
          pattern_to_be_saved.push({"tmp_pattern":tmp_pattern, "tmp_bpm":current_tempo})
          tmp_phrase_count ++
        }
      }
      
    } 
  }
  return pattern_to_be_saved
}

// Human annotations with similarity < maxSimilarity will be reserved as potential variations.
// Then, run fp on the variation (lookup piece), and select the ontime with the highest fp score as the 
// start time of the variation. 
// Only accept the ontime with the highest fp score that appears at the first 1/3 of the variation.
function selectedAnnotatedVarWithfp(points, phraseLable, lengthArrag, tmp_phrase_name, current_tempo, beatsPerBar){
  let pattern_to_be_saved = []
  let theme_pattern
  let tmp_phrase_count = 0

  for(let i = 0; i < phraseLable.length; i ++){
    let flag_for_pattern_save = 0
    if(phraseLable[i] === tmp_phrase_name){
      // Calculate start ontime.
      const startBar = getStartBar(i, lengthArrag)
      // console.log("****startBar", startBar)
      // console.log("****ontimeDiff", ontimeDiff)
      const tmp_start_ontime = (startBar - 1)*beatsPerBar
      // console.log("tmp_start_ontime", tmp_start_ontime)
      // Calculate end ontime.
      const tmp_end_ontime = tmp_start_ontime + lengthArrag[i]*beatsPerBar
      // console.log("tmp_end_ontime", tmp_end_ontime)
      let tmp_pattern 
      if(tmp_end_ontime < points[points.length - 1][0]){
        tmp_pattern= slicePoints(points, tmp_start_ontime, tmp_end_ontime)[0]
        // console.log("*****tmp_pattern:", tmp_pattern.slice(0,3))
        // Align each phrases to star from ontime = 0.
        // const beg_time = tmp_pattern[0][0]
        tmp_pattern = tmp_pattern.map(function(pt){
          return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
        })

        // Calculate similarity between the current pattern and the P_0
        let sim_score = 100

        if(tmp_phrase_count === 0){
          theme_pattern = tmp_pattern
          // console.log("selectedAnnotatedVar_theme_pattern", theme_pattern.slice(0,10))
        }
        if(tmp_phrase_count > 0){
          // console.log("===Cal similarity:")
          // Run fingerprinting to get the ontime with the maximal similarity
          let tmp_edge = FingerprintingMatchingEdge(tmp_pattern, theme_pattern)
          console.log("tmp_edge", tmp_edge)
          // console.log("lengthArrag[i]*beatsPerBar/3", lengthArrag[i]*beatsPerBar/3)
          if(tmp_edge < lengthArrag[i]*beatsPerBar/3 && tmp_end_ontime+tmp_edge < points[points.length - 1][0]){
            // slice the new variation according to the edge
            tmp_pattern= slicePoints(points, tmp_start_ontime+tmp_edge, tmp_end_ontime+tmp_edge)[0]
            tmp_pattern = tmp_pattern.map(function(pt){
              return[pt[0] - (tmp_start_ontime+tmp_edge), pt[1], pt[2], pt[3], 0, pt[5]]
            })
            pattern_to_be_saved.forEach(function(pn){
              sim_score = FingerprintingSimilarityScore(tmp_pattern, pn["tmp_pattern"])
              // console.log("sim score:", sim_score)
              if(sim_score > maxSimilarity){
                flag_for_pattern_save = 1
              }
            })
          }
          else{
            flag_for_pattern_save = 1
          }
        }
        if(flag_for_pattern_save === 0 || tmp_phrase_count === 0){
          pattern_to_be_saved.push({"tmp_pattern":tmp_pattern, "tmp_bpm":current_tempo})
          tmp_phrase_count ++
        }
      }
      
    } 
  }
  return pattern_to_be_saved
}