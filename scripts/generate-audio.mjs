// Optional asset regeneration. Node 24 and FFmpeg with the flite filter required.
// No cloud voice service is contacted. Generated audio is checked into the app.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { topics } from '../shared/catalog.ts';

const temp = mkdtempSync(join(tmpdir(), 'mallo-audio-'));
mkdirSync('public/audio', { recursive: true });
try {
  for (const question of topics.flatMap((topic) => topic.questions)) {
    for (const [kind, text] of [['question', question.english], ['answer', question.sample.natural]]) {
      const textFile = join(temp, 'sentence.txt');
      writeFileSync(textFile, text);
      const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `flite=textfile=${textFile}:voice=slt`, '-af', 'apad=pad_dur=0.15', '-ar', '22050', '-codec:a', 'libmp3lame', '-b:a', '64k', `public/audio/${question.id}-${kind}.mp3`], { stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Could not generate ${question.id} ${kind}`);
    }
  }
  console.log('Generated 30 offline question and answer audio files.');
} finally { rmSync(temp, { recursive: true, force: true }); }
