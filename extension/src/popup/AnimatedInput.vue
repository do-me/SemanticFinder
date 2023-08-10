<template>
    <div class="input-container">
        <input v-model="inputText" type="text" class="search-bar" ref="searchBar" placeholder="Search">
    </div>
</template>

<script>
import {prettyLog} from "../utils.js";

export default {
    name: 'AnimatedInput',
    data() {
        return {
            inputText: "",
        };
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
    },

    watch: {
        inputText: function (newVal, oldVal) {
            if (newVal !== oldVal) {
                this.debounce(this.spawnProcess, ["inputText", this.inputText], 100);
            }
            if (this.inputText === "") {
                this.$parent.results = []
            }
        }
    }
}

</script>
<style scoped>

@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

.input-container {
    width: 93%;
    height: 30px;
    background-color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
}

/*
 orange: FF793B
 yellow: FFBF3E
 */
.search-bar {
    width: 100%;
    height: 15px;
    background-color: #FFBF3E;
    border: none;
    outline: none;
    color: black;
    font-family: 'Space Mono', 'monospace'; /* Same font as loading text */
    font-size: 12px;
    font-weight: 700;
    padding-left: 7.5px; /* Same padding as loading text */
}

.search-bar:hover {
    background-color: #ff9d3b;
}


.search-bar::placeholder {
    color: white; /* Set placeholder text color to white */
    font-weight: 700;
    text-shadow:
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000,
        1px 1px 0 #000; /* Apply thin black outline */
    opacity: 1; /* Ensure the placeholder is fully opaque */
}
</style>

