// model mining script - necessary as huggingface.co doesn not allow requests from other domains e.g. github.io 
// execute this script for each sorter while on https://huggingface.co/models
// downloads the json file

let out_json = {}
const sorter = "modified" // // likes, downloads, trending, modified
const pipeline_tag = "feature-extraction" // text2text2 etc.
const fileName = `${pipeline_tag}_${sorter}.json`;

function downloadJsonToFile(jsonData, fileName) {
  // Create a Blob object from the JSON data
  const blob = new Blob([JSON.stringify(jsonData)], { type: "application/json" });

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a link element for the download
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;

  // Trigger a click event on the link to initiate the download
  a.click();

  // Clean up by revoking the URL
  URL.revokeObjectURL(url);
}

async function fetchAllPages() {
  const baseUrl = "https://huggingface.co/models-json";
  const commonParams = `?pipeline_tag=${pipeline_tag}&library=transformers.js&sort=${sorter}`; 
  const numPages = 3; // Change this if you need more or fewer pages

  const models = [];

  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    const url = `${baseUrl}${commonParams}&p=${pageIndex}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      models.push(...data.models);
    } catch (error) {
      console.error(`Error fetching page ${pageIndex}: ${error}`);
    }
  }

  const result = {
    activeFilters: {
      pipeline_tag: ["feature-extraction"],
      library: ["transformers.js"],
      dataset: [],
      language: [],
      license: [],
      other: [],
    },
    models,
    numItemsPerPage: 30,
    numTotalItems: models.length,
    pageIndex: 0, 
  };

  out_json = result;
  
  downloadJsonToFile(result, fileName);
}

fetchAllPages();

