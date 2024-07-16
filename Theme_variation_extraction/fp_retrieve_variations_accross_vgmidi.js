// Chenyu Gao 20/10/2023

// Taking the first 4 measures of each song in VGMIDI as a query, 
// but then using fingerprinting scores in some window (e.g., [0.4, 0.7]) 
// to retrieve variations (either from same song, or across part or whole of dataset).
// This script will first extract variations from the same song. 


// This script will be extended to retrive variations across whole of VGMIDI dataset.
// The window is set as [0.5303, 0.7095].

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
  "vgmidi": {
    "compositionObjectDir": "/Users/gaochenyu/Dataset/vgmidi_clean/samples",
    "midiDirs": ["034.json", "035.json", "801.json", "802.json"],
    "outputDir": path.join(
      __dirname, "..", "out", "/variation_examples"
    ),
    // "fpDir": path.join(__dirname, "..", "out", "hash_tables", "vgmidi_hash_tables"),
    "trackName": "Piano"
  },
}

// Farey sequence
const quantSet = [0, 1/8, 1/6, 1/4, 1/3, 3/8, 1/2, 5/8, 2/3, 3/4, 5/6, 7/8, 1]

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
const maxSimilarity = 70.95
const minSimilarity = 30
const barCountTheme = 8
const windowStep = 4

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]
const trackName = mainPath["trackName"]

let coDirs = fs.readdirSync(mainPath["compositionObjectDir"])
// console.log("coDirs.length", coDirs.length)

// // COMMENT lines 32-35 when processing the whole dataset.
// coDirs = coDirs.filter(function(midiDir){
//   return mainPath["midiDirs"].indexOf(midiDir) >= 0
// })

// Count the number of theme-variation pairs saved.
let pair_cnt = 0

coDirs.slice(3,4)
.forEach(function(coDir, jDir){
  console.log("coDir:", coDir)
  
  const coPath = path.join(mainPath["compositionObjectDir"], coDir)

  // Load tempo for the theme
  let theme_bpm = 120
  const mi = new mm.MidiImport(
    coPath,
    quantSet,
    "Shift to zero" // Ensures first note begins at ontime zero.
  )
  const co = mi.compObj
  // console.log("co.notes.slice(0, 5):", co.notes.slice(0, 5))
  const points = mu.comp_obj2note_point_set(co)
  console.log("points: ", points.slice(0,5))

  // Load tempo information.
  if (
    mi.data.header &&
    mi.data.header.tempos &&
    mi.data.header.tempos.length > 0
  ){
    theme_bpm = mi.data.header.tempos[0].bpm
  }
  console.log("theme_bpm", theme_bpm)


  let tmpSongNumber = coDir.split(".")[0]
  // tmpSongNumber = tmpSongNumber.split("_")[3]
  console.log("tmpSongNumber", tmpSongNumber)
  
  let beatsPerBar = 4
  console.log("beatsPerBar", beatsPerBar)
  const maxOntime = points[points.length - 1][0]

  let cnt_phrase = 0
  let saved_theme = []
  for(let startBar = 0; (startBar + barCountTheme)*beatsPerBar < maxOntime; startBar += windowStep){
    // Save repetitive phrases separately.
    let pattern_to_be_saved = []

    // Extract the first 4 measures of a song as the theme.
    let theme_pattern
    let tmp_phrase_count = 0
    // const startBar = 0
    // console.log("startBar", startBar)
    // console.log("ontimeDiff", ontimeDiff)
    const tmp_start_ontime = startBar*beatsPerBar
    // console.log("tmp_start_ontime", tmp_start_ontime)
    // Calculate end ontime.
    const tmp_end_ontime = tmp_start_ontime + barCountTheme*beatsPerBar
    // console.log("tmp_end_ontime", tmp_end_ontime)
    let tmp_pattern = slicePoints(points, tmp_start_ontime, tmp_end_ontime)[0]
    // console.log("*****tmp_pattern:", tmp_pattern.slice(0,3))
    // Align each phrases to star from ontime = 0.
    // const beg_time = tmp_pattern[0][0]
    const org_start_end_on = [tmp_pattern[0][0], tmp_pattern[tmp_pattern.length - 1][0]]
    tmp_pattern = tmp_pattern.map(function(pt){
      return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
    })
    theme_pattern = tmp_pattern
    pattern_to_be_saved.push({"tmp_pattern":tmp_pattern, "tmp_bpm":theme_bpm})
    // console.log("theme_pattern", theme_pattern)

    // Check if the current theme is too similar to previous theme.
    let var_extract_flag = 0
    if(saved_theme.length > 0){
      saved_theme.forEach(function(tmp_theme){
        let sim_score = FingerprintingSimilarityScore(tmp_pattern, tmp_theme)
        // console.log("sim score:", sim_score)
        if(sim_score > maxSimilarity){
          var_extract_flag = 1
        }
      })
    }
    if(var_extract_flag === 0){
      saved_theme.push(theme_pattern)
      // Run fingerprinting to extract all similar patterns.
      retrievedOcc = ExtractAllOccurSameSong(theme_pattern, points, maxSimilarity, minSimilarity, tmpSongNumber, org_start_end_on)
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
          tmp_bpm = theme_bpm
        }
        // else{
        //   const nameWinpiece = retrievedOcc[i].winningPiece 
        //   // Load points according to 'retrievedOcc[i].winningPiece'
        //   const coWinpiecePath = path.join(mainPath["compositionObjectDir"], nameWinpiece + '.json')
        //   const coWinpiece = require(coWinpiecePath)
        //   const pointsWinpiece = mu.comp_obj2note_point_set(coWinpiece)
        //   // console.log("######nameWinpiece", nameWinpiece)
        //   // console.log("######pointsWinpiece", pointsWinpiece.slice(0,5))
        //   tmp_bpm = coWinpiece.tempi[0].bpm
        //   tmp_pattern = slicePoints(pointsWinpiece, tmp_start_ontime, tmp_end_ontime)[0]
        //   tmp_pattern = tmp_pattern.map(function(pt){
        //     return[pt[0] - tmp_start_ontime, pt[1], pt[2], pt[3], 0, pt[5]]
        //   })
        //   tmp_bpm = theme_bpm
        // }
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
      // console.log(pattern_to_be_saved[0].tmp_pattern)
      // Write files after the for loop
      pair_cnt += (pattern_to_be_saved.length - 1)
      const k_phrase = String.fromCharCode((65 + cnt_phrase))
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
        cnt_phrase ++
      }
    }

  }
  
})
console.log("[Number of pattern pair saved]:", pair_cnt)

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

