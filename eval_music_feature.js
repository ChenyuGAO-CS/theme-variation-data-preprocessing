// Chenyu Gao, 16.08.2023
// A script for analysing key signature of MIDIs. 
// This script will be extended for feature analysis.

// Requires.
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
// const uu = require("uuid/v4")
const { Midi } = require('@tonejs/midi')
const mu = require("maia-util")
const mm = require("maia-markov")
const an = new mm.Analyzer()
// const ch = require("./dexplore/cv_and_hist.js")
// const tx = require("../aisc-2021/dexplore/track_extract_util.js")

const mf = require("maia-features")

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
      "pop909theme": {
        "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
        "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/909_theme_eval",
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
      "VGMIDItheme": {
        "rootTheme": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
        "rootVar": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/gen_ready_to_eval/vgmidi_theme_eval",
        "midiDirs": ["e0_real_Ace\ Attorney_Nintendo\ DS_Phoenix\ Wright\ Ace\ Attorney_Ace\ Attorney\ -\ Court\ Begins_A_1.mid", "e0_real_Pokemon_Nintendo\ 3DS_Pokemon\ X\ &\ Pokemon\ Y_Bicycle_A_1.mid"],
      },
}

// Farey sequence
const quantSet = [0, 1/8, 1/6, 1/4, 1/3, 3/8, 1/2, 5/8, 2/3, 3/4, 5/6, 7/8, 1]

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]

// Import and analyse the MIDI files.
console.log("mainPath[rootVar]:", mainPath["rootVar"])
let midiDirs = fs.readdirSync(mainPath["rootVar"])
console.log(midiDirs.length)
// midiDirs = midiDirs.filter(function(midiDir){
//   return mainPath["midiDirs"].indexOf(midiDir) >= 0
// })
midiDirs = midiDirs.filter(function(midiDir){
  return midiDir != '.DS_Store' && midiDir != 'index.xlsx'
})
console.log("midiDirs.length:", midiDirs.length)

let major_key_cnt = 0
let all_cnt = 0
let pitch_cnt = 0
let pitch_range = 0
let note_density = 0
let avg_IOI = 0
let diversity_IOI = 0
let avg_pitch_interval = 0
let translational_coefficient = 0
let total_pitch_class_histogram = new Array(12).fill(0)
let note_length_histogram = new Array(12).fill(0)
let pitch_class_transition_matrix = []
for(let i = 0; i < 12; i ++){
  pitch_class_transition_matrix[i] = new Array(12).fill(0)
}
let note_length_transition_matrix = []
for(let i = 0; i < 12; i ++){
  note_length_transition_matrix[i] = new Array(12).fill(0)
}

// // Header of the .csv file
// csvContent = 'representation' + ', ' + 'major_key' + ', ' + 'layer' + '\n'

