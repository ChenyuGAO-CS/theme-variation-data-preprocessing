Scripts in this folder are used for variation generation task (i.e., theme-variation data preprocessing, and evaluation).

## Estimate the most reasonable setting for the similarity window
Federico suggests estimating the lower-bound and upper-bound for the similarity window by using (e.g., first 4 or 8 measures) of a theme as a query, to calculate the similarity score over variation pieces. 

This script `Cal_winSize_via_annotated_theme_var_fp_similarity.js` is trying to obtain the best setting of window size according to the annotated data in the POP909 dataset.

For each query, Chenyu extracted the maximal similarity score between the query and each variation, and recorded the similarity as recorded as 'sim_list' (e.g., the length of 'sim_list' for K. 265 should be 12, since there are 12 variations for the theme piece). The minimal value and the maximal value in each 'sim_list' will be used to estimate the window’s lower-bound and upper-bound.

Results for the POP909 dataset:
1. Upper bound: 70.95490071485312
2. Lower bound: 53.0263661636219


## Extract theme-variation pairs from annotated phrases.
A theme and its variation here are phrases in a song with the same label from the POP909 dataset. Chenyu restricts the fingerprinting similarity score between a theme and a variation <= 70.

We assume the 1st occurrence of a label in POP909 as "the theme", and taking other occurrences as the target variations.

Using script `save_phrase_separately.js` to extract theme-variation pairs.

## Visualise similarity plot between a theme and its variation pieces
To visualise the similarity plot between the first 4 or 8 measures of a theme and its variation pieces, useing script `vis_fp_similarity_for_winSize.js`. 

When visualising similarity plots for the data from the POP909 dataset, using script `save_phrase_separately.js` to extract theme-variation pairs first. Then, change 'themeId' and 'varId' to visualise similarity plot for a specific theme.

## Looking beyond single song for variations
Federico suggests looking beyond single song for variations. 
Tom suggests using human annotations to define a query, but then using fingerprinting scores in some window (e.g., [0.4, 0.7]) to retrieve variations (either from same song, or across part or whole of dataset).

To do this, we will need to:

1. Build hashes over the full POP909 dataset by using the script `build_hash.js`.
2. Regarding the first occurrence of each annotated phrase as the theme, and then using fingerprinting scores in some window (e.g., [0.4, 0.7]) to retrieve variations (either from same song, or across part or whole of dataset). 
3. Run variation retrival script.

The usage of the script to retrieve variations from same song is shown below:
(Maybe the parameters will need to be adjusted ...)

```
node fp_retrieve_variations.js -u chenyu
```

### Extract variations according to the whole POP909 dataset
<!-- Extracted dataset in MIDI format could be found in this folder (29thSep2023_pop909_theme_var_extracted_for_training.zip) -->
Description for the data extraction process:

1. The first occurrence of each repetitive pattern will be regarded as the theme.
2. Human annotations with similarity < maxSimilarity will be reserved as variations.
3. When retrieving other variations: 
    * We will reserve the pieces with fp score in the similarity window ([53.03, 70.95] that we got by analysing the human annotations from the POP909 dataset).
    * We calculating both fp(x, y) and fp(y, x) when an excerpt is retrieved from a different song to avoid the false positive issue (i.e., an excerpt is retrieved from a quite chordal/dense song, which does not sound perceptually similar to the query).

Size of the theme-var dataset:
    - Train: [Number of pattern pair saved]: 2609
    - Test: [Number of pattern pair saved]: 262

The usage of the script to retrieve variations from the whole POP909 dataset is shown below:

```
node fp_retrieve_variations_accross_wholePOP909.js -u chenyu
```

### Extract variations according to the whole VGMIDI dataset
<!-- Extracted dataset: ‘23rdOct_vgmidi_theme_var.zip’ -->

1. Theme extraction process:
    * Chenyu uses a slice window with a size = 8 measures, and step = 4 measures to extract theme samples.
    * The script checks if the upcoming theme sample is too similar to previous theme, and if variations are too similar to each other.
    * The theme is expected to be extracted by running fast-SIAR in the future.
2. Variation extraction is similar to the method for POP909. 
    * But we only extract variations from the same song, due to game music tends to have a constant accompaniment, and some of them are chrodal/dense. 
    * We keep the upper bound of the similarity window, but expand the lower bound, since we only extract variations from the same song.

Size of the theme-var dataset:
    - Train: [Number of pattern pair saved]: 6790
    - Test: [Number of pattern pair saved]: 1040

The usage of the script to retrieve variations from the whole VGMIDI dataset is shown below:

```
node fp_retrieve_variations_accross_vgmidi.js -u chenyu
```

## Evaluate the generation results with objective metrics

Using the script `eval_similarity.js` to calculate the mean similarity between pairs of theme and generated variation.