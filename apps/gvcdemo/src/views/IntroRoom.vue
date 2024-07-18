<template>
  <section class="intro">
    <h3 class="intro__title">
      Copy and send the link to the people you want to add to the video call
    </h3>
    <div class="intro__form">
      <p class="intro__call-location">{{ callLocation }}</p>
      <input
        class="intro__room-id"
        type="text"
        placeholder="enter custom room id"
        v-model="roomId"
        required
      />
      <button
        class="intro__copy-btn"
        title="Copy room URL to clipboard"
        @click="writeClipboardText"
        :disabled="!roomId"
      >
        <CopyIcon :color="'#112C3D'" />
      </button>
    </div>
    <router-link
      class="intro__enter-btn"
      :to="`call/${roomId}`"
      :class="{ 'intro__enter-btn_disabled': !roomId }"
      >Start call</router-link
    >
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"
import { randomString } from "@/components/utils"

import CopyIcon from "@/components/icons/CopyIcon.vue"

const roomId = ref("")
const roomIdLength = ref(12)
const callLocation = ref("")

async function writeClipboardText() {
  try {
    await navigator.clipboard.writeText(callLocation.value + roomId.value)
  } catch (error: any) {
    console.error(error.message)
  }
}

onMounted(() => {
  roomId.value = randomString(roomIdLength.value)
  callLocation.value = window.location.origin + "/call/"
})
</script>

<style scoped lang="scss">
.intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &__title {
    text-align: center;
  }

  &__form {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin-top: 26px;
  }

  &__call-location {
    display: flex;
    align-items: center;
    border: 1px solid;
    border-right: none;
    height: 36px;
    padding: 0 2px 0 6px;
  }

  &__room-id {
    margin: 0;
    padding: 0;
    border: 1px solid;
    border-width: 1px 0;
    background: none;
    font-family: inherit;
    font-size: inherit;
    color: var(--text);
    height: 36px;
    text-overflow: ellipsis;

    &:focus {
      outline: none;
    }
  }

  &__copy-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 36px;
    width: 36px;
    border: 1px solid var(--text);
    cursor: pointer;
    background: var(--verdigris);

    &:hover {
      opacity: var(--l-opacity);
    }

    &:disabled {
      pointer-events: none;
      opacity: var(--m-opacity);
    }
  }

  &__enter-btn {
    display: flex;
    border: 1px solid var(--text);
    border-radius: 4px;
    padding: 6px 26px;
    width: fit-content;
    margin: 26px 0;
    font-weight: 600;

    &:hover {
      opacity: var(--l-opacity);
    }

    &_disabled {
      pointer-events: none;
      opacity: var(--m-opacity);
    }
  }
}
</style>