midiDirs
.forEach(function(coDir, jDir){
  // Read files in each Dir:
  let tmpFiles = fs.readdirSync(path.join(mainPath["rootVar"], coDir))

//   // COMMENT lines 117-120 when processing the whole dataset.
//   tmpFiles = tmpFiles.filter(function(midiDir){
//     return mainPath["midiDirs"].indexOf(midiDir) >= 0
//   })

  tmpFiles.forEach(function(midiFile, jFile){
    console.log("midiFile:", midiFile)

    const midiPath = path.join(mainPath["rootVar"], coDir, midiFile)

    // Chenyu's implementation.
    const features = featureExtractor(midiPath)
    // console.log("features", features)

    // // Tom's implementation.
    // const features = featureExtractorTom(midiPath)
    if(Object.keys(features).length>0){
        // Percentage of generated MIDI with major key. 
        let tmp_major_key = 0
        if(features.keySig[0].indexOf("major") != -1){
            tmp_major_key ++
            major_key_cnt ++
        }
        // csvContent += 'REMI' + ', ' + tmp_major_key + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + tmp_major_key + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + tmp_major_key + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + tmp_major_key + ', ' + 'wo_last_layer' + '\n'

        // Pitch Count.
        // csvContent += 'REMI' + ', ' + features.pitch_count + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + features.pitch_count + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + features.pitch_count + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + features.pitch_count + ', ' + 'wo_last_layer' + '\n'
        pitch_cnt += features.pitch_count

        // Pitch Range.
        // csvContent += 'REMI' + ', ' + features.pitch_range + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + features.pitch_range + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + features.pitch_range + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + features.pitch_range + ', ' + 'wo_last_layer' + '\n'
        pitch_range += features.pitch_range

        // Avg. pitch interval
        let tmp_pi = 0
        if(!isNaN(features.avg_pitch_interval)){
            tmp_pi = features.avg_pitch_interval
            avg_pitch_interval += features.avg_pitch_interval
        }
        // csvContent += 'REMI' + ', ' + tmp_pi + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + tmp_pi + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + tmp_pi + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + tmp_pi + ', ' + 'wo_last_layer' + '\n'
        
        // Note Density.
        // csvContent += 'REMI' + ', ' + features.note_density + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + features.note_density + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + features.note_density + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + features.note_density + ', ' + 'wo_last_layer' + '\n'
        note_density += features.note_density

        // Avg. IOI.
        // csvContent += 'REMI' + ', ' + features.avg_IOI + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + features.avg_IOI + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + features.avg_IOI + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + features.avg_IOI + ', ' + 'wo_last_layer' + '\n'
        avg_IOI += features.avg_IOI

        // Diversity IOI
        // csvContent += 'REMI' + ', ' + features.diversity_IOI + ', ' + 'full' + '\n'
        // csvContent += 'REMI' + ', ' + features.diversity_IOI + ', ' + 'wo_last_layer' + '\n'
        // csvContent += 'midiLike' + ', ' + features.diversity_IOI + ', ' + 'full' + '\n'
        // csvContent += 'midiLike' + ', ' + features.diversity_IOI + ', ' + 'wo_last_layer' + '\n'
        diversity_IOI += features.diversity_IOI

        // // translational_coefficient by Tom
        // let tmp_tc = 0
        // if(!isNaN(features.translational_coefficient)){
        //     tmp_tc = features.translational_coefficient
        //     translational_coefficient += features.translational_coefficient
        // }
        // else{
        //     console.log("########features.translational_coefficient", features.translational_coefficient)
        // }
        // // csvContent += 'REMI' + ', ' + tmp_tc + ', ' + 'full' + '\n'
        // // csvContent += 'REMI' + ', ' + tmp_tc + ', ' + 'wo_last_layer' + '\n'
        // // csvContent += 'midiLike' + ', ' + tmp_tc + ', ' + 'full' + '\n'
        // // csvContent += 'midiLike' + ', ' + tmp_tc + ', ' + 'wo_last_layer' + '\n'
        
        

        // // total_pitch_class_histogram
        // features.total_pitch_class_histogram.forEach(function(pc, idx){
        //   total_pitch_class_histogram[idx] += pc
        // })

        // // note_length_histogram
        // features.note_length_histogram.forEach(function(nl, idx){
        //   note_length_histogram[idx] += nl
        // })

        // // pitch_class_transition_matrix (PCTM)
        // for(let i = 0; i < 12; i ++){
        //   for(let j = 0; j < 12; j ++){
        //     pitch_class_transition_matrix[i][j] += features.pitch_class_transition_matrix[i][j]
        //   }
        // }

        // // note_length_transition_matrix (NLTM)
        // for(let i = 0; i < 12; i ++){
        //   for(let j = 0; j < 12; j ++){
        //     note_length_transition_matrix[i][j] += features.note_length_transition_matrix[i][j]
        //   }
        // }

        all_cnt ++
    }

    
   })

})
console.log("Percentage of Major key:", major_key_cnt/all_cnt)
console.log("Avg. Pitch Count:", pitch_cnt/all_cnt)
console.log("Avg. Pitch Range:", pitch_range/all_cnt)
console.log("Avg. Note Density:", note_density/all_cnt)
console.log("Avg. IOI:", avg_IOI/all_cnt)
console.log("Avg. Diversity IOI:", diversity_IOI/all_cnt)
console.log("Avg. Pitch Interval:", avg_pitch_interval/all_cnt)
console.log("Avg. Translational Coefficient:", translational_coefficient/all_cnt)

// // Write csv file.
// const out_path = path.join(
//   __dirname, "..", "out", "tmp", "major_key_REMI.csv"
//   )
// fs.writeFileSync(
//   out_path,
//   csvContent
// )

