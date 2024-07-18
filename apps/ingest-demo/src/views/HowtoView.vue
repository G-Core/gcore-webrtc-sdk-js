<template>
  <main class="howto">
    <section>
      <h2 id="connection-settings">
        Step 1 - Setup the connection
        settings
      </h2>
      <ol>
        <li>
          Open the
          <router-link to="/settings"
            >Settings tab</router-link
          >
        </li>
        <li>
          Hit the
          <b>Use stock</b> button to
          fill in the fields with the
          default values
          <a
            href="https://player.gvideo.co/videos/2675_ObnkJ3guoc6f8bLa"
            target="_blank"
            >watch here</a
          >
        </li>
      </ol>
    </section>
    <section>
      <h2 id="streaming-browser">
        Step 2 - Start streaming with
        your browser
      </h2>
      <ol>
        <li>
          Open the
          <router-link to="/host"
            >Host tab</router-link
          >
        </li>
        <li>
          Check the camera, select a
          device from the dropdown
        </li>
        <li>
          Optionally, check and select
          the microphone
        </li>
        <li>
          Click the <b>Join</b> button
        </li>
        <li>
          Wait a second or two until it
          completes.
        </li>
        <li>
          It'll show the private
          video-call UI with empty black
          video placeholder in the
          middle and your own video
          preview in the bottom right
          <a
            href="https://player.gvideo.co/videos/2675_zQc3pJn1taeegmBC"
            target="_blank"
            >watch here</a
          >
        </li>
        <li>
          Alternatively, you can stream
          with <b>OBS Studio</b> (<a
            href="#obs"
            >see below</a
          >) or any other tool
          supporting
          <b>WHIP</b> protocol.<br />
          Read more
          <a
            href="https://webrtchacks.com/webrtc-cracks-the-whip-on-obs/"
            target="_blank"
            >here</a
          >
          and
          <a
            href="https://developers.cloudflare.com/stream/webrtc-beta/"
            target="_blank"
            >here</a
          >
        </li>
      </ol>
    </section>
    <section>
      <h2 id="streaming-playback">
        Step 3 - Check the playback
      </h2>
      <ol>
        <li>
          Open the
          <router-link to="/player"
            >Player tab</router-link
          >
        </li>
        <li>
          If the player preview says
          <i>No active streams found</i
          >, click the
          <b>Open in new tab</b> below
          the preview. It'll take you to
          a separate tab with a video
          player on it. There, wait
          until the the video gets
          loaded - the "No active
          streams found" will disappear
          showing the play button
          instead, which you can click
          to start playing the video
        </li>
        <li>
          You can embed this video
          player in an <i>iframe</i> on
          your own webpage
        </li>
      </ol>
    </section>
    <section>
      <h2 id="as-guest">
        Step 4 - Join as a guest to the
        private room
      </h2>
      <ol>
        <li>
          Open the demo webapp in
          another browser tab,
          preferably in
          <b>incognito mode</b>, or,
          better yet, in a different
          browser
        </li>
        <li>
          Load the
          <b>stock</b> parameters on the
          <router-link to="/settings"
            >Settings tab</router-link
          >
        </li>
        <li>
          Open the
          <router-link to="/guest"
            >Guest tab</router-link
          >, turn on you camera, and
          <b>join</b> the room
        </li>
        <li>
          You
          <a
            href="https://player.gvideo.co/videos/2675_h5m3Oj5m7bFvhTr"
            target="_blank"
            >should see</a
          >
          the Host video from the first
          tab's camera
        </li>
        <li>
          In the first browser on the
          Host tab you should now be
          able to see the second tab's
          video as well
        </li>
      </ol>
    </section>
    <ObsStudio>
      <template #heading>
        <h2 id="obs">
          Streaming with OBS Studio
        </h2>
      </template>
      <template #stream-settings>
        Copy the
        <b>WHEP endpoint</b> field from
        the
        <router-link to="/settings"
          >settings</router-link
        >
        that you've set on the
        <a href="#init-settings"
          >Step 1</a
        >.<br />
        Paste it in the
        <b>Server</b> field leaving the
        <b>Bearer Token</b> field
        blank.<br />
      </template>
    </ObsStudio>
    <div class="logos">
      <img alt="H.264" src="@/assets/h264-logo.svg" />
      <img alt="OPUS" src="@/assets/opus-logo.svg" />
    </div>
  </main>
</template>

<script setup lang="ts">
import ObsStudio from '@/components/ObsStudio.vue'
</script>

<style scoped>
form {
  padding: 1rem 0;
}
form .block {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
form .block label {
  flex: 150px 0 0;
  font-weight: 600;
}
form .block input,
form .block textarea {
  width: 300px;
  max-width: auto;
}
section {
  margin-bottom: 2rem;
}
section h2 {
  margin-bottom: 1rem;
}
.logos {
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: space-evenly;
  max-width: 600px;
  margin: 4rem auto 0;
}
.logos img {
  height: 6vh;
  min-height: 50px;
}
@media (min-width: 1024px) {
  .logos img {
    height: 8vh;
  }
}
@media (max-width: 420px) {
  form .block_field {
    flex-direction: column;
    gap: 0.25rem;
  }
  .block_buttons label {
    display: none;
  }
  form .block label {
    flex-basis: auto;
  }
}
</style>
