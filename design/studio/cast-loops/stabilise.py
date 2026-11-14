# stabilise a patch clip back onto its rest frame: estimate per-frame scale+shift from the background only
import sys, subprocess, numpy as np, cv2
vid, ref, out, cx, cy, rx, ry = sys.argv[1], sys.argv[2], sys.argv[3], *map(float, sys.argv[4:8])
N=960
raw=subprocess.run(['ffmpeg','-loglevel','error','-i',vid,'-vf',f'scale={N}:{N}','-f','rawvideo','-pix_fmt','bgr24','-'],capture_output=True).stdout
F=np.frombuffer(raw,np.uint8).reshape(-1,N,N,3)
R=cv2.resize(cv2.imread(ref),(N,N),interpolation=cv2.INTER_LANCZOS4)
k=N/400; mask=np.full((N,N),255,np.uint8)
cv2.ellipse(mask,(int(cx*k),int(cy*k)),(int(rx*k*1.15),int(ry*k*1.15)),0,0,360,0,-1)
Rg=cv2.cvtColor(R,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
outv=[]; warp=np.eye(2,3,dtype=np.float32); scales=[]
for i,f in enumerate(F):
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    best=None
    for init in (warp.copy(), np.eye(2,3,dtype=np.float32)):
        try:
            # coarse to fine: solve at quarter size first
            w=init.copy(); w[:,2]/=4
            sm=lambda a: cv2.resize(a,(N//4,N//4),interpolation=cv2.INTER_AREA)
            _,w=cv2.findTransformECC(sm(Rg),sm(g),w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-7),sm(mask),3)
            w[:,2]*=4
            cc,w=cv2.findTransformECC(Rg,g,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-7),mask,5)
            if best is None or cc>best[0]: best=(cc,w)
        except cv2.error: pass
    if best: warp=best[1]
    scales.append(float(np.sqrt(abs(np.linalg.det(warp[:,:2])))))
    outv.append(cv2.warpAffine(f,warp,(N,N),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE))
print('scale range',min(scales),max(scales))
p=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{N}x{N}','-r','30','-i','-','-c:v','libx264','-crf','14','-pix_fmt','yuv420p',out],stdin=subprocess.PIPE)
p.stdin.write(np.stack(outv).tobytes()); p.stdin.close(); p.wait()
