# Theme-and-Variation (TVar) extraction

This repository contains the source code of the theme-and-varitaion extraction algorithm of the paper: Gao et al., Variation Transformer: New datasets, models, and comparative evaluation for symbolic music variation generation, in _ISMIR_ 2024.

For more details on variation generation models, see [this repo](https://github.com/ChenyuGAO-CS/Variation-Transformer).

## Dependencies
```
npm install
```

## Theme-and-Variation (TVar) extraction algorithm
Variations in POP909-TVar involves both human annotated repetitions and our algorithm extracted variations. For the VGMIDI-TVar, variations are all extracted by our algorithm automatically. 


### 1. Extract variations according to the whole POP909 dataset
<!-- Extracted dataset in MIDI format could be found in this folder (29thSep2023_pop909_theme_var_extracted_for_training.zip) -->
Variations in POP909-TVar involves both human annotated repetitions and our algorithm extracted variations according to the whole POP909 dataset. 
After running the theme-and-variation extraction algorithm, there are only 9 variations that come from different songs. We checked them manually and ensured that they are sensible variations. 

1. Download the POP909 dataset through [this link](https://github.com/ChenyuGAO-CS/Variation-Transformer-Data-and-Model/blob/main/dataset/with_tempo_909_co_with_hier_annotations.zip). We aligned the downbeat of each song with the corresponding bar line.

2. Download the repetition annotations through [this link](https://github.com/ChenyuGAO-CS/Variation-Transformer-Data-and-Model/blob/main/dataset/909_hier_gt.json).

3. Build hashes over the full POP909 dataset by using the script `build_hash.js`.
    
    Prepare directories to store hash tables:
    ```
    mkdir -p out/hash_tables/909_hash_tables/fp
    ```
    Build hash tables:
    ```
    node build_hash.js -u chenyu
    ```


4. Extract variations:

    Description for the data extraction process:

    - The first occurrence of each repetitive pattern will be regarded as the theme.
    - Human annotations with ```similarity < similarity_upper_bound``` will be reserved as variations.
    - When retrieving other variations: 
        * We will reserve the pieces with fp score in the similarity window ([53.03, 70.95]).
        * We calculating both fp(x, y) and fp(y, x) when an excerpt is retrieved from a different song to avoid the false positive issue (i.e., an excerpt is retrieved from a quite chordal/dense song, which does not sound perceptually similar to the query).


    The usage of the script `fp_retrieve_variations_accross_wholePOP909.js` (in the `Theme_variation_extraction` folder) to retrieve variations from the whole POP909 dataset is shown below (    Please change [lines 26-38](https://github.com/ChenyuGAO-CS/theme-variation-data-preprocessing/blob/main/Theme_variation_extraction/fp_retrieve_variations_accross_wholePOP909.js#L26-L38) to config your path):

   

    ```
    node fp_retrieve_variations_accross_wholePOP909.js -u chenyu
    ```

Size of the theme-var dataset:

    - Train: [Number of TVar pair saved]: 2,609
    - Test: [Number of TVar pair saved]: 262


### 2. Extract variations according to the whole VGMIDI dataset
As for the VGMIDI dataset, we infer there could be greater scope for new material in variations in game music, and we reduce the similarity lower bound.  We restrict a theme and its variations come from the same song to avoid false-positive variations from different songs being discovered. 
<!-- Extracted dataset: ‘23rdOct_vgmidi_theme_var.zip’ -->

1. Download the VGMIDI dataset through [this link](https://github.com/lucasnfe/puct-music-emotion/releases/download/aiide22/vgmidi_clean.zip).

2. Merge the largest subset and the subset with emotional labels and adhered to the original train-test split.

3. Extract theme-and-variation pairs:

    - Theme extraction process:
        * We run a slice window with size = 8 measures and step = 4 measures from the beginning to the end of the song to extract theme samples.
        * The similarity between each new theme and previous themes is calculated to filter out theme samples that are too similar (similarity score > upper-bound) to existing themes.
    - Variation extraction is similar to the method for POP909. 
        * Compared to popular music, we infer there could be greater scope for new material in variations in game music, so we reduce the similarity lower bound to 30 but keep the similarity upper bound as 70.95.
        * We only extract variations from the same song to avoid false-positive variations from different songs being discovered, due to game music tends to have a constant accompaniment, and some of them are chrodal/dense. 

    The usage of the script `fp_retrieve_variations_accross_vgmidi.js` (in the `Theme_variation_extraction` folder) to retrieve variations from the whole VGMIDI dataset is shown below (    Please change [lines 28-36](https://github.com/ChenyuGAO-CS/theme-variation-data-preprocessing/blob/main/Theme_variation_extraction/fp_retrieve_variations_accross_vgmidi.js#L28-L36) to config your path):

    ```
    node fp_retrieve_variations_accross_vgmidi.js -u vgmidi
    ```

Size of the theme-var dataset:

    - Train: [Number of TVar pair saved]: 6,790
    - Test: [Number of TVar pair saved]: 1,040


## Estimate the most reasonable setting for the similarity window

As repetitive phrase annotations are provided in the POP909 dataset, we use these to estimate the lower and upper bounds of the similarity between human-composed themes and variations by utilizing a [symbolic fingerprinting-based similarity calculation](https://link.springer.com/article/10.1007/s42979-022-01220-y). The first occurrence of each repetitive pattern is regarded as the theme, and the following occurrences are regarded as variations. For each theme, we record the minimum and maximum similarity scores between it and its variations. 

The similarity lower bound is the average of the per-theme minimum scores, and the upper bound is defined correspondingly, with values of 53.03 and 70.95, respectively.


This script `Cal_winSize_via_annotated_theme_var_fp_similarity.js` in the `Theme_variation_extraction` folder is used to obtain the similarity lower and upper bound according to the annotated repetitive phrases in the POP909 dataset.


## Evaluate the generation results with feature-based evaluation metrics

Using the script `eval/eval_similarity_by_measure.js` to extract 3 musical features described in Sec. 5.3.


## Citing this Work
If you use our method or datasets in your research, please cite:
```
@inproceedings{gao2024variation,
  title={{Variation Transformer}: New datasets, models, and comparative evaluation for symbolic music variation generation},
  author={Chenyu Gao, Federico Reuben, and Tom Collins},
  booktitle={the 25th International Society for Music Information Retrieval Conference},
  year={2024}
}
```