// for(let i = 0; i < total_pitch_class_histogram.length; i ++){
//   total_pitch_class_histogram[i] = total_pitch_class_histogram[i] / all_cnt
// }
// console.log("Pitch Class Histogram:", total_pitch_class_histogram)

// for(let i = 0 ; i < note_length_histogram.length; i ++){
//   note_length_histogram[i] = note_length_histogram[i] / all_cnt
// }
// console.log("Note Length Histogram:", note_length_histogram)

// for(let i = 0; i < 12; i ++){
//   for(let j = 0; j < 12; j ++){
//     pitch_class_transition_matrix[i][j] = pitch_class_transition_matrix[i][j] / all_cnt
//   }
// }
// console.log("Pitch Class Transition Matrix: ", pitch_class_transition_matrix)

// for(let i = 0; i < 12; i ++){
//   for(let j = 0; j < 12; j ++){
//     note_length_transition_matrix[i][j] = note_length_transition_matrix[i][j] / all_cnt
//   }
// }
// console.log("Note Length Transition Matrix: ", note_length_transition_matrix)


/**
 * Feature extractor: extract features from the input MIDI file.
 * Features involve: 
 *  1. Pitch-based features:
 *     1) pitch_count (PC): the number of different pitches within a sample.
 *     2) total_pitch_class_histogram (PCH): the usage frequency of each pitch class. 
 *     3) pitch_class_transition_matrix (PCTM): the frequency of each former pitch 
 *              transitions to a later one (octave-independent). 
 *     4) pitch_range (PR): The pitch range is calculated by subtraction of 
 *              the highest and lowest pitch.
 *     5) avg_pitch_interval (PI): Average value of the interval between 
 *              two consecutive pitches in semitones. 
 * 
 *  2. Rhythm-based features:
 *     1) note_density (ND): average number of used notes per crotchet note.
 *     2) note_density_std (NDS): std of the number of used notes per 2 crotchet notes.
 *     3) avg_IOI (IOI): the average IOI between each two consecutive notes.
 *     4) diversity_IOI (added by Chenyu): Since avg IOI is not enough to reflect the rhythm diversity, 
 *              here we calculate how many kinds of IOI occur in each 4 crotchet beat region 
 *              by running a slice window with size of 4 crotchet beat (window step = 1 crotchet beat).
 *     5) note_length_histogram (NLH): Histogram reflects the frequency of 
 *              occurrence of notes with each allowable duration.
 *     6) note_length_transition_matrix (NLTM): The two-dimensional duration transition matrix 
 *            is a histogram-like representation computed by counting 
 *            the duration transitions for each (ordered) pair of notes.
 * 
 *  3. Key signature-related features: based on the Krumhansl-Schmuckler key-finding
 *   algorithm.
 *   * * [
 *   *   "Ab major", // Estimated key
 *   *   0.90135,    // Winning (maximal) correlation
 *   *   -4,         // Steps on the circle of fifths for Ab
 *   *   0           // Mode (major/Ionian)
 *   * ]
 * 
 * @param {string} midiPath - Path of the input MIDI.
 * @returns All kinds of features mentioned above in a dictionary.
 */
