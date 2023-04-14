# SemanticFinder - frontend-only live semantic search with transformers.js

## [Try the demo](https://geo.rocks/semanticfinder/) or read the [introduction blog post](https://geo.rocks/post/semanticfinder-semantic-search-frontend-only/).

![](/SemanticFinder.gif)

Semantic search right in your browser! Calculates the embeddings and cosine similarity client-side without server-side inferencing, using [transformers.js](https://xenova.github.io/transformers.js/) and a quantized version of [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2).

## Goal 
Keep it as simple as possible. One HTML-file only that can run anywhere.

## Speed 
Tested on the entire book of [Moby Dick](https://archive.org/stream/mobydickorwhale01melvuoft/mobydickorwhale01melvuoft_djvu.txt) with 660.000 characters ~13.000 lines or ~111.000 words. 
Initial embedding generation takes **1-2 mins** on my old i7-8550U CPU with 1000 characters as segment size. Following queries take only 20-30 seconds! 
If you want to query larger text instead or keep an entire library of books indexed use a [proper vector database instead](https://geo.rocks/post/qdrant-transformers-js-semantic-search/). 

## Features

You can customize everything!

- Input text & search term(s)
- Segment length (the bigger the faster, the smaller the slower)
- Highlight colors 
- Number of highlights
- Thanks to [CodeMirror](https://codemirror.net/) you can even use syntax highlighting for programming languages such as Python, JavaScript etc. 
- Live updates
- Easy integration of other ML-models thanks to [transformers.js](https://xenova.github.io/transformers.js/)
- Data privacy-friendly - your input text data is not sent to a server, it stays in your browser!

## Usage ideas

- Basic search through anything, like your personal notes (my initial motivation by the way, a huge notes.txt file I couldn't handle anymore)
- Remember peom analysis in school? Often you look for possible Leitmotifs or recurring categories like **food** in Hänsel & Gretel

## Future ideas

- One could package everything nicely and use it e.g. instead of JavaScript search engines such as [Lunr.js](https://lunrjs.com/) (also being used in [mkdocs-material](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/)).
- Electron- or browser-based apps could be augmented with semantic search, e.g. VS Code, Atom or mobile apps. 
- Integration in personal wikis such as Obsidian, tiddlywiki etc. would save you the tedious tagging/keywords/categorisation work or could at least improve your structure further
- Search your own browser history (thanks [@Snapdeus](https://twitter.com/snapdeus/status/1646233904691413006))
- Integration in mkdocs (mkdocs-material) **experimental**:
    - when building the docs, slice all `.md`-files in chunks (length defined in `mkdocs.yaml`). Should be fairly large (>800 characters) for lower response time. It's also possible to build n indices with first a coarse index (mabye per document/ `.md`-file if the used model supports the length) and then a rfined one for the document chunks
    - build the index by calculating the embeddings for all docs/chunks 
    - when a user queries the docs, a switch can toggle (fast) full-text standard search (atm with lunr.js) or experimental semantic search 
    - if the latter is being toggled, the client loads the model (all-MiniLM-L6-v2 has ~30mb) 
    - like in SemanticFinder, the embedding is created client-side and the cosine similarity calculated 
    - the high-scored results are returned just like with lunr.js so the user shouldn't even notice a differenc ein the UI

## Logic 

[Transformers.js](https://xenova.github.io/transformers.js/) is doing all the heavy lifting of tokenizing the input and running the model. Without it, this demo would have been impossible. 

**Input**
- Text, as much as your browser can handle! The demo uses a part of "Hänsel & Gretel" 
- A search term or phrase

**Output**
- <span style="background-color: rgb(0, 255, 81);">Three highlighted string segments</span>, the darker the higher the similarity score.

**Pipeline**

0. All scripts and the model are loaded from CDNs/HuggingFace.
1. A user inputs some text and a search term or phrase.
2. Depending on the approximate length to consider (unit=characters), the text is split into **segments**. Words themselves are never split, that's why it's approximative.
3. The search term embedding is created.
4. For each **segment** of the text, the embedding is created. 
5. Meanwhile, the cosine similarity is calculated between every **segment** embedding and the search term embedding. It's written to a dictionary with the segment as key and the score as value.
6. For every iteration, the progress bar and the highlighted sections are updated in real-time depending on the current highest **three** scores in the array (could easily be modified in the source code, just like the colors).
7. The embeddings are cached in the dictionary so that subsequent queries are quite fast. The calculation of the cosine similarity is fairly speedy in comparison to the embedding generation. 
8. **Only if the user changes the segment length**, the embeddings must be recalculated.  

## Collaboration 
PRs welcome!

## To Dos
- similarity score cutoff/threshold 
- MaterialUI for input fields or proper labels
- integrate different color scales (quantile, precentile etc.)
- polish code 
    - jQuery/vanilla JS mixed
    - clean up functions 
    - add more comments
- add possible use cases
- package as much as possible in one binary
- create a demo without CDNs
- possible integration as example in [transformers.js homepage](https://github.com/xenova/transformers.js/issues/84)
