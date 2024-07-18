<script setup>
import { computed, onMounted, ref, watch } from "vue";

import {
  Logger,
  setTracer,
  LogTracer,
  RoomClient,
} from "@gcorevideo/rtckit";

setTracer(new LogTracer());

const NAMES = [
  "Alice", "Bob", "Charlie", "David",
  "Eve", "Frank", "Grace", "Hank",
  "Ivy", "Jack", "Karl", "Lily",
  "Mia", "Nina", "Oscar", "Penny",
  "Quinn", "Ruth", "Sam", "Tom",
  "Uma", "Vera", "Will", "Xander",
  "Yara", "Zoe"
];

const CLIENT_KEY = "";
const CLIENT_HOSTNAME = "meet.gcorelabs.com";
const ROOM_ID = "live0123";

const cameraOn = ref(false);
const readyToJoin = ref(false);
const joined = ref(false);
const myName = ref(NAMES[Math.floor(Math.random() * NAMES.length)]);
const peers = ref([]);
const peerCards = ref([]);
const selfVideo = ref();
const peersWithVideo = ref(new Set());
const finished = ref(false);

const logger = new Logger("app-basic");

const visiblePeers = computed(() => {
  return peers.value.filter((peer) => !peer.hidden);
});

let room;
let mediaStream = null;
let videoStream;

onMounted(async () => {
  const client = new RoomClient({
    apiHost: "https://01-api.dev.meet.gvideo.co",
    clientHost: CLIENT_HOSTNAME,
    clientKey: CLIENT_KEY,
  })
  room = await client.connect(ROOM_ID);

  room.on("closed", () => {
    console.log("finished");
    finished.value = true;
  })

  room.me.setName(myName.value);

  room.on("connected", () => {
    logger.debug("room connected")
  });

  room.on("ready", () => {
    logger.debug("room ready to join")
    readyToJoin.value = true;
  });

  room.peers.on("newpeer", (peer) => {
    console.log("new peer", peer.id);
    if (!findPeer(peer.id)) {
      addPeer(peer);
    }
  });

  room.peers.on("peerjoined", ({id}) => {
    logger.debug("peer joined", id);
  });

  room.peers.on("peerleft", (id) => {
    logger.debug("peer left", id);
    removePeer(id);
  });

  room.peers.on("reset", () => {
    logger.debug("peers reset");
    peers.value = [];
  });

  room.on("joined", () => {
    joined.value = true;
  });
});

watch(readyToJoin, (value) => {
  if (value) {
    startCamera();
    room.join(true);
  }
});

function removePeer(id) {
  console.log("removePeer peerId:%s", id);
  hidePeerVideo(id);
  const index = peers.value.findIndex((peer) => peer.id === id);
  if (index >= 0) {
    peers.value.splice(index, 1);
  }
}

function hidePeerVideo(peerId) {
  console.log("hidePeerVideo peerId:%s", peerId);
  const index = peers.value.findIndex((peer) => peer.id === peerId);
  if (index < 0) {
    return;
  }
  peersWithVideo.value.delete(peerId);
  const videoElem = peerCards.value[index].querySelector("video");
  if (videoElem) {
    stopPeerVideo(videoElem);
  }
}

function stopPeerVideo(videoElem) {
  const srcObject = videoElem.srcObject;
  if (srcObject) {
    videoElem.pause();
    srcObject.getTracks().forEach((track) => {
      srcObject.removeTrack(track);
      track.stop();
    });
  }
}

function showPeerVideo(peerId, track) {
  console.log("showPeerVideo peerId:%s", peerId);
  const index = peers.value.findIndex((peer) => peer.id === peerId);
  if (index < 0) {
    return;
  }
  const videoElem = peerCards.value[index].querySelector("video");
  if (!videoElem) {
    return;
  }
  const newTrack = track.clone();
  const srcObject = videoElem.srcObject;
  if (srcObject) {
    stopPeerVideo(videoElem);
    srcObject.addTrack(newTrack);
  } else {
    const stream = new MediaStream([newTrack]);
    videoElem.srcObject = stream;
  }
  videoElem.play();
  peersWithVideo.value.add(peerId);
}

