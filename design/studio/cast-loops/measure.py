import sys, subprocess, numpy as np
from PIL import Image
vid, ref, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
raw = subprocess.run(['ffmpeg','-loglevel','error','-i',vid,'-vf',f'scale={W}:{H}','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
fr = np.frombuffer(raw,np.uint8).reshape(-1,H,W,3).astype(np.float32)
r = np.asarray(Image.open(ref).convert('RGB').resize((W,H),Image.LANCZOS)).astype(np.float32)
d = np.abs(fr - r).mean(axis=(1,2,3))
# border ring (outer 12%) = background drift
m = np.zeros((H,W),bool); b=int(W*.12); m[:b]=m[-b:]=True; m[:,:b]=m[:,-b:]=True
db = np.abs(fr - r)[:, m].mean(axis=(1,2))
jump = np.abs(fr[-1]-fr[0]).mean()
print(f"{vid.split('/')[-1]:18s} n={len(fr)} first={d[0]:.1f} last={d[-1]:.1f} max={d.max():.1f}@{d.argmax()} border_max={db.max():.1f} border_mean={db.mean():.1f} loop_jump(last-first)={jump:.1f} mean_frame_step={np.abs(np.diff(fr,axis=0)).mean():.2f}")
