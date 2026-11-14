# Per-teammate masks: own motion + own body, limited to own territory (closest body in an ellipse metric),
# soft only on the outside (wood, wall, chair), a hard edge where two teammates meet.
import sys, json, glob, os, numpy as np, cv2
L = '/tmp/claude-0/-home-user-bring-your-own-craft/080242d8-4a67-5906-ba7d-9f220a1fc1f5/scratchpad/living'
O = '/home/user/bring-your-own-craft/public/looks/cast/living'
C = json.load(open(f'{L}/cast2.json'))
BODY = {'mika': (530, 500, 135, 165), 'noor': (680, 415, 95, 100), 'theo': (852, 405, 70, 90),
        'ines': (1035, 390, 118, 125), 'bo': (1185, 535, 150, 135)}   # body plus own props (sketchbook, laptop, map)   # painting px (1600 x 893)
W, H = 1600, 893
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
dist = {w: np.sqrt(((xx - b[0]) / b[2]) ** 2 + ((yy - b[1]) / b[3]) ** 2) for w, b in BODY.items()}
D = np.stack([dist[w] for w in BODY]); owner = D.argmin(0); names = list(BODY)
N = 512
for who in [a for a in sys.argv[1:] if a in BODY]:
    c = C[who]; x, y, s = c['x'], c['y'], c['size']
    terr = (owner == names.index(who)).astype(np.uint8)[y:y + s, x:x + s]
    terr = cv2.resize(terr, (N, N), interpolation=cv2.INTER_NEAREST)
    body = (cv2.resize(dist[who][y:y + s, x:x + s], (N, N)) < 1.12).astype(np.uint8)
    mot = np.zeros((N, N), np.uint8)
    for f in glob.glob(f'{L}/clips/{who}-*.motion.npy'):
        mot |= cv2.resize(np.load(f), (N, N), interpolation=cv2.INTER_NEAREST)
    near = (cv2.resize(dist[who][y:y + s, x:x + s], (N, N)) < 1.6).astype(np.uint8)   # ignore far-off flicker (rug, cat)
    own = ((mot & near) | body) & terr
    own = cv2.morphologyEx(own, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    px = N / s                                              # mask px per painting px
    grow = cv2.dilate(own, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(26 * px) | 1,) * 2))
    soft = cv2.GaussianBlur(grow.astype(np.float32), (0, 0), 7 * px)
    # never feather across a neighbour: clip by the territory with only a 2 px blend
    hard = cv2.GaussianBlur(cv2.erode(terr, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 1.2)
    a = np.clip(soft * 1.25, 0, 1) * hard
    e = np.minimum.reduce([xx[:N, :N], yy[:N, :N], N - 1 - xx[:N, :N], N - 1 - yy[:N, :N]]) / (N * .03)
    a *= np.clip(e, 0, 1)                                   # nothing reaches the crop edge
    rgba = np.zeros((N, N, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = (a * 255).astype(np.uint8)
    cv2.imwrite(f'{O}/mask-{who}.png', rgba)
    print(who, 'coverage', round(float(a.mean()), 3))

# objects: a soft ellipse each (painting px)
OBJ = {'record': (1488, 500, 112, 72), 'cat': (420, 752, 118, 78), 'coffee': (92, 440, 98, 100)}
for who in [a for a in sys.argv[1:] if a in OBJ]:
    c = C[who]; x, y, s = c['x'], c['y'], c['size']; ox, oy, rx, ry = OBJ[who]
    g = np.mgrid[0:N, 0:N].astype(np.float32); py = y + g[0] * s / N; pxx = x + g[1] * s / N
    r = np.sqrt(((pxx - ox) / rx) ** 2 + ((py - oy) / ry) ** 2)
    a = np.clip((1.25 - r) / .35, 0, 1); a = a * a * (3 - 2 * a)
    e = np.minimum.reduce([g[1], g[0], N - 1 - g[1], N - 1 - g[0]]) / (N * .03); a *= np.clip(e, 0, 1)
    rgba = np.zeros((N, N, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = (a * 255).astype(np.uint8)
    cv2.imwrite(f'{O}/mask-{who}.png', rgba); print(who, 'object mask')
