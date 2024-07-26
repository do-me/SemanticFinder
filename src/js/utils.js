import { getTokens } from './semantic';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import {setProgressBarValue } from './index.js';

import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

//import {ScatterplotLayer} from '@deck.gl/layers';
/**
 * @param {string} text
 * @param {string} splitType
 * @param {string} splitParam
 * @returns {Promise<Array<string> | null>}
 */
export async function splitText(text, splitType, splitParam) {
    switch (splitType) {
        case 'Regex':
            return splitByRegex(text, splitParam);
        case 'Sentence':
            return splitBySentences(text);
        case 'Words':
            return splitByWords(text, parseInt(splitParam));
        case 'Chars':
            return splitByChars(text, parseInt(splitParam));
        case 'Tokens':
            return await splitByTokens(text, parseInt(splitParam));
        default:
            console.error('Invalid split type');
            return null;
    }
}

/**
 * @param {string} text
 * @param {number} numTokens
 * @returns {Promise<Array<string> | null>}
 */
async function splitByTokens(text, numTokens) {
    const words = text.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const tokens = await getTokens(word);

        // Check if there's no chunk or if the last chunk + the new word would exceed numTokens
        if (chunks.length === 0 || (await getTokens(chunks[chunks.length - 1])).length + tokens.length > numTokens) {
            chunks.push(word);
        } else {
            chunks[chunks.length - 1] += ' ' + word;
        }
    }
    //console.table(chunks);
    console.log("Number of chunks: " + chunks.length)
    return chunks;
}

/**
 * @param {string} text
 * @param {number} numWords
 * @returns {Array<string> | null}
 */
function splitByWords(text, numWords) {
    if (isNaN(numWords) || !Number.isInteger(numWords)) {
        console.error('numWords must be an integer.');
        return null;
    }

    const words = text.split(' ');
    let chunks = [];
    let currentChunk = [];

    for (let i = 0; i < words.length; i++) {
        currentChunk.push(words[i]);

        if (currentChunk.length === numWords) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }
    chunks = chunks.filter(chunk => chunk.trim().length > 0);

    //console.table(chunks);
    console.log("Number of chunks: " + chunks.length)

    return chunks;
}

/**
 * @param {string} text
 * @param {number} numChars
 * @returns {Array<string> | null}
 */
function splitByChars(text, numChars) {
    const words = text.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (chunks.length === 0 || chunks[chunks.length - 1].length + word.length + 1 > numChars) {
            chunks.push(word);
        } else {
            chunks[chunks.length - 1] += ' ' + word;
        }
    }
    // console.table(chunks);
    console.log("Number of chunks: " + chunks.length)
    return chunks;
}

/**
 * @param {string} text
 * @returns {Array<string> | null}
 */
function splitBySentences(text) {
    const chunks = text.match(/[^.!?]+[.!?]+/g);
    console.log("Number of chunks: " + chunks.length)

    return chunks
}

/**
 * @param {string} text
 * @param {string} r
 * @returns {Array<string> | null}
 */
function splitByRegex(text, r) {
    const regex = new RegExp(r, 'g');
    const chunks = text.split(regex);

    console.log("Number of chunks: " + chunks.length)

    return chunks
}

// Sorting algorithms: heap-based sorting is quite superior for 1000+ and usually less than half of the time of normal sorting
// might be interesting to use it once indices become larger than 100k but for now not a bottleneck

// Original code
function normalSorting(inputTexts) {
    const startTime = performance.now();
    const sortedResults = Object.entries(inputTexts).sort((a, b) => b[1] - a[1]);
    const endTime = performance.now();
    console.log(`Original code took ${endTime - startTime} milliseconds`);
    // updateResults(sortedResults); // Commented out, replace with your actual implementation
}

// MaxHeap class
class MaxHeap {
    constructor(array) {
        this.heap = [...array];
        this.buildHeap();
    }

