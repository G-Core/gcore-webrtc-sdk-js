<script setup lang="ts">
import pkg from './package.json' with { type: 'json' }
import rtckit from '@gcorevideo/rtckit/package.json' with { type: 'json' }
import rtckitNode from '@gcorevideo/rtckit-node/package.json' with { type: 'json' }

if (typeof window !== 'undefined') {
  console.log(
    '%s %s/rtckit %s %s ',
    pkg.name,
    pkg.version,
    rtckit.version,
    rtckitNode.version,
  )
}
</script>

<template>
  <NuxtPage />
</template>
