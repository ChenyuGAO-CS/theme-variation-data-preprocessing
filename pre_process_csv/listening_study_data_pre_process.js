// Chenyu Gao, 24.03.2024
// A script to format the listening study result from Qualtrics into the shape expected by R. 
// This script will be extended for feature analysis.

// Requires.
const argv = require('minimist')(process.argv.slice(2))
const fs = require("fs")
const path = require("path")

// Individual user paths.
const mainPaths = {
    "26thMar": {
        "rootPath": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/Listening\ study/example\ survey\ data/26thMarch_21responses",
        "csvFileName": "Music\ Variation\ Generation\ Project_March\ 26,\ 2024_11.55.csv",
        "outRatingName": "processed_26Mar_listening_responses_rating.csv",
        "outDemographicName": "processed_26Mar_listening_responses_demographic.json",
    },
    "24thMar": {
        "rootPath": "/Users/gaochenyu/Chenyu\ Gao/MusicAI\ Research/Variation\ Generation/Listening\ study/example\ survey\ data/24thMarch_19responses",
        "csvFileName": "Music\ Variation\ Generation\ Project_March\ 24,\ 2024_14.24.csv",
        "outRatingName": "processed_23Mar_listening_responses_rating.csv",
        "outDemographicName": "processed_23Mar_listening_responses_demographic.json",
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
    console.log("rows.length", rows.length)
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
                j = j + 39
            }
            // console.log("ratingDic", ratingDic)
        }
        if(header[j] === 'CONSENT'){
            reatingStartFlag = 1
        }
      }
      parID = parID +1
    }
    console.log("participant count:", parID)
    // console.log("demographicDic", demographicDic)
    // Write as JSON.
    fs.writeFileSync(
        path.join(mainPath['rootPath'], mainPath['outDemographicName']),
        JSON.stringify(demographicDic, null, 2)
    )
    // console.log("ratingDic", ratingDic)

    csv_rating = ratingDic_to_csv(ratingDic)
    // Write csv file.
    const out_rating_path = path.join(
        mainPath['rootPath'], mainPath['outRatingName']
    )
    fs.writeFileSync(
        out_rating_path,
        csv_rating
    )
}

function ratingDic_to_csv(ratingDic){
    // Prepare Header of the .csv file
    let headerItemList = ['themeID', 'parID']
    let csvContent = 'themeID' + ', ' + 'parID' + ', ' 
    for(let i = 1; i <=7; i ++){
        csvContent += ('hu_rating_' + i.toString() + ', ')
        headerItemList.push('hu_rating_' + i.toString())
    }
    // csvContent += ('hu_sug' + ', ')
    // headerItemList.push('hu_sug')
    for(let i = 1; i <=7; i ++){
        csvContent += ('tv_rating_' + i.toString() + ', ')
        headerItemList.push('tv_rating_' + i.toString())
    }
    // csvContent += ('tv_sug' + ', ')
    // headerItemList.push('tv_sug')
    for(let i = 1; i <=7; i ++){
        csvContent += ('mt_rating_' + i.toString() + ', ')
        headerItemList.push('mt_rating_' + i.toString())
    }
    // csvContent += ('mt_sug' + ', ')
    // headerItemList.push('mt_sug')
    for(let i = 1; i <=7; i ++){
        csvContent += ('fa_rating_' + i.toString() + ', ')
        headerItemList.push('fa_rating_' + i.toString())
    }
    // csvContent += ('fa_sug' + ', ')
    // headerItemList.push('fa_sug')
    for(let i = 1; i <=7; i ++){
        csvContent += ('ma_rating_' + i.toString() + ', ')
        headerItemList.push('ma_rating_' + i.toString())
    }
    // csvContent += ('ma_sug' + ', ')
    csvContent += '\n'
    // headerItemList.push('ma_sug')

    // Prepare content by themeID
    // console.log("headerItemList.length", headerItemList)
    const themeIdList = Object.keys(ratingDic)
    console.log("themeIdList", themeIdList)
    for(keyID = 0; keyID < themeIdList.length; keyID ++){
        const tmp_themeID = themeIdList[keyID]
        const tmp_responses = ratingDic[tmp_themeID]
        // console.log("tmp_responses", tmp_responses)
        for(i = 0; i < tmp_responses.length; i ++){
            csvContent += (tmp_themeID + ', ')
            for(j = 1; j < headerItemList.length; j ++){
                csvContent += (tmp_responses[i][headerItemList[j]] + ', ')
            }
            csvContent += '\n'
        }
    }
    return csvContent

}

function phrase_row(row){
    // console.log("***row", row)
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