function featureExtractor(midiPath){
  let features = {}
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
  // console.log("trgPoints:", trgPoints.slice(0, 5))
  if(trgPoints.length>0){
    // Key signature analysis.
    trgPoints = mu.farey_quantise(trgPoints, quantSet, [0, 2])
    keySig = mu.fifth_steps_mode(trgPoints, mu.krumhansl_and_kessler_key_profiles)
    // console.log("keySig: ", keySig)
    features.keySig = keySig

    // Althought when creating a composition object, it will estimate key signature,
    // the corelation ratio is lost. 
    // So, we will still use code above to estimate key.

    // Example code for loading a midi file and then convert it to an mf object.
    const comp = an.note_point_set2comp_obj(trgPoints, 
        [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}],
        false, 
        null,
        0, 1, 2, 3, 4)
    // console.log("comp", comp)
    const comp2 = new mf.CompObj(comp)
    const notes = comp.notes
    
    // pitch_count: The number of different pitches within a sample.
    const pitch_count = pitchCount(notes)
    // console.log("pitch_count: ", pitch_count)
    features.pitch_count = pitch_count

    // total_pitch_class_histogram: The pitch class histogram is an octave-independent representation 
    //        of the pitch content with a dimensionality of 12 for a chromatic scale.
    const total_pitch_class_histogram = pitchClassHistogram(notes)
    // console.log("total_pitch_class_histogram: ", total_pitch_class_histogram)
    features.total_pitch_class_histogram = total_pitch_class_histogram

    // pitch_class_transition_matrix: The two-dimensional pitch class transition matrix 
    //               is a histogram-like representation computed by counting 
    //               the pitch transitions for each (ordered) pair of notes.
    // The resulting feature dimensionality is 12 * 12, which is normalised by entire matrix sum.
    const pitch_class_transition_matrix = pitchClassTransitionMatrix(notes)
    // console.log("pitch_class_transition_matrix: ", pitch_class_transition_matrix)
    features.pitch_class_transition_matrix = pitch_class_transition_matrix

    // Pitch range (PR): The pitch range is calculated by 
    //               subtraction of the highest and lowest used pitch
    const pitch_range = pitchRange(notes)
    // console.log("pitch_range: ", pitch_range)
    features.pitch_range = pitch_range

    // Average pitch interval (PI): Average absolute value of 
    //               the interval between two consecutive pitches in semitones.
    const avg_pitch_interval = avgPitchInterval(notes)
    // console.log("avg_pitch_interval: ", avg_pitch_interval)
    features.avg_pitch_interval = avg_pitch_interval

    // std Note Density or Note count (NC/crotchet note): 
    //        std of the number of used notes per 2 crotchet notes. 
    const note_density_std = comp2.note_density_std()
    // console.log("note_density_std: ", note_density_std)
    features.note_density_std = note_density_std

    // Note Density or Note count (NC/crotchet note):
    //      Average number of used notes per crotchet note. 
    const note_density = notes.length / (notes[notes.length - 1].offtime - notes[0].ontime) 
    // console.log("note_density: ", note_density)
    features.note_density = note_density

    // Average inter-onset-interval (IOI): The average time between two consecutive notes.
    // The output is a scalar in crotchet beat for each sample.
    const avg_IOI = avgIOI(notes)
    // console.log("avg_IOI: ", avg_IOI)
    features.avg_IOI = avg_IOI

    // Diversity of inter-onset-interval (IOI): Since avg IOI is not enough to reflect the rhythm diversity, 
    // here we calculate how many kinds of IOI occur in each 4 crotchet beat region 
    // by running a slice window with size of 4 crotchet beat (window step = 1 crotchet beat).
    const diversity_IOI = diversityIOI(notes)
    // console.log("diversity_IOI: ", diversity_IOI)
    features.diversity_IOI = diversity_IOI

    //Note length histogram (NLH): Histogram reflects the frequency of occurrence of notes with each allowable duration.
    const note_length_histogram = noteLengthHist(notes)
    // console.log("note_length_hist: ", note_length_histogram)
    features.note_length_histogram = note_length_histogram

    // Note length transition matrix (NLTM): The two-dimensional duration transition matrix 
    //            is a histogram-like representation computed by counting 
    //            the duration transitions for each (ordered) pair of notes.
    const note_length_transition_matrix = noteLengthTransitionMatrix(notes)
    // console.log("note_length_transition_matrix: ", note_length_transition_matrix)
    features.note_length_transition_matrix = note_length_transition_matrix

  }

  
  // console.log(features)
  return features
}

