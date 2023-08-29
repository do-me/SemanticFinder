<template>
    <div class="input-container">
        <input v-model="inputText" type="text" class="search-bar" ref="searchBar" placeholder="Search">
    </div>
</template>

<script>

export default {
    name: 'AnimatedInput',
    data() {
        return {
            inputText: "",
            debounceTimeout: null
        };
    },

    methods: {
        debounce(func, args, wait) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        },
        async spawnProcess(type, text) {
            await chrome.runtime.sendMessage({type: type, text: text}); // await?
        },
    },

    watch: {
        inputText: function (newVal, oldVal) {
            if (newVal !== oldVal) {
                this.debounce(this.spawnProcess, ["inputText", this.inputText], 250);
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
 dark orange: FF793B
 light orange: ff9d3b
 dark yellow: FFBF3E
 bright yellow: ffd23e
 */
.search-bar {
    width: 100%;
    height: 20px;
    background-color: #000;
    border: none;
    outline: none;
    color: white;
    font-family: 'Space Mono', 'monospace'; /* Same font as loading text */
    font-size: 12px;
    font-weight: 400;
    padding-left: 7.5px; /* Same padding as loading text */
}

.search-bar:hover {
    background-color: #525252;
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

