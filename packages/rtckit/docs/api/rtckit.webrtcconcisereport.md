<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@gcorevideo/rtckit](./rtckit.md) &gt; [WebrtcConciseReport](./rtckit.webrtcconcisereport.md)

## WebrtcConciseReport type

> This API is provided as an alpha preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 


**Signature:**

```typescript
export type WebrtcConciseReport = {
    send: {
        streams: Array<WebrtcVideoProducerStreamStats | WebrtcAudioProducerStreamStats>;
        transports: WebrtcTransportStats[];
    };
    recv: {
        streams: Array<WebrtcVideoConsumerStats | WebrtcAudioConsumerStats>;
        transports: WebrtcTransportStats[];
    };
};
```
**References:** [WebrtcVideoProducerStreamStats](./rtckit.webrtcvideoproducerstreamstats.md)<!-- -->, [WebrtcAudioProducerStreamStats](./rtckit.webrtcaudioproducerstreamstats.md)<!-- -->, [WebrtcTransportStats](./rtckit.webrtctransportstats.md)<!-- -->, [WebrtcVideoConsumerStats](./rtckit.webrtcvideoconsumerstats.md)<!-- -->, [WebrtcAudioConsumerStats](./rtckit.webrtcaudioconsumerstats.md)