// Testing feature extracting by using maia-features
function featureExtractorTom(midiPath){
  let features = {}
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
  // console.log("trgPoints:", trgPoints.slice(0, 5))

  // Key signature analysis.
  trgPoints = mu.farey_quantise(trgPoints, quantSet, [0, 2])
  keySig = mu.fifth_steps_mode(trgPoints, mu.krumhansl_and_kessler_key_profiles)
  // console.log("keySig: ", keySig)
  features.keySig = keySig

  // Althought when creating a composition object, it will estimate key signature,
  // the corelation ratio is lost. 
  // So, we will still use code above to estimate key.

  // Example code for loading a midi file and then convert it to an mf object.
  const comp = an.note_point_set2comp_obj(trgPoints, 
    [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}],
    false, 
    null,
    0, 1, 2, 3, 4)
  // console.log("comp", comp)
  const comp2 = new mf.CompObj(comp)
  const notes = comp.notes

  // console.log("comp2", comp2)

  // pitch_count: The number of different pitches within a sample.
  // Tom's implementation calculate pitch count over 12 for a chromatic scale.
  const pitch_count = comp2.pitch_count()
  // console.log("pitch_count: ", pitch_count)
  features.pitch_count = pitch_count

  // Pitch range (PR): The pitch range is calculated by 
  //               subtraction of the highest and lowest used pitch
  const pitch_range = comp2.pitch_range()
  // console.log("pitch_range: ", pitch_range)
  features.pitch_range = pitch_range

  // Note Density or Note count (NC/crotchet note):
  //      Average number of used notes per crotchet note. 
  const note_density = comp2.note_density("overall")
  // console.log("note_density: ", note_density)
  features.note_density = note_density

  // Average inter-onset-interval (IOI): The average time between two consecutive notes.
  // The output is a scalar in crotchet beat for each sample.
  const avg_IOI = comp2.ioi()
  // console.log("avg_IOI: ", avg_IOI)
  features.avg_IOI = mu.mean(avg_IOI)

  // Average pitch interval (PI): Average absolute value of 
  //               the interval between two consecutive pitches in semitones.
  const avg_pitch_interval = comp2.average_pitch_interval()
  // console.log("avg_pitch_interval: ", avg_pitch_interval)
  features.avg_pitch_interval = avg_pitch_interval

  // total_pitch_class_histogram: The pitch class histogram is an octave-independent representation 
  //        of the pitch content with a dimensionality of 12 for a chromatic scale.
  const total_pitch_class_histogram = comp2.pitch_class_histogram()
  // console.log("total_pitch_class_histogram: ", total_pitch_class_histogram)
  features.total_pitch_class_histogram = total_pitch_class_histogram

  // // pitch_class_transition_matrix: The two-dimensional pitch class transition matrix 
  // //               is a histogram-like representation computed by counting 
  // //               the pitch transitions for each (ordered) pair of notes.
  // // The resulting feature dimensionality is 12 * 12, which is normalised by entire matrix sum.
  // const pitch_class_transition_matrix = comp2.pitch_class_transition_matrix()
  // // console.log("pitch_class_transition_matrix: ", pitch_class_transition_matrix)
  // features.pitch_class_transition_matrix = pitch_class_transition_matrix


  // "Translational Coefficient" (Foubert et al., 2017)
  // TC = [M − (n − 1)]/[n(n − 1)/2 − (n − 1)],
  // Where M is the number of unique entries in the difference array/matrix. 
  // The simplest piece has TC = 0; the most complex piece has TC = 1.

  // This is similar to Bjorklund's (2002) D_min (the "simplest" piece possible, 
  // like a repeat isochronous note, 
  // or an isochronous chromatic scale) and D_max (complete randomness, such that no repeat element of difference array/matrix).

  features.translational_coefficient = comp2.translational_coefficient()

  return features
}

/**
 * pitch_count: The number of different pitches within a sample.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns the number of different pitches within a sample.
 */
function pitchCount(notes){
  let pitch_arr = new Array(128).fill(0)
  notes.forEach(function(n){
    pitch_arr[n.MNN] = 1
  })
  let pitch_count = 0
  pitch_arr.forEach(function(p){
    pitch_count += p
  })
  return pitch_count
}

/**
 * total_pitch_class_histogram: The pitch class histogram is 
 *        an octave-independent representation of 
 *        the pitch content with a dimensionality of 12 for a chromatic scale.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns total_pitch_class_histogram.
 */

function pitchClassHistogram(notes){
  let pch = new Array(12).fill(0)
  notes.forEach(function(n){
    pch[n.MNN % 12] += 1
  })
  // Normalise pch.
  for(let i = 0; i < pch.length; i ++){
    pch[i] = pch[i] / notes.length
  }
  return pch
}

/**
 *  pitch_class_transition_matrix: The two-dimensional pitch class transition matrix 
 *             is a histogram-like representation computed by counting 
 *             the pitch transitions for each (ordered) pair of notes.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns The resulting feature dimensionality is 12 * 12, 
 *  which is normalised by entire matrix sum.
 */
