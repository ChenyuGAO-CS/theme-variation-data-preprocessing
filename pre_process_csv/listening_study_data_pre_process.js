// Chenyu Gao, 24.03.2024
// A script to format the listening study result from Qualtrics into the shape expected by R. 
// This script will be extended for feature analysis.

// Requires.
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")

// Individual user paths.
const mainPaths = {
    "23rdMar": {
        "rootPath": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/Listening\ study/example\ survey\ data/23rdMarch_18responses",
        "csvFileName": "Music\ Variation\ Generation\ Project_March 24,\ 2024_04.47.csv",
        "outRatingName": "processed_23Mar_listening_responses_rating.csv",
        "outDemographicName": "processed_23Mar_listening_responses_demographic.csv",
      }
}

// Grab user name from command line to set path to data.
const mainPath = mainPaths[argv.u]

// Read and process .csv file.
const csv_path = path.join(mainPath['rootPath'], mainPath['csvFileName'])
console.log("csv_path", csv_path)
// Read csv file.
const responses = fs.readFileSync(csv_path, "utf8")
process_csv(responses)

// Read csv file and process each line of it.
function process_csv(data) {
    data = data.toString()
    // console.log("data", data)
    let rows = new Array()
    rows = data.split("\r\n") // split by row
    console.log(rows.length)
    let ratingDic = {}
    let demographicDic = {}

    // The first line is the header. 
    // We will use it to create a dictionary for further formatting rating by themeID. 
    const header = rows[0].split(",")
    console.log("header", header.length)

    let parID = 0
    // Process responses by lines.
    for(let i = 4; i < rows.length; i++) { // skip the first line as it is a header of the csv file.
      let row = phrase_row(rows[i])
    //   console.log("row.length:", row.length)
    //   console.log(row)
      let reatingStartFlag = 0
      let demoStartFlag = 0

      for(let j = 0; j < row.length; j ++){
        if(header[j] === 'tool_interest_1'){
            demoStartFlag = 1
            reatingStartFlag = 0
        }
        if(demoStartFlag === 1){
            // write into demographicDic.
            // The key is parID.
            let tmp_demo = {}
            for(let k = j; k < row.length; k ++){
                if(header[k] === 'Q681'){
                    j = k
                    break
                }
                tmp_demo[header[k]] = row[k]
                // console.log("header[k]", header[k])
                // console.log("row[k]", row[k])
            }
            demographicDic[parID.toString()] = tmp_demo
        }
        if(header[j] === 'Q681'){
            // All data process finished! 'email'
            break
        }
        if(reatingStartFlag === 1){
            // write into ratingDic.
            // The key is themeID. 8*5
            if(row[j] != ""){
                const tmp_themeID = header[j].split('_')[0]
                if(tmp_themeID in ratingDic === false){
                    ratingDic[tmp_themeID] = []
                }
                let tmp_response = {}
                tmp_response['parID'] = parID.toString()
                for(let k = j ; k < j + 40; k ++){
                    let split_tmp_header = header[k].split('_')
                    let tmp_new_rateID = split_tmp_header[1]
                    for(let hID = 2; hID < split_tmp_header.length; hID ++){
                        tmp_new_rateID += ('_' + split_tmp_header[hID])
                    }
                    tmp_response[tmp_new_rateID] = row[k]
                }
                ratingDic[tmp_themeID].push(tmp_response)
                reatingStartFlag = 0
                j = j + 40
            }
            // console.log("ratingDic", ratingDic)
        }
        if(header[j] === 'CONSENT'){
            reatingStartFlag = 1
        }
      }
      parID = parID +1
    }
    console.log("demographicDic", demographicDic)
    console.log("ratingDic", ratingDic)
  }

  function phrase_row(row){
    const tmp_row = row.split(",")
    let out_row = []
    for(let i = 0; i < tmp_row.length; i ++){
        // console.log(tmp_row[i])
        let tmp_column = tmp_row[i]
        if(tmp_row[i].indexOf("\"") != -1){
            // console.log(tmp_row[i])
            for (let j = i+1; j < tmp_row.length; j ++){
                tmp_column += ","
                tmp_column += tmp_row[j]
                if(tmp_row[j].indexOf("\"") != -1){
                    i = j 
                    break
                }
            }
            // console.log("***tmp_column", tmp_column)
        }
        out_row.push(tmp_column)
    }
    // console.log(out_row.length)
    return out_row
  }