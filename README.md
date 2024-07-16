# Theme-and-Variation (TVar) extraction

This repository contains the source code of the theme-and-varitaion extraction algorithm of the paper: Gao et al., Variation Transformer: New datasets, models, and comparative evaluation for symbolic music variation generation, in _ISMIR_ 2024.

For more details on variation generation models, see [this repo](https://github.com/ChenyuGAO-CS/Variation-Transformer).

## Dependencies
```
npm install
```

## Theme-and-Variation (TVar) extraction algorithm
Variations in POP909-TVar involves both human annotated repetitions and our algorithm extracted variations. For the VGMIDI-TVar, variations are all extracted by our algorithm automatically. 
<!-- ## Looking beyond single song for variations
Federico suggests looking beyond single song for variations. 
Tom suggests using human annotations to define a query, but then using fingerprinting scores in some window (e.g., [0.4, 0.7]) to retrieve variations (either from same song, or across part or whole of dataset). -->

<!-- To do this, we will need to:

1. Build hashes over the full POP909 dataset by using the script `build_hash.js`.
2. Regarding the first occurrence of each annotated phrase as the theme, and then using fingerprinting scores in some window (e.g., [0.4, 0.7]) to retrieve variations (either from same song, or across part or whole of dataset). 
3. Run variation retrival script.

The usage of the script to retrieve variations from same song is shown below:
(Maybe the parameters will need to be adjusted ...)

```
node fp_retrieve_variations.js -u chenyu
``` -->

### 1. Extract variations according to the whole POP909 dataset
<!-- Extracted dataset in MIDI format could be found in this folder (29thSep2023_pop909_theme_var_extracted_for_training.zip) -->
Variations in POP909-TVar involves both human annotated repetitions and our algorithm extracted variations according to the whole POP909 dataset. 
After running the theme-and-variation extraction algorithm, there are only 9 variations that come from different songs. We checked them manually and ensured that they are sensible variations. 

1. Download the POP909 dataset through [this link](https://github.com/ChenyuGAO-CS/Variation-Transformer-Data-and-Model/blob/main/dataset/with_tempo_909_co_with_hier_annotations.zip). We aligned the downbeat of each song with the corresponding bar line.

2. Download the repetition annotations through [this link](https://github.com/ChenyuGAO-CS/Variation-Transformer-Data-and-Model/blob/main/dataset/909_hier_gt.json).

3. Build hashes over the full POP909 dataset by using the script `build_hash.js`.


4. Extract variations:

    Description for the data extraction process:

    - The first occurrence of each repetitive pattern will be regarded as the theme.
    - Human annotations with ```similarity < similarity_upper_bound``` will be reserved as variations.
    - When retrieving other variations: 
        * We will reserve the pieces with fp score in the similarity window ([53.03, 70.95]).
        * We calculating both fp(x, y) and fp(y, x) when an excerpt is retrieved from a different song to avoid the false positive issue (i.e., an excerpt is retrieved from a quite chordal/dense song, which does not sound perceptually similar to the query).


    The usage of the script `fp_retrieve_variations_accross_wholePOP909.js` (in the `Theme_variation_extraction` folder) to retrieve variations from the whole POP909 dataset is shown below:

    ```
    node fp_retrieve_variations_accross_wholePOP909.js -u chenyu
    ```
Size of the theme-var dataset:

    - Train: [Number of TVar pair saved]: 2,609
    - Test: [Number of TVar pair saved]: 262


### 2. Extract variations according to the whole VGMIDI dataset
As for the VGMIDI dataset, we infer there could be greater scope for new material in variations in game music, and we reduce the similarity lower bound.  We restrict a theme and its variations come from the same song to avoid false-positive variations from different songs being discovered. 
<!-- Extracted dataset: ‘23rdOct_vgmidi_theme_var.zip’ -->


- Theme extraction process:
    * We run a slice window with size = 8 measures and step = 4 measures from the beginning to the end of the song to extract theme samples.
    * The similarity between each new theme and previous themes is calculated to filter out theme samples that are too similar (similarity score > upper-bound) to existing themes.
- Variation extraction is similar to the method for POP909. 
    * Compared to popular music, we infer there could be greater scope for new material in variations in game music, so we reduce the similarity lower bound to 30 but keep the similarity upper bound as 70.95.
    * We only extract variations from the same song to avoid false-positive variations from different songs being discovered, due to game music tends to have a constant accompaniment, and some of them are chrodal/dense. 

Size of the theme-var dataset:

    - Train: [Number of TVar pair saved]: 6,790
    - Test: [Number of TVar pair saved]: 1,040

The usage of the script `fp_retrieve_variations_accross_vgmidi.js` (in the `Theme_variation_extraction` folder) to retrieve variations from the whole VGMIDI dataset is shown below:

```
node fp_retrieve_variations_accross_vgmidi.js -u chenyu
```

## Estimate the most reasonable setting for the similarity window

As repetitive phrase annotations are provided in the POP909 dataset, we use these to estimate the lower and upper bounds of the similarity between human-composed themes and variations by utilizing a [symbolic fingerprinting-based similarity calculation](https://link.springer.com/article/10.1007/s42979-022-01220-y). The first occurrence of each repetitive pattern is regarded as the theme, and the following occurrences are regarded as variations. For each theme, we record the minimum and maximum similarity scores between it and its variations. 

The similarity lower bound is the average of the per-theme minimum scores, and the upper bound is defined correspondingly, with values of 53.03 and 70.95, respectively.

<!-- Federico suggests estimating the lower-bound and upper-bound for the similarity window by using (e.g., first 4 or 8 measures) of a theme as a query, to calculate the similarity score over variation pieces.  -->

This script `Cal_winSize_via_annotated_theme_var_fp_similarity.js` in the `Theme_variation_extraction` folder is used to obtain the similarity lower and upper bound according to the annotated repetitive phrases in the POP909 dataset.

<!-- For each query, Chenyu extracted the maximal similarity score between the query and each variation, and recorded the similarity as recorded as 'sim_list' (e.g., the length of 'sim_list' for K. 265 should be 12, since there are 12 variations for the theme piece). The minimal value and the maximal value in each 'sim_list' will be used to estimate the window’s lower-bound and upper-bound.

Results for the POP909 dataset:
1. Upper bound: 70.95490071485312
2. Lower bound: 53.0263661636219 -->


<!-- ## Extract theme-variation pairs from annotated phrases.
A theme and its variation here are phrases in a song with the same label from the POP909 dataset. Chenyu restricts the fingerprinting similarity score between a theme and a variation <= 70.

We assume the 1st occurrence of a label in POP909 as "the theme", and taking other occurrences as the target variations.

Using script `save_phrase_separately.js` to extract theme-variation pairs. -->

<!-- ## Visualise similarity plot between a theme and its variation pieces
To visualise the similarity plot between the first 4 or 8 measures of a theme and its variation pieces, useing script `vis_fp_similarity_for_winSize.js`. 

When visualising similarity plots for the data from the POP909 dataset, using script `save_phrase_separately.js` to extract theme-variation pairs first. Then, change 'themeId' and 'varId' to visualise similarity plot for a specific theme. -->


## Evaluate the generation results with feature-based evaluation metrics

Using the script `eval/eval_similarity_by_measure.js` to extract 3 musical features described in Sec. 5.3.