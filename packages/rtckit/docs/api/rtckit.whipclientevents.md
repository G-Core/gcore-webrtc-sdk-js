<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@gcorevideo/rtckit](./rtckit.md) &gt; [WhipClientEvents](./rtckit.whipclientevents.md)

## WhipClientEvents enum

**Signature:**

```typescript
export declare enum WhipClientEvents 
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

Connected


</td><td>

`"connected"`


</td><td>

The client has successfully connected, probabaly after an ICE restart or a full session restart


</td></tr>
<tr><td>

ConnectionFailed


</td><td>

`"connection_failed"`


</td><td>

Initial connect or reconnect has failed after a series of retries


</td></tr>
<tr><td>

Disconnected


</td><td>

`"disconnected"`


</td><td>

The client abruptly disconnected and will try to reconnect


</td></tr>
</tbody></table>

## Example

client.on(WhipClientEvents.Dicsonnected, () =<!-- -->&gt; showError(\_\_('Reconnecting...')));
