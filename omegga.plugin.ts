import OmeggaPlugin, { OL, PS, PC, OmeggaPlayer } from 'omegga';

type Config = { foo: string };
type Storage = { bar: string };

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;

  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }

  private playerFreqs = {};

  async init() {
    // Write your plugin!
    this.omegga.on('cmd:tune', (speaker: string, f: string) => {
      if (!f) { return; }
      let freq = parseInt(f);
      if (Number.isNaN(freq)) {
        this.omegga.whisper(speaker, `Frequency must be a number.`);
        return;
      }

      freq = Math.floor(freq); // NO DECIMALS ! ! !

      if (freq <= 0 || freq > 1000) {
        this.omegga.whisper(speaker, `Invalid frequency, must be 1 - 1000.`);
        return;
      }

      this.playerFreqs[speaker] = freq;
      this.omegga.whisper(speaker, `Tuned to frequency <color="e3dd32">${freq}MHz</>. Use <code>/w [message]</> to speak with it.`);
    });

    this.omegga.on('cmd:w', async (speaker: string, ...message: [string]) => {
      if (!this.playerFreqs.hasOwnProperty(speaker)) {
        this.omegga.whisper(speaker, 'Tune to a frequency using <code>/tune #</> to use your walkie talkie.');
        return;
      }
      if (!message || message.length <= 0) {
        this.omegga.whisper(speaker, 'Please include a message.');
        return;
      }
      const speakerPlayer = this.omegga.getPlayer(speaker);
      const myFreq = this.playerFreqs[speaker];

      let fullMsg = '';
      message.forEach(v => {
        fullMsg += v + ' ';
      });

      const maxRange = 7200; // Change to a config later on

      // Get all players within range and broadcast to them
      const [sX, sY, sZ] = await speakerPlayer.getPosition();

      this.omegga.getPlayers().forEach(async (n) => {
        //if (n.name == speaker) { return; } // Ignore self

        const plr = this.omegga.getPlayer(n.name);
        console.log(`[${this.playerFreqs[speaker]}] ${speaker}: ${fullMsg}`);

        if (this.playerFreqs.hasOwnProperty(n.name) && this.playerFreqs[n.name] == this.playerFreqs[speaker]) {
          const [pX, pY, pZ] = await plr.getPosition();

          const x = sX - pX;
          const y = sY - pY;
          const z = sZ - pZ;
          const res = Math.hypot(x, y, z);

          if (res <= maxRange) {
            this.omegga.whisper(n.name, `[<color="e3dd32">${myFreq}MHz</>] ${speaker}: ${fullMsg}`);
          }
        }
      });
    });

    this.omegga.on('leave', (speaker: OmeggaPlayer) => {
      if (this.playerFreqs.hasOwnProperty(speaker.name)) {
        delete this.playerFreqs[speaker.name];
      }
    });

    return { registeredCommands: ['tune', 'w'] };
  }

  async stop() { } // Dunno if i can just remove this or not so lol
}
