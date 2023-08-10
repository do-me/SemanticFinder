<template>
    <div ref="animatedSquare" className="animated-square"></div>
</template>

<script>
import anime from 'animejs';

export default {
    name: 'AnimatedSquare',
    props: {
        dist: {
            type: Number,
            required: true
        }
    },
    mounted() {
        this.animateSquare(this.dist);
    },
    watch: {
        dist(newDist) {
            this.resetPosition();
            this.animateSquare(newDist);
        }
    },
    methods: {
        resetPosition() {
            anime({
                targets: this.$refs.animatedSquare,
                translateX: '0px',
                duration: 500  // Animation duration
            });
        },
        animateSquare(dist) {
            anime({
                targets: this.$refs.animatedSquare,
                translateX: {
                    value: dist + 'px',
                    duration: 1000
                },
                loop: true,
                direction: 'alternate',
                easing: 'easeInOutSine'
            });
        }
    }
}
</script>

<style scoped>
.animated-square {
    width: 25px;
    height: 25px;
    background-color: #f00;
}
</style>
