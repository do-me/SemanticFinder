// simplified script for just downloading all models from the current HF page
// set the filters on HF and run it in the browser console
// e.g. go to https://huggingface.co/models?pipeline_tag=text2text-generation&library=transformers.js&sort=trending

const h4Elements = document.querySelectorAll("h4");
const h4TextArray = [];

h4Elements.forEach(element => {
  h4TextArray.push(element.textContent);
});

console.log(h4TextArray);

//[
//    "Xenova/t5-small",
//    "Xenova/flan-t5-small",
//    "Xenova/LaMini-Flan-T5-783M",
//    "Xenova/LaMini-Flan-T5-248M",
//    "Xenova/LaMini-Flan-T5-77M",
//    "Xenova/LaMini-T5-61M",
//    "Xenova/LaMini-T5-738M",
//    "Xenova/LaMini-T5-223M",
//    "Xenova/mt5-small",
//    "Xenova/mt5-base",
//    "Xenova/t5-base",
//    "Xenova/t5-v1_1-base",
//    "Xenova/flan-t5-base",
//    "Xenova/t5-v1_1-small",
//    "Xenova/blenderbot-400M-distill",
//    "Xenova/blenderbot_small-90M",
//    "Xenova/long-t5-tglobal-base",
//    "Xenova/long-t5-local-base",
//    "Xenova/long-t5-tglobal-base-16384-book-summary"
//]