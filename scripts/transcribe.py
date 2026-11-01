import sys,json
from pathlib import Path
from faster_whisper import WhisperModel
import av
import numpy as np
root=Path(__file__).resolve().parent.parent
model=WhisperModel('base.en',device='cpu',compute_type='int8',download_root=str(root/'.local/models'),local_files_only=True)
# Decode explicitly for compatibility with the installed PyAV version.
resampler=av.AudioResampler(format='s16',layout='mono',rate=16000)
chunks=[]
with av.open(sys.argv[1],mode='r') as container:
    for frame in container.decode(audio=0):
        frame.pts=None
        chunks.extend(f.to_ndarray().flatten() for f in resampler.resample(frame))
    chunks.extend(f.to_ndarray().flatten() for f in resampler.resample(None))
audio=np.concatenate(chunks).astype(np.float32)/32768.0 if chunks else np.zeros(0,dtype=np.float32)
if not audio.size:
    print(json.dumps({'text':'','reason':'no_audio'}))
    sys.exit(0)
# Reject silence before decoding; normalize quiet microphones without amplifying silence.
peak=float(np.max(np.abs(audio)))
rms=float(np.sqrt(np.mean(audio**2)))
if peak<0.003 or rms<0.0005:
    print(json.dumps({'text':'','reason':'quiet_audio','peak':round(peak,5),'rms':round(rms,5)}))
    sys.exit(0)
if peak<0.5:
    audio=audio*min(0.8/peak,10.0)
def recognize(vad):
    segments,_=model.transcribe(audio,language='en',beam_size=5,vad_filter=vad,
        vad_parameters={'threshold':0.3,'min_speech_duration_ms':100,'speech_pad_ms':300} if vad else None,
        condition_on_previous_text=False)
    return ' '.join(s.text.strip() for s in segments if s.no_speech_prob<0.8).strip()
text=recognize(True)
# Very short child answers may be removed by VAD; retry the actual recording.
if not text:
    text=recognize(False)
print(json.dumps({'text':text,'reason':None if text else 'unclear_speech','duration':round(len(audio)/16000,2)}))
