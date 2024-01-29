import { getTokens } from './semantic';
import * as d3 from "d3";
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
const soundToggle = document.querySelector('#toggle-sound')

export function showToast(message) {
    toastText.textContent = message;
    toastMessage.style.display = "block";

    setTimeout(() => {
        hideToast();
    }, 2500);
}

function hideToast() {
    toastMessage.style.display = "none";
}

closeToastButton.addEventListener("click", () => {
    hideToast();
});

export async function loadD3Plot(data) {
    // a very buggy d3 plot, should be replaced with something that works better out of the box with zooming, panning etc. 
    // maybe bokeh js (but immature), plotly js might work too 
    // tested deck.gl but there is a weird label positioning bug
    // three.js might be a good choice for an eventual 2D/3D toggle in the future
    // other options available?

    removeD3Plot();
    // Create an SVG container
    const svg = d3.select("#plot-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 600);

    // Create a group for the circles
    // Create a group for the circles
    const circleGroup = svg.append("g")
        //.attr("transform")//, `translate(${svg.attr("width") / 2}, ${svg.attr("height") / 2})`);


    // Define a color scale for shades of green
    const colorScale = d3.scaleSequential(d3.interpolateGreens);

    // Generate random points
    //const data = generateRandomPoints(1000);

    // Create circles for each point
    const circles = circleGroup.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        //.attr("r", 5) // Adjust the initial radius as needed
        .attr("fill", d => colorScale(d.color)) // Use the color scale for shades of green
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    //const dataExtent = calculateExtent(data);

    const zoomBehavior = d3.zoom()
        //.scaleExtent([1, 10]) // Set the zoom level limits
        //.translateExtent([[xScale.domain()[0], yScale.domain()[0]], [xScale.domain()[1], yScale.domain()[1]]]) // Set the pan limits
        .on('zoom', zoomed)
    
    svg.call(zoomBehavior);

    // Function to handle mouseover event
    function handleMouseOver(event, d) {
        const hoveredCircle = d3.select(this);
        //hoveredCircle.attr("r", 8); // Adjust the size when hovering
        hoveredCircle.attr("opacity", 0.6);

        // Show tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("left", event.pageX + 20 + "px")
            .style("top", event.pageY - 20 + "px");

        tooltip.append("p")
            .text(`${d.label}`); // ${d.x} ${d.y}` );
    }

    // Function to handle mouseout event
    function handleMouseOut() {
        const hoveredCircle = d3.select(this);

        // Get the radius value of an unhovered point
        //const unhoveredCircle = d3.selectAll("circle:not(:hover)").node();
        //const unhoveredRadius = d3.select(unhoveredCircle).attr("r");

        // Set the radius of the hovered point to the radius of the unhovered point
        hoveredCircle.attr("opacity", 1);

        // Hide tooltip
        d3.select(".tooltip").remove();
    }


    // Function to handle zoomed events
    function zoomed(event) {
        // Update the radius of the circles based on the current zoom level
        const newRadius = 5 / event.transform.k; // Adjust the factor as needed
        circles.attr("r", newRadius);

        // Update the font size of the tooltip text based on the current zoom level
        const tooltipFontSize = 14 / event.transform.k; // Adjust the factor as needed
        d3.select(".tooltip").style("font-size", tooltipFontSize + "px");

        // Update the position of the circles
        circleGroup.attr("transform", event.transform);
    }
}

export function removeD3Plot() {
    // Select the SVG container and remove it
    d3.select("#plot-container svg").remove();

    // Remove any tooltips
    d3.select(".tooltip").remove();
}
