import sys, json, numpy as np
from PIL import Image
regs = json.loads(sys.argv[1]); files = json.loads(sys.argv[2])
def mean(im, r): return im[int(r['y']):int(r['y']+r['h']), int(r['x']):int(r['x']+r['w'])].reshape(-1,3).mean(0)
vals = []
for t, fp, fr in files:
    m = lambda f: np.asarray(Image.open(f).convert('RGB')).astype(float).reshape(-1,3).mean(0)
    vals.append((t, m(fp), m(fr)))
def prog(i):
    a, z = vals[0][i], vals[-1][i]; d = z - a; n = np.dot(d, d) or 1
    return [float(np.dot(v[i] - a, d) / n) for v in vals]
pp, rp = prog(1), prog(2)
gaps = [abs(a - b) for a, b in zip(pp, rp)]
print('  t(ms):   ' + ' '.join('%5d' % v[0] for v in vals))
print('  patch:   ' + ' '.join('%5.2f' % x for x in pp))
print('  room:    ' + ' '.join('%5.2f' % x for x in rp))
print('  max gap patch vs room: %.2f' % max(gaps))
