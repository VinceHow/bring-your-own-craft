import sys, glob, json, subprocess, os, numpy as np
from PIL import Image
W = sys.argv[1]; d = 'sync-' + W; g = json.load(open(d + '/regions.json')); vid = glob.glob(d + '/*.webm')[0]
os.makedirs(d + '/f', exist_ok=True); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '6', '-i', vid, '-vf', 'fps=10', d + '/f/%03d.png'], check=True)
fs = sorted(glob.glob(d + '/f/*.png')); ims = [np.asarray(Image.open(f).convert('RGB')).astype(float) for f in fs]
box = lambda im, b: im[b[1]:b[1]+b[3], b[0]:b[0]+b[2]].reshape(-1, 3).mean(0)
pv = [box(i, g['P']) for i in ims]; rv = [box(i, g['R']) for i in ims]
rd = [np.abs(rv[i] - rv[i-1]).sum() for i in range(1, len(rv))]
half = len(ims) // 2
for name, (a0, a1) in (('day->night', (0, half)), ('night->day', (half, len(ims)))):
    idx = [i for i in range(max(a0, 1), a1) if rd[i-1] > 3]
    if not idx: print(W, name, 'no transition found'); continue
    s, e = max(idx[0] - 2, a0), min(idx[-1] + 3, a1 - 1)
    def prog(v):
        a, z = v[s], v[e]; dd = z - a; n = np.dot(dd, dd) or 1; return [float(np.dot(v[i] - a, dd) / n) for i in range(s, e + 1)]
    pp, rp = prog(pv), prog(rv); gaps = [abs(a - b) for a, b in zip(pp, rp)]
    print(f'{W} {name}: patch ' + ' '.join('%.2f' % x for x in pp)); print(f'{" " * len(W)} {" " * len(name)}  room  ' + ' '.join('%.2f' % x for x in rp)); print(f'  worst-frame gap {max(gaps):.2f}')
    k = s + int(np.argmax(gaps)); c = g['crop']
    Image.open(fs[k]).crop((c[0], c[1], c[0] + c[2], c[1] + c[3])).save(f'/home/user/bring-your-own-craft/design/studio/shots/living-times/sync-worst-{name.replace(">", "")}-{W}.jpg', quality=88)
