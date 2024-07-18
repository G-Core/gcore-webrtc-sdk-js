<script setup lang="ts">
import obsSceneImg from '@/assets/img/obs-scene.jpg'
import obsSettingsImg from '@/assets/img/obs-whip-settings.jpg'
import obsStreamFailureImg from '@/assets/img/obs-stream-failure.jpg'
import obsStudioOutputSettingsImg from '@/assets/img/obs-advanced-output-settings2.jpg'
</script>

<template>
  <main>
    <h2>OBS Studio</h2>
    <p>0. <a href="https://obsproject.com/download" target="_blank">Download the latest version here</a> if you don't have one.
    Install all the recent updates.</p>
    <p>1. Setup a scene: attach a web camera and add it as a media source to the scene.</p>
    <figure>
      <a :href="obsSceneImg"><img :src="obsSceneImg" alt="OBS Studio Scene" width="300" /></a>
    </figure>
    <p>2. Open <b>Settings/Stream</b> and select <b>WHIP</b> in the <b>Service</b> dropdown.<br/>
        Then insert the <i>broadcast URL</i> in the <b>Server</b> field leaving the <b>Bearer Token</b>  field blank.<br/>
        Click the <b>OK</b> button.
    </p>
    <figure>
      <a :href="obsSettingsImg"><img :src="obsSettingsImg" alt="OBS Studio Stream Settings" width="300" /></a>
    </figure>
    <p>3. Click the <b>Start Streaming</b> on the main panel.<br/>
        <b>Should there be an error message</b>, like the one on the screen below, 
        check the <i>broadcast URL</i> and try again (if the problem persists, contact our technical support).
    </p>
    <figure>
      <a :href="obsStreamFailureImg">
        <img :src="obsStreamFailureImg" alt="OBS Studio - could not access the specified channel or stream key" width="300" />
      </a>
    </figure>
    <p>4. There you have it! Now open a WHEP player and try to join the broadcast using the <i>playback URL</i> of the broadcast.</p>
    <p>5. If you observe a big lag in the playback, try tuning the encoder settings.<br>
      Open <b>Settings/Output</b>, then select <b>Advanced</b> <b>Output Mode</b>.<br>
      In the <b>Streaming settings</b> below, open the <b>Video Encoder</b> dropdown and try to find a hardware encoder there,
      like shown on the screen shot.
      In the <b>Encoder Settings</b> set the <b>Keyframe Interval</b> = <code>0</code>,<br>
      <b>CPU Usage Preset</b> = <code>ultrafast</code>,<br>
      <b>Profile</b> = <code>baseline</code>,<br>
      <b>Tune</b> = <code>zerolatency</code>,<br>
      as show on the screen shot below.<br>
      Try playing with other options as well (e.g., selecting different encoder) to find the best settings for your device.
    </p>
    <figure>
      <a :href="obsStudioOutputSettingsImg">
        <img :src="obsStudioOutputSettingsImg" alt="OBS Studio Output Settings" width="300" />
      </a>
    </figure>

  </main>
</template>

<style scoped>
@media (min-width: 1024px) {
  main {
    max-height: 100vh;
    overflow-y: auto;
  }
}
figure a {
  display: inline-block;
  padding: 0;
}
figure {
  margin: 1rem 1rem 1rem 0;
}
</style>