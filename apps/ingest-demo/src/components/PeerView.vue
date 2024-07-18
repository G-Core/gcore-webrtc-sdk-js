<template>
  <div class="peer-video">
    <slot></slot>
    <div class="peer-video__overlay">
      <slot name="overlay"></slot>
    </div>
  </div>
</template>

<style scoped>
.peer-video {
  position: relative;
  background-color: black;
  display: flex;
  align-items: center;
}
.peer-video__overlay {
/* .no-media { */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: rgba(
    255,
    255,
    255,
    0.1
  );
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 1.5rem;
  box-sizing: border-box;
  padding: 1rem;
}
/* .no-media__label {
  font-size: 1.5rem;
}
.peer-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
} */
</style>
