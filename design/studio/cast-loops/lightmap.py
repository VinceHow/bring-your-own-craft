# Night: a colour matrix plus a soft multiply light map per patch (the lamp pool varies across a patch).
# The matrix is boosted by s so the map stays in 0..1 (CSS multiply can only darken).
import json, numpy as np, cv2
L = '/tmp/claude-0/-home-user-bring-your-own-craft/080242d8-4a67-5906-ba7d-9f220a1fc1f5/scratchpad/living'
O = '/home/user/bring-your-own-craft/public/looks/cast/living'
C = json.load(open(f'{L}/cast2.json')); LIGHT = json.load(open(f'{O}/light.json'))
k = 2752 / 1600; N = 256
A = cv2.imread(f'{L}/afternoon.png').astype(np.float32)[..., ::-1] / 255
for t in ['night', 'evening']:
    T = cv2.imread(f'{L}/{t}.png').astype(np.float32)[..., ::-1] / 255
    for who, c in C.items():
        b = (round(c['x'] * k), round(c['y'] * k), round((c['x'] + c['size']) * k), round((c['y'] + c['size']) * k))
        a = cv2.resize(A[b[1]:b[3], b[0]:b[2]], (N, N), interpolation=cv2.INTER_AREA)
        tt = cv2.resize(T[b[1]:b[3], b[0]:b[2]], (N, N), interpolation=cv2.INTER_AREA)
        m = np.array(LIGHT[t][who]).reshape(3, 5)
        P = np.clip(a @ m[:, :3].T + m[:, 4], 0.02, 1)
        sig = N * .07
        G = cv2.GaussianBlur(tt, (0, 0), sig) / np.maximum(cv2.GaussianBlur(P, (0, 0), sig), .02)
        G = np.clip(G, 0, 2.2)
        w = cv2.resize(cv2.imread(f'{O}/mask-{who}.png', cv2.IMREAD_UNCHANGED)[..., 3], (N, N)).astype(np.float32) / 255
        err = lambda o: (np.abs(o - tt).mean(2) * w).sum() / w.sum() * 255
        before = err(P)
        best = (before, 1.0, np.ones_like(G))                  # fallback: matrix only (map all white)
        for s in [1.0, float(max(1.0, np.percentile(G, 90))), float(max(1.0, np.percentile(G, 99.5)))]:
            Gm = np.clip(G / s, 0, 1)
            o = np.clip(np.clip(a @ (m[:, :3] * s).T + m[:, 4] * s, 0, 1) * Gm, 0, 1)
            if err(o) < best[0]: best = (err(o), s, Gm)
        after, s, Gm = best
        m2 = m.copy(); m2[:, :3] *= s; m2[:, 4] *= s
        LIGHT[t][who] = [round(float(v), 4) for v in m2.reshape(-1)]
        cv2.imwrite(f'{O}/lightmap-{who}-{t}.png', (Gm[..., ::-1] * 255).astype(np.uint8))
        print(t, who, 'matrix only', round(before, 1), '-> with map', round(after, 1), 's', round(s, 2))
json.dump(LIGHT, open(f'{O}/light.json', 'w'))
