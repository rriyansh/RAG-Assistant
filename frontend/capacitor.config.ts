import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rriyansh.ressoagent",
  appName: "Reso Agent",
  webDir: "out",
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    CapacitorUpdater: {
      autoUpdate: "onLaunch",
      keepUrlPathAfterReload: true,
      appReadyTimeout: 10000,
      updateUrl: "https://api.capgo.app/updates",
      statsUrl: "https://api.capgo.app/stats",
      defaultChannel: "production",
      allowModifyUrl: false,
    },
  },
};

export default config;
