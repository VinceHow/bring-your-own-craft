# Fit a colour matrix per teammate and time of day: afternoon patch pixels -> the same pixels in that time's painting.
import json, os, numpy as np
from PIL import Image
L = '/tmp/claude-0/-home-user-bring-your-own-craft/080242d8-4a67-5906-ba7d-9f220a1fc1f5/scratchpad/living'
O = '/home/user/bring-your-own-craft/public/looks/cast/living'
C = json.load(open(f'{L}/cast2.json')); k = 2752 / 1600
A = Image.open(f'{L}/afternoon.png').convert('RGB')
out = {}
for t in ['morning', 'building', 'evening', 'night']:
    T = Image.open(f'{L}/{t}.png').convert('RGB'); out[t] = {}
    for who, c in C.items():
        box = (round(c['x'] * k), round(c['y'] * k), round((c['x'] + c['size']) * k), round((c['y'] + c['size']) * k))
        a = np.asarray(A.crop(box).resize((256, 256))).reshape(-1, 3) / 255
        b = np.asarray(T.crop(box).resize((256, 256))).reshape(-1, 3) / 255
        mf = f'{O}/mask-{who}-night.png' if (t == 'night' and os.path.exists(f'{O}/mask-{who}-night.png')) else f'{O}/mask-{who}.png'
        w = np.asarray(Image.open(mf).getchannel('A').resize((256, 256))).reshape(-1) / 255   # lampcut: night masks leave the lamp out
        X = np.hstack([a, np.ones((len(a), 1))]) * np.sqrt(w)[:, None]
        M = np.linalg.lstsq(X, b * np.sqrt(w)[:, None], rcond=None)[0].T   # 3 x 4
        pred = np.clip(np.hstack([a, np.ones((len(a), 1))]) @ M.T, 0, 1)
        err0 = (np.abs(a - b).mean(1) * w).sum() / w.sum() * 255; err1 = (np.abs(pred - b).mean(1) * w).sum() / w.sum() * 255
        print(t, who, 'error before', round(err0, 1), 'after', round(err1, 1))
        rows = [[*M[i, :3], 0.0, M[i, 3]] for i in range(3)]
        out[t][who] = [round(float(v), 4) for r in rows for v in r]
json.dump(out, open(f'{O}/light.json', 'w'))