function leave() {
  if (!room) {
    return;
  }
  room.leave();
  if (videoStream) {
    videoStream.close();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

function join() {
  if (!room) {
    return;
  }
  room.join(true);
}

async function startCamera() {
  console.log("startCamera running:%s", cameraOn.value);
  if (!room) {
    return;
  }
  if (cameraOn.value) {
    return;
  }

  cameraOn.value = true;

  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
  }

  videoStream = await room.me.sendVideo(mediaStream.getVideoTracks()[0], {
    disableTrackOnPause: true,
  });

  if (selfVideo.value) {
    selfVideo.value.srcObject = mediaStream;
    selfVideo.value.play();
  }
}

async function stopCamera() {
  if (!room) {
    return;
  }
  cameraOn.value = false;
  if (videoStream) {
    videoStream.pause();
  }
}

function findPeer(id) {
  return peers.value.find((peer) => peer.id === id);
}

function addPeer(peer) {
  logger.debug("addPeer %s %s", peer.id, peer.displayName);
  peers.value.push(peer);
  peer.on("stream", ({ label, track }) => {
    logger.debug("peer stream available peerId:%s label:%s", peer.id, label);
    if (label !== "video") {
      return;
    }
    showPeerVideo(peer.id, track);
  });
  peer.on("nostream", (label) => {
    logger.debug("peer stream unavailable peerId:%s label:%s", peer.id, label);
    if (label !== "video") {
      return;
    }
    hidePeerVideo(peer.id);
  });
  peer.on("left", () => removePeer(peer.id));
}
</script>

<template>
  <header>
    <h1>Demo call room</h1>
  </header>
  <main class="room-container room">
    <template v-if="!finished">
      <div class="room__summary" v-if="room && joined">
        Peers: {{ peers.length }}
      </div>
      <div class="peers-container">
        <div
          class="peer-card peer-card_self"
          :class="{'peer-card_joined': joined}"
          v-if="room && !room.me.hidden"
        >
          <video ref="selfVideo" autoplay playsinline :hidden="!cameraOn"></video>
          <div class="peer-card__name" v-if="room">
            <span v-if="room.me.role === 'moderator'">👑</span>
            {{ room.me.displayName }}
            (you)
          </div>
        </div>
        <div v-for="peer of visiblePeers" :key="peer.id" ref="peerCards" class="peer-card">
          <video :hidden="!peersWithVideo.has(peer.id)" autoplay playsinline />
          <div class="peer-card__name">
            <span v-if="peer.role === 'moderator'">👑</span>
            {{ peer.displayName }}
          </div>
        </div>
      </div>
      <div class="room__call-controls">
        <button @click="stopCamera" v-if="cameraOn" :disabled="!readyToJoin">Stop camera</button>
        <button @click="startCamera" v-else :disabled="!readyToJoin">Start camera</button>
        <button @click="join" v-if="!joined" :disabled="!readyToJoin">Join</button>
        <button @click="leave" v-else>Leave</button>
      </div>
    </template>
    <template v-else>
      <div class="endscreen">Call ended</div>
    </template>
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
  flex: 0 0 auto;
}

main {
  flex: 1 1 100%;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}

.room-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-between;
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #ccc;
  background-color: #f7f7f7;
}

.peers-container {
  align-self: flex-start;
  display: grid;
  width: 100%;
  min-height: 100%;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.peer-card {
  position: relative;
  background-color: #333;
  min-width: 200px;
  min-height: 150px;
}

.peer-card video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.peer-card_joined .peer-card__name::after {
  content: " ";
  display: inline-block;
  justify-self: flex-end;
  width: 12px;
  height: 12px;
  background-color: #393;
  border-radius: 50%;
}

.peer-card__name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: left;
  font-size: 1.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.peer-card_self video {
  transform: scaleX(-1)
}

.room__call-controls {
  display: flex;
  padding: 1rem;
  align-self: center;
  width: auto;
  background-color: rgba(255, 255, 255, 0.5);
  border: rgba(0, 0, 0, 0.1);
  gap: 1rem;
  margin-top: 2rem;
  justify-content: center;
  align-items: center;
}

.endscreen {
  display: flex;
  align-self: center;
  margin: 2rem 0;
  font-size: 36px;
  flex: 1 1 100%;
  display: flex;
  align-items: center;
}
</style>
