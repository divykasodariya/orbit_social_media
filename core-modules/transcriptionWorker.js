import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import Groq from "groq-sdk";

const execAsync = promisify(exec);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function extractAndTranscribe(videoFilePath, outputAudioPath) {
  await execAsync(`ffmpeg -y -i "${videoFilePath}" -vn -acodec libmp3lame -ar 16000 -ac 1 "${outputAudioPath}"`);

  const fileStream = fs.createReadStream(outputAudioPath);

  const transcription = await groq.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-large-v3",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  if (fs.existsSync(outputAudioPath)) {
    fs.unlinkSync(outputAudioPath);
  }

  return {
    text: transcription.text,
    segments: (transcription.segments || []).map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    })),
  };
}
