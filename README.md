# SemanticFinder - frontend-only live semantic search with transformers.js

## [Try the demo](https://geo.rocks/semanticfinder/) or read the [introduction blog post](https://geo.rocks/post/semanticfinder-semantic-search-frontend-only/).

![](/SemanticFinder.gif)

Semantic search right in your browser! Calculates the embeddings and cosine similarity client-side without server-side inferencing, using [transformers.js](https://xenova.github.io/transformers.js/) and a quantized version of [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2).

## Goal 
Keep it as simple as possible. One HTML-file only that can run anywhere.

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