function pitchClassTransitionMatrix(notes){
  // Initialise the pctm. 
  let note_cnt = 0
  let pctm = []
  for(let i = 0; i < 12; i ++){
    pctm[i] = new Array(12).fill(0)
  }
  for(let i = 0; i < notes.length; i ++){
    let pitch_class = notes[i].MNN % 12
    for(let j = i + 1 ; j < notes.length; j ++){
      let transed_pitch_class = notes[j].MNN % 12
      pctm[pitch_class][transed_pitch_class] += 1
      note_cnt ++
    }
  }
  if (note_cnt > 0){
    // Nornalise the pitch_class_transition_matrix.
    for(let i = 0; i < 12; i ++){
      for(let j = 0 ; j < 12; j ++){
        pctm[i][j] = pctm[i][j] / note_cnt
      }
    }
  }
  return pctm
}

/**
 *  Pitch range (PR): The pitch range is calculated by 
 *              subtraction of the highest and lowest used pitch
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns subtraction of the highest and lowest used pitch.
 */
function pitchRange(notes){
  let lowestPitch = 128
  let highestPitch = 0
  notes.forEach(function(n){
    if(n.MNN < lowestPitch){
      lowestPitch = n.MNN
    }
    if(n.MNN > highestPitch){
      highestPitch = n.MNN
    }
  })

  return highestPitch - lowestPitch
}

/**
 * Average absolute value of the interval between two consecutive pitches in semitones.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns 
 */
function avgPitchInterval(notes){
  let avg_pitch_shift = 0
  let cnt_pair = 0
  for(let i = 0; i < notes.length; i ++){
    for(let j = i + 1; j < notes.length; j ++){
      avg_pitch_shift += Math.abs(notes[i].MNN - notes[j].MNN)
      cnt_pair ++
    }
  }
  if(cnt_pair > 0){
    avg_pitch_shift = avg_pitch_shift / cnt_pair
  }

  return avg_pitch_shift
}

/**
 * Average inter-onset-interval (IOI): The time between two consecutive notes.
 * The output is a scalar in crotchet beat for each sample.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns Average inter-onset-interval (IOI)
 */
function avgIOI(notes){
  // To avoid a lot of '0' will be accumulated into the IOI calculation due to chords,
  // we only keep one note with the same ontime. 
  let uniqueOntimeList = []
  let uniqueOntimeSet = new Set()
  notes.forEach(function(n){
    // To avoid decimal data error.
    let tmp_ontime = Math.round(100000*(n.ontime))/100000
    if(!uniqueOntimeSet.has(tmp_ontime)){
      uniqueOntimeSet.add(tmp_ontime)
      uniqueOntimeList.push(tmp_ontime)
    }
  })
  let sumIOI = 0
  // Calculate IOI between each two consecutive notes.
  for(let i = 1; i < uniqueOntimeList.length; i ++){
    sumIOI += (uniqueOntimeList[i] - uniqueOntimeList[i-1])
  } 

  let avgIOI = 0
  if (uniqueOntimeList.length - 1 > 0){
    avgIOI = sumIOI/(uniqueOntimeList.length-1)
  }
  return avgIOI
}

/**
 * Diversity of inter-onset-interval (IOI): Since avg IOI is not enough to reflect the rhythm diversity, 
 * here we calculate how many kinds of IOI occur in each crotchet beat.
 * The output is a scalar in crotchet beat for each sample.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns Averge diversity of inter-onset-interval (IOI) in crotchet beat. 
 */
