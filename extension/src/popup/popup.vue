<template>
    <div id="app" :class="popupClass">
        <input v-model="inputText" type="text" class="search-bar">
        <div class="results-container">
            <ResultItem
                v-for="(result, index) in results"
                :key="index"
                :result="result.text"
                :score="result.sim"
                @click="handleResultClick(result)"
            />

        </div>
        <div>model: <progress id="progress" max="100" :value="progressValue"></progress></div>
        <div>process: <progress id="searchProgress" max="100" :value="searchProgress"></progress></div>

    </div>
</template>

<script>
import {load} from '../semantic.js';
import ResultItem from './result.vue';

export default {
    components: {
        ResultItem,
    },
    data() {
        return {
            inputText: '',
            results: [],
            progressValue: 0,
            searchProgress: 0,
            processId: undefined
        };
    },
    computed: {
        popupClass() {
            return this.results.length > 0 ? 'popup-expanded' : 'popup-default';
        }
    },
    watch: {
        inputText: function (newVal, oldVal) {
            if (newVal !== oldVal) {
                this.debounce(this.spawnProcess, ["inputText", this.inputText], 100);
            }
            if (this.inputText === "") { this.results = [];}
        }
    },
    methods: {
        debounce(func, args, wait) {
            let timeout;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args); // async?
            }, wait);
        },
        async spawnProcess(type, text) {
            await chrome.runtime.sendMessage({type: type, text: text}); // await?
        },
        async handleMessage(request, sender, sendResponse) {
            switch (request.type) {
                case "results":
                    // console.log("results msg");
                    if ('text' in request) {
                        this.results = request.text;
                    }
                    this.searchProgress = request.progress;
                    break;
                case "download":
                    if (request.data.status === 'progress') {
                        this.progressValue = request.data.progress.toFixed(2);
                    } else if (request.data.status === 'done') {
                        this.progressValue = 100;
                    }
                    break;

            }
        },
        handleResultClick(result) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'highlightAndScroll', text: result.text});
            });
        },
    },
    // when popup is opened
    async mounted() {
        chrome.runtime.onMessage.addListener(this.handleMessage);

        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        await chrome.tabs.sendMessage(tab.id, {type: "getText"});
        await load();

    },
    beforeUnmount() {
        chrome.runtime.sendMessage({type: "killProcess", processId: this.processId});
        this.results = [];
        chrome.runtime.onMessage.removeListener(this.handleMessage);
    },
};
</script>

<style scoped>
.results-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 10px;
}

#app.popup-default {
    width: 150px;
    transition: width 0.5s ease;
}

#app.popup-expanded {
    width: 300px;
    transition: width 0.5s ease;
}

.search-bar {
    width: 90%;
}
</style>
