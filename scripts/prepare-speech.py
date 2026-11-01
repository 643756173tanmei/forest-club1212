from pathlib import Path
from faster_whisper import WhisperModel
root=Path(__file__).resolve().parent.parent
WhisperModel('base.en',device='cpu',compute_type='int8',download_root=str(root/'.local/models'))
(root/'.local/speech-ready').write_text('base.en')
print('Local speech model ready')
