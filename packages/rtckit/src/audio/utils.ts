export function checkSetAudioSinkId(audioElem: HTMLMediaElement): boolean {
  return (
    typeof (audioElem as unknown as Record<string, unknown>).sinkId ===
      "string" &&
    typeof (audioElem as unknown as Record<string, unknown>).setSinkId ===
      "function"
  );
}
