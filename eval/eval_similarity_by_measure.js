// Chenyu Gao, 13/12/2023

// This script is to calculate the mean similarity between each measure of theme - generated variation pairs.

// Requires
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
const mu = require("maia-util")
const mh = require("maia-hash")
const mf = require("maia-features")
const mm = require("maia-markov")
const { Midi } = require('@tonejs/midi')
const an = new mm.Analyzer()

// Individual user paths.
const mainPaths = {
  "pop909tvAttn": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/tvAttnVar_pop909_ep10",
    "midiDirs": ["002_A_0_tvAttnVar0.mid", "734_A_0_tvAttnVar0.mid"],
  },
  "pop909musicTrans": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/musicTrans_pop909_Ep10",
    "midiDirs": ["002_A_0_MusicTransVar0.mid", "734_A_0_MusicTransVar0.mid"],
  },
  "pop909fastTrans": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/fastTransVar_pop909_ep10",
    "midiDirs": ["002_A_0_fastTransVar0.mid", "734_A_0_fastTransVar0.mid"],
  },
  "pop909markov": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/markov_909",
    "midiDirs": ["002_A_0_markovVar.mid", "734_A_0_markovVar.mid"],
  },
  "pop909hu": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_var_hu",
    "midiDirs": ["002_A_0_markovVar.mid", "734_A_0_markovVar.mid"],
  },
  "VGMIDItvAttn": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/VGMIDI_full_vars/tvAttnVar_vgmidi_ep10",
    "midiDirs": ["e0_real_Ace\ Attorney_Nintendo\ DS_Phoenix\ Wright\ Ace\ Attorney_Ace\ Attorney\ -\ Court\ Begins_A_0_tvAttnVar0.mid", "e0_real_Pokemon_Nintendo\ 3DS_Pokemon\ X\ &\ Pokemon\ Y_Bicycle_A_0_tvAttnVar0.mid"],
  },
  "VGMIDImusicTrans": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/VGMIDI_full_vars/musicTrans_vgmidi_ep10",
    "midiDirs": ["e0_real_Ace\ Attorney_Nintendo\ DS_Phoenix\ Wright\ Ace\ Attorney_Ace\ Attorney\ -\ Court\ Begins_A_0_musicTransVar0.mid", "e0_real_Pokemon_Nintendo\ 3DS_Pokemon\ X\ &\ Pokemon\ Y_Bicycle_A_0_musicTransVar0.mid"],
  },
  "VGMIDIfastTrans": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/VGMIDI_full_vars/fastTrans_vgmidi_ep10",
    "midiDirs": ["e0_real_Ace\ Attorney_Nintendo\ DS_Phoenix\ Wright\ Ace\ Attorney_Ace\ Attorney\ -\ Court\ Begins_A_0_fastTransVar0.mid", "e0_real_Pokemon_Nintendo\ 3DS_Pokemon\ X\ &\ Pokemon\ Y_Bicycle_A_0_fastTransVar0.mid"],
  },
  "VGMIDImarkov": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/VGMIDI_full_vars/markov_vgmidi",
    "midiDirs": ["e0_real_Ace\ Attorney_Nintendo\ DS_Phoenix\ Wright\ Ace\ Attorney_Ace\ Attorney\ -\ Court\ Begins_A_0_markovVar.mid", "e0_real_Pokemon_Nintendo\ 3DS_Pokemon\ X\ &\ Pokemon\ Y_Bicycle_A_0_markovVar.mid"],
  },
  "VGMIDIhu": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_var_hu",
    "midiDirs": ["e0_real_Ace\ Attorney_Nintendo\ DS_Phoenix\ Wright\ Ace\ Attorney_Ace\ Attorney\ -\ Court\ Begins_A_1.mid", "e0_real_Pokemon_Nintendo\ 3DS_Pokemon\ X\ &\ Pokemon\ Y_Bicycle_A_1.mid"],
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
const beatPerMeasure = 4

// Farey sequence
const quantSet = [0, 1/8, 1/6, 1/4, 1/3, 3/8, 1/2, 5/8, 2/3, 3/4, 5/6, 7/8, 1]


let coDirs = fs.readdirSync(mainPath["rootVar"])
console.log("coDirs.length", coDirs.length)

coDirs = coDirs.filter(function(midiDir){
  return midiDir != '.DS_Store'
})

// // COMMENT lines 32-35 when processing the whole dataset.
// coDirs = coDirs.filter(function(midiDir){
//   return mainPath["midiDirs"].indexOf(midiDir) >= 0
// })

let totalCnt = 0
let similarityList = []
let sameKeySig = 0
let sameKegSigCnt = 0
let translational_coefficient_theme_list = []
let translational_coefficient_var_list = []