// Retrive (in)exact occurrence of a pattern across the whole dataset.
function ExtractAllOccurSameSong(query, lookup, maxSimRatio, minSimRatio, lookupfname, org_sttart_end_on){
  // console.log("Calculate the number of exact/inexact occurrences of: ", fname)
  let h = new mh.HasherNoConcat()
  // fnamMaxOns should be the maximal ontime over the whole dataset
  const queryBegTime = Math.round(100000*(query[0][0]))/100000
  const MTPBegTime = queryBegTime
  let alignedQuery = query.map(function(pt){
    return [Math.round(100000*(pt[0] - queryBegTime))/100000, pt[1]]
  })

  const buffre_lookup = 0 // alignedQuery[alignedQuery.length-1][0] + 1 // 100
  const lookupBegTime = Math.round(100000*(lookup[0][0]))/100000
  let alignedLookup = lookup.map(function(pt){
    return [Math.round(100000*(pt[0] - lookupBegTime + buffre_lookup))/100000, pt[1]]
  })
  const lookup_max_ontime = Math.ceil(alignedLookup[alignedLookup.length -  1][0])

  const matches = h.match_query_lookup_piece(
    alignedLookup,
    lookupfname,
    alignedQuery,
    "triples",
    fingerprinting_param.tMin,
    fingerprinting_param.tMax,
    fingerprinting_param.pMin,
    fingerprinting_param.pMax,
    lookup_max_ontime,
    fingerprinting_param.binSize
  )
  let intraOcc = []

  console.log("Unique hash count of query: ", matches.uninosHashes)
  if (matches.uninosHashes >= fingerprinting_param.minUniqueHash) {
    const topResults = matches.countBins
    // console.log("topResults", topResults)
    // const fnamWithoutSuffix = fname.toString()
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
          let interval_MTP = query[query.length-1][0] - MTPBegTime
          if(Math.abs(value.edge - sel_edge[tmp_matched_piece_name][edge_idx]) < interval_MTP*2/3){
            flag_sel_edge = 1
          }
        }
        // Suitable for variation extraction from the same song.
        if(flag_sel_edge === 0 &&
          checkOntimeSelfOverlap(org_sttart_end_on, [value.edge - MTPBegTime, 0]) === 0){
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
    console.log("sel_edge", sel_edge)
    // console.log("Similar pattern occurrences: ", intraOcc)
  }
  return intraOcc
}

// Check if an MTP has self overlap:
// if the MTP has self overlap, return 1;
// else, return 0.
// integerPoints: an 2-d array, [steat_ontime, end_ontime]
function checkOntimeSelfOverlap(integerPoints, vec){
  let flag = 0
  const duration_theme = integerPoints[1] - integerPoints[0]
  let maxIdx = integerPoints.length - 1
  // console.log("Self overlap:", integerPoints)
  if(vec[0] <= integerPoints[0]){
    if(duration_theme + vec[0] <= integerPoints[1]){
      flag = 1
    }
  }
  else{
    if(vec[0] >= integerPoints[0] && vec[0] <= integerPoints[1]){
      flag = 1
    }
  }
  return flag
}