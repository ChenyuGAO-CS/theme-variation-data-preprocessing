// Chenyu Gao, 13/12/2023

// This script is to calculate the mean similarity between pairs of theme and generated variation.

// Requires
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
const mu = require("maia-util")
const mh = require("maia-hash")
const { Midi } = require('@tonejs/midi')

// Individual user paths.
const mainPaths = {
  "pop909tvAttn": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/tvAttnVar_pop909_ep6",
    "midiDirs": ["002_A_0_tvAttnVar0.mid", "734_A_0_tvAttnVar0.mid"],
  },
  "pop909musicTrans": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/musicTrans_pop909_Ep6",
    "midiDirs": ["002_A_0_MusicTransVar0.mid", "734_A_0_MusicTransVar0.mid"],
  },
  "pop909fastTrans": {
    "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
    "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/pop909_full_vars/fastTransVar_pop909_ep6",
    "midiDirs": ["002_A_0_fastTransVar0.mid", "734_A_0_fastTransVar0.mid"],
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

coDirs
.forEach(function(coDir, jDir){
  // Read files in each Dir:
  let tmpFiles = fs.readdirSync(path.join(mainPath["rootVar"], coDir))
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
    const themePath = path.join(mainPath["rootTheme"], tmpThemeName + '.mid')
    const themePoints = convertMIDItoPoints(themePath)
    // console.log("themePoints: ", themePoints.slice(0,5))
    console.log("tmpSongNumber", themePath)

    if(varPoints.length > 0){
      // Calculate similarity score by regarding the theme as lookup and var as query.
      let simScore = FingerprintingSimilarityScore(varPoints, themePoints)
      similarityList.push(simScore)
    }

  })
  
})
console.log("similarityList", similarityList)
console.log("mu.mean(similarityList)", mu.mean(similarityList))
console.log("mu.std(similarityList)", mu.std(similarityList))

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
        // n.durationTicks/midi.header.ppq,
        // track.channel,
        // Math.round(1000*n.velocity)/1000
      ]
      trgPoints.push(pt)
    })
  })
  return trgPoints
}