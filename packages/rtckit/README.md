# Gcore WebRTC SDK

Gcore real-time streaming platform is a cloud [SFU](https://bloggeek.me/webrtcglossary/sfu/) for WebRTC.

## Quick start

A very basic example.
We will use Vue.js 3.

```
<template>
<main class="room-container room">
    <div class="peers-container">
        <div
            class="peer-card peer-card_self"
            :class="{'peer-card_joined': joined}"
            v-if="room && !room.me.hidden"
        >
            <video ref="selfVideo" autoplay playsinline :hidden="!cameraOn"></video>
            <div class="peer-card__name" v-if="room">
            {{ room.me.displayName }}
            (you)
            </div>
        </div>
        <div v-for="peer of visiblePeers" :key="peer.id" ref="peerCards" class="peer-card">
            <video :hidden="!peersWithVideo.has(peer.id)" autoplay playsinline />
            <div class="peer-card__name">
            {{ peer.displayName }}
            </div>
        </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";

import { computed, onMounted, ref, watch } from "vue";

import { RoomClient } from "@gcorevideo/rtckit";

// Your hostname or just use "meet.gcorelabs.com" for testing
const CLIENT_HOSTNAME = "first.video.international";
const ROOM_ID = "live0123";";

const cameraOn = ref(false);
const myName = ref("Alice");
const peers = ref([]);
const peerCards = ref([]);
const peersWithVideo = ref(new Set());
const readyToJoin = ref(false);
const selfVideo = ref();

const visiblePeers = computed(() => {
  return peers.value.filter((peer) => !peer.hidden);
});

let room;
let mediaStream = null;
let rtcStream;

onMounted(async () => {
  const client = new RoomClient({
    clientHost: CLIENT_HOSTNAME,
  })
  room = await client.connect(ROOM_ID);

  room.me.setName(myName.value);

  room.on("ready", () => {
    console.log("room ready to join");
    startCamera();
    room.join();
  });

  room.peers.on("newpeer", (peer) => {
    console.log("new peer", peer.id);
    if (!findPeer(peer.id)) {
      addPeer(peer);
    }
  });

  room.peers.on("peerleft", (id) => {
    console.log("peer left", id);
    removePeer(id);
  });
});

// Start streaming the video from own camera
async function startCamera() {
  console.log("startCamera");

  cameraOn.value = true;

  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
  }

  rtcStream = await room.me.sendVideo(mediaStream.getVideoTracks()[0], {
    disableTrackOnPause: true,
  });

  if (selfVideo.value) {
    selfVideo.value.srcObject = mediaStream;
    selfVideo.value.play();
  }
}

// Add peer card to the view
function addPeer(peer) {
  peers.value.push(peer);
  peer.on("stream", ({ label, track }) => {
    console.log("peer stream available peerId:%s label:%s", peer.id, label);
    if (label !== "video") {
      return;
    }
    showPeerVideo(peer.id, track);
  });
  peer.on("nostream", ({ label }) => {
    console.log("peer stream unavailable peerId:%s label:%s", peer.id, label);
    if (label !== "video") {
      return;
    }
    hidePeerVideo(peer.id);
  });
  peer.on("left", () => removePeer(peer.id));
}

// Show video on peer's card
function showPeerVideo(peerId, track) {
  console.log("setPeerVideo peerId:%s", peerId);
  const index = peers.value.findIndex((peer) => peer.id === peerId);
  const videoElem = peerCards.value[index].querySelector("video");
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

function removePeer(peerId) {
  console.log("removePeer peerId:%s", peerId);
  hidePeerVideo(peerId);
  const index = peers.value.findIndex((peer) => peer.id === peerId);
  peers.value.splice(index, 1);
}

function hidePeerVideo(peerId) {
  console.log("hidePeerVideo peerId:%s", peerId);
  const index = peers.value.findIndex((peer) => peer.id === peerId);
  peersWithVideo.value.delete(peerId);
  const videoElem = peerCards.value[index].querySelector("video");
  stopPeerVideo(videoElem);
}
</script>
```

Full example is in the [apps/basic].
[Code sandbox](https://codesandbox.io/p/sandbox/jolly-matan-jc858j)

More elaborated usage example can be found in [apps/gvcdemo]

## API

### Terminology
- **Session** - a process or activity of exchanging streaming media (video, audio) in real-time (meaning sub-second latency and tolerance to occasional losses of playback quality) within a bounded context (a conference room or webinar translation, etc). Session access is protected by _session tokens_
- **Session token** - a cryptographically signed piece of data, by which a media server authenticates. Token bears all the required information about the user and the session in its payload
- **Peer** - a WebRTC client endpoint of the streamin service, a user's web browser or other WebRTC-capable device. Peers are subject to the media access permissions within a session
- **Stream** - a basic unit of media content produced by a peer and transmitted within a session to everybody (who wishes to receive it). Streaming content is encoded with an appropriate codec and sent over RTP to the media server where it is relayed to every other peer. Each stream has a _media label_ denoting its content type
- **Media label** - a steaming content type. It is used to manage peers media restrictions within a session. Standard labels: `audio`, `video`, `share`
- **Media permission** - permission for a peer to stream a particular media type (described by a media label) within a session
- **Media server** - an SFU host serving particular session. This is where a peer connects initially. Some sessions might be served by many geographically distributed hosts, which allows for improved streaming quality and overall UX for sessions with participants in different geographical regions
- **Signaling connection** - an implementation of Gcore RTC signaling protocol to join and control the session. Typically, a websocket connection.
- **Signaling protocol** - a protocol of peer-to-server communication to control the session. It consist of
  + basic-level interface for regular peer to carry out the operations related to the peer (join/leave the session, send/stop/pause/resume stream, etc),
  + privileged interface which allows to control the overall session (set up media permissions, forcefully disconnect a peer or end a session, etc)

### Client keys and tokens

Client tokens are used to restrict access to a media session for users depending on possession of a token.
A client token can encode media access permissions as well as higher application level roles or arbitrary attributes.
Client tokens are JWTs signed with a client's key.
Client token attributes:
_TODO_

### Session tokens

Session token is what is used to authenticate a user (peer) connection to a media server.
Session tokens are issued by the API backend and carry all the necessary information about the session and the
user connecting to it.
Some attributes of a session tokens can be controlled with a client token.
This way you can, for example, provide a client token with stream producing rights to a dedicated user, while letting
everybody else only consume the streams.

### ApiClient

This is a client for Gcore real-time streaming [API](https://api.gcore.com/docs/streaming).
It allows you, among other things, to initiate a session.
You will need a client account to access the API. For testing purposes it should be sufficient to use the demo account.
See the detailed API description here _TODO_

#### Usage
```
import { ApiClient } from "@gcorevideo/rtckit"

const apiClient = new ApiClient({
    clientKey: "XXX",
    clientHost: "a0eb.gvideo.co"
})

apiClient.initSession({
    peerId: "peer1"
    roomId: "welcome",
}).then((sessionInfo) => {
    console.log("Session info", sessionInfo)
}, (e) => {
    console.error("Init session failed", e)
})
```

**TODO** API method link

### RTC client

This is the main interface for controlling a running session.
It is created by
- first initiating a session via the API (see above)
- then creating a signaling connection
- finally instantiating the RTC client

```
...
const sessionInfo = await apiClient.initSession(...)
const conn = new SocketConnection(sessionInfo.server, sessionInfo.token)
const rtcClient = new RtcClient(conn)
...
```

After that you can [send](#rtc-client-send-stream) and [receive](#rtc-client-receive-stream) media streams within the session.


## Project
[Maintenance and contribution](./docs/project.md)

## Architecture

