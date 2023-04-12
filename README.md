# SemanticFinder - frontend-only live semantic search with transformers.js

## [Try the demo](https://geo.rocks/semanticfinder/) or read the [introduction blog post](https://geo.rocks/post/semanticfinder-semantic-search-frontend-only/).

![](/SemanticFinder.gif)

Semantic search right in your browser! Calculates the embeddings and cosine similarity client-side without server-side inferencing, using [transformers.js](https://xenova.github.io/transformers.js/) and a quantized version of [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2).

## Goal 
Keep it as simple as possible. One HTML-file only that can run anywhere.

## Speed 
Tested on the entire book of [Moby Dick](https://archive.org/stream/mobydickorwhale01melvuoft/mobydickorwhale01melvuoft_djvu.txt) with 660.000 characters ~13.000 lines or ~111.000 words. 
Initial embedding generation takes **1-2 mins** on my old i7-8550U CPU with 1000 characters as segment size. Following queries take only 20-30 seconds! 



## Collaboration 
PRs welcome!

## To Dos
- similarity score cutoff/threshold 
- integrate different color scales (quantile, precentile etc.)
- polish code 
    - jQuery/vanilla JS mixed
    - clean up functions 
    - add more comments
- add possible use cases
- package as much as possible in one binary
- create a demo without CDNs
- possible integration as example in [transformers.js homepage](https://xenova.github.io/transformers.js/)?
