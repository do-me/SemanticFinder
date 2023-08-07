<!-- result.vue -->
<template>
    <div class="result-item" @click="handleClick">
        <div class="result-text">{{ result }}</div>
        <div class="score-box">{{ "0." + Math.round(100 * score) }}</div>
    </div>
</template>

<script>
export default {
    props: {
        result: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
        },
    },
    methods: {
        handleClick() {
            this.$emit('click', this.result);
        },
    },
};
</script>

<style scoped>
.result-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
    background-color: #f5f5f5;
    cursor: pointer;
    transition: background-color 0.3s ease;
}
.result-item:hover {
    background-color: #e0e0e0;
}
.result-text {
    flex-grow: 1;
}
.score-box {
    align-self: flex-start;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: #ddd;
    color: #333;
    font-size: 0.8em;
}
</style>