// const chordPoints = convertMIDItoPoints("/Users/gaochenyu/Downloads/test_passing_note/f_major_passing.mid")
// let ps = chordPoints.map(function(pt){
//   return[pt[0], pt[1], pt[1], pt[2]]
// })
// const seg = mu.segment(ps)
// // console.log('seg', seg)
// const scores_harman_forward = mu.harman_forward(seg, mu.chord_templates_pbmin7ths, mu.chord_lookup_pbmin7ths)
// // console.log("scores_harman_forward", scores_harman_forward)
// let score_theme = 0
// scores_harman_forward.forEach(function(obj){
//   score_theme += obj.score
// })
// console.log("[**score_chordPoints]", score_theme/scores_harman_forward.length)


coDirs
.forEach(function(coDir, jDir){
  // Read files in each Dir:
  let tmpFiles = fs.readdirSync(path.join(mainPath["rootVar"], coDir))

  // // COMMENT lines 117-120 when processing the whole dataset.
  // tmpFiles = tmpFiles.filter(function(midiDir){
  //   return mainPath["midiDirs"].indexOf(midiDir) >= 0
  // })
  tmpFiles = tmpFiles.filter(function(midiDir){
    return midiDir != '.DS_Store'
  })

  tmpFiles.forEach(function(tmpFile, jFile){
    console.log("tmpFile:", tmpFile)
  
    const varPath = path.join(mainPath["rootVar"], coDir, tmpFile)
    const varPoints = convertMIDItoPoints(varPath)
    // console.log("varPoints: ", varPoints.slice(0,5))
  
    let tmpVarName = tmpFile.split(".")[0]
    const splitVarName = tmpVarName.split("_")
    let tmpThemeName = splitVarName[0]
    for(let i = 1; i < splitVarName.length-1; i ++){
      tmpThemeName += ("_" + splitVarName[i])
    }
    // tmpThemeName += "_0" // For VGMIDImarkov, VGMIDIhu, and 909hu
    const themePath = path.join(mainPath["rootTheme"], tmpThemeName + '.mid')
    const themePoints = convertMIDItoPoints(themePath)
    console.log("themePoints: ", themePoints.slice(0,5))
    console.log("tmpSongNumber", themePath)
  
    // Similarity calculation (by measure).
    // Calculate key signature by measure too.
    if(varPoints.length > 0){
      // Calculate similarity score by regarding the theme as lookup and var as query.
      // Loop each measure of theme-var pair.
      // All songs are quantised as 4/4.
      const maxOntime = Math.min(varPoints[varPoints.length - 1][0], themePoints[themePoints.length - 1][0])
      let currentSimList = []
      for(let tmpOntime = 0; tmpOntime + beatPerMeasure <= maxOntime; tmpOntime += beatPerMeasure){
        let slicedTheme = slicePoints(themePoints, tmpOntime, tmpOntime + beatPerMeasure)[0]
        let slicedVar = slicePoints(varPoints, tmpOntime, tmpOntime + beatPerMeasure)[0]
        if(slicedVar.length > 0 && slicedTheme.length > 0){
          let tmpSimScore = FingerprintingSimilarityScore(slicedVar, slicedTheme)
          currentSimList.push(tmpSimScore)
          // Key signature estimate by measure:
          const tmpPointsTheme = mu.farey_quantise(slicedTheme, quantSet, [0, 2])
          const keySigTheme = mu.fifth_steps_mode(tmpPointsTheme, mu.krumhansl_and_kessler_key_profiles)
          // console.log("keySigTheme:", keySigTheme)
          const tmpPointsVar = mu.farey_quantise(slicedVar, quantSet, [0, 2])
          const keySigVar = mu.fifth_steps_mode(tmpPointsVar, mu.krumhansl_and_kessler_key_profiles)
          // console.log("keySigVar:", keySigVar)
          if(keySigVar[0] === keySigTheme[0]){
            sameKeySig ++
          }

          // Translational Coefficient:
          const compTheme = an.note_point_set2comp_obj(tmpPointsTheme, 
            [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}],
            false, 
            null,
            0, 1, 2, 3, 4)
          // console.log("comp", compTheme)
          const compObjTheme = new mf.CompObj(compTheme)
          const translational_coefficient_theme = compObjTheme.translational_coefficient()
          // console.log("translational_coefficient_theme", translational_coefficient_theme)
          // if(!isNaN(translational_coefficient_theme)){
          //   translational_coefficient_theme_list.push(translational_coefficient_theme)
          // }
      
          const compVar = an.note_point_set2comp_obj(tmpPointsVar, 
            [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}],
            false, 
            null,
            0, 1, 2, 3, 4)
          // console.log("comp", compTheme)
          const compObjVar = new mf.CompObj(compVar)
          const translational_coefficient_var = compObjVar.translational_coefficient()
          if(!isNaN(translational_coefficient_var) && !isNaN(translational_coefficient_theme)){
            translational_coefficient_var_list.push(Math.abs(translational_coefficient_theme - translational_coefficient_var))
          }

          sameKegSigCnt ++
        }
      }
      // console.log("currentSimList", currentSimList)
      let simScore = mu.mean(currentSimList)
      similarityList.push(simScore)

      // 'Score' related to passing notes
      // let ps = [
      //   [0, 45, 45, 4], [0.5, 52, 52, 3.5], [1, 59, 59, 0.5], [1.5, 60, 60, 2.5],
      //   [4, 41, 41, 4], [4.5, 48, 48, 3.5], [5, 55, 55, 0.5], [5.5, 57, 57, 2.5]
      // ]
      let ps = themePoints.map(function(pt){
        return[pt[0], pt[1], pt[1], pt[2]]
      })
      const seg = mu.segment(ps)
      // console.log('seg', seg)
      const scores_harman_forward = mu.harman_forward(seg, mu.chord_templates_pbmin7ths, mu.chord_lookup_pbmin7ths)
      // console.log("scores_harman_forward", scores_harman_forward)
      let score_theme = 0
      scores_harman_forward.forEach(function(obj){
        score_theme += obj.score
      })
      console.log("**score_theme", score_theme/scores_harman_forward.length)

      let ps_var = varPoints.map(function(pt){
        return[pt[0], pt[1], pt[1], pt[2]]
      })
      const seg_var = mu.segment(ps_var)
      // console.log('seg', seg)
      const scores_harman_forward_var = mu.harman_forward(seg_var, mu.chord_templates_pbmin7ths, mu.chord_lookup_pbmin7ths)
      // console.log("scores_harman_forward_var", scores_harman_forward_var)
      let score_var = 0
      scores_harman_forward_var.forEach(function(obj){
        score_var += obj.score
      })
      console.log("**score_var", score_var/scores_harman_forward_var.length)
  
      // // Key signature estimation of the whole piece:
      const trgPointsTheme = mu.farey_quantise(themePoints, quantSet, [0, 2])
      // const keySigTheme = mu.fifth_steps_mode(trgPointsTheme, mu.krumhansl_and_kessler_key_profiles)
      // // console.log("keySigTheme:", keySigTheme)
      const trgPointsVar = mu.farey_quantise(varPoints, quantSet, [0, 2])
      // const keySigVar = mu.fifth_steps_mode(trgPointsVar, mu.krumhansl_and_kessler_key_profiles)
      // // console.log("keySigVar:", keySigVar)
      // if(keySigVar[0] === keySigTheme[0]){
      //   sameKeySig ++
      // }
  
      // // Translational Coefficient full piece:
      // const compTheme = an.note_point_set2comp_obj(trgPointsTheme, 
      //   [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}],
      //   false, 
      //   null,
      //   0, 1, 2, 3, 4)
      // // console.log("comp", compTheme)
      // const compObjTheme = new mf.CompObj(compTheme)
      // const translational_coefficient_theme = compObjTheme.translational_coefficient()
      // // console.log("translational_coefficient_theme", translational_coefficient_theme)
      // if(!isNaN(translational_coefficient_theme)){
      //   translational_coefficient_theme_list.push(translational_coefficient_theme)
      // }
  
      // const compVar = an.note_point_set2comp_obj(trgPointsVar, 
      //   [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}],
      //   false, 
      //   null,
      //   0, 1, 2, 3, 4)
      // // console.log("comp", compTheme)
      // const compObjVar = new mf.CompObj(compVar)
      // const translational_coefficient_var = compObjVar.translational_coefficient()
      // if(!isNaN(translational_coefficient_var)){
      //   translational_coefficient_var_list.push(translational_coefficient_var)
      // }
      
      totalCnt ++
    }
  })

})
// console.log("similarityList", similarityList)
console.log("mu.mean(similarityList)", mu.mean(similarityList))
console.log("mu.std(similarityList)", mu.std(similarityList))
console.log("Percentage of same key signature", sameKeySig/sameKegSigCnt)

console.log("mu.mean(translational_coefficient_theme_list):", mu.mean(translational_coefficient_theme_list))
console.log("mu.std(translational_coefficient_theme_list):", mu.std(translational_coefficient_theme_list))
console.log("mu.mean(translational_coefficient_var_list):", mu.mean(translational_coefficient_var_list))
console.log("mu.std(translational_coefficient_var_list):", mu.std(translational_coefficient_var_list))

// Returning similarity score of a query and a lookup piece.
function FingerprintingSimilarityScore(query, lookup){
  let h = new mh.HasherNoConcat()
  const queryBegTime = Math.round(100000*(query[0][0]))/100000
  let alignedQuery = query.map(function(pt){
    return [Math.round(100000*(pt[0] - queryBegTime))/100000, pt[1]]
  })
  const queryEndTime = alignedQuery[alignedQuery.length - 1][0]

  const buffre_lookup = queryEndTime // 100
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
        n.durationTicks/midi.header.ppq,
        track.channel,
        Math.round(1000*n.velocity)/1000
      ]
      trgPoints.push(pt)
    })
  })
  return trgPoints
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