    buildHeap() {
        const n = this.heap.length;
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            this.heapifyDown(i);
        }
    }

    heapifyDown(i) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let largest = i;

        if (left < this.heap.length && this.heap[left][1] > this.heap[largest][1]) {
            largest = left;
        }

        if (right < this.heap.length && this.heap[right][1] > this.heap[largest][1]) {
            largest = right;
        }

        if (largest !== i) {
            this.swap(i, largest);
            this.heapifyDown(largest);
        }
    }

    extractMax() {
        if (this.heap.length === 0) {
            return null;
        }

        const max = this.heap[0];
        const last = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.heapifyDown(0);
        }

        return max;
    }

    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
}

// Heap-based solution
export function heapBasedSorting(inputTexts, n) {
    //const startTime = performance.now();

    const entries = Object.entries(inputTexts);
    const maxHeap = new MaxHeap(entries);

    const nLargest = [];
    for (let i = 0; i < n && i < entries.length; i++) {
        const maxEntry = maxHeap.extractMax();
        nLargest.push(maxEntry);
    }
    return nLargest

    //const endTime = performance.now();
    //console.log(`Heap-based solution took ${endTime - startTime} milliseconds`);
    // updateResults(nLargest); // Commented out, replace with your actual implementation
}

/*
// Test objects
function generateTestObject(size) {
    const testObject = {};
    for (let i = 0; i < size; i++) {
        testObject[`key${i}`] = Math.random();
    }
    return testObject;
}

//const obj100 = generateTestObject(100);
//const obj10000 = generateTestObject(10000);
//const obj100000 = generateTestObject(100000);

// Usage
//const n = 5; // Change this to the desired number of largest values

//normalSorting(obj100);
//heapBasedSorting(obj100, n);

//normalSorting(obj10000);
//heapBasedSorting(obj10000, n);

//normalSorting(obj100000);
//heapBasedSorting(obj100000, n);

Original code took 0.19999999925494194 milliseconds
Heap-based solution took 0.10000000149011612 milliseconds

Original code took 19.5 milliseconds
Heap-based solution took 9.299999997019768 milliseconds

Original code took 166.69999999925494 milliseconds
Heap-based solution took 60.5 milliseconds

*/

const toastMessage = document.getElementById("toastMessage");
const toastText = document.getElementById("toastText");
const closeToastButton = document.getElementById("closeToastButton");

export function showToast(message, timeout=2500) {
    toastText.textContent = message;
    toastMessage.style.display = "block";

    setTimeout(() => {
        hideToast();
    }, timeout);
}

function hideToast() {
    toastMessage.style.display = "none";
}

closeToastButton.addEventListener("click", () => {
    hideToast();
});

function generateGridData(gridSize = 20) {
    const gridData = [];

    // Create vertical lines
    for (let i = -gridSize; i <= gridSize; i++) {
        gridData.push({
            sourcePosition: [i, -gridSize],
            targetPosition: [i, gridSize],
            color: [169, 169, 169],
        });
    }

    // Create horizontal lines
    for (let j = -gridSize; j <= gridSize; j++) {
        gridData.push({
            sourcePosition: [-gridSize, j],
            targetPosition: [gridSize, j],
            color: [169, 169, 169],
        });
    }

    return gridData;
}

