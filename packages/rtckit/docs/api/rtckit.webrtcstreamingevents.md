<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@gcorevideo/rtckit](./rtckit.md) &gt; [WebrtcStreamingEvents](./rtckit.webrtcstreamingevents.md)

## WebrtcStreamingEvents enum

**Signature:**

```typescript
export declare enum WebrtcStreamingEvents 
```

## Enumeration Members

<table><thead><tr><th>

Member


</th><th>

Value


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

MediaDeviceSelect


</td><td>

`"mdselect"`


</td><td>


</td></tr>
<tr><td>

MediaDeviceSwitch


</td><td>

`"mdswitch"`


</td><td>


</td></tr>
<tr><td>

MediaDeviceSwitchOff


</td><td>

`"mdswitchoff"`


</td><td>


</td></tr>
</tbody></table>

## Remarks

- `MediaDeviceSwitch` - selected input media device has been switched to another one after being disconnected. Payload: [MediaDeviceSwitchInfo](./rtckit.mediadeviceswitchinfo.md)

- `MediaDeviceSwitchOff` - selected input media device has been disconnected and it was not possible to switch to another one. Payload: [MediaDeviceSwitchOffInfo](./rtckit.mediadeviceswitchoffinfo.md)

- `MediaDeviceSelect` - a new media input device has been selected [MediaDeviceSelectInfo](./rtckit.mediadeviceselectinfo.md)
