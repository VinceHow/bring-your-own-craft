import sys, json, glob, subprocess, os
from PIL import Image, ImageDraw, ImageFont
W, mode, out = sys.argv[1], sys.argv[2], sys.argv[3]
d = f'{out}/rec-{W.split("x")[0]}-{mode}'; vid = glob.glob(d + '/*.webm')[0]; marks = json.load(open(d + '/marks.json'))
TIMES = {'teamclose': [0, .3, .6, 1, 1.5, 2.2, 3, 4, 5.5], 'team': [0, .3, .6, 1, 1.5, 2.2, 3, 4, 5.5], 'yes': [0, .3, .8, 1.5, 2.2, 3, 3.6, 4.4, 5.2],
         'record': [0, .2, .4, .8, 1.6, 2.5, 3.5, 4.8, 5.6], 'cat': [0, .2, .4, 1, 2, 3, 4.2, 5, 5.4, 5.8], 'coffee': [0, .2, .4, 1, 2, 3, 4.2, 5, 5.4, 5.8]}
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except Exception: font = ImageFont.load_default()
for k, m in marks.items():
    frames = []
    for dt in TIMES[k]:
        f = f'{d}/{k}-{dt}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(m['t'] + dt), '-i', vid, '-frames:v', '1', f], check=True)
        im = Image.open(f).convert('RGB')
        c = m['crop']
        if c:
            x0, y0 = max(0, c['x']), max(0, c['y']); im = im.crop((x0, y0, min(im.width, c['x'] + c['w']), min(im.height, c['y'] + c['h'])))
        th = 300 if c else 260; im = im.resize((round(im.width * th / im.height), th))
        dr = ImageDraw.Draw(im); dr.rectangle((0, 0, 70, 26), fill=(255, 248, 236)); dr.text((6, 3), f'{dt:.1f}s', fill=(58, 42, 30), font=font)
        frames.append(im); os.remove(f)
    S = Image.new('RGB', (sum(f.width for f in frames) + 6 * (len(frames) - 1), frames[0].height), 'white'); x = 0
    for f in frames: S.paste(f, (x, 0)); x += f.width + 6
    S.save(f'{out}/{k}-{mode}-{W}.jpg', quality=85); print('wrote', f'{out}/{k}-{mode}-{W}.jpg', S.size)
