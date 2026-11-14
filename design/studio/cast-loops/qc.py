# QC for patch clips: seam vs rest frame, camera drift on the still background, motion reaching the crop edge, frame strip.
import sys, json, subprocess, numpy as np, cv2
L = '/tmp/claude-0/-home-user-bring-your-own-craft/080242d8-4a67-5906-ba7d-9f220a1fc1f5/scratchpad/living'
C = json.load(open(f'{L}/cast2.json'))
BODY = {'mika': (220, 315, 112, 170), 'noor': (180, 250, 105, 115), 'theo': (172, 220, 72, 95),
        'ines': (180, 260, 118, 128), 'bo': (230, 260, 128, 135),
        'record': (135, 135, 120, 100), 'cat': (165, 165, 110, 80), 'coffee': (110, 140, 110, 120)}
N = 480
def frames(p):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-vf', f'scale={N}:{N}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, N, N, 3)
out = []
for name in sys.argv[1:]:
    who = name.split('-')[0]
    F = frames(f'{L}/clips/{name}.mp4')
    R = cv2.resize(cv2.imread(f'{L}/crops2/{who}.png'), (N, N), interpolation=cv2.INTER_AREA)
    s = C[who]['size']; k = N / s
    cx, cy, rx, ry = [v * k for v in BODY[who]]
    bg = np.full((N, N), 255, np.uint8)
    cv2.ellipse(bg, (int(cx), int(cy - ry * .25)), (int(rx * 1.5), int(ry * 1.6)), 0, 0, 360, 0, -1)   # exclude the character and its gestures
    Rg = cv2.cvtColor(R, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    d = np.abs(F.astype(np.int16) - R.astype(np.int16)).mean(axis=3)           # per-frame, per-pixel
    first, last = float(d[0].mean()), float(d[-1].mean())
    drift_bg = float(max(d[i][bg > 0].mean() for i in range(0, len(F), 5)))
    # camera: affine of a few frames vs rest on the background only
    cam = 0.0
    for i in range(0, len(F), 15):
        g = cv2.cvtColor(F[i], cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        w = np.eye(2, 3, dtype=np.float32)
        try:
            _, w = cv2.findTransformECC(Rg, g, w, cv2.MOTION_AFFINE, (3, 100, 1e-5), bg, 5)
            sc = abs(np.sqrt(abs(np.linalg.det(w[:, :2]))) - 1) * N; cam = max(cam, float(sc) + float(np.hypot(*w[:, 2])))
        except cv2.error: cam = max(cam, 99)
    # motion: where the clip differs from rest by a lot at some point
    mot = (cv2.GaussianBlur(d.max(axis=0).astype(np.float32), (9, 9), 0) > 28).astype(np.uint8)
    e = int(N * .035); edge = np.zeros_like(mot); edge[:e] = edge[-e:] = 1; edge[:, :e] = edge[:, -e:] = 1
    edge_px = int((mot & edge).sum())
    outside = int((mot & (bg > 0)).sum())                                         # moving pixels outside own region (neighbours, props)
    jump = float(np.abs(F[-1].astype(np.int16) - F[0].astype(np.int16)).mean())
    step = np.abs(np.diff(F.astype(np.int16), axis=0)).mean(axis=(1, 2, 3)); maxstep = float(step.max())
    np.save(f'{L}/clips/{name}.motion.npy', mot)
    # strip
    idx = [0, 20, 45, 70, 95, 120, 149]
    strip = np.hstack([cv2.resize(F[i], (180, 180)) for i in idx])
    cv2.imwrite(f'{L}/clips/{name}.strip.jpg', strip, [cv2.IMWRITE_JPEG_QUALITY, 82])
    flag = []
    if last > 9 or first > 9: flag.append('seam')
    if cam > 6: flag.append('camera')
    if drift_bg > 12: flag.append('bg-drift')
    if edge_px > 30: flag.append('edge')
    if outside > 900: flag.append('outside')
    r = dict(name=name, first=round(first, 1), last=round(last, 1), jump=round(jump, 1), cam_px=round(cam, 1), bg=round(drift_bg, 1),
             edge_px=edge_px, outside_px=outside, maxstep=round(maxstep, 1), flags=flag)
    out.append(r); print(json.dumps(r))