function diversityIOI(notes){
  // To avoid a lot of '0' will be accumulated into the IOI calculation due to chords,
  // we only keep one note with the same ontime. 
  let uniqueOntimeList = []
  let uniqueOntimeSet = new Set()
  notes.forEach(function(n){
    // To avoid decimal data error.
    let tmp_ontime = Math.round(100000*(n.ontime))/100000
    if(!uniqueOntimeSet.has(tmp_ontime)){
      uniqueOntimeSet.add(tmp_ontime)
      uniqueOntimeList.push([tmp_ontime, n.MNN])
    }
  })
  let sumDiversityIOI = 0
  let cnt = 0
  const winStep= 1
  let lowerBoundWin = 0
  let upperBoundWin = 4
  // Run a slice window to calculate the diversity of IOI within a region.
  // The step of the slice window is set to: 1 crotchet beat.
  // The size of the slice window is set to: 4 crotchet beat.
  // Calculate IOI between each two consecutive notes.
  while(upperBoundWin < uniqueOntimeList[uniqueOntimeList.length - 1][0]){
    let tmp_diversity = new Set()
    const sliced_points = slicePoints(uniqueOntimeList, lowerBoundWin, upperBoundWin)[0]
    for(let i = 1; i < sliced_points.length; i ++){
      tmp_diversity.add(Math.round(100000*(sliced_points[i][0] - sliced_points[i - 1][0]))/100000)
    }
    sumDiversityIOI += tmp_diversity.size
    cnt ++
    lowerBoundWin += winStep
    upperBoundWin += winStep
  }

  if (cnt > 0){
    sumDiversityIOI = sumDiversityIOI/cnt
  }
  return sumDiversityIOI
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
    else if((point_set[i][0] >= beg_time) && (point_set[i][0] <= end_time)){
      selectedPointSet.push(point_set[i])
    }
  }
  slicedStartIdx = slicedEndIdx - selectedPointSet.length + 1
  // console.log("[selectedPointSet", selectedPointSet, "],[slicedStartIdx", slicedStartIdx, "],[slicedEndIdx",slicedEndIdx, "]")
  return [selectedPointSet, slicedStartIdx, slicedEndIdx]
}

/**
 * Note length histogram (NLH): Histogram reflects the frequency of occurrence of notes with each allowable duration.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns Note length histogram (NLH), which is a vector with length = 12.
 */
function noteLengthHist(notes){
  // we define a set of allowable duration classes:
  // [full, half, quarter, 8th, 16th, dot half, dot quarter, dot 8th, dot 16th, half note triplet, quarter note triplet, 8th note triplet].
  const duration_list = [4, 2, 1, 1/2, 1/4, 3, 3/2, 3/4, 3/8, 4/3, 2/3, 1/3]
  const delta = 1e-5
  let note_length_hist = new Array(12).fill(0)
  let note_cnt = 0
  notes.forEach(function(n){
    for(let i = 0 ; i < duration_list.length; i ++){
      if(Math.abs(n.duration - duration_list[i]) < delta){
        note_length_hist[i] ++
        note_cnt ++
        break
      }
    }
  })
  if(note_cnt > 0){
    for(let i = 0 ; i < duration_list.length; i ++){
      note_length_hist[i] = note_length_hist[i]/note_cnt
    }
  }
  
  return note_length_hist
}

/**
 * Note length transition matrix (NLTM): The two-dimensional duration transition matrix 
 *             is a histogram-like representation computed by counting 
 *             the duration transitions for each (ordered) pair of notes.
 * @param {Array} notes - Notes array of the input MIDI.
 * @returns Note length transition matrix (NLTM)
 */
function noteLengthTransitionMatrix(notes){
  // we define a set of allowable duration classes:
  // [full, half, quarter, 8th, 16th, dot half, dot quarter, dot 8th, dot 16th, half note triplet, quarter note triplet, 8th note triplet].
  const duration_list = [4, 2, 1, 1/2, 1/4, 3, 3/2, 3/4, 3/8, 4/3, 2/3, 1/3]
  const delta = 1e-5

  // Initialise the note_length_transition_matrix. 
  let note_length_transition_matrix = []
  for(let i = 0; i < 12; i ++){
    note_length_transition_matrix[i] = new Array(12).fill(0)
  }

  let cnt_pair = 0
  for(let i = 0; i < notes.length; i ++){
    for(let j = 0 ; j < duration_list.length; j ++){
      if(Math.abs(notes[i].duration - duration_list[j]) < delta){
        let duration_class = j
        for(let idx_transed = i + 1; idx_transed < notes.length; idx_transed ++){
          for(let k = 0; k < duration_list.length; k ++){
            if(Math.abs(notes[idx_transed].duration - duration_list[k]) < delta){
              let transed_duration_class = k
              note_length_transition_matrix[duration_class][transed_duration_class] ++
              cnt_pair ++
            }
          }
        }
      }
    }
  }

  // Normalisation.
  if(cnt_pair > 0){
    for(let i = 0 ; i < 12; i ++){
      for(let j = 0; j < 12; j ++){
        note_length_transition_matrix[i][j] /= cnt_pair
      }
    }
  }
  

  return note_length_transition_matrix
}