const plotContainer = document.getElementById("plot-container");
let deckgl;
export async function loadScatterplot(data) {

    removeScatterplot();
    // Find the minimum and maximum similarity values, x values, and y values in the data array
    const minSimilarity = Math.min(...data.map(item => item.similarity));
    const maxSimilarity = Math.max(...data.map(item => item.similarity));

    const minX = Math.min(...data.map(item => item.x));
    const maxX = Math.max(...data.map(item => item.x));

    const minY = Math.min(...data.map(item => item.y));
    const maxY = Math.max(...data.map(item => item.y));

    data = data.map(item => {
        // Normalize similarity values to the range [0, 1]
        const normalizedSimilarity = (item.similarity - minSimilarity) / (maxSimilarity - minSimilarity);

        // Normalize x and y coordinates to the range [0, 1]
        const normalizedX = (item.x - minX) / (maxX - minX);
        const normalizedY = (item.y - minY) / (maxY - minY);

        // Use the normalized similarity value as alpha (opacity)
        const alpha = Math.min(1, Math.max(0, normalizedSimilarity));

        // Map the alpha value to the entire opacity spectrum
        const color = [0, 0, 255, Math.floor(alpha * 255)]; // RGBA format with alpha value

        return {
            coordinates: [normalizedX, normalizedY],
            color: color,
            similarity: item.similarity,
            label: item.label,
        };
    });

    // Calculate the bounding box of the data
    const bounds = data.reduce(
        (acc, point) => ({
            minX: Math.min(acc.minX, point.coordinates[0]),
            minY: Math.min(acc.minY, point.coordinates[1]),
            maxX: Math.max(acc.maxX, point.coordinates[0]),
            maxY: Math.max(acc.maxY, point.coordinates[1]),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    deckgl = new Deck({
        canvas: 'deckgl',
        container: 'plot-container',
        initialViewState: {
            latitude: (bounds.minY + bounds.maxY) / 2,
            longitude: (bounds.minX + bounds.maxX) / 2,
            zoom: 9
        },
        controller: true,
        pickingRadius: 25,
        layers: [
            // Add a new LineLayer for the coordinate system
            /*new LineLayer({
                id: 'coordinate-system',
                data: generateGridData(20),
                getSourcePosition: d => d.sourcePosition,
                getTargetPosition: d => d.targetPosition,
                getColor: d => d.color,
                getWidth: 1,
                pickable: false
            }),
            */
            // ScatterplotLayer with all points added right away
            new ScatterplotLayer({
                id: 'scatterplot',
                data: data,
                getPosition: d => d.coordinates,
                getRadius: parseInt(document.getElementById("scatterplotRadius").value), // Adjust the radius to fit the new range
                getFillColor: d => d.color,
                pickable: true, // Enable picking for on-hover interaction
                onHover: info => {
                    const tooltip = document.getElementById('tooltip');

                    if (info.object) {
                        const canvas = document.getElementById('deckgl');
                        const rect = canvas.getBoundingClientRect();

                        // Calculate the correct position by subtracting the canvas offset and adding the scroll position
                        const left = window.scrollX + info.x + rect.left + 30;
                        const top = window.scrollY + info.y + rect.top + -50;

                        tooltip.innerHTML = `${info.object.label} <br>Similarity: ${info.object.similarity.toFixed(2)}`;
                        tooltip.style.left = `${left}px`;
                        tooltip.style.top = `${top}px`;
                        tooltip.style.display = 'block';
                    } else {
                        tooltip.style.display = 'none';
                    }
                },
                onClick: info => {
                    const tooltip = document.getElementById('tooltip');
            
                    if (info.object) {
                        const canvas = document.getElementById('deckgl');
                        const rect = canvas.getBoundingClientRect();
            
                        // Calculate the correct position by subtracting the canvas offset and adding the scroll position
                        const left = window.scrollX + info.x + rect.left + 30;
                        const top = window.scrollY + info.y + rect.top + -50;
            
                        tooltip.innerHTML = `${info.object.label} <br>Similarity: ${info.object.similarity.toFixed(2)}`;
                        tooltip.style.left = `${left}px`;
                        tooltip.style.top = `${top}px`;
                        tooltip.style.display = 'block';
                    } else {
                        tooltip.style.display = 'none';
                    }
                }

            })
        ]
    });

    plotContainer.style.height = "700px";
}

export function removeScatterplot() {
    if (deckgl) {
        deckgl.finalize();
        deckgl = null;
    }
}

// pdf loading logic for local and remote

function processPdf(pdf, documentIdentifier, resolve, reject, updateProgress) {
    let numPages = pdf.numPages;
    let pageTextPromises = [];
    for (let i = 1; i <= numPages; i++) {
        pageTextPromises.push(pdf.getPage(i).then(page => {
            return page.getTextContent().then(textContent => {
                return textContent.items.map(item => item.str).join(' ');
            });
        }));
    }
    Promise.all(pageTextPromises).then(pagesText => {
        // Concatenate text from all pages with metadata
        let fullText = pagesText.map(pageText => `[Document: ${documentIdentifier}]\n${pageText}`).join("\n\n");
        resolve(fullText); // Resolve the promise with the full text including metadata
    }).catch(error => {
        reject(error); // Reject the promise if there's an error
    });
}

function extractTextFromPDF(fileOrDataUri, updateProgress) {
    return new Promise((resolve, reject) => {
        let documentIdentifier;
        let pdfSource;

        if (fileOrDataUri instanceof File) {
            // For local files
            documentIdentifier = fileOrDataUri.name;
            pdfSource = URL.createObjectURL(fileOrDataUri);
        } else if (typeof fileOrDataUri === 'string') {
            if (fileOrDataUri.startsWith('data:')) {
                // For data URIs (remote PDFs)
                documentIdentifier = "RemotePDF";
                pdfSource = fileOrDataUri;
            } else {
                // Assume it's a URL
                documentIdentifier = fileOrDataUri;
                pdfSource = fileOrDataUri;
            }
        } else {
            reject(new Error('Invalid input type'));
            return;
        }

        pdfjsLib.getDocument(pdfSource).promise.then(pdf => {
            processPdf(pdf, documentIdentifier, resolve, reject, updateProgress);
        }).catch(error => {
            reject(error); // Reject the promise if there's an error loading the PDF
        });
    });
}


export async function handlePdfFileUpload() {
    const fileInput = document.getElementById('pdf-upload');
    const files = fileInput.files; // Get all selected files
    if (files.length > 0) {
        const totalFiles = files.length;
        let processedFiles = 0;

        // Map each file to a promise that resolves with its text content
        const filePromises = Array.from(files).map(file => {
            return extractTextFromPDF(file, setProgressBarValue).then(text => {
                processedFiles++;
                const progressPercentage = (processedFiles / totalFiles) * 100;
                setProgressBarValue(progressPercentage.toFixed(0));
                console.log(progressPercentage);
                return text;
            });
        });

        // Wait for all files to be processed
        const allFilesText = await Promise.all(filePromises);
        // Concatenate text from all files
        const fullText = allFilesText.join("\n\n");
        return fullText; // Return the full text
    } else {
        console.error('No files selected');
        return ''; // Return an empty string or handle the error as needed
    }
}





////////////////////////////////////////////////////

async function fetchPdfAsDataUri(url) {
    const proxyUrl = 'https://corsproxy.io/?' + url; // cors proxy unfortunately needed for remote files :/
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


export async function handleRemotePdfFileUpload() {
    const urls = document.getElementById("importPdfURL").value.split(" ");
    let texts = [];

    for (const url of urls) {
        console.log(url);

        try {
            const dataUri = await fetchPdfAsDataUri(url);
            const text = await extractTextFromPDF(url, null);
            texts.push(text);
        } catch (error) {
            console.error('Error handling remote PDF file upload:', error);
        }
    }

    return texts.join("\n");
}

export async function handleMultipleRemotePdfFileUploads() {
    const urls = document.getElementById("importPdfURL").value.split(" ")
    const results = [];

    for (const url of urls) {
        console.log(url);

        try {
            const dataUri = await fetchPdfAsDataUri(url);
            const text = await extractTextFromPDF(url, null);
            results.push(text);
        } catch (error) {
            console.error(`Error handling remote PDF file upload for URL ${url}:`, error);
            results.push('');
        }
    }

    return results;
}
