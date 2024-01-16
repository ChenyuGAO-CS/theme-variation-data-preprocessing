// Chenyu Gao 6/12/2023

// This script will save the quantised pieces from the POP909 dataset for pretraining. 

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
    "compositionObjectDir": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/with_tempo_909_co_with_hier_annotations",
    "midiDirs": ["034.json", "035.json", "801.json", "802.json"],
    "outputDir": "/Users/gaochenyu/Dataset/POP909_with_structure_labels/6thDec_whole_piece_909_forPretrain",
    "fpDir": path.join(__dirname, "..", "out", "hash_tables", "909_hash_tables"),
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

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]
const trackName = mainPath["trackName"]

let coDirs = fs.readdirSync(mainPath["compositionObjectDir"])
// console.log("coDirs.length", coDirs.length)

// // COMMENT lines 32-35 when processing the whole dataset.
// coDirs = coDirs.filter(function(midiDir){
//   return mainPath["midiDirs"].indexOf(midiDir) >= 0
// })

// name of songs whose time signature is 3/4.
// It seems that 746 is 2/4.
const song_with_34 = ['034', '062', '102', '107',
                      '152', '176', '203', '215',
                      '231', '254', '280', '307',
                      '369', '584', '592', '624',
                      '653', '654', '662', '744',
                      '749', '756', '770',
                      '799', '869', '872', '887']
const song_with_24 = ['746']


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
  
  let beatsPerBar = 4
  if(song_with_34.includes(tmpSongNumber)){
    beatsPerBar = 3
  }
  else if(song_with_24.includes(tmpSongNumber)){
    beatsPerBar = 2
  }
  // console.log("song_with_34", song_with_34)
  console.log("beatsPerBar", beatsPerBar)

  const currentSongNum = tmpSongNumber.toString()

  // Convert composition object to MIDI.
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
  const tmp_out_points = points
  const tmp_out_bpm = co.tempi[0].bpm
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
  
  const tmp_MIDI_name = currentSongNum + '.mid'
  fs.writeFileSync(
    path.join(mainPath["outputDir"], tmp_MIDI_name),
    new Buffer.from(midiOut.toArray())
  )
  
})