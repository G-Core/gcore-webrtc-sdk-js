import { reactive } from "vue";

type Store = {
  broadcastAuth: string;
  broadcastUrl: string;
  playbackAuth: string;
  playbackUrl: string;
};

const store = reactive<Store>({
  broadcastAuth: '',
  broadcastUrl: '',
  playbackAuth: '',
  playbackUrl: '',
});

export function useStore() {
  return {
    store
  };
}
