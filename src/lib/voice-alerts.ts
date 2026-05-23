const STORAGE_KEY = "crowdsphere-voice-alerts";

let enabled =
  typeof window !== "undefined"
    ? localStorage.getItem(STORAGE_KEY) !== "0"
    : true;

const queue: string[] = [];
let speaking = false;

export function isVoiceAlertsEnabled(): boolean {
  return enabled;
}

export function setVoiceAlertsEnabled(value: boolean): void {
  enabled = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }
  if (!value) {
    cancelSpeech();
  }
}

export function speakAlert(text: string): void {
  if (!enabled || typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  queue.push(text.trim());
  drainQueue(synth);
}

export function cancelSpeech(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  queue.length = 0;
  speaking = false;
}

function drainQueue(synth: SpeechSynthesis): void {
  if (speaking || queue.length === 0) return;

  const text = queue.shift()!;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = synth.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;

  speaking = true;
  utterance.onend = () => {
    speaking = false;
    drainQueue(synth);
  };
  utterance.onerror = () => {
    speaking = false;
    drainQueue(synth);
  };

  synth.speak(utterance);
}

/** Prime voices on first user interaction (browser requirement). */
export function primeVoiceAlerts(